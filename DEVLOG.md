# DEVLOG — Empowr Members

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

## 2026-07-08 (Phase 1 technical kickoff)

- src/.env.local written from the live Netlify site's env vars (silent pull via API); Stripe keys left blank pending spec Q4
- Vault pipeline onboarding: MEMBERS_* keys seeded (URL, anon, service role, ADMIN_EMAILS; RESEND_API_KEY stays shared); members entries added to consolidate-secrets.ps1, pull-to-local.ps1, and sync-to-netlify.ps1 (dry-run verified)
- Fixed sync-to-netlify.ps1: its vault read used the vault_decrypted_secrets REST view which 404s (not exposed via PostgREST) — switched to the get_all_secrets RPC; also converted the file to ASCII (PS 5.1 encoding rule)
- **Phase 0 defect found by e2e test**: mem_ tables had no table-level grants — this project's default ACL (2026-06-03 hardening) gives API roles no DML on new tables, so every anon/authenticated/service_role query failed 42501 despite correct RLS. Applied `20260708090000_members_table_grants` (service_role full DML on all 11; anon+authenticated SELECT on 6 catalogue tables; authenticated SELECT on 5 member-owned) — mirrors RLS exactly; verified all three access paths
- e2e signup test PASSED: signup 200 → mem_accounts trigger row created same second → Resend SMTP confirmation from members@empowrcic.org delivered to inbox in 2s (not spam) → verify link sets email_confirmed_at → 303 back to members.empowrcic.org. Test users cleaned up
- Gmail connector reads teams@empowrcic.org (not tech@pecuvate.com) — teams+ plus-addresses are the checkable e2e recipients
- ops/CONTEXT.md corrected (publish `.next` two-sided rule; vault pipeline section added); supabase.md registry updated (grants migration + default-ACL warning)
- **Spec gate closed** (user-directed): 4 business rules adopted as provisional MVP defaults — ADR'd + landed in Empowr KB entities/sessions.md; all rule values to live as constants in `src/lib/business-rules.ts` (one-line swap when Jasmine/Shaun confirm)
- **Stripe resolved (Q4)**: it's the shared *Empowr CIC* Stripe account (org account — never "Heroes' account"); Members gets its own API keys (`MEMBERS_STRIPE_*`, created in dashboard at Step 5), Heroes' keys untouched; third-party-services registry rewritten to match
- Only remaining gate item: Q6 timetable verification with Jasmine — blocks Step 3 *seeding* only
- Next session: **Step 2 — auth + account UI** (signup/signin magic link + password, middleware per auth-middleware.md Pattern 1, account page, household management); deps to install per architecture (supabase ssr, zod, react-hook-form, date-fns); Stripe platform infra (webhook endpoint, products/prices) comes at Step 5, user creates the API key in dashboard then

## 2026-07-06 (Phase 0 execution)

- Step 1 done: /init-brand — favicons/logo/manifest from _brand source, full token set in @theme, branded holding page; postcss.config.mjs added (missing from scaffold); npm build verified clean
- Step 2 done: members_initial_schema applied to empowr-cic — 7 enums, 11 mem_ tables, RLS on all (member-owned via member_account_id(), public catalogue reads), 20 indexes + 2 partial uniques; advisors: zero new issues on mem_ tables; one accepted-by-design WARN (member_account_id authenticated EXECUTE) documented in registry
- Step 3 done: members_signup_trigger applied (auto-create mem_accounts on signup); auth config applied via new supabase-admin MCP/CLI (_config/mcp-servers/) — site_url, uri_allow_list, Resend SMTP (members@empowrcic.org); email provider was already enabled by default; leaked-password protection is Pro-plan-gated → accepted, not configurable on free plan
- supabase.md registry updated (tables, functions, migrations, accepted advisory)
- Step 4 done — PHASE 0 COMPLETE: Netlify site empowr-members created via API, CLI build+deploy, members.empowrcic.org CNAME live (INSYNC, HTTPS 200), 5 env vars set via API, .netlify/state.json written
- bookings.empowrcic.org A record (Wix IPs) deleted from Route53 — standalone bookings site superseded by this project (user-directed)
- Publish-path saga: local CLI deploy needed "src/.next" (resolves from repo root) but Netlify CI resolves relative to base → reverted to ".next"; repo linked to Netlify via API (installation 117781637) per deployment policy — push-to-deploy verified green (54s); 7 skill templates corrected with the two-sided rule; CLI deploys are bootstrap-only
- Next: Phase 1 kickoff — Step 1 spec review gate (5 business rules + Stripe account), e2e signup test, src/.env.local

## 2026-07-06

- Project plan written from the Empowr CIC KB (sessions entity + sessions-booking source) — scope, stack, data model, four build phases, open questions
- Project scaffolded via /init-mwp-developer — plan content folded into planning/spec/, planning/architecture/, and planning/decisions/
- Workspace routing tables updated (F:\Projects\CLAUDE.md, F:\Projects\CONTEXT.md, Empowr CIC/CONTEXT.md)
- Parent Empowr CIC repo .gitignore updated with `Empowr Members/`; local git repo initialised on `main`, first commit made
- Pushed to new private remote github.com/Pecuvate/empowr-members; registered in _config/registry/github.md
- Execution plans written for all phases 0–4 under planning/phases/ (restructured from planning/phase-0/) — each with done-when criteria, ordered steps, decision gates, and exclusions
- Coverage review in phases/CONTEXT.md maps every aim component to a phase; caught 4 gaps (GDPR account deletion → P3, Wix customer migration comms → P4, session reminders → P3, business-rule gate → P1 Step 1); 9 ADRs total logged
- Next: execute Phase 0 — Step 1 /init-brand, Step 2 mem_ schema migration, Step 3 Auth config, Step 4 Netlify + domain
