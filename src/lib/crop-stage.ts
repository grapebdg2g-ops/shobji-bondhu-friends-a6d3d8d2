// Single source of truth for "which stage is this plan in" and "when does harvest start".
// Half-open ranges [startDay, endDay); before day 0 → first stage, after the cycle → last stage.

type StageLike = { startDay: number; endDay: number; tasks: { type: string }[] };

export function stageAtDay<S extends StageLike>(stages: S[], day: number): S | null {
  if (!stages.length) return null;
  return (
    stages.find((s) => day >= s.startDay && day < s.endDay) ??
    (day < stages[0].startDay ? stages[0] : stages[stages.length - 1])
  );
}

/** First day farmers start picking — PHI must be counted from here, not the end of the cycle. */
export function firstHarvestDay(stages: StageLike[], totalDays: number): number {
  const h = stages.find((s) => s.tasks.some((t) => t.type === "harvest"));
  return h ? h.startDay : totalDays;
}
