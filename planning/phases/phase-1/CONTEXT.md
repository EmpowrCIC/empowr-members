# Phase 1 — MVP: Accounts + Booking (the Wix replacement)

**Done when:** a member can sign up, add a child, book and pay for any active offering (drop-in, lesson, course, camp, event), receive a confirmation email, and cancel within policy — and an admin can manage the catalogue and view a register per occurrence. Live at members.empowrcic.org, security checks passed.

**Blocked by:** Stripe account decision (spec Q4) — required before Step 5.
**Requires:** Phase 0 complete.

---

## Step 1 — Spec review gate (no code before this closes)

Resolve the outstanding business rules with Jasmine/Shaun. Each answer lands in **two places in the same pass**: an ADR row (the decision event, with status) and the Empowr KB `entities/sessions.md` (the living business fact — the KB stays the single source of truth for policy; the ADR only records that/when/why it was decided):

| Rule | Proposed default (confirm or replace) |
|---|---|
| Credit expiry | 12 months from issue |
| Discretionary refund exceptions (<48h) | Admin-only override flag on a booking; no member-facing promise |
| Walk-ins in Phase 1 | Not system-captured — door payments stay outside the system until P3 |
| Waiver linking mechanism (spec Q3) | Match `mem_participants` → `people` by normalised email + name at booking; unmatched → prompt to complete waiver; admin can link manually |
| Session schedule accuracy (spec Q6) | Verify full timetable with Jasmine before seeding |

**Done when:** all five ADR'd; Stripe account confirmed (Q4).

## Step 2 — Auth + account UI

Sign up / sign in (magic link + password), auth middleware (session guard per `_config/guides/auth-middleware.md`), account page, household management (add/edit participants, DOB, emergency contact, medical notes).
**Done when:** a parent account holds two child participants; age eligibility derives from DOB.

## Step 3 — Catalogue + seeding

Offering list + detail pages, occurrence calendar, venue display, kit-list display. Seed offerings/occurrences/venues from KB sessions data *after* Step 1 schedule verification. Public browse (anon) works logged out.
**Done when:** every current session type from the KB is browsable with correct prices, venues, age ranges.

## Step 4 — Booking flow

Occurrence (or course-run) selection → participant selection (age-validated) → waiver gate → duplicate/capacity check → `pending_payment` booking insert. pg_cron expiry job (30 min) releasing stale pendings — the job deferred from Phase 0 lands here.
**Done when:** two concurrent bookings can't oversell an occurrence; expired pendings release.

## Step 5 — Payments (Stripe)

Checkout session per booking (multi-participant = one session, line item each); `checkout.session.completed` webhook → confirm booking; signature verification; idempotent webhook handling. Walk-in/early-bird prices honoured by offering fields. Env vars into Netlify.
**Done when:** test-mode end-to-end booking confirms via webhook, including a course run and a multi-child booking.

## Step 6 — Emails (Resend)

Booking confirmation (venue, time, kit list, cancellation policy, waiver status), cancellation/refund/credit notices, Empowr-cancels-occurrence notice.
**Done when:** each template renders with real booking data and sends from a verified address.

## Step 7 — My Bookings + cancellation

Upcoming/past bookings; self-serve cancellation enforcing: ≥48h → refund or credit (member chooses); <48h → blocked with policy message; non-refundable offerings → always blocked. Stripe refund API + `mem_credits` issue.
**Done when:** all four policy paths behave per spec table.

## Step 8 — Admin area

Allowlist-gated (`ADMIN_EMAILS` middleware). CRUD: offerings, occurrences, course runs, venues. Register view per occurrence. Cancel-occurrence flow → notify + refund/credit every booking.
**Done when:** an admin can run next week's real timetable without touching the database.

## Step 9 — Verify + go live

/webapp-testing e2e pass (signup → book child → cancel ≥48h → credit issued); /pre-deploy-security; /netlify-supabase-check; privacy policy live via LegalHub (spec Q5 — launch gate); switch Stripe to live mode; deploy; update registries; memory/DEVLOG; compress this file.

---

## Decisions in this plan
- One Stripe Checkout session per booking regardless of participant count
- pg_cron expiry lands in P1 with the booking flow (not P0)
- Walk-ins stay off-system until Phase 3

## Not in Phase 1
- Memberships, entitlements, credit *redemption* (P2 — credits can be issued in P1, spent from P2)
- Check-in/attendance marking, waitlists, reporting (P3)
- Any Wix decommissioning (P4)
