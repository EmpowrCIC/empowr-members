# PassKit Integration — Build Plan

**Status:** Track A greenlit for build (user-confirmed 2026-07-16). Track B blocked on Phase 2 Steps 2–3. **Steps A0–A7 DONE (A0/A1 2026-07-17, A2/A3/A4 2026-07-21, A5/A6/A7 2026-07-21)** — see below. **Next: Step A8** (live e2e proof + deploy) — the only remaining step.
**Credentials:** REST API Key + Secret vaulted as `MEMBERS_PASSKIT_API_KEY` / `MEMBERS_PASSKIT_API_SECRET` (2026-07-15). As of 2026-07-17: wired into `pull-to-local.ps1` (generic, no code change needed) and `sync-to-netlify.ps1`'s Members entry (as `PASSKIT_API_KEY`/`PASSKIT_API_SECRET`); pulled to `src/.env.local` and pushed to Netlify — both legs confirmed working live (see Step A0 auth test below).
**Account:** PassKit account exists (signed up 2026-07); has at least one existing `EVENT_TICKETING` template ("My Production") — dashboard is not empty, contrary to earlier assumption.

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

### Step A0 — Verify before coding — DONE (2026-07-17), all 4 items empirically confirmed
1. **Event Tickets licensed** — confirmed twice: (a) dashboard "new pass" wizard shows Event Tickets as a normal, unlocked protocol tab with working templates (BASIC EVENT TICKET, SPORTING EVENT); (b) a live API call (below) returned an existing `EVENT_TICKETING`-protocol template already on the account ("My Production", id `1HsBMCQptDR63w5FFLd0vT`) — note this means the dashboard is **not** actually empty as originally assumed; worth a quick look to see if that template was created intentionally.
2. **REST auth mechanism — confirmed working end-to-end.** `docs.passkit.io` is a JS-rendered SPA that WebFetch cannot read past the nav shell (tried repeatedly, structural limitation, not worth retrying). The working recipe came from PassKit's own `github.com/PassKit/jwt-token-generator-zapier` reference implementation, cross-checked live against `POST https://api.pub1.passkit.io/templates/list`:
   - JWT header: `{"alg":"HS256","typ":"JWT"}`
   - JWT payload/claims: `{ uid: <API Key>, iat: <unix seconds>, exp: <unix seconds>, web: false }` — **claim is `uid`, not `key`; there is no `url` or `method` claim** (an earlier search result claiming per-request-bound `url`/`method` claims and a `PKAuth` auth scheme was wrong/hallucinated — do not reuse those details)
   - Signature: HMAC-SHA256 over `base64url(header) + "." + base64url(payload)`, signing key = the raw API **Secret** string (UTF-8 bytes, not base64-decoded first)
   - Token = `base64url(header).base64url(payload).base64url(signature)`
   - Header on the actual API call: `Authorization: Bearer <jwt>` (not `PKAuth` — that was the wrong detail above)
   - **Clock-skew gotcha**: a fresh `iat` (= exact call time) got `401 "Token used before issued"` even though the header/payload parsed fine. Backdating `iat` by 60 seconds fixed it. Build `lib/passkit.ts`'s token generator with this same 60s buffer baked in.
   - Endpoint base: `https://api.pub1.passkit.io` (EU/pub1 — matches the account region). Errors come back as gRPC-gateway JSON (`{"error":{"code":<grpc status>,"message":...}}`) since PassKit's REST layer is a grpc-gateway proxy in front of their real gRPC backend.
3. **Pass-update semantics confirmed** — passes support genuine in-place updates (push notification / pull-to-refresh), no reissue needed. Source: [Introduction to Updating Passes](https://help.passkit.com/en/articles/6609055-introduction-to-updating-passes).
4. **Node quickstart reviewed and ruled out** — `passkit-node-quickstart` / `passkit-node-sdk` / `passkit-node-grpc-sdk` are 100% mutual-TLS gRPC (client cert + private key + passphrase via `grpc.credentials.createSsl()`), a completely different credential type ("SDK Credentials") from the plain REST Key+Secret we're using. Confirmed via reading `src/lib/client.js` directly — zero JWT code anywhere in that repo. Correctly not used here; our plain REST+JWT approach (above) is the right fit for Netlify serverless functions anyway (gRPC + cert files doesn't fit that runtime well).

