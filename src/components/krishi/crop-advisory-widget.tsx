import { CropIcon } from "@/components/krishi/crop-icon";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight, ClipboardList } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/user-context";
import { FARMING_STAGES, type FarmingTask } from "@/data/farming-guide";
import { daysSince } from "@/lib/bn-date";
import { toBn } from "@/lib/bn";

type Plan = { id: string; crop_type: string; planting_date: string };

type UrgentItem = { plan: Plan; task: FarmingTask; stageName: string };

export function CropAdvisoryWidget() {
  const { user } = useUser();
  const [items, setItems] = useState<UrgentItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("user_crop_plans" as never)
        .select("id, crop_type, planting_date")
        .eq("user_id", user.id)
        .eq("is_active", true);
      const plans = (data as Plan[] | null) ?? [];
      const urgent: UrgentItem[] = [];
      for (const p of plans) {
        const guide = FARMING_STAGES[p.crop_type];
        if (!guide) continue;
        const days = Math.max(0, daysSince(p.planting_date));
        const stage = guide.stages.find((s) => days >= s.startDay && days < s.endDay);
        if (!stage || stage.tasks.length === 0) continue;
        urgent.push({ plan: p, task: stage.tasks[0], stageName: stage.name });
        if (urgent.length >= 2) break;
      }
      setItems(urgent);
      setLoaded(true);
    })();
  }, [user]);

  if (!loaded || items.length === 0) return null;

  return (
    <section className="px-5 mt-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-gray-900 inline-flex items-center gap-1.5">
          <ClipboardList className="h-5 w-5 text-emerald-600" /> আজকের ফসল পরামর্শ
        </h2>
        <div className="flex items-center gap-3"><Link to="/crop-diary" className="text-emerald-600 text-sm font-semibold">ডায়েরি</Link><Link to="/crop-guide" className="text-emerald-600 text-sm font-semibold">সব দেখুন</Link></div>
      </div>
      <div className="space-y-2">
        {items.map(({ plan, task, stageName }) => {
          const guide = FARMING_STAGES[plan.crop_type];
          const days = Math.max(0, daysSince(plan.planting_date));
          return (
            <Link
              key={plan.id}
              to="/crop-guide/plan/$planId"
              params={{ planId: plan.id }}
              className="block bg-white rounded-2xl p-3.5 shadow-sm ring-1 ring-emerald-100 active:scale-[0.99] transition"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl"><CropIcon crop={plan.crop_type} /></span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-emerald-700 font-semibold">{plan.crop_type} · {stageName} · {toBn(days)} দিন</p>
                  <p className="text-sm font-bold text-gray-900 truncate">{task.title}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400 shrink-0" />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
