CREATE TABLE public.soil_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  health_score INT,
  area_label TEXT,
  result_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.soil_reports TO authenticated;
GRANT ALL ON public.soil_reports TO service_role;

ALTER TABLE public.soil_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own soil reports"
  ON public.soil_reports FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own soil reports"
  ON public.soil_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own soil reports"
  ON public.soil_reports FOR DELETE TO authenticated
  USING (auth.uid() = user_id);