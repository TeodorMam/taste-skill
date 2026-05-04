ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS carrier text
    CHECK (carrier IN ('bring', 'postnord', 'helthjem', 'other'));
