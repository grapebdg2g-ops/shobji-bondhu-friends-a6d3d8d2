import { CropIcon } from "@/components/krishi/crop-icon";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Plus, ChevronRight, Check, Trash2, RotateCcw } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FARMING_STAGES } from "@/data/farming-guide";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/user-context";
import { toBn } from "@/lib/bn";
import { daysSince } from "@/lib/bn-date";
import { toast } from "sonner";

export const Route = createFileRoute("/crop-guide/")({
  component: CropGuideIndex,
  head: () => ({
    meta: [
      { title: "ফসল পরামর্শ — কৃষক বন্ধু" },
      { property: "og:title", content: "ফসল পরামর্শ — কৃষক বন্ধু" },
      { property: "og:description", content: "রোপণ থেকে বিক্রি পর্যন্ত সম্পূর্ণ ফসল চাষ গাইড।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "description", content: "রোপণ থেকে বিক্রি পর্যন্ত সম্পূর্ণ ফসল চাষ গাইড।" },
    ],
  }),
});

type Plan = {
  id: string;
  crop_type: string;
  planting_date: string;
  is_active: boolean;
  created_at: string;
};

function CropGuideIndex() {
  const navigate = useNavigate();
  const { user, loading } = useUser();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [tab, setTab] = useState<"active" | "done">("active");
  const [busy, setBusy] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Plan | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("user_crop_plans")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setPlans((data as Plan[]) ?? []);
      setLoadingPlans(false);
    })();
  }, [loading, user, navigate]);

  async function toggleDone(p: Plan) {
    setBusy(p.id);
    const next = !p.is_active;
    setPlans((ps) => ps.map((x) => (x.id === p.id ? { ...x, is_active: next } : x)));
    const { error } = await supabase.from("user_crop_plans").update({ is_active: next }).eq("id", p.id);
    setBusy(null);
    if (error) {
      setPlans((ps) => ps.map((x) => (x.id === p.id ? { ...x, is_active: p.is_active } : x)));
      toast.error("সংরক্ষণ ব্যর্থ, আবার চেষ্টা করুন");
      return;
    }
    toast.success(next ? "আবার চলমান তালিকায় আনা হয়েছে" : "চাষ সম্পন্ন হিসেবে চিহ্নিত ✅");
  }

  async function remove(p: Plan) {
    setBusy(p.id);
    // Remove dependent records first, then the plan
    await supabase.from("crop_task_completions").delete().eq("plan_id", p.id);
    await supabase.from("crop_reminders").delete().eq("plan_id", p.id);
    await supabase.from("crop_diary_entries").update({ plan_id: null }).eq("plan_id", p.id);
    const { error } = await supabase.from("user_crop_plans").delete().eq("id", p.id);
    setBusy(null);
    if (error) { toast.error("মুছতে ব্যর্থ, আবার চেষ্টা করুন"); return; }
    setPlans((ps) => ps.filter((x) => x.id !== p.id));
    toast.success("মুছে ফেলা হয়েছে");
  }

  const crops = Object.keys(FARMING_STAGES);
  const activePlans = plans.filter((p) => p.is_active);
  const donePlans = plans.filter((p) => !p.is_active);
  const shown = tab === "active" ? activePlans : donePlans;

  return (
    <main className="min-h-screen bg-[#F0FFF4] pb-24 md:max-w-[560px] md:mx-auto">
      <header className="px-5 pt-8 pb-6 rounded-b-3xl text-white" style={{ background: "var(--gradient-brand)" }}>
        <div className="flex items-center gap-3 mb-4">
          <Link to="/dashboard" aria-label="ফিরে যান" className="h-9 w-9 rounded-full bg-white/15 flex items-center justify-center">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </div>
        <h1 className="text-2xl font-bold">ফসল পরামর্শ</h1>
        <p className="mt-1 text-sm text-white/85">রোপণ থেকে বিক্রি পর্যন্ত সম্পূর্ণ গাইড</p>
      </header>

      {!loadingPlans && plans.length > 0 && (
        <section className="px-5 mt-5">
          <h2 className="text-lg font-bold text-gray-900 mb-3">আমার ফসল</h2>
          <div className="grid grid-cols-2 gap-2 mb-3 bg-white p-1 rounded-xl ring-1 ring-emerald-100">
            <button
              onClick={() => setTab("active")}
              className={`py-2 rounded-lg text-sm font-semibold ${tab === "active" ? "bg-emerald-600 text-white" : "text-gray-600"}`}
            >
              চলমান ({toBn(activePlans.length)})
            </button>
            <button
              onClick={() => setTab("done")}
              className={`py-2 rounded-lg text-sm font-semibold ${tab === "done" ? "bg-emerald-600 text-white" : "text-gray-600"}`}
            >
              সম্পন্ন ({toBn(donePlans.length)})
            </button>
          </div>

          {shown.length === 0 && (
            <p className="text-center text-sm text-gray-500 py-6 bg-white rounded-2xl ring-1 ring-gray-100">
              {tab === "active" ? "কোনো চলমান ফসল নেই" : "এখনো কোনো চাষ সম্পন্ন হয়নি"}
            </p>
          )}

          <div className="space-y-3">
            {shown.map((p) => {
              const guide = FARMING_STAGES[p.crop_type];
              if (!guide) return null;
              const days = Math.max(0, daysSince(p.planting_date));
              const pct = p.is_active ? Math.min(100, Math.round((days / guide.totalDays) * 100)) : 100;
              const currentStage = guide.stages.find((s) => days >= s.startDay && days < s.endDay) ?? guide.stages[guide.stages.length - 1];
              const done = !p.is_active;
              return (
                <div key={p.id} className={`bg-white rounded-2xl p-4 shadow-sm ring-1 ${done ? "ring-emerald-300" : "ring-emerald-100"}`}>
                  <Link to="/crop-guide/plan/$planId" params={{ planId: p.id }} className="block">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl"><CropIcon crop={p.crop_type} /></span>
                        <span className={`font-bold ${done ? "text-gray-500 line-through" : "text-gray-900"}`}>{p.crop_type}</span>
                        {done && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">চাষ সম্পন্ন ✅</span>}
                      </div>
                      <span className="text-xs text-gray-500">{toBn(days)} দিন</span>
                    </div>
                    {!done && <p className="text-xs text-gray-600 mb-2">{currentStage.icon} {currentStage.name}</p>}
                    <div className="h-2 bg-emerald-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-gray-500">{toBn(pct)}%</span>
                      <span className="text-emerald-600 text-sm font-semibold inline-flex items-center gap-1">দেখুন <ChevronRight className="h-4 w-4" /></span>
                    </div>
                  </Link>
                  <div className="mt-3 flex gap-2">
                    <button
                      disabled={busy === p.id}
                      onClick={() => toggleDone(p)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1 disabled:opacity-50 ${done ? "bg-gray-100 text-gray-700" : "bg-emerald-600 text-white"}`}
                    >
                      {done ? <><RotateCcw className="h-3.5 w-3.5" /> আবার চলমান করুন</> : <><Check className="h-3.5 w-3.5" /> চাষ সম্পন্ন</>}
                    </button>
                    <button
                      disabled={busy === p.id}
                      onClick={() => setToDelete(p)}
                      aria-label="মুছে ফেলুন"
                      className="px-3 py-2 rounded-lg border border-red-200 text-red-600 text-xs font-bold inline-flex items-center gap-1 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> মুছুন
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="px-5 mt-6">
        <h2 className="text-lg font-bold text-gray-900 mb-3">
          {plans.length > 0 ? "নতুন ফসল যোগ করুন" : "ফসল নির্বাচন করুন"}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {crops.map((crop) => {
            const g = FARMING_STAGES[crop];
            return (
              <Link
                key={crop}
                to="/crop-guide/new/$crop"
                params={{ crop }}
                className="bg-white rounded-2xl p-4 shadow-sm ring-1 ring-gray-100 flex flex-col items-center text-center active:scale-95 transition"
              >
                <span className="text-4xl mb-2"><CropIcon crop={crop} /></span>
                <span className="font-bold text-gray-900 text-sm">{crop}</span>
                <span className="text-[11px] text-gray-500 mt-1 line-clamp-1">{g.season}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent className="max-w-[320px] rounded-2xl p-6">
          <AlertDialogHeader className="items-center text-center">
            <AlertDialogTitle className="text-lg font-bold text-center leading-relaxed">
              আপনি কি নিশ্চিত মুছে ফেলতে চান?
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-3 mt-2">
            <AlertDialogCancel className="flex-1 mt-0 rounded-xl border-border font-bold">
              বাতিল
            </AlertDialogCancel>
            <AlertDialogAction
              className="flex-1 rounded-xl bg-red-600 text-white hover:bg-red-700 font-bold"
              onClick={() => {
                if (toDelete) remove(toDelete);
                setToDelete(null);
              }}
            >
              মুছে ফেলুন
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
