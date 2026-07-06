# Phase 4 — Cutover & Wix Decommission

**Done when:** existing customers have been invited across, every public booking CTA points at Members, the KB and registries reflect the new system, the parked branches are merged, and the Wix site is decommissioned.

**Requires:** Phases 1–2 live and stable (recommend ≥2 weeks of real bookings first).

---

## Step 1 — Wix data export (spec Q2)

Export whatever Wix yields: customer list (names/emails), upcoming bookings, active subscriptions. Honour any upcoming Wix bookings manually (admin-create in Members or deliver as booked); cancel Wix subscriptions with notice per their terms.
**Done when:** no future obligation exists only in Wix.

## Step 2 — Member migration comms

Email existing customers (via Resend): what's changing, invite to create an account at members.empowrcic.org, FAQ. Stagger send; monitor signups. WhatsApp group announcement.
**Done when:** invite sent to the full exported list and signup conversion is being tracked.

## Step 3 — Repoint the estate

- Main Site: set `membersUrl` in `links.ts`; merge parked branch `feat/my-account-nav`
- EELA: merge parked branch `feat/members-account-notice`; point all session booking CTAs at Members
- Landing Page: booking links → Members
- Heroes/waiver links unchanged
**Done when:** no public Empowr property links to Wix for booking.

## Step 4 — Knowledge base + registries

KB `entities/sessions.md`: rewrite Booking + Membership sections, retire Wix URLs. /update-registry sweep (netlify-sites, github, supabase, env-vars). Update workspace CONTEXT tables (project status → Live).
**Done when:** a KB query about booking returns members.empowrcic.org only.

## Step 5 — Decommission

Grace period with Wix site carrying a "we've moved" banner + link (30 days proposed, ADR); then cancel the Wix plan / take the site down. Final DEVLOG + memory close-out; compress this file; project status → Live/maintenance.
**Done when:** the Wix subscription is cancelled and nothing 404s that used to matter.

---

## Not in Phase 4
- New features of any kind — cutover only
- Deleting Wix historical data before the export is verified complete
