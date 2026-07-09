# DEVLOG — Empowr Members

## 2026-07-09 (Step 5 prep — Stripe test keys vaulted)

- User created the Members restricted key in the shared Empowr CIC Stripe dashboard (test mode; Checkout Sessions / Customers / Payment Intents / Charges: Write — Charges covers refunds; Stripe has no separate Refunds scope, and Write implies Read)
- Keys vaulted via .env.shared intake → consolidate-secrets.ps1 (`MEMBERS_STRIPE_SECRET_KEY` rk_test, `MEMBERS_STRIPE_PUBLISHABLE_KEY` pk_test); pull-to-local populated src/.env.local (`STRIPE_SECRET_KEY`/`STRIPE_PUBLISHABLE_KEY`, prefix-verified); deduped a leftover blank STRIPE_SECRET_KEY line from the kickoff session
- Decision (in memory.md): vault keeps TEST values under unsuffixed names for local dev; at Step 9 go-live add `_LIVE` vault entries and point sync-to-netlify.ps1 `$siteVarMap` at them — app code reads unsuffixed env vars everywhere; webhook secret gets the same twin treatment
- Netlify sync deliberately deferred — push MEMBERS_STRIPE_* to the site as part of Step 5 when code reads them
- Next: **Step 5 build** — Stripe Checkout session per booking, `checkout.session.completed` webhook confirms holds before expiry, signature verification + idempotency; webhook signing secret created during the build

## 2026-07-09 (Phase 1 Step 4 — booking flow) ✅

- Migration `20260709150000_members_booking_flow`: `mem_hold_bookings()` RPC (plpgsql, service-role EXECUTE only) — `FOR UPDATE` lock on the occurrence/course-run row, inline release of expired holds on that target, capacity = occurrence → venue default (null = unlimited; run uses `run.capacity`), price = `run.price_pence ?? offering.price_pence`, multi-participant insert in one transaction, unique-violation → `mem_duplicate_booking`; partial index on pending `expires_at`; pg_cron `members-release-expired-pendings` (every minute, expired pendings → `cancelled` — enum has no `expired`); registry + ADRs updated (3 new rows)
- Waiver gate (`lib/waivers.ts`, read-only on Waivers tables): signer = `people` by account email (ilike), participant covered when an active-form-version response lists their normalised name in `skater_names` (or signer books themselves); linked `person_id` trusted (admin manual link path); fresh matches persisted to `mem_participants.person_id` by the API; fails closed (no active version → unsigned)
- `POST /api/bookings`: zod (`bookingSchema` XOR occurrence/run) → participant ownership → age eligibility **on the session start date** (422 + names) → waiver gate (409 `waiver_required` + names, no insert) → RPC (409 capacity / duplicate / not-bookable mapped to friendly messages) → 201 with holds + `expires_at`
- Pages `(member)/book/[occurrenceId]` + `(member)/book/run/[runId]` + `BookingForm` client component: summary card, checkbox participant select (ineligible disabled with age range, unsigned badged "waiver needed"), live total, waiver notice with waiver.empowrcic.org link + retry, "Space held" panel (Step 5 swaps this for the Stripe redirect)
- **e2e 15/15 PASSED** — Playwright UI 10/10 (guard redirect, render, ineligible disabled, waiver badge, waiver 409 with link, hold, duplicate, B fills capacity-1, A rejected, course-run hold at run price) + DB 5/5 (person_id persisted; **true concurrent race on capacity-1 → exactly one wins**; foreign-participant rejected; inline expired-hold release; live cron sweep <90s). Seeded via service scripts incl. test rows in `people`/`waiver_responses` (only way to e2e the gate) — all cleaned + verified after
- Gotcha: service_role has no DELETE grant on `people`/`waiver_responses` (Waivers-app tables) — e2e cleanup of those rows must go via SQL (postgres), not the service client
- Gotcha (again): zombie `next dev` on port 3000 from a prior session — killed before e2e; check first
- Waiver-table check constraints: `skating_mode in (self|others|party)`, `session_policy_type in (none|rollerdisco|sk8skool)` — relevant for any future seeded waiver rows
- Next: **Step 5 — Stripe payments** (user creates `MEMBERS_STRIPE_*` keys in the shared Empowr CIC Stripe dashboard first; then Checkout session per booking, webhook confirm, env vars to Netlify). Step 3 seeding still waits on Q6 (Jasmine)

## 2026-07-09 (Phase 1 Step 3 — catalogue pages; seeding still gated on Q6)

