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

export type ProfileInput = z.infer<typeof profileSchema>;
export type ParticipantInput = z.infer<typeof participantSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type PasswordLoginInput = z.infer<typeof passwordLoginSchema>;
export type MagicLinkInput = z.infer<typeof magicLinkSchema>;
