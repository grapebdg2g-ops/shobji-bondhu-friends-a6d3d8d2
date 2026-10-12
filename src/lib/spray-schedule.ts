// Crop-based spray schedule derived from master crop stages (pest/disease tasks)
// and the pesticide guide. Spray reminders reuse the crop_reminders table so the
// existing daily 6 AM reminder notifications deliver them.
import { FARMING_STAGES } from "@/data/farming-guide";
import { PESTICIDE_GUIDE, type Problem } from "@/data/pesticide-guide";
import { supabase } from "@/integrations/supabase/client";
import { addDays, toIsoDate } from "@/lib/bn-date";
import { buildTomatoSchedule } from "@/lib/tomato-spray-schedule";
import { getGapProfile } from "@/data/gap-protocol";
import { firstHarvestDay } from "@/lib/crop-stage";
import { maxPhiDays } from "@/lib/spray-tools";
import { getBioOptions } from "@/data/crop-knowledge";
import { toBn } from "@/lib/bn";

export const SPRAY_REMINDER_PREFIX = "🧪 স্প্রে: ";

export type SprayEvent = {
  id: string; // stored in crop_task_completions.task_id
  day: number;
  title: string;
  desc: string;
  kind: "pest" | "disease" | "nutrient";
  stageName: string;
  stageIcon: string;
  problem?: Problem;
};

function matchProblem(title: string, desc: string): Problem | undefined {
  const text = `${title} ${desc}`;
  const exact = PESTICIDE_GUIDE.find((p) => text.includes(p.name));
  if (exact) return exact;
  return PESTICIDE_GUIDE.find((p) => {
    const key = p.name.split(/[\s(]/)[0];
    return key.length > 2 && text.includes(key);
  });
}

export function buildSpraySchedule(cropType: string, plantingDate?: string): SprayEvent[] {
  const guide = FARMING_STAGES[cropType];
  if (!guide) return [];
  if (cropType === "টমেটো" && plantingDate)
    return buildTomatoSchedule(
      plantingDate,
      guide.totalDays,
      firstHarvestDay(guide.stages, guide.totalDays),
    );
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

/** Marks the reminder for a completed spray as done so it is no longer notified or listed. */
export async function markSprayReminderDone(
  planId: string,
  cropType: string,
  plantingDate: string,
  eventId: string,
) {
  const e = buildSpraySchedule(cropType, plantingDate).find((x) => x.id === eventId);
  if (!e) return;
  const { error } = await supabase
    .from("crop_reminders")
    .update({ is_done: true })
    .eq("plan_id", planId)
    .in("title", [
      `${SPRAY_REMINDER_PREFIX}${e.title}`,
      `${SPRAY_REMINDER_PREFIX}জৈব বিকল্প: ${e.title}`,
    ])
    .eq("reminder_date", toIsoDate(addDays(plantingDate, e.day)));
  if (error) throw error;
}

/** Harvest (first picking) day for a crop — PHI is counted from here. */
export function harvestStartFor(cropType: string): number {
  const g = FARMING_STAGES[cropType];
  return g ? firstHarvestDay(g.stages, g.totalDays) : 0;
}

/** Longest PHI among every chemical offered for this event (not just the first). */
export function eventPhiDays(e: SprayEvent): number {
  return e.problem ? maxPhiDays(e.problem.chemicals.map((c) => c.name)) : 0;
}

/**
 * Harvest-safety for every plan: a chemical spray whose PHI runs past the first
 * harvest day becomes a safe bio alternative. GAP plans additionally honour the
 * crop's stricter GAP PHI.
 */
export function applyPhiSafety(
  events: SprayEvent[],
  cropType: string,
  isGap = false,
): SprayEvent[] {
  const harvestDay = harvestStartFor(cropType);
  const gapPhi = isGap ? (getGapProfile(cropType)?.phiDays ?? 0) : 0;
  return events.map((e) => {
    if (!e.problem) return e;
    const daysLeft = harvestDay - e.day;
    const phi = Math.max(eventPhiDays(e), gapPhi);
    if (phi === 0 || daysLeft > phi) return e;
    const bio = getBioOptions(`${e.title} ${e.desc} ${e.problem.name}`);
    const altText =
      bio.length > 0
        ? bio.map((b) => `${b.name} — ${b.dose} (${b.method})`).join("; ")
        : (e.problem.organic[0] ?? "নিম তেল ৫ মিলি/লিটার পানি");
    return {
      ...e,
      title: `জৈব বিকল্প: ${e.title}`,
      desc: `${isGap ? "🛡️ GAP নিয়ম: " : "⛔ "}ফসল তোলা শুরুর আনুমানিক ${toBn(Math.max(0, daysLeft))} দিন বাকি, কিন্তু রাসায়নিকের বিষ কাটতে ${toBn(phi)} দিন লাগে — তাই এখন রাসায়নিক নয়। নিরাপদ বিকল্প: ${altText}`,
      problem: undefined,
    };
  });
}

/** GAP mode wrapper (kept for existing callers). */
export function applyGapSchedule(events: SprayEvent[], cropType: string): SprayEvent[] {
  return applyPhiSafety(events, cropType, true);
}

/** Creates reminders for all upcoming spray dates of a plan (skips existing ones). */
export async function syncSprayReminders(
  userId: string,
  planId: string,
  cropType: string,
  plantingDate: string,
  isGap = false,
) {
  const today = toIsoDate(new Date());
  const base = buildSpraySchedule(cropType, plantingDate);
  const events = applyPhiSafety(base, cropType, isGap);
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
      note: e.problem?.chemicals[0]
        ? `${e.problem.chemicals[0].name} · ${e.problem.chemicals[0].dose}`
        : e.desc.slice(0, 120),
      reminder_date: toIsoDate(addDays(plantingDate, e.day)),
    }))
    .filter((r) => r.reminder_date >= today && !have.has(`${r.title}|${r.reminder_date}`));
  if (rows.length === 0) return 0;
  const { error } = await supabase.from("crop_reminders").insert(rows);
  if (error) throw error;
  return rows.length;
}
