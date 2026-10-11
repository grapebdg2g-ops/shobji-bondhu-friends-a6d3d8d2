import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_market_prices",
  title: "List market prices",
  description:
    "List recent community-reported vegetable and crop market prices, optionally filtered by product name and district (Bengali names).",
  inputSchema: {
    product: z.string().trim().min(1).optional().describe("Product name, e.g. 'টমেটো'."),
    district: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe("District name in Bengali, e.g. 'ঢাকা'."),
    limit: z.number().int().min(1).max(50).optional().describe("Max rows (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ product, district, limit }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("prices")
      .select(
        "product_name, price, unit, market_name, district, upazila, category, previous_price, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (product) query = query.ilike("product_name", `%${product}%`);
    if (district) query = query.eq("district", district);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { prices: data ?? [] },
    };
  },
});
