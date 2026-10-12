GRANT SELECT ON public.govt_prices TO anon;
CREATE POLICY "Public can read government market prices" ON public.govt_prices FOR SELECT TO anon USING (true);
GRANT SELECT ON public.prices TO anon;