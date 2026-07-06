# Memory — Empowr Members

## Current Status

- Phase: Planning complete + MWP scaffold created (2026-07-06). Repo live at github.com/Pecuvate/empowr-members (main); parent Empowr CIC .gitignore updated.
- Complete: plan (planning/spec + planning/architecture), MWP scaffold, seeded ADRs, first commit, GitHub remote + push, github.md registry entry, Phase 0 execution plan (planning/phase-0/)
- Outstanding: execute Phase 0 per planning/phase-0/CONTEXT.md (brand → schema → auth → Netlify), then Phase 1 MVP build

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
