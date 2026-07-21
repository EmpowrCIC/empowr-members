// POST /api/admin/venues — create a venue. Admin-allowlisted only; all
// admin writes go through the service client (no write RLS anywhere).
import { NextResponse } from "next/server";
import { getAuthedAdmin } from "@/lib/admin";
import { createPassKitVenue } from "@/lib/passkit";
import { createServiceClient } from "@/lib/supabase/service";
import { venueSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const admin = await getAuthedAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  }

  const parsed = venueSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("mem_venues")
    .insert(parsed.data)
    .select()
    .single();
  if (error) {
    console.error("admin venue create failed", error);
    return NextResponse.json(
      { error: "Could not create the venue — please try again." },
      { status: 500 }
    );
  }

  // Give every venue a PassKit Venue so its sessions can issue wallet
  // passes (Step A4/A5). Never blocks venue creation — a PassKit outage
  // shouldn't stop admins from managing venues.
  const passkitVenueId = await createPassKitVenue({
    id: data.id,
    name: data.name,
    address: data.address,
    postcode: data.postcode,
  });
  if (passkitVenueId) {
    const { data: updated, error: updateError } = await service
      .from("mem_venues")
      .update({ passkit_venue_id: passkitVenueId })
      .eq("id", data.id)
      .select()
      .single();
    if (!updateError) {
      return NextResponse.json({ venue: updated }, { status: 201 });
    }
    console.error("mem_venues passkit_venue_id persist failed", data.id, updateError);
  }

  return NextResponse.json({ venue: data }, { status: 201 });
}
