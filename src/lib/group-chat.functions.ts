import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Sends a phone push notification to the other group members for a new message. */
export const pushGroupMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ messageId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: msg } = await supabase
      .from("group_chat_messages")
      .select("id, group_id, sender_id, body")
      .eq("id", data.messageId)
      .maybeSingle();
    if (!msg || msg.sender_id !== userId) return { delivered: 0 };

    const { configureVapid, sendWebPush } = await import("./push.server");
    if (!configureVapid()) return { delivered: 0 };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: group }, { data: members }, { data: sender }] = await Promise.all([
      supabaseAdmin.from("group_chats").select("name").eq("id", msg.group_id).maybeSingle(),
      supabaseAdmin.from("group_chat_members").select("user_id").eq("group_id", msg.group_id).neq("user_id", userId),
      supabaseAdmin.from("profiles").select("name").eq("id", userId).maybeSingle(),
    ]);
    const ids = (members ?? []).map((m) => m.user_id);
    if (!ids.length) return { delivered: 0 };
    const { data: subs } = await supabaseAdmin
      .from("push_subscriptions")
      .select("user_id, endpoint, p256dh, auth")
      .in("user_id", ids);
    const payload = {
      title: group?.name ?? "গ্রুপ চ্যাট",
      body: `${sender?.name ?? "কৃষক"}: ${msg.body.slice(0, 120)}`,
      url: `/groups/${msg.group_id}`,
      tag: `group-${msg.group_id}`,
      type: "group_message",
    };
    const results = await Promise.all((subs ?? []).map((s) => sendWebPush(s, payload)));
    return { delivered: results.filter((r) => r.ok).length };
  });
