// Server-only Stripe client — the Members-scoped restricted key on the
// shared Empowr CIC account (rk_test locally; the live twin lands in
// Netlify env at Step 9 go-live under the same unsuffixed name).
import "server-only";
import Stripe from "stripe";

let client: Stripe | null = null;

export function getStripe(): Stripe {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    client = new Stripe(key);
  }
  return client;
}

/** Extra minutes a hold outlives its Checkout session, so a payment
 *  completed at the last second still confirms via webhook before the
 *  pg_cron sweep releases the hold. checkout.session.expired releases
 *  unpaid holds well before this. */
export const HOLD_GRACE_MINUTES = 10;
