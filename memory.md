# Memory — Empowr Members

## Current Status

- Phase: **Phase 1 in progress** — Steps 2, 3-pages, and **4 (booking flow) DONE 2026-07-09** (e2e 18/18 + 25/25 + 15/15). **Next: Step 5 (Stripe payments)** — user must create `MEMBERS_STRIPE_*` keys in the shared Empowr CIC Stripe dashboard first. Step 3 real-timetable *seeding* still blocked on Q6 (Jasmine) — prod /sessions shows "timetable being finalised" until then. Business-rule values live as constants in `src/lib/business-rules.ts`. shadcn still deferred — brand-token primitives in `components/ui/form.tsx`. Live at https://members.empowrcic.org (Netlify site `76f903e4-3795-406a-9478-34be6b0ed015`). **Deploys via GitHub push → CI**; `publish = ".next"` — CI resolves it relative to base (never CLI-deploy).
- Step 4 shape (for Steps 5/7 to reuse): holds via `mem_hold_bookings()` RPC (row-locked, service-role only; inline expired-release; price snapshotted into `price_paid_pence`); expired pendings → `cancelled` via pg_cron `members-release-expired-pendings` (every minute); waiver gate in `lib/waivers.ts` (active form version + `skater_names` name match, persists `person_id`, fails closed, blocks with 409 + waiver link); `/book/[occurrenceId]` + `/book/run/[runId]` end at a "Space held" panel — Step 5 swaps it for the Stripe Checkout redirect and confirms holds via webhook before expiry. Gotcha: service_role can't DELETE from `people`/`waiver_responses` — waiver-row test cleanup goes via SQL.
- Step 2 shape (for later steps to reuse): auth = password + magic-link tabs (`shouldCreateUser: false` on OTP; no password-reset flow — magic link is recovery); middleware Pattern 1 guards /account /bookings /book /membership /admin; all writes via zod-parsed API routes with service client scoped to `getAuthedAccount()` (lib/auth.ts); e2e pattern = admin-createUser (email_confirm) + Playwright, cleanup deletes user (cascades).
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
