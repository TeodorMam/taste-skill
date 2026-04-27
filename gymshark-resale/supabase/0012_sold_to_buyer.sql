alter table items add column if not exists sold_to_buyer_id uuid references auth.users(id);
