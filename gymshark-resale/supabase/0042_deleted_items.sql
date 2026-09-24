-- A listing is hard-deleted, so once it is gone the row tells us nothing:
-- not its brand, not its category, not even that it ever existed. That costs
-- us two things. Google keeps sending people to a URL that answers 404 when
-- it should answer 410, and the page they land on cannot offer anything
-- similar because it does not know what the item was.
--
-- This tombstone keeps just enough to answer both. A trigger writes it, so
-- deletes from the app and deletes from the Supabase dashboard are both
-- captured, and no application code has to remember to do it.

create table if not exists public.deleted_items (
  id          text primary key,
  brand       text,
  category    text,
  title       text,
  deleted_at  timestamptz not null default now()
);

create index if not exists deleted_items_brand_idx on public.deleted_items (brand);

create or replace function public.record_deleted_item()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.deleted_items (id, brand, category, title)
  values (old.id::text, old.brand, old.category, old.title)
  on conflict (id) do update
    set brand      = excluded.brand,
        category   = excluded.category,
        title      = excluded.title,
        deleted_at = now();
  return old;
end;
$$;

drop trigger if exists items_record_deletion on public.items;
create trigger items_record_deletion
  before delete on public.items
  for each row execute function public.record_deleted_item();

-- The tombstone holds nothing private: a brand, a category and the public
-- title of a listing that was already visible to everyone. Anyone may read
-- it, and only the trigger writes it.
alter table public.deleted_items enable row level security;

drop policy if exists "anyone reads deleted items" on public.deleted_items;
create policy "anyone reads deleted items"
  on public.deleted_items for select
  using (true);

-- From 30 October 2026 Supabase no longer grants Data API access to new
-- tables automatically, so the grants ship with the table. No anon write,
-- no authenticated write: the trigger owns this table.
grant select on public.deleted_items to anon;
grant select on public.deleted_items to authenticated;
grant select, insert, update, delete on public.deleted_items to service_role;
