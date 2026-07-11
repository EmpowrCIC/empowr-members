// Catalogue reads — anon-safe queries through the RLS server client
// (active offerings, scheduled occurrences, venues). Server components
// only.
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { OFFERING_TYPES, type OfferingType } from "@/lib/offering-types";

export { OFFERING_TYPES, TYPE_LABELS, TYPE_LABELS_SINGULAR } from "@/lib/offering-types";
export type { OfferingType } from "@/lib/offering-types";

export type Venue = {
  id: string;
  name: string;
  address: string | null;
  postcode: string | null;
};

export type CatalogueOffering = {
  id: string;
  slug: string;
  title: string;
  type: OfferingType;
  description: string | null;
  age_min: number | null;
  age_max: number | null;
  price_pence: number;
  walk_in_price_pence: number | null;
  early_bird_price_pence: number | null;
  refund_policy: "standard" | "non_refundable";
  enrolment_scope: "per_occurrence" | "per_run";
  kit_list: string | null;
  venue: Venue | null;
};

export type CatalogueOccurrence = {
  id: string;
  course_run_id: string | null;
  starts_at: string;
  ends_at: string;
  venue: Venue | null; // override; fall back to offering venue
};

export type CatalogueCourseRun = {
  id: string;
  label: string;
  starts_on: string | null;
  ends_on: string | null;
  price_pence: number | null; // null = offering price
};

const OFFERING_SELECT =
  "id, slug, title, type, description, age_min, age_max, price_pence, walk_in_price_pence, early_bird_price_pence, refund_policy, enrolment_scope, kit_list, venue:mem_venues(id, name, address, postcode)";

export function isOfferingType(value: string): value is OfferingType {
  return (OFFERING_TYPES as readonly string[]).includes(value);
}

export async function listOfferings(filters: {
  type?: OfferingType;
  age?: number;
}): Promise<CatalogueOffering[]> {
  const supabase = await createClient();
  let query = supabase
    .from("mem_offerings")
    .select(OFFERING_SELECT)
    .eq("active", true)
    .order("title");

  if (filters.type) query = query.eq("type", filters.type);
  if (filters.age !== undefined) {
    query = query
      .or(`age_min.is.null,age_min.lte.${filters.age}`)
      .or(`age_max.is.null,age_max.gte.${filters.age}`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("listOfferings failed", error);
    return [];
  }
  return (data ?? []) as unknown as CatalogueOffering[];
}

export async function getOffering(
  slug: string
): Promise<CatalogueOffering | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("mem_offerings")
    .select(OFFERING_SELECT)
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    console.error("getOffering failed", error);
    return null;
  }
  return (data as unknown as CatalogueOffering) ?? null;
}

/** Upcoming scheduled occurrences for an offering, soonest first. */
export async function listUpcomingOccurrences(
  offeringId: string,
  limit = 30
): Promise<CatalogueOccurrence[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("mem_occurrences")
    .select(
      "id, course_run_id, starts_at, ends_at, venue:mem_venues(id, name, address, postcode)"
    )
    .eq("offering_id", offeringId)
    .eq("status", "scheduled")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at")
    .limit(limit);

  if (error) {
    console.error("listUpcomingOccurrences failed", error);
    return [];
  }
  return (data ?? []) as unknown as CatalogueOccurrence[];
}

export async function listCourseRuns(
  offeringId: string
): Promise<CatalogueCourseRun[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("mem_course_runs")
    .select("id, label, starts_on, ends_on, price_pence")
    .eq("offering_id", offeringId)
    .order("starts_on", { ascending: true, nullsFirst: false });

  if (error) {
    console.error("listCourseRuns failed", error);
    return [];
  }
  return (data ?? []) as CatalogueCourseRun[];
}
