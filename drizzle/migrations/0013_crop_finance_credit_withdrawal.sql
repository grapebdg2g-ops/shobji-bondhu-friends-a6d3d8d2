ALTER TABLE public.crop_plan_finances DROP CONSTRAINT crop_plan_finances_entry_type_check;
ALTER TABLE public.crop_plan_finances ADD CONSTRAINT crop_plan_finances_entry_type_check CHECK (entry_type = ANY (ARRAY['capital','expense','income','withdrawal','credit_purchase','credit_sale']));
ALTER TABLE public.crop_plan_finances ADD COLUMN IF NOT EXISTS is_settled boolean NOT NULL DEFAULT false;
ALTER TABLE public.user_crop_plans ADD COLUMN IF NOT EXISTS land_shotok numeric CHECK (land_shotok IS NULL OR (land_shotok > 0 AND land_shotok < 100000));
ALTER TABLE public.user_crop_plans ADD COLUMN IF NOT EXISTS yield_kg numeric CHECK (yield_kg IS NULL OR (yield_kg > 0 AND yield_kg < 100000000));