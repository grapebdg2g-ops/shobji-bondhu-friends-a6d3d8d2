import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  audioBase64: z.string().min(10).max(20_000_000),
  mimeType: z.string().default("audio/webm"),
});

function mimeToExt(mime: string): string {
  const m = mime.split(";")[0].trim().toLowerCase();
  if (m.includes("mp4")) return "mp4";
  if (m.includes("mpeg") || m.includes("mp3")) return "mp3";
  if (m.includes("wav")) return "wav";
  if (m.includes("ogg")) return "ogg";
  if (m.includes("m4a")) return "m4a";
  return "webm";
}

export const transcribeAudio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }): Promise<{ text: string }> => {
    const { getAiSetting, callTranscription } = await import("./ai-settings.server");
    const setting = await getAiSetting("transcribe");
    const text = await callTranscription(setting, {
      ...data,
      extension: mimeToExt(data.mimeType),
    });
    return { text };
  });
