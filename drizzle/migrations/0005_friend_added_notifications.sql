CREATE OR REPLACE FUNCTION public.notify_connection_accepted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE req_name text; add_name text;
BEGIN
  IF NEW.status = 'accepted' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'accepted') THEN
    SELECT COALESCE(name,'একজন কৃষক') INTO req_name FROM public.profiles WHERE id = NEW.requester_id;
    SELECT COALESCE(name,'একজন কৃষক') INTO add_name FROM public.profiles WHERE id = NEW.addressee_id;
    INSERT INTO public.notifications (user_id, type, title, body, ref_id, ref_type) VALUES
      (NEW.requester_id, 'friend_added', 'নতুন বন্ধু যোগ হয়েছে', COALESCE(add_name,'একজন কৃষক') || ' এখন আপনার বন্ধু', NEW.addressee_id, 'friend'),
      (NEW.addressee_id, 'friend_added', 'নতুন বন্ধু যোগ হয়েছে', COALESCE(req_name,'একজন কৃষক') || ' এখন আপনার বন্ধু', NEW.requester_id, 'friend');
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.notify_connection_accepted() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS connections_notify_accepted ON public.connections;
CREATE TRIGGER connections_notify_accepted AFTER INSERT OR UPDATE OF status ON public.connections
FOR EACH ROW EXECUTE FUNCTION public.notify_connection_accepted();

CREATE OR REPLACE FUNCTION public.respond_connection(connection_id uuid, next_status text)
RETURNS public.connections LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE current_user_id uuid := auth.uid(); updated public.connections; responder_name text;
BEGIN
  IF current_user_id IS NULL THEN RAISE EXCEPTION 'Login required'; END IF;
  IF next_status NOT IN ('accepted','declined') THEN RAISE EXCEPTION 'Invalid connection status'; END IF;
  UPDATE public.connections SET status = next_status, updated_at = now()
  WHERE id = connection_id AND addressee_id = current_user_id AND status = 'pending'
  RETURNING * INTO updated;
  IF updated.id IS NULL THEN RAISE EXCEPTION 'Connection request not found'; END IF;
  IF next_status = 'declined' THEN
    SELECT COALESCE(name,'একজন কৃষক') INTO responder_name FROM public.profiles WHERE id = current_user_id;
    INSERT INTO public.notifications (user_id, type, title, body, ref_id, ref_type)
    VALUES (updated.requester_id, 'connection_response', 'সংযোগ অনুরোধ প্রত্যাখ্যান করা হয়েছে',
      COALESCE(responder_name,'একজন কৃষক') || ' আপনার সংযোগ অনুরোধ গ্রহণ করেননি', updated.id, 'connection');
  END IF;
  RETURN updated;
END $$;