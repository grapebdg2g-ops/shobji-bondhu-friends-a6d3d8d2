import { createFileRoute } from "@tanstack/react-router";
import { isAuthorizedCronRequest, unauthorizedCronResponse } from "@/lib/cron-auth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { configureVapid, sendWebPush } from "@/lib/push.server";
import { FARMING_STAGES } from "@/data/farming-guide";

type Reminder = {
  id: string;
  user_id: string;
  crop_type: string;
  title: string;
  note: string | null;
  reminder_date: string;
};

type Subscription = {
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

function isAuthorized(request: Request) {
  return isAuthorizedCronRequest(request);
}

export const Route = createFileRoute("/api/public/hooks/crop-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isAuthorized(request)) return unauthorizedCronResponse();
        if (!configureVapid()) return Response.json({ ok: false, error: "VAPID keys not configured" }, { status: 500 });

        const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });
        // Only notify on the reminder's own date — past-date reminders are not re-sent daily.
        const { data: reminders, error } = await supabaseAdmin
          .from("crop_reminders")
          .select("id, user_id, crop_type, title, note, reminder_date")
          .eq("is_active", true)
          .eq("is_done", false)
          .eq("reminder_date", today)
          .or(`last_notified_date.is.null,last_notified_date.lt.${today}`)
          .limit(500);
        if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

        const rows = (reminders ?? []) as Reminder[];

        // Today's plan tasks (same logic as the crop diary "আজকের পরিকল্পনা").
        const { data: planRows } = await supabaseAdmin
          .from("user_crop_plans")
          .select("id, user_id, crop_type, planting_date")
          .eq("is_active", true)
          .limit(1000);
        const plans = (planRows ?? []) as { id: string; user_id: string; crop_type: string; planting_date: string }[];
        const { data: doneRows } = plans.length
          ? await supabaseAdmin.from("crop_task_completions").select("plan_id, task_id").in("plan_id", plans.map((p) => p.id))
          : { data: [] };
        const done = new Set(((doneRows ?? []) as { plan_id: string; task_id: string }[]).map((r) => `${r.plan_id}::${r.task_id}`));
        const startOfDhakaDay = new Date(`${today}T00:00:00+06:00`).toISOString();
        const { data: sentRows } = plans.length
          ? await supabaseAdmin
              .from("notifications")
              .select("ref_id")
              .eq("ref_type", "crop_plan_task")
              .gte("created_at", startOfDhakaDay)
              .in("ref_id", plans.map((p) => p.id))
          : { data: [] };
        const alreadySent = new Set(((sentRows ?? []) as { ref_id: string }[]).map((r) => r.ref_id));
        const planTasks: { user_id: string; plan_id: string; crop: string; titles: string[] }[] = [];
        for (const plan of plans) {
          if (alreadySent.has(plan.id)) continue;
          const guide = FARMING_STAGES[plan.crop_type];
          if (!guide) continue;
          const days = Math.max(0, Math.floor((Date.now() - new Date(plan.planting_date).getTime()) / 86400000));
          const stage = guide.stages.find((s) => days >= s.startDay && days < s.endDay) ?? guide.stages[guide.stages.length - 1];
          if (!stage) continue;
          const titles = stage.tasks
            .slice(0, 2)
            .filter((_, i) => !done.has(`${plan.id}::${stage.id}::${i}`))
            .map((t) => t.title);
          if (titles.length) planTasks.push({ user_id: plan.user_id, plan_id: plan.id, crop: plan.crop_type, titles });
        }

        if (rows.length === 0 && planTasks.length === 0) return Response.json({ ok: true, due: 0, delivered: 0 });

        const userIds = Array.from(new Set([...rows.map((r) => r.user_id), ...planTasks.map((p) => p.user_id)]));
        const { data: subscriptions, error: subscriptionError } = await supabaseAdmin
          .from("push_subscriptions")
          .select("user_id, endpoint, p256dh, auth")
          .in("user_id", userIds);
        if (subscriptionError) return Response.json({ ok: false, error: subscriptionError.message }, { status: 500 });

        const subsByUser = new Map<string, Subscription[]>();
        for (const sub of (subscriptions ?? []) as Subscription[]) {
          const list = subsByUser.get(sub.user_id) ?? [];
          list.push(sub);
          subsByUser.set(sub.user_id, list);
        }

        let delivered = 0;
        let notifications = 0;
        for (const reminder of rows) {
          const body = reminder.note ? `${reminder.crop_type} · ${reminder.note}` : `${reminder.crop_type} · আজকের কাজটি মনে রাখুন`;
          const { error: notificationError } = await supabaseAdmin.from("notifications").insert({
            user_id: reminder.user_id,
            type: "crop_reminder",
            title: reminder.title,
            body,
            ref_id: reminder.id,
            ref_type: "crop_reminder",
          });
          if (!notificationError) notifications += 1;

          const payload = {
            title: `🌱 ${reminder.title}`,
            body,
            type: "crop_reminder",
            tag: `crop-reminder-${reminder.id}`,
            severity: "normal",
            url: "/crop-diary",
          };
          const results = await Promise.all((subsByUser.get(reminder.user_id) ?? []).map((sub) => sendWebPush(sub, payload)));
          delivered += results.filter((result) => result.ok).length;

          await supabaseAdmin.from("crop_reminders").update({ last_notified_date: today }).eq("id", reminder.id);
        }

        for (const task of planTasks) {
          const title = `আজকের পরিকল্পনা: ${task.crop}`;
          const body = task.titles.join(" · ");
          const { error: notificationError } = await supabaseAdmin.from("notifications").insert({
            user_id: task.user_id,
            type: "crop_reminder",
            title,
            body,
            ref_id: task.plan_id,
            ref_type: "crop_plan_task",
          });
          if (!notificationError) notifications += 1;
          const payload = { title: `🌾 ${title}`, body, type: "crop_reminder", tag: `crop-plan-${task.plan_id}`, severity: "normal", url: "/crop-diary" };
          const results = await Promise.all((subsByUser.get(task.user_id) ?? []).map((sub) => sendWebPush(sub, payload)));
          delivered += results.filter((result) => result.ok).length;
        }

        return Response.json({ ok: true, due: rows.length, plan_tasks: planTasks.length, notifications, delivered, ran_at: new Date().toISOString() });
      },
      GET: async () => Response.json({ ok: true, hint: "POST to deliver due crop reminders" }),
    },
  },
});
