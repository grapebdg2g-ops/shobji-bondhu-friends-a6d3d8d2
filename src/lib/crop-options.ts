import { getAllCrops, type CropData } from "@/data/master-crop-data";
import { CROPS as FERTILIZER_CROPS } from "@/data/fertilizer-guide";

/**
 * Canonical crop options derived from src/data/master-crop-data.ts.
 * Keep persisted Bengali names stable while all new selectors use this catalog.
 */
export const MASTER_CROP_OPTIONS = getAllCrops().map((crop) => ({
  id: crop.id,
  label: crop.name,
  nameEn: crop.nameEn,
  icon: crop.icon,
  category: crop.category,
}));

export type CropOption = (typeof MASTER_CROP_OPTIONS)[number];
export type CropLabel = CropOption["label"];

export const MASTER_CROP_LABELS = MASTER_CROP_OPTIONS.map((crop) => crop.label);

/** Special values used by older profile/post rows and category-oriented forms. */
export const LEGACY_CROP_LABELS = ["ধান", "সবজি", "ফল", "মসলা", "অন্যান্য"] as const;

/** Full profile/registration list. Legacy values remain selectable for compatibility. */
export const PROFILE_CROP_LABELS = Array.from(
  new Set([...MASTER_CROP_LABELS, ...LEGACY_CROP_LABELS]),
);

/** Community crop tag/filter list. "সব ফসল" is a UI sentinel, not a persisted crop tag. */
export const COMMUNITY_CROP_LABELS = ["সব ফসল", ...MASTER_CROP_LABELS] as const;

/** AI crop context should use actual crops from the master catalog, not broad categories. */
export const AI_CROP_LABELS = MASTER_CROP_LABELS;

/** Master crop options annotated with the legacy fertilizer calculator id when available. */
export const CALCULATOR_CROP_OPTIONS = MASTER_CROP_OPTIONS.map((crop) => ({
  ...crop,
  calculatorId:
    FERTILIZER_CROPS.find((fertilizerCrop) => fertilizerCrop.label === crop.label)?.id ?? null,
}));

export const POPULAR_CROP_OPTIONS = [
  "বোরো ধান",
  "আলু",
  "টমেটো",
  "পেঁয়াজ",
  "মরিচ",
  "রসুন",
  "ভুট্টা",
  "বেগুন",
  "পেঁপে",
]
  .map((label) => getCropOptionByLabel(label))
  .filter((crop): crop is CropOption => Boolean(crop));

export function getCropByLabel(label: string | null | undefined): CropData | null {
  if (!label) return null;
  return getAllCrops().find((crop) => crop.name === label) ?? null;
}

export function getCropOptionByLabel(label: string | null | undefined): CropOption | null {
  if (!label) return null;
  return MASTER_CROP_OPTIONS.find((crop) => crop.label === label) ?? null;
}
