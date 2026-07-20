import { Info } from "lucide-react";

export function PolicyNotice({
  refundPolicy,
}: {
  refundPolicy: "standard" | "non_refundable";
}) {
  return (
    <p className="flex items-start gap-2 rounded-xl bg-blue-pale px-4 py-3 text-sm font-semibold text-blue-dark">
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      {refundPolicy === "non_refundable"
        ? "This booking is non-refundable and cannot be cancelled or transferred, regardless of notice given."
        : "This booking is non-refundable once confirmed — cancellations, transfers, and refunds aren't offered by default. Exceptions may be granted at our discretion; email enquiries@empowrcic.org to discuss your circumstances."}
    </p>
  );
}
