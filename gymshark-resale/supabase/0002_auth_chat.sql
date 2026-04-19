-- Migration 0002: auth + chat
-- Run this in Supabase → SQL Editor after the initial schema.

-- 1. seller_id on items (nullable so existing rows still work).
alter table public.items
  add column if not exists seller_id uuid references auth.users(id) on delete set null;

create index if not exists items_seller_id_idx
  on public.items (seller_id);

-- Tighten items policies: only authenticated users can post, and only the seller
-- can mark it sold. Anonymous users can still browse.
drop policy if exists "anon_insert" on public.items;
drop policy if exists "anon_update_sold" on public.items;

create policy "authenticated_insert_own" on public.items
  for insert to authenticated
  with check (auth.uid() = seller_id);

create policy "seller_update_own" on public.items
  for update to authenticated
  using (auth.uid() = seller_id)
  with check (auth.uid() = seller_id);

-- 2. messages table. A "thread" is uniquely (item_id, buyer_id), where buyer_id
-- is the non-seller participant. Both parties can read and write in the thread.
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists messages_thread_idx
  on public.messages (item_id, buyer_id, created_at);

alter table public.messages enable row level security;

-- Participants (buyer or seller of the item) can read the thread.
drop policy if exists "thread_participants_select" on public.messages;
create policy "thread_participants_select" on public.messages
  for select to authenticated
  using (
    auth.uid() = buyer_id
    or auth.uid() = (select seller_id from public.items where id = item_id)
  );

-- Participants can insert, and only as themselves. Buyer cannot equal seller.
drop policy if exists "thread_participants_insert" on public.messages;
create policy "thread_participants_insert" on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and buyer_id <> (select seller_id from public.items where id = item_id)
    and (
      auth.uid() = buyer_id
      or auth.uid() = (select seller_id from public.items where id = item_id)
    )
  );

-- Enable Realtime on messages so the ChatPanel can subscribe to INSERTs.
-- (In the dashboard: Database → Replication → supabase_realtime → add `messages`.)
alter publication supabase_realtime add table public.messages;
