ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS image_url TEXT;
