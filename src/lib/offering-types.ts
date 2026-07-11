// Offering type constants — no "server-only" guard, so both server
// components (catalogue.ts re-exports these) and client components
// (admin forms) can import directly.
export const OFFERING_TYPES = [
  "drop_in",
  "lesson",
  "course",
  "camp",
  "event",
] as const;

export type OfferingType = (typeof OFFERING_TYPES)[number];

export const TYPE_LABELS: Record<OfferingType, string> = {
  drop_in: "Drop-ins",
  lesson: "Lessons",
  course: "Courses",
  camp: "Camps",
  event: "Events",
};

export const TYPE_LABELS_SINGULAR: Record<OfferingType, string> = {
  drop_in: "Drop-in",
  lesson: "Lesson",
  course: "Course",
  camp: "Camp",
  event: "Event",
};
