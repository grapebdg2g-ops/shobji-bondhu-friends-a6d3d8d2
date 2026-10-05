// Structured agronomy knowledge layered on top of master-crop-data.ts.
// Pesticide chemistry (IRAC/FRAC, PHI, safety), stage irrigation, IPM rules, resistance checks.
import { getAllCrops, type CropData, type Stage } from "./master-crop-data";

export type ResistanceSystem = "IRAC" | "FRAC" | "পুষ্টি";

export interface ActiveIngredient {
  id: string;
  keywords: string[]; // Bengali/English substrings that identify the product
  ingredient: string;
  formulation: string;
  system: ResistanceSystem;
  group: string; // e.g. "6", "4A", "M03"
  groupName: string;
  phiDays: number;
  toxicity: "কম" | "মাঝারি" | "বেশি";
  safety: string;
}

export const ACTIVE_INGREDIENTS: ActiveIngredient[] = [
  { id: "abamectin", keywords: ["এবামেক্টিন", "ভার্টিম্যাক", "abamectin"], ingredient: "এবামেক্টিন", formulation: "১.৮% ইসি", system: "IRAC", group: "6", groupName: "অ্যাভারমেকটিন", phiDays: 7, toxicity: "বেশি", safety: "মৌমাছি ও মাছের জন্য বিষাক্ত — ফুল ফোটার সময় দুপুরে স্প্রে করবেন না" },
  { id: "emamectin", keywords: ["ইমামেক্টিন", "emamectin"], ingredient: "ইমামেক্টিন বেনজোয়েট", formulation: "৫% এসজি", system: "IRAC", group: "6", groupName: "অ্যাভারমেকটিন", phiDays: 7, toxicity: "মাঝারি", safety: "মৌমাছির জন্য ক্ষতিকর" },
  { id: "chlorpyrifos", keywords: ["ক্লোরপাইরিফস", "chlorpyrifos"], ingredient: "ক্লোরপাইরিফস", formulation: "২০% ইসি", system: "IRAC", group: "1B", groupName: "অর্গানোফসফেট", phiDays: 14, toxicity: "বেশি", safety: "গ্লাভস-মাস্ক বাধ্যতামূলক; শিশু ও পশু দূরে রাখুন" },
  { id: "dimethoate", keywords: ["ডাইমিথয়েট", "dimethoate"], ingredient: "ডাইমিথয়েট", formulation: "৪০% ইসি", system: "IRAC", group: "1B", groupName: "অর্গানোফসফেট", phiDays: 14, toxicity: "বেশি", safety: "চামড়ায় লাগলে সাবান দিয়ে ধুয়ে ফেলুন" },
  { id: "thiamethoxam", keywords: ["থায়ামেথক্সাম", "থায়ামোক্সাম", "thiamethoxam"], ingredient: "থায়ামেথক্সাম", formulation: "২৫% ডব্লিউজি", system: "IRAC", group: "4A", groupName: "নিওনিকোটিনয়েড", phiDays: 7, toxicity: "মাঝারি", safety: "মৌমাছির জন্য অত্যন্ত ক্ষতিকর" },
  { id: "imidacloprid", keywords: ["ইমিডাক্লোপ্রিড", "imidacloprid"], ingredient: "ইমিডাক্লোপ্রিড", formulation: "২০% এসএল", system: "IRAC", group: "4A", groupName: "নিওনিকোটিনয়েড", phiDays: 7, toxicity: "মাঝারি", safety: "মৌমাছির জন্য অত্যন্ত ক্ষতিকর" },
  { id: "acetamiprid", keywords: ["অ্যাসিটামিপ্রিড", "এসিটামিপ্রিড", "acetamiprid"], ingredient: "অ্যাসিটামিপ্রিড", formulation: "২০% এসপি", system: "IRAC", group: "4A", groupName: "নিওনিকোটিনয়েড", phiDays: 7, toxicity: "মাঝারি", safety: "ফুল ফোটার সময় এড়িয়ে চলুন" },
  { id: "fipronil", keywords: ["ফিপ্রোনিল", "দামার", "fipronil"], ingredient: "ফিপ্রোনিল", formulation: "৫% এসসি / ৪০% ডব্লিউজি", system: "IRAC", group: "2B", groupName: "ফিনাইলপাইরাজোল", phiDays: 14, toxicity: "বেশি", safety: "মাছের পুকুরের কাছে ব্যবহার করবেন না" },
  { id: "cypermethrin", keywords: ["সাইপারমেথ্রিন", "cypermethrin"], ingredient: "সাইপারমেথ্রিন", formulation: "১০% ইসি", system: "IRAC", group: "3A", groupName: "পাইরেথ্রয়েড", phiDays: 7, toxicity: "মাঝারি", safety: "মাছের জন্য বিষাক্ত" },
  { id: "lambda", keywords: ["ল্যামডা", "ল্যাম্বডা", "lambda"], ingredient: "ল্যাম্বডা-সাইহ্যালোথ্রিন", formulation: "২.৫% ইসি", system: "IRAC", group: "3A", groupName: "পাইরেথ্রয়েড", phiDays: 7, toxicity: "মাঝারি", safety: "মাছের জন্য বিষাক্ত" },
  { id: "spinosad", keywords: ["স্পিনোসাড", "ট্রেসার", "spinosad"], ingredient: "স্পিনোসাড", formulation: "৪৫% এসসি", system: "IRAC", group: "5", groupName: "স্পিনোসিন", phiDays: 3, toxicity: "কম", safety: "তুলনামূলক নিরাপদ, তবে মৌমাছির সময় এড়িয়ে চলুন" },
  { id: "chlorantraniliprole", keywords: ["ক্লোরান্ট্রানিলিপ্রোল", "কোরাজেন", "chlorantraniliprole"], ingredient: "ক্লোরান্ট্রানিলিপ্রোল", formulation: "১৮.৫% এসসি", system: "IRAC", group: "28", groupName: "ডায়ামাইড", phiDays: 3, toxicity: "কম", safety: "উপকারী পোকার জন্য তুলনামূলক নিরাপদ" },
  { id: "propargite", keywords: ["প্রোপারগাইট", "ওমাইট", "propargite"], ingredient: "প্রোপারগাইট", formulation: "৫৭% ইসি", system: "IRAC", group: "12C", groupName: "মাকড়নাশক", phiDays: 7, toxicity: "মাঝারি", safety: "চোখে লাগলে প্রচুর পানি দিন" },
  { id: "sulphur", keywords: ["সালফার", "থিওভিট", "sulphur", "sulfur"], ingredient: "সালফার", formulation: "৮০% ডব্লিউডিজি", system: "FRAC", group: "M02", groupName: "বহুমুখী (সংস্পর্শ)", phiDays: 1, toxicity: "কম", safety: "৩২°সে-এর বেশি তাপে স্প্রে করবেন না" },
  { id: "mancozeb", keywords: ["ম্যানকোজেব", "ডাইথেন", "mancozeb"], ingredient: "ম্যানকোজেব", formulation: "৮০% ডব্লিউপি", system: "FRAC", group: "M03", groupName: "ডাইথায়োকার্বামেট (সংস্পর্শ)", phiDays: 7, toxicity: "কম", safety: "নিয়মিত ব্যবহারে রেজিস্ট্যান্স ঝুঁকি কম" },
  { id: "copper", keywords: ["কপার", "কুপ্রাভিট", "copper"], ingredient: "কপার অক্সিক্লোরাইড", formulation: "৫০% ডব্লিউপি", system: "FRAC", group: "M01", groupName: "কপার (সংস্পর্শ)", phiDays: 7, toxicity: "কম", safety: "কচি পাতায় বেশি মাত্রায় পোড়া দাগ হতে পারে" },
  { id: "carbendazim", keywords: ["কার্বেন্ডাজিম", "ব্যাভিস্টিন", "carbendazim"], ingredient: "কার্বেন্ডাজিম", formulation: "৫০% ডব্লিউপি", system: "FRAC", group: "1", groupName: "বেনজিমিডাজোল", phiDays: 14, toxicity: "কম", safety: "রেজিস্ট্যান্স ঝুঁকি বেশি — পরপর ব্যবহার করবেন না" },
  { id: "metalaxyl", keywords: ["মেটালাক্সিল", "রিডোমিল", "metalaxyl"], ingredient: "মেটালাক্সিল + ম্যানকোজেব", formulation: "৭২% ডব্লিউপি", system: "FRAC", group: "4 + M03", groupName: "ফিনাইলঅ্যামাইড", phiDays: 7, toxicity: "কম", safety: "মৌসুমে ৩ বারের বেশি নয়" },
  { id: "azoxystrobin", keywords: ["অ্যাজক্সিস্ট্রোবিন", "এমিস্টার", "azoxystrobin"], ingredient: "অ্যাজক্সিস্ট্রোবিন", formulation: "২৫% এসসি", system: "FRAC", group: "11", groupName: "স্ট্রোবিলুরিন", phiDays: 3, toxicity: "কম", safety: "রেজিস্ট্যান্স ঝুঁকি বেশি — ভিন্ন গ্রুপের সাথে পালাক্রমে দিন" },
  { id: "difenoconazole", keywords: ["ডাইফেনোকোনাজল", "স্কোর", "difenoconazole"], ingredient: "ডাইফেনোকোনাজল", formulation: "২৫% ইসি", system: "FRAC", group: "3", groupName: "ট্রায়াজোল (DMI)", phiDays: 7, toxicity: "কম", safety: "মাছের জন্য ক্ষতিকর" },
  { id: "tebuconazole", keywords: ["টেবুকোনাজল", "ফলিকুর", "tebuconazole"], ingredient: "টেবুকোনাজল", formulation: "২৫% ইসি", system: "FRAC", group: "3", groupName: "ট্রায়াজোল (DMI)", phiDays: 14, toxicity: "কম", safety: "মাছের জন্য ক্ষতিকর" },
  { id: "propiconazole", keywords: ["প্রোপিকোনাজল", "টিল্ট", "propiconazole"], ingredient: "প্রোপিকোনাজল", formulation: "২৫% ইসি", system: "FRAC", group: "3", groupName: "ট্রায়াজোল (DMI)", phiDays: 14, toxicity: "কম", safety: "মাছের জন্য ক্ষতিকর" },
  { id: "kasugamycin", keywords: ["কাসুগামাইসিন", "কাগুমাইসিন", "kasugamycin"], ingredient: "কাসুগামাইসিন", formulation: "২% এসএল", system: "FRAC", group: "24", groupName: "অ্যান্টিবায়োটিক", phiDays: 7, toxicity: "কম", safety: "মৌসুমে ২-৩ বারের বেশি নয়" },
  { id: "boron", keywords: ["বোরন", "সোলুবর", "বোরিক", "boron"], ingredient: "বোরন", formulation: "২০% (সোলুবর)", system: "পুষ্টি", group: "—", groupName: "অণুপুষ্টি", phiDays: 0, toxicity: "কম", safety: "মাত্রার বেশি দিলে পাতা পুড়ে যায়" },
];

export function getChemicalInfo(name: string): ActiveIngredient | null {
  const n = name.toLowerCase();
  return ACTIVE_INGREDIENTS.find((a) => a.keywords.some((k) => n.includes(k.toLowerCase()))) ?? null;
}

/** All active ingredients in a combined product name (e.g. "ফিপ্রোনিল + থায়ামেথক্সাম"). */
export function getAllChemicalInfo(name: string): ActiveIngredient[] {
  const n = name.toLowerCase();
  return ACTIVE_INGREDIENTS.filter((a) => a.keywords.some((k) => n.includes(k.toLowerCase())));
}

export const groupKey = (a: ActiveIngredient) => `${a.system}-${a.group}`;
const isMultiSite = (a: ActiveIngredient) => a.system === "পুষ্টি" || a.group.startsWith("M");

export interface ResistanceWarning { groupKey: string; label: string; count: number }

/**
 * Given chemicals applied in chronological order, warn when the same
 * resistance group (non multi-site) was used 2+ times in a row.
 */
export function checkResistance(appliedNames: string[]): ResistanceWarning[] {
  const seq = appliedNames.map((n) => getAllChemicalInfo(n).filter((a) => !isMultiSite(a)).map(groupKey));
  const out = new Map<string, ResistanceWarning>();
  for (let i = 1; i < seq.length; i++) {
    for (const g of seq[i]) {
      if (!seq[i - 1].includes(g)) continue;
      let run = 1;
      for (let j = i - 1; j >= 0 && seq[j].includes(g); j--) run++;
      const a = ACTIVE_INGREDIENTS.find((x) => groupKey(x) === g)!;
      const prev = out.get(g);
      if (!prev || prev.count < run) out.set(g, { groupKey: g, label: `${a.system} ${a.group} (${a.groupName})`, count: run });
    }
  }
  return [...out.values()];
}

