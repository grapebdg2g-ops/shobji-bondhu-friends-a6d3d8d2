-- GAP checklist upsert (on_conflict user_id,plan_id,task_id) failed with 42P10
-- because no matching unique constraint existed. Dedupe then add it.

DELETE FROM public.crop_task_completions a
USING public.crop_task_completions b
WHERE a.user_id = b.user_id
  AND a.plan_id = b.plan_id
  AND a.task_id = b.task_id
  AND a.id <> b.id
  AND a.completed_at > b.completed_at;

CREATE UNIQUE INDEX IF NOT EXISTS crop_task_completions_user_plan_task_key
ON public.crop_task_completions USING btree (user_id, plan_id, task_id);