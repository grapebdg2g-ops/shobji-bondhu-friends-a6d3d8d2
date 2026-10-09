CREATE OR REPLACE FUNCTION public.add_group_members(_group_id uuid, _member_ids uuid[])
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m uuid; me uuid := auth.uid(); n integer := 0; gname text;
BEGIN
  IF NOT public.is_group_member(_group_id, me) THEN RAISE EXCEPTION 'only group members'; END IF;
  SELECT name INTO gname FROM public.group_chats WHERE id = _group_id;
  FOREACH m IN ARRAY coalesce(_member_ids, '{}'::uuid[]) LOOP
    IF m <> me AND public.are_friends(me, m) AND NOT public.is_group_member(_group_id, m) THEN
      INSERT INTO public.group_chat_members(group_id, user_id) VALUES (_group_id, m);
      INSERT INTO public.notifications(user_id, type, title, body, ref_id, ref_type)
        VALUES (m, 'group_added', 'নতুন গ্রুপ চ্যাট', 'আপনাকে "' || gname || '" গ্রুপে যুক্ত করা হয়েছে', _group_id, 'group_chat');
      n := n + 1;
    END IF;
  END LOOP;
  RETURN n;
END $$;