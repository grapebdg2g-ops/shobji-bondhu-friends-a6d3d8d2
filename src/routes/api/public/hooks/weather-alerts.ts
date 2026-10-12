import { createFileRoute } from "@tanstack/react-router";
import { isAuthorizedCronRequest, unauthorizedCronResponse } from "@/lib/cron-auth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { configureVapid, sendWebPush } from "@/lib/push.server";
import { getDistrictUpazilaLatLng } from "@/lib/bd-data";
import { fetchForecast, evaluateAlert, type WeatherAlert } from "@/lib/weather.server";
import { ipmWeatherAlerts } from "@/lib/ipm-weather";

const MAX_PER_USER_PER_DAY = 3;

/** Crop-specific IPM warnings for farmers in this area with active plans (once per crop per day). */
async function sendIpmAlerts(
  district: string,
  upazila: string | null,
  forecast: Awaited<ReturnType<typeof fetchForecast>>,
) {
  let subQ = supabaseAdmin.from("push_subscriptions").select("user_id").eq("district", district);
  subQ = upazila ? subQ.eq("upazila", upazila) : subQ.is("upazila", null);
  const { data: subs } = await subQ;
  const userIds = Array.from(new Set((subs ?? []).map((s) => s.user_id)));
  if (!userIds.length) return 0;
  const since = new Date(Date.now() - 200 * 86400000).toISOString().slice(0, 10);
  const { data: plans } = await supabaseAdmin
    .from("user_crop_plans")
    .select("user_id, crop_type")
    .in("user_id", userIds)
    .gte("planting_date", since);
  const alerts = ipmWeatherAlerts(forecast, (plans ?? []).map((p) => p.crop_type));
  let sent = 0;
  for (const a of alerts) {
    const { error } = await supabaseAdmin
      .from("weather_alerts_sent")
      .insert({ district, upazila, alert_type: `IPM_${a.crop}` });
    if (error) continue; // already sent today
    const users = Array.from(
      new Set((plans ?? []).filter((p) => p.crop_type === a.crop).map((p) => p.user_id)),
    );
    if (!users.length) continue;
    await supabaseAdmin.from("notifications").insert(
      users.map((uid) => ({
        user_id: uid,
        type: "ipm_weather",
        title: a.title,
        body: a.body,
        ref_type: "weather",
      })),
    );
    sent += users.length;
  }
  return sent;
}

async function processLocation(district: string, upazila: string | null) {
  const [lat, lng] = getDistrictUpazilaLatLng(district, upazila);
  let forecast;
  try {
    forecast = await fetchForecast(lat, lng);
  } catch (err) {
    console.error(`[weather-alerts] forecast failed for ${district}/${upazila ?? "-"}`, err);
    return { district, upazila, skipped: true, reason: "forecast_error" };
  }
  const locLabel = upazila ? `${upazila}, ${district}` : district;
  const ipmSent = await sendIpmAlerts(district, upazila, forecast);
  const alert = evaluateAlert(locLabel, forecast);
  if (!alert) return { district, upazila, skipped: true, reason: "no_alert", ipmSent };

  // Dedupe per (district, upazila, alert_type, day)
  const { error: dedupeErr } = await supabaseAdmin
    .from("weather_alerts_sent")
    .insert({ district, upazila, alert_type: alert.type });
  if (dedupeErr) {
    if (dedupeErr.code === "23505")
      return { district, upazila, skipped: true, reason: "already_sent" };
    console.error("[weather-alerts] dedupe insert error", dedupeErr);
    return { district, upazila, skipped: true, reason: "db_error" };
  }

  // Fetch subscriptions for this (district, upazila) pair
  let subQ = supabaseAdmin
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth")
    .eq("district", district);
  subQ = upazila ? subQ.eq("upazila", upazila) : subQ.is("upazila", null);
  const { data: subs } = await subQ;

  if (!subs || subs.length === 0) return { district, upazila, alert: alert.type, recipients: 0 };

  // Group by user_id for per-user cap check
  const userIds = Array.from(new Set(subs.map((s) => s.user_id)));
  const todayStartUtc = new Date();
  todayStartUtc.setUTCHours(0, 0, 0, 0); // approx; cap is fuzzy by design
  const { data: recentCounts } = await supabaseAdmin
    .from("notifications")
    .select("user_id")
    .in("user_id", userIds)
    .like("type", "weather_%")
    .gte("created_at", todayStartUtc.toISOString());
  const countByUser = new Map<string, number>();
  (recentCounts ?? []).forEach((r: { user_id: string }) => {
    countByUser.set(r.user_id, (countByUser.get(r.user_id) ?? 0) + 1);
  });

  const allowedUserIds = userIds.filter(
    (uid) => (countByUser.get(uid) ?? 0) < MAX_PER_USER_PER_DAY,
  );

  // Insert in-app notifications (one per user)
  if (allowedUserIds.length > 0) {
    await supabaseAdmin.from("notifications").insert(
      allowedUserIds.map((uid) => ({
        user_id: uid,
        type: `weather_${alert.type.toLowerCase()}`,
        title: alert.title,
        body: alert.body,
        ref_type: "weather",
      })),
    );
  }

  // Send push to each subscription belonging to an allowed user
  const pushPayload = {
    title: alert.title,
    body: alert.body,
    type: alert.type,
    severity: alert.severity,
    url: "/weather",
  };
  const sends = subs
    .filter((s) => allowedUserIds.includes(s.user_id))
    .map((s) => sendWebPush(s, pushPayload));
  const results = await Promise.all(sends);
  const delivered = results.filter((r) => r.ok).length;

  return { district, upazila, alert: alert.type, recipients: allowedUserIds.length, delivered };
}

export const Route = createFileRoute("/api/public/hooks/weather-alerts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isAuthorizedCronRequest(request)) return unauthorizedCronResponse();
        if (!configureVapid()) {
          return Response.json({ ok: false, error: "VAPID keys not configured" }, { status: 500 });
        }

        // Get distinct (district, upazila) pairs with subscribers
        const { data: rows, error } = await supabaseAdmin
          .from("push_subscriptions")
          .select("district, upazila")
          .not("district", "is", null);
        if (error) {
          return Response.json({ ok: false, error: error.message }, { status: 500 });
        }
        const seen = new Set<string>();
        const pairs: { district: string; upazila: string | null }[] = [];
        for (const r of (rows ?? []) as { district: string | null; upazila: string | null }[]) {
          if (!r.district) continue;
          const key = `${r.district}::${r.upazila ?? ""}`;
          if (seen.has(key)) continue;
          seen.add(key);
          pairs.push({ district: r.district, upazila: r.upazila ?? null });
        }

        const results: Array<Record<string, unknown>> = [];
        for (const p of pairs) {
          // Sequential to avoid hammering Open-Meteo
          results.push(await processLocation(p.district, p.upazila));
        }

        return Response.json({
          ok: true,
          ran_at: new Date().toISOString(),
          districts_processed: pairs.length,
          results,
        });
      },
      GET: async () => Response.json({ ok: true, hint: "POST to run; scheduled via pg_cron" }),
    },
  },
});
