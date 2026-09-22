import { refundBooking } from "@/lib/credits";
// POST /api/bookings/[id]/cancel — self-serve cancellation for a
// confirmed booking, restored 2026-09-02 for Programme Policies v1.2.
//
// The policy gate (lib/cancellation.ts) is re-evaluated here and is
// authoritative — the render-time copy on /bookings is only an estimate,
// and a page left open past the 48h cutoff must not be able to cancel.
//
// refundBooking makes a durable database claim before calling Stripe with a
// stable idempotency key. Credit is restored only after the card refund has
// been accepted. Failed or ambiguous requests remain retryable by staff.
//
// Capacity needs no work here: mem_hold_bookings() recomputes live from
// row status and excludes 'refunded', so the place frees itself.
//
// The confirmation email is best-effort and never fails the request —
// the money has already moved by then.
import { NextResponse } from "next/server";
import { getAuthedAccount } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { evaluateCancellationPolicy } from "@/lib/cancellation";
import { formatOccurrence, courseRunWhen } from "@/lib/format";
import { sendBookingCancellationEmail } from "@/lib/notifications";

type Params = { params: Promise<{ id: string }> };

type OfferingJoin = { title: string; refund_policy: "standard" | "non_refundable" };

type BookingRow = {
  id: string;
  status: string;
  account_id: string;
  credit_applied_pence: number;
  price_paid_pence: number | null;
  stripe_payment_intent_id: string | null;
  participant: { name: string } | null;
  occurrence: {
    starts_at: string;
    ends_at: string;
    offering: OfferingJoin | null;
  } | null;
  course_run: {
    label: string;
    starts_on: string | null;
    ends_on: string | null;
    offering: OfferingJoin | null;
  } | null;
};

export async function POST(_request: Request, { params }: Params) {
  const authed = await getAuthedAccount();
  if (!authed) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const { id } = await params;

  const service = createServiceClient();
  const { data, error } = await service
    .from("mem_bookings")
    .select(
      `id, account_id, status, price_paid_pence, credit_applied_pence, stripe_payment_intent_id,
       participant:mem_participants(name),
       occurrence:mem_occurrences(starts_at, ends_at, offering:mem_offerings(title, refund_policy)),
       course_run:mem_course_runs(label, starts_on, ends_on, offering:mem_offerings(title, refund_policy))`
    )
    .eq("id", id)
    .eq("account_id", authed.account.id)
    .maybeSingle();

  if (error) {
    console.error("cancel: booking read failed", id, error);
    return NextResponse.json(
      { error: "Could not load this booking — please try again." },
      { status: 500 }
    );
  }
  const booking = data as unknown as BookingRow | null;
  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }
  const { data: pendingRefund } = await service.from("mem_booking_refunds").select("booking_id")
    .eq("booking_id",id).eq("account_id",authed.account.id).maybeSingle();
  if (booking.status !== "confirmed" && !pendingRefund) {
    return NextResponse.json(
      { error: "Only confirmed bookings can be cancelled here." },
      { status: 409 }
    );
  }

  const offering = booking.occurrence?.offering ?? booking.course_run?.offering;
  const startsAt = booking.occurrence?.starts_at ?? booking.course_run?.starts_on;
  if (!offering || !startsAt) {
    console.error("cancel: booking missing offering/start", id);
    return NextResponse.json(
      { error: "Could not verify this booking's cancellation policy." },
      { status: 500 }
    );
  }

  const policy = evaluateCancellationPolicy(offering.refund_policy, startsAt);
  if (!policy.allowed && !pendingRefund) {
    return NextResponse.json({ error: policy.reason }, { status: 403 });
  }

  let result;
  try { result = await refundBooking(id,authed.account.id); }
  catch (error) {
    console.error("Booking refund pending",id,error);
    return NextResponse.json({error:"The refund could not be completed yet. Retry this cancellation or contact staff; no second refund will be created."},{status:503});
  }
  const amountPence = result.card_pence;
  const when = booking.occurrence
    ? formatOccurrence(booking.occurrence.starts_at, booking.occurrence.ends_at)
    : booking.course_run
      ? courseRunWhen(booking.course_run)
      : "";
  if (authed.user.email && result.first) {
    await sendBookingCancellationEmail(authed.user.email, {
      offeringTitle: offering.title,
      when,
      participantNames: booking.participant ? [booking.participant.name] : [],
      amountPence,
      creditPence: result.credit_pence,
    });
  }

  return NextResponse.json({ ok: true, status: "refunded" });
}
