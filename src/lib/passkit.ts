// PassKit REST client — plain Key+Secret + a hand-rolled JWT, not the
// gRPC SDK (that needs mutual-TLS "SDK Credentials", a different auth
// type; see planning/passkit/CONTEXT.md Step A0 for the full reasoning).
// Every export is never-throw (log + return null/false) — issuing or
// voiding a pass must not fail a Stripe webhook or a cancellation, same
// contract as lib/email.ts's sendEmail().
import "server-only";
import { createHmac } from "crypto";

const PASSKIT_BASE = "https://api.pub1.passkit.io";
const PASS_URL_BASE = "https://pub1.pskt.io";

// Shared Track-A objects, created once via Step A2's live API calls (see
// planning/passkit/CONTEXT.md for the full setup log). Not secrets —
// every real venue is the only per-object resource, wired in below.
const PRODUCTION = { id: "27xx6YlVGWi65uxtO1mNbB", uid: "empowr-sessions" };
const TICKET_TYPE = { id: "4KyxqXkNfBOZDot9RfvqVe", uid: "empowr-session-ticket" };

/** The wallet install URL for an issued pass — never returned by the
 *  issue-ticket response itself (see planning/passkit/CONTEXT.md Step A4),
 *  always client-constructed from the ticket id. */
export function passInstallUrl(passId: string): string {
  return `${PASS_URL_BASE}/${passId}`;
}

function base64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** iat is backdated 60s — a freshly-stamped token gets a clock-skew
 *  "Token used before issued" 401 from PassKit; see Step A0. */
function getJwt(): string {
  const key = process.env.PASSKIT_API_KEY;
  const secret = process.env.PASSKIT_API_SECRET;
  if (!key || !secret) throw new Error("PASSKIT_API_KEY/PASSKIT_API_SECRET is not set");
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify({ uid: key, iat: now - 60, exp: now + 300, web: false }));
  const signingInput = `${header}.${payload}`;
  const signature = base64url(createHmac("sha256", secret).update(signingInput).digest());
  return `${signingInput}.${signature}`;
}

async function passkitRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${PASSKIT_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${getJwt()}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`PassKit ${method} ${path} -> ${res.status}: ${text}`);
  }
  if (res.status === 204) return {} as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : {}) as T;
}

/** Create a PassKit Venue for a real mem_venues row. `id` becomes the
 *  PassKit uid (our convention: every object we create is uid'd by its
 *  own Supabase row id) — pass mem_venues.id. Returns the PassKit venue
 *  id to persist as mem_venues.passkit_venue_id, or null on failure. */
export async function createPassKitVenue(venue: {
  id: string;
  name: string;
  address: string | null;
  postcode: string | null;
}): Promise<string | null> {
  try {
    const address = [venue.address, venue.postcode].filter(Boolean).join(", ");
    const data = await passkitRequest<{ id: string }>("POST", "/eventTickets/venue", {
      uid: venue.id,
      name: venue.name,
      address,
      timezone: "Europe/London",
    });
    return data.id;
  } catch (err) {
    console.error("PassKit createPassKitVenue failed", venue.id, err);
    return null;
  }
}

export type IssueSessionPassInput = {
  /** mem_bookings.id — becomes the PassKit ticket uid. */
  bookingId: string;
  offeringTitle: string;
  /** mem_venues.id (the PassKit venue's uid) + its passkit_venue_id. */
  venueId: string;
  venuePasskitId: string;
  /** ISO timestamps for the occurrence (or the full run, for per_run bookings). */
  startsAt: string;
  endsAt: string;
};

/** Issue one Event Tickets pass for a confirmed booking (one per
 *  participant — see planning/passkit/CONTEXT.md Step A5). Returns the
 *  pass id to persist as mem_bookings.passkit_pass_id plus the wallet
 *  install URL, or null on any failure. */
export async function issueSessionPass(
  input: IssueSessionPassInput
): Promise<{ passId: string; installUrl: string } | null> {
  try {
    const data = await passkitRequest<{ ticketId: string }>("POST", "/eventTickets/ticket/id", {
      uid: input.bookingId,
      ticketType: TICKET_TYPE,
      event: {
        production: PRODUCTION,
        venue: { id: input.venuePasskitId, uid: input.venueId },
        doorsOpen: input.startsAt,
        scheduledStartDate: input.startsAt,
        actualStartDate: input.startsAt,
        endDate: input.endsAt,
      },
      metaData: { offeringTitle: input.offeringTitle },
      barcode: { format: "QR" },
    });
    return { passId: data.ticketId, installUrl: passInstallUrl(data.ticketId) };
  } catch (err) {
    console.error("PassKit issueSessionPass failed", input.bookingId, err);
    return null;
  }
}

/** Void an issued pass (permanent — PassKit's DeleteTicket has no
 *  soft-void state, confirmed live: the ticket 404s immediately after).
 *  Returns true on success, false on any failure. */
export async function voidPass(passId: string): Promise<boolean> {
  try {
    await passkitRequest("DELETE", "/eventTickets/ticket", { ticketId: passId });
    return true;
  } catch (err) {
    console.error("PassKit voidPass failed", passId, err);
    return false;
  }
}
