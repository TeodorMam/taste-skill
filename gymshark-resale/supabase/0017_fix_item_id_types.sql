-- Fix offers.item_id and favorites.item_id from uuid to bigint to match items.id

-- OFFERS: safe to delete (table never worked due to type mismatch)
DO $$
DECLARE col_type text;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'offers' AND column_name = 'item_id';

  IF col_type IS NOT DISTINCT FROM 'uuid' THEN
    DELETE FROM public.offers;
    ALTER TABLE public.offers DROP CONSTRAINT IF EXISTS offers_item_id_fkey;
    ALTER TABLE public.offers DROP COLUMN item_id;
    ALTER TABLE public.offers ADD COLUMN item_id bigint NOT NULL DEFAULT 0;
    ALTER TABLE public.offers ALTER COLUMN item_id DROP DEFAULT;
    ALTER TABLE public.offers ADD CONSTRAINT offers_item_id_fkey
      FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;
    RAISE NOTICE 'Fixed offers.item_id: % -> bigint', col_type;
  ELSE
    RAISE NOTICE 'offers.item_id is already %, skipping', col_type;
  END IF;
END $$;

-- FAVORITES: same fix; clears bad rows that could never have matched real items
DO $$
DECLARE col_type text;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'favorites' AND column_name = 'item_id';

  IF col_type IS NOT DISTINCT FROM 'uuid' THEN
    DELETE FROM public.favorites;
    ALTER TABLE public.favorites DROP CONSTRAINT IF EXISTS favorites_item_id_fkey;
    ALTER TABLE public.favorites DROP COLUMN item_id;
    ALTER TABLE public.favorites ADD COLUMN item_id bigint NOT NULL DEFAULT 0;
    ALTER TABLE public.favorites ALTER COLUMN item_id DROP DEFAULT;
    ALTER TABLE public.favorites ADD CONSTRAINT favorites_item_id_fkey
      FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;
    RAISE NOTICE 'Fixed favorites.item_id: % -> bigint', col_type;
  ELSE
    RAISE NOTICE 'favorites.item_id is already %, skipping', col_type;
  END IF;
END $$;

-- Ensure favorites has RLS + policy (in case it was missing)
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users manage own favorites" ON public.favorites;
CREATE POLICY "users manage own favorites" ON public.favorites
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
