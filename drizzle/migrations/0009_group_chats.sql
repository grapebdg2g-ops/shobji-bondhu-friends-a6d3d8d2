CREATE TABLE public.group_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 60),
  topic text CHECK (topic IS NULL OR char_length(topic) <= 300),
  creator_id uuid NOT NULL,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.group_chat_members (
  group_id uuid NOT NULL REFERENCES public.group_chats(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member')),
  last_read_at timestamptz NOT NULL DEFAULT now(),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);
CREATE INDEX group_chat_members_user_idx ON public.group_chat_members(user_id);
CREATE TABLE public.group_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.group_chats(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  body text NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX group_chat_messages_group_idx ON public.group_chat_messages(group_id, created_at DESC);

GRANT SELECT, DELETE ON public.group_chats TO authenticated;
GRANT SELECT ON public.group_chat_members TO authenticated;
GRANT SELECT, INSERT ON public.group_chat_messages TO authenticated;
GRANT ALL ON public.group_chats, public.group_chat_members, public.group_chat_messages TO service_role;

ALTER TABLE public.group_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_group_member(_group_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.group_chat_members WHERE group_id = _group_id AND user_id = _user_id)
$$;
CREATE OR REPLACE FUNCTION public.is_group_admin(_group_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.group_chat_members WHERE group_id = _group_id AND user_id = _user_id AND role = 'admin')
$$;

CREATE POLICY "Members or app admins view groups" ON public.group_chats FOR SELECT TO authenticated
  USING (public.is_group_member(id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Group admin or app admin delete group" ON public.group_chats FOR DELETE TO authenticated
  USING (public.is_group_admin(id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Members or app admins view members" ON public.group_chat_members FOR SELECT TO authenticated
  USING (public.is_group_member(group_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Members or app admins view messages" ON public.group_chat_messages FOR SELECT TO authenticated
  USING (public.is_group_member(group_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Members send messages" ON public.group_chat_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.is_group_member(group_id, auth.uid()) AND public.is_active_user(auth.uid()));

CREATE OR REPLACE FUNCTION public.are_friends(_a uuid, _b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.connections WHERE status = 'accepted'
    AND ((requester_id = _a AND addressee_id = _b) OR (requester_id = _b AND addressee_id = _a)))
$$;

CREATE OR REPLACE FUNCTION public.create_group_chat(_name text, _topic text, _member_ids uuid[])
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE gid uuid; m uuid; me uuid := auth.uid();
BEGIN
  IF me IS NULL OR NOT public.is_active_user(me) THEN RAISE EXCEPTION 'not allowed'; END IF;
  INSERT INTO public.group_chats(name, topic, creator_id) VALUES (trim(_name), nullif(trim(coalesce(_topic,'')),''), me) RETURNING id INTO gid;
  INSERT INTO public.group_chat_members(group_id, user_id, role) VALUES (gid, me, 'admin');
  FOREACH m IN ARRAY coalesce(_member_ids, '{}'::uuid[]) LOOP
    IF m <> me AND public.are_friends(me, m) THEN
      INSERT INTO public.group_chat_members(group_id, user_id) VALUES (gid, m) ON CONFLICT DO NOTHING;
      INSERT INTO public.notifications(user_id, type, title, body, ref_id, ref_type)
        VALUES (m, 'group_added', 'নতুন গ্রুপ চ্যাট', 'আপনাকে "' || trim(_name) || '" গ্রুপে যুক্ত করা হয়েছে', gid, 'group_chat');
    END IF;
  END LOOP;
  RETURN gid;
END $$;

CREATE OR REPLACE FUNCTION public.add_group_members(_group_id uuid, _member_ids uuid[])
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m uuid; me uuid := auth.uid(); n integer := 0; gname text;
BEGIN
  IF NOT public.is_group_admin(_group_id, me) THEN RAISE EXCEPTION 'only group admin'; END IF;
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

CREATE OR REPLACE FUNCTION public.remove_group_member(_group_id uuid, _user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _user_id = auth.uid() THEN
    IF public.is_group_admin(_group_id, auth.uid()) THEN RAISE EXCEPTION 'admin cannot leave; delete group instead'; END IF;
  ELSIF NOT public.is_group_admin(_group_id, auth.uid()) THEN
    RAISE EXCEPTION 'only group admin';
  END IF;
  DELETE FROM public.group_chat_members WHERE group_id = _group_id AND user_id = _user_id AND role <> 'admin';
END $$;

CREATE OR REPLACE FUNCTION public.mark_group_read(_group_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.group_chat_members SET last_read_at = now() WHERE group_id = _group_id AND user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_group_threads()
RETURNS TABLE(group_id uuid, name text, topic text, my_role text, member_count bigint, last_body text, last_sender_name text, last_message_at timestamptz, unread_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT g.id, g.name, g.topic, me.role,
    (SELECT count(*) FROM public.group_chat_members x WHERE x.group_id = g.id),
    lm.body, lp.name, g.last_message_at,
    (SELECT count(*) FROM public.group_chat_messages c WHERE c.group_id = g.id AND c.created_at > me.last_read_at AND c.sender_id <> auth.uid())
  FROM public.group_chat_members me
  JOIN public.group_chats g ON g.id = me.group_id
  LEFT JOIN LATERAL (SELECT body, sender_id FROM public.group_chat_messages c WHERE c.group_id = g.id ORDER BY created_at DESC LIMIT 1) lm ON true
  LEFT JOIN public.profiles lp ON lp.id = lm.sender_id
  WHERE me.user_id = auth.uid()
  ORDER BY g.last_message_at DESC
$$;

CREATE OR REPLACE FUNCTION public.on_group_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE gname text; sname text;
BEGIN
  UPDATE public.group_chats SET last_message_at = NEW.created_at WHERE id = NEW.group_id RETURNING name INTO gname;
  UPDATE public.group_chat_members SET last_read_at = NEW.created_at WHERE group_id = NEW.group_id AND user_id = NEW.sender_id;
  SELECT name INTO sname FROM public.profiles WHERE id = NEW.sender_id;
  INSERT INTO public.notifications(user_id, type, title, body, ref_id, ref_type)
    SELECT m.user_id, 'group_message', gname, coalesce(sname,'কৃষক') || ': ' || left(NEW.body, 120), NEW.group_id, 'group_chat'
    FROM public.group_chat_members m WHERE m.group_id = NEW.group_id AND m.user_id <> NEW.sender_id;
  RETURN NEW;
END $$;
CREATE TRIGGER group_message_after_insert AFTER INSERT ON public.group_chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.on_group_message();

REVOKE EXECUTE ON FUNCTION public.on_group_message() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_group_chat(text,text,uuid[]), public.add_group_members(uuid,uuid[]), public.remove_group_member(uuid,uuid), public.mark_group_read(uuid), public.get_group_threads() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_group_chat(text,text,uuid[]), public.add_group_members(uuid,uuid[]), public.remove_group_member(uuid,uuid), public.mark_group_read(uuid), public.get_group_threads() TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.group_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_chat_members;