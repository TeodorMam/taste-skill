-- Add image_urls (text array) to items for the gallery feature.
-- Existing rows keep their single image_url; new rows save both
-- image_url (= first) and image_urls (= full gallery, up to 10).

alter table public.items
  add column if not exists image_urls text[];
