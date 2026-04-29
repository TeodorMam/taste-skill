CREATE TABLE IF NOT EXISTS public.orders (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id                    bigint NOT NULL REFERENCES public.items(id) ON DELETE RESTRICT,
  buyer_id                   uuid   NOT NULL REFERENCES auth.users(id)   ON DELETE RESTRICT,
  seller_id                  uuid   NOT NULL REFERENCES auth.users(id)   ON DELETE RESTRICT,
  offer_id                   uuid   REFERENCES public.offers(id)         ON DELETE SET NULL,
  amount_nok                 integer NOT NULL CHECK (amount_nok > 0),
  platform_fee_nok           integer NOT NULL CHECK (platform_fee_nok >= 0),
  stripe_payment_intent_id   text UNIQUE,
  stripe_checkout_session_id text UNIQUE,
  status                     text NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending','paid','cancelled','refunded')),
  created_at                 timestamptz NOT NULL DEFAULT now(),
  paid_at                    timestamptz
);

CREATE INDEX IF NOT EXISTS orders_item_id_idx   ON public.orders (item_id);
CREATE INDEX IF NOT EXISTS orders_buyer_id_idx  ON public.orders (buyer_id);
CREATE INDEX IF NOT EXISTS orders_seller_id_idx ON public.orders (seller_id);
CREATE INDEX IF NOT EXISTS orders_status_idx    ON public.orders (status);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "buyer sees own orders" ON public.orders
  FOR SELECT TO authenticated USING (buyer_id = auth.uid());

CREATE POLICY "seller sees own orders" ON public.orders
  FOR SELECT TO authenticated USING (seller_id = auth.uid());
