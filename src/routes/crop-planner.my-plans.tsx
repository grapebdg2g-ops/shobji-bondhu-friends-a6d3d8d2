import { CropIcon } from "@/components/krishi/crop-icon";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Plus, ChevronRight, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/user-context";
import { getCrop, getAllCrops, type CropData } from "@/data/master-crop-data";
import { toBn } from "@/lib/bn";
import { daysSince, formatBnDate } from "@/lib/bn-date";
import { toast } from "sonner";

export const Route = createFileRoute("/crop-planner/my-plans")({
  component: MyPlansPage,
  head: () => ({
    meta: [{ title: "আমার ফসল পরিকল্পনা — কৃষক বন্ধু" },
      { property: "og:title", content: "আমার ফসল পরিকল্পনা — কৃষক বন্ধু" },
      { property: "og:description", content: "ফসলের পরিচর্যা ও কৃষি পরিকল্পনা — কৃষক বন্ধু।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "description", content: "ফসলের পরিচর্যা ও কৃষি পরিকল্পনা — কৃষক বন্ধু।" },],
  }),
});

type Plan = {
  id: string;
  crop_type: string;
  planting_date: string;
  is_active: boolean;
  created_at: string;
};

function findCrop(key: string): CropData | null {
  return getCrop(key) ?? getAllCrops().find((c) => c.name === key) ?? null;
}

function MyPlansPage() {
  const navigate = useNavigate();
  const { user, loading } = useUser();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/login" }); return; }
    (async () => {
      const { data } = await supabase
        .from("user_crop_plans" as never)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setPlans((data as Plan[]) ?? []);
      setLoadingPlans(false);
    })();
  }, [loading, user, navigate]);

  async function handleDelete(id: string) {
    if (!confirm("এই পরিকল্পনা মুছে ফেলবেন?")) return;
    const { error } = await supabase.from("user_crop_plans" as never).delete().eq("id", id);
    if (error) { toast.error("মুছতে ব্যর্থ"); return; }
    setPlans((p) => p.filter((x) => x.id !== id));
    toast.success("মুছে ফেলা হয়েছে");
  }

  return (
    <main className="min-h-screen bg-[#F0FFF4] md:max-w-[560px] md:mx-auto pb-24">
      <header className="px-5 pt-8 pb-6 rounded-b-3xl text-white" style={{ background: "var(--gradient-brand)" }}>
        <Link to="/crop-planner" aria-label="ফিরে যান" className="h-9 w-9 rounded-full bg-white/15 flex items-center justify-center">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="mt-4 text-2xl font-bold">আমার ফসল পরিকল্পনা</h1>
        <p className="text-sm text-white/85 mt-1">সংরক্ষিত পরিকল্পনা ও অগ্রগতি</p>
      </header>

      <section className="px-5 mt-6">
        {loadingPlans && <p className="text-center text-gray-500 py-8">লোড হচ্ছে…</p>}
        {!loadingPlans && plans.length === 0 && (
          <div className="text-center py-12">
            <div className="text-5xl mb-3">🌱</div>
            <p className="text-gray-700 font-semibold">এখনো কোনো পরিকল্পনা নেই</p>
            <Link
              to="/crop-planner"
              className="mt-4 inline-flex items-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-xl font-bold"
            >
              <Plus className="h-5 w-5" /> নতুন পরিকল্পনা
            </Link>
          </div>
        )}

        <div className="space-y-3">
          {plans.map((p) => {
            const c = findCrop(p.crop_type);
            const icon = c?.icon ?? "🌱";
            const total = c?.totalDays ?? 120;
            const days = Math.max(0, daysSince(p.planting_date));
            const pct = Math.min(100, Math.round((days / total) * 100));
            const stage = c?.stages.find((s) => days >= s.startDay && days < s.endDay);
            const todayTask = stage?.tasks[0];

            return (
              <div key={p.id} className="bg-white rounded-2xl p-4 shadow-sm ring-1 ring-emerald-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl"><CropIcon crop={p.crop_type} fallback={icon} /></span>
                    <div>
                      <div className="font-bold text-gray-900">{p.crop_type}</div>
                      <div className="text-[11px] text-gray-500">রোপণ: {formatBnDate(new Date(p.planting_date))}</div>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${p.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                    {p.is_active ? "সক্রিয় ✅" : "বন্ধ"}
                  </span>
                </div>
                <div className="text-xs text-gray-600 mb-2">
                  অগ্রগতি: {toBn(days)}/{toBn(total)} দিন
                </div>
                <div className="h-2 bg-emerald-100 rounded-full overflow-hidden mb-2">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                </div>
                {stage && (
                  <p className="text-xs text-gray-700">বর্তমান: <b>{stage.icon} {stage.name}</b></p>
                )}
                {todayTask && (
                  <p className="text-xs text-amber-700 mt-1">⚡ আজকের কাজ: {todayTask.title}</p>
                )}
                <div className="mt-3 flex gap-2">
                  <Link
                    to="/crop-guide/plan/$planId"
                    params={{ planId: p.id }}
                    className="flex-1 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold text-center inline-flex items-center justify-center gap-1"
                  >
                    দেখুন <ChevronRight className="h-3 w-3" />
                  </Link>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="px-3 py-2 rounded-lg border border-red-200 text-red-600 text-xs font-bold inline-flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" /> মুছুন
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {plans.length > 0 && (
          <Link
            to="/crop-planner"
            className="mt-5 w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-emerald-300 text-emerald-700 font-semibold"
          >
            <Plus className="h-5 w-5" /> নতুন পরিকল্পনা
          </Link>
        )}
      </section>
    </main>
  );
}
