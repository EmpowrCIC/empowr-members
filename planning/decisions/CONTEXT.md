# Decision Records — ADR Log

One dated record per significant decision. Format: `YYYY-MM-DD-decision-title.md` for full ADRs; the table below is the index.

| Date | Decision | Rationale | Status |
|---|---|---|---|
| 2026-07-06 | Rebuild on our own stack, don't patch Wix | Wix account system broken (500s on all account URLs); long outgrown | Accepted |
| 2026-07-06 | Domain: members.empowrcic.org | dashboard.empowrcic.org reserved for Empowr Dashboard | Accepted |
| 2026-07-06 | Use existing `empowr-cic` Supabase project, `mem_` table prefix | Waiver tables (`people`, `waiver_responses`) already there — waiver gate becomes a table join, not an integration | Accepted |
| 2026-07-06 | Supabase Auth over a third-party IdP | Native RLS integration; no new vendor | Accepted |
| 2026-07-06 | Stripe Checkout + Billing; reuse Heroes' Stripe account | Account already live for Empowr | Proposed — pending Shaun's confirmation (spec open question #4) |
| 2026-07-06 | EELA stays discovery-only; Members is the transactional layer | Fulfils EELA's planned "Phase 2 members backend" without coupling the two codebases | Accepted |
| 2026-07-06 | Generic entitlements table (`mem_plan_entitlements`) | Membership entitlements undefined in KB; generic model unblocks Phase 1 while Phase 2 waits on the definition | Accepted |
| 2026-07-06 | Resend for transactional email (not SES) | Proven in Heroes; one email vendor per org | Accepted |
