# Memory — Empowr Members

## Current Status

- Phase: **Phase 0 COMPLETE** (2026-07-07). Live at https://members.empowrcic.org (Netlify site `76f903e4-3795-406a-9478-34be6b0ed015`, SSL active, HTTPS 200 verified). Schema + signup trigger + auth config live on empowr-cic; 5 env vars set via API; obsolete bookings.empowrcic.org (Wix A record) deleted from Route53. Gotcha fixed: netlify.toml publish must be `src/.next` (resolves from repo root) — templates updated workspace-wide.
- Outstanding for Phase 1 kickoff: spec review gate (5 business rules with Jasmine/Shaun + Stripe account confirmation), e2e signup test (confirms Resend SMTP sender), write src/.env.local for local dev (values via vault pipeline). Leaked-password protection Pro-plan-gated (accepted).
- Complete: plan (planning/spec + planning/architecture), MWP scaffold, seeded ADRs, GitHub remote + registry entry, execution plans for ALL phases 0–4 (planning/phases/) with coverage review against the project aim
- Outstanding: execute Phase 0 per planning/phases/phase-0/CONTEXT.md (brand → schema → auth → Netlify), then phases 1–4 in order

## Key Decisions

- Domain: members.empowrcic.org (dashboard.empowrcic.org reserved for Empowr Dashboard)
- Database: existing `empowr-cic` Supabase project — waiver tables live there, so the waiver gate is a table join
- Payments: Stripe Checkout (one-off) + Billing (memberships); account = Heroes' Stripe account **pending confirmation** (open question #4 in spec)
- EELA stays discovery-only; this project is the transactional layer
- All new tables `mem_` prefixed; writes via service client only

## Preferences

- Make reasonable implementation decisions without asking; only block on genuine business questions (entitlements, Stripe account)

## Parked work waiting on this project

- `feat/my-account-nav` (Empowr Main Site) and `feat/members-account-notice` (Empowr EELA) — merge at Phase 4 cutover; set `membersUrl` in Main Site links.ts first

## Pre-Close Checklist

- [ ] Update Current Status to reflect what changed this session
- [ ] Record any new decisions in Key Decisions (ADR in planning/decisions/ if significant)
- [ ] Note any outstanding work that was not completed
