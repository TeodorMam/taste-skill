-- Migration 0040: baseline of every RLS policy, as the database actually has them
--
-- WHY THIS FILE EXISTS
--
-- Migrations 0001-0039 did not describe the live database. Over half the
-- policies in production had been created by hand in the Supabase SQL Editor
-- and never written back here, so reading this folder told you very little
-- about who could actually read or write what.
--
-- That gap is not academic. It is why "users_insert_own_reviews" sat in
-- production unnoticed: a policy allowing any account to write any review
-- about anybody, on any listing. It appeared in no migration file, so nobody
-- reading the repo had reason to look for it. It was found by querying
-- pg_policies directly (see 0039).
--
-- This file is a snapshot taken from pg_policies on 23 September 2026. It
-- records reality rather than intent: nothing here has been tidied, renamed
-- or tightened, because a baseline that quietly improves things is no longer
-- a baseline. Known redundancies are flagged in comments and left in place.
--
-- It is idempotent (drop if exists, then create), so running it restores the
-- recorded state exactly.
--
-- RLS is enabled on all ten public tables. pageviews deliberately has no
-- policies at all, which leaves it reachable only by the service role.
--
-- KEEPING IT TRUE
--
-- A policy changed in the SQL Editor and not written here puts the repo back
-- where it was. New policy work belongs in a numbered migration. To check for
-- drift later, regenerate this listing and diff it against this file:
--
--   select string_agg(ddl, E'\n\n' order by t.tablename, t.cmd, t.policyname)
--   from (
--     select tablename, cmd, policyname,
--       'create policy "' || policyname || '" on public.' || tablename ||
--       ' as ' || lower(permissive) || ' for ' || lower(cmd) ||
--       ' to ' || array_to_string(roles, ', ') ||
--       coalesce(' using (' || qual || ')', '') ||
--       coalesce(' with check (' || with_check || ')', '') || ';' as ddl
--     from pg_policies where schemaname = 'public'
--   ) t;
--
-- Run in Supabase -> SQL Editor.


-- ── chat_reads ──────────────────────────────────────────────────────────────

drop policy if exists "manage own reads" on public.chat_reads;
create policy "manage own reads" on public.chat_reads
  as permissive
  for all
  to authenticated
  using ((user_id = auth.uid()))
  with check ((user_id = auth.uid()));

drop policy if exists "view conversation reads" on public.chat_reads;
create policy "view conversation reads" on public.chat_reads
  as permissive
  for select
  to authenticated
  using (((buyer_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM items
  WHERE ((items.id = chat_reads.item_id) AND (items.seller_id = auth.uid()))))));


-- ── favorites ───────────────────────────────────────────────────────────────
-- Redundant: "users manage own favorites" is FOR ALL and already covers the
-- delete, insert and select policies below. All four say the same thing, so
-- the overlap is harmless, only noisy.

drop policy if exists "users manage own favorites" on public.favorites;
create policy "users manage own favorites" on public.favorites
  as permissive
  for all
  to authenticated
  using ((user_id = auth.uid()))
  with check ((user_id = auth.uid()));

drop policy if exists "delete_own_favorites" on public.favorites;
create policy "delete_own_favorites" on public.favorites
  as permissive
  for delete
  to public
  using ((auth.uid() = user_id));

drop policy if exists "insert_own_favorites" on public.favorites;
create policy "insert_own_favorites" on public.favorites
  as permissive
  for insert
  to public
  with check ((auth.uid() = user_id));

drop policy if exists "read_own_favorites" on public.favorites;
create policy "read_own_favorites" on public.favorites
  as permissive
  for select
  to public
  using ((auth.uid() = user_id));

drop policy if exists "seller read favorites on items" on public.favorites;
create policy "seller read favorites on items" on public.favorites
  as permissive
  for select
  to authenticated
  using ((EXISTS ( SELECT 1
   FROM items
  WHERE ((items.id = favorites.item_id) AND (items.seller_id = auth.uid())))));


-- ── items ───────────────────────────────────────────────────────────────────
-- "anon_select" is open on purpose. Listings have to be readable by everyone,
-- logged in or not, or there is no marketplace. Note that items.contact can
-- hold a phone number or email on listings created before accounts existed,
-- and that column is public along with the rest of the row.
--
-- Redundant: "seller_can_update_own" and "seller_update_own" are the same
-- rule, one granted to public and one to authenticated.

drop policy if exists "seller_can_delete_own" on public.items;
create policy "seller_can_delete_own" on public.items
  as permissive
  for delete
  to public
  using ((auth.uid() = seller_id));

