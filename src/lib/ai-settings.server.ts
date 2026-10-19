// Server-only: resolves per-feature AI provider/model/key from the
// ai_model_settings table (admin-controlled) and calls the provider.
// API keys live only in server env secrets; the table stores the secret NAME.

export type AiProvider = "torveai" | "gemini" | "lovable_gateway";

export type AiSetting = {
  feature_key: string;
  provider: AiProvider;
  model: string;
  api_key_secret: string;
  is_active: boolean;
};

// Fallbacks used when a feature has no active row or the row cannot be read.
const DEFAULTS: Record<string, Omit<AiSetting, "feature_key" | "is_active">> = {
  disease_detection: {
    provider: "torveai",
    model: "claude-sonnet-5",
    api_key_secret: "TORVEAI_API_KEY",
  },
  ai_chat: { provider: "gemini", model: "gemini-2.5-flash", api_key_secret: "GEMINI_API_KEY" },
  chat_suggestions: {
    provider: "gemini",
    model: "gemini-2.5-flash",
    api_key_secret: "GEMINI_API_KEY",
  },
  soil_analysis: {
    provider: "gemini",
    model: "gemini-2.5-flash",
    api_key_secret: "GEMINI_API_KEY",
  },
  price_prediction: {
    provider: "lovable_gateway",
    model: "google/gemini-3-flash-preview",
    api_key_secret: "LOVABLE_API_KEY",
  },
  price_extraction: {
    provider: "lovable_gateway",
    model: "openai/gpt-6-astra",
    api_key_secret: "LOVABLE_API_KEY",
  },
  transcribe: {
    provider: "lovable_gateway",
    model: "openai/gpt-transcribe",
    api_key_secret: "LOVABLE_API_KEY",
  },
};

export async function getAiSetting(featureKey: string): Promise<AiSetting> {
  const fallback = DEFAULTS[featureKey] ?? DEFAULTS.ai_chat;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("ai_model_settings" as never)
      .select("feature_key, provider, model, api_key_secret, is_active")
      .eq("feature_key", featureKey)
      .maybeSingle();
    const row = data as AiSetting | null;
    if (row && row.is_active) return row;
  } catch (e) {
    console.error("ai setting read failed", featureKey, e);
  }
  return { feature_key: featureKey, is_active: true, ...fallback };
}

export function resolveAiKey(secretName: string): string | null {
  const v = process.env[secretName];
  return v && v.trim() ? v.trim() : null;
}

type ChatMessage = { role: "user" | "assistant"; content: string };
type AiImage = { mimeType: string; data: string }; // base64, no data: prefix

export type AiCallOptions = {
  system?: string;
  messages: ChatMessage[];
  images?: AiImage[];
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
};

const PROVIDER_URLS: Record<Exclude<AiProvider, "gemini">, string> = {
  torveai: "https://api.torveai.com/v1/chat/completions",
  lovable_gateway: "https://ai.gateway.lovable.dev/v1/chat/completions",
};

async function callOpenAiCompatible(
  setting: AiSetting,
  key: string,
  opts: AiCallOptions,
): Promise<string> {
  const messages: unknown[] = [];
  if (opts.system) messages.push({ role: "system", content: opts.system });
  for (const m of opts.messages) {
    messages.push({ role: m.role, content: m.content });
  }
  if (opts.images?.length) {
    const last = messages[messages.length - 1] as { role: string; content: unknown };
    const parts: unknown[] = [
      { type: "text", text: typeof last.content === "string" ? last.content : "" },
      ...opts.images.map((img) => ({
        type: "image_url",
        image_url: { url: `data:${img.mimeType};base64,${img.data}` },
      })),
    ];
    messages[messages.length - 1] = { role: "user", content: parts };
  }

  const res = await fetch(PROVIDER_URLS[setting.provider as "torveai" | "lovable_gateway"], {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: setting.model,
      messages,
      temperature: opts.temperature ?? 0.5,
      max_tokens: opts.maxTokens ?? 2048,
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (res.status === 429) throw new Error("অনেক অনুরোধ এসেছে, একটু পরে আবার চেষ্টা করুন");
  if (res.status === 401 || res.status === 403) throw new Error("AI API কী সমস্যা, পরে চেষ্টা করুন");
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    console.error("AI provider error", setting.provider, res.status, err.slice(0, 300));
    throw new Error("AI সেবা সাড়া দিচ্ছে না");
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return (data.choices?.[0]?.message?.content ?? "").trim();
}

async function callGemini(setting: AiSetting, key: string, opts: AiCallOptions): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${setting.model}:generateContent?key=${key}`;
  const contents = opts.messages.map((m, i) => {
    const parts: unknown[] = [{ text: m.content }];
    if (i === opts.messages.length - 1 && opts.images?.length) {
      for (const img of opts.images) {
        parts.push({ inline_data: { mime_type: img.mimeType, data: img.data } });
      }
    }
    return { role: m.role === "user" ? "user" : "model", parts };
  });

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(opts.system ? { system_instruction: { parts: [{ text: opts.system }] } } : {}),
      contents,
      generationConfig: {
        temperature: opts.temperature ?? 0.5,
        maxOutputTokens: opts.maxTokens ?? 2048,
        topP: 0.8,
        ...(opts.json ? { responseMimeType: "application/json" } : {}),
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      ],
    }),
  });

  if (res.status === 429) throw new Error("অনেক অনুরোধ এসেছে, একটু পরে আবার চেষ্টা করুন");
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    console.error("Gemini error", res.status, err.slice(0, 300));
    throw new Error("AI সেবা সাড়া দিচ্ছে না");
  }
  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  return parts
    .map((p: { text?: string }) => (typeof p?.text === "string" ? p.text : ""))
    .join("")
    .trim();
}

/** Call the configured provider for a feature. Throws with a Bangla message on failure. */
export async function callAi(setting: AiSetting, opts: AiCallOptions): Promise<string> {
  const key = resolveAiKey(setting.api_key_secret);
  if (!key) throw new Error("AI সেবা এখন কনফিগার করা নেই");
  if (setting.provider === "gemini") return callGemini(setting, key, opts);
  return callOpenAiCompatible(setting, key, opts);
}
