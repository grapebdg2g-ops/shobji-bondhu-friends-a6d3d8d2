// Variety-aware timeline: stretches/shrinks a crop's stage boundaries to the
// chosen variety's harvest duration, keeping stages contiguous (0..totalDays).
import { getAllCrops } from "@/data/master-crop-data";

type StageLike = { startDay: number; endDay: number };

/** Days to harvest for a named variety of a crop (by Bangla crop name), if known. */
export function varietyDays(cropName: string, variety?: string | null): number | null {
  if (!variety) return null;
  const c = getAllCrops().find((x) => x.name === cropName);
  const v = c?.varieties.find((x) => x.name.trim().toLowerCase() === variety.trim().toLowerCase());
  return v?.daysToHarvest ?? null;
}

/** Scale factor is clamped to 0.7–1.3 so a typo'd/odd variety can't distort the plan. */
export function scaleGuide<S extends StageLike, G extends { totalDays: number; stages: S[] }>(
  guide: G,
  targetDays: number | null,
): G {
  if (!targetDays || targetDays === guide.totalDays || guide.totalDays <= 0) return guide;
  const f = Math.min(1.3, Math.max(0.7, targetDays / guide.totalDays));
  const total = Math.round(guide.totalDays * f);
  const at = (d: number) => Math.min(total, Math.round(d * f));
  return {
    ...guide,
    totalDays: total,
    stages: guide.stages.map((s, i) => ({
      ...s,
      startDay: i === 0 ? 0 : at(s.startDay),
      endDay: i === guide.stages.length - 1 ? total : at(s.endDay),
    })),
  };
}
