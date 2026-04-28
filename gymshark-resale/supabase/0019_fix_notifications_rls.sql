-- Drop and recreate notifications policies to fix silent insert rejections
drop policy if exists "read own notifications"  on public.notifications;
drop policy if exists "insert notifications"     on public.notifications;
drop policy if exists "update own notifications" on public.notifications;
drop policy if exists "delete own notifications" on public.notifications;

-- Any authenticated user can read their own notifications
create policy "read own notifications" on public.notifications
  for select to authenticated using (user_id = auth.uid());

-- Any authenticated user can insert a notification (sender = current user enforced in app)
create policy "insert notifications" on public.notifications
  for insert to authenticated with check (true);

-- Only the recipient can mark notifications read / update them
create policy "update own notifications" on public.notifications
  for update to authenticated using (user_id = auth.uid());

-- Only the recipient can delete their notifications
create policy "delete own notifications" on public.notifications
  for delete to authenticated using (user_id = auth.uid());
