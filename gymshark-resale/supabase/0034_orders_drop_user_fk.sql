-- Drop RESTRICT foreign keys on orders so users can delete their accounts.
-- Historical orders keep the UUID values but no longer reference auth.users.
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_buyer_id_fkey,
  DROP CONSTRAINT IF EXISTS orders_seller_id_fkey;
