-- 0023: Replace triggers with explicit RPC functions.
-- Triggers were invisible and hard to verify. These RPCs are called
-- directly from the client after an offer/favorite insert, run as
-- the postgres role (SECURITY DEFINER) so they bypass all RLS, and
-- return errors the client can actually see.

-- ── Drop old triggers and functions ──────────────────────────────────────────
DROP TRIGGER IF EXISTS offer_notification_trigger    ON public.offers;
DROP TRIGGER IF EXISTS favorite_notification_trigger ON public.favorites;
DROP FUNCTION IF EXISTS public.create_offer_notification();
DROP FUNCTION IF EXISTS public.create_favorite_notification();

-- ── RPC: called by buyer after submitting an offer ────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_seller_of_offer(
  p_item_id text,
  p_amount  integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seller_id uuid;
  v_title     text;
  v_buyer_id  uuid := auth.uid();
BEGIN
  SELECT seller_id, title
    INTO v_seller_id, v_title
    FROM public.items
   WHERE id::text = p_item_id;

  IF v_seller_id IS NOT NULL AND v_seller_id <> v_buyer_id THEN
    INSERT INTO public.notifications
      (user_id, type, item_id, from_user_id, metadata)
    VALUES (
      v_seller_id,
      'offer',
      p_item_id,
      v_buyer_id,
      jsonb_build_object(
        'amount',     p_amount,
        'item_title', COALESCE(v_title, '')
      )
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_seller_of_offer(text, integer) TO authenticated;

-- ── RPC: called by user after favoriting an item ──────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_seller_of_favorite(
  p_item_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seller_id uuid;
  v_title     text;
  v_user_id   uuid := auth.uid();
BEGIN
  SELECT seller_id, title
    INTO v_seller_id, v_title
    FROM public.items
   WHERE id::text = p_item_id;

  IF v_seller_id IS NOT NULL AND v_seller_id <> v_user_id THEN
    INSERT INTO public.notifications
      (user_id, type, item_id, from_user_id, metadata)
    VALUES (
      v_seller_id,
      'favorite',
      p_item_id,
      v_user_id,
      jsonb_build_object('item_title', COALESCE(v_title, ''))
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_seller_of_favorite(text) TO authenticated;