drop policy if exists "authenticated_insert_own" on public.items;
create policy "authenticated_insert_own" on public.items
  as permissive
  for insert
  to authenticated
  with check ((auth.uid() = seller_id));

drop policy if exists "anon_select" on public.items;
create policy "anon_select" on public.items
  as permissive
  for select
  to public
  using (true);

drop policy if exists "seller_can_update_own" on public.items;
create policy "seller_can_update_own" on public.items
  as permissive
  for update
  to public
  using ((auth.uid() = seller_id))
  with check ((auth.uid() = seller_id));

drop policy if exists "seller_update_own" on public.items;
create policy "seller_update_own" on public.items
  as permissive
  for update
  to authenticated
  using ((auth.uid() = seller_id))
  with check ((auth.uid() = seller_id));


-- ── messages ────────────────────────────────────────────────────────────────
-- Only the two participants in a thread can read it, and only the sender can
-- change or remove their own message.

drop policy if exists "sender can delete own messages" on public.messages;
create policy "sender can delete own messages" on public.messages
  as permissive
  for delete
  to public
  using ((sender_id = auth.uid()));

drop policy if exists "thread_participants_insert" on public.messages;
create policy "thread_participants_insert" on public.messages
  as permissive
  for insert
  to authenticated
  with check (((sender_id = auth.uid()) AND (buyer_id <> ( SELECT items.seller_id
   FROM items
  WHERE (items.id = messages.item_id))) AND ((auth.uid() = buyer_id) OR (auth.uid() = ( SELECT items.seller_id
   FROM items
  WHERE (items.id = messages.item_id))))));

drop policy if exists "thread_participants_select" on public.messages;
create policy "thread_participants_select" on public.messages
  as permissive
  for select
  to authenticated
  using (((auth.uid() = buyer_id) OR (auth.uid() = ( SELECT items.seller_id
   FROM items
  WHERE (items.id = messages.item_id)))));

drop policy if exists "sender can update own messages" on public.messages;
create policy "sender can update own messages" on public.messages
  as permissive
  for update
  to public
  using ((sender_id = auth.uid()))
  with check ((sender_id = auth.uid()));


-- ── notifications ───────────────────────────────────────────────────────────
-- No insert policy, by design: rows arrive from triggers and the service role,
-- never from a client.

drop policy if exists "notifications_delete" on public.notifications;
create policy "notifications_delete" on public.notifications
  as permissive
  for delete
  to authenticated
  using ((user_id = auth.uid()));

drop policy if exists "notifications_select" on public.notifications;
create policy "notifications_select" on public.notifications
  as permissive
  for select
  to authenticated
  using ((user_id = auth.uid()));

drop policy if exists "notifications_update" on public.notifications;
create policy "notifications_update" on public.notifications
  as permissive
  for update
  to authenticated
  using ((user_id = auth.uid()));


-- ── offers ──────────────────────────────────────────────────────────────────

drop policy if exists "buyer delete own offer" on public.offers;
create policy "buyer delete own offer" on public.offers
  as permissive
  for delete
  to public
  using ((auth.uid() = buyer_id));

drop policy if exists "buyer insert offer" on public.offers;
create policy "buyer insert offer" on public.offers
  as permissive
  for insert
  to public
  with check ((auth.uid() = buyer_id));

drop policy if exists "buyer read own offers" on public.offers;
create policy "buyer read own offers" on public.offers
  as permissive
  for select
  to public
  using ((auth.uid() = buyer_id));

drop policy if exists "seller read offers on items" on public.offers;
create policy "seller read offers on items" on public.offers
  as permissive
  for select
  to authenticated
  using ((EXISTS ( SELECT 1
   FROM items
  WHERE ((items.id = offers.item_id) AND (items.seller_id = auth.uid())))));

drop policy if exists "seller update offer status" on public.offers;
create policy "seller update offer status" on public.offers
  as permissive
  for update
  to public
  using ((EXISTS ( SELECT 1
   FROM items
  WHERE ((items.id = offers.item_id) AND (items.seller_id = auth.uid())))))
  with check ((EXISTS ( SELECT 1
   FROM items
  WHERE ((items.id = offers.item_id) AND (items.seller_id = auth.uid())))));


-- ── orders ──────────────────────────────────────────────────────────────────
-- Select only, for the two parties. No client can create or change an order:
-- that goes through the checkout route and the webhook on the service role.

drop policy if exists "buyer sees own orders" on public.orders;
create policy "buyer sees own orders" on public.orders
  as permissive
  for select
  to authenticated
  using ((buyer_id = auth.uid()));

drop policy if exists "seller sees own orders" on public.orders;
create policy "seller sees own orders" on public.orders
  as permissive
  for select
  to authenticated
  using ((seller_id = auth.uid()));


