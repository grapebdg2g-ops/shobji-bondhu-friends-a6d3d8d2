// src/lib/crop-data.ts
// Compact crop knowledge used by chat.functions.ts for smarter cache
// matching, enriched embeddings and master-data enriched prompts.
// Data is distilled from src/data/master-crop-data.ts.

import { MASTER_CROP_LABELS } from "@/lib/crop-options";

export const CROP_NAMES = Array.from(new Set(["ধান", ...MASTER_CROP_LABELS]));

export const CROP_DISEASES: Record<string, string[]> = {
  ধান: ["ব্লাস্ট", "বাদামি গাছফড়িং", "মাজরা পোকা", "টুংরো ভাইরাস", "শীথ ব্লাইট"],
  টমেটো: [
    "আর্লি ব্লাইট",
    "লেট ব্লাইট",
    "টমেটো বোরার",
    "মোজাইক ভাইরাস",
    "অ্যান্থ্রাকনোজ",
    "শোষক পোকা",
    "পাউডারি মিলডিউ",
  ],
  আলু: ["লেট ব্লাইট", "আর্লি ব্লাইট", "স্ক্যাব", "ব্যাকটেরিয়াল উইল্ট"],
  বেগুন: ["ডগা ছিদ্রকারী পোকা", "ফল ছিদ্রকারী পোকা", "জাব পোকা", "লাল মাকড়"],
  পেঁয়াজ: ["থ্রিপস", "পার্পল ব্লচ", "ডাউনি মিলডিউ"],
  সরিষা: ["জাব পোকা", "পাউডারি মিলডিউ", "আল্টারনেরিয়া ব্লাইট"],
  ফুলকপি: ["ডায়মন্ড ব্যাক মথ", "ক্লাব রুট", "কালো পচা"],
  বাঁধাকপি: ["ডায়মন্ড ব্যাক মথ", "এফিড", "কালো পচা"],
  মরিচ: ["থ্রিপস", "অ্যান্থ্রাকনোজ", "চিলি ভেইন মটল ভাইরাস"],
  শসা: ["ডাউনি মিলডিউ", "লাল মাকড়", "ফ্রুট ফ্লাই"],
  করলা: ["ফ্রুট ফ্লাই", "পাউডারি মিলডিউ"],
  ভুট্টা: ["ফল আর্মিওয়ার্ম", "মাজরা পোকা", "ডাউনি মিলডিউ"],
  গম: ["হুইট ব্লাস্ট", "রাস্ট", "জাব পোকা"],
  আদা: ["রাইজোম রট", "পাতা দাগ রোগ"],
  হলুদ: ["রাইজোম রট", "পাতা পচা"],
};

export type FertilizerDose = {
  urea: number;
  tsp: number;
  mop: number;
  gypsum: number;
  zinc: number;
  boron?: number;
};

export const CROP_FERTILIZERS: Record<string, FertilizerDose> = {
  "বোরো ধান": { urea: 20, tsp: 7, mop: 11, gypsum: 8, zinc: 1.5 },
  "আমন ধান": { urea: 16, tsp: 5, mop: 8, gypsum: 5, zinc: 1.0 },
  টমেটো: { urea: 25, tsp: 12, mop: 16, gypsum: 7, zinc: 1.5, boron: 0.5 },
  আলু: { urea: 22, tsp: 14, mop: 20, gypsum: 8, zinc: 1.5 },
  পেঁয়াজ: { urea: 18, tsp: 9, mop: 10, gypsum: 5, zinc: 1.0 },
  রসুন: { urea: 16, tsp: 9, mop: 10, gypsum: 5, zinc: 1.0, boron: 0.4 },
  সরিষা: { urea: 14, tsp: 8, mop: 7, gypsum: 8, zinc: 0.8, boron: 0.5 },
  গম: { urea: 18, tsp: 7, mop: 6, gypsum: 5, zinc: 1.0, boron: 0.5 },
  ভুট্টা: { urea: 27, tsp: 10, mop: 11, gypsum: 7, zinc: 1.5 },
  বেগুন: { urea: 22, tsp: 10, mop: 13, gypsum: 6, zinc: 1.0 },
  মরিচ: { urea: 20, tsp: 10, mop: 12, gypsum: 5, zinc: 1.0, boron: 0.5 },
};

