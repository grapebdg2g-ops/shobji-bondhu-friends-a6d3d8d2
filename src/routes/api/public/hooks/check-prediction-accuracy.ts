import { createFileRoute } from "@tanstack/react-router";
import { isAuthorizedCronRequest, unauthorizedCronResponse } from "@/lib/cron-auth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type Prediction = {
  current_avg_price?: number;
  predicted_price_range?: { min?: number; max?: number };
  predicted_change_percent?: number;
  direction?: string;
};

/**
 * Daily cron: for each prediction made ~7 days ago that hasn't been checked,
 * fetch the actual current price and decide if the prediction was correct.
 *
 * Correctness rules:
 *  - direction "বাড়বে": actual must be ≥ current * (1 + 0.5 * predicted%)
 *  - direction "কমবে":  actual must be ≤ current * (1 - 0.5 * predicted%)
 *  - direction "স্থির থাকবে": |change| < 5%
 *  - or actual price falls inside predicted_price_range
 */
export const Route = createFileRoute("/api/public/hooks/check-prediction-accuracy")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isAuthorizedCronRequest(request)) return unauthorizedCronResponse();
        // 7-day window: between 8 days and 7 days ago (giving a 1-day grace)
        const olderThan = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
        const newerThan = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString();

        const { data: preds, error } = await supabaseAdmin
          .from("price_predictions")
          .select("id, product_name, district, prediction_json, created_at")
          .is("checked_at", null)
          .lte("created_at", olderThan)
          .gte("created_at", newerThan)
          .limit(500);

        if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

        const results: Array<{ id: string; was_correct?: boolean; reason: string }> = [];

        for (const p of preds ?? []) {
          const pred = (p.prediction_json ?? {}) as Prediction;
          const currentPredicted = Number(pred.current_avg_price ?? 0);

          // Fetch actual prices for this product+district in the last 3 days
          const since = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString();
          const { data: actualRows } = await supabaseAdmin
            .from("prices")
            .select("price")
            .ilike("product_name", p.product_name)
            .eq("district", p.district)
            .gte("created_at", since);

          let actual: number | null = null;
          if (actualRows && actualRows.length > 0) {
            actual = actualRows.reduce((s, r) => s + Number(r.price), 0) / actualRows.length;
          } else {
            // Fall back to govt prices
            const sinceDate = new Date(Date.now() - 5 * 24 * 3600 * 1000)
              .toISOString()
              .slice(0, 10);
            const { data: govt } = await supabaseAdmin
              .from("govt_prices")
              .select("price_avg")
              .ilike("product_name", p.product_name)
              .eq("district", p.district)
              .gte("price_date", sinceDate);
            if (govt && govt.length > 0) {
              actual = govt.reduce((s, r) => s + Number(r.price_avg), 0) / govt.length;
            }
          }

          if (actual == null || !currentPredicted) {
            results.push({ id: p.id, reason: "no_actual_data" });
            continue;
          }

          const direction = pred.direction ?? "";
          const range = pred.predicted_price_range ?? {};
          const min = Number(range.min ?? 0);
          const max = Number(range.max ?? 0);
          const changePct = ((actual - currentPredicted) / currentPredicted) * 100;

          let was_correct = false;
          if (min && max && actual >= min && actual <= max) {
            was_correct = true;
          } else if (direction === "বাড়বে" && changePct > 2) {
            was_correct = true;
          } else if (direction === "কমবে" && changePct < -2) {
            was_correct = true;
          } else if (direction === "স্থির থাকবে" && Math.abs(changePct) <= 5) {
            was_correct = true;
          }

          await supabaseAdmin
            .from("price_predictions")
            .update({
              was_correct,
              actual_price: Number(actual.toFixed(2)),
              checked_at: new Date().toISOString(),
            })
            .eq("id", p.id);

          results.push({ id: p.id, was_correct, reason: "checked" });
        }

        return Response.json({
          ok: true,
          ran_at: new Date().toISOString(),
          total: preds?.length ?? 0,
          results,
        });
      },
      GET: async () => Response.json({ ok: true, hint: "POST to run; scheduled via pg_cron" }),
    },
  },
});
