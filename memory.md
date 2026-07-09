# Memory — Empowr Members

## Current Status

- Phase: **Phase 1 in progress** — kickoff + spec gate done 2026-07-08. **Next: Step 2 (auth + account UI)** — Steps 2–5 unblocked; only Q6 (timetable verification with Jasmine) open, blocking Step 3 *seeding* only. 4 business rules = provisional MVP defaults (ADR'd + in Empowr KB sessions.md; implement as constants in `src/lib/business-rules.ts`). Live at https://members.empowrcic.org (Netlify site `76f903e4-3795-406a-9478-34be6b0ed015`). **Deploys via GitHub push → CI**; `publish = ".next"` — CI resolves it relative to base (never CLI-deploy).
- 2026-07-08 kickoff session: e2e signup test PASSED end-to-end (signup 200 → Resend SMTP email delivered to inbox in 2s from members@empowrcic.org → confirm link verifies user → mem_accounts trigger fires; test users deleted after). Found + fixed a Phase 0 defect: `mem_` tables had **no table-level grants** (project default ACL is hardened — new tables get no DML for API roles); `members_table_grants` migration applied and verified (service_role full DML, anon catalogue-only, authenticated + own-row tables). src/.env.local written; project registered in the vault pipeline (MEMBERS_* keys seeded; consolidate/pull/sync scripts all carry a members entry). Also fixed sync-to-netlify.ps1 (broken vault read → get_all_secrets RPC).
- Complete: plan, MWP scaffold, ADRs, GitHub remote + registries, execution plans for phases 0–4, Phase 0 (brand, schema, auth, Netlify + domain)
- Leaked-password protection Pro-plan-gated (accepted). Gmail note: connected Gmail connector reads the teams@empowrcic.org mailbox, not tech@pecuvate.com — use teams+ plus-addresses for future e2e email checks.

## Key Decisions

- Domain: members.empowrcic.org (dashboard.empowrcic.org reserved for Empowr Dashboard)
- Database: existing `empowr-cic` Supabase project — waiver tables live there, so the waiver gate is a table join
- Payments: Stripe Checkout (one-off) + Billing (memberships); account = the shared **Empowr CIC Stripe account** (org account, currently only used by Heroes — CONFIRMED 2026-07-08). Members gets its own API keys (`MEMBERS_STRIPE_*`) in that account at Step 5; never reuse or rename Heroes' keys
- EELA stays discovery-only; this project is the transactional layer
- All new tables `mem_` prefixed; writes via service client only

## Preferences

- Make reasonable implementation decisions without asking; only block on genuine business questions (entitlements, Stripe account)

## Parked work waiting on this project

- `feat/my-account-nav` (Empowr Main Site) and `feat/members-account-notice` (Empowr EELA) — merge at Phase 4 cutover; set `membersUrl` in Main Site links.ts first

## Pre-Close Checklist

- [ ] Update Current Status to reflect what changed this session
- [ ] Record any new decisions in Key Decisions (ADR in planning/decisions/ if significant)
- [ ] Note any outstanding work that was not completed
