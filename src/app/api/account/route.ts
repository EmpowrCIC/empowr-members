// PATCH /api/account — update the signed-in member's profile.
// Writes go through the service client (table grants give
// authenticated no DML); ownership is enforced by scoping the update
// to the resolved account id.
import { NextResponse } from "next/server";
import { getAuthedAccount } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { profileSchema } from "@/lib/validation";

export async function PATCH(request: Request) {
  const authed = await getAuthedAccount();
  if (!authed) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const parsed = profileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("mem_accounts")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", authed.account.id)
    .select()
    .single();

  if (error) {
    console.error("account update failed", error);
    return NextResponse.json(
      { error: "Could not save your profile — please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ account: data });
}
