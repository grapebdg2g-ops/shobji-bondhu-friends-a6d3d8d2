import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getDistrictLatLng } from "@/lib/bd-data";

type HistoryRow = {
  price_date: string;
  avg_price: number;
  min_price: number;
  max_price: number;
  data_points: number;
  source: string;
};

export type Prediction = {
  direction: "বাড়বে" | "কমবে" | "স্থির থাকবে";
  confidence: number;
  predicted_change_percent: number;
  timeframe: string;
  current_avg_price: number;
  predicted_price_range: { min: number; max: number };
  main_reason: string;
  factors: string[];
  advice: string;
  risk_level: "কম" | "মাঝারি" | "বেশি";
};

const PredictionSchema = z.object({
  direction: z.enum(["বাড়বে", "কমবে", "স্থির থাকবে"]),
  confidence: z.number().min(0).max(100),
  predicted_change_percent: z.number().min(-100).max(100),
  timeframe: z.string().min(1).max(80),
  current_avg_price: z.number().nonnegative(),
  predicted_price_range: z.object({ min: z.number().nonnegative(), max: z.number().nonnegative() }),
  main_reason: z.string().min(1).max(300),
  factors: z.array(z.string().min(1).max(200)).min(1).max(6),
  advice: z.string().min(1).max(500),
  risk_level: z.enum(["কম", "মাঝারি", "বেশি"]),
});

const CACHE_HOURS = 6;

function getSeason(): "রবি" | "খরিফ-১" | "খরিফ-২" {
  const m = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Dhaka", month: "numeric" }).format(
      new Date(),
    ),
  );
  if (m >= 11 || m <= 2) return "রবি";
  if (m >= 3 && m <= 6) return "খরিফ-১";
  return "খরিফ-২";
}

function computeTrend(history: HistoryRow[]): "rising" | "falling" | "stable" {
  if (!history || history.length < 7) return "stable";
  const recent = history.slice(-7);
  const older = history.slice(-14, -7);
  if (!recent.length || !older.length) return "stable";
  const avg = (rows: HistoryRow[]) =>
    rows.reduce((s, r) => s + Number(r.avg_price), 0) / rows.length;
  const r = avg(recent);
  const o = avg(older);
  if (!o) return "stable";
  const change = ((r - o) / o) * 100;
  if (change > 5) return "rising";
  if (change < -5) return "falling";
  return "stable";
}

