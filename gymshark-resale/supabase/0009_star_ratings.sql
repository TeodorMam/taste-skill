-- Migration 0009: 1-5 star ratings
-- Run in Supabase → SQL Editor.
--
-- Adds a rating (1-5) column to reviews and makes is_positive nullable
-- so old thumbs reviews are kept as-is while new reviews use stars.

alter table public.reviews
  add column if not exists rating smallint check (rating between 1 and 5);

alter table public.reviews
  alter column is_positive drop not null;
