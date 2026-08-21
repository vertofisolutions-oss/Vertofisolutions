-- Trial + autopay (Razorpay Subscriptions + UPI/card mandate). See docs/04 payment.
SET search_path TO billing;

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS razorpay_subscription_id text;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS mandate_status text;       -- CREATED|AUTHENTICATED|ACTIVE|HALTED|CANCELLED
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS next_charge_at timestamptz;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS autopay_method text;       -- UPI|CARD

CREATE INDEX IF NOT EXISTS subscriptions_rzp_idx ON subscriptions(razorpay_subscription_id);
