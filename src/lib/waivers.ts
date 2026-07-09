// Waiver gate — read-only checks against the Empowr Waivers tables
// (people / waiver_responses / form_versions — service-role only, no
// RLS policies). Strategy per business rule WAIVER_LINK_STRATEGY:
// the account email matches the signer's `people` row; a participant
// is covered when a response on the ACTIVE form version lists their
// normalised name in skater_names (or it's the signer booking
// themselves). An already-linked person_id (from a previous match or
// an admin manual link) is trusted directly.
import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import type { Participant } from "@/lib/types";

export type WaiverStatus = {
  participantId: string;
  signed: boolean;
  /** people.id to persist onto mem_participants when newly matched. */
  matchedPersonId: string | null;
};

function normaliseName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

type SignerRow = { id: string; first_name: string; last_name: string };
type ResponseRow = { person_id: string; skater_names: string[] | null };

/** Check every participant against the active waiver form version. */
export async function checkWaivers(
  accountEmail: string,
  participants: Pick<Participant, "id" | "name" | "person_id">[]
): Promise<WaiverStatus[]> {
  const service = createServiceClient();

  const { data: activeVersion, error: versionError } = await service
    .from("form_versions")
    .select("id")
    .eq("active", true)
    .limit(1)
    .maybeSingle();
  if (versionError) {
    console.error("waiver form_versions read failed", versionError);
    return participants.map((p) => ({
      participantId: p.id,
      signed: false,
      matchedPersonId: null,
    }));
  }
  if (!activeVersion) {
    // No active form version — nothing can be signed against; fail closed.
    return participants.map((p) => ({
      participantId: p.id,
      signed: false,
      matchedPersonId: null,
    }));
  }

  // Signers matched by the account holder's email (case-insensitive).
  const { data: signers } = await service
    .from("people")
    .select("id, first_name, last_name")
    .ilike("email", accountEmail);
  const signerRows = (signers ?? []) as SignerRow[];

  const personIds = new Set<string>(signerRows.map((s) => s.id));
  for (const p of participants) {
    if (p.person_id) personIds.add(p.person_id);
  }
  if (personIds.size === 0) {
    return participants.map((p) => ({
      participantId: p.id,
      signed: false,
      matchedPersonId: null,
    }));
  }

  const { data: responses } = await service
    .from("waiver_responses")
    .select("person_id, skater_names")
    .in("person_id", [...personIds])
    .eq("form_version_id", activeVersion.id);
  const responseRows = (responses ?? []) as ResponseRow[];

  const respondedPersonIds = new Set(responseRows.map((r) => r.person_id));

  return participants.map((p) => {
    // Already linked (previous match or admin manual link) — trust it.
    if (p.person_id && respondedPersonIds.has(p.person_id)) {
      return { participantId: p.id, signed: true, matchedPersonId: null };
    }

    const name = normaliseName(p.name);

    // Signer booking themselves.
    const selfSigner = signerRows.find(
      (s) =>
        respondedPersonIds.has(s.id) &&
        normaliseName(`${s.first_name} ${s.last_name}`) === name
    );
    if (selfSigner) {
      return { participantId: p.id, signed: true, matchedPersonId: selfSigner.id };
    }

    // Named skater on one of the signer's active-version responses.
    const covering = responseRows.find(
      (r) =>
        signerRows.some((s) => s.id === r.person_id) &&
        (r.skater_names ?? []).some((n) => normaliseName(n) === name)
    );
    if (covering) {
      return { participantId: p.id, signed: true, matchedPersonId: covering.person_id };
    }

    return { participantId: p.id, signed: false, matchedPersonId: null };
  });
}
