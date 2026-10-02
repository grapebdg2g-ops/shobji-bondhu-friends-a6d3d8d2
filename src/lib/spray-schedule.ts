// Crop-based spray schedule derived from master crop stages (pest/disease tasks)
// and the pesticide guide. Spray reminders reuse the crop_reminders table so the
// existing daily 6 AM reminder notifications deliver them.
import { FARMING_STAGES } from "@/data/farming-guide";
import { PESTICIDE_GUIDE, type Problem } from "@/data/pesticide-guide";
import { supabase } from "@/integrations/supabase/client";
import { addDays, toIsoDate } from "@/lib/bn-date";

export const SPRAY_REMINDER_PREFIX = "🧪 স্প্রে: ";

export type SprayEvent = {
  id: string; // stored in crop_task_completions.task_id
  day: number;
  title: string;
  desc: string;
  kind: "pest" | "disease";
  stageName: string;
  stageIcon: string;
  problem?: Problem;
};

function matchProblem(title: string, desc: string): Problem | undefined {
  const text = `${title} ${desc}`;
  return PESTICIDE_GUIDE.find((p) => {
    const key = p.name.split(/[\s(]/)[0];
    return key.length > 2 && text.includes(key);
  });
}

export function buildSpraySchedule(cropType: string): SprayEvent[] {
  const guide = FARMING_STAGES[cropType];
  if (!guide) return [];
  const events: SprayEvent[] = [];
  for (const stage of guide.stages) {
    const sprays = stage.tasks
      .map((t, idx) => ({ t, idx }))
      .filter(({ t }) => t.type === "pest" || t.type === "disease");
    const span = Math.max(1, stage.endDay - stage.startDay);
    sprays.forEach(({ t, idx }, i) => {
      const offset = Math.min(span - 1, Math.round(((i + 1) * span) / (sprays.length + 1)));
      events.push({
        id: `spray::${stage.id}::${idx}`,
        day: stage.startDay + offset,
        title: t.title,
        desc: t.desc,
        kind: t.type as "pest" | "disease",
        stageName: stage.name,
        stageIcon: stage.icon,
        problem: matchProblem(t.title, t.desc),
      });
    });
  }
  return events.sort((a, b) => a.day - b.day);
}

/** Creates reminders for all upcoming spray dates of a plan (skips existing ones). */
export async function syncSprayReminders(userId: string, planId: string, cropType: string, plantingDate: string) {
  const today = toIsoDate(new Date());
  const events = buildSpraySchedule(cropType);
  const { data: existing } = await supabase
    .from("crop_reminders")
    .select("title, reminder_date")
    .eq("plan_id", planId)
    .like("title", `${SPRAY_REMINDER_PREFIX}%`);
  const have = new Set((existing ?? []).map((r) => `${r.title}|${r.reminder_date}`));
  const rows = events
    .map((e) => ({
      user_id: userId,
      plan_id: planId,
      crop_type: cropType,
      title: `${SPRAY_REMINDER_PREFIX}${e.title}`,
      note: e.problem?.chemicals[0] ? `${e.problem.chemicals[0].name} · ${e.problem.chemicals[0].dose}` : e.desc.slice(0, 120),
      reminder_date: toIsoDate(addDays(plantingDate, e.day)),
    }))
    .filter((r) => r.reminder_date >= today && !have.has(`${r.title}|${r.reminder_date}`));
  if (rows.length === 0) return 0;
  const { error } = await supabase.from("crop_reminders").insert(rows);
  if (error) throw error;
  return rows.length;
}
