// Display formatting — prices in pence, occurrence times always shown
// in Europe/London wall-clock regardless of server timezone.
import { formatInTimeZone } from "date-fns-tz";
import { TIMEZONE } from "@/lib/business-rules";

/** 700 -> "£7", 1250 -> "£12.50" */
export function formatPrice(pence: number): string {
  const pounds = pence / 100;
  return Number.isInteger(pounds)
    ? `£${pounds}`
    : `£${pounds.toFixed(2)}`;
}

/** "Mon 13 Jul, 4:00–5:00pm" */
export function formatOccurrence(startsAt: string, endsAt: string): string {
  const day = formatInTimeZone(startsAt, TIMEZONE, "EEE d MMM");
  const start = formatInTimeZone(startsAt, TIMEZONE, "h:mmaaa").replace(":00", "");
  const end = formatInTimeZone(endsAt, TIMEZONE, "h:mmaaa").replace(":00", "");
  return `${day}, ${start}–${end}`;
}

/** "13 Jul 2026" */
export function formatDate(date: string): string {
  return formatInTimeZone(date, TIMEZONE, "d MMM yyyy");
}

/** (5, 12) -> "Ages 5–12"; (15, null) -> "Ages 15+"; (null, null) -> "All ages" */
export function formatAgeRange(
  ageMin: number | null,
  ageMax: number | null
): string {
  if (ageMin === null && ageMax === null) return "All ages";
  if (ageMax === null) return `Ages ${ageMin}+`;
  if (ageMin === null) return `Up to age ${ageMax}`;
  return `Ages ${ageMin}–${ageMax}`;
}
