# Phase 2 Step 1 — Entitlement Intake (for Jasmine/Shaun)

Take-into-the-conversation version of the entitlement definition gate. Each question states what's already known (KB or working assumption) and the specific options to confirm — answers go straight into `planning/decisions/CONTEXT.md` as ADR rows once settled, per Step 1's done-when: *"`mem_membership_plans` + `mem_plan_entitlements` rows can be written directly from the ADRs."*

**PassKit note (see [[project_empowr_members_passkit]] in memory):** the PassKit *session/booking pass* (Event Tickets protocol) has no dependency on any of these six questions — it hangs off a confirmed booking, which already works in live Phase 1, and can be built independently of this gate closing.

The PassKit *membership pass* (Members/Loyalty protocol) only genuinely needs **Q1** answered — and Q1 alone unblocks more than just the pass: **Steps 2–3 of Phase 2** (Stripe Billing setup + subscription lifecycle) only need plan names/prices, not coverage/cap/family rules, to build products, prices, the Customer Portal, and the status-sync webhook. So answering Q1 alone is enough to reach a genuinely testable, useable milestone: real Stripe subscriptions, real `mem_memberships` status syncing (active/past_due/cancelled), and a real membership pass that can be issued and updated against live data.

**What Q1 alone does *not* unblock:** Step 4 (entitled booking — a member's session coming through free), Step 5 (credit redemption), and Step 6 (account-page usage/cap display) all need the full coverage/cap/family answers (Q2–Q6). So with just Q1: a member can subscribe and hold a working pass, but every booking still charges them normally until Q2–Q6 are answered and Steps 4–6 are built. **Q2–Q6 remain full blockers for that half of Phase 2**, exactly as before.

---

## Q1 — Which plans actually exist ⚠️ only question PassKit's membership pass needs

**Known (KB, `entities/sessions.md`):** Roller Disco £50/month; General membership "from £30/month."

- Is General membership one flat £30/month plan, full stop?
- Or is "from £30" multiple tiers (e.g. by age group or session frequency)? If so — name + price for each.
- Any other plans not yet documented anywhere?

## Q2 — Which offering types each plan covers

Offering types in the system: drop-in, structured lesson, course, camp, event.

- General membership — which of those types does it cover? All, or a subset (e.g. excluding camps/courses, which already have their own per-course pricing)?
- Roller Disco membership — scoped only to All Ages Roller Disco, or broader (other drop-ins at the same venue)?

## Q3 — Session caps per period

- Unlimited sessions, or a real number (e.g. 2/week, 8/month)?
- Does the cap differ by plan?
- If capped: resets on a calendar month, or rolling from the signup date?

## Q4 — Family coverage

- Does one membership cover every child in the household (one account, all participants), or does each participant need their own membership?
- Is there a distinct family-plan price point, separate from an individual one?

## Q5 — Advance booking still required for entitled sessions

**Working default (needs sign-off, not yet confirmed):** yes — a member with an active plan still books a specific occurrence in advance so capacity limits are respected; they just pay £0 at checkout instead of being charged.

- Confirm, or flag if members should be able to attend without reserving a slot (note: this would break the current capacity-enforcement model and needs a bigger conversation if so).

## Q6 — Grace behaviour on a failed membership payment (`past_due`)

**Working default (needs sign-off):** entitlements pause until the payment succeeds — the member reverts to paying full price per session until their card is fixed.

- Confirm, or amend (e.g. full cancellation instead of pause, or a grace window before pausing kicks in — matching however many retry attempts Stripe's own failed-invoice schedule uses).

---

## Once answered

1. Add one ADR row per question to `planning/decisions/CONTEXT.md` (same table format as the existing Phase 1 provisional rows)
2. Update `entities/sessions.md`'s "Members platform policy values" section in the KB — it's already marked as the source of truth for exactly this ("pending confirmation by Jasmine/Shaun; any change lands here first")
3. Step 1 is done — `mem_membership_plans` + `mem_plan_entitlements` rows can be written directly from the ADRs; Step 2 (Stripe Billing setup) can start
