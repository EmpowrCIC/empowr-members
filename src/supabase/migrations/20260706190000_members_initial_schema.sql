-- Empowr Members — initial schema (Phase 0 Step 2)
-- All tables mem_-prefixed; shared Supabase project (empowr-cic).
-- Writes are service-role only; RLS grants read access per policy below.

-- ============================================================
-- 1. Enums
-- ============================================================

create type mem_offering_type as enum ('drop_in','lesson','course','camp','event');
create type mem_booking_status as enum ('pending_payment','confirmed','cancelled','credited','refunded','attended','no_show');
create type mem_occurrence_status as enum ('scheduled','cancelled_by_empowr','completed');
create type mem_refund_policy as enum ('standard','non_refundable');
create type mem_enrolment_scope as enum ('per_occurrence','per_run');
create type mem_booking_source as enum ('online','walk_in','member');
create type mem_membership_status as enum ('active','past_due','cancelled');

-- ============================================================
-- 2. updated_at trigger function (own function — never reuse other apps')
-- ============================================================

create function mem_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- 3. Tables (dependency order)
-- ============================================================

create table mem_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null default '',
  phone text,
  whatsapp_opt_in boolean not null default false,
  stripe_customer_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table mem_venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  postcode text,
  default_capacity integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table mem_offerings (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  type mem_offering_type not null,
  description text,
  age_min integer,
  age_max integer,
  price_pence integer not null check (price_pence >= 0),
  walk_in_price_pence integer,
  early_bird_price_pence integer,
  refund_policy mem_refund_policy not null default 'standard',
  transferable boolean not null default true,
  enrolment_scope mem_enrolment_scope not null default 'per_occurrence',
  venue_id uuid references mem_venues(id),
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table mem_course_runs (
  id uuid primary key default gen_random_uuid(),
  offering_id uuid not null references mem_offerings(id) on delete cascade,
  label text not null,
  starts_on date,
  ends_on date,
  price_pence integer check (price_pence >= 0), -- null = use offering price
  capacity integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table mem_occurrences (
  id uuid primary key default gen_random_uuid(),
  offering_id uuid not null references mem_offerings(id) on delete cascade,
  course_run_id uuid references mem_course_runs(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  venue_id uuid references mem_venues(id), -- null = use offering venue
  capacity integer,                        -- null = use venue default
  status mem_occurrence_status not null default 'scheduled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table mem_participants (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references mem_accounts(id) on delete cascade,
  name text not null,
  dob date not null,
  emergency_contact_name text,
  emergency_contact_phone text,
  medical_notes text,
  person_id uuid references people(id), -- waiver system link (Empowr Waivers app)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table mem_membership_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price_pence integer not null check (price_pence >= 0),
  stripe_price_id text unique,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table mem_plan_entitlements (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references mem_membership_plans(id) on delete cascade,
  offering_type mem_offering_type,
  offering_id uuid references mem_offerings(id) on delete cascade,
  sessions_per_period integer, -- null = unlimited
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (offering_type is not null or offering_id is not null)
);

create table mem_memberships (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references mem_accounts(id) on delete cascade,
  plan_id uuid not null references mem_membership_plans(id),
  stripe_subscription_id text unique,
  status mem_membership_status not null default 'active',
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table mem_bookings (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references mem_accounts(id),
  participant_id uuid not null references mem_participants(id),
  occurrence_id uuid references mem_occurrences(id),
  course_run_id uuid references mem_course_runs(id),
  status mem_booking_status not null default 'pending_payment',
  price_paid_pence integer check (price_paid_pence >= 0),
  source mem_booking_source not null default 'online',
  stripe_payment_intent_id text,
  expires_at timestamptz, -- pending_payment holds expire (pg_cron job, Phase 1)
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((occurrence_id is null) <> (course_run_id is null)) -- exactly one target
);

create table mem_credits (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references mem_accounts(id) on delete cascade,
  amount_pence integer not null check (amount_pence > 0),
  source_booking_id uuid references mem_bookings(id),
  expires_at timestamptz,
  redeemed_booking_id uuid references mem_bookings(id), -- null until spent
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 4. updated_at triggers
-- ============================================================

create trigger set_updated_at before update on mem_accounts for each row execute function mem_set_updated_at();
create trigger set_updated_at before update on mem_venues for each row execute function mem_set_updated_at();
create trigger set_updated_at before update on mem_offerings for each row execute function mem_set_updated_at();
create trigger set_updated_at before update on mem_course_runs for each row execute function mem_set_updated_at();
create trigger set_updated_at before update on mem_occurrences for each row execute function mem_set_updated_at();
create trigger set_updated_at before update on mem_participants for each row execute function mem_set_updated_at();
create trigger set_updated_at before update on mem_membership_plans for each row execute function mem_set_updated_at();
create trigger set_updated_at before update on mem_plan_entitlements for each row execute function mem_set_updated_at();
create trigger set_updated_at before update on mem_memberships for each row execute function mem_set_updated_at();
create trigger set_updated_at before update on mem_bookings for each row execute function mem_set_updated_at();
create trigger set_updated_at before update on mem_credits for each row execute function mem_set_updated_at();

-- ============================================================
-- 5. Ownership helper (SECURITY DEFINER — RLS recursion rule)
-- ============================================================

create function member_account_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from mem_accounts where user_id = (select auth.uid());
$$;

revoke execute on function member_account_id() from public, anon;
grant execute on function member_account_id() to authenticated;

-- ============================================================
-- 6. RLS — enabled on every table; writes are service-role only
--    (no INSERT/UPDATE/DELETE policies anywhere)
-- ============================================================

alter table mem_accounts enable row level security;
alter table mem_venues enable row level security;
alter table mem_offerings enable row level security;
alter table mem_course_runs enable row level security;
alter table mem_occurrences enable row level security;
alter table mem_participants enable row level security;
alter table mem_membership_plans enable row level security;
alter table mem_plan_entitlements enable row level security;
alter table mem_memberships enable row level security;
alter table mem_bookings enable row level security;
alter table mem_credits enable row level security;

-- Member-owned rows: authenticated read own data only
create policy members_read_own_account on mem_accounts
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy members_read_own_participants on mem_participants
  for select to authenticated
  using (account_id = member_account_id());

create policy members_read_own_bookings on mem_bookings
  for select to authenticated
  using (account_id = member_account_id());

create policy members_read_own_memberships on mem_memberships
  for select to authenticated
  using (account_id = member_account_id());

create policy members_read_own_credits on mem_credits
  for select to authenticated
  using (account_id = member_account_id());

-- Catalogue: public browse (anon + authenticated), live rows only
create policy public_read_venues on mem_venues
  for select to anon, authenticated
  using (true);

create policy public_read_active_offerings on mem_offerings
  for select to anon, authenticated
  using (active = true);

create policy public_read_scheduled_occurrences on mem_occurrences
  for select to anon, authenticated
  using (
    status = 'scheduled'
    and exists (select 1 from mem_offerings o where o.id = offering_id and o.active = true)
  );

create policy public_read_course_runs on mem_course_runs
  for select to anon, authenticated
  using (
    exists (select 1 from mem_offerings o where o.id = offering_id and o.active = true)
  );

create policy public_read_active_plans on mem_membership_plans
  for select to anon, authenticated
  using (active = true);

create policy public_read_plan_entitlements on mem_plan_entitlements
  for select to anon, authenticated
  using (
    exists (select 1 from mem_membership_plans p where p.id = plan_id and p.active = true)
  );

-- ============================================================
-- 7. Indexes
-- ============================================================

create index idx_mem_accounts_user on mem_accounts(user_id);
create index idx_mem_offerings_venue on mem_offerings(venue_id);
create index idx_mem_course_runs_offering on mem_course_runs(offering_id);
create index idx_mem_occurrences_offering on mem_occurrences(offering_id);
create index idx_mem_occurrences_run on mem_occurrences(course_run_id);
create index idx_mem_occurrences_venue on mem_occurrences(venue_id);
create index idx_mem_occurrences_starts_at on mem_occurrences(starts_at);
create index idx_mem_participants_account on mem_participants(account_id);
create index idx_mem_participants_person on mem_participants(person_id);
create index idx_mem_plan_entitlements_plan on mem_plan_entitlements(plan_id);
create index idx_mem_plan_entitlements_offering on mem_plan_entitlements(offering_id);
create index idx_mem_memberships_account on mem_memberships(account_id);
create index idx_mem_memberships_plan on mem_memberships(plan_id);
create index idx_mem_bookings_account_status on mem_bookings(account_id, status);
create index idx_mem_bookings_participant on mem_bookings(participant_id);
create index idx_mem_bookings_occurrence on mem_bookings(occurrence_id);
create index idx_mem_bookings_run on mem_bookings(course_run_id);
create index idx_mem_credits_account on mem_credits(account_id);
create index idx_mem_credits_source_booking on mem_credits(source_booking_id);
create index idx_mem_credits_redeemed_booking on mem_credits(redeemed_booking_id);

-- One live booking per participant per occurrence / course run
create unique index uniq_mem_booking_participant_occurrence
  on mem_bookings(participant_id, occurrence_id)
  where occurrence_id is not null and status in ('pending_payment','confirmed');

create unique index uniq_mem_booking_participant_run
  on mem_bookings(participant_id, course_run_id)
  where course_run_id is not null and status in ('pending_payment','confirmed');
