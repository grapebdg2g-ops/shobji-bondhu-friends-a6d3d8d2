CREATE OR REPLACE FUNCTION public.sync_post_comment_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END $$;
REVOKE EXECUTE ON FUNCTION public.sync_post_comment_count() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_sync_post_comment_count ON public.post_comments;
CREATE TRIGGER trg_sync_post_comment_count AFTER INSERT OR DELETE ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.sync_post_comment_count();

DROP FUNCTION IF EXISTS public.increment_likes(uuid);
DROP FUNCTION IF EXISTS public.decrement_likes(uuid);
DROP FUNCTION IF EXISTS public.increment_comments(uuid);

CREATE OR REPLACE FUNCTION public.are_friends(_a uuid, _b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (auth.uid() IS NOT NULL AND auth.uid() IN (_a, _b)) AND EXISTS (
    SELECT 1 FROM public.connections WHERE status = 'accepted'
    AND ((requester_id = _a AND addressee_id = _b) OR (requester_id = _b AND addressee_id = _a)))
$$;
REVOKE EXECUTE ON FUNCTION public.are_friends(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.are_friends(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_public_connected_farmers(target_user_id uuid)
RETURNS TABLE(id uuid, name text, district text, upazila text, avatar_url text, bio text, crops text[], role text, is_verified boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.name, p.district, p.upazila, p.avatar_url, p.bio, p.crops, p.role, p.is_verified
  FROM public.connections c
  JOIN public.profiles p ON p.id = CASE WHEN c.requester_id = target_user_id THEN c.addressee_id ELSE c.requester_id END
  WHERE c.status = 'accepted'
    AND (c.requester_id = target_user_id OR c.addressee_id = target_user_id)
    AND auth.uid() IS NOT NULL
    AND (auth.uid() = target_user_id OR public.are_friends(auth.uid(), target_user_id))
  ORDER BY p.name NULLS LAST;
$$;
REVOKE EXECUTE ON FUNCTION public.get_public_connected_farmers(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_public_connected_farmers(uuid) TO authenticated;