import webpush from "web-push";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type StoredPushSubscription = {
  user_id?: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

let vapidConfigured = false;

export function configureVapid() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return false;
  if (!vapidConfigured) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    vapidConfigured = true;
  }
  return true;
}

export async function sendWebPush(subscription: StoredPushSubscription, payload: object) {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload),
    );
    return { ok: true as const };
  } catch (error: unknown) {
    const statusCode = (error as { statusCode?: number } | null)?.statusCode;
    if (statusCode === 404 || statusCode === 410) {
      await supabaseAdmin.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
    }
    return {
      ok: false as const,
      error: String((error as { message?: string } | null)?.message ?? error),
    };
  }
}
