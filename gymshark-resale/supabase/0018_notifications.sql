create table if not exists public.notifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  type         text not null check (type in ('offer', 'favorite')),
  item_id      bigint references public.items(id) on delete cascade,
  from_user_id uuid references auth.users(id) on delete cascade,
  metadata     jsonb not null default '{}',
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);

alter table public.notifications enable row level security;

-- Recipients read their own
create policy "read own notifications" on public.notifications
  for select to authenticated using (user_id = auth.uid());

-- Any authenticated user can create a notification as themselves
create policy "insert notifications" on public.notifications
  for insert to authenticated with check (from_user_id = auth.uid());

-- Recipients mark own as read
create policy "update own notifications" on public.notifications
  for update to authenticated using (user_id = auth.uid());

-- Recipients can delete own
create policy "delete own notifications" on public.notifications
  for delete to authenticated using (user_id = auth.uid());
