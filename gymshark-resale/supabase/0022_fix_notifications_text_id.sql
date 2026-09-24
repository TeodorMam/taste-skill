-- 0022: Complete notifications reset.
-- Drops and recreates everything cleanly using text for item_id so the
-- column is compatible with items.id regardless of whether it is uuid or
-- bigint in the live database.

-- ── 1. Remove old triggers and functions ─────────────────────────────────────
DROP TRIGGER IF EXISTS offer_notification_trigger    ON public.offers;
DROP TRIGGER IF EXISTS favorite_notification_trigger ON public.favorites;
DROP FUNCTION IF EXISTS public.create_offer_notification();
DROP FUNCTION IF EXISTS public.create_favorite_notification();

-- ── 2. Recreate the notifications table ──────────────────────────────────────
--
-- Guarded, because this file used to drop the table unconditionally. Every
-- other migration here can be run twice without consequence, so re-running one
-- to be sure it was applied looks safe. This one answered "Success" and took
-- every notification every user had with it.
--
-- The drop only happens when item_id is still the old type, which is the one
-- case where recreating was the point. Once the column is text the table is
-- left exactly as it is.
DO $$
DECLARE col_type text;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'item_id';

  IF col_type IS NOT NULL AND col_type <> 'text' THEN
    DROP TABLE public.notifications;
    RAISE NOTICE 'notifications dropped for recreation: item_id was %', col_type;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.notifications (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type         text        NOT NULL CHECK (type IN ('offer', 'favorite')),
  item_id      text,                         -- stored as text; no FK needed
  from_user_id uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata     jsonb       NOT NULL DEFAULT '{}',
  read_at      timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
CREATE POLICY "notifications_update" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_delete" ON public.notifications;
CREATE POLICY "notifications_delete" ON public.notifications
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ── 3. Offer notification trigger ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_offer_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seller_id uuid;
  v_title     text;
BEGIN
  -- Use ::text cast on both sides so the comparison works whether items.id
  -- is uuid or bigint.
  SELECT seller_id, title
    INTO v_seller_id, v_title
    FROM public.items
   WHERE id::text = new.item_id::text;

  IF v_seller_id IS NOT NULL AND v_seller_id <> new.buyer_id THEN
    INSERT INTO public.notifications
      (user_id, type, item_id, from_user_id, metadata)
    VALUES (
      v_seller_id,
      'offer',
      new.item_id::text,
      new.buyer_id,
      jsonb_build_object(
        'amount',     new.amount,
        'item_title', COALESCE(v_title, '')
      )
    );
  END IF;

  RETURN new;
END;
$$;

CREATE TRIGGER offer_notification_trigger
  AFTER INSERT ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.create_offer_notification();

-- ── 4. Favorite notification trigger ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_favorite_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seller_id uuid;
  v_title     text;
BEGIN
  SELECT seller_id, title
    INTO v_seller_id, v_title
    FROM public.items
   WHERE id::text = new.item_id::text;

  IF v_seller_id IS NOT NULL AND v_seller_id <> new.user_id THEN
    INSERT INTO public.notifications
      (user_id, type, item_id, from_user_id, metadata)
    VALUES (
      v_seller_id,
      'favorite',
      new.item_id::text,
      new.user_id,
      jsonb_build_object('item_title', COALESCE(v_title, ''))
    );
  END IF;

  RETURN new;
END;
$$;

CREATE TRIGGER favorite_notification_trigger
  AFTER INSERT ON public.favorites
  FOR EACH ROW EXECUTE FUNCTION public.create_favorite_notification();
