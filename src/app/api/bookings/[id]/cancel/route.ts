// POST /api/bookings/[id]/cancel — self-serve cancellation for a
// confirmed booking. Policy gate (lib/cancellation.ts) decides refund vs
// credit vs hard block. The status flip is claimed atomically first
// (confirmed -> refunded|credited, guarded by .eq("status","confirmed"))
// so two concurrent requests can't both refund; if the Stripe call or
// credit insert then fails, the claim is rolled back to confirmed so the
// member can retry. Confirmation email is best-effort — never fails the
// request.
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthedAccount } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { getStripe } from "@/lib/stripe";
import { evaluateCancellationPolicy } from "@/lib/cancellation";
import { CREDIT_EXPIRY_MONTHS } from "@/lib/business-rules";
import { formatOccurrence } from "@/lib/format";
import { sendBookingCancellationEmail } from "@/lib/notifications";

const cancelSchema = z.object({ outcome: z.enum(["refund", "credit"]) });

type Params = { params: Promise<{ id: string }> };

type OfferingJoin = { title: string; refund_policy: "standard" | "non_refundable" };

type BookingRow = {
  id: string;
  status: string;
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
    offering: OfferingJoin | null;
  } | null;
};

export async function POST(request: Request, { params }: Params) {
  const authed = await getAuthedAccount();
  if (!authed) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const { id } = await params;

  const parsed = cancelSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Choose refund or credit." },
      { status: 400 }
    );
  }
  const { outcome } = parsed.data;

  const service = createServiceClient();
  const { data, error } = await service
    .from("mem_bookings")
    .select(
      `id, status, price_paid_pence, stripe_payment_intent_id,
       participant:mem_participants(name),
       occurrence:mem_occurrences(starts_at, ends_at, offering:mem_offerings(title, refund_policy)),
       course_run:mem_course_runs(label, starts_on, offering:mem_offerings(title, refund_policy))`
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
  if (booking.status !== "confirmed") {
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
  if (!policy.allowed) {
    return NextResponse.json({ error: policy.reason }, { status: 403 });
  }

  const amountPence = booking.price_paid_pence ?? 0;
  const nextStatus = outcome === "refund" ? "refunded" : "credited";

  // Atomic claim — only one concurrent request can win this update.
  const { data: claimed, error: claimError } = await service
    .from("mem_bookings")
    .update({ status: nextStatus, cancelled_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "confirmed")
    .select("id")
    .maybeSingle();
  if (claimError) {
    console.error("cancel: claim failed", id, claimError);
    return NextResponse.json(
      { error: "Could not cancel this booking — please try again." },
      { status: 500 }
    );
  }
  if (!claimed) {
    return NextResponse.json(
      { error: "This booking was already cancelled." },
      { status: 409 }
    );
  }

  let expiresOn: string | null = null;
  try {
    if (outcome === "refund") {
      if (!booking.stripe_payment_intent_id) {
        throw new Error("no payment intent on confirmed booking");
      }
      await getStripe().refunds.create({
        payment_intent: booking.stripe_payment_intent_id,
        amount: amountPence,
        reason: "requested_by_customer",
      });
    } else {
      const expiry = new Date();
      expiry.setMonth(expiry.getMonth() + CREDIT_EXPIRY_MONTHS);
      expiresOn = expiry.toISOString();
      const { error: creditError } = await service.from("mem_credits").insert({
        account_id: authed.account.id,
        amount_pence: amountPence,
        source_booking_id: booking.id,
        expires_at: expiresOn,
      });
      if (creditError) throw creditError;
    }
  } catch (err) {
    console.error(`cancel: ${outcome} failed, rolling back`, id, err);
    await service
      .from("mem_bookings")
      .update({ status: "confirmed", cancelled_at: null })
      .eq("id", id);
    return NextResponse.json(
      {
        error:
          outcome === "refund"
            ? "Could not process the refund — please try again."
            : "Could not issue the credit — please try again.",
      },
      { status: 500 }
    );
  }

  const when = booking.occurrence
    ? formatOccurrence(booking.occurrence.starts_at, booking.occurrence.ends_at)
    : (booking.course_run?.label ?? "");
  if (authed.user.email) {
    await sendBookingCancellationEmail(authed.user.email, {
      offeringTitle: offering.title,
      when,
      participantNames: booking.participant ? [booking.participant.name] : [],
      outcome:
        outcome === "refund"
          ? { kind: "refund", amountPence }
          : { kind: "credit", amountPence, expiresOn: expiresOn! },
    });
  }

  return NextResponse.json({ ok: true, status: nextStatus });
}
