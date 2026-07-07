# Memory — Empowr Members

## Current Status

- Phase: Phase 0 in progress (2026-07-07). Steps 1–3 done: brand in + build verified; `mem_` schema + signup trigger live on empowr-cic (advisors clean); auth config applied via supabase-admin CLI (site_url members.empowrcic.org, redirect allow-list incl. localhost, Resend SMTP as "Empowr Members <members@empowrcic.org>"). Leaked-password protection unavailable — Pro-plan-gated (accepted). Step 4 (Netlify + domain) remaining; then test signup e2e to confirm SMTP sender domain.
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
