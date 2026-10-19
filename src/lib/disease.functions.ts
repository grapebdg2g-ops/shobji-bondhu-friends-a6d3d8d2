import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getAiSetting, callAi } from "@/lib/ai-settings.server";

const InputSchema = z.object({
  imageBase64: z.string().min(100).max(8_000_000),
  mimeType: z.string().regex(/^image\/(jpeg|png|webp)$/),
  crop: z.string().min(1).max(50),
});

export type DiseaseResult = {
  diseaseName: string;
  severity: "low" | "medium" | "high";
  description: string;
  treatments: string[];
  prevention: string[];
  cost: { name: string; price: string }[];
  confidence?: number;
  detected: boolean;
  reason?: string;
};

const SYSTEM_PROMPT = `তুমি একজন অভিজ্ঞ বাংলাদেশী কৃষি রোগ বিশেষজ্ঞ। কৃষকের পাঠানো ফসলের ছবি দেখে রোগ শনাক্ত করো এবং বাংলায় উত্তর দাও।

কঠোরভাবে শুধুমাত্র নিচের JSON ফরম্যাটে উত্তর দাও, কোনো অতিরিক্ত লেখা যোগ করো না:

{
  "detected": true/false,
  "diseaseName": "রোগের বাংলা নাম",
  "severity": "low" | "medium" | "high",
  "description": "রোগের বিবরণ ২-৩ বাক্যে",
  "treatments": ["চিকিৎসা ১", "চিকিৎসা ২", "চিকিৎসা ৩"],
  "prevention": ["প্রতিরোধ ১", "প্রতিরোধ ২", "প্রতিরোধ ৩"],
  "cost": [{"name": "ঔষধের নাম", "price": "৳ মূল্য"}],
  "confidence": 0-100,
  "reason": "যদি detected=false হয় তবে কারণ"
}

যদি ছবিতে রোগ স্পষ্ট না হয় বা ফসলের ছবি না হয়, detected=false দাও।

নিরাপত্তা নিয়ম (অবশ্য পালনীয়):
- ঔষধ/কীটনাশকের মাত্রা শুধুমাত্র DAE-অনুমোদিত লেবেল মাত্রায় বলো; মাত্রা নিশ্চিত না হলে treatments-এ মাত্রা না লিখে "উপজেলা কৃষি অফিসে জিজ্ঞেস করুন" লেখো। কখনো মাত্রা অনুমান করে বানিয়ে লিখো না।
- রাসায়নিক চিকিৎসা দিলে prevention-এর প্রথম পয়েন্টে PHI (অপেক্ষা সময়) ও PPE (মাস্ক, গ্লাভস) উল্লেখ করো।
- severity "high" হলে description-এর শেষে উপজেলা কৃষি কর্মকর্তার পরামর্শ নেওয়ার কথা যোগ করো।
- confidence সৎভাবে দাও; ৬০-এর নিচে হলে detected=false দেওয়াই ভালো।`;

export const analyzeDisease = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data, context }): Promise<DiseaseResult> => {
    const { supabase, userId } = context;

    // Rate limit: max 10 analyses per user per hour
    const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();
    const { count, error: countErr } = await supabase
      .from("disease_history")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", oneHourAgo);
    if (countErr) console.error("rate-limit count error:", countErr);
    if ((count ?? 0) >= 10) {
      throw new Error("প্রতি ঘণ্টায় সর্বোচ্চ ১০টি বিশ্লেষণ করা যাবে, একটু পর আবার চেষ্টা করুন");
    }

    // Provider/model/key admin panel থেকে নিয়ন্ত্রিত (ai_model_settings)
    const setting = await getAiSetting("disease_detection");

    let content = "";
    try {
      content = await callAi(setting, {
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `ফসল: ${data.crop}\n\nএই ছবিতে কী রোগ দেখা যাচ্ছে? উপরে বলা JSON ফরম্যাটে উত্তর দাও।`,
          },
        ],
        images: [{ mimeType: data.mimeType, data: data.imageBase64 }],
        json: true,
        temperature: 0.3,
        maxTokens: 2048,
      });
    } catch (e) {
      if (e instanceof Error) throw e;
      throw new Error("রোগ শনাক্তকরণ সেবা সাময়িকভাবে বন্ধ আছে, পরে আবার চেষ্টা করুন");
    }

    let parsed: Partial<DiseaseResult> = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch {
          parsed = {};
        }
      }
    }

    const detected = parsed.detected ?? false;
    return {
      detected,
      diseaseName: parsed.diseaseName ?? "অজানা",
      // Unknown severity defaults to low (never overstate); prompt asks the
      // model for honest confidence and officer referral on high severity.
      severity: (parsed.severity as DiseaseResult["severity"]) ?? "low",
      description: parsed.description ?? "",
      treatments: Array.isArray(parsed.treatments) ? parsed.treatments : [],
      prevention: Array.isArray(parsed.prevention) ? parsed.prevention : [],
      cost: Array.isArray(parsed.cost) ? parsed.cost : [],
      confidence:
        typeof parsed.confidence === "number"
          ? Math.max(0, Math.min(100, parsed.confidence))
          : undefined,
      reason: parsed.reason,
    };
  });
