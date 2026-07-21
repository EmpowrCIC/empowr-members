-- PassKit Track A (Step A3): store the pass id per booking and the
-- venue id per venue. Nullable, no RLS change (writes are service-role
-- only, columns ride existing policies).
alter table public.mem_bookings
  add column passkit_pass_id text;

alter table public.mem_venues
  add column passkit_venue_id text;
