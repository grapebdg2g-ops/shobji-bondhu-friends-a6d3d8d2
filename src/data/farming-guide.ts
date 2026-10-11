// src/data/farming-guide.ts
// Thin adapter — derives the legacy FARMING_STAGES shape from master-crop-data.
// Source of truth: src/data/master-crop-data.ts

import { CROPS, type CropData, type Stage, type Task } from "./master-crop-data";

export type TaskType =
  | "preparation"
  | "task"
  | "fertilizer"
  | "irrigation"
  | "disease"
  | "pest"
  | "harvest"
  | "post-harvest";

export interface FarmingTask {
  title: string;
  desc: string;
  image: string;
  type: TaskType;
}

export interface FarmingStage {
  id: string;
  name: string;
  icon: string;
  dayRange: string;
  startDay: number;
  endDay: number;
  tasks: FarmingTask[];
}

export interface CropGuide {
  icon: string;
  season: string;
  totalDays: number;
  yield: string;
  varieties: string[];
  soil: string;
  stages: FarmingStage[];
}

const bn = (n: number) => n.toString().replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);

function mapTask(t: Task): FarmingTask {
  return {
    title: t.title,
    desc: t.desc + (t.timing ? ` (${t.timing})` : ""),
    image: "",
    type: t.type as TaskType,
  };
}

function mapStage(s: Stage): FarmingStage {
  return {
    id: s.id,
    name: s.name,
    icon: s.icon,
    startDay: s.startDay,
    endDay: s.endDay,
    dayRange: `${bn(s.startDay)}-${bn(s.endDay)} দিন`,
    tasks: s.tasks.map(mapTask),
  };
}

function mapCrop(c: CropData): CropGuide {
  return {
    icon: c.icon,
    season: `${c.seasons.join("/")} (${c.plantingMonths.map(bn).join(", ")} মাসে রোপণ)`,
    totalDays: c.totalDays,
    yield: `${bn(c.yieldMin)}-${bn(c.yieldMax)} মণ/বিঘা`,
    varieties: c.varieties.map((v) => v.name),
    soil: `${c.soilTypes.join(", ")} মাটি, pH ${c.phRange.min}-${c.phRange.max}`,
    stages: c.stages.map(mapStage),
  };
}

// Bengali-name-keyed for backward compatibility with existing
// user_crop_plans.crop_type rows that store Bangla names.
export const FARMING_STAGES: Record<string, CropGuide> = Object.fromEntries(
  Object.values(CROPS).map((c) => [c.name, mapCrop(c)]),
);

export const TASK_TYPE_CONFIG: Record<TaskType, { color: string; label: string; icon: string }> = {
  preparation: { color: "#0EA5E9", label: "প্রস্তুতি", icon: "🛠️" },
  task: { color: "#2D6A4F", label: "কাজ", icon: "✅" },
  fertilizer: { color: "#0891B2", label: "সার", icon: "💊" },
  irrigation: { color: "#0284C7", label: "সেচ", icon: "💧" },
  disease: { color: "#DC2626", label: "রোগ", icon: "🔴" },
  pest: { color: "#D97706", label: "পোকা", icon: "🐛" },
  harvest: { color: "#CA8A04", label: "সংগ্রহ", icon: "🌾" },
  "post-harvest": { color: "#7C3AED", label: "বিপণন", icon: "🏪" },
};
