# DEVLOG — Empowr Members

## 2026-07-08 (Phase 1 technical kickoff)

- src/.env.local written from the live Netlify site's env vars (silent pull via API); Stripe keys left blank pending spec Q4
- Vault pipeline onboarding: MEMBERS_* keys seeded (URL, anon, service role, ADMIN_EMAILS; RESEND_API_KEY stays shared); members entries added to consolidate-secrets.ps1, pull-to-local.ps1, and sync-to-netlify.ps1 (dry-run verified)
- Fixed sync-to-netlify.ps1: its vault read used the vault_decrypted_secrets REST view which 404s (not exposed via PostgREST) — switched to the get_all_secrets RPC; also converted the file to ASCII (PS 5.1 encoding rule)
- **Phase 0 defect found by e2e test**: mem_ tables had no table-level grants — this project's default ACL (2026-06-03 hardening) gives API roles no DML on new tables, so every anon/authenticated/service_role query failed 42501 despite correct RLS. Applied `20260708090000_members_table_grants` (service_role full DML on all 11; anon+authenticated SELECT on 6 catalogue tables; authenticated SELECT on 5 member-owned) — mirrors RLS exactly; verified all three access paths
- e2e signup test PASSED: signup 200 → mem_accounts trigger row created same second → Resend SMTP confirmation from members@empowrcic.org delivered to inbox in 2s (not spam) → verify link sets email_confirmed_at → 303 back to members.empowrcic.org. Test users cleaned up
- Gmail connector reads teams@empowrcic.org (not tech@pecuvate.com) — teams+ plus-addresses are the checkable e2e recipients
- ops/CONTEXT.md corrected (publish `.next` two-sided rule; vault pipeline section added); supabase.md registry updated (grants migration + default-ACL warning)
- Next: Step 1 spec review gate (5 business rules + Stripe account) — the only blocker before Step 2 code

## 2026-07-06 (Phase 0 execution)

- Step 1 done: /init-brand — favicons/logo/manifest from _brand source, full token set in @theme, branded holding page; postcss.config.mjs added (missing from scaffold); npm build verified clean
- Step 2 done: members_initial_schema applied to empowr-cic — 7 enums, 11 mem_ tables, RLS on all (member-owned via member_account_id(), public catalogue reads), 20 indexes + 2 partial uniques; advisors: zero new issues on mem_ tables; one accepted-by-design WARN (member_account_id authenticated EXECUTE) documented in registry
- Step 3 done: members_signup_trigger applied (auto-create mem_accounts on signup); auth config applied via new supabase-admin MCP/CLI (_config/mcp-servers/) — site_url, uri_allow_list, Resend SMTP (members@empowrcic.org); email provider was already enabled by default; leaked-password protection is Pro-plan-gated → accepted, not configurable on free plan
- supabase.md registry updated (tables, functions, migrations, accepted advisory)
- Step 4 done — PHASE 0 COMPLETE: Netlify site empowr-members created via API, CLI build+deploy, members.empowrcic.org CNAME live (INSYNC, HTTPS 200), 5 env vars set via API, .netlify/state.json written
- bookings.empowrcic.org A record (Wix IPs) deleted from Route53 — standalone bookings site superseded by this project (user-directed)
- Publish-path saga: local CLI deploy needed "src/.next" (resolves from repo root) but Netlify CI resolves relative to base → reverted to ".next"; repo linked to Netlify via API (installation 117781637) per deployment policy — push-to-deploy verified green (54s); 7 skill templates corrected with the two-sided rule; CLI deploys are bootstrap-only
- Next: Phase 1 kickoff — Step 1 spec review gate (5 business rules + Stripe account), e2e signup test, src/.env.local

## 2026-07-06

- Project plan written from the Empowr CIC KB (sessions entity + sessions-booking source) — scope, stack, data model, four build phases, open questions
- Project scaffolded via /init-mwp-developer — plan content folded into planning/spec/, planning/architecture/, and planning/decisions/
- Workspace routing tables updated (F:\Projects\CLAUDE.md, F:\Projects\CONTEXT.md, Empowr CIC/CONTEXT.md)
- Parent Empowr CIC repo .gitignore updated with `Empowr Members/`; local git repo initialised on `main`, first commit made
- Pushed to new private remote github.com/Pecuvate/empowr-members; registered in _config/registry/github.md
- Execution plans written for all phases 0–4 under planning/phases/ (restructured from planning/phase-0/) — each with done-when criteria, ordered steps, decision gates, and exclusions
- Coverage review in phases/CONTEXT.md maps every aim component to a phase; caught 4 gaps (GDPR account deletion → P3, Wix customer migration comms → P4, session reminders → P3, business-rule gate → P1 Step 1); 9 ADRs total logged
- Next: execute Phase 0 — Step 1 /init-brand, Step 2 mem_ schema migration, Step 3 Auth config, Step 4 Netlify + domain
