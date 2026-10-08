import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isPlausible, mentionsPrice, normalizePrice, type ExtractedPrice } from "./price-from-text";

const extractedSchema = z.object({
  prices: z
    .array(
      z.object({
        product_name: z.string().trim().min(1).max(40),
        price: z.number().positive(),
        unit: z.enum(["কেজি", "মণ", "পিস", "হালি"]),
        price_type: z.enum(["retail", "wholesale", "growers"]),
        category: z.string().trim().max(20).optional(),
      }),
    )
    .max(5),
});

/** পোস্ট/কমেন্টে উল্লেখিত দাম বের করে লেখকের এলাকার কৃষক-রিপোর্ট হিসেবে বাজারদরে যোগ করে। */
export const capturePricesFromContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ kind: z.enum(["post", "comment"]), id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const table = data.kind === "post" ? "posts" : "post_comments";
    const { data: row } = await supabase.from(table).select("user_id, content").eq("id", data.id).maybeSingle();
    if (!row || row.user_id !== userId || !mentionsPrice(row.content)) return { added: 0 };

    const { data: profile } = await supabase.from("profiles").select("name, district, upazila").eq("id", userId).maybeSingle();
    if (!profile?.district) return { added: 0 };

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { added: 0 };

    const prompt = `নিচের বাংলাদেশি কৃষকের লেখা থেকে শুধু সেই সবজি/ফসলের দাম বের করো যা লেখক নিজের এলাকায় আজ বা সম্প্রতি বিক্রি/কেনা হয়েছে বলে জানিয়েছেন। প্রশ্ন, অনুমান, পূর্বাভাস বা অন্য এলাকার দাম বাদ দাও।
- product_name: প্রচলিত বাংলা নাম (যেমন "টমোটু"/"টমেটু" → "টমেটো")
- unit: কেজি, মণ, পিস বা হালি
- price_type: পাইকারী → wholesale, খুচরা → retail, কৃষক/মাঠ/জমি থেকে বিক্রি → growers; উল্লেখ না থাকলে growers
- একই পণ্যের কেজি ও মণ দুটোই থাকলে কেজিরটা দাও
শুধু JSON: {"prices":[{"product_name":"টমেটো","price":20,"unit":"কেজি","price_type":"wholesale","category":"সবজি"}]}; না থাকলে {"prices":[]}

লেখা: """${row.content.slice(0, 1000)}"""`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) return { added: 0 };
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    let parsed: z.infer<typeof extractedSchema>;
    try {
      const raw = (json.choices?.[0]?.message?.content ?? "").replace(/```json|```/g, "").trim();
      parsed = extractedSchema.parse(JSON.parse(raw));
    } catch {
      return { added: 0 };
    }

    const rows = parsed.prices
      .map((p) => ({ p, n: normalizePrice(p as ExtractedPrice) }))
      .filter(({ n }) => isPlausible(n.price))
      .map(({ p, n }) => ({
        product_name: p.product_name,
        price: n.price,
        unit: n.unit,
        price_type: p.price_type,
        source: "community",
        market_name: data.kind === "post" ? "কমিউনিটি পোস্ট" : "কমিউনিটি মন্তব্য",
        district: profile.district!,
        upazila: profile.upazila,
        category: p.category || "সবজি",
        user_id: userId,
        user_name: profile.name || "কৃষক",
        origin_type: data.kind,
        origin_id: data.id,
      }));
    if (rows.length === 0) return { added: 0 };

    const { error } = await supabase.from("prices").insert(rows);
    if (error) return { added: 0 };
    return { added: rows.length, products: rows.map((r) => r.product_name) };
  });
