# DEVLOG — Empowr Members

## 2026-07-06 (Phase 0 execution)

- Step 1 done: /init-brand — favicons/logo/manifest from _brand source, full token set in @theme, branded holding page; postcss.config.mjs added (missing from scaffold); npm build verified clean
- Step 2 done: members_initial_schema applied to empowr-cic — 7 enums, 11 mem_ tables, RLS on all (member-owned via member_account_id(), public catalogue reads), 20 indexes + 2 partial uniques; advisors: zero new issues on mem_ tables; one accepted-by-design WARN (member_account_id authenticated EXECUTE) documented in registry
- Step 3 done: members_signup_trigger applied (auto-create mem_accounts on signup); auth config applied via new supabase-admin MCP/CLI (_config/mcp-servers/) — site_url, uri_allow_list, Resend SMTP (members@empowrcic.org); email provider was already enabled by default; leaked-password protection is Pro-plan-gated → accepted, not configurable on free plan
- supabase.md registry updated (tables, functions, migrations, accepted advisory)
- Step 4 done — PHASE 0 COMPLETE: Netlify site empowr-members created via API, CLI build+deploy, members.empowrcic.org CNAME live (INSYNC, HTTPS 200), 5 env vars set via API, .netlify/state.json written
- bookings.empowrcic.org A record (Wix IPs) deleted from Route53 — standalone bookings site superseded by this project (user-directed)
- Fixed netlify.toml publish ".next" → "src/.next" (publish resolves from repo root, not base) — plugin failed onBuild until corrected; 7 skill template files fixed workspace-wide
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