export type SeasonInfo = {
  plantingMonths: number[];
  harvestMonths: number[];
  season: string;
  earlyPlanting?: number[];
  earlyHarvest?: number[];
  earlyAdvantage?: string;
};

export const CROP_SEASONS: Record<string, SeasonInfo> = {
  "বোরো ধান": { plantingMonths: [12, 1], harvestMonths: [4, 5], season: "রবি" },
  "আমন ধান": { plantingMonths: [7, 8], harvestMonths: [11, 12], season: "খরিফ-২" },
  "আউশ ধান": { plantingMonths: [4, 5], harvestMonths: [8, 9], season: "খরিফ-১" },
  টমেটো: {
    plantingMonths: [9, 10, 11],
    harvestMonths: [1, 2, 3],
    season: "রবি",
    earlyPlanting: [8, 9],
    earlyHarvest: [12, 1],
    earlyAdvantage: "ডিসেম্বরে বেশি দাম",
  },
  আলু: { plantingMonths: [10, 11], harvestMonths: [1, 2, 3], season: "রবি" },
  পেঁয়াজ: { plantingMonths: [11, 12, 1], harvestMonths: [3, 4], season: "রবি" },
  সরিষা: { plantingMonths: [10, 11], harvestMonths: [1, 2], season: "রবি" },
  গম: { plantingMonths: [11, 12], harvestMonths: [3, 4], season: "রবি" },
  ভুট্টা: { plantingMonths: [11, 12], harvestMonths: [4, 5], season: "রবি" },
  মরিচ: { plantingMonths: [9, 10], harvestMonths: [1, 2, 3, 4], season: "রবি" },
  বেগুন: { plantingMonths: [9, 10], harvestMonths: [12, 1, 2, 3], season: "রবি" },
  রসুন: { plantingMonths: [10, 11], harvestMonths: [3, 4], season: "রবি" },
};

export type MarketInfo = {
  avgPrice: number;
  bestMonths: number[];
  demandLevel: string;
  exportPotential: boolean;
  profitMin: number;
  profitMax: number;
};

export const CROP_MARKET: Record<string, MarketInfo> = {
  টমেটো: {
    avgPrice: 600,
    bestMonths: [1, 2, 12],
    demandLevel: "বেশি",
    exportPotential: true,
    profitMin: 38000,
    profitMax: 58000,
  },
  আলু: {
    avgPrice: 500,
    bestMonths: [3, 4, 5, 6],
    demandLevel: "বেশি",
    exportPotential: true,
    profitMin: 15000,
    profitMax: 40000,
  },
  পেঁয়াজ: {
    avgPrice: 2000,
    bestMonths: [5, 6, 7, 10, 11],
    demandLevel: "বেশি",
    exportPotential: true,
    profitMin: 64000,
    profitMax: 124000,
  },
  "বোরো ধান": {
    avgPrice: 800,
    bestMonths: [5, 6],
    demandLevel: "বেশি",
    exportPotential: false,
    profitMin: 18000,
    profitMax: 24000,
  },
  "আমন ধান": {
    avgPrice: 900,
    bestMonths: [12, 1],
    demandLevel: "বেশি",
    exportPotential: false,
    profitMin: 15000,
    profitMax: 22000,
  },
  মরিচ: {
    avgPrice: 3000,
    bestMonths: [4, 5, 6],
    demandLevel: "বেশি",
    exportPotential: false,
    profitMin: 40000,
    profitMax: 90000,
  },
  সরিষা: {
    avgPrice: 2500,
    bestMonths: [2, 3],
    demandLevel: "মাঝারি",
    exportPotential: false,
    profitMin: 12000,
    profitMax: 20000,
  },
};

const BN_MONTHS = [
  "",
  "জানু",
  "ফেব্রু",
  "মার্চ",
  "এপ্রিল",
  "মে",
  "জুন",
  "জুলাই",
  "আগস্ট",
  "সেপ্টে",
  "অক্টো",
  "নভে",
  "ডিসে",
];
export const bnMonth = (m: number) => BN_MONTHS[m] ?? String(m);

// ── Detection ────────────────────────────────────────────

