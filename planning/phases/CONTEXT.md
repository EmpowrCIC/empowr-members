# Phases — Execution Plan Index

Ordered build phases for Empowr Members. Each phase has its own subdirectory with an execution plan: done-when criteria, ordered steps, decisions, and explicit exclusions. Scope authority stays with [spec](../spec/CONTEXT.md); these files are *how*, not *what*.

**The aim (from spec):** a membership site members fully manage and use to access all Empowr sessions — replacing the Wix booking system end to end.

| Phase | Outcome | Status | Blocked by |
|---|---|---|---|
| [phase-0/](phase-0/CONTEXT.md) | Foundation: schema live, auth working, brand in place, holding page at members.empowrcic.org | Planned | — |
| [phase-1/](phase-1/CONTEXT.md) | MVP: member books + pays for any session for themselves or their child; admin manages catalogue | Planned | Stripe account decision (spec Q4) |
| [phase-2/](phase-2/CONTEXT.md) | Memberships: subscribe, self-manage, book entitled sessions without payment, spend credits | Planned | Entitlement definitions (spec Q1) |
| [phase-3/](phase-3/CONTEXT.md) | Operations: check-in, walk-ins, waitlists, reporting, enquiries, account self-service | Planned | Phase 1 live |
| [phase-4/](phase-4/CONTEXT.md) | Cutover: members migrated, all CTAs repointed, Wix decommissioned | Planned | Phases 1–2 live |

Work phases strictly in order. A phase closes only when its done-when criteria are all met; compress its plan file to a summary at close (DEVLOG-style).

---

## Coverage Review — does the chain reach the aim?

Traceability from the aim to a phase. Reviewed 2026-07-06.

| Aim component | Delivered by |
|---|---|
| Members create + manage accounts | P0 (auth) + P1 (account/household UI) + P3 (self-service: email/password change, data export/deletion) |
| Book **all** session types — drop-in, lesson, course, camp, event | P1 (all five offering types incl. course runs; tiered event pricing via early-bird field) |
| Book for children (household model) | P1 |
| Pay online, cashless | P1 (Stripe Checkout) |
| Hold + self-manage a membership | P2 (Stripe Billing + Customer Portal) |
| Access sessions without per-session payment | P2 (entitlement-covered booking) |
| Self-manage bookings: view, cancel, refund/credit per policy | P1 (booking mgmt) + P2 (credit redemption) |
| Waiver compliance before first session | P1 (waiver gate) |
| Empowr staff run sessions from the system | P1 (admin catalogue + registers) + P3 (check-in, walk-ins, waitlists, reporting) |
| Wix fully replaced | P4 (migration comms, CTA repoint, redirect, decommission) |

**Gaps caught in this review and folded into the plans:**
1. Account self-service (change email/password, delete account) was in no phase — added to P3. Child data + GDPR makes deletion non-optional; retention policy remains a P1 launch gate (spec Q5)
2. Existing Wix customers had no onboarding path — P4 now includes migration comms (invite existing customers to create accounts) before decommission
3. Session reminder emails — added to P3 as optional; confirmation emails alone leave no-show risk high for camps/courses
4. Unresolved business rules (credit expiry, discretionary refund exceptions, walk-in handling) — P1 Step 1 is now a spec-review gate that closes them before code is written
