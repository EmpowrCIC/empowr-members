# Architecture — Empowr Members

System design, stack, and data model. Read before writing any schema or integration code.

---

## Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Next.js 15 (App Router) + TypeScript strict | App-heavy portal; matches EELA, CRM, Heroes |
| Styling | Tailwind CSS 4 + shadcn/ui, Nunito font, lucide-react icons | Empowr brand system (EELA precedent) |
| Database | Supabase — existing `empowr-cic` project (`qrdlheqnnzpasbnayalm`) | Waiver tables already live there; one org, one DB |
| Auth | Supabase Auth (email magic link + password) | Native RLS integration; no new vendor |
| Payments | Stripe — Checkout (one-off) + Billing subscriptions + Customer Portal | Empowr Stripe account live via Heroes (pending confirmation) |
| Email | Resend | Proven in Heroes |
| Hosting | Netlify + Route53 (`/netlify-deploy`) | Workspace standard |
| Motion | framer-motion (light — utility app, not marketing site) | Stack guide requirement |

## System Boundaries

- **EELA** = discovery layer; links into Members booking pages. No data coupling.
- **Empowr Waivers** = same Supabase project; Members reads `people` / `waiver_responses` directly.
- **Heroes** = shares Stripe account only.
- **Never modify non-`mem_` tables** — waiver and EFN tables belong to their own apps.

## Supabase Access Pattern

Per `_config/registry/supabase.md` rules:

- Members read their own data through the anon/server client under RLS (`auth.uid()`-scoped policies)
- **All writes go through API routes using the service client**
- Ownership helper as a `SECURITY DEFINER` function (`member_account_id()`) — never inline-subquery a table inside its own RLS policy (recursion rule)
- RLS enabled on every table before go-live; a local `.sql` file in `src/supabase/migrations/` for every migration applied
- Update `_config/registry/supabase.md` after every applied migration

## Data Model (v1)

```
mem_accounts        auth.users 1:1 — name, phone, whatsapp_opt_in, stripe_customer_id
mem_participants    the people who skate — account_id FK, name, dob, emergency contact,
                    medical notes, person_id FK → people (waiver system link)
mem_venues          name, address, postcode, default capacity
mem_offerings       slug, title, type (drop_in|lesson|course|camp|event), description,
                    age_min/max, price_pence, walk_in_price_pence, early_bird_price_pence,
                    refund_policy (standard|non_refundable), transferable bool,
                    enrolment_scope (per_occurrence|per_run), venue_id, active
mem_occurrences     offering_id, starts_at, ends_at, venue override, capacity, status
                    (scheduled|cancelled_by_empowr|completed)
mem_course_runs     offering_id, label ("Sept 2026 intake"), start/end dates
                    (occurrences link to a run for courses/camps)
mem_bookings        account_id, participant_id, occurrence_id OR course_run_id,
                    status (pending_payment|confirmed|cancelled|credited|refunded|
                    attended|no_show), price_paid_pence, source (online|walk_in|member),
                    stripe_payment_intent_id
mem_membership_plans  name, price_pence, stripe_price_id, active
mem_plan_entitlements plan_id, offering_type or offering_id, sessions_per_period (null = unlimited)
mem_memberships     account_id, plan_id, stripe_subscription_id,
                    status (active|past_due|cancelled), current_period_end
mem_credits         account_id, amount_pence, source_booking_id, expires_at,
                    redeemed_booking_id (null until spent)
```

## Key Mechanisms

**Waiver gate:** at booking time, resolve `mem_participants.person_id` against `waiver_responses` for the active `form_versions` row. No signed waiver → booking flow inserts a "complete your waiver" step linking to waiver.empowrcic.org; booking holds as `pending` until confirmed. Exact linking mechanism (email/name match vs. explicit token) — settle with the Waivers project in Phase 1.

**Capacity race protection:** bookings insert as `pending_payment` with a 30-min expiry counted against capacity; expired pendings released by a pg_cron job (pg_cron already enabled on this Supabase project).

**Payment flows:**
- One-off: booking (`pending_payment`) → Stripe Checkout session → `checkout.session.completed` webhook → booking `confirmed` + confirmation email
- Refund/credit on cancellation: ≥48 hrs → Stripe refund or `mem_credits` row (member's choice); <48 hrs → blocked; non-refundable offerings → always blocked
- Memberships (Phase 2): Stripe Billing subscription → webhook lifecycle sync → `mem_memberships.status`; entitlement check replaces payment step at booking

## Request Lifecycle (booking)

1. Member browses catalogue (server components, anon reads of active offerings/occurrences)
2. Selects occurrence + participant(s) → API route validates age, capacity, waiver, duplicates
3. API route (service client) inserts `pending_payment` booking + creates Checkout session
4. Stripe redirect → webhook confirms → email via Resend
5. My Bookings reads via RLS-scoped server client
