create table if not exists public.chat_reads (
  user_id    uuid not null references auth.users(id) on delete cascade,
  item_id    bigint not null references public.items(id) on delete cascade,
  buyer_id   uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (user_id, item_id, buyer_id)
);

alter table public.chat_reads enable row level security;

-- Users can fully manage their own read receipts
create policy "manage own reads" on public.chat_reads
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Conversation participants (buyer or seller) can view read receipts
create policy "view conversation reads" on public.chat_reads
  for select to authenticated
  using (
    buyer_id = auth.uid()
    or exists (
      select 1 from public.items
      where id = item_id and seller_id = auth.uid()
    )
  );
