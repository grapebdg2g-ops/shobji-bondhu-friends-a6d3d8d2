import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getDistrictUpazilaLatLng } from "@/lib/bd-data";
import { fetchForecast, type Forecast } from "@/lib/weather.server";

// Expose VAPID public key to client (publishable — designed for browsers)
export const getVapidPublicKey = createServerFn({ method: "GET" }).handler(async () => {
  return { publicKey: process.env.VAPID_PUBLIC_KEY ?? "" };
});

// Public-ish: takes a district (and optional upazila), returns forecast.
export const getWeatherForecast = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        district: z.string().min(1).max(100),
        upazila: z.string().min(1).max(100).nullable().optional(),
        lat: z.number().min(-90).max(90).nullable().optional(),
        lng: z.number().min(-180).max(180).nullable().optional(),
      })
      .parse(input),
  )
  .handler(
    async ({
      data,
    }): Promise<{
      district: string;
      upazila: string | null;
      forecast: Forecast | null;
      error: string | null;
    }> => {
      const [flat, flng] =
        typeof data.lat === "number" && typeof data.lng === "number"
          ? [data.lat, data.lng]
          : getDistrictUpazilaLatLng(data.district, data.upazila ?? null);
      try {
        const forecast = await fetchForecast(flat, flng);
        return { district: data.district, upazila: data.upazila ?? null, forecast, error: null };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "weather unavailable";
        console.warn("[weather] fetch failed:", msg);
        return {
          district: data.district,
          upazila: data.upazila ?? null,
          forecast: null,
          error: msg,
        };
      }
    },
  );

// Save or refresh the current device's push subscription
export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        endpoint: z.string().url().max(2048),
        p256dh: z.string().min(1).max(512),
        auth: z.string().min(1).max(256),
        district: z.string().min(1).max(100).nullable().optional(),
        upazila: z.string().min(1).max(100).nullable().optional(),
        user_agent: z.string().max(512).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: userId,
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
        district: data.district ?? null,
        upazila: data.upazila ?? null,
        user_agent: data.user_agent ?? null,
      },
      { onConflict: "endpoint" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Remove a push subscription by endpoint (current device) or all for user
export const deletePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ endpoint: z.string().url().max(2048).optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let q = supabase.from("push_subscriptions").delete().eq("user_id", userId);
    if (data.endpoint) q = q.eq("endpoint", data.endpoint);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Check if current user has any active subscription
export const hasPushSubscription = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("push_subscriptions")
      .select("id")
      .eq("user_id", userId)
      .limit(1);
    if (error) throw new Error(error.message);
    return { hasSubscription: !!data && data.length > 0 };
  });