const CROP_ALIASES: Record<string, string[]> = {
  "বোরো ধান": ["বোরো"],
  "আমন ধান": ["আমন"],
  "আউশ ধান": ["আউশ"],
  ধান: ["চাল", "ধানগাছ"],
  টমেটো: ["বিলাতি বেগুন"],
  "মিষ্টি কুমড়া": ["কুমড়া", "মিষ্টিকুমড়া"],
};

export function detectCropFromMasterData(question: string): string | null {
  // Longest-name-first so "বোরো ধান" matches before "ধান"
  const sorted = [...CROP_NAMES].sort((a, b) => b.length - a.length);
  for (const crop of sorted) {
    if (question.includes(crop)) return crop;
  }
  for (const [crop, aliases] of Object.entries(CROP_ALIASES)) {
    if (aliases.some((a) => question.includes(a))) return crop;
  }
  return null;
}

const SYMPTOM_MAP: Record<string, string[]> = {
  ব্লাস্ট: ["ধূসর দাগ", "হীরা আকার", "কালো দাগ থোড়ে"],
  "লেট ব্লাইট": ["জলসিক্ত", "কালো হয়ে", "পাতা পচছে", "নাভি ধসা"],
  "আর্লি ব্লাইট": ["বাদামি দাগ", "গোলাকার দাগ", "হলুদ বলয়"],
  "জাব পোকা": ["ছোট পোকা", "পাতার রস", "আঠালো", "কুঁকড়ে"],
  "মাজরা পোকা": ["ডেড হার্ট", "শুকিয়ে", "কাণ্ড ছিদ্র"],
  থ্রিপস: ["রুপালি দাগ", "পাতা কুঁকড়ে", "ছোট পোকা পাতায়"],
  "পাউডারি মিলডিউ": ["সাদা গুঁড়া", "ময়দার মতো"],
  "ডাউনি মিলডিউ": ["হলুদ দাগ উপরে", "ধূসর ছত্রাক নিচে"],
};

export function detectDiseaseFromMasterData(
  question: string,
  cropType: string | null,
): string | null {
  if (cropType) {
    const diseases = CROP_DISEASES[cropType] ?? [];
    for (const d of diseases) if (question.includes(d)) return d;
  }
  for (const [disease, symptoms] of Object.entries(SYMPTOM_MAP)) {
    if (symptoms.some((s) => question.includes(s))) return disease;
  }
  return null;
}

export function buildMasterDataContext(
  cropType: string | null,
  disease: string | null,
  category: string,
): string {
  let ctx = "";
  if (cropType && CROP_FERTILIZERS[cropType]) {
    const f = CROP_FERTILIZERS[cropType];
    ctx +=
      `\n${cropType} এর সার তথ্য (BRRI/BARI, প্রতি বিঘা):\n` +
      `ইউরিয়া: ${f.urea} কেজি, TSP: ${f.tsp} কেজি, MOP: ${f.mop} কেজি, Gypsum: ${f.gypsum} কেজি, Zinc: ${f.zinc} কেজি` +
      (f.boron ? `, Boron: ${f.boron} কেজি` : "");
  }
  if (disease && cropType) {
    ctx += `\nসনাক্তকৃত সমস্যা: ${disease} (${cropType})। দ্রুত ও কার্যকর সমাধান দাও।`;
  }
  if (category === "market" && cropType && CROP_MARKET[cropType]) {
    const m = CROP_MARKET[cropType];
    ctx += `\n${cropType} বাজার তথ্য: গড় দাম ৳${m.avgPrice}/মণ, সেরা মাস ${m.bestMonths.map(bnMonth).join(", ")}, চাহিদা ${m.demandLevel}, লাভ ৳${m.profitMin}-${m.profitMax}/বিঘা।`;
  }
  if (category === "planting" && cropType && CROP_SEASONS[cropType]) {
    const t = CROP_SEASONS[cropType];
    ctx += `\n${cropType} চাষের সময়: মৌসুম ${t.season}, রোপণ ${t.plantingMonths.map(bnMonth).join(", ")}, সংগ্রহ ${t.harvestMonths.map(bnMonth).join(", ")}।`;
    if (t.earlyPlanting) {
      ctx += ` আগাম চাষ ${t.earlyPlanting.map(bnMonth).join(", ")} মাসে — ${t.earlyAdvantage}।`;
    }
  }
  return ctx;
}