-- ── profiles ────────────────────────────────────────────────────────────────
-- You can read your own row and nobody else's. The role reads "public", but
-- auth.uid() is null for a signed-out visitor, so the comparison matches
-- nothing. This is what keeps addresses and phone numbers off the public API,
-- and it is why the app reads other people's display names through the
-- profiles_public view instead of this table.
--
-- Migration 0007 created "profiles readable by everyone" with using (true),
-- which would have exposed every address and phone number added later in
-- 0033. It was replaced by hand at some point and is gone from the database.
-- The repo never recorded that, which is exactly the problem this file fixes.
--
-- No delete policy: account deletion runs server-side on the service role.

drop policy if exists "users can insert own profile" on public.profiles;
create policy "users can insert own profile" on public.profiles
  as permissive
  for insert
  to authenticated
  with check ((auth.uid() = user_id));

drop policy if exists "users read own profile" on public.profiles;
create policy "users read own profile" on public.profiles
  as permissive
  for select
  to public
  using ((user_id = auth.uid()));

drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile" on public.profiles
  as permissive
  for update
  to authenticated
  using ((auth.uid() = user_id))
  with check ((auth.uid() = user_id));


-- ── reviews ─────────────────────────────────────────────────────────────────
-- Open for reading on purpose: reviews are a public trust signal and hold no
-- personal data beyond user ids. Writing requires proof the trade happened,
-- either a message in the item's thread or a paid, uncancelled order (0038).
--
-- Redundant: "anyone_can_read_reviews" and "reviews_select_all" are identical.
--
-- Permissive policies are OR'd, never AND'd. One loose policy here cancels
-- every strict one, which is how "users_insert_own_reviews" undid both insert
-- rules until 0039 removed it. Any policy added to this table later has to be
-- read against the others, not on its own.

drop policy if exists "reviews_delete_own" on public.reviews;
create policy "reviews_delete_own" on public.reviews
  as permissive
  for delete
  to authenticated
  using ((reviewer_id = auth.uid()));

drop policy if exists "reviews_insert_buyer" on public.reviews;
create policy "reviews_insert_buyer" on public.reviews
  as permissive
  for insert
  to authenticated
  with check (((reviewer_id = auth.uid()) AND (seller_id = ( SELECT i.seller_id
   FROM items i
  WHERE ((i.id)::text = (reviews.item_id)::text))) AND (( SELECT i.is_sold
   FROM items i
  WHERE ((i.id)::text = (reviews.item_id)::text)) = true) AND ((EXISTS ( SELECT 1
   FROM messages m
  WHERE (((m.item_id)::text = (reviews.item_id)::text) AND (m.buyer_id = auth.uid()) AND (m.sender_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM orders o
  WHERE (((o.item_id)::text = (reviews.item_id)::text) AND (o.buyer_id = auth.uid()) AND (o.paid_at IS NOT NULL) AND (o.status <> ALL (ARRAY['cancelled'::text, 'refunded'::text]))))))));

drop policy if exists "reviews_insert_seller" on public.reviews;
create policy "reviews_insert_seller" on public.reviews
  as permissive
  for insert
  to authenticated
  with check (((reviewer_id = auth.uid()) AND (( SELECT i.seller_id
   FROM items i
  WHERE ((i.id)::text = (reviews.item_id)::text)) = auth.uid()) AND (( SELECT i.is_sold
   FROM items i
  WHERE ((i.id)::text = (reviews.item_id)::text)) = true) AND ((EXISTS ( SELECT 1
   FROM messages m
  WHERE (((m.item_id)::text = (reviews.item_id)::text) AND (m.buyer_id = reviews.seller_id)))) OR (EXISTS ( SELECT 1
   FROM orders o
  WHERE (((o.item_id)::text = (reviews.item_id)::text) AND (o.buyer_id = reviews.seller_id) AND (o.paid_at IS NOT NULL) AND (o.status <> ALL (ARRAY['cancelled'::text, 'refunded'::text]))))))));

drop policy if exists "anyone_can_read_reviews" on public.reviews;
create policy "anyone_can_read_reviews" on public.reviews
  as permissive
  for select
  to public
  using (true);

drop policy if exists "reviews_select_all" on public.reviews;
create policy "reviews_select_all" on public.reviews
  as permissive
  for select
  to public
  using (true);

drop policy if exists "reviews_update_own" on public.reviews;
create policy "reviews_update_own" on public.reviews
  as permissive
  for update
  to authenticated
  using ((reviewer_id = auth.uid()))
  with check ((reviewer_id = auth.uid()));
