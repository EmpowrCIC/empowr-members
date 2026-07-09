"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { participantSchema, type ParticipantInput } from "@/lib/validation";
import type { Participant } from "@/lib/types";
import {
  Button,
  FieldError,
  FormNotice,
  Input,
  Label,
  Textarea,
} from "@/components/ui/form";

export function ParticipantForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: Participant;
  submitLabel: string;
  onSubmit: (values: ParticipantInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ParticipantInput>({
    resolver: zodResolver(participantSchema),
    defaultValues: initial
      ? {
          name: initial.name,
          dob: initial.dob,
          emergency_contact_name: initial.emergency_contact_name,
          emergency_contact_phone: initial.emergency_contact_phone,
          medical_notes: initial.medical_notes,
        }
      : undefined,
  });

  async function submit(values: ParticipantInput) {
    setServerError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      {serverError && <FormNotice tone="error">{serverError}</FormNotice>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="participant-name">Name</Label>
          <Input id="participant-name" className="mt-1" {...register("name")} />
          <FieldError message={errors.name?.message} />
        </div>
        <div>
          <Label htmlFor="participant-dob">Date of birth</Label>
          <Input
            id="participant-dob"
            type="date"
            className="mt-1"
            {...register("dob")}
          />
          <FieldError message={errors.dob?.message} />
        </div>
        <div>
          <Label htmlFor="participant-ec-name">Emergency contact name</Label>
          <Input
            id="participant-ec-name"
            className="mt-1"
            {...register("emergency_contact_name")}
          />
          <FieldError message={errors.emergency_contact_name?.message} />
        </div>
        <div>
          <Label htmlFor="participant-ec-phone">Emergency contact phone</Label>
          <Input
            id="participant-ec-phone"
            type="tel"
            className="mt-1"
            {...register("emergency_contact_phone")}
          />
          <FieldError message={errors.emergency_contact_phone?.message} />
        </div>
      </div>
      <div>
        <Label htmlFor="participant-medical">
          Medical notes{" "}
          <span className="font-semibold text-muted">
            (allergies, conditions coaches should know about)
          </span>
        </Label>
        <Textarea
          id="participant-medical"
          rows={3}
          className="mt-1"
          {...register("medical_notes")}
        />
        <FieldError message={errors.medical_notes?.message} />
      </div>
      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : submitLabel}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