### Step A1 — Credentials into the pipeline
- Add `MEMBERS_PASSKIT_API_KEY` / `MEMBERS_PASSKIT_API_SECRET` to `F:\Projects\scripts\pull-to-local.ps1` (members entry) and `sync-to-netlify.ps1` `$siteVarMap` (Members site `76f903e4-3795-406a-9478-34be6b0ed015`).
- Pull to `src/.env.local`; push to Netlify. Gotcha: existing-key pushes need `PATCH /accounts/{id}/env/{key}?site_id=...` flat body, context ≠ `all` — see project memory.md.
- Never Read `.env` files directly; PowerShell-extract silently. `.ps1` files ASCII-only.

### Step A2 — PassKit dashboard setup (Event Tickets) — DONE (2026-07-21), built via API not dashboard, proven end-to-end

**Real objects created (production account):**
| Object | ID | uid |
|---|---|---|
| Images (icon + logo) | icon `4lD7zAjjz7mkJklZeuSZbe`, logo `6WENXpxwiXapjfRkzMgE8s`, appleLogo `4drf8jqU2OaR1MkUzPf6gr` (auto-derived from logo) | — |
| Template ("Empowr Session Pass") | `3e9Vjyl8HGaSa02z0Wo1sY` | — |
| Production ("Empowr Sessions") | `27xx6YlVGWi65uxtO1mNbB` | `empowr-sessions` |
| Ticket Type ("Empowr Session Ticket") | `4KyxqXkNfBOZDot9RfvqVe` | `empowr-session-ticket` |

**Orphaned (first attempt, wrong uid — harmless, no delete endpoint found, safe to ignore):** Template `670y5xsYysSx0QGqHwyjOW`, Production `1juRXlbA6zqEEFWNGSIBny`, Ticket Type `0YSfJ5boLqM4lMhR6j8aeB`. A throwaway test venue (`3N7SGGq9s2rOHylbVmV7rY`, uid `test-venue-delete-me`) and test ticket (`6kdTbgff3vX92NLZUSmVoK`) also exist from the end-to-end proof below — both clearly named, safe to leave or delete once a Venue/Ticket delete path is found.

**Blocked: Apple Wallet passes won't work for real users yet.** `passTypeIdentifier` is set to `pass.com.empowrcic.members` (a real value, chosen now so nothing needs to change later) but Apple requires a paid Apple Developer Program membership to register that Pass Type ID and generate a signing certificate, which then gets uploaded to PassKit against this Production. **As of 2026-07-21, that membership is in progress, not yet confirmed.** Until the cert is uploaded, PassKit rejects `PROJECT_PUBLISHED` status — the Production was created with `status: ["PROJECT_ACTIVE_FOR_OBJECT_CREATION", "PROJECT_DRAFT"]` instead (server error confirmed: status must contain either `PROJECT_DRAFT` or `PROJECT_PUBLISHED`, and `PROJECT_PUBLISHED` alone was rejected as "account not eligible for production use"). **Once the cert is ready: flip Production status to include `PROJECT_PUBLISHED` instead of `PROJECT_DRAFT`** (exact update mechanism — POST to `/eventTickets/production` again with the same `id`, or a dedicated update endpoint — not yet confirmed, treat as a fresh small investigation). Google Wallet is a separate mechanism and should be unaffected by this gap.

