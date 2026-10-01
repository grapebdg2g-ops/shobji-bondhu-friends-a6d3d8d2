CREATE TABLE public.profile_details (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  address_line text,
  village text,
  post_office text,
  postcode text,
  courier_phone text,
  onboarding_completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profile_details TO authenticated;
GRANT ALL ON public.profile_details TO service_role;
ALTER TABLE public.profile_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own details select" ON public.profile_details FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own details insert" ON public.profile_details FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own details update" ON public.profile_details FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.suggest_farmers_by_crops(_limit int DEFAULT 20)
RETURNS TABLE(id uuid, name text, district text, upazila text, avatar_url text, crops text[], common_crops text[], is_verified boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH me AS (SELECT p.crops, p.district FROM public.profiles p WHERE p.id = auth.uid())
  SELECT p.id, p.name, p.district, p.upazila, p.avatar_url, p.crops,
         ARRAY(SELECT unnest(p.crops) INTERSECT SELECT unnest(me.crops)) AS common_crops,
         p.is_verified
  FROM public.profiles p, me
  WHERE auth.uid() IS NOT NULL
    AND p.id <> auth.uid()
    AND COALESCE(p.is_suspended, false) = false
    AND p.crops && me.crops
    AND NOT EXISTS (
      SELECT 1 FROM public.connections c
      WHERE (c.requester_id = auth.uid() AND c.addressee_id = p.id)
         OR (c.addressee_id = auth.uid() AND c.requester_id = p.id)
    )
  ORDER BY cardinality(ARRAY(SELECT unnest(p.crops) INTERSECT SELECT unnest(me.crops))) DESC,
           (p.district = me.district) DESC NULLS LAST, p.last_active DESC NULLS LAST
  LIMIT LEAST(GREATEST(_limit, 1), 50);
$$;
REVOKE EXECUTE ON FUNCTION public.suggest_farmers_by_crops(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.suggest_farmers_by_crops(int) TO authenticated;