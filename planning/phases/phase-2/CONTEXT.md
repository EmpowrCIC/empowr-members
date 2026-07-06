# Phase 2 — Memberships

**Done when:** a member can subscribe to a plan online, manage it (card, cancel) via Stripe Customer Portal, book any entitled session with zero payment, and part-pay a non-entitled booking with credit balance. Membership status stays in sync with Stripe automatically.

**Blocked by:** entitlement definitions (spec Q1) — Step 1 closes this.
**Requires:** Phase 1 live.

---

## Step 1 — Entitlement definition gate (no code before this closes)

Confirm with Jasmine/Shaun and ADR each: which plans exist (£30 general / £50 Roller Disco / others?), which offering types each covers, session caps per period (or unlimited), family coverage (one plan → all household participants, or per participant?), and whether member booking still requires advance booking (recommended: yes — capacity still counts).
**Done when:** `mem_membership_plans` + `mem_plan_entitlements` rows can be written directly from the ADRs.

## Step 2 — Stripe Billing setup

Products + recurring prices per plan (live + test); `stripe_price_id` into `mem_membership_plans`; Customer Portal configured (cancel, payment method update; plan switches off unless ADR'd).
**Done when:** test subscription completes and the portal loads from a member account.

## Step 3 — Subscription lifecycle

Subscribe flow (plan page → Stripe subscription Checkout); webhooks: `customer.subscription.created/updated/deleted`, `invoice.payment_failed` → `mem_memberships.status` (`active`/`past_due`/`cancelled`); grace behaviour for `past_due` ADR'd (proposed: entitlements pause until paid).
**Done when:** Stripe test-clock run drives status through all three states correctly.

## Step 4 — Entitled booking path

Booking flow checks active membership + entitlement + period cap before the payment step; covered → booking confirms at £0 with `source = member`; capacity and waiver gate still apply.
**Done when:** a member books an entitled session with no Stripe interaction; a capped plan blocks the (n+1)th booking in-period.

## Step 5 — Credit redemption

Checkout part/full payment from `mem_credits` balance (oldest first, respecting expiry); remainder via Stripe; `redeemed_booking_id` set atomically.
**Done when:** a £15 booking with £10 credit charges £5 and marks the credit spent.

## Step 6 — Member UI + verify

Membership card on account page (plan, renewal date, usage vs cap), portal link, member pricing shown in catalogue. /webapp-testing e2e; deploy; registries; memory/DEVLOG; compress this file.

---

## Not in Phase 2
- Pausing/freezing memberships (only if ADR'd in Step 1)
- Gift memberships, family-plan pricing tiers beyond what Step 1 defines
- Attendance-based plan analytics (P3 reporting)
