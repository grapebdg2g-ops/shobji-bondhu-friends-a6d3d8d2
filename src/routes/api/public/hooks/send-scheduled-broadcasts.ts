import { createFileRoute } from "@tanstack/react-router";
import { isAuthorizedCronRequest, unauthorizedCronResponse } from "@/lib/cron-auth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type Broadcast = {
  id: string;
  admin_id: string;
  title: string;
  body: string;
  link: string | null;
  icon: string | null;
  target_type: string;
  target_value: string | null;
};

async function resolveRecipients(b: Broadcast): Promise<string[]> {
  let q = supabaseAdmin.from("profiles").select("id");
  if (b.target_type === "district" && b.target_value) q = q.eq("district", b.target_value);
  else if (b.target_type === "upazila" && b.target_value) q = q.eq("upazila", b.target_value);
  else if (b.target_type === "crop" && b.target_value) q = q.contains("crops", [b.target_value]);
  else if (b.target_type === "pro") {
    const { data: subs } = await supabaseAdmin
      .from("pro_subscriptions")
      .select("user_id")
      .eq("status", "active");
    return (subs ?? []).map((s) => s.user_id as string);
  }
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map((u) => u.id as string);
}

export const Route = createFileRoute("/api/public/hooks/send-scheduled-broadcasts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isAuthorizedCronRequest(request)) return unauthorizedCronResponse();
        const nowIso = new Date().toISOString();
        const { data: due, error } = await supabaseAdmin
          .from("notification_broadcasts")
          .select("id, admin_id, title, body, link, icon, target_type, target_value")
          .is("sent_at", null)
          .not("scheduled_at", "is", null)
          .lte("scheduled_at", nowIso)
          .limit(50);
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }
        const results: Array<{ id: string; sent: number }> = [];
        for (const b of (due ?? []) as Broadcast[]) {
          try {
            const ids = await resolveRecipients(b);
            const rows = ids.map((uid) => ({
              user_id: uid,
              type: "broadcast",
              title: b.title,
              body: b.body,
              ref_type: "broadcast",
              ref_id: b.id,
            }));
            for (let i = 0; i < rows.length; i += 500) {
              const slice = rows.slice(i, i + 500);
              if (slice.length) await supabaseAdmin.from("notifications").insert(slice);
            }
            await supabaseAdmin
              .from("notification_broadcasts")
              .update({
                sent_at: new Date().toISOString(),
                sent_count: ids.length,
              })
              .eq("id", b.id);
            await supabaseAdmin.from("admin_actions").insert({
              admin_id: b.admin_id,
              action_type: "scheduled_broadcast_sent",
              target_id: b.id,
              details: { count: ids.length } as never,
            });
            results.push({ id: b.id, sent: ids.length });
          } catch (e) {
            console.error("broadcast failed", b.id, e);
          }
        }
        return new Response(JSON.stringify({ processed: results.length, results }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