/** Most restrictive PHI of a product name (days). */
export function getPhiDays(name: string): number | null {
  const all = getAllChemicalInfo(name);
  return all.length ? Math.max(...all.map((a) => a.phiDays)) : null;
}

// ── Growth stage ────────────────────────────────────
export function findCrop(idOrName: string): CropData | null {
  const q = idOrName.trim();
  return getAllCrops().find((c) => c.id === q || c.name === q || q.includes(c.name) || c.name.includes(q)) ?? null;
}

export function getStageAtDay(crop: CropData, day: number): Stage | null {
  if (!crop.stages.length) return null;
  return crop.stages.find((s) => day >= s.startDay && day < s.endDay) ?? (day < crop.stages[0].startDay ? crop.stages[0] : crop.stages[crop.stages.length - 1]);
}

// ── Irrigation ──────────────────────────────────────
export interface IrrigationAdvice { intervalDays: number; method: string; critical: boolean; note: string }

const BASE_INTERVAL: Record<CropData["waterRequirement"], number> = { "কম": 12, "মাঝারি": 8, "বেশি": 5 };

export function getIrrigationAdvice(crop: CropData, stage: Stage | null): IrrigationAdvice {
  const isRice = crop.category === "ধান্য" && crop.id.includes("dhan");
  if (isRice) {
    return { intervalDays: 3, method: "AWD (পর্যায়ক্রমে ভেজানো ও শুকানো)", critical: !!stage && /থোড|ফুল|কাইচ/.test(stage.name), note: "জমিতে ২-৫ সেমি পানি রাখুন; পাইপে পানি ১৫ সেমি নিচে নামলে আবার সেচ দিন। থোড় ও ফুল পর্যায়ে পানি কম পড়তে দেবেন না।" };
  }
  const name = `${stage?.id ?? ""} ${stage?.name ?? ""}`;
  let interval = BASE_INTERVAL[crop.waterRequirement];
  let critical = false;
  let note = "মাটি হাতে চেপে দেখুন — গুঁড়ো হয়ে গেলে সেচ দিন, জমিতে পানি জমতে দেবেন না।";
  if (/চারা|রোপণ|planting|seedling|বপন/i.test(name)) { interval = Math.max(2, interval - 4); note = "চারা লাগানোর পর হালকা ও ঘন ঘন সেচ দিন, যাতে শিকড় বসে।"; }
  else if (/ফুল|flower|ফল|fruit|কন্দ|tuber|দানা|গুটি/i.test(name)) { interval = Math.max(3, interval - 2); critical = true; note = "এই পর্যায়ে পানির অভাবে ফুল-ফল ঝরে যায় ও ফলন কমে — নিয়মিত সেচ জরুরি।"; }
  else if (/সংগ্রহ|harvest|পাকা/i.test(name)) { interval = interval + 6; note = "ফসল তোলার ৭-১০ দিন আগে সেচ বন্ধ বা কমিয়ে দিন — মান ও সংরক্ষণক্ষমতা ভালো থাকে।"; }
  const method = crop.waterRequirement === "কম" ? "নালা/হালকা সেচ" : crop.category === "সবজি" ? "নালা বা ড্রিপ সেচ (মালচিং সহ)" : "নালা সেচ";
  return { intervalDays: interval, method, critical, note };
}

