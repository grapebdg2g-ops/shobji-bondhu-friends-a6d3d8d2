ALTER TABLE public.user_crop_plans ADD COLUMN IF NOT EXISTS variety text;

CREATE TABLE public.spray_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  plan_id uuid NOT NULL REFERENCES public.user_crop_plans(id) ON DELETE CASCADE,
  event_id text,
  product text NOT NULL,
  dose text,
  shotok numeric,
  sprayed_on date NOT NULL DEFAULT current_date,
  phi_days integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.spray_logs TO authenticated;
GRANT ALL ON public.spray_logs TO service_role;
ALTER TABLE public.spray_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own spray logs" ON public.spray_logs FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX spray_logs_plan_idx ON public.spray_logs(plan_id, sprayed_on DESC);