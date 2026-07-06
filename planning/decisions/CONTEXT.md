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
| 2026-07-06 | Public (anon) SELECT on active catalogue tables | Visitors must browse sessions before creating an account | Accepted |
| 2026-07-06 | Signup trigger auto-creates `mem_accounts` | Standard Supabase pattern; avoids incomplete-profile dead-end | Accepted |
| 2026-07-06 | Supabase Auth SMTP via Resend | One email vendor; conditional on empowrcic.org domain verification in Resend | Accepted |
| 2026-07-06 | Stripe excluded from Phase 0 | Nothing in Phase 0 needs payments; account question blocks Phase 1 only | Accepted |
| 2026-07-06 | Phase plans grouped under `planning/phases/phase-N/` | Keeps the planning workspace index clean; one routing entry covers all phases | Accepted |
| 2026-07-06 | Account self-service incl. GDPR deletion added to Phase 3 | Child data makes deletion non-optional; caught in phases coverage review | Accepted |
| 2026-07-06 | Wix customer migration comms added to Phase 4 | Existing customers need an onboarding path before decommission | Accepted |
| 2026-07-06 | Credits issuable in P1, redeemable from P2 | Cancellation policy needs credits before membership features exist | Accepted |
