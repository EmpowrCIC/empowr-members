"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import {
  magicLinkSchema,
  passwordLoginSchema,
  type MagicLinkInput,
  type PasswordLoginInput,
} from "@/lib/validation";
import {
  Button,
  FieldError,
  FormNotice,
  Input,
  Label,
} from "@/components/ui/form";

type Mode = "password" | "magic";

export function LoginForm({
  next,
  initialError,
}: {
  next: string;
  initialError?: string;
}) {
  const [mode, setMode] = useState<Mode>("password");

  return (
    <div className="space-y-5">
      {initialError && <FormNotice tone="error">{initialError}</FormNotice>}
      <div className="flex rounded-full border border-line bg-card p-1 text-sm font-bold">
        {(
          [
            ["password", "Password"],
            ["magic", "Email me a link"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            className={`flex-1 rounded-full px-4 py-1.5 transition-colors duration-200 ${
              mode === value ? "bg-blue text-white" : "text-mid hover:text-blue"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {mode === "password" ? <PasswordLogin next={next} /> : <MagicLinkLogin next={next} />}
    </div>
  );
}

function PasswordLogin({ next }: { next: string }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PasswordLoginInput>({ resolver: zodResolver(passwordLoginSchema) });

  async function onSubmit(values: PasswordLoginInput) {
    setServerError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword(values);
    if (error) {
      setServerError(
        error.message === "Invalid login credentials"
          ? "Email or password is incorrect."
          : error.message
      );
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {serverError && <FormNotice tone="error">{serverError}</FormNotice>}
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          className="mt-1"
          {...register("email")}
        />
        <FieldError message={errors.email?.message} />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          className="mt-1"
          {...register("password")}
        />
        <FieldError message={errors.password?.message} />
      </div>
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

function MagicLinkLogin({ next }: { next: string }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<MagicLinkInput>({ resolver: zodResolver(magicLinkSchema) });

  async function onSubmit(values: MagicLinkInput) {
    setServerError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: values.email,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        shouldCreateUser: false,
      },
    });
    if (error) {
      setServerError(
        /signups not allowed|user not found/i.test(error.message)
          ? "No account found with that email — please sign up first."
          : error.message
      );
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <FormNotice tone="success">
        Check your inbox — we&apos;ve sent a sign-in link to{" "}
        <strong>{getValues("email")}</strong>.
      </FormNotice>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {serverError && <FormNotice tone="error">{serverError}</FormNotice>}
      <div>
        <Label htmlFor="magic-email">Email</Label>
        <Input
          id="magic-email"
          type="email"
          autoComplete="email"
          className="mt-1"
          {...register("email")}
        />
        <FieldError message={errors.email?.message} />
      </div>
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Sending…" : "Send sign-in link"}
      </Button>
    </form>
  );
}
