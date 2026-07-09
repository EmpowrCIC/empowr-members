-- Empowr Members — booking flow (Phase 1 Step 4)
-- 1. mem_hold_bookings(): atomic capacity-checked pending_payment insert.
--    Locks the occurrence/course-run row so two concurrent bookings
--    serialize and can't oversell; releases expired pendings on the
--    target inline before counting.
-- 2. pg_cron sweep: releases expired pending_payment holds every minute
--    (deferred from Phase 0 — lands with the flow that creates them).
-- Service-role only: execute revoked from public/anon/authenticated.

-- Sweep + capacity-count support
create index idx_mem_bookings_pending_expiry
  on mem_bookings(expires_at)
  where status = 'pending_payment';

create function mem_hold_bookings(
  p_account_id uuid,
  p_participant_ids uuid[],
  p_occurrence_id uuid default null,
  p_course_run_id uuid default null,
  p_expiry_minutes integer default 30
)
returns setof mem_bookings
language plpgsql
set search_path = public
as $fn$
declare
  v_capacity integer;
  v_price integer;
  v_live integer;
  v_count integer := coalesce(array_length(p_participant_ids, 1), 0);
begin
  if v_count = 0 then
    raise exception 'mem_no_participants';
  end if;
  if (p_occurrence_id is null) = (p_course_run_id is null) then
    raise exception 'mem_bad_target';
  end if;

  -- every participant must belong to the booking account
  if (select count(*) from mem_participants
        where id = any(p_participant_ids)
          and account_id = p_account_id) <> v_count then
    raise exception 'mem_participant_mismatch';
  end if;

  if p_occurrence_id is not null then
    -- lock the occurrence row; capacity: occurrence -> venue default (null = unlimited)
    select coalesce(o.capacity, v.default_capacity), f.price_pence
      into v_capacity, v_price
      from mem_occurrences o
      join mem_offerings f on f.id = o.offering_id
      left join mem_venues v on v.id = coalesce(o.venue_id, f.venue_id)
      where o.id = p_occurrence_id
        and o.status = 'scheduled'
        and o.starts_at > now()
        and f.active = true
        and f.enrolment_scope = 'per_occurrence'
      for update of o;
    if not found then
      raise exception 'mem_not_bookable';
    end if;

    -- free expired holds on this occurrence before counting
    update mem_bookings
      set status = 'cancelled', cancelled_at = now()
      where occurrence_id = p_occurrence_id
        and status = 'pending_payment'
        and expires_at <= now();

    select count(*) into v_live
      from mem_bookings
      where occurrence_id = p_occurrence_id
        and status in ('pending_payment', 'confirmed');

    if v_capacity is not null and v_live + v_count > v_capacity then
      raise exception 'mem_capacity_exceeded';
    end if;

    return query
      insert into mem_bookings
        (account_id, participant_id, occurrence_id, price_paid_pence, expires_at)
      select p_account_id, pid, p_occurrence_id, v_price,
             now() + make_interval(mins => p_expiry_minutes)
      from unnest(p_participant_ids) as pid
      returning *;
  else
    -- course-run path: run capacity (null = unlimited), run price falls back to offering
    select r.capacity, coalesce(r.price_pence, f.price_pence)
      into v_capacity, v_price
      from mem_course_runs r
      join mem_offerings f on f.id = r.offering_id
      where r.id = p_course_run_id
        and f.active = true
        and f.enrolment_scope = 'per_run'
        and (r.ends_on is null or r.ends_on >= current_date)
      for update of r;
    if not found then
      raise exception 'mem_not_bookable';
    end if;

    update mem_bookings
      set status = 'cancelled', cancelled_at = now()
      where course_run_id = p_course_run_id
        and status = 'pending_payment'
        and expires_at <= now();

    select count(*) into v_live
      from mem_bookings
      where course_run_id = p_course_run_id
        and status in ('pending_payment', 'confirmed');

    if v_capacity is not null and v_live + v_count > v_capacity then
      raise exception 'mem_capacity_exceeded';
    end if;

    return query
      insert into mem_bookings
        (account_id, participant_id, course_run_id, price_paid_pence, expires_at)
      select p_account_id, pid, p_course_run_id, v_price,
             now() + make_interval(mins => p_expiry_minutes)
      from unnest(p_participant_ids) as pid
      returning *;
  end if;
exception
  when unique_violation then
    raise exception 'mem_duplicate_booking';
end;
$fn$;

revoke execute on function mem_hold_bookings(uuid, uuid[], uuid, uuid, integer)
  from public, anon, authenticated;
grant execute on function mem_hold_bookings(uuid, uuid[], uuid, uuid, integer)
  to service_role;

-- Global sweep — releases stale holds everywhere (the RPC only frees the
-- target it's booking). Runs every minute; expired pendings become
-- cancelled (enum has no 'expired').
select cron.schedule(
  'members-release-expired-pendings',
  '* * * * *',
  $job$
    update mem_bookings
      set status = 'cancelled', cancelled_at = now()
      where status = 'pending_payment'
        and expires_at <= now()
  $job$
);
