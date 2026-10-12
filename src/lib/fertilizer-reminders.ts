// Fertilizer reminders computed from the plan's (variety-scaled) stage tasks.
// Reuses crop_reminders so the daily 6 AM job delivers them.
import { FARMING_STAGES } from "@/data/farming-guide";
import { supabase } from "@/integrations/supabase/client";
import { addDays, toIsoDate } from "@/lib/bn-date";
import { scaleGuide, varietyDays } from "@/lib/crop-timeline";

export const FERT_REMINDER_PREFIX = "🌱 সার: ";

export function buildFertilizerEvents(cropType: string, variety?: string | null) {
  const base = FARMING_STAGES[cropType];
  if (!base) return [];
  const g = scaleGuide(base, varietyDays(cropType, variety));
  return g.stages.flatMap((s) =>
    s.tasks
      .filter((t) => t.type === "fertilizer")
      .map((t) => ({ day: s.startDay, title: t.title, note: t.desc.slice(0, 120) })),
  );
}

export async function syncFertilizerReminders(
  userId: string,
  planId: string,
  cropType: string,
  plantingDate: string,
  variety?: string | null,
) {
  const today = toIsoDate(new Date());
  const { data: existing } = await supabase
    .from("crop_reminders")
    .select("title, reminder_date")
    .eq("plan_id", planId)
    .like("title", `${FERT_REMINDER_PREFIX}%`);
  const have = new Set((existing ?? []).map((r) => `${r.title}|${r.reminder_date}`));
  const rows = buildFertilizerEvents(cropType, variety)
    .map((e) => ({
      user_id: userId,
      plan_id: planId,
      crop_type: cropType,
      title: `${FERT_REMINDER_PREFIX}${e.title}`,
      note: e.note,
      reminder_date: toIsoDate(addDays(plantingDate, e.day)),
    }))
    .filter((r) => r.reminder_date >= today && !have.has(`${r.title}|${r.reminder_date}`));
  if (!rows.length) return 0;
  const { error } = await supabase.from("crop_reminders").insert(rows);
  if (error) throw error;
  return rows.length;
}
