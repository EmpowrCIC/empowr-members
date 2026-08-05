# DEVLOG — Empowr Members

## 2026-08-05 (session) — PassKit pre-launch verification: found a silent production breakage, corrected two wrong assumptions, mapped the cert-day flow

Ran as launch prep while the Apple Developer account is still pending. Went looking for the `PROJECT_PUBLISHED` flip mechanism and a Google-Wallet-works-today confirmation; found four things instead, two of which change the launch plan.

- **`lib/passkit.ts` was silently broken in production — fixed and committed.** The JWT `iat` backdate was exactly `60`, and PassKit rejects tokens whose `iat` is 60s or older (`"jwt was issued too long ago"`). Every call sat on the rejection boundary, decided by network latency. Measured **0/12 accepted at 60s vs 12/12 at 10s**, against a local clock verified accurate to 0.9s via PassKit's own `Date` header. Every export in that module is never-throw, so this failed as "no pass issued" with no error anywhere. Had we launched, **zero passes would have issued and nothing would have reported it.** Now a named `JWT_IAT_BACKDATE_SECONDS = 10`.
- **Apple Wallet is not functionally blocked by the missing cert.** Downloaded the real `.pkpass` and unzipped it: complete 33KB bundle with a present 3314-byte `signature`, signed under PassKit's shared cert (`pass.io.passkit.dev`), `organizationName: "Empowr CIC"` correct. Passes install today. **The actual blocker is DRAFT mode**, which stamps every pass with a "Test Pass - Not for Commercial Use" back-field and a hard **2-day expiry** — so a member booking further than 48h out gets a pass that expires before their session. Passes must stay off until the Production is published.
- **"Google Wallet is unaffected" was wrong.** Android doesn't hand off to native Google Wallet at all — the install page links to `walletpass.io` (a third-party pkpass reader) pointing at the *same* `.pkpass`, so Android inherits the identical disclaimer and 2-day expiry. There is no platform that routes around the DRAFT restriction.
- **Three pass-content bugs found, all cert-independent and all fixable now**: the primary field (`custom.offeringTitle`, the biggest text on the pass, labelled "Session") renders **empty** — our `metaData` isn't reaching it; the "Name" field is empty because we never set `person`; and the **QR code is broken**, encoding the literal string `"missing: ticketNumber"` because we never set `ticketNumber`. All three are settable on `IssueTicketRequest`.
- **Technique correction:** Step A8 recorded that pass rendering "can't be asserted from code". It can — `GET https://pub1.pskt.io/{ticketId}.pkpass`, unzip, read `pass.json` + `en.lproj/pass.strings`. That is how all three bugs above surfaced, without a device.
- **Cert-day runbook written** (`planning/passkit/CONTEXT.md`) with validated endpoints for the full flow: CSR → Apple → upload cert → publish Production → verify. Key gotcha: **never pre-fetch the CSR** — `GET /certificate/certificate_signing_request` returns a fresh keypair on every call (verified: different hashes 2s apart), so fetching early would orphan the key the Apple cert gets issued against.
- Also confirmed live: Production `passTypeIdentifier` is empty (contradicting the Step A2 note), no Apple cert uploaded yet, and 8 orphaned test venues on the PassKit account (production `mem_venues` is empty, so none are real).
- Probe ticket issued for the test was deleted and verified gone (404). Typecheck clean.

## 2026-07-30 (session) — KB timetable investigation: launch-readiness assessed, capacity is the one remaining seeding blocker

- Assessed full launch readiness on request: Phase 1 code (auth, booking, live Stripe payments, emails, admin, PassKit) is built/deployed/e2e-proven, but production catalogue is genuinely empty (0 venues/offerings/occurrences) — confirmed again this session, unchanged from 2026-07-29.
- **Checked whether the Q6/Jasmine real-timetable gap could be derived from the KB instead of waiting on a fresh ask.** Read `vaults/EMPOWR CIC/KNOWLEDGE BASE/entities/sessions.md` (as_of 2026-07-22) and the older `sources/operations/sessions-booking.md`: both have real venue/day/time/price/duration data for every recurring session (Skate Jam, Roller Disco, both Sk8 Skool tracks, SYNKRON8) plus dated 2026 course ranges — far more than "nothing."
- User confirmed two things that resolve my initial hesitations: the schedule has been stable 3+ years (the KB's own "times/dates change" caveat is low-risk in practice), and **all sessions are moving fully to Members from Wix** (so courses aren't a Wix-vs-Members ownership question anymore).
- **One real gap remains and isn't resolved by either answer: capacity/attendee limits are absent from both KB pages entirely** — not stale, just never captured. `mem_hold_bookings()` requires a per-occurrence capacity to lock against; without it nothing can actually be seeded as bookable. This is a genuine business input (room size / coach ratios / safeguarding limits for under-18 sessions), not something to infer.
- **Next**: get capacity numbers per session/venue from Jasmine or Shaun, then I can draft the full seed list (venues → offerings → recurring occurrence pattern) straight from the KB data for a quick confirm pass rather than building from scratch. That unblocks catalogue seeding → the live-mode Stripe smoke test → actual public launch.

## 2026-07-30 (session) — PostHog analytics instrumentation, Variant B

- Installed PostHog (Variant B: cookieless `on_reject` + consent banner) ahead of public launch — new `PostHogProvider.tsx` + `CookieConsentBanner.tsx`, wired into root `layout.tsx`. Chosen over Variant A because Members has a real accounts/booking section, matching EELA's precedent.
- New `analytics_sites` Supabase row inserted — Members had no row at all before (confirmed by querying the DB directly, not assumed from docs). `provider = 'posthog'`, `posthog_site_id = 'empowr-members'`.
- Deliberately skipped the CSP patch — no CSP exists on this site yet, and it runs Stripe checkout + PassKit wallet passes; a first-time locked-down CSP needs its own allowlist audit, not a drive-by add during an analytics task.
- Found the `add-analytics` skill itself was stale (pre-cookieless-mode templates, wrong Supabase column names) while using it — fixed in the `workspace-config` repo (commit `2a46a4e`) so the next site instrumented doesn't hit the same bug.
- Verified: `tsc --noEmit` clean, dev server compiles, homepage 200. Not yet verified against real PostHog Live Events — site has zero real traffic pre-launch.
- Commit `f7c72b2`, pushed to `main`.

## 2026-07-30 — PostHog route-change tracking fix (fleet-wide)

- `capture_pageview: true` → `'history_change'` in `PostHogProvider.tsx`. posthog-js gates `HistoryAutocapture` on an exact string match, so `true` captures hard page loads only — client-side `<Link>` navigation produced **no pageview at all**. Worth noting for this site specifically: the booking and membership flows are almost entirely client-side navigation, so essentially the whole funnel would have been invisible once real traffic arrives.
- Found during a full review of Empowr Heroes (11 autocaptured CTA clicks vs 4 pageviews on the destination page). Same config across every Next.js site here — fixed in Heroes, Main Site, EELA, Members, Landing Page, plus the canonical templates in `_config/guides/posthog-consent.md`.
- `cookieless_mode: 'on_reject'` unchanged — orthogonal to consent.
- No effect on the 2026-07-30 pre-launch instrumentation work (Variant B events); this makes those events measurable in context rather than changing them.
- Verified: `npx tsc --noEmit` clean.

## 2026-07-29 (Launch-gate: legal policy links wired) — spec risk #5 resolved

- **No new Sanity content needed**: queried the CMS directly and confirmed the org privacy policy (platform `org`, v1.2, last updated 2026-07-28) already has a "Programme Bookings" section covering DOB, health/accessibility info, and safeguarding for under-18s, with its own retention table — this generically covers what Members collects since Members is legally the same entity (Empowr CIC), not a separate one. No Members-specific `policy.platform` enum value was added; reuse over duplication.
- **Wired into the live site** (previously zero legal links existed anywhere in the app — verified via grep): added the same `/legal/:slug` → `https://legalhub.pecuvate.com/share/empowr/org/:slug` Netlify redirect proxy that Main Site already uses (netlify.toml), added `privacyPolicy`/`termsAndConditions`/`riskWaiver` entries to `lib/links.ts`, built a new `Footer.tsx`, mounted it once in the root `layout.tsx` so it covers every route group (public/member/admin/auth) without touching each nested layout individually.
- Verified: clean `next build` (typecheck + lint + all 17 routes), and confirmed `legalhub.pecuvate.com/share/empowr/org/privacy-policy` returns 200 live.
- **Checked the live-mode Stripe smoke test next and found it can't run yet**: queried production Supabase directly — `mem_venues`/`mem_offerings`/`mem_occurrences`/`mem_course_runs` are all empty (0 rows). Same Q6/Jasmine real-timetable gap as Step 3, not a new issue. Also found a leftover `mem_accounts` row from the 2026-07-21 PassKit A8 e2e session that the DEVLOG at the time claimed was fully cleaned up ("zero leftover rows verified") — it wasn't. **User decision**: defer the smoke test until real seeding happens (no throwaway test listing on the live site); leave the leftover account row as-is for now.
- Registries update still outstanding.

## 2026-07-21 (PassKit Track A — Step A8: live e2e proof passed, deployed — Track A COMPLETE) — self-signed a real Stripe webhook event end-to-end: pass issued + `passkit_pass_id` persisted, confirmation email wallet link verified via Gmail MCP, admin occurrence-cancel voided the pass (ticket 404s after); zero leftover rows after cleanup; deployed (commit `6d8f6b5`). Track A fully built/e2e-proven/deployed; still open: install a pass on a real phone, Apple Wallet blocked on Developer cert, Track B blocked on Phase 2

## 2026-07-21 (PassKit Track A — Steps A5, A6, A7 built: issue-on-confirm, email link, void-on-cancel) — `issuePassesForSession()` issues one pass per booking on Stripe first-confirm; confirmation email renders a wallet-install link per participant; admin occurrence-cancel voids the pass after refund/credit succeeds; clean build verified, not yet e2e-proven live at this point (that became Step A8)

## 2026-07-21 (PassKit Track A — Steps A3 + A4 built, venue wiring e2e-proven) — schema migration added `passkit_pass_id`/`passkit_venue_id`; `lib/passkit.ts` built (hand-rolled JWT, `createPassKitVenue`/`issueSessionPass`/`voidPass`); venue creation wired into `POST /api/admin/venues` and e2e-proven live (real Supabase row + real PassKit API)

## 2026-07-21 (PassKit Track A — Step A0 verified + Step A2 built and proven end-to-end) — REST JWT auth empirically verified live (fixed claim/header-scheme bugs + a PowerShell local-time-vs-UTC bug); built the shared Production/Ticket Type/Template via live API calls (full ID table + every REST-vs-gRPC JSON-shape gotcha written to `planning/passkit/CONTEXT.md` — read that before touching `lib/passkit.ts`); Apple Wallet blocker surfaced (needs a paid Apple Developer cert, Google Wallet unaffected); `mem_venues` confirmed empty (Q6/Jasmine real-timetable gap, unchanged)

## 2026-07-21 — Self-serve cancellation removed entirely (deleted `lib/cancellation.ts`, the member cancel route/email); matches new no-refund T&Cs v1.1 — only admin occurrence-cancel remains as a refund/credit path

## 2026-07-16 — PassKit integration scoped and ADR'd (Track A session pass greenlit, Track B membership pass blocked on Phase 2); credentials vaulted; entitlement intake Q1–Q6 drafted

## 2026-07-12 — Phase 1 Step 9: full e2e regression 6/6 PASS, pre-deploy-security 0 FAILs, Stripe switched to live mode in production (Netlify env PATCH-per-key gotcha documented); live-mode smoke test still outstanding at the time

## 2026-07-11 (Phase 1 Step 8) — Built admin area: allowlist-gated CRUD for venues/offerings/occurrences/course-runs, register view, cancel-occurrence bulk refund/credit folded into one email; e2e verified incl. folded multi-child email and FK-blocked venue delete

## 2026-07-11 (Phase 1 Step 7) — Built My Bookings + self-serve cancellation (48h refund/credit policy); e2e 6/6 incl. a real Stripe test-mode refund. **Superseded 2026-07-21: this entire flow was removed to match the new no-refund legal policy — see that entry.**

## 2026-07-10 — Phase 1 Step 6 DONE: Resend transactional emails (3 pure builders + never-throw sendEmail + orchestrators; confirmation wired into Stripe webhook); e2e all 3 delivered + Gmail-confirmed, zero leftover rows

## 2026-07-10 — Phase 1 Step 5 DONE: Stripe Checkout payments (card-only, webhook confirm/release, per-booking price snapshot); e2e 5/5 UI + 22/22 DB/webhook; prod TEST webhook wired, Netlify env pushed

## 2026-07-09 — Stripe test keys vaulted (Step 5 prep): MEMBERS_STRIPE_* keys created in the shared Empowr CIC dashboard, intook to vault, pulled to local; live keys deferred to Step 9 go-live

## 2026-07-09 — Phase 1 Step 4 DONE: booking flow (`mem_hold_bookings()` row-locked RPC, waiver gate against the Waivers tables, pg_cron expiry sweep); e2e 15/15 incl. a true concurrent capacity-1 race

## 2026-07-09 — Phase 1 Step 3 pages DONE: catalogue `/sessions` + `/sessions/[slug]`; e2e 25/25 against KB-shaped seed data; real-timetable seeding still gated on Q6 (Jasmine)

## 2026-07-09 (Phase 1 Step 2 — auth + account UI) ✅ — magic-link+password auth, Pattern 1 middleware guard, lib layer (supabase clients, business-rules constants, zod validation), route groups, household CRUD via service-client API routes; e2e 18/18; shadcn deferred for brand-token primitives

## 2026-07-08 — Phase 1 kickoff: spec gate closed (4 provisional rules ADR'd, Stripe = shared Empowr CIC account confirmed), e2e signup PASSED, fixed missing mem_ table grants (hardened default ACL), vault pipeline onboarded, .env.local written; only Q6 left open

## 2026-07-06 — Phase 0 COMPLETE: brand, 11-table mem_ schema + RLS, signup trigger, Resend SMTP auth config, Netlify site + members.empowrcic.org live, push-to-deploy verified (publish ".next" two-sided rule); bookings.empowrcic.org Wix A record deleted

## 2026-07-06 — Project planned from Empowr KB, MWP-scaffolded, repo + registries set up, phase 0–4 execution plans written (9 ADRs)
