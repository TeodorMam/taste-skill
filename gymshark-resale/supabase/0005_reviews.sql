-- Migration 0005: reviews
-- Run this in Supabase → SQL Editor.
--
-- A reviewer leaves a thumb-up / thumb-down on a SOLD item for the seller.
-- The reviewer must have at least one message in the (item_id, buyer_id=auth.uid())
-- thread, so only people who actually contacted the seller can review.
-- One review per (item_id, reviewer_id) — the seller is derived from the item.

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  is_positive boolean not null,
  comment text check (comment is null or length(comment) between 1 and 280),
  created_at timestamptz not null default now(),
  unique (item_id, reviewer_id),
  check (reviewer_id <> seller_id)
);

create index if not exists reviews_seller_id_idx
  on public.reviews (seller_id, created_at desc);

create index if not exists reviews_item_id_idx
  on public.reviews (item_id);

alter table public.reviews enable row level security;

-- Anyone can read reviews (public trust signal).
drop policy if exists "reviews_select_all" on public.reviews;
create policy "reviews_select_all" on public.reviews
  for select using (true);

-- A reviewer can insert their own review IFF:
--   - they're authenticated and reviewer_id = auth.uid()
--   - the item exists, is sold, and the seller_id on the row matches the item's seller
--   - they have messaged the seller in this item's thread (so spam-reviews are blocked)
drop policy if exists "reviews_insert_buyer" on public.reviews;
create policy "reviews_insert_buyer" on public.reviews
  for insert to authenticated
  with check (
    reviewer_id = auth.uid()
    and seller_id = (select i.seller_id from public.items i where i.id = item_id)
    and (select i.is_sold from public.items i where i.id = item_id) = true
    and exists (
      select 1 from public.messages m
      where m.item_id = reviews.item_id
        and m.buyer_id = auth.uid()
        and m.sender_id = auth.uid()
    )
  );

-- Reviewer can update or delete their own review.
drop policy if exists "reviews_update_own" on public.reviews;
create policy "reviews_update_own" on public.reviews
  for update to authenticated
  using (reviewer_id = auth.uid())
  with check (reviewer_id = auth.uid());

drop policy if exists "reviews_delete_own" on public.reviews;
create policy "reviews_delete_own" on public.reviews
  for delete to authenticated
  using (reviewer_id = auth.uid());