- Migration `20260709100000_members_offering_kit_list` applied (mem_offerings.kit_list text — schema had no kit-list field but Step 3 display + Step 6 emails need it); registry updated
- lib/catalogue.ts (anon-safe RLS reads: listOfferings with type/age filters via PostgREST `.or` null-bounds logic, getOffering, listUpcomingOccurrences, listCourseRuns) + lib/format.ts (formatPrice pence→£, formatOccurrence in Europe/London via date-fns-tz, formatAgeRange)
- Pages: /sessions (type pills + age filter via searchParams, force-dynamic) and /sessions/[slug] (prices incl. early-bird/door, venue card + per-occurrence venue override, kit list, PolicyNotice from CANCELLATION_CUTOFF_HOURS, per_occurrence date list with Book → /book/[id], per_run course-run cards with Book → /book/run/[id]); PublicHeader layout scoped to sessions/; Sessions link added to MemberHeader
- Day filter deferred until real data (needs occurrence-join UX); home CTA still points at EELA until seeding lands
- **e2e 25/25 PASSED** against KB-shaped seed data (inactive hidden, filters, past occurrences hidden, venue override, course runs, non-refundable notice, guarded book links, 404): seeded via SQL, cleaned after — prod catalogue empty ("timetable being finalised" state) until Q6
- Gotcha: a stale `next dev` on port 3000 (zombie from a prior session) made with_server test against dead code — two timeouts before killing PID; check port 3000 before e2e runs
- Gotcha: CTE `delete ... returning` + same-statement count reads show pre-delete snapshot — verify cleanup with a separate query
- Next: **Step 4 — booking flow** (occurrence/run selection → participant selection age-validated → waiver gate → capacity/duplicate check → pending_payment insert + pg_cron expiry); seeding real timetable = quick follow-up once Jasmine confirms Q6

## 2026-07-09 (Phase 1 Step 2 — auth + account UI) ✅

- Deps installed: @supabase/supabase-js, @supabase/ssr, zod, react-hook-form, @hookform/resolvers, date-fns(+tz), framer-motion, server-only. **shadcn deliberately deferred** — Step 2 UI built with small brand-token primitives (`components/ui/form.tsx`); revisit shadcn at Step 3+ when dialog/table/calendar are genuinely needed (init would churn globals.css)
- lib layer: supabase clients (client/server/service per src/CONTEXT.md), `business-rules.ts` (all 5 provisional rule values + PENDING_BOOKING_EXPIRY_MINUTES + TIMEZONE as named constants), `age.ts` (ageOn/isAgeEligible/isPlausibleDob), `validation.ts` (zod schemas shared by forms AND API routes), `types.ts`, `auth.ts` (getAuthedAccount)
- `middleware.ts` — Pattern 1 session guard on /account /bookings /book /membership /admin with ?next= return; auth pages redirect signed-in users to /account; api/ excluded from matcher (routes do their own 401s)
- `/auth/callback` handles both ?code= (PKCE) and ?token_hash&type (email confirm); open-redirect-safe next param
- App restructured into route groups per architecture: home → `(public)/`, + `(public)/login` (password | magic-link tabs; magic link `shouldCreateUser: false` so typos don't create ghost accounts), `(public)/signup` (name→user_metadata→trigger), `(member)/account` under layout with header + sign-out. No password-reset flow — magic link covers recovery for MVP
- Writes per data-access rules: PATCH /api/account, POST /api/participants, PATCH+DELETE /api/participants/[id] — all service-client, zod-parsed, scoped to caller's account id; participant DELETE maps FK 23503 → friendly 409 (booking history)
- **e2e 18/18 PASSED** (Playwright vs dev server, admin-created confirmed user): guard redirects, password login, profile save, two child participants added (ages 8/11 derived from DOB), future-DOB rejected, edit persists, reload persists (RLS read path), sign-out re-guards, unauthenticated API write → 401. **Step 2 done-when met.** Test user + temp helper deleted after
- `npm run build` clean; pushed to main → Netlify CI deploy
- Next: **Step 3 — catalogue + seeding** (blocked on Q6 timetable verification with Jasmine for the *seeding* half; catalogue pages can build against schema meanwhile)

## 2026-07-08 — Phase 1 kickoff: spec gate closed (4 provisional rules ADR'd, Stripe = shared Empowr CIC account confirmed), e2e signup PASSED, fixed missing mem_ table grants (hardened default ACL), vault pipeline onboarded, .env.local written; only Q6 left open

## 2026-07-06 — Phase 0 COMPLETE: brand, 11-table mem_ schema + RLS, signup trigger, Resend SMTP auth config, Netlify site + members.empowrcic.org live, push-to-deploy verified (publish ".next" two-sided rule); bookings.empowrcic.org Wix A record deleted

## 2026-07-06 — Project planned from Empowr KB, MWP-scaffolded, repo + registries set up, phase 0–4 execution plans written (9 ADRs)
