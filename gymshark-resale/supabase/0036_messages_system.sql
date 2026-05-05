-- Allow empty body so system messages (bids, payment events, etc.) can have no text
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_body_check;
ALTER TABLE public.messages ADD CONSTRAINT messages_body_check CHECK (length(body) <= 2000);

-- Classify every message: regular text/image, bid event, or lifecycle event
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'text'
  CHECK (message_type IN ('text', 'image', 'bid', 'bid_accepted', 'payment', 'shipped', 'delivered', 'payout'));

-- Structured payload for system messages
-- bid:          { offer_id, amount }
-- bid_accepted: { offer_id, amount }
-- payment:      { amount_nok, order_id }
-- shipped:      { order_id, tracking_info? }
-- delivered:    { order_id }
-- payout:       { order_id, amount_nok }
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS metadata jsonb;
