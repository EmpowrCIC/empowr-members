-- Step 5 (payments): bookings carry their Stripe Checkout session id so
-- the webhook can confirm (checkout.session.completed) or release
-- (checkout.session.expired) every booking in that session in one match.
alter table mem_bookings add column stripe_checkout_session_id text;

create index mem_bookings_checkout_session_idx
  on mem_bookings (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;
