DROP POLICY IF EXISTS "Signed-in users can read likes" ON public.post_likes;
CREATE POLICY "Active members can read likes" ON public.post_likes FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_active_user(auth.uid()));

DROP POLICY IF EXISTS "Signed-in users can read comments" ON public.post_comments;
CREATE POLICY "Active members can read comments" ON public.post_comments FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_active_user(auth.uid()));

DROP POLICY IF EXISTS "Signed-in users can read reactions" ON public.post_reactions;
CREATE POLICY "Active members can read reactions" ON public.post_reactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_active_user(auth.uid()));

DROP POLICY IF EXISTS "Signed-in users can read predictions" ON public.price_predictions;
CREATE POLICY "Users read own predictions, admins read all" ON public.price_predictions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));