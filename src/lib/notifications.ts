// Notification/side-effect orchestrators — map booking rows to email
// template data or PassKit input, resolve the recipient's login email,
// and send/issue. These sit between the pure builders in lib/emails/ +
// lib/passkit.ts and the DB. The webhook calls sendBookingConfirmationForSession
// and issuePassesForSession; the admin occurrence-cancel route (Step 8)
// calls sendOccurrenceCancelledEmail. There is no member-initiated
// cancellation sender — members have no self-serve cancellation path.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";
import { formatOccurrence, formatDate } from "@/lib/format";
import { buildBookingConfirmationEmail } from "@/lib/emails/booking-confirmation";
import {
  buildOccurrenceCancelledEmail,
  type OccurrenceCancelledEmailData,
} from "@/lib/emails/occurrence-cancelled";
import type { BookingEmailSummary, EmailVenue } from "@/lib/emails/types";
import { issueSessionPass, passInstallUrl } from "@/lib/passkit";

// The joined shape returned for a booking. Supabase types embeds as
// arrays or objects depending on the relationship; we normalise below.
type OfferingJoin = {
  title: string;
  kit_list: string | null;
  refund_policy: "standard" | "non_refundable";
  venue: EmailVenue | null;
};
type BookingRow = {
  account_id: string;
  price_paid_pence: number | null;
  passkit_pass_id: string | null;
  participant: { name: string } | null;
  occurrence: {
    starts_at: string;
    ends_at: string;
    venue: EmailVenue | null;
    offering: OfferingJoin | null;
  } | null;
  course_run: {
    label: string;
    starts_on: string | null;
    ends_on: string | null;
    offering: OfferingJoin | null;
  } | null;
};

const BOOKING_EMAIL_SELECT = `
  account_id, price_paid_pence, passkit_pass_id,
  participant:mem_participants(name),
  occurrence:mem_occurrences(
    starts_at, ends_at,
    venue:mem_venues(name, address, postcode),
    offering:mem_offerings(title, kit_list, refund_policy, venue:mem_venues(name, address, postcode))
  ),
  course_run:mem_course_runs(
    label, starts_on, ends_on,
    offering:mem_offerings(title, kit_list, refund_policy, venue:mem_venues(name, address, postcode))
  )
`;

/** Resolve the account holder's login email via the auth admin API. */
async function accountEmail(
  service: SupabaseClient,
  accountId: string
): Promise<string | null> {
  const { data: account } = await service
    .from("mem_accounts")
    .select("user_id")
    .eq("id", accountId)
    .maybeSingle();
  if (!account?.user_id) return null;
  const { data, error } = await service.auth.admin.getUserById(account.user_id);
  if (error || !data?.user?.email) return null;
  return data.user.email;
}

/** A course-run "when" line: label, plus a date range when both bounds
 *  are known — "Summer term (13 Jul – 17 Aug)". */
function courseRunWhen(run: {
  label: string;
  starts_on: string | null;
  ends_on: string | null;
}): string {
  if (run.starts_on && run.ends_on) {
    return `${run.label} (${formatDate(run.starts_on)} – ${formatDate(run.ends_on)})`;
  }
  return run.label;
}

/** Fold the booking rows of one Checkout session into a single email
 *  summary (one email covers a multi-child booking). Returns null if the
 *  rows carry no recognisable offering. */
function summariseRows(rows: BookingRow[]): BookingEmailSummary | null {
  const first = rows[0];
  if (!first) return null;

  const offering = first.occurrence?.offering ?? first.course_run?.offering;
  if (!offering) return null;

  const when = first.occurrence
    ? formatOccurrence(first.occurrence.starts_at, first.occurrence.ends_at)
    : first.course_run
      ? courseRunWhen(first.course_run)
      : "";

  // Occurrence override wins, else the offering's own venue.
  const venue = first.occurrence
    ? (first.occurrence.venue ?? offering.venue)
    : offering.venue;

  return {
    offeringTitle: offering.title,
    when,
    venue,
    kitList: offering.kit_list,
    participantNames: rows
      .map((r) => r.participant?.name)
      .filter((n): n is string => Boolean(n)),
    passInstallUrls: rows.map((r) => (r.passkit_pass_id ? passInstallUrl(r.passkit_pass_id) : null)),
    amountPaidPence: rows.reduce((sum, r) => sum + (r.price_paid_pence ?? 0), 0),
    refundPolicy: offering.refund_policy,
  };
}

/** Send the booking-confirmation email for a paid Checkout session.
 *  Called from the Stripe webhook after holds flip to confirmed. Never
 *  throws — a failed email must not fail the webhook. Returns true if an
 *  email was sent. */
