CREATE TABLE public.crop_plan_finances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  plan_id uuid NOT NULL REFERENCES public.user_crop_plans(id) ON DELETE CASCADE,
  entry_type text NOT NULL CHECK (entry_type IN ('capital','expense','income')),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 80),
  amount numeric NOT NULL DEFAULT 0 CHECK (amount >= 0 AND amount < 1000000000),
  entry_date date NOT NULL DEFAULT current_date,
  note text CHECK (note IS NULL OR char_length(note) <= 300),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX crop_plan_finances_plan_idx ON public.crop_plan_finances(plan_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crop_plan_finances TO authenticated;
GRANT ALL ON public.crop_plan_finances TO service_role;
ALTER TABLE public.crop_plan_finances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own finances" ON public.crop_plan_finances FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.user_crop_plans p WHERE p.id = plan_id AND p.user_id = auth.uid()));