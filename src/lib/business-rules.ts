// Business rules — provisional MVP defaults, ADR'd 2026-07-08.
// Source of truth for policy: Empowr KB entities/sessions.md.
// Each value is a named constant so a confirmed change from Jasmine/Shaun
// is a one-line swap. Do not inline any of these values in components
// or API routes.

/** Credits expire this many months after issue. Only issued via the
 *  Empowr-initiated occurrence-cancel flow (admin picks refund or
 *  credit) — members have no self-serve path to a credit. */
export const CREDIT_EXPIRY_MONTHS = 12;

/** Walk-ins are not system-captured in Phase 1 — door payments stay
 *  outside the system until Phase 3. */
export const WALK_INS_CAPTURED = false;

/** Waiver linking mechanism: match mem_participants → people by
 *  normalised email + name at booking; unmatched → prompt to complete
 *  waiver; admin can link manually. */
export const WAIVER_LINK_STRATEGY = "email_name_match" as const;

/** pending_payment bookings hold capacity for this long before the
 *  pg_cron expiry job releases them (lands with the booking flow, Step 4). */
export const PENDING_BOOKING_EXPIRY_MINUTES = 30;

/** All occurrence times are wall-clock UK time. */
export const TIMEZONE = "Europe/London";
