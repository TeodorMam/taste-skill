-- Gymshark Resale MVP schema
-- Run this in Supabase SQL editor, then create the storage bucket below.

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  image_url text,
  size text not null,
  price numeric(10, 2) not null check (price >= 0),
  condition text not null,
  location text not null default 'Oslo',
  contact text not null,
  is_sold boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists items_created_at_idx
  on public.items (created_at desc);

-- Enable Row Level Security but allow anonymous read/insert/update for the MVP.
-- (No auth in MVP; tighten this before going to production.)
alter table public.items enable row level security;

drop policy if exists "anon_select" on public.items;
create policy "anon_select" on public.items
  for select using (true);

drop policy if exists "anon_insert" on public.items;
create policy "anon_insert" on public.items
  for insert with check (true);

drop policy if exists "anon_update_sold" on public.items;
create policy "anon_update_sold" on public.items
  for update using (true) with check (true);

-- Storage bucket setup (run in Supabase SQL editor once):
--   insert into storage.buckets (id, name, public)
--   values ('item-images', 'item-images', true)
--   on conflict (id) do nothing;
--
-- Storage policies (public bucket already allows public reads; we just need
-- to allow anonymous uploads for the MVP):
--   create policy "anon upload" on storage.objects
--     for insert to anon
--     with check (bucket_id = 'item-images');
