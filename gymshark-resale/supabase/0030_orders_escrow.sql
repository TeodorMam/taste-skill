-- Extend orders table for escrow / delivery-confirmation flow
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipped_at         timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at       timestamptz,
  ADD COLUMN IF NOT EXISTS review_deadline    timestamptz,
  ADD COLUMN IF NOT EXISTS confirmed_at       timestamptz,
  ADD COLUMN IF NOT EXISTS disputed_at        timestamptz,
  ADD COLUMN IF NOT EXISTS dispute_reason     text,
  ADD COLUMN IF NOT EXISTS tracking_info      text,
  ADD COLUMN IF NOT EXISTS payout_transfer_id text,
  ADD COLUMN IF NOT EXISTS payout_amount_nok  integer;

-- Expand status set
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    'pending',
    'paid',
    'shipped',
    'delivered',
    'confirmed',
    'disputed',
    'paid_out',
    'cancelled',
    'refunded'
  ));
