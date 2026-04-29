-- 0025: Fix seller inbox RLS policies.
-- Drops and recreates the offers+favorites read policies with ::text casting
-- so they work regardless of whether item_id is bigint or uuid.

-- OFFERS: sellers can read offers on their items
DROP POLICY IF EXISTS "seller read offers on items" ON public.offers;
CREATE POLICY "seller read offers on items" ON public.offers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.items
      WHERE items.id::text = offers.item_id::text
        AND items.seller_id = auth.uid()
    )
  );

-- FAVORITES: sellers can read favorites on their items
DROP POLICY IF EXISTS "seller read favorites on items" ON public.favorites;
CREATE POLICY "seller read favorites on items" ON public.favorites
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.items
      WHERE items.id::text = favorites.item_id::text
        AND items.seller_id = auth.uid()
    )
  );
