// Zod schemas shared by client forms (react-hook-form resolvers) and
// API routes — every API route input is parsed with one of these.
import { z } from "zod";
import { isPlausibleDob } from "@/lib/age";

// UK-tolerant phone check: digits, spaces, +, (), -; 7–15 digits total.
const phone = z
  .string()
  .trim()
  .regex(/^\+?[\d\s()-]{7,20}$/, "Enter a valid phone number")
  .refine((v) => (v.match(/\d/g)?.length ?? 0) >= 7, "Enter a valid phone number");

export const profileSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(200),
  phone: phone.nullable().or(z.literal("").transform(() => null)),
  whatsapp_opt_in: z.boolean(),
});

export const participantSchema = z.object({
  name: z.string().trim().min(1, "Enter the participant's name").max(200),
  dob: z
    .string()
    .refine(isPlausibleDob, "Enter a valid date of birth"),
  emergency_contact_name: z
    .string()
    .trim()
    .max(200)
    .nullable()
    .or(z.literal("").transform(() => null)),
  emergency_contact_phone: phone
    .nullable()
    .or(z.literal("").transform(() => null)),
  medical_notes: z
    .string()
    .trim()
    .max(2000)
    .nullable()
    .or(z.literal("").transform(() => null)),
});

// In-app waiver (Phase 1). Only captures what Members doesn't already
// hold — the signer, the participant names and whether any are minors are
// all derived server-side from the account and mem_participants, so this
// form is two steps rather than the standalone form's four.
const requiredConsent = (message: string) =>
  z.boolean().refine((v) => v === true, { message });

export const waiverSchema = z.object({
  participant_ids: z
    .array(z.string().uuid())
    .min(1, "Choose at least one person this waiver covers")
    .max(20, "Too many people in one waiver"),
  emergency_contact_name: z
    .string()
    .trim()
    .min(1, "Enter an emergency contact name")
    .max(200),
  emergency_contact_phone: phone,
  emergency_contact_relationship: z
    .string()
    .trim()
    .min(1, "Enter how they're related")
    .max(100),
  agreed_tc: requiredConsent("You need to accept the terms and conditions"),
  agreed_waiver: requiredConsent("You need to accept the risk waiver"),
  // Photo consent is genuinely optional — it must be recordable as false.
  agreed_photo: z.boolean(),
  // Only meaningful when the waiver covers a minor; null otherwise.
  consent_unaccompanied_departure: z.boolean().nullable(),
});

export const signupSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(200),
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const passwordLoginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

export const magicLinkSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
});

export const bookingSchema = z
  .object({
    occurrence_id: z.string().uuid().optional(),
    course_run_id: z.string().uuid().optional(),
    participant_ids: z
      .array(z.string().uuid())
      .min(1, "Choose at least one participant")
      .max(10, "Too many participants in one booking"),
  })
  .refine(
    (d) => (d.occurrence_id === undefined) !== (d.course_run_id === undefined),
    "Choose a session date or a course to book"
  );

// --- Admin (Step 8) ---
// Number inputs round-trip empty as NaN (register(..., {valueAsNumber:
// true})); select inputs round-trip empty as "". zodResolver needs the
// schema's INPUT type to stay concrete (number | null, or string | null)
// for react-hook-form's defaultValues to typecheck — z.preprocess widens
// the input to `unknown` and breaks that, so these use the same
// base-schema + .transform()/.or() shape as the existing `phone` field
// below rather than preprocess.

const optionalTrimmed = (max: number) =>
  z.string().trim().max(max).nullable().or(z.literal("").transform(() => null));

const nullableInt = (min: number, max?: number) => {
  const ranged = max !== undefined ? z.number().int().min(min).max(max) : z.number().int().min(min);
  return z
    .union([ranged, z.nan()])
    .nullable()
    .transform((v) => (v === null || Number.isNaN(v) ? null : v));
};

const nullableUuid = () =>
  z.string().uuid().nullable().or(z.literal("").transform(() => null));

export const venueSchema = z.object({
  name: z.string().trim().min(1, "Enter a venue name").max(200),
  address: optionalTrimmed(500),
  postcode: optionalTrimmed(20),
  default_capacity: nullableInt(1),
});

export const offeringSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, "Enter a URL slug")
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers, hyphens only"),
  title: z.string().trim().min(1, "Enter a title").max(200),
  type: z.enum(["drop_in", "lesson", "course", "camp", "event"]),
  description: optionalTrimmed(2000),
  age_min: nullableInt(0, 120),
  age_max: nullableInt(0, 120),
  price_pence: z.number().int().min(0),
  walk_in_price_pence: nullableInt(0),
  early_bird_price_pence: nullableInt(0),
  refund_policy: z.enum(["standard", "non_refundable"]),
  transferable: z.boolean(),
  enrolment_scope: z.enum(["per_occurrence", "per_run"]),
  venue_id: nullableUuid(),
  kit_list: optionalTrimmed(2000),
  active: z.boolean(),
});

export const occurrenceSchema = z.object({
  offering_id: z.string().uuid(),
  course_run_id: nullableUuid().optional(),
  starts_at: z.string().min(1, "Choose a start time"),
  ends_at: z.string().min(1, "Choose an end time"),
  venue_id: nullableUuid(),
  capacity: nullableInt(1),
});

export const courseRunSchema = z.object({
  offering_id: z.string().uuid(),
  label: z.string().trim().min(1, "Enter a label").max(200),
  starts_on: optionalTrimmed(20),
  ends_on: optionalTrimmed(20),
  price_pence: nullableInt(0),
  capacity: nullableInt(1),
});

export const cancelOccurrenceSchema = z.object({
  outcome: z.enum(["refund", "credit"]),
  reason: optionalTrimmed(500),
});

export type ProfileInput = z.infer<typeof profileSchema>;
export type ParticipantInput = z.infer<typeof participantSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type PasswordLoginInput = z.infer<typeof passwordLoginSchema>;
export type MagicLinkInput = z.infer<typeof magicLinkSchema>;
export type BookingInput = z.infer<typeof bookingSchema>;
export type WaiverInput = z.infer<typeof waiverSchema>;
export type VenueInput = z.infer<typeof venueSchema>;
export type OfferingInput = z.infer<typeof offeringSchema>;
export type OccurrenceInput = z.infer<typeof occurrenceSchema>;
export type CourseRunInput = z.infer<typeof courseRunSchema>;
export type CancelOccurrenceInput = z.infer<typeof cancelOccurrenceSchema>;
