-- Minimal first-party analytics.
--
-- Deliberately stores nothing that identifies a person: no IP address, no
-- cookie, no user agent, no user id. Just which page, roughly where the
-- visitor came from, and a random id that lives in sessionStorage and dies
-- when the tab closes. That keeps this outside the definition of personal
-- data, which is why Aktivbruk needs no cookie banner.
--
-- Run in Supabase -> SQL Editor.

CREATE TABLE IF NOT EXISTS public.pageviews (
  id            bigserial PRIMARY KEY,
  path          text NOT NULL,
  referrer_host text,
  session_id    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pageviews_created_at_idx ON public.pageviews (created_at DESC);
CREATE INDEX IF NOT EXISTS pageviews_session_idx    ON public.pageviews (session_id);

-- RLS on with no policies at all: nothing reaches this table except the
-- service role, which is the /api/track route writing and /admin reading.
-- Visitors can never read it back, and neither can logged-in users.
ALTER TABLE public.pageviews ENABLE ROW LEVEL SECURITY;
