"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { venueSchema, type VenueInput } from "@/lib/validation";
import type { AdminVenue } from "@/lib/admin-data";
import { Button, FieldError, FormNotice, Input, Label } from "@/components/ui/form";

export function VenueForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: AdminVenue;
  submitLabel: string;
  onSubmit: (values: VenueInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<VenueInput>({
    resolver: zodResolver(venueSchema),
    defaultValues: initial
      ? {
          name: initial.name,
          address: initial.address,
          postcode: initial.postcode,
          default_capacity: initial.default_capacity,
        }
      : { name: "", address: null, postcode: null, default_capacity: null },
  });

  async function submit(values: VenueInput) {
    setServerError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      {serverError && <FormNotice tone="error">{serverError}</FormNotice>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="venue-name">Name</Label>
          <Input id="venue-name" className="mt-1" {...register("name")} />
          <FieldError message={errors.name?.message} />
        </div>
        <div>
          <Label htmlFor="venue-postcode">Postcode</Label>
          <Input id="venue-postcode" className="mt-1" {...register("postcode")} />
          <FieldError message={errors.postcode?.message} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="venue-address">Address</Label>
          <Input id="venue-address" className="mt-1" {...register("address")} />
          <FieldError message={errors.address?.message} />
        </div>
        <div>
          <Label htmlFor="venue-capacity">
            Default capacity{" "}
            <span className="font-semibold text-muted">
              (used when an occurrence doesn&apos;t set its own)
            </span>
          </Label>
          <Input
            id="venue-capacity"
            type="number"
            min={1}
            className="mt-1"
            {...register("default_capacity", { valueAsNumber: true })}
          />
          <FieldError message={errors.default_capacity?.message} />
        </div>
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