export async function sendBookingConfirmationForSession(
  service: SupabaseClient,
  checkoutSessionId: string
): Promise<boolean> {
  try {
    const { data, error } = await service
      .from("mem_bookings")
      .select(BOOKING_EMAIL_SELECT)
      .eq("stripe_checkout_session_id", checkoutSessionId)
      .eq("status", "confirmed");
    if (error) {
      console.error("confirmation email: booking read failed", checkoutSessionId, error);
      return false;
    }
    const rows = (data ?? []) as unknown as BookingRow[];
    const summary = summariseRows(rows);
    if (!summary) {
      console.error("confirmation email: no summarisable rows", checkoutSessionId);
      return false;
    }

    const to = await accountEmail(service, rows[0].account_id);
    if (!to) {
      console.error("confirmation email: no recipient email", checkoutSessionId);
      return false;
    }

    const { subject, html } = buildBookingConfirmationEmail(summary);
    return await sendEmail({ to, subject, html });
  } catch (err) {
    console.error("confirmation email threw", checkoutSessionId, err);
    return false;
  }
}

type PassVenue = { id: string; passkit_venue_id: string | null };
type PassIssueRow = {
  id: string;
  participant: { name: string } | null;
  occurrence: {
    starts_at: string;
    ends_at: string;
    venue: PassVenue | null;
    offering: { title: string; venue: PassVenue | null } | null;
  } | null;
  course_run: {
    offering: { title: string; venue: PassVenue | null } | null;
    // Every occurrence in the run — used to span the pass across all
    // weeks (one pass per run booking, not per occurrence; see
    // planning/passkit/CONTEXT.md Step A5).
    occurrences: { starts_at: string; ends_at: string }[];
  } | null;
};

const PASS_ISSUE_SELECT = `
  id,
  participant:mem_participants(name),
  occurrence:mem_occurrences(
    starts_at, ends_at,
    venue:mem_venues(id, passkit_venue_id),
    offering:mem_offerings(title, venue:mem_venues(id, passkit_venue_id))
  ),
  course_run:mem_course_runs(
    offering:mem_offerings(title, venue:mem_venues(id, passkit_venue_id)),
    occurrences:mem_occurrences(starts_at, ends_at)
  )
`;

/** Issue one PassKit pass per booking row of a paid Checkout session
 *  (one per participant; per_run bookings get one pass spanning the
 *  whole run). Called from the Stripe webhook after holds flip to
 *  confirmed. Never throws — a failed issuance must not fail the
 *  webhook. Rows whose venue has no `passkit_venue_id` yet are skipped
 *  silently (venue creation lags behind real-timetable seeding). */
export async function issuePassesForSession(
  service: SupabaseClient,
  checkoutSessionId: string
): Promise<void> {
  try {
    const { data, error } = await service
      .from("mem_bookings")
      .select(PASS_ISSUE_SELECT)
      .eq("stripe_checkout_session_id", checkoutSessionId)
      .eq("status", "confirmed");
    if (error) {
      console.error("pass issuance: booking read failed", checkoutSessionId, error);
      return;
    }

    for (const row of (data ?? []) as unknown as PassIssueRow[]) {
      const offering = row.occurrence?.offering ?? row.course_run?.offering;
      if (!offering) continue;
      const venue = row.occurrence ? (row.occurrence.venue ?? offering.venue) : offering.venue;
      if (!venue?.passkit_venue_id) continue;

      let startsAt: string;
      let endsAt: string;
      if (row.occurrence) {
        startsAt = row.occurrence.starts_at;
        endsAt = row.occurrence.ends_at;
      } else if (row.course_run && row.course_run.occurrences.length > 0) {
        const times = row.course_run.occurrences;
        startsAt = times.reduce((min, o) => (o.starts_at < min ? o.starts_at : min), times[0].starts_at);
        endsAt = times.reduce((max, o) => (o.ends_at > max ? o.ends_at : max), times[0].ends_at);
      } else {
        continue; // per_run booking with no occurrences scheduled yet
      }

      const issued = await issueSessionPass({
        bookingId: row.id,
        offeringTitle: offering.title,
        participantName: row.participant?.name ?? null,
        venueId: venue.id,
        venuePasskitId: venue.passkit_venue_id,
        startsAt,
        endsAt,
      });
      if (!issued) continue;

      const { error: updateError } = await service
        .from("mem_bookings")
        .update({ passkit_pass_id: issued.passId })
        .eq("id", row.id);
      if (updateError) {
        console.error("pass issuance: persist failed", row.id, issued.passId, updateError);
      }
    }
  } catch (err) {
    console.error("pass issuance threw", checkoutSessionId, err);
  }
}

/** Send an Empowr-cancelled-the-session notice. Step 8 supplies the
 *  per-booking outcome. Never throws. */
export async function sendOccurrenceCancelledEmail(
  to: string,
  data: OccurrenceCancelledEmailData
): Promise<boolean> {
  const { subject, html } = buildOccurrenceCancelledEmail(data);
  return sendEmail({ to, subject, html });
}
