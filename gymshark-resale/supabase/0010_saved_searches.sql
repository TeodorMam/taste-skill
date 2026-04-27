create table if not exists saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  label text not null,
  filters jsonb not null default '{}',
  last_seen_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table saved_searches enable row level security;

create policy "users manage own saved searches" on saved_searches
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
