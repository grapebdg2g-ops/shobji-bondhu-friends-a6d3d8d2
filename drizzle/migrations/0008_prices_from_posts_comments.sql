ALTER TABLE public.prices
  ADD COLUMN IF NOT EXISTS origin_type text,
  ADD COLUMN IF NOT EXISTS origin_id uuid;
ALTER TABLE public.prices DROP CONSTRAINT IF EXISTS prices_origin_type_check;
ALTER TABLE public.prices ADD CONSTRAINT prices_origin_type_check CHECK (origin_type IS NULL OR origin_type IN ('post','comment'));
CREATE UNIQUE INDEX IF NOT EXISTS prices_origin_unique ON public.prices (origin_type, origin_id, product_name, price_type) WHERE origin_id IS NOT NULL;