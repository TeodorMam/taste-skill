-- Migration 0006: storage policy for authenticated uploads
-- Run this in Supabase → SQL Editor.
--
-- The original storage policy only allowed `anon` uploads. Once users log in,
-- they're in the `authenticated` role and the upload fails with
-- "new row violates row-level security policy". This adds a policy so
-- authenticated users can upload to the item-images bucket (covers both
-- item photos under the bucket root and avatars under avatars/*).

drop policy if exists "auth upload item-images" on storage.objects;
create policy "auth upload item-images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'item-images');

-- Allow authenticated users to overwrite their own avatar files
-- (since avatar uploads use upsert: true).
drop policy if exists "auth update item-images" on storage.objects;
create policy "auth update item-images" on storage.objects
  for update to authenticated
  using (bucket_id = 'item-images')
  with check (bucket_id = 'item-images');
