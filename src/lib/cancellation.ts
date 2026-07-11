// Self-serve cancellation policy — the four paths from the Phase 1 spec
// table. Non-refundable offerings are always blocked; everything else is
// blocked inside the cutoff and a member's choice (refund or credit)
// beyond it. Pure function so the page (render-time estimate) and the
// API route (authoritative check) share one source of truth.
import { CANCELLATION_CUTOFF_HOURS } from "@/lib/business-rules";

export type CancellationPolicy =
  | { allowed: true; hoursUntilStart: number }
  | { allowed: false; reason: string; hoursUntilStart: number };

export function evaluateCancellationPolicy(
  refundPolicy: "standard" | "non_refundable",
  startsAt: string | Date
): CancellationPolicy {
  const hoursUntilStart =
    (new Date(startsAt).getTime() - Date.now()) / (1000 * 60 * 60);

  if (refundPolicy === "non_refundable") {
    return {
      allowed: false,
      reason: "This session is non-refundable.",
      hoursUntilStart,
    };
  }
  if (hoursUntilStart < CANCELLATION_CUTOFF_HOURS) {
    return {
      allowed: false,
      reason: `Cancellations must be made at least ${CANCELLATION_CUTOFF_HOURS} hours before the session.`,
      hoursUntilStart,
    };
  }
  return { allowed: true, hoursUntilStart };
}
