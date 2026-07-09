"use client";

// Participant selection + hold submission. Age eligibility is computed
// server-side (page) and re-enforced by the API; the waiver gate lives
// in the API — a stale "signed" state here just means a 409 with a
// waiver link. Step 5 replaces the held panel with a Stripe redirect.
import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { Button, FormNotice } from "@/components/ui/form";
import { formatPrice } from "@/lib/format";
import { PENDING_BOOKING_EXPIRY_MINUTES } from "@/lib/business-rules";
import { links } from "@/lib/links";

export type BookingFormParticipant = {
  id: string;
  name: string;
  age: number;
  eligible: boolean;
  waiverSigned: boolean;
};

type UnsignedParticipant = { id: string; name: string };

export function BookingForm({
  target,
  participants,
  pricePence,
  ageLabel,
}: {
  target: { occurrence_id?: string; course_run_id?: string };
  participants: BookingFormParticipant[];
  pricePence: number;
  ageLabel: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unsigned, setUnsigned] = useState<UnsignedParticipant[]>([]);
  const [held, setHeld] = useState(false);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    setUnsigned([]);
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...target, participant_ids: [...selected] }),
      });
      const body = await response.json().catch(() => ({}));

      if (response.status === 201) {
        setHeld(true);
        return;
      }
      if (body.error === "waiver_required") {
        setUnsigned(body.unsigned ?? []);
        return;
      }
      if (body.error === "capacity") {
        setError("Not enough spaces left on this session.");
        return;
      }
      if (body.error === "duplicate") {
        setError(
          "One of these participants is already booked on this session."
        );
        return;
      }
      setError(
        typeof body.error === "string" && body.error
          ? body.error
          : "Something went wrong — please try again."
      );
    } catch {
      setError("Something went wrong — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (held) {
    return (
      <div className="rounded-2xl bg-blue-pale p-6 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-blue" aria-hidden />
        <h2 className="mt-3 text-xl font-extrabold text-blue-dark">
          Space held
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm font-semibold text-blue-dark">
          Your booking is reserved for the next{" "}
          {PENDING_BOOKING_EXPIRY_MINUTES} minutes. Online payment is the
          final step and launches very soon — we&apos;ll email you as soon as
          it&apos;s ready to complete.
        </p>
        <Link
          href="/sessions"
          className="mt-4 inline-block rounded-full bg-blue px-6 py-2.5 font-extrabold text-white shadow-blue transition-colors hover:bg-blue-dark"
        >
          Back to sessions
        </Link>
      </div>
    );
  }

  if (participants.length === 0) {
    return (
      <div className="rounded-xl bg-blue-pale px-4 py-4 text-sm font-semibold text-blue-dark">
        Add the people in your household who take part before booking.{" "}
        <Link href="/account" className="underline">
          Go to your account
        </Link>
      </div>
    );
  }

  const total = pricePence * selected.size;

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-line">
        {participants.map((participant) => (
          <li key={participant.id} className="py-3">
            <label
              className={`flex items-center gap-3 ${
                participant.eligible ? "cursor-pointer" : "opacity-50"
              }`}
            >
              <input
                type="checkbox"
                className="h-5 w-5 accent-[var(--color-blue)]"
                checked={selected.has(participant.id)}
                disabled={!participant.eligible || submitting}
                onChange={() => toggle(participant.id)}
              />
              <span className="flex-1">
                <span className="block font-bold text-black">
                  {participant.name}
                </span>
                <span className="block text-sm font-semibold text-muted">
                  Age {participant.age}
                  {!participant.eligible && ` — this session is ${ageLabel}`}
                  {participant.eligible &&
                    !participant.waiverSigned &&
                    " — waiver needed"}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>

      {unsigned.length > 0 && (
        <FormNotice tone="error">
          <span className="block">
            {unsigned.map((p) => p.name).join(", ")}{" "}
            {unsigned.length === 1 ? "needs" : "need"} a signed waiver before
            booking.
          </span>
          <a
            href={links.waivers}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 underline"
          >
            Complete the waiver <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>{" "}
          <span>— then try again below.</span>
        </FormNotice>
      )}

      {error && <FormNotice tone="error">{error}</FormNotice>}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <p className="font-black text-black">
          Total{" "}
          <span className="text-blue">{formatPrice(total)}</span>
          {selected.size > 0 && (
            <span className="ml-1 text-sm font-semibold text-muted">
              ({selected.size} {selected.size === 1 ? "place" : "places"})
            </span>
          )}
        </p>
        <Button
          onClick={submit}
          disabled={selected.size === 0 || submitting}
        >
          {submitting ? "Holding your space…" : "Book now"}
        </Button>
      </div>
    </div>
  );
}
