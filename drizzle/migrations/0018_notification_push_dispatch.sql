ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS pushed_at timestamptz;
UPDATE public.notifications SET pushed_at = now() WHERE pushed_at IS NULL;
CREATE INDEX IF NOT EXISTS notifications_unpushed_idx ON public.notifications (created_at) WHERE pushed_at IS NULL;
CREATE OR REPLACE FUNCTION public.notify_push_dispatch() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  BEGIN
    PERFORM public.invoke_cron_hook('push-notifications');
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN NULL;
END $$;
REVOKE EXECUTE ON FUNCTION public.notify_push_dispatch() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS notifications_push_dispatch ON public.notifications;
CREATE TRIGGER notifications_push_dispatch AFTER INSERT ON public.notifications
FOR EACH STATEMENT EXECUTE FUNCTION public.notify_push_dispatch();