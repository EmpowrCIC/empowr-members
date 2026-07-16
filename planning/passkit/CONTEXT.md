# PassKit Integration — Build Plan

**Status:** Track A greenlit for build (user-confirmed 2026-07-16). Track B blocked on Phase 2 Steps 2–3.
**Credentials:** REST API Key + Secret vaulted as `MEMBERS_PASSKIT_API_KEY` / `MEMBERS_PASSKIT_API_SECRET` (2026-07-15). Not yet in the distribution scripts or any code.
**Account:** PassKit account exists (signed up 2026-07); dashboard state unknown — nothing set up in it yet.

## What PassKit does here

PassKit (passkit.com) issues Apple Wallet / Google Wallet passes via REST API. Two pass types are in scope for Members, built as two tracks:

| Track | Pass | PassKit protocol | Trigger | Status |
|---|---|---|---|---|
| **A** | Session/booking pass — per confirmed booking, QR scanned at the door for check-in | Event Tickets | Booking → `confirmed` (Stripe webhook, live today) | **Build now** |
| **B** | Membership pass — ongoing card while subscribed, updated in place (not reissued monthly) | Members/Loyalty | Phase 2 Step 3 subscription lifecycle webhook | Blocked: needs Phase 2 Steps 2–3 + Q1 (see [../phases/phase-2/entitlement-intake.md](../phases/phase-2/entitlement-intake.md)) |

Track A has **zero dependency** on Phase 2, the entitlement questions, or the real timetable (Q6) — it builds and tests against seeded occurrences, exactly like the rest of Phase 1 did. Doing A first also lays the shared plumbing (client lib, credential wiring, template patterns) that makes B's PassKit portion a second-template job.

Where scanning pays off operationally is Phase 3's check-in view — Track A only *issues* passes; the scan/redeem UI is Phase 3 scope, not this build.

## Track A — build steps

Follow the Phase 1 conventions throughout: writes via service client in API routes, never-throw side-effect calls (mirror `lib/email.ts`'s `sendEmail`), zod on inputs, e2e with seeded rows + verified zero-leftover cleanup.

### Step A0 — Verify before coding (unverified assumptions, flagged)
1. Log into the PassKit dashboard (user has the login) and confirm the **Event Tickets protocol is licensed/available** on this account — Members/Loyalty and Event Tickets are separate PassKit products; the plan may not include both.
2. Confirm the **REST auth mechanism** from their docs (https://docs.passkit.io/ — key+secret pair typically mints a JWT per request; do not guess, read the auth page). SDK Credentials in the dashboard are for client-embedded use — **not** used here; server-side REST only.
3. Confirm pass-update semantics (update-in-place vs reissue) while in the docs — recorded as an assumption in memory, never independently verified.
4. Check their Node quickstart for patterns: github.com/PassKit/passkit-node-quickstart.

### Step A1 — Credentials into the pipeline
- Add `MEMBERS_PASSKIT_API_KEY` / `MEMBERS_PASSKIT_API_SECRET` to `F:\Projects\scripts\pull-to-local.ps1` (members entry) and `sync-to-netlify.ps1` `$siteVarMap` (Members site `76f903e4-3795-406a-9478-34be6b0ed015`).
- Pull to `src/.env.local`; push to Netlify. Gotcha: existing-key pushes need `PATCH /accounts/{id}/env/{key}?site_id=...` flat body, context ≠ `all` — see project memory.md.
- Never Read `.env` files directly; PowerShell-extract silently. `.ps1` files ASCII-only.

### Step A2 — PassKit dashboard setup (Event Tickets)
- Create the production/venue/event-type structure their protocol requires (hierarchy per their docs — likely venue → production → event → ticket).
- Design the ticket template: Empowr brand assets at `Empowr CIC/_brand/` (white eye on brand blue). Fields: offering title, participant name, date/time, venue name + address, QR (payload = booking id).
- Record the template/production IDs in this file when created.

### Step A3 — Schema migration
- `passkit_pass_id text` (nullable) on `mem_bookings`; migration file in `src/supabase/migrations/`, applied via MCP, then update `_config/registry/supabase.md`. No RLS change (column rides existing policies; writes are service-client only).

### Step A4 — `lib/passkit.ts`
- Client singleton reading the two env vars; `issueSessionPass(bookingData)` and `voidPass(passId)`.
- **Never-throw** (log + return null/bool) — pass issuance must not fail a webhook or cancellation, same contract as `sendEmail()`.
- Returns pass id + install URL on success.

### Step A5 — Issue on confirmation
- In the Stripe webhook's first-confirm path (where `sendBookingConfirmationForSession` fires): issue one pass **per booking row** (per participant — multi-child bookings get one pass each), persist `passkit_pass_id`, failure-swallowed.
- Course runs (`per_run`): **one pass per run booking** covering all weeks (decided 2026-07-16), not per occurrence.

### Step A6 — Pass link in the confirmation email
- Add the wallet install URL to `lib/emails/booking-confirmation.ts` (per participant if multiple) using the existing `ctaButton` primitive — "Add to Apple/Google Wallet".
- Email builders are pure: pass the URL in via the orchestrator (`lib/notifications.ts`), keep builders DB-free.

### Step A7 — Void on cancellation
- Member self-serve cancel (`POST /api/bookings/[id]/cancel`) and admin occurrence-cancel (`POST /api/admin/occurrences/[id]/cancel`): after the status flip succeeds, `voidPass()` if `passkit_pass_id` set — failure-swallowed, never blocks the refund/credit.

### Step A8 — e2e + deploy
- Seed venue/offering/occurrence + test account (Step 4/7 e2e pattern), book with a TEST-mode payment against a dev webhook, confirm: pass created in PassKit, id persisted, email contains install link, cancel voids the pass. Cleanup to zero leftover rows.
- Ideally install the pass on a real phone once (Apple + Google) — template rendering can't be asserted from code.
- Deploy via git push; confirm Netlify has the two env vars *before* merging the issuance code (fail-soft means silent no-pass otherwise).
- Update registries (`third-party-services.md`, `env-vars.md`), project memory.md + DEVLOG, and the memory file `project_empowr_members_passkit.md`.

## Track B — pointer only (do not build yet)

Needs: Q1 answer (plan definitions — a KB-derived provisional model exists: per-session-type plans from the weekly timetable, £30 floor / £50 Roller Disco, interpolated prices provisional; **not yet ADR'd — get user go-ahead before recording**), then Phase 2 Steps 2–3 (Stripe Billing + subscription lifecycle), then a Members/Loyalty template + issuance/update/void hooks in the subscription webhook. Reuses A's client and credential wiring.

## References
- Docs: https://docs.passkit.io/ · Quickstart: github.com/PassKit/passkit-node-quickstart
- Scoping conversation: 2026-07-15/16 session (see memory `project_empowr_members_passkit`)
- Entitlement intake for Track B's gate: [../phases/phase-2/entitlement-intake.md](../phases/phase-2/entitlement-intake.md)
