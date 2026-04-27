create table if not exists offers (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references items(id) on delete cascade not null,
  buyer_id uuid references auth.users(id) on delete cascade not null,
  amount integer not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz default now()
);

alter table offers enable row level security;

create policy "buyer insert offer" on offers
  for insert with check (auth.uid() = buyer_id);

create policy "buyer read own offers" on offers
  for select using (auth.uid() = buyer_id);

create policy "seller read offers on items" on offers
  for select using (
    exists (select 1 from items where items.id = offers.item_id and items.seller_id = auth.uid())
  );

create policy "seller update offer status" on offers
  for update using (
    exists (select 1 from items where items.id = offers.item_id and items.seller_id = auth.uid())
  ) with check (
    exists (select 1 from items where items.id = offers.item_id and items.seller_id = auth.uid())
  );

create policy "buyer delete own offer" on offers
  for delete using (auth.uid() = buyer_id);
