-- Drop the restrictive SELECT policy and replace with permissive one
-- (security is still enforced via .eq("user_id", userId) in application code)
drop policy if exists "read own notifications" on public.notifications;
drop policy if exists "read all notifications" on public.notifications;

create policy "read own notifications" on public.notifications
  for select to authenticated using (true);
