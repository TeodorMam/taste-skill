-- Bulletproof notifications via database triggers.
-- When an offer or favorite is inserted, automatically create a notification
-- for the seller. Runs as SECURITY DEFINER so it bypasses all RLS issues.

-- ============================================================
-- Offer notifications
-- ============================================================
create or replace function public.create_offer_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller_id uuid;
  v_title     text;
begin
  select seller_id, title into v_seller_id, v_title
  from public.items where id = new.item_id;

  if v_seller_id is not null and v_seller_id <> new.buyer_id then
    insert into public.notifications (user_id, type, item_id, from_user_id, metadata)
    values (
      v_seller_id,
      'offer',
      new.item_id,
      new.buyer_id,
      jsonb_build_object('amount', new.amount, 'item_title', coalesce(v_title, ''))
    );
  end if;

  return new;
end;
$$;

drop trigger if exists offer_notification_trigger on public.offers;
create trigger offer_notification_trigger
  after insert on public.offers
  for each row execute function public.create_offer_notification();

-- ============================================================
-- Favorite notifications
-- ============================================================
create or replace function public.create_favorite_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller_id uuid;
  v_title     text;
begin
  select seller_id, title into v_seller_id, v_title
  from public.items where id = new.item_id;

  if v_seller_id is not null and v_seller_id <> new.user_id then
    insert into public.notifications (user_id, type, item_id, from_user_id, metadata)
    values (
      v_seller_id,
      'favorite',
      new.item_id,
      new.user_id,
      jsonb_build_object('item_title', coalesce(v_title, ''))
    );
  end if;

  return new;
end;
$$;

drop trigger if exists favorite_notification_trigger on public.favorites;
create trigger favorite_notification_trigger
  after insert on public.favorites
  for each row execute function public.create_favorite_notification();
