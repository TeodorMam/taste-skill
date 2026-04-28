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
DROP TABLE IF EXISTS public.notifications;

CREATE TABLE public.notifications (
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

CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "notifications_update" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

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