export const getPricePrediction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        product: z.string().min(1).max(100),
        district: z.string().min(1).max(100),
        upazila: z.string().min(1).max(100).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { product, district } = data;

    // ── Cache: reuse same product+district within 6h ──
    const cacheSince = new Date(Date.now() - CACHE_HOURS * 3600 * 1000).toISOString();
    const { data: cached } = await supabase
      .from("price_predictions")
      .select("prediction_json, data_points, trend, created_at")
      .eq("product_name", product)
      .eq("district", district)
      .gte("created_at", cacheSince)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cached) {
      return {
        insufficient: false as const,
        prediction: cached.prediction_json as Prediction,
        trend: (cached.trend ?? "stable") as "rising" | "falling" | "stable",
        cached: true,
        cached_at: cached.created_at,
        history: [] as HistoryRow[],
      };
    }

    // ── Step 1: history ──
    const { data: historyRaw } = await supabase.rpc("get_price_history", {
      p_product: product,
      p_district: district,
      p_days: 30,
    });
    const history = (historyRaw ?? []) as HistoryRow[];
    if (history.length < 7) {
      // Not an exception: return a friendly, renderable state instead of
      // throwing (a thrown server-fn error blanks the page).
      return {
        insufficient: true as const,
        message:
          "এই ফসলের জন্য অন্তত ৭ দিনের যাচাইযোগ্য বাজারদর না থাকায় এখনই নির্ভরযোগ্য পূর্বাভাস তৈরি করা যাচ্ছে না।",
        data_points: history.length,
        history,
      };
    }

    // ── Step 2: weather ──
    const [lat, lon] = getDistrictLatLng(district);
    let weather: { daily?: { precipitation_sum?: number[]; temperature_2m_max?: number[] } } = {};
    try {
      const wRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=precipitation_sum,temperature_2m_max&timezone=Asia%2FDhaka&forecast_days=7`,
      );
      if (wRes.ok) weather = await wRes.json();
    } catch (e) {
      console.warn("[prediction] weather fetch failed:", e);
    }

    // ── Step 3 & 4 ──
    const season = getSeason();
    const trend = computeTrend(history);

    const currentAvg = history.length > 0 ? Number(history[history.length - 1]!.avg_price) : 0;

    // ── Step 5: Lovable AI Gateway ──
    const apiKey = process.env.LOVABLE_API_KEY ?? "";
    if (!apiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const prompt = `তুমি বাংলাদেশের একজন কৃষি বাজার বিশেষজ্ঞ।
নিচের তথ্য বিশ্লেষণ করে ${product} এর দাম পূর্বাভাস দাও।

বর্তমান তথ্য:
- পণ্য: ${product}
- জেলা: ${district}
- মৌসুম: ${season}
- বর্তমান ট্রেন্ড: ${trend}
- বর্তমান গড় দাম: ${currentAvg} টাকা
- গত ৩০ দিনের দৈনিক গড় দাম (শেষ ১০ দিন):
${JSON.stringify(history.slice(-10))}

আবহাওয়া পূর্বাভাস (৭ দিন):
- বৃষ্টিপাত (mm): ${(weather.daily?.precipitation_sum ?? []).slice(0, 7).join(", ")}
- সর্বোচ্চ তাপমাত্রা (°C): ${(weather.daily?.temperature_2m_max ?? []).slice(0, 7).join(", ")}

বিবেচনা করো:
1. মৌসুমি প্রভাব (এখন ${season} মৌসুম)
2. আবহাওয়ার প্রভাব
3. ঐতিহাসিক দামের ট্রেন্ড
4. সাধারণ বাজার নিয়মকানুন

শুধু এই JSON format এ উত্তর দাও, কোনো অতিরিক্ত text নয়:
{
  "direction": "বাড়বে|কমবে|স্থির থাকবে",
  "confidence": 75,
  "predicted_change_percent": 8,
  "timeframe": "আগামী ৭ দিনে",
  "current_avg_price": ${currentAvg},
  "predicted_price_range": { "min": 42, "max": 52 },
  "main_reason": "মূল কারণ এক লাইনে",
  "factors": ["কারণ ১", "কারণ ২", "কারণ ৩"],
  "advice": "কৃষকের জন্য পরামর্শ",
  "risk_level": "কম|মাঝারি|বেশি"
}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text().catch(() => "");
      if (aiRes.status === 429) {
        throw new Error("AI rate limit exceeded. Please try again shortly.");
      }
      if (aiRes.status === 402) {
        throw new Error("AI credits exhausted. Please add credits in workspace settings.");
      }
      throw new Error(`AI gateway error ${aiRes.status}: ${txt.slice(0, 200)}`);
    }

    const aiData = (await aiRes.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = aiData.choices?.[0]?.message?.content ?? "";
    const cleaned = raw.replace(/```json|```/g, "").trim();

    let rawPrediction: unknown;
    try {
      rawPrediction = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("AI response did not contain valid JSON");
      rawPrediction = JSON.parse(match[0]);
    }

    const parsedPrediction = PredictionSchema.parse(rawPrediction);
    const prediction: Prediction = {
      ...parsedPrediction,
      confidence: Math.round(Math.min(parsedPrediction.confidence, history.length < 14 ? 65 : 90)),
      predicted_price_range: {
        min: Math.min(
          parsedPrediction.predicted_price_range.min,
          parsedPrediction.predicted_price_range.max,
        ),
        max: Math.max(
          parsedPrediction.predicted_price_range.min,
          parsedPrediction.predicted_price_range.max,
        ),
      },
      risk_level: history.length < 14 ? "বেশি" : parsedPrediction.risk_level,
    };

    // ── Step 6: save (uses service role to bypass RLS write restriction) ──
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("price_predictions").insert({
        product_name: product,
        district,
        prediction_json: prediction,
        data_points: history.length,
        trend,
        user_id: context.userId,
      });
    } catch (e) {
      console.warn("[prediction] cache save failed:", e);
    }

    return {
      insufficient: false as const,
      prediction,
      trend,
      cached: false,
      cached_at: null,
      history: history.slice(-14),
    };
  });

export const setPriceAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        product: z.string().min(1).max(100),
        district: z.string().min(1).max(100),
        threshold: z.number().min(1).max(100).default(10),
        direction: z.enum(["both", "up", "down"]).default("both"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("price_alerts").upsert(
      {
        user_id: userId,
        product_name: data.product,
        district: data.district,
        alert_threshold: data.threshold,
        direction: data.direction,
        is_active: true,
      },
      { onConflict: "user_id,product_name,district" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
