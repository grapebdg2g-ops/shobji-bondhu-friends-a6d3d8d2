/// <reference types="bun" />
import { afterEach, expect, mock, test } from "bun:test";

let saved: Record<string, unknown> | null = null;
mock.module("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: saved }) }) }),
    }),
  },
}));
mock.module("@tanstack/react-start", () => ({
  createServerFn: () => ({
    middleware() {
      return this;
    },
    inputValidator() {
      return this;
    },
    handler(fn: unknown) {
      return fn;
    },
  }),
}));
mock.module("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));

const { getAiSetting, callAi, callTranscription } = await import("./ai-settings.server");
const { transcribeAudio } = await import("./transcribe.functions");
const { capturePricesFromContent } = await import("./price-from-text.functions");
const originalFetch = globalThis.fetch;
process.env.AI_SETTINGS_TEST_KEY = "test-only-credential";
const setting = (
  feature: string,
  provider: "gemini" | "torveai" | "lovable_gateway",
  model: string,
  active = true,
) => ({
  feature_key: feature,
  provider,
  model,
  api_key_secret: "AI_SETTINGS_TEST_KEY",
  is_active: active,
});
afterEach(() => {
  saved = null;
  globalThis.fetch = originalFetch;
});

test("disabled stored setting never falls back or calls an AI provider", async () => {
  saved = setting("transcribe", "gemini", "selected-model", false);
  const resolved = await getAiSetting("transcribe");
  expect(resolved.is_active).toBe(false);
  globalThis.fetch = mock(() => {
    throw new Error("provider must not run");
  }) as unknown as typeof fetch;
  await expect(
    callTranscription(resolved, {
      audioBase64: "YXVkaW8=",
      mimeType: "audio/webm",
      extension: "webm",
    }),
  ).rejects.toThrow();
  await expect(
    callAi(resolved, { messages: [{ role: "user", content: "test" }] }),
  ).rejects.toThrow();
  expect(globalThis.fetch).not.toHaveBeenCalled();
});

for (const provider of ["gemini", "torveai", "lovable_gateway"] as const) {
  test(`voice handler uses saved ${provider} model and key`, async () => {
    saved = setting("transcribe", provider, "chosen-voice-model");
    globalThis.fetch = mock(async (url: string, init: RequestInit) => {
      if (provider === "gemini") {
        expect(url).toContain("/chosen-voice-model:generateContent");
        expect(new Headers(init.headers).get("x-goog-api-key")).toBe("test-only-credential");
        expect(JSON.parse(String(init.body)).contents[0].parts[1].inline_data.data).toBe(
          "YXVkaW8=",
        );
        return Response.json({ candidates: [{ content: { parts: [{ text: "টমেটো" }] } }] });
      }
      expect(url).toBe(
        provider === "torveai"
          ? "https://api.torveai.com/v1/audio/transcriptions"
          : "https://ai.gateway.lovable.dev/v1/audio/transcriptions",
      );
      expect(new Headers(init.headers).get("Authorization")).toBe("Bearer test-only-credential");
      expect((init.body as FormData).get("model")).toBe("chosen-voice-model");
      return Response.json({ text: "টমেটো" });
    }) as unknown as typeof fetch;
    const run = transcribeAudio as unknown as (args: unknown) => Promise<{ text: string }>;
    expect(await run({ data: { audioBase64: "YXVkaW8=", mimeType: "audio/webm" } })).toEqual({
      text: "টমেটো",
    });
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });
}

const inserted: unknown[][] = [];
const context = {
  userId: "author",
  supabase: {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data:
              table === "posts"
                ? { user_id: "author", content: "আজ টমেটো ২০ টাকা কেজি বিক্রি করেছি" }
                : { district: "ঢাকা", upazila: null, name: "কৃষক" },
          }),
        }),
      }),
      insert: async (rows: unknown[]) => {
        inserted.push(rows);
        return { error: null };
      },
    }),
  },
};
const capture = capturePricesFromContent as unknown as (
  args: unknown,
) => Promise<{ added: number }>;
test("disabled price extraction does not call AI or insert prices", async () => {
  saved = setting("price_extraction", "gemini", "chosen-price-model", false);
  globalThis.fetch = mock(() => {
    throw new Error("must not run");
  }) as unknown as typeof fetch;
  const before = inserted.length;
  expect(await capture({ data: { kind: "post", id: "post-id" }, context })).toEqual({ added: 0 });
  expect(inserted.length).toBe(before);
  expect(globalThis.fetch).not.toHaveBeenCalled();
});

test("price extraction uses saved Gemini provider, model and key and saves the result", async () => {
  saved = setting("price_extraction", "gemini", "chosen-price-model");
  globalThis.fetch = mock(async (url: string) => {
    expect(url).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/chosen-price-model:generateContent?key=test-only-credential",
    );
    return Response.json({
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  prices: [
                    { product_name: "টমেটো", price: 20, unit: "কেজি", price_type: "growers" },
                  ],
                }),
              },
            ],
          },
        },
      ],
    });
  }) as unknown as typeof fetch;
  expect((await capture({ data: { kind: "post", id: "post-id" }, context })).added).toBe(1);
  expect(inserted.at(-1)?.[0]).toMatchObject({
    product_name: "টমেটো",
    price: 20,
    origin_type: "post",
    origin_id: "post-id",
    user_id: "author",
  });
});

test("price extraction preserves Responses protocol with the saved OpenAI model and key", async () => {
  saved = setting("price_extraction", "lovable_gateway", "openai/gpt-6-astra");
  globalThis.fetch = mock(async (url: string, init: RequestInit) => {
    expect(url).toBe("https://ai.gateway.lovable.dev/v1/responses");
    expect(new Headers(init.headers).get("Lovable-API-Key")).toBe("test-only-credential");
    const body = JSON.parse(String(init.body));
    expect(body.model).toBe("openai/gpt-6-astra");
    expect(body.stream).toBe(true);
    expect(body.store).toBe(false);
    expect(body.text.format.type).toBe("json_schema");
    const delta = JSON.stringify({
      type: "response.output_text.delta",
      delta: JSON.stringify({
        prices: [{ product_name: "টমেটো", price: 20, unit: "কেজি", price_type: "growers" }],
      }),
    });
    return new Response(`data: ${delta}\n\n`);
  }) as unknown as typeof fetch;
  expect((await capture({ data: { kind: "post", id: "post-id" }, context })).added).toBe(1);
});
