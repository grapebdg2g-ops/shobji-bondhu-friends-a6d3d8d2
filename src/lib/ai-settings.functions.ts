import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SettingSchema = z.object({
  feature_key: z.string().min(1).max(50),
  provider: z.enum(["torveai", "gemini", "lovable_gateway"]),
  model: z.string().min(1).max(100),
  api_key_secret: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[A-Z][A-Z0-9_]*$/, "সিক্রেটের নাম বড় হাতের অক্ষরে দিন"),
  is_active: z.boolean(),
});

export type AiSettingRow = z.infer<typeof SettingSchema> & { updated_at?: string };

async function assertAdmin(supabase: any, userId: string) {
  const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!isAdmin) throw new Error("শুধু অ্যাডমিন এই কাজ করতে পারবেন");
}

export const listAiModelSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ settings: AiSettingRow[] }> => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("ai_model_settings" as never)
      .select("feature_key, provider, model, api_key_secret, is_active, updated_at")
      .order("feature_key");
    return { settings: (data as AiSettingRow[] | null) ?? [] };
  });

export const updateAiModelSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SettingSchema.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    // RPC নিজেই admin যাচাই করে (security definer)
    const { error } = await context.supabase.rpc("update_ai_model_setting" as never, {
      _feature_key: data.feature_key,
      _provider: data.provider,
      _model: data.model,
      _api_key_secret: data.api_key_secret,
      _is_active: data.is_active,
    } as never);
    if (error) throw new Error("সংরক্ষণ ব্যর্থ হয়েছে");
    return { ok: true };
  });
