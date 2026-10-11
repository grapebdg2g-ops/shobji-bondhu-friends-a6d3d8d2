import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function ensureAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin only");
}

export const hardDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        userId: z.string().uuid(),
        reason: z.string().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const adminId = context.userId;
    await ensureAdmin(adminId);
    if (data.userId === adminId) throw new Error("Cannot delete yourself");

    const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (delErr) throw new Error(delErr.message);

    await supabaseAdmin.from("admin_actions").insert({
      admin_id: adminId,
      action_type: "hard_delete_user",
      target_id: data.userId,
      details: { reason: data.reason ?? null } as never,
    });
    return { ok: true };
  });

type CacheStats = {
  total: number;
  active: number;
  totalHits: number;
  avgHits: number;
  helpful: number;
  unhelpful: number;
  byCategory: Array<{ category: string; count: number; hits: number }>;
  topQuestions: Array<{
    id: string;
    question: string;
    hit_count: number;
    helpful_count: number;
    unhelpful_count: number;
  }>;
};

export const getCacheStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CacheStats> => {
    await ensureAdmin(context.userId);
    const { data: rows } = await supabaseAdmin
      .from("ai_chat_cache" as never)
      .select("id, question, category, hit_count, helpful_count, unhelpful_count, expires_at")
      .limit(5000);
    const list =
      (rows as Array<{
        id: string;
        question: string;
        category: string | null;
        hit_count: number;
        helpful_count: number;
        unhelpful_count: number;
        expires_at: string;
      }> | null) ?? [];
    const now = Date.now();
    const active = list.filter((r) => new Date(r.expires_at).getTime() > now);
    const totalHits = active.reduce((s, r) => s + (r.hit_count || 0), 0);
    const helpful = active.reduce((s, r) => s + (r.helpful_count || 0), 0);
    const unhelpful = active.reduce((s, r) => s + (r.unhelpful_count || 0), 0);
    const catMap: Record<string, { count: number; hits: number }> = {};
    for (const r of active) {
      const c = r.category || "general";
      if (!catMap[c]) catMap[c] = { count: 0, hits: 0 };
      catMap[c].count += 1;
      catMap[c].hits += r.hit_count || 0;
    }
    const byCategory = Object.entries(catMap)
      .map(([category, v]) => ({ category, ...v }))
      .sort((a, b) => b.count - a.count);
    const topQuestions = [...active]
      .sort((a, b) => (b.hit_count || 0) - (a.hit_count || 0))
      .slice(0, 5)
      .map((r) => ({
        id: r.id,
        question: r.question,
        hit_count: r.hit_count,
        helpful_count: r.helpful_count,
        unhelpful_count: r.unhelpful_count,
      }));
    return {
      total: list.length,
      active: active.length,
      totalHits,
      avgHits: active.length ? Math.round((totalHits / active.length) * 10) / 10 : 0,
      helpful,
      unhelpful,
      byCategory,
      topQuestions,
    };
  });
