// Member-initiated cancellation notice — sent from the Step 7 self-serve
// cancellation flow once the booking is cancelled and the refund or
// credit is issued. Built now so Step 7 only calls the orchestrator.
import {
  emailLayout,
  detailRow,
  panel,
  ctaButton,
  esc,
  EMAIL_BRAND,
} from "@/lib/email";
import { formatPrice, formatDate } from "@/lib/format";
import { membersUrl } from "@/lib/links";
import type { BookingEmailSummary, BuiltEmail } from "./types";

export type CancellationOutcome =
  | { kind: "refund"; amountPence: number }
  | { kind: "credit"; amountPence: number; expiresOn: string }; // ISO date

export type CancellationEmailData = Pick<
  BookingEmailSummary,
  "offeringTitle" | "when" | "participantNames"
> & { outcome: CancellationOutcome };

export function buildBookingCancellationEmail(
  data: CancellationEmailData
): BuiltEmail {
  const names = data.participantNames.map(esc).join(", ");
  const { outcome } = data;

  const outcomeLine =
    outcome.kind === "refund"
      ? `We've refunded <strong>${esc(
          formatPrice(outcome.amountPence)
        )}</strong> to your original payment method. Card refunds usually land within 5–10 working days.`
      : `We've added <strong>${esc(
          formatPrice(outcome.amountPence)
        )}</strong> of account credit — use it towards any future booking. It expires on <strong>${esc(
          formatDate(outcome.expiresOn)
        )}</strong>.`;

  const summaryRows = [
    detailRow("Session", esc(data.offeringTitle)),
    detailRow("Was booked", esc(data.when)),
    detailRow("Who", names),
    detailRow(
      outcome.kind === "refund" ? "Refunded" : "Credited",
      esc(formatPrice(outcome.amountPence))
    ),
  ].join("");

  const body = `
<p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:${EMAIL_BRAND.mid};">
Your booking has been cancelled. ${outcomeLine}
</p>
${panel(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${summaryRows}</table>`)}
<p style="margin:16px 0;font-size:14px;line-height:1.6;color:${EMAIL_BRAND.mid};">
Changed your mind? You're welcome back any time.
</p>
${ctaButton("Find another session", membersUrl("/sessions"))}
`;

  return {
    subject: `Booking cancelled — ${data.offeringTitle}`,
    html: emailLayout(body, {
      preheader:
        outcome.kind === "refund"
          ? `${data.offeringTitle} cancelled — ${formatPrice(
              outcome.amountPence
            )} refunded.`
          : `${data.offeringTitle} cancelled — ${formatPrice(
              outcome.amountPence
            )} credit added.`,
      heading: "Your booking is cancelled",
    }),
  };
}
