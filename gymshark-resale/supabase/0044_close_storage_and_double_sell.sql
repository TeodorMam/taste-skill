-- Two holes from the third bug hunt.
--
-- ── 1. Anyone logged in could overwrite anyone's images ─────────────────────
--
-- 0006 gave authenticated users UPDATE on storage.objects checking only which
-- bucket the object sits in, with no ownership test. Object paths are not
-- secret: getPublicUrl puts them in the page source of every listing. So any
-- account could replace the photos on any listing, or anyone's avatar.
--
-- The policy is dropped rather than narrowed, because nothing needs it. All
-- three upload paths build a fresh name containing Date.now():
--   listings  <timestamp>-<random>.<ext>   and pass upsert: false
--   avatars   avatars/<user>-<timestamp>.<ext>
--   chat      chat/<item>-<buyer>-<timestamp>.<ext>
-- An upsert against a name that cannot already exist never updates anything.
-- Deleting images is done server side with the service role, which does not
-- consult these policies at all.

drop policy if exists "auth update item-images" on storage.objects;

-- ── 2. Two buyers could pay for the same listing ────────────────────────────
--
-- Checkout's duplicate check looked only for an order from the same buyer, or
-- against the same offer. It never asked whether somebody else already had one
-- open. is_sold is set by the webhook, so it is still false while a payment is
-- in flight, and a Stripe session stays open long after the page is closed.
--
-- Buyer A opens checkout and leaves the tab. B buys and pays. A returns and
-- completes the still-open session. Both are charged, for one item.
--
-- The database now refuses the second row outright, which is the only place
-- the guarantee can actually hold.
--
-- If this fails, two live orders already exist for one item. Find them with:
--   select item_id, count(*) from public.orders
--   where status <> 'cancelled' group by item_id having count(*) > 1;
-- then cancel the ones that were never paid before running this again.

create unique index if not exists orders_one_live_per_item
  on public.orders (item_id)
  where status <> 'cancelled';

-- ── 3. Deleting a listing has to take its photos with it ────────────────────
--
-- Nothing removed anything from storage, anywhere, so every photo from every
-- deleted listing stayed in the bucket and stayed reachable at its URL. A
-- seller who took a listing down because a photo showed their living room had
-- removed nothing at all, and the privacy notice promises otherwise.
--
-- Deletion now runs in api/items/[id], which removes the files with the
-- service role and then the row. That is only worth anything if the row
-- cannot be deleted around it, so the client-side delete policy goes. The two
-- places in the app that deleted a listing both call the route instead.

drop policy if exists "seller_can_delete_own" on public.items;