**Confirmed REST paths** (base `https://api.pub1.passkit.io`, all POST unless noted):
- `/images` — create (bundles icon/logo/appleLogo etc. in one call, returns an `imageIds`-shaped object)
- `/template` (singular, NOT `/templates`) — create. `/templates/list` and `/templates/count` (plural) are the read endpoints — **the create path breaks the plural-resource-root naming pattern the reads follow**, found via a help.passkit.com article, not guessable from the reads.
- `/eventTickets/production` — create
- `/eventTickets/venue` — create
- `/eventTickets/ticketType` — create
- `/eventTickets/ticket/id` — issue a ticket (confirmed from help.passkit.com's "Create an event ticket" article)
- No Event — Create call exists or is needed (see below)
- `/eventTickets/venue/{id}` (GET) — read a venue by id; `/eventTickets/venue` (DELETE, body `{"id": "..."}`) — hard-delete
- `/eventTickets/ticket/id/{id}` (GET) — read a ticket by id; `/eventTickets/ticket` (DELETE, body `{"ticketId": "..."}` — note the different field name from venue's delete) — hard-delete, confirmed void mechanism for Step A7
- Pass install URL is client-constructed, not returned by the API: `https://pub1.pskt.io/{ticketId}` (EU/pub1 region)
- See Step A4 below for the full writeup of how these were found (PassKit's own Golang gRPC-gateway SDK source on GitHub, which lists every registered REST path)

**Critical: the PassKit v4 SDK Postman collection is 100% gRPC** (every request targets `grpc://grpc.{{passkitEnv}}.passkit.io:443`), and its "Message" bodies show the **gRPC wire/reflection shape**, not the REST/JSON-mapping shape our plain Key+Secret JWT approach actually needs. Several fields differ between the two, discovered by iterating live against real (safe, one-time-setup) create calls:
- **Timestamps**: gRPC shows `{"seconds":"...","nanos":0}` (raw `google.protobuf.Timestamp` wire format); REST/JSON needs an **RFC3339 string** instead (e.g. `"2026-07-21T16:36:06Z"`). Applies to `doorsOpen`/`scheduledStartDate`/`actualStartDate`/`endDate`.
- **`metaData`**: gRPC shows an array of `{key, value}` objects; REST/JSON needs a **plain object/map** (`{"offeringTitle": "Roller Disco"}`).
- **Object references** (`production`, `venue`, `ticketType` inside a Ticket — Issue call): gRPC/the example bodies showed flat `productionId`/`venueId`/`ticketTypeId` strings; REST/JSON actually needs **nested objects with both `id` AND `uid`** — e.g. `"production": {"id": "27xx...", "uid": "empowr-sessions"}`. `uid` is a separate user-assigned identifier from PassKit's own `id` (set at create time, defaults to empty if you pass `""`) and **is required when referencing that object elsewhere, not just at creation** — always give every created object a real, non-empty `uid`.
- **Template reuse constraint**: a Template can only be the before/after-redeem template of **one** Ticket Type at a time — reusing one across ticket types 409s ("before redeem template is already in use"). Each distinct Ticket Type needs its own Template (or its own before/after pair).
- **`landingPageSettings.localizedTextOverrides`**: object/map (`{}`), not an array, despite the plural name.
- **`barcode.format`**: bare enum value `"QR"`, not `"QR_CODE"`.
- Errors are gRPC-gateway JSON (`{"error": "..."}`, sometimes with a byte-offset proto parse error, sometimes a named `validation err:` message) — the validation errors are precise and safe to iterate against live (one-time setup calls have no side effects on a 400).

**No separate "Event" object needs to be created.** Confirmed empirically: issuing a ticket with `event: {production, venue, doorsOpen, scheduledStartDate, actualStartDate, endDate}` inline **auto-creates** an Event behind the scenes and returns its `eventId` in the response — there is no Event — Create call in the API at all. This means Step A5 (issue-on-confirm) never needs to pre-create or store a PassKit Event per occurrence; every ticket issuance just carries its own timestamp snapshot.

**Architecture confirmed**: one shared Production, one shared Ticket Type, one shared Template (all created above) — Venue is the only object that needs one-per-real-venue. **`mem_venues` is currently empty** (no real venues seeded yet, real-timetable work still gated on Q6/Jasmine) — so Venue creation is **not** backfilled here; instead it gets wired into the admin venue create route (`POST /api/admin/venues`) so every future real venue automatically gets a `passkit_venue_id`, give-or-take Step A3's migration adding that column.

**JWT auth recipe** (working, proven — see Step A0 above for the full writeup): claim `uid` (not `key`), no `url`/`method` claims, `Authorization: Bearer <jwt>` (not `PKAuth`), 60s-backdated `iat` for clock-skew tolerance. Reusable `lib/passkit.ts`-shape helper functions were prototyped in a scratch PowerShell script this session (`Get-PassKitCreds`, `New-PassKitJwt`, `Invoke-PassKitRaw`) — port this logic directly into the real TypeScript client in Step A4, don't rediscover it.

### Step A3 — Schema migration — DONE (2026-07-21)
- `passkit_pass_id text` (nullable) on `mem_bookings`; `passkit_venue_id text` (nullable) on `mem_venues`. Migration `20260721180000_members_passkit_columns.sql`, applied via MCP, `_config/registry/supabase.md` updated. No RLS change (columns ride existing policies; writes are service-client only).

### Step A4 — `lib/passkit.ts` — DONE (2026-07-21), e2e-proven for the venue half
- Built `createPassKitVenue()`, `issueSessionPass()`, `voidPass()` — plain `fetch` + hand-rolled JWT (Node `crypto`, no new dependency), never-throw (log + return null/bool), same contract as `sendEmail()`.
- **New confirmed REST facts, discovered live this session while building the client** (not in Step A2's table above — read these before touching `lib/passkit.ts` again):
  - **`GET /eventTickets/venue/{id}`** works directly (no `/id/` sub-segment, unlike tickets below) — returns the venue's stored shape: `{id, uid, name, localizedName, address, localizedAddress, timezone, gpsCoords: [], eventUrls, room, created, updated}`. **`address` is a flat string**, not a nested Address object — simpler than the ticket/event gotchas implied.
  - **`GET /eventTickets/ticket/id/{id}`** (note: `ticket/id/` then the real id — a 3-segment path, confirmed via the PassKit Golang gRPC-gateway SDK's `a_rpc.pb.gw.go` on GitHub, which lists every REST path PassKit's mux registers). Returns the full ticket incl. `status` (`"ISSUED"`), `passMetaData.status` (`"PASS_ISSUED"`), the resolved `event`/`venue`/`ticketType` sub-objects, `metaData`.
  - **Delete endpoints use different body field names per resource** — easy to get wrong: `DELETE /eventTickets/venue` wants `{"id": "<venueId>"}`; `DELETE /eventTickets/ticket` wants `{"ticketId": "<ticketId>"}` (NOT `id`). Both are **genuine hard deletes** — confirmed live: a deleted ticket's `GET .../id/{id}` 404s immediately after (`"ticket with id[...] does not exist"`), there's no soft-void state. This is what backs `voidPass()`.
  - **Pass install URL is NOT returned by the issue-ticket response** — the response is just `{ticketId, productionId, venueId, ticketTypeId, eventId}`. The URL is constructed client-side: `https://pub1.pskt.io/{ticketId}` (EU/pub1 — matches our API region; the US mirror is `pub2.pskt.io`), confirmed via help.passkit.com's "Introduction to distributing passes" article, not an API field.
  - **Convention adopted for `lib/passkit.ts`**: every object we create gets `uid` = that object's own Supabase row id (`mem_venues.id` for venues, `mem_bookings.id` for tickets) — makes every PassKit object traceable back to its DB row without a separate lookup table.
- **`createPassKitVenue()` e2e-proven live** (2026-07-21): inserted a real `mem_venues` row, created its PassKit Venue, persisted `passkit_venue_id`, GET-verified the round-trip (name/uid/address all matched), then deleted both sides — zero leftover rows on either system. `issueSessionPass()`/`voidPass()` are not yet e2e-proven end-to-end as wired code (the underlying REST shapes they use *were* proven live during Step A2/A4 probing — issuing and hard-deleting a real test ticket both succeeded) — Step A8 is where they get exercised through the real booking flow.

### Step A5 — Issue on confirmation — DONE (2026-07-21)
- New `issuePassesForSession(service, checkoutSessionId)` orchestrator in `lib/notifications.ts` (colocated with the email orchestrator, not in `lib/passkit.ts` — keeps all Supabase-row-shape mapping in one place, matches Step A6's need to reuse the same rows). Called from the webhook's first-confirm branch, right before `sendBookingConfirmationForSession`.
- Queries confirmed booking rows for the session with occurrence/course_run → offering → venue nested selects (mirrors `BOOKING_EMAIL_SELECT`'s shape). One `issueSessionPass()` call **per booking row** (= per participant, since `mem_bookings` already has exactly one row per participant per occurrence/run — confirmed from the `uniq_mem_booking_participant_occurrence`/`_run` constraints, so no extra "one per participant" logic was needed).
- **Course runs (`per_run`): one pass spans the whole run** — implemented by pulling every occurrence under that `course_run_id` (nested `occurrences:mem_occurrences(starts_at, ends_at)`) and taking min(starts_at)/max(ends_at) as the ticket's `doorsOpen`/`endDate` window, since `mem_course_runs` itself only has `starts_on`/`ends_on` **dates** (no time-of-day) — the per-occurrence timestamps are the only source of real start/end times.
- Rows whose resolved venue has no `passkit_venue_id` yet (venue predates the PassKit wiring, or PassKit venue-creation failed) are **skipped silently** — a missing pass must never block a confirmed, paid booking.
- Not yet e2e-proven live (needs a real Checkout session + seeded venue with a real `passkit_venue_id` — that's Step A8). Verified via clean `next build` only.

### Step A6 — Pass link in the confirmation email — DONE (2026-07-21)
- `passInstallUrl(passId)` extracted as a small exported helper in `lib/passkit.ts` (both `issueSessionPass()` and the email orchestrator now share it, instead of the URL format living in two places).
- `BookingEmailSummary` (`lib/emails/types.ts`) gained `passInstallUrls: (string | null)[]`, same index order as `participantNames` — built in `summariseRows()` by reading each row's `passkit_pass_id` (added to `BOOKING_EMAIL_SELECT`). This relies on Step A5's `issuePassesForSession` having already persisted the id **before** `sendBookingConfirmationForSession` runs its own fresh query — the webhook awaits A5 first, so this is safe without any explicit hand-off between the two functions.
- `lib/emails/booking-confirmation.ts`: one `ctaButton` per participant with a non-null install URL — label is "Add to Apple/Google Wallet" for a single participant, or "Add {first name}'s pass to Wallet" per participant when there's more than one (so they're distinguishable). Participants with no pass (skipped in A5) just get no button — never a broken link.

### Step A7 — Void on cancellation — DONE (2026-07-21)
- Member self-serve cancellation was removed 2026-07-21 (no-refund policy change) — the only cancel path left is admin occurrence-cancel (`POST /api/admin/occurrences/[id]/cancel`). Added `passkit_pass_id` to that route's booking select/type; after each confirmed booking's status flip to `refunded`/`credited` succeeds, `voidPass()` fires if `passkit_pass_id` is set. `voidPass()` is already never-throw internally, so no extra try/catch was needed — it genuinely cannot block the refund/credit it follows.
- Pending (`pending_payment`) bookings released by the same route never had a pass issued (Step A5 only fires on confirm), so nothing to void there.

**A5/A6/A7 combined verification**: clean `next build` (typecheck + lint + all 17 routes compile) after each step. **Not e2e-proven live** — needs a seeded venue with a real `passkit_venue_id`, a real occurrence, and a TEST-mode Checkout session run through a dev webhook; that's the whole of Step A8 below.

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
