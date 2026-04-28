-- 0024: Allow sellers to read favorites on their items.
-- Without this, the inbox can't show "X favorited your item" because the
-- existing favorites RLS only lets the favoriter read their own rows.

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
