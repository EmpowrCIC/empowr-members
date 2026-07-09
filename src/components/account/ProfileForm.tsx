"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileSchema, type ProfileInput } from "@/lib/validation";
import type { Account } from "@/lib/types";
import {
  Button,
  FieldError,
  FormNotice,
  Input,
  Label,
} from "@/components/ui/form";

export function ProfileForm({ account }: { account: Account }) {
  const [notice, setNotice] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: account.name,
      phone: account.phone,
      whatsapp_opt_in: account.whatsapp_opt_in,
    },
  });

  async function onSubmit(values: ProfileInput) {
    setNotice(null);
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const body = await res.json().catch(() => ({}));
    setNotice(
      res.ok
        ? { tone: "success", message: "Profile saved." }
        : {
            tone: "error",
            message: body.error ?? "Could not save your profile.",
          }
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {notice && <FormNotice tone={notice.tone}>{notice.message}</FormNotice>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="profile-name">Your name</Label>
          <Input
            id="profile-name"
            autoComplete="name"
            className="mt-1"
            {...register("name")}
          />
          <FieldError message={errors.name?.message} />
        </div>
        <div>
          <Label htmlFor="profile-phone">Phone</Label>
          <Input
            id="profile-phone"
            type="tel"
            autoComplete="tel"
            className="mt-1"
            {...register("phone")}
          />
          <FieldError message={errors.phone?.message} />
        </div>
      </div>
      <label className="flex items-center gap-2.5 text-sm font-semibold text-mid">
        <input
          type="checkbox"
          className="h-4 w-4 accent-blue"
          {...register("whatsapp_opt_in")}
        />
        Keep me updated on WhatsApp
      </label>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : "Save details"}
      </Button>
    </form>
  );
}