// ── IPM / condition-based rules ─────────────────────
export interface IpmRule { id: string; condition: string; action: string; crops?: string[]; categories?: CropData["category"][] }

export const IPM_RULES: IpmRule[] = [
  { id: "humid-fungus", condition: "টানা ২-৩ দিন মেঘলা, কুয়াশা বা বৃষ্টি", action: "ছত্রাকের ঝুঁকি বেশি — আগাম ম্যানকোজেব (FRAC M03) প্রতিরোধমূলক স্প্রে দিন; আক্রান্ত পাতা তুলে ফেলুন।" },
  { id: "dry-hot-mite", condition: "গরম ও শুকনো আবহাওয়া (৩২°সে+)", action: "মাকড় ও জাব বাড়ে — পাতার নিচে দেখুন; প্রথমে পানি স্প্রে বা নিম তেল, বেশি হলে মাকড়নাশক দিন।" },
  { id: "threshold-insect", condition: "প্রতি ১০ গাছে ২টির বেশি গাছে পোকা দেখা গেলে", action: "এটাই অর্থনৈতিক ক্ষতির সীমা — শুধুমাত্র তখনই রাসায়নিক স্প্রে করুন, আগে নয়।" },
  { id: "rotate", condition: "একই পোকার জন্য আবার স্প্রে লাগলে", action: "আগের বার যে IRAC/FRAC গ্রুপ ব্যবহার করেছেন, এবার ভিন্ন গ্রুপের ঔষধ নিন।" },
  { id: "rain-after-spray", condition: "স্প্রের ৬ ঘণ্টার মধ্যে বৃষ্টি", action: "ঔষধ ধুয়ে গেছে ধরে নিন — আবহাওয়া ভালো হলে পুনরায় স্প্রে করুন।" },
  { id: "wilt", condition: "হঠাৎ সুস্থ গাছ দুপুরে ঢলে পড়ে", action: "ঢলে পড়া রোগ — আক্রান্ত গাছ তুলে পুড়িয়ে ফেলুন, গোড়ায় কাসুগামাইসিন/কপার দ্রবণ ঢালুন, সেচ কমান।", categories: ["সবজি", "মসলা", "কন্দাল"] },
  { id: "fruitfly", condition: "ফলে ছোট ছিদ্র ও পচন", action: "মাছি পোকা — সেক্স ফেরোমন ফাঁদ (প্রতি বিঘায় ১০-১২টি) দিন, আক্রান্ত ফল মাটিতে পুঁতে ফেলুন।", crops: ["শসা", "করলা", "লাউ", "মিষ্টি কুমড়া", "পটল", "তরমুজ", "পেঁপে"] },
  { id: "late-blight", condition: "শীতে কুয়াশা + ঠান্ডা (১০-২০°সে)", action: "নাবি ধসা রোগের সর্বোচ্চ ঝুঁকি — মেটালাক্সিল + ম্যানকোজেব ৭ দিন পর পর দিন।", crops: ["আলু", "টমেটো"] },
  { id: "blast", condition: "রাতে ঠান্ডা, দিনে গরম ও শিশির; অতিরিক্ত ইউরিয়া", action: "ব্লাস্টের ঝুঁকি — ইউরিয়া বন্ধ রাখুন, ট্রাইসাইক্লাজল/স্ট্রোবিলুরিন প্রতিরোধমূলক স্প্রে দিন।", crops: ["বোরো ধান", "আমন ধান", "আউশ ধান", "গম"] },
  { id: "bph", condition: "গোড়ায় বাদামি ফড়িং, গোলাকার পোড়া দাগ (হপার বার্ন)", action: "পানি সরিয়ে দিন, গোড়ায় স্প্রে করুন; একই গ্রুপের ঔষধ পরপর নয়।", crops: ["বোরো ধান", "আমন ধান", "আউশ ধান"] },
];

export function getIpmRules(crop: CropData): IpmRule[] {
  return IPM_RULES.filter((r) => (!r.crops && !r.categories) || r.crops?.includes(crop.name) || r.categories?.includes(crop.category));
}
