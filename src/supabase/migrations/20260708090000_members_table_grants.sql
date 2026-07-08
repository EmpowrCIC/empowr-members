-- Table-level grants for mem_ tables.
-- This shared project's default ACL strips DML from the API roles on new
-- postgres-owned tables (Waivers hardening), so every table needs explicit
-- grants on top of RLS. Grants mirror the RLS policies exactly:
--   writes            -> service_role only
--   catalogue reads   -> anon + authenticated
--   member-own reads  -> authenticated (RLS scopes rows)

-- service_role: full DML on all mem_ tables (all app writes go via service client)
grant select, insert, update, delete on
  mem_accounts, mem_venues, mem_offerings, mem_occurrences, mem_course_runs,
  mem_membership_plans, mem_plan_entitlements, mem_memberships,
  mem_participants, mem_bookings, mem_credits
to service_role;

-- Public catalogue: browsable logged out
grant select on
  mem_offerings, mem_occurrences, mem_course_runs, mem_venues,
  mem_membership_plans, mem_plan_entitlements
to anon, authenticated;

-- Member-owned tables: authenticated read, rows scoped by RLS
grant select on
  mem_accounts, mem_participants, mem_bookings, mem_memberships, mem_credits
to authenticated;
