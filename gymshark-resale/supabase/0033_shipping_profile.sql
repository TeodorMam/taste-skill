-- Buyer shipping fields on profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS full_name   TEXT,
  ADD COLUMN IF NOT EXISTS address     TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS city        TEXT,
  ADD COLUMN IF NOT EXISTS phone       TEXT;

-- Snapshot of buyer shipping info on the order at time of purchase
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS buyer_name        TEXT,
  ADD COLUMN IF NOT EXISTS buyer_address     TEXT,
  ADD COLUMN IF NOT EXISTS buyer_postal_code TEXT,
  ADD COLUMN IF NOT EXISTS buyer_city        TEXT,
  ADD COLUMN IF NOT EXISTS buyer_phone       TEXT;
