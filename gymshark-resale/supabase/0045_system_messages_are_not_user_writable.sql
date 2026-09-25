-- The chat renders a message as a trusted system card purely from its own
-- row: `if (type in EVENT_CONFIGS)` draws "Betaling gjennomført" with a lock
-- icon, and reads nothing else to check that it happened.
--
-- The insert policy only asked who the sender was and whether they belonged to
-- the thread. message_type and metadata were entirely theirs to choose, and
-- 'payment' is a value the CHECK constraint in 0036 accepts. One line in a
-- browser console put a payment confirmation in the seller's chat, in the
-- place a real one appears, and a seller who trusted it posted a parcel that
-- nobody had paid for.
--
-- Types the app's own code writes from the browser stay allowed. Everything
-- that asserts money or delivery is now written only by the service role,
-- which is to say by the webhook and the order routes, and RLS does not apply
-- to those.
--
--   text, image, bid     any participant, as before
--   bid_accepted         the seller only, since accepting is theirs to do
--   payment, shipped,
--   delivered, payout    nobody from the client
--
-- Run in Supabase -> SQL Editor.

drop policy if exists "thread_participants_insert" on public.messages;
create policy "thread_participants_insert" on public.messages
  as permissive
  for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and buyer_id <> (select items.seller_id from items where items.id = messages.item_id)
    and (
      auth.uid() = buyer_id
      or auth.uid() = (select items.seller_id from items where items.id = messages.item_id)
    )
    and (
      message_type in ('text', 'image', 'bid')
      or (
        message_type = 'bid_accepted'
        and auth.uid() = (select items.seller_id from items where items.id = messages.item_id)
      )
    )
  );

-- The update policy lets a sender change their own message, and with check
-- cannot see the old row, so a plain text message could be sent first and
-- turned into a payment card afterwards. Editing a message is meant to change
-- its words, so the type and the payload are frozen the moment it exists.

create or replace function public.freeze_message_kind()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.message_type is distinct from old.message_type then
    raise exception 'Meldingstypen kan ikke endres etter at meldingen er sendt';
  end if;
  if new.metadata is distinct from old.metadata then
    raise exception 'Innholdet i en systemmelding kan ikke endres';
  end if;
  return new;
end;
$$;

drop trigger if exists messages_freeze_kind on public.messages;
create trigger messages_freeze_kind
  before update on public.messages
  for each row execute function public.freeze_message_kind();
