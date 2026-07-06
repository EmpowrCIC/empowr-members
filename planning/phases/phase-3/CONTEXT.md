# Phase 3 — Operations

**Done when:** coaches/marshals run sessions from a phone (register + check-in), walk-ins are captured in-system at the door, full occurrences take waitlists, admins pull attendance/revenue reports, corporate/party enquiries arrive by form, and members can self-serve account changes — including deletion.

**Requires:** Phase 1 live (Phase 2 helpful but not required).

---

## Step 1 — Check-in view

Mobile-first register per occurrence for coach/marshal role (new allowlist tier below admin): mark attended / no-show; kit-check flag optional. Feeds booking status for reporting.
**Done when:** a coach marks a real session's register from a phone in under a minute.

## Step 2 — Walk-in capture

Door flow on the check-in view: add participant (minimal detail + waiver check) → Stripe payment link / QR at walk-in price → booking recorded with `source = walk_in`.
**Done when:** a walk-in appears in the register and revenue reports with the surcharge price.

## Step 3 — Waitlists

Join-waitlist on full occurrences; on cancellation, notify next in line (email, time-boxed claim link — 4h proposed, ADR); expiry passes to the next.
**Done when:** a cancellation on a full occurrence fills from the waitlist without admin involvement.

## Step 4 — Reporting

Attendance + revenue per offering/period; no-show rates; member vs one-off split. Export (CSV) for CIC 34 impact figures (attendances per year is a KB-tracked metric).
**Done when:** last month's attendance number for any offering takes one click.

## Step 5 — Account self-service (GDPR)

Change email/password; data export (household + booking history); account deletion — anonymise bookings (keep financial records per retention policy from spec Q5), delete participants/medical data.
**Done when:** deletion leaves no personal data while preserving lawful financial records.

## Step 6 — Comms + enquiries

Session reminder emails (24h before, per-offering toggle); corporate/birthday enquiry form → general@empowrcic.org; WhatsApp group link surfaced post-booking. Verify, deploy, registries, memory/DEVLOG, compress this file.

---

## Not in Phase 3
- Native WhatsApp/SMS sending — email only; WhatsApp stays the existing community group
- Coach scheduling/payroll (Freelancer-Workflow owns staff-side ops)
- Self-serve corporate booking
