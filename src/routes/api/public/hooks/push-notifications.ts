import { createFileRoute } from "@tanstack/react-router";
import { isAuthorizedCronRequest, unauthorizedCronResponse } from "@/lib/cron-auth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { configureVapid, sendWebPush } from "@/lib/push.server";

// Types already pushed directly by their own senders.
const ALREADY_PUSHED = (t: string) =>
  t === "crop_reminder" || t === "group_message" || (t.startsWith("weather_") && t !== "ipm_weather");

function urlFor(n: { type: string; ref_type: string | null; ref_id: string | null }) {
  if (n.type === "message" && n.ref_id) return `/messages/${n.ref_id}`;
  if (n.ref_type === "group_chat" && n.ref_id) return `/groups/${n.ref_id}`;
  if (n.ref_type === "connection") return "/connections";
  if (n.ref_type === "friend" && n.ref_id) return `/u/${n.ref_id}`;
  if (n.ref_type === "post") return "/feed";
  if (n.ref_type === "price") return "/prices";
  if (n.ref_type === "weather") return "/weather";
  return "/notifications";
}

export const Route = createFileRoute("/api/public/hooks/push-notifications")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isAuthorizedCronRequest(request)) return unauthorizedCronResponse();
        if (!configureVapid()) return Response.json({ ok: false, error: "VAPID missing" }, { status: 500 });
        const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { data: rows } = await supabaseAdmin
          .from("notifications")
          .select("id, user_id, type, title, body, ref_id, ref_type")
          .is("pushed_at", null)
          .gte("created_at", since)
          .order("created_at")
          .limit(200);
        const list = rows ?? [];
        if (!list.length) return Response.json({ ok: true, sent: 0 });
        await supabaseAdmin
          .from("notifications")
          .update({ pushed_at: new Date().toISOString() })
          .in("id", list.map((n) => n.id));
        const todo = list.filter((n) => !ALREADY_PUSHED(n.type));
        const userIds = Array.from(new Set(todo.map((n) => n.user_id)));
        if (!userIds.length) return Response.json({ ok: true, sent: 0 });
        const { data: subs } = await supabaseAdmin
          .from("push_subscriptions")
          .select("user_id, endpoint, p256dh, auth")
          .in("user_id", userIds);
        let sent = 0;
        for (const n of todo) {
          const mine = (subs ?? []).filter((s) => s.user_id === n.user_id);
          const results = await Promise.all(
            mine.map((s) =>
              sendWebPush(s, {
                title: n.title,
                body: n.body,
                type: n.type,
                tag: `n-${n.id}`,
                url: urlFor(n),
                severity: n.type === "ipm_weather" ? "high" : "normal",
              }),
            ),
          );
          sent += results.filter((r) => r.ok).length;
        }
        return Response.json({ ok: true, sent });
      },
    },
  },
});
