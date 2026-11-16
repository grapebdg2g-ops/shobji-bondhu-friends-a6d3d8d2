import { createFileRoute } from "@tanstack/react-router";
import { isAuthorizedCronRequest, unauthorizedCronResponse } from "@/lib/cron-auth.server";
import { configureVapid, sendWebPush } from "@/lib/push.server";
import { dispatchPendingPushes, PUSH_PAGE_SIZE } from "@/lib/push-dispatch";
import type { Database } from "@/integrations/supabase/types";

type PushNotification = Pick<Database["public"]["Tables"]["notifications"]["Row"],
  "id" | "user_id" | "type" | "title" | "body" | "ref_id" | "ref_type" | "created_at">;
type PushSubscription = Pick<Database["public"]["Tables"]["push_subscriptions"]["Row"],
  "user_id" | "endpoint" | "p256dh" | "auth">;

function urlFor(n: { type: string; ref_type: string | null; ref_id: string | null }) {
  if (n.type === "crop_reminder") return "/crop-diary";
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
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const startedAt = new Date().toISOString();
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        try {
          const result = await dispatchPendingPushes<PushNotification, PushSubscription>({
            loadPage: async (cursor) => {
              let query = supabaseAdmin.from("notifications")
                .select("id, user_id, type, title, body, ref_id, ref_type, created_at")
                .is("pushed_at", null)
                // Filter before the limit, not afterwards. These senders own delivery.
                .neq("type", "group_message")
                .not("type", "like", "weather_%")
                .gte("created_at", since).lte("created_at", startedAt)
                // Fresh alerts first, then traverse retained failures without offset skips.
                .order("created_at", { ascending: false })
                .order("id", { ascending: false })
                .limit(PUSH_PAGE_SIZE);
              if (cursor) query = query.or(
                `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`,
              );
              const { data, error } = await query;
              if (error) throw new Error("Notification lookup failed");
              return data ?? [];
            },
            loadSubscriptions: async (userIds) => {
              // Paginate subscriptions too: the API's row cap is not a device limit.
              const subscriptions: PushSubscription[] = [];
              for (let offset = 0; ; offset += PUSH_PAGE_SIZE) {
                const { data, error } = await supabaseAdmin.from("push_subscriptions")
                  .select("user_id, endpoint, p256dh, auth").in("user_id", userIds)
                  .order("endpoint").range(offset, offset + PUSH_PAGE_SIZE - 1);
                if (error) throw new Error("Subscription lookup failed");
                subscriptions.push(...(data ?? []));
                if (!data || data.length < PUSH_PAGE_SIZE) break;
              }
              return subscriptions;
            },
            send: (n, s) => sendWebPush(s, {
                title: n.title,
                body: n.body,
                type: n.type,
                tag: `n-${n.id}`,
                url: urlFor(n),
                severity: n.type === "ipm_weather" ? "high" : "normal",
            }),
            markDelivered: async (n) => {
              const { error } = await supabaseAdmin.from("notifications")
                .update({ pushed_at: new Date().toISOString() }).eq("id", n.id);
              if (error) throw new Error("Delivery receipt failed");
            },
          });
          return Response.json({ ok: true, ...result });
        } catch {
          return Response.json({ ok: false, error: "Push dispatch failed; pending alerts retained" }, { status: 500 });
        }
      },
    },
  },
});
