CREATE TABLE public.organic_guide_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_key text NOT NULL,
  title text NOT NULL,
  youtube_url text NOT NULL,
  source text NOT NULL DEFAULT 'YouTube',
  duration text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organic_guide_videos_guide_key_check CHECK (guide_key IN ('goborSar', 'compost', 'vermicompost', 'trichoCompost', 'greenManure', 'biopesticide')),
  CONSTRAINT organic_guide_videos_youtube_url_check CHECK (youtube_url ~* '^https://(www\.)?(youtube\.com/(watch\?v=|shorts/|embed/)|youtu\.be/)[A-Za-z0-9_-]+')
);

GRANT SELECT ON public.organic_guide_videos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organic_guide_videos TO authenticated;
GRANT ALL ON public.organic_guide_videos TO service_role;

ALTER TABLE public.organic_guide_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed in users can view active organic guide videos"
ON public.organic_guide_videos
FOR SELECT
TO authenticated
USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert organic guide videos"
ON public.organic_guide_videos
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update organic guide videos"
ON public.organic_guide_videos
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete organic guide videos"
ON public.organic_guide_videos
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX organic_guide_videos_lookup_idx
ON public.organic_guide_videos (guide_key, is_active, sort_order, created_at);

CREATE OR REPLACE FUNCTION public.set_organic_guide_video_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_organic_guide_video_updated_at() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_organic_guide_video_updated_at() TO service_role;

CREATE TRIGGER set_organic_guide_video_updated_at
BEFORE UPDATE ON public.organic_guide_videos
FOR EACH ROW
EXECUTE FUNCTION public.set_organic_guide_video_updated_at();