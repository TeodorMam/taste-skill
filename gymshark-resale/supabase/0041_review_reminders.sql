-- Migration 0041: review reminder emails
--
-- Three things are missing before a reminder can be sent safely.
--
-- 1. orders.paid_out_at. payoutOrder sets status, payout_transfer_id and
--    payout_amount_nok, but never recorded when. "48 hours after payout" was
--    not answerable. Existing paid_out rows stay null on purpose: there is no
--    honest value to backfill, and a reminder about a trade from two months
--    ago would be strange anyway.
--
-- 2. Two reminder timestamps. Whether someone has reviewed is answered by the
--    reviews table, but whether we already emailed them cannot be: if a person
--    never reviews, reviews stays empty and the cron would mail them every
--    single day forever. The reviews table decides relevance, these columns
--    decide idempotency.
--
-- 3. An unsubscribe route. The completion emails are transactional, but a
--    reminder is a nudge, so it needs a way out. The token is a random uuid
--    per profile rather than a signed value, so no new secret has to be
--    configured and a person can be given a fresh one by clearing the column.
--
-- Run in Supabase -> SQL Editor.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS paid_out_at               timestamptz,
  ADD COLUMN IF NOT EXISTS buyer_review_reminded_at  timestamptz,
  ADD COLUMN IF NOT EXISTS seller_review_reminded_at timestamptz;

-- The cron scans on this, and most orders never qualify.
CREATE INDEX IF NOT EXISTS orders_paid_out_at_idx ON public.orders (paid_out_at)
  WHERE paid_out_at IS NOT NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS review_emails_off boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_token       uuid    NOT NULL DEFAULT gen_random_uuid();

-- Looked up by token from an email link, where there is no session.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_token_idx ON public.profiles (email_token);
