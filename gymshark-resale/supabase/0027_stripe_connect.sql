ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_account_id text,
  ADD COLUMN IF NOT EXISTS stripe_charges_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_onboarding_complete boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS profiles_stripe_account_id_idx
  ON public.profiles (stripe_account_id)
  WHERE stripe_account_id IS NOT NULL;
