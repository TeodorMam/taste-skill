-- The RLS policy "seller update offer status" is named for what it is meant to
-- do, but it restricts rows, not columns: the seller of an item may update any
-- column on any offer for that item, amount included.
--
-- Checkout reads offers.amount at the moment it builds the Stripe session, so
-- a seller could accept a bid of 100, wait for the buyer to press Kjøp, and
-- raise amount to 5000 in between. The buyer would see the real figure on
-- Stripe's page, which is why this is small rather than serious, but it should
-- not be possible at all.
--
-- A trigger is used rather than a snapshot column or a column privilege. A
-- snapshot would need a new column, a change in checkout, a backfill of the
-- offers already accepted, and a fallback for rows the backfill missed. A
-- column privilege cannot say "locked only once the row reaches this status",
-- so it would have to forbid the update outright for every offer in every
-- state. The rule wanted here is conditional, and this is where Postgres lets
-- you say it.

create or replace function public.freeze_offer_amount()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status is distinct from 'pending'
     and new.amount is distinct from old.amount then
    raise exception 'Beløpet på et bud kan ikke endres etter at budet er besvart';
  end if;
  return new;
end;
$$;

drop trigger if exists offers_freeze_amount on public.offers;
create trigger offers_freeze_amount
  before update on public.offers
  for each row execute function public.freeze_offer_amount();
