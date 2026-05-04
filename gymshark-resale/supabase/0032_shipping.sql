ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS package_size text
    CHECK (package_size IN ('small', 'large_10', 'large_25', 'large_35'));

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_method text
    CHECK (delivery_method IN ('shipping', 'meetup'));

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipping_cost_nok integer NOT NULL DEFAULT 0;
