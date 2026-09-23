-- Migration 0038: a completed purchase earns the right to review
--
-- Until now a buyer could only review if they had sent a message in the
-- item's thread. Someone who found a listing, paid, and received the item
-- without ever chatting was refused by the database, silently, after the UI
-- had already offered them the form. Aktivbruk's only real sale went
-- unreviewed for exactly this kind of reason.
--
-- A paid, uncancelled order is stronger proof that a trade happened than a
-- chat message is, so it now counts as well. The message route is kept, so
-- nothing that worked before stops working.
--
-- item_id is compared as text throughout the new branches because orders,
-- messages and reviews have not always agreed on the column type. Casting
-- makes the policy correct whichever way the columns ended up.
--
-- Run in Supabase -> SQL Editor.

drop policy if exists "reviews_insert_buyer" on public.reviews;
create policy "reviews_insert_buyer" on public.reviews
  for insert to authenticated
  with check (
    reviewer_id = auth.uid()
    and seller_id = (select i.seller_id from public.items i where i.id::text = reviews.item_id::text)
    and (select i.is_sold from public.items i where i.id::text = reviews.item_id::text) = true
    and (
      -- Route that already existed: the buyer messaged in this item's thread.
      exists (
        select 1 from public.messages m
        where m.item_id::text = reviews.item_id::text
          and m.buyer_id = auth.uid()
          and m.sender_id = auth.uid()
      )
      -- New route: the buyer actually paid for this item.
      or exists (
        select 1 from public.orders o
        where o.item_id::text = reviews.item_id::text
          and o.buyer_id = auth.uid()
          and o.paid_at is not null
          and o.status not in ('cancelled', 'refunded')
      )
    )
  );

drop policy if exists "reviews_insert_seller" on public.reviews;
create policy "reviews_insert_seller" on public.reviews
  for insert to authenticated
  with check (
    reviewer_id = auth.uid()
    -- the reviewer must be the item's seller
    and (select i.seller_id from public.items i where i.id::text = reviews.item_id::text) = auth.uid()
    and (select i.is_sold from public.items i where i.id::text = reviews.item_id::text) = true
    and (
      -- Route that already existed: the person being reviewed has a thread here.
      exists (
        select 1 from public.messages m
        where m.item_id::text = reviews.item_id::text
          and m.buyer_id = reviews.seller_id
      )
      -- New route: the person being reviewed actually paid for this item.
      or exists (
        select 1 from public.orders o
        where o.item_id::text = reviews.item_id::text
          and o.buyer_id = reviews.seller_id
          and o.paid_at is not null
          and o.status not in ('cancelled', 'refunded')
      )
    )
  );
