CREATE TABLE public.ai_model_settings (
  feature_key text PRIMARY KEY,
  provider text NOT NULL DEFAULT 'torveai',
  model text NOT NULL,
  api_key_secret text NOT NULL DEFAULT 'TORVEAI_API_KEY',
  is_active boolean NOT NULL DEFAULT true,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ai_model_settings TO authenticated;
GRANT ALL ON public.ai_model_settings TO service_role;

ALTER TABLE public.ai_model_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read ai_model_settings"
ON public.ai_model_settings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.update_ai_model_setting(
  _feature_key text,
  _provider text,
  _model text,
  _api_key_secret text,
  _is_active boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  INSERT INTO public.ai_model_settings (feature_key, provider, model, api_key_secret, is_active, updated_by, updated_at)
  VALUES (_feature_key, _provider, _model, _api_key_secret, _is_active, auth.uid(), now())
  ON CONFLICT (feature_key) DO UPDATE
  SET provider = EXCLUDED.provider,
      model = EXCLUDED.model,
      api_key_secret = EXCLUDED.api_key_secret,
      is_active = EXCLUDED.is_active,
      updated_by = auth.uid(),
      updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.update_ai_model_setting(text, text, text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_ai_model_setting(text, text, text, text, boolean) TO authenticated;

INSERT INTO public.ai_model_settings (feature_key, provider, model, api_key_secret) VALUES
  ('disease_detection', 'torveai', 'claude-opus-5-5', 'TORVEAI_API_KEY'),
  ('ai_chat', 'gemini', 'gemini-2.5-flash', 'GEMINI_API_KEY'),
  ('chat_suggestions', 'gemini', 'gemini-2.5-flash', 'GEMINI_API_KEY'),
  ('price_extraction', 'gemini', 'gemini-2.5-flash', 'GEMINI_API_KEY'),
  ('price_prediction', 'gemini', 'gemini-2.5-flash', 'GEMINI_API_KEY'),
  ('soil_analysis', 'gemini', 'gemini-2.5-flash', 'GEMINI_API_KEY'),
  ('transcribe', 'gemini', 'gemini-2.5-flash', 'GEMINI_API_KEY');