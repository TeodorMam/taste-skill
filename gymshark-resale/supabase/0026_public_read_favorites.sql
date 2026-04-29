-- 0026: Allow public read on favorites so item pages can show like counts + names.
-- "Kari Navnesen, Ola Nordmann og 7 andre liker denne annonsen"

DROP POLICY IF EXISTS "public read favorites" ON public.favorites;
CREATE POLICY "public read favorites" ON public.favorites
  FOR SELECT TO anon, authenticated
  USING (true);
