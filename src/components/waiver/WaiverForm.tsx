"use client";

// In-app waiver (Phase 1). Deliberately short: Members already knows who
// the signer is and who their participants are, so this only asks for the
// emergency contact and the consents. Everything else — signer identity,
// participant names, whether any are minors — is derived server-side.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { waiverSchema, type WaiverInput } from "@/lib/validation";
import { links } from "@/lib/links";
import {
  Button,
  FieldError,
  FormNotice,
  Input,
  Label,
} from "@/components/ui/form";

export type WaiverFormParticipant = {
  id: string;
  name: string;
  age: number;
  alreadySigned: boolean;
};

export function WaiverForm({
  participants,
  defaultEmergencyContact,
}: {
  participants: WaiverFormParticipant[];
  defaultEmergencyContact: { name: string; phone: string };
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<WaiverInput>({
    resolver: zodResolver(waiverSchema),
    defaultValues: {
      // Default to whoever still needs cover; if everyone is covered,
      // preselect nobody so re-signing is a deliberate act.
      participant_ids: participants.filter((p) => !p.alreadySigned).map((p) => p.id),
      emergency_contact_name: defaultEmergencyContact.name,
      emergency_contact_phone: defaultEmergencyContact.phone,
      emergency_contact_relationship: "",
      agreed_tc: false,
      agreed_waiver: false,
      agreed_photo: false,
      consent_unaccompanied_departure: null,
    },
  });

  const selectedIds = watch("participant_ids") ?? [];
  const coversMinor = participants.some(
    (p) => selectedIds.includes(p.id) && p.age < 18
  );

  function toggle(id: string) {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];
    setValue("participant_ids", next, { shouldValidate: true });
  }

  async function onSubmit(values: WaiverInput) {
    setError(null);
    const res = await fetch("/api/waivers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        // Only meaningful for a minor — don't record a stray false.
        consent_unaccompanied_departure: coversMinor
          ? (values.consent_unaccompanied_departure ?? false)
          : null,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error ?? "Could not save the waiver — please try again.");
      return;
    }
    setDone(body.covered ?? selectedIds.length);
    // Refresh so the booking page and this page both see the new cover.
    router.refresh();
  }

  if (done !== null) {
    return (
      <div className="space-y-4">
        <FormNotice tone="success">
          Waiver saved for {done} {done === 1 ? "person" : "people"}. You can
          book them onto sessions now.
        </FormNotice>
        <Button onClick={() => router.push("/sessions")}>
          Browse sessions
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {error && <FormNotice tone="error">{error}</FormNotice>}

      <fieldset>
        <legend className="font-extrabold text-black">Who does this cover?</legend>
        <ul className="mt-3 divide-y divide-line">
          {participants.map((p) => (
            <li key={p.id} className="py-3">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-[var(--color-blue)]"
                  checked={selectedIds.includes(p.id)}
                  onChange={() => toggle(p.id)}
                  disabled={isSubmitting}
                />
                <span className="flex-1">
                  <span className="block font-bold text-black">{p.name}</span>
                  <span className="block text-sm font-semibold text-muted">
                    Age {p.age}
                    {p.alreadySigned && " — already covered"}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        <FieldError message={errors.participant_ids?.message} />
      </fieldset>

      <fieldset>
        <legend className="font-extrabold text-black">Emergency contact</legend>
        <p className="mt-1 text-sm text-mid">
          Someone we can reach who isn&apos;t taking part in the session.
        </p>
        <div className="mt-3 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="waiver-ec-name">Name</Label>
              <Input
                id="waiver-ec-name"
                autoComplete="name"
                className="mt-1"
                {...register("emergency_contact_name")}
              />
              <FieldError message={errors.emergency_contact_name?.message} />
            </div>
            <div>
              <Label htmlFor="waiver-ec-phone">Phone</Label>
              <Input
                id="waiver-ec-phone"
                type="tel"
                autoComplete="tel"
                className="mt-1"
                {...register("emergency_contact_phone")}
              />
              <FieldError message={errors.emergency_contact_phone?.message} />
            </div>
          </div>
          <div>
            <Label htmlFor="waiver-ec-rel">Relationship</Label>
            <Input
              id="waiver-ec-rel"
              className="mt-1"
              placeholder="e.g. Parent, partner, friend"
              {...register("emergency_contact_relationship")}
            />
            <FieldError
              message={errors.emergency_contact_relationship?.message}
            />
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend className="font-extrabold text-black">Agreements</legend>
        <div className="mt-3 space-y-3">
          <label className="flex items-start gap-2.5 text-sm font-semibold text-mid">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-blue"
              {...register("agreed_tc")}
            />
            <span>
              I accept the{" "}
              <a
                href={links.termsAndConditions}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                terms and conditions
              </a>
              , including that bookings are non-refundable.
            </span>
          </label>
          <FieldError message={errors.agreed_tc?.message} />

          <label className="flex items-start gap-2.5 text-sm font-semibold text-mid">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-blue"
              {...register("agreed_waiver")}
            />
            <span>
              I have read and accept the{" "}
              <a
                href={links.riskWaiver}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                risk waiver
              </a>
              , and confirm everyone listed above is fit to take part.
            </span>
          </label>
          <FieldError message={errors.agreed_waiver?.message} />

          <label className="flex items-start gap-2.5 text-sm font-semibold text-mid">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-blue"
              {...register("agreed_photo")}
            />
            <span>
              I consent to photos and video being used to promote Empowr CIC.{" "}
              <span className="text-muted">(Optional — you can leave this unticked.)</span>
            </span>
          </label>

          {coversMinor && (
            <label className="flex items-start gap-2.5 text-sm font-semibold text-mid">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-blue"
                {...register("consent_unaccompanied_departure")}
              />
              <span>
                I consent to my child leaving the venue unaccompanied at the end
                of a session.{" "}
                <span className="text-muted">
                  (Optional — leave unticked if they must be collected.)
                </span>
              </span>
            </label>
          )}
        </div>
      </fieldset>

      <Button type="submit" disabled={isSubmitting || selectedIds.length === 0}>
        {isSubmitting ? "Saving…" : "Save waiver"}
      </Button>
    </form>
  );
}
