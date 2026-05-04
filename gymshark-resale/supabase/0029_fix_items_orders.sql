-- Ensure sold_to_buyer_id exists (migration 0012 may not have run on all envs)
ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS sold_to_buyer_id uuid REFERENCES auth.users(id);

-- Allow items to be deleted even when referenced by orders.
-- item_id becomes nullable so order history is preserved for financial records.
ALTER TABLE public.orders
  ALTER COLUMN item_id DROP NOT NULL;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_item_id_fkey;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_item_id_fkey
  FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE SET NULL;
