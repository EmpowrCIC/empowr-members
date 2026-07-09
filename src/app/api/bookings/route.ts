// POST /api/bookings — hold pending_payment bookings for the signed-in
// member. Gates in order: participant ownership → age eligibility →
// waiver (fail closed, no insert) → atomic capacity/duplicate check via
// mem_hold_bookings() (row-locked, so concurrent bookings can't
// oversell). Payment (Step 5) confirms the hold before it expires.
import { NextResponse } from "next/server";
import { getAuthedAccount } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { bookingSchema } from "@/lib/validation";
import { checkWaivers } from "@/lib/waivers";
import { isAgeEligible } from "@/lib/age";
import { PENDING_BOOKING_EXPIRY_MINUTES } from "@/lib/business-rules";
import type { Booking, Participant } from "@/lib/types";

type TargetRow = {
  starts: string | null;
  offering: { age_min: number | null; age_max: number | null };
};

export async function POST(request: Request) {
  const authed = await getAuthedAccount();
  if (!authed) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const parsed = bookingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const { occurrence_id, course_run_id, participant_ids } = parsed.data;

  const service = createServiceClient();

  // Participants must all belong to the caller's account.
  const { data: participantRows, error: participantsError } = await service
    .from("mem_participants")
    .select("id, name, dob, person_id")
    .in("id", participant_ids)
    .eq("account_id", authed.account.id);
  if (participantsError) {
    console.error("booking participants read failed", participantsError);
    return NextResponse.json(
      { error: "Could not start the booking — please try again." },
      { status: 500 }
    );
  }
  const participants = (participantRows ?? []) as Pick<
    Participant,
    "id" | "name" | "dob" | "person_id"
  >[];
  if (participants.length !== participant_ids.length) {
    return NextResponse.json(
      { error: "One or more participants weren't recognised." },
      { status: 400 }
    );
  }

  // Authoritative target read (service client — RLS-independent) for the
  // age check; bookability itself is re-checked inside the RPC.
  let target: TargetRow | null = null;
  if (occurrence_id) {
    const { data } = await service
      .from("mem_occurrences")
      .select("starts:starts_at, offering:mem_offerings(age_min, age_max)")
      .eq("id", occurrence_id)
      .maybeSingle();
    target = data as unknown as TargetRow | null;
  } else if (course_run_id) {
    const { data } = await service
      .from("mem_course_runs")
      .select("starts:starts_on, offering:mem_offerings(age_min, age_max)")
      .eq("id", course_run_id)
      .maybeSingle();
    target = data as unknown as TargetRow | null;
  }
  if (!target) {
    return NextResponse.json(
      { error: "This session can no longer be booked." },
      { status: 404 }
    );
  }

  // Age eligibility on the session/course start date.
  const startDate = target.starts ? new Date(target.starts) : new Date();
  const ineligible = participants.filter(
    (p) =>
      !isAgeEligible(p.dob, target.offering.age_min, target.offering.age_max, startDate)
  );
  if (ineligible.length > 0) {
    return NextResponse.json(
      {
        error: "age_ineligible",
        ineligible: ineligible.map((p) => ({ id: p.id, name: p.name })),
      },
      { status: 422 }
    );
  }

  // Waiver gate — no hold without a signed waiver for every participant.
  const waiverStatuses = await checkWaivers(authed.user.email ?? "", participants);

  // Persist fresh matches so future bookings skip the name match.
  await Promise.all(
    waiverStatuses
      .filter((s) => s.matchedPersonId)
      .map((s) =>
        service
          .from("mem_participants")
          .update({ person_id: s.matchedPersonId })
          .eq("id", s.participantId)
      )
  );

  const unsigned = waiverStatuses.filter((s) => !s.signed);
  if (unsigned.length > 0) {
    const names = new Map(participants.map((p) => [p.id, p.name]));
    return NextResponse.json(
      {
        error: "waiver_required",
        unsigned: unsigned.map((s) => ({
          id: s.participantId,
          name: names.get(s.participantId) ?? "",
        })),
      },
      { status: 409 }
    );
  }

  // Atomic hold — capacity + duplicates enforced under a row lock.
  const { data: bookings, error: rpcError } = await service.rpc(
    "mem_hold_bookings",
    {
      p_account_id: authed.account.id,
      p_participant_ids: participant_ids,
      p_occurrence_id: occurrence_id ?? null,
      p_course_run_id: course_run_id ?? null,
      p_expiry_minutes: PENDING_BOOKING_EXPIRY_MINUTES,
    }
  );

  if (rpcError) {
    const message = rpcError.message ?? "";
    if (message.includes("mem_capacity_exceeded")) {
      return NextResponse.json(
        { error: "capacity", message: "Not enough spaces left on this session." },
        { status: 409 }
      );
    }
    if (message.includes("mem_duplicate_booking")) {
      return NextResponse.json(
        {
          error: "duplicate",
          message: "One of these participants is already booked on this session.",
        },
        { status: 409 }
      );
    }
    if (message.includes("mem_not_bookable")) {
      return NextResponse.json(
        { error: "This session can no longer be booked." },
        { status: 409 }
      );
    }
    console.error("mem_hold_bookings failed", rpcError);
    return NextResponse.json(
      { error: "Could not complete the booking — please try again." },
      { status: 500 }
    );
  }

  const held = (bookings ?? []) as Booking[];
  return NextResponse.json(
    { bookings: held, expires_at: held[0]?.expires_at ?? null },
    { status: 201 }
  );
}
