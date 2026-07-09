import { Info } from "lucide-react";
import { CANCELLATION_CUTOFF_HOURS } from "@/lib/business-rules";

export function PolicyNotice({
  refundPolicy,
}: {
  refundPolicy: "standard" | "non_refundable";
}) {
  return (
    <p className="flex items-start gap-2 rounded-xl bg-blue-pale px-4 py-3 text-sm font-semibold text-blue-dark">
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      {refundPolicy === "non_refundable"
        ? "This booking is non-refundable."
        : `Cancel up to ${CANCELLATION_CUTOFF_HOURS} hours before the session for a refund or credit. Inside ${CANCELLATION_CUTOFF_HOURS} hours, bookings can't be cancelled.`}
    </p>
  );
}
