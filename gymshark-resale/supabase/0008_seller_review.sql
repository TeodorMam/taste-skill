-- Migration 0008: seller can review buyer
-- Run this in Supabase → SQL Editor.
--
-- Adds a second insert policy so the item's seller can leave a review
-- for a buyer (reviewer_id = seller, seller_id column = buyer being reviewed).
-- The existing buyer-reviews-seller policy is unchanged.

drop policy if exists "reviews_insert_seller" on public.reviews;
create policy "reviews_insert_seller" on public.reviews
  for insert to authenticated
  with check (
    reviewer_id = auth.uid()
    -- the reviewer must be the item's seller
    and (select i.seller_id from public.items i where i.id = item_id) = auth.uid()
    -- item must be sold
    and (select i.is_sold from public.items i where i.id = item_id) = true
    -- seller_id (the buyer being reviewed) must have messaged in this item thread
    and exists (
      select 1 from public.messages m
      where m.item_id = reviews.item_id
        and m.buyer_id = reviews.seller_id
    )
  );
