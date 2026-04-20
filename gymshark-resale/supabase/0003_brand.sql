-- Migration 0003: brand column
-- Adds a nullable brand column so items can be categorized by brand.

alter table public.items
  add column if not exists brand text;

create index if not exists items_brand_idx
  on public.items (brand);
