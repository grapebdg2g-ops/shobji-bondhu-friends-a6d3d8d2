CREATE OR REPLACE FUNCTION public.unfriend_connection(connection_id uuid)
 RETURNS connections
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  updated public.connections;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Login required';
  END IF;

  UPDATE public.connections
  SET status = 'cancelled', updated_at = now()
  WHERE id = connection_id
    AND (requester_id = auth.uid() OR addressee_id = auth.uid())
    AND status = 'accepted'
  RETURNING * INTO updated;

  IF updated.id IS NULL THEN
    RAISE EXCEPTION 'Connection not found';
  END IF;

  RETURN updated;
END;
$function$;