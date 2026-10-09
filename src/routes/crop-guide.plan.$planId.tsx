import { CropIcon } from "@/components/krishi/crop-icon";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Share2, ChevronDown, ChevronUp, Check, Bell, AlertTriangle, ArrowDown } from "lucide-react";
import { FARMING_STAGES, TASK_TYPE_CONFIG, type FarmingTask, type FarmingStage, type TaskType } from "@/data/farming-guide";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/user-context";
import { toBn } from "@/lib/bn";
import { formatBnDate, daysSince, addDays } from "@/lib/bn-date";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { SprayScheduleSection } from "@/components/krishi/spray-schedule-section";
import { markSprayReminderDone } from "@/lib/spray-schedule";
import { CropKnowledgePanel } from "@/components/krishi/crop-knowledge-panel";
import { useCropCompletions } from "@/hooks/use-crop-completions";
import { CropFinanceSection } from "@/components/krishi/crop-finance-section";

export const Route = createFileRoute("/crop-guide/plan/$planId")({
  component: PlanAdvisory,
  head: () => ({ meta: [{ title: "ফসল পরামর্শ — কৃষক বন্ধু" },
      { property: "og:title", content: "ফসল পরামর্শ — কৃষক বন্ধু" },
      { property: "og:description", content: "ফসলের পরিচর্যা ও কৃষি পরিকল্পনা — কৃষক বন্ধু।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "description", content: "ফসলের পরিচর্যা ও কৃষি পরিকল্পনা — কৃষক বন্ধু।" },] }),
  errorComponent: ({ error, reset }) => (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <div>
        <p className="text-gray-700 mb-3">ত্রুটি: {(error as Error).message}</p>
        <button onClick={reset} className="text-emerald-600 font-semibold">পুনরায় চেষ্টা</button>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <div>
        <p className="text-gray-700 mb-3">পরিকল্পনা পাওয়া যায়নি</p>
        <Link to="/crop-guide" className="text-emerald-600 font-semibold">← ফিরুন</Link>
      </div>
    </div>
  ),
});

type Plan = { id: string; crop_type: string; planting_date: string; is_active: boolean };

function PlanAdvisory() {
  const { planId } = Route.useParams();
  const navigate = useNavigate();
  const { user, loading } = useUser();
  const [plan, setPlan] = useState<Plan | null>(null);
  const { keys: allCompletions, complete } = useCropCompletions(user?.id ?? null);
  const [openStages, setOpenStages] = useState<Set<string>>(new Set());
  const [activeTask, setActiveTask] = useState<{ task: FarmingTask; stage: FarmingStage; idx: number } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const stageRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/login" }); return; }
    (async () => {
      const { data: p } = await supabase
        .from("user_crop_plans" as never)
        .select("*")
        .eq("id", planId)
        .maybeSingle();
      setPlan((p as Plan | null) ?? null);
      setLoaded(true);
    })();
  }, [loading, user, planId, navigate]);

  const guide = plan ? FARMING_STAGES[plan.crop_type] : null;
  const completions = useMemo(
    () => new Set([...allCompletions].filter((key) => key.startsWith(`${planId}::`)).map((key) => key.slice(planId.length + 2))),
    [allCompletions, planId],
  );
  const days = plan ? Math.max(0, daysSince(plan.planting_date)) : 0;
  const currentStage = useMemo(() => {
    if (!guide) return null;
    return guide.stages.find((s) => days >= s.startDay && days < s.endDay) ?? guide.stages[Math.min(guide.stages.length - 1, guide.stages.findIndex((s) => days < s.startDay) - 1)] ?? guide.stages[guide.stages.length - 1];
  }, [guide, days]);

  // Auto-expand current stage
  useEffect(() => {
    if (currentStage) setOpenStages(new Set([currentStage.id]));
  }, [currentStage]);

  if (loading || !loaded) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">লোড হচ্ছে…</div>;
  }
  if (!plan || !guide || !currentStage) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <p className="text-gray-700 mb-3">পরিকল্পনা পাওয়া যায়নি</p>
          <Link to="/crop-guide" className="text-emerald-600 font-semibold">← ফিরুন</Link>
        </div>
      </div>
    );
  }

  const totalPct = Math.min(100, Math.round((days / guide.totalDays) * 100));

  function taskId(stageId: string, idx: number) { return `${stageId}::${idx}`; }

  function toggleStage(id: string) {
    setOpenStages((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function scrollToCurrent() {
    if (!currentStage) return;
    setOpenStages((p) => new Set(p).add(currentStage.id));
    requestAnimationFrame(() => {
      stageRefs.current[currentStage.id]?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  async function markComplete(stageId: string, idx: number) {
    if (!user) return;
    const tid = taskId(stageId, idx);
    if (completions.has(tid)) return;
    try {
      await complete.mutateAsync({ planId, taskId: tid });
    } catch {
      toast.error("সংরক্ষণ ব্যর্থ");
      return;
    }
    toast.success("কাজ সম্পন্ন হিসেবে চিহ্নিত");
  }

  async function handleShare() {
    const url = window.location.href;
    const title = `${guide?.icon ?? ""} ${plan?.crop_type ?? ""} পরামর্শ — কৃষক বন্ধু`;
    if (navigator.share) {
      try { await navigator.share({ title, url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("লিঙ্ক কপি হয়েছে");
    }
  }

  return (
    <main className="min-h-screen bg-[#F0FFF4] pb-24 md:max-w-[560px] md:mx-auto">
      {/* Top bar */}
      <header className="px-5 pt-8 pb-5 rounded-b-3xl text-white" style={{ background: "var(--gradient-brand)" }}>
        <div className="flex items-center justify-between mb-3">
          <Link to="/crop-guide" aria-label="ফিরে যান" className="h-9 w-9 rounded-full bg-white/15 flex items-center justify-center">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <button onClick={handleShare} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 text-sm font-semibold">
            <Share2 className="h-4 w-4" /> শেয়ার
          </button>
        </div>
        <h1 className="text-2xl font-bold inline-flex items-center gap-2"><CropIcon crop={plan.crop_type} /> {plan.crop_type} পরামর্শ</h1>

        {/* Progress */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-white/90 mb-1.5">
            <span>{toBn(days)} দিন / মোট {toBn(guide.totalDays)} দিন</span>
            <span>{toBn(totalPct)}%</span>
          </div>
          <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all" style={{ width: `${totalPct}%` }} />
          </div>
          <div className="mt-3 flex items-center gap-1 overflow-x-auto no-scrollbar">
            {guide.stages.map((s) => {
              const isPast = days >= s.endDay;
              const isCurrent = currentStage.id === s.id;
              return (
                <div key={s.id} className="flex items-center gap-1 shrink-0">
                  <span className={`text-lg ${isPast ? "opacity-100" : isCurrent ? "" : "opacity-50"}`}>{s.icon}</span>
                  <span className={`text-[10px] ${isPast ? "text-white" : isCurrent ? "text-white font-bold" : "text-white/60"}`}>
                    {isPast ? "✓" : isCurrent ? "●" : "○"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </header>

      {/* Crop finance ledger — sticky, always on top */}
      {user && <CropFinanceSection userId={user.id} planId={planId} cropType={plan.crop_type} />}

      {/* Planting info card */}
      <section className="px-5 mt-5">
        <div className="bg-white rounded-2xl p-4 shadow-sm ring-1 ring-emerald-100 space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-3xl"><CropIcon crop={plan.crop_type} /></span>
            <span className="font-bold text-lg text-gray-900">{plan.crop_type}</span>
          </div>
          <p className="text-gray-700"><strong>রোপণের তারিখ:</strong> {formatBnDate(plan.planting_date)}</p>
          <p className="text-gray-700"><strong>মৌসুম:</strong> {guide.season}</p>
          <p className="text-gray-700"><strong>জাত:</strong> {guide.varieties.slice(0, 2).join(", ")}</p>
          <p className="text-gray-700"><strong>আনুমানিক ফলন:</strong> {guide.yield}</p>
          <p className="text-gray-700"><strong>মাটি:</strong> {guide.soil}</p>
        </div>
      </section>

      {/* Current stage banner */}
      <section className="px-5 mt-4">
        <button
          onClick={scrollToCurrent}
          className="w-full rounded-2xl bg-sky-50 ring-1 ring-sky-200 p-4 flex items-center justify-between text-left"
        >
          <div>
            <p className="text-xs font-semibold text-sky-700">বর্তমান পর্যায়</p>
            <p className="font-bold text-gray-900 mt-0.5">{currentStage.icon} {currentStage.name}</p>
            <p className="text-xs text-gray-600 mt-0.5">{currentStage.dayRange}</p>
          </div>
          <ArrowDown className="h-5 w-5 text-sky-600" />
        </button>
      </section>

      {user && <CropFinanceSection userId={user.id} planId={planId} cropType={plan.crop_type} />}

      <CropKnowledgePanel cropType={plan.crop_type} plantingDate={plan.planting_date} days={days} completions={completions} />

      {user && (
        <SprayScheduleSection
          userId={user.id}
          planId={planId}
          cropType={plan.crop_type}
          plantingDate={plan.planting_date}
          days={days}
          completions={completions}
          onComplete={async (tid) => {
            if (completions.has(tid)) return;
            try {
              await complete.mutateAsync({ planId, taskId: tid });
            } catch { toast.error("সংরক্ষণ ব্যর্থ"); return; }
            await markSprayReminderDone(planId, plan.crop_type, plan.planting_date, tid).catch(() => {});
            toast.success("স্প্রে সম্পন্ন হিসেবে চিহ্নিত");
          }}
        />
      )}

      {/* Stage timeline */}
      <section className="px-5 mt-5 space-y-3">
        <h2 className="text-lg font-bold text-gray-900">সম্পূর্ণ পর্যায়সমূহ</h2>
        {guide.stages.map((stage) => {
          const isPast = days >= stage.endDay;
          const isCurrent = currentStage.id === stage.id;
          const isOpen = openStages.has(stage.id);
          const stageStart = formatBnDate(addDays(plan.planting_date, stage.startDay));
          const stageEnd = formatBnDate(addDays(plan.planting_date, stage.endDay));
          return (
            <div
              key={stage.id}
              ref={(el) => { stageRefs.current[stage.id] = el; }}
              className={`bg-white rounded-2xl shadow-sm overflow-hidden ${
                isCurrent ? "border-l-4 border-emerald-500 ring-1 ring-emerald-200" :
                isPast ? "opacity-70" : "ring-1 ring-gray-100"
              }`}
            >
              <button onClick={() => toggleStage(stage.id)} className="w-full p-4 flex items-center justify-between text-left">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">{stage.icon}</span>
                    <span className="font-bold text-gray-900">{stage.name}</span>
                    {isCurrent && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">বর্তমান</span>}
                    {isPast && <span className="text-emerald-600 text-sm">✓</span>}
                  </div>
                  <p className="text-xs text-gray-600">{stageStart} – {stageEnd}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{toBn(stage.tasks.length)}টি কার্যক্রম</p>
                </div>
                {isOpen ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
              </button>

              {isOpen && (
                <div className="px-4 pb-4 space-y-2">
                  {stage.tasks.map((task, idx) => {
                    const tid = taskId(stage.id, idx);
                    const done = completions.has(tid);
                    const cfg = TASK_TYPE_CONFIG[task.type as TaskType];
                    return (
                      <button
                        key={idx}
                        onClick={() => setActiveTask({ task, stage, idx })}
                        className="w-full bg-gray-50 hover:bg-gray-100 rounded-xl p-3 flex items-center gap-3 text-left transition"
                      >
                        <div
                          className="h-12 w-12 rounded-lg shrink-0 flex items-center justify-center text-2xl"
                          style={{ background: cfg.color + "22" }}
                        >
                          {cfg.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`font-semibold text-sm truncate ${done ? "line-through text-gray-400" : "text-gray-900"}`}>{task.title}</p>
                            {done && <Check className="h-4 w-4 text-emerald-600 shrink-0" />}
                          </div>
                          <span
                            className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                            style={{ background: cfg.color + "22", color: cfg.color }}
                          >
                            {cfg.icon} {cfg.label}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* Task detail bottom sheet */}
      <Sheet open={!!activeTask} onOpenChange={(o) => !o && setActiveTask(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
          {activeTask && (() => {
            const cfg = TASK_TYPE_CONFIG[activeTask.task.type as TaskType];
            const tid = taskId(activeTask.stage.id, activeTask.idx);
            const done = completions.has(tid);
            const isWarning = activeTask.task.type === "disease" || activeTask.task.type === "pest";
            return (
              <>
                <SheetHeader>
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block px-2 py-1 rounded-full text-[11px] font-bold"
                      style={{ background: cfg.color + "22", color: cfg.color }}
                    >
                      {cfg.icon} {cfg.label}
                    </span>
                  </div>
                  <SheetTitle className="text-left text-lg">{activeTask.task.title}</SheetTitle>
                </SheetHeader>

                <div className="mt-4 space-y-4">
                  <div
                    className="h-32 rounded-xl flex items-center justify-center text-6xl"
                    style={{ background: cfg.color + "15" }}
                  >
                    {activeTask.stage.icon}
                  </div>

                  <p className="text-sm text-gray-700 leading-relaxed">{activeTask.task.desc}</p>

                  {isWarning && (
                    <div className="rounded-xl bg-amber-50 ring-1 ring-amber-200 p-3 flex gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-800">সতর্কতা: সঠিক মাত্রায় ও সময়ে ব্যবহার করুন। সন্দেহ হলে কৃষি কর্মকর্তার পরামর্শ নিন।</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      onClick={() => markComplete(activeTask.stage.id, activeTask.idx)}
                      disabled={done}
                      className="py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm disabled:bg-emerald-300 inline-flex items-center justify-center gap-1.5"
                    >
                      <Check className="h-4 w-4" /> {done ? "সম্পন্ন" : "সম্পন্ন হয়েছে"}
                    </button>
                    <button
                      onClick={() => toast.info("রিমাইন্ডার শীঘ্রই আসছে")}
                      className="py-3 rounded-xl bg-sky-50 text-sky-700 font-bold text-sm ring-1 ring-sky-200 inline-flex items-center justify-center gap-1.5"
                    >
                      <Bell className="h-4 w-4" /> রিমাইন্ডার
                    </button>
                  </div>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </main>
  );
}
