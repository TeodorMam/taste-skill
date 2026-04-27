-- Migration 0007: re-create profiles RLS policies
-- Run this in Supabase → SQL Editor.
--
-- The profiles table existed but at least one policy was missing or
-- mis-scoped, causing upsert to fail with "new row violates row-level
-- security policy". This drops and re-creates them with explicit roles.

alter table public.profiles enable row level security;

drop policy if exists "profiles readable by everyone" on public.profiles;
create policy "profiles readable by everyone" on public.profiles
  for select using (true);

drop policy if exists "users can insert own profile" on public.profiles;
create policy "users can insert own profile" on public.profiles
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile" on public.profiles
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
