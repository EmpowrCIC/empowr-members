"use client";

// Upcoming/past booking lists with inline self-serve cancellation. The
// cancellation policy per row is a render-time estimate computed on the
// server (lib/cancellation.ts); the API route re-checks it authoritatively
// and is the source of truth for what actually happens.
import { useState } from "react";
import { CalendarClock, CalendarX2 } from "lucide-react";
import { Button, FormNotice } from "@/components/ui/form";
import { formatPrice } from "@/lib/format";
import type { CancellationPolicy } from "@/lib/cancellation";
import type { BookingStatus } from "@/lib/types";

export type BookingView = {
  id: string;
  status: BookingStatus;
  offeringTitle: string;
  when: string;
  participantName: string;
  pricePaidPence: number | null;
  startsAtMs: number;
  /** Only set for confirmed bookings — null means "not applicable"
   *  (already settled, or still pending payment). */
  cancellation: CancellationPolicy | null;
};

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending_payment: "Payment pending",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  credited: "Cancelled — credited",
  refunded: "Cancelled — refunded",
  attended: "Attended",
  no_show: "No-show",
};

const STATUS_STYLES: Record<BookingStatus, string> = {
  pending_payment: "bg-blue-soft text-blue-dark",
  confirmed: "bg-blue-pale text-blue-dark",
  cancelled: "bg-line text-mid",
  credited: "bg-line text-mid",
  refunded: "bg-line text-mid",
  attended: "bg-blue-pale text-blue-dark",
  no_show: "bg-red-soft text-red-dark",
};

function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export function BookingsList({
  upcoming,
  past,
}: {
  upcoming: BookingView[];
  past: BookingView[];
}) {
  const [bookings, setBookings] = useState(upcoming);

  function onCancelled(id: string, status: BookingStatus) {
    setBookings((list) =>
      list.map((b) => (b.id === id ? { ...b, status, cancellation: null } : b))
    );
  }

  return (
    <div className="space-y-10">
      <section>
        <h2 className="flex items-center gap-2 text-xl font-extrabold text-black">
          <CalendarClock className="h-5 w-5 text-blue" aria-hidden /> Upcoming
        </h2>
        {bookings.length === 0 ? (
          <p className="mt-3 rounded-xl bg-blue-pale px-4 py-3 text-sm font-semibold text-blue-dark">
            No upcoming bookings yet.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {bookings.map((booking) => (
              <BookingRow
                key={booking.id}
                booking={booking}
                onCancelled={onCancelled}
              />
            ))}
          </ul>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 text-xl font-extrabold text-black">
            <CalendarX2 className="h-5 w-5 text-mid" aria-hidden /> Past
          </h2>
          <ul className="mt-4 space-y-3">
            {past.map((booking) => (
              <li
                key={booking.id}
                className="rounded-xl border border-line p-4 opacity-80"
              >
                <BookingSummary booking={booking} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function BookingSummary({ booking }: { booking: BookingView }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="font-extrabold text-black">{booking.offeringTitle}</p>
        <p className="text-sm font-semibold text-mid">
          {booking.when} · {booking.participantName}
        </p>
        {booking.pricePaidPence !== null && (
          <p className="text-sm font-semibold text-muted">
            {formatPrice(booking.pricePaidPence)} paid
          </p>
        )}
      </div>
      <StatusBadge status={booking.status} />
    </div>
  );
}

function BookingRow({
  booking,
  onCancelled,
}: {
  booking: BookingView;
  onCancelled: (id: string, status: BookingStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState<"refund" | "credit" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function cancel(outcome: "refund" | "credit") {
    setSubmitting(outcome);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Could not cancel this booking — please try again.");
        return;
      }
      onCancelled(booking.id, body.status as BookingStatus);
      setOpen(false);
    } catch {
      setError("Could not cancel this booking — please try again.");
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <li className="rounded-xl border border-line p-4">
      <BookingSummary booking={booking} />

      {booking.status === "confirmed" && booking.cancellation && (
        <div className="mt-3 border-t border-line pt-3">
          {!open ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="text-sm font-bold text-mid underline transition-colors hover:text-blue"
            >
              Cancel booking
            </button>
          ) : booking.cancellation.allowed ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-mid">
                Choose a refund to your card, or account credit to use on a
                future booking.
              </p>
              {error && <FormNotice tone="error">{error}</FormNotice>}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="danger"
                  onClick={() => cancel("refund")}
                  disabled={submitting !== null}
                >
                  {submitting === "refund" ? "Refunding…" : "Refund to card"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => cancel("credit")}
                  disabled={submitting !== null}
                >
                  {submitting === "credit" ? "Adding credit…" : "Credit my account"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setOpen(false)}
                  disabled={submitting !== null}
                  className="border-transparent shadow-none hover:border-line"
                >
                  Never mind
                </Button>
              </div>
            </div>
          ) : (
            <FormNotice tone="error">{booking.cancellation.reason}</FormNotice>
          )}
        </div>
      )}
    </li>
  );
}
