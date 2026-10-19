import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CROP_FERTILIZERS, type FertilizerDose } from "@/lib/crop-data";
import { getAiSetting, callAi } from "@/lib/ai-settings.server";

const LevelSchema = z.enum(["low", "medium", "high"]).optional();

const SoilInputSchema = z.object({
  soilType: z.string().min(1),
  phLevel: z.number().min(3).max(10).optional(),
  nitrogen: LevelSchema,
  phosphorus: LevelSchema,
  potassium: LevelSchema,
  organicMatter: LevelSchema,
  sulfur: LevelSchema,
  zincLevel: LevelSchema,
  boronLevel: LevelSchema,
  calcium: LevelSchema,
  magnesium: LevelSchema,
  ecValue: z.number().min(0).max(40).optional(), // dS/m
  lastCrop: z.string().max(60).optional(),
  plannedCrop: z.string().max(60).optional(),
  district: z.string().max(60).optional(),
  areaValue: z.number().positive().max(10000).optional(),
  areaUnit: z.enum(["শতক", "বিঘা", "একর", "হেক্টর"]).optional(),
  irrigation: z.enum(["সেচ সুবিধা আছে", "বৃষ্টিনির্ভর"]).optional(),
});

export type SoilFertilizerItem = {
  name: string;
  amount: string;
  timing: string;
};

export type SoilAnalysisResult = {
  healthScore: number; // 0-100
  scoreLabel: string;
  summary: string;
  phStatus: { value: number | null; label: string; advice: string };
  limeAdvice: { needed: boolean; amount: string; note: string };
  salinity: {
    value: number | null;
    label: string;
    severity: "none" | "slight" | "moderate" | "high" | "unknown";
    advice: string;
    actions: string[];
    tolerantCrops: string[];
  };
  secondaryNutrients: { name: string; status: string; dose: string; note: string }[];
  areaLabel: string;
  nutrientStatus: {
    nitrogen: string;
    phosphorus: string;
    potassium: string;
    ph: string;
    organicMatter: string;
  };
  computedDoses: { name: string; amount: string; note: string }[];
  recommendations: {
    fertilizers: SoilFertilizerItem[];
    organicAmendments: string[];
    soilManagement: string[];
  };
  suitableCrops: string[];
  warnings: string[];
};

// ── Deterministic agronomy helpers ───────────────────────

const UNIT_TO_BIGHA: Record<string, number> = {
  শতক: 1 / 33,
  বিঘা: 1,
  একর: 3.03,
  হেক্টর: 7.48,
};

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
const toBn = (v: number | string) => String(v).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);

const round1 = (n: number) => Math.round(n * 10) / 10;

function phInfo(ph?: number) {
  if (ph == null) {
    return {
      label: "অজানা",
      advice: "নিকটস্থ মৃত্তিকা সম্পদ উন্নয়ন ইনস্টিটিউট (SRDI) ল্যাবে pH পরীক্ষা করিয়ে নিন।",
      penalty: 8,
    };
  }
  if (ph < 5.0)
    return {
      label: "তীব্র অম্লীয়",
      advice: "চুন প্রয়োগ ছাড়া অধিকাংশ ফসলে ফলন কমবে।",
      penalty: 30,
    };
  if (ph < 5.5)
    return { label: "অম্লীয়", advice: "ডলোচুন প্রয়োগ করে pH ৬.০–৬.৫ এ আনুন।", penalty: 20 };
  if (ph < 6.0)
    return { label: "সামান্য অম্লীয়", advice: "হালকা চুন ও জৈব সার দিলেই যথেষ্ট।", penalty: 8 };
  if (ph <= 7.5)
    return { label: "উপযুক্ত", advice: "pH আদর্শ মাত্রায় আছে, বজায় রাখুন।", penalty: 0 };
  if (ph <= 8.5)
    return { label: "ক্ষারীয়", advice: "জিপসাম ও জৈব সার প্রয়োগে ক্ষারত্ব কমান।", penalty: 18 };
  return {
    label: "তীব্র ক্ষারীয়",
    advice: "জিপসাম প্রয়োগ ও পর্যাপ্ত সেচে লবণ ধুয়ে ফেলুন।",
    penalty: 28,
  };
}

function limeRecommendation(soilType: string, ph?: number) {
  if (ph == null || ph >= 6.0) {
    return {
      needed: false,
      amount: "প্রয়োজন নেই",
      note:
        ph == null ? "pH জানা গেলে সঠিক চুনের পরিমাণ বলা যাবে।" : "মাটির pH সহনীয় মাত্রায় আছে।",
    };
  }
  const base = ph < 5.0 ? 120 : ph < 5.5 ? 80 : 45; // kg/বিঘা
  const factor = soilType.includes("এঁটেল") ? 1.3 : soilType.includes("বেলে") ? 0.7 : 1;
  const kg = Math.round(base * factor);
  return {
    needed: true,
    amount: `${toBn(kg)} কেজি/বিঘা ডলোচুন`,
    note: "জমি তৈরির ১৫–২০ দিন আগে ছিটিয়ে চাষ দিন; চুন ও সার একসাথে দেবেন না।",
  };
}

// ── লবণাক্ততা (EC) ───────────────────────────────────────
const SALT_TOLERANT_CROPS = [
  "বার্লি",
  "সরিষা",
  "সূর্যমুখী",
  "খেসারি",
  "গম (বিনা গম-১)",
  "লবণসহিষ্ণু ধান (ব্রি ধান৪৭/৬৭/৯৭/৯৯)",
  "মিষ্টি আলু",
  "টমেটো (BINA টমেটো-১০)",
];

function salinityInfo(ec?: number): SoilAnalysisResult["salinity"] {
  if (ec == null) {
    return {
      value: null,
      label: "পরীক্ষা করা হয়নি",
      severity: "unknown",
      advice:
        "রিপোর্টে EC (ডিএস/মিটার) থাকলে বসিয়ে দিন — উপকূলীয় বা সেচের পানিতে লবণ থাকলে এটি জরুরি।",
      actions: [],
      tolerantCrops: [],
    };
  }
  const base = [
    "সেচের পানি মিষ্টি (কম লবণাক্ত) উৎস থেকে নিন, প্রয়োজনে বৃষ্টির পানি সংরক্ষণ করুন।",
    "জমিতে ভালো নিকাশ নালা রাখুন যাতে লবণ ধুয়ে বেরিয়ে যেতে পারে।",
  ];
  if (ec < 2)
    return {
      value: ec,
      label: "স্বাভাবিক",
      severity: "none",
      advice: "মাটিতে ক্ষতিকর লবণাক্ততা নেই, স্বাভাবিকভাবে চাষ করুন।",
      actions: ["বছরে একবার EC পরীক্ষা করিয়ে নজরে রাখুন।"],
      tolerantCrops: [],
    };
  if (ec < 4)
    return {
      value: ec,
      label: "সামান্য লবণাক্ত",
      severity: "slight",
      advice:
        "সংবেদনশীল ফসলে (ডাল, পেঁয়াজ, শিম) ১০–১৫% ফলন কমতে পারে; জৈব সার ও মালচিং দিয়ে সামলানো যাবে।",
      actions: [
        ...base,
        "প্রতি বিঘায় ৮০০–১০০০ কেজি পচা গোবর/কম্পোস্ট দিন — লবণের প্রভাব কমে।",
        "খড় বা কচুরিপানা দিয়ে মালচিং করুন, উপরিভাগে লবণ জমা কমবে।",
        "MoP-এর একটি অংশ কমিয়ে সালফেট অব পটাশ (SOP) ব্যবহার করুন।",
      ],
      tolerantCrops: SALT_TOLERANT_CROPS.slice(0, 5),
    };
  if (ec < 8)
    return {
      value: ec,
      label: "মাঝারি লবণাক্ত",
      severity: "moderate",
      advice:
        "অধিকাংশ সবজিতে ২৫–৫০% ফলন কমবে — লবণ ধোয়ানো (লিচিং) ও লবণসহিষ্ণু জাত ছাড়া চাষ ঝুঁকিপূর্ণ।",
      actions: [
        "বর্ষার আগে/শুরুতে জমিতে ৮–১০ সেমি পানি দাঁড় করিয়ে ২–৩ বার ধুয়ে (লিচিং) নিকাশ করে দিন।",
        "প্রতি বিঘায় ৮০–১০০ কেজি জিপসাম দিন (সোডিয়াম সরিয়ে ক্যালশিয়াম বসায়)।",
        ...base,
        "উঁচু বেড/আইল করে বেডের কিনারায় নয়, মাঝখানে চারা লাগান — কিনারায় লবণ জমে।",
        "ইউরিয়া ভাগ করে অল্প অল্প করে দিন; একসাথে বেশি সার দিলে লবণাক্ততা বাড়ে।",
      ],
      tolerantCrops: SALT_TOLERANT_CROPS,
    };
  return {
    value: ec,
    label: "তীব্র লবণাক্ত",
    severity: "high",
    advice: "সাধারণ ফসল টিকবে না। আগে লবণ ধোয়ানো ও জিপসাম প্রয়োগ করে মাটি সংশোধন করতে হবে।",
    actions: [
      "প্রতি বিঘায় ১২০–১৫০ কেজি জিপসাম প্রয়োগ করে ভালোভাবে চাষ দিন, তারপর পানি দিয়ে ধুয়ে নিন।",
      "টানা ২–৩ দফা লিচিং করে নিকাশ নালা দিয়ে লবণ পানি বের করে দিন।",
      "চুন প্রয়োগ করবেন না (pH বেশি হলে) — জিপসামই সঠিক সংশোধক।",
      ...base,
      "এক মৌসুম ধৈঞ্চা/সবুজ সার চাষ করে মাটিতে মিশিয়ে দিন।",
      "নিকটস্থ উপজেলা কৃষি অফিস বা SRDI-এর পরামর্শ নিয়ে ফসল নির্বাচন করুন।",
    ],
    tolerantCrops: SALT_TOLERANT_CROPS,
  };
}

// ── ক্যালশিয়াম ও ম্যাগনেসিয়াম ─────────────────────────
function secondaryNutrientPlan(data: z.infer<typeof SoilInputSchema>, bigha: number) {
  const amount = (kgPerBigha: number) => `${toBn(round1(kgPerBigha * bigha))} কেজি`;
  const items: SoilAnalysisResult["secondaryNutrients"] = [];

  // ক্যালশিয়াম
  const ca = data.calcium;
  const ph = data.phLevel;
  if (ca === "high") {
    items.push({
      name: "ক্যালশিয়াম (Ca)",
      status: "পর্যাপ্ত",
      dose: "আলাদা প্রয়োগ লাগবে না",
      note: "অতিরিক্ত চুন দিলে জিংক ও বোরন গ্রহণ ব্যাহত হবে।",
    });
  } else {
    const acidic = ph != null && ph < 6.0;
    const perBigha = ca === "low" ? (acidic ? 100 : 60) : acidic ? 60 : 35;
    items.push({
      name: "ক্যালশিয়াম (Ca)",
      status: ca === "low" ? "কম" : ca === "medium" ? "মাঝারি" : "পরীক্ষা হয়নি",
      dose: acidic
        ? `${amount(perBigha)} কৃষি চুন/ডলোচুন`
        : `${amount(perBigha)} জিপসাম (ক্যালশিয়াম সালফেট)`,
      note: acidic
        ? "pH কম, তাই চুন দিলেই ক্যালশিয়াম ও অম্লত্ব দুটোই ঠিক হবে — জমি তৈরির ১৫–২০ দিন আগে দিন।"
        : "pH ঠিক আছে, তাই চুন নয় — জিপসাম দিলে pH না বাড়িয়েই ক্যালশিয়াম ও গন্ধক মিলবে।",
    });
  }

  // ম্যাগনেসিয়াম
  const mg = data.magnesium;
  if (mg === "high") {
    items.push({
      name: "ম্যাগনেসিয়াম (Mg)",
      status: "পর্যাপ্ত",
      dose: "আলাদা প্রয়োগ লাগবে না",
      note: "ডলোচুন এড়িয়ে সাধারণ কৃষি চুন ব্যবহার করুন।",
    });
  } else {
    const perBigha = mg === "low" ? 14 : mg === "medium" ? 8 : 7;
    items.push({
      name: "ম্যাগনেসিয়াম (Mg)",
      status: mg === "low" ? "কম" : mg === "medium" ? "মাঝারি" : "পরীক্ষা হয়নি",
      dose: `${amount(perBigha)} ম্যাগনেসিয়াম সালফেট`,
      note:
        (ph != null && ph < 6.0
          ? "চুন হিসেবে ডলোচুন নিলে অতিরিক্ত ম্যাগনেসিয়াম এমনিতেই মিলবে। "
          : "") + "শেষ চাষের সময় বেসাল দিন; পাতা হলুদ হলে ২% ম্যাগনেসিয়াম সালফেট স্প্রে করুন।",
    });
  }

  // গন্ধক
  if (data.sulfur && data.sulfur !== "high") {
    items.push({
      name: "গন্ধক (S)",
      status: data.sulfur === "low" ? "কম" : "মাঝারি",
      dose: `${amount(data.sulfur === "low" ? 12 : 8)} জিপসাম`,
      note: "সরিষা, পেঁয়াজ, ডাল জাতীয় ফসলে গন্ধক বিশেষভাবে জরুরি।",
    });
  }

  return items;
}

const LEVEL_FACTOR: Record<string, number> = { low: 1.25, medium: 1, high: 0.75 };

function baseDose(crop?: string): { dose: FertilizerDose; matched: string | null } {
  if (crop) {
    const exact = CROP_FERTILIZERS[crop];
    if (exact) return { dose: exact, matched: crop };
    const key = Object.keys(CROP_FERTILIZERS).find((k) => k.includes(crop) || crop.includes(k));
    if (key) return { dose: CROP_FERTILIZERS[key], matched: key };
  }
  // BARI general vegetable dose per বিঘা
  return { dose: { urea: 20, tsp: 10, mop: 12, gypsum: 6, zinc: 1.2, boron: 0.4 }, matched: null };
}

function computeDoses(data: z.infer<typeof SoilInputSchema>) {
  const { dose, matched } = baseDose(data.plannedCrop);
  const bigha = (data.areaValue ?? 1) * (UNIT_TO_BIGHA[data.areaUnit ?? "বিঘা"] ?? 1);
  const nF = LEVEL_FACTOR[data.nitrogen ?? "medium"] ?? 1;
  const pF = LEVEL_FACTOR[data.phosphorus ?? "medium"] ?? 1;
  const kF = LEVEL_FACTOR[data.potassium ?? "medium"] ?? 1;
  // High organic matter supplies N
  const omF = data.organicMatter === "high" ? 0.85 : data.organicMatter === "low" ? 1.1 : 1;
  const sandy = data.soilType.includes("বেলে") ? 1.1 : 1;

  const items = [
    { name: "ইউরিয়া", kg: dose.urea * nF * omF * sandy, note: "৩ কিস্তিতে ভাগ করে দিন" },
    { name: "টিএসপি (TSP)", kg: dose.tsp * pF, note: "সম্পূর্ণ শেষ চাষের সময়" },
    { name: "এমওপি (MoP)", kg: dose.mop * kF * sandy, note: "অর্ধেক বেসাল, বাকি ফুল আসার আগে" },
    { name: "জিপসাম", kg: dose.gypsum, note: "শেষ চাষের সময় বেসাল ডোজ" },
    { name: "জিংক সালফেট", kg: dose.zinc, note: "প্রতি ২ বছরে একবার হলেও প্রয়োগ করুন" },
    ...(dose.boron ? [{ name: "বোরন", kg: dose.boron, note: "ফুল ও ফল ধরার আগে" }] : []),
    {
      name: "গোবর/জৈব সার",
      kg: data.organicMatter === "low" ? 1200 : 800,
      note: "জমি তৈরির ১৫ দিন আগে",
    },
  ];

  const areaLabel =
    data.areaValue && data.areaUnit
      ? `${toBn(round1(data.areaValue))} ${data.areaUnit} (≈ ${toBn(round1(bigha))} বিঘা)`
      : "১ বিঘা";

  return {
    matched,
    areaLabel,
    bigha,
    doses: items.map((i) => ({
      name: i.name,
      amount: `${toBn(round1(i.kg * bigha))} কেজি`,
      note: i.note,
    })),
  };
}

function computeScore(data: z.infer<typeof SoilInputSchema>) {
  let score = 100;
  score -= phInfo(data.phLevel).penalty;
  const drop = (lvl?: string, low = 14, unknown = 5) =>
    lvl === "low" ? low : lvl === "high" ? 0 : lvl === "medium" ? 4 : unknown;
  score -= drop(data.nitrogen);
  score -= drop(data.phosphorus, 12);
  score -= drop(data.potassium, 12);
  score -= drop(data.organicMatter, 18, 8);
  score -= drop(data.calcium, 6, 0);
  score -= drop(data.magnesium, 6, 0);
  const ec = data.ecValue;
  if (ec != null) {
    if (ec >= 8) score -= 25;
    else if (ec >= 4) score -= 15;
    else if (ec >= 2) score -= 7;
  }
  if (data.soilType.includes("বেলে") && !data.soilType.includes("দোআঁশ")) score -= 8;
  if (data.soilType.includes("দোআঁশ")) score += 5;
  return Math.max(15, Math.min(98, Math.round(score)));
}

const scoreLabel = (s: number) =>
  s >= 80 ? "চমৎকার" : s >= 65 ? "ভালো" : s >= 50 ? "মোটামুটি" : s >= 35 ? "দুর্বল" : "ঝুঁকিপূর্ণ";

// ── AI narrative layer (provider/model admin panel থেকে নিয়ন্ত্রিত) ──

const LEVEL_BN: Record<string, string> = { low: "কম", medium: "মাঝারি", high: "বেশি" };

type Narrative = {
  summary: string;
  nutrientStatus: SoilAnalysisResult["nutrientStatus"];
  organicAmendments: string[];
  soilManagement: string[];
  suitableCrops: string[];
  warnings: string[];
};

async function callGeminiNarrative(
  data: z.infer<typeof SoilInputSchema>,
  score: number,
  ph: ReturnType<typeof phInfo>,
  lime: ReturnType<typeof limeRecommendation>,
  doses: { name: string; amount: string }[],
): Promise<Narrative | null> {

  const system = `তুমি বাংলাদেশ মৃত্তিকা সম্পদ উন্নয়ন ইনস্টিটিউট (SRDI) ও BARI-এর সুপারিশ অনুসরণকারী একজন অভিজ্ঞ মৃত্তিকা বিজ্ঞানী।
শুদ্ধ প্রমিত বাংলায় বাস্তবসম্মত, কৃষকবান্ধব পরামর্শ দেবে। শুধু JSON দেবে, অন্য কোনো টেক্সট নয়।
JSON স্কিমা:
{"summary":"৩-৪ বাক্য","nutrientStatus":{"nitrogen":"","phosphorus":"","potassium":"","ph":"","organicMatter":""},"organicAmendments":["৩-৫টি"],"soilManagement":["৩-৫টি"],"suitableCrops":["৫-৮টি ফসলের নাম"],"warnings":["০-৩টি"]}`;

  const prompt = `মাটির তথ্য:
- ধরন: ${data.soilType}
- জেলা: ${data.district ?? "অজানা"}
- pH: ${data.phLevel ?? "অজানা"} (${ph.label})
- নাইট্রোজেন: ${LEVEL_BN[data.nitrogen ?? ""] ?? "অজানা"}
- ফসফরাস: ${LEVEL_BN[data.phosphorus ?? ""] ?? "অজানা"}
- পটাশিয়াম: ${LEVEL_BN[data.potassium ?? ""] ?? "অজানা"}
- জৈব উপাদান: ${LEVEL_BN[data.organicMatter ?? ""] ?? "অজানা"}
- ক্যালশিয়াম: ${LEVEL_BN[data.calcium ?? ""] ?? "অজানা"}
- ম্যাগনেসিয়াম: ${LEVEL_BN[data.magnesium ?? ""] ?? "অজানা"}
- গন্ধক: ${LEVEL_BN[data.sulfur ?? ""] ?? "অজানা"}
- লবণাক্ততা EC (dS/m): ${data.ecValue ?? "অজানা"}
- সেচ: ${data.irrigation ?? "অজানা"}
- আগের ফসল: ${data.lastCrop || "অজানা"}
- পরিকল্পিত ফসল: ${data.plannedCrop || "অজানা"}

আমাদের হিসাবকৃত ফলাফল (এগুলোর সাথে সাংঘর্ষিক কিছু বলবে না):
- স্বাস্থ্য স্কোর: ${score}/100
- চুন: ${lime.needed ? lime.amount : "প্রয়োজন নেই"}
- সার (মোট জমির জন্য): ${doses.map((d) => `${d.name} ${d.amount}`).join(", ")}

এই তথ্যের ভিত্তিতে JSON রিপোর্ট দাও। suitableCrops-এ চলতি মৌসুমে এই মাটিতে লাভজনক ফসল দাও।
EC ৪ dS/m-এর বেশি হলে শুধু লবণসহিষ্ণু ফসল/জাত সুপারিশ করবে এবং warnings-এ লবণাক্ততার ঝুঁকি উল্লেখ করবে।
ক্যালশিয়াম বা ম্যাগনেসিয়াম কম থাকলে soilManagement-এ তা সংশোধনের কথা বলবে (pH কম হলে ডলোচুন, pH ঠিক থাকলে জিপসাম/ম্যাগনেসিয়াম সালফেট)।`;

  try {
    const setting = await getAiSetting("soil_analysis");
    const text = await callAi(setting, {
      system,
      messages: [{ role: "user", content: prompt }],
      json: true,
      temperature: 0.4,
      maxTokens: 2048,
    });
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]) as Narrative;
  } catch (err) {
    console.error("AI soil narrative exception", err);
    return null;
  }
}

function fallbackNarrative(
  data: z.infer<typeof SoilInputSchema>,
  score: number,
  ph: ReturnType<typeof phInfo>,
): Narrative {
  const lvl = (l?: string, name = "") =>
    l === "low"
      ? `${name} কম — সুপারিশকৃত মাত্রার চেয়ে ২৫% বেশি প্রয়োগ করুন।`
      : l === "high"
        ? `${name} পর্যাপ্ত — মাত্রা ২৫% কমিয়ে দিন।`
        : l === "medium"
          ? `${name} মাঝারি — সুপারিশকৃত মাত্রাই যথেষ্ট।`
          : `${name} পরীক্ষা করা হয়নি — সাধারণ মাত্রা ধরা হয়েছে।`;
  return {
    summary: `${data.soilType} মাটির প্রাথমিক স্বাস্থ্য স্কোর ${toBn(score)}। ${ph.advice} নিয়মিত জৈব সার প্রয়োগে মাটির গুণাগুণ ধরে রাখুন।`,
    nutrientStatus: {
      nitrogen: lvl(data.nitrogen, "নাইট্রোজেন"),
      phosphorus: lvl(data.phosphorus, "ফসফরাস"),
      potassium: lvl(data.potassium, "পটাশিয়াম"),
      ph: `${ph.label} — ${ph.advice}`,
      organicMatter: lvl(data.organicMatter, "জৈব উপাদান"),
    },
    organicAmendments: [
      "প্রতি বিঘায় ৮০০–১২০০ কেজি পচা গোবর বা কম্পোস্ট দিন",
      "ট্রাইকো-কম্পোস্ট ব্যবহারে রোগবালাই কমে ও ইউরিয়া ৩৫% সাশ্রয় হয়",
      "ধৈঞ্চা বা শনপাট চাষ করে সবুজ সার হিসেবে মাটিতে মিশিয়ে দিন",
    ],
    soilManagement: [
      "একই জমিতে বছরের পর বছর একই ফসল না করে শস্য পর্যায় অনুসরণ করুন",
      "জমিতে পানি জমতে দেবেন না, নিকাশ নালা রাখুন",
      "ফসলের অবশিষ্টাংশ পুড়িয়ে না ফেলে মাটিতে মিশিয়ে দিন",
    ],
    suitableCrops: data.soilType.includes("বেলে")
      ? ["আলু", "বাদাম", "তরমুজ", "মিষ্টি আলু", "পেঁয়াজ"]
      : data.soilType.includes("এঁটেল")
        ? ["ধান", "পাট", "গম", "ভুট্টা"]
        : ["ধান", "টমেটো", "আলু", "বেগুন", "মরিচ", "ফুলকপি"],
    warnings:
      ph.penalty >= 18 ? ["pH সংশোধন না করে অতিরিক্ত রাসায়নিক সার দিলে অর্থ অপচয় হবে।"] : [],
  };
}

export const analyzeSoil = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SoilInputSchema.parse(d))
  .handler(async ({ data }): Promise<SoilAnalysisResult> => {
    const ph = phInfo(data.phLevel);
    const lime = limeRecommendation(data.soilType, data.phLevel);
    const score = computeScore(data);
    const { doses, areaLabel, matched, bigha } = computeDoses(data);
    const salinity = salinityInfo(data.ecValue);
    const secondaryNutrients = secondaryNutrientPlan(data, bigha);

    const narrative =
      (await callGeminiNarrative(data, score, ph, lime, doses)) ??
      fallbackNarrative(data, score, ph);

    const timings: Record<string, string> = Object.fromEntries(doses.map((d) => [d.name, d.note]));

    return {
      healthScore: score,
      scoreLabel: scoreLabel(score),
      summary: narrative.summary,
      phStatus: { value: data.phLevel ?? null, label: ph.label, advice: ph.advice },
      limeAdvice: lime,
      salinity,
      secondaryNutrients,
      areaLabel,
      nutrientStatus: narrative.nutrientStatus,
      computedDoses: doses,
      recommendations: {
        fertilizers: doses.map((d) => ({
          name: d.name,
          amount: `${d.amount} (${areaLabel})`,
          timing: timings[d.name] ?? "",
        })),
        organicAmendments: narrative.organicAmendments ?? [],
        soilManagement: narrative.soilManagement ?? [],
      },
      suitableCrops:
        salinity.severity === "high" || salinity.severity === "moderate"
          ? Array.from(
              new Set([...salinity.tolerantCrops, ...(narrative.suitableCrops ?? [])]),
            ).slice(0, 10)
          : (narrative.suitableCrops ?? []),
      warnings: [
        ...(salinity.severity === "high"
          ? ["মাটি তীব্র লবণাক্ত — সংশোধন না করে সাধারণ ফসল চাষ করলে ফলন প্রায় শূন্য হতে পারে।"]
          : salinity.severity === "moderate"
            ? ["মাঝারি লবণাক্ততা শনাক্ত হয়েছে — লিচিং ও জিপসাম ছাড়া সংবেদনশীল ফসল দেবেন না।"]
            : []),
        ...(narrative.warnings ?? []),
        ...(matched
          ? []
          : data.plannedCrop
            ? [
                `"${data.plannedCrop}" ফসলের নির্দিষ্ট সুপারিশ না থাকায় সাধারণ সবজির মাত্রা ধরা হয়েছে।`,
              ]
            : []),
      ],
    };
  });

// ── মাটি পরীক্ষার রিপোর্ট / ছবি থেকে তথ্য বের করা ─────────

const SoilFileSchema = z.object({
  files: z
    .array(
      z.object({
        mimeType: z.string().min(3).max(120),
        data: z.string().min(50), // base64, no data: prefix
        name: z.string().max(200).optional(),
      }),
    )
    .min(1)
    .max(3),
});

export type SoilExtraction = {
  soilType?: string;
  phLevel?: number;
  nitrogen?: "low" | "medium" | "high";
  phosphorus?: "low" | "medium" | "high";
  potassium?: "low" | "medium" | "high";
  organicMatter?: "low" | "medium" | "high";
  sulfur?: "low" | "medium" | "high";
  zincLevel?: "low" | "medium" | "high";
  boronLevel?: "low" | "medium" | "high";
  calcium?: "low" | "medium" | "high";
  magnesium?: "low" | "medium" | "high";
  ecValue?: number;
  plannedCrop?: string;
  documentType?: "সার সুপারিশ কার্ড" | "মাটি পরীক্ষার রিপোর্ট" | "মাটির ছবি" | "অন্যান্য";
  notes: string[];
  confidence: "high" | "medium" | "low";
};

export const extractSoilReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SoilFileSchema.parse(d))
  .handler(async ({ data }): Promise<SoilExtraction> => {
    const setting = await getAiSetting("soil_analysis");

    const totalBytes = data.files.reduce((s, f) => s + Math.floor((f.data.length * 3) / 4), 0);
    if (totalBytes > 12 * 1024 * 1024) {
      throw new Error("ফাইলের আকার অনেক বড় — ১০ মেগাবাইটের কম ফাইল দিন।");
    }

    const system = `তুমি বাংলাদেশের মৃত্তিকা সম্পদ উন্নয়ন ইনস্টিটিউট (SRDI)-এর "সার সুপারিশ কার্ড" ও মাটি পরীক্ষার রিপোর্ট পড়তে দক্ষ একজন মৃত্তিকা বিজ্ঞানী।

### সার সুপারিশ কার্ড চেনার নিয়ম
কার্ডে সাধারণত থাকে: উপরে "গণপ্রজাতন্ত্রী বাংলাদেশ সরকার / কৃষি মন্ত্রণালয় / মৃত্তিকা সম্পদ উন্নয়ন ইনস্টিটিউট", শিরোনাম "সার সুপারিশ কার্ড", কৃষকের নাম-ঠিকানা, এবং একটি বড় ছক।
ছকের বাম কলামে পুষ্টি উপাদানের নাম ও একক থাকে (নাইট্রোজেন N (%), ফসফরাস P, পটাশিয়াম K, গন্ধক S, দস্তা Zn, বোরন B, ক্যালশিয়াম Ca, ম্যাগনেসিয়াম Mg, মাটির অম্লত্ব pH, মাটির লবণাক্ততা EC (ডিএস/মিটার), জৈব পদার্থ OM (%))।
পাশের কলামে "পরিমাণ" (হাতে লেখা সংখ্যা) ও "উর্বরতা শ্রেণী" (হাতে লেখা: অতি নিম্ন / নিম্ন / মধ্যম / উচ্চ / অতি উচ্চ / মৃদু অম্ল / প্রশম / স্বাভাবিক / মৃদু লবণাক্ত) থাকে।
ডান পাশের কলামগুলোতে ফসলভিত্তিক সারের সুপারিশ (গ্রাম/শতাংশ) হাতে লেখা থাকে।

হাতে লেখা বাংলা সংখ্যা ও ইংরেজি সংখ্যা—দুটোই সাবধানে পড়ো। ঝাপসা হলে অনুমান না করে ফিল্ড বাদ দাও এবং notes-এ লিখে দাও কোনটা পড়া যায়নি।

### উর্বরতা শ্রেণী → মাত্রা রূপান্তর
অতি নিম্ন/নিম্ন = low; মধ্যম/মাঝারি = medium; উচ্চ/অতি উচ্চ = high।
শ্রেণী লেখা না থাকলে মান থেকে হিসাব করো:
- জৈব পদার্থ (OM %): <1.7 = low, 1.7–3.4 = medium, >3.4 = high
- নাইট্রোজেন (N %): <0.09 = low, 0.09–0.18 = medium, >0.18 = high
- ফসফরাস (P µg/g): <10 = low, 10–20 = medium, >20 = high
- পটাশিয়াম (K meq/100g): <0.12 = low, 0.12–0.30 = medium, >0.30 = high
- গন্ধক (S µg/g): <14 = low, 14–30 = medium, >30 = high
- ক্যালশিয়াম (Ca meq/100g): <2.0 = low, 2.0–5.0 = medium, >5.0 = high
- ম্যাগনেসিয়াম (Mg meq/100g): <0.5 = low, 0.5–1.5 = medium, >1.5 = high
- দস্তা (Zn µg/g): <0.9 = low, 0.9–2.0 = medium, >2.0 = high
- বোরন (B µg/g): <0.2 = low, 0.2–0.5 = medium, >0.5 = high
ecValue: EC মান ডিএস/মিটার (dS/m) এককে সংখ্যা হিসেবে দাও। রিপোর্টে µS/cm থাকলে ১০০০ দিয়ে ভাগ করো।
ভূমি শ্রেণী/মাটির বর্ণনা থেকে soilType অনুমান করো; না থাকলে বাদ দাও।
"ফসলের নাম" ঘরে লেখা থাকলে (যেমন আলু, বোরো, রোপা আমন) প্রথমটি plannedCrop হিসেবে দাও।

শুধু মাটির ছবি হলে: রঙ ও গঠন দেখে soilType অনুমান করো, confidence "low" দাও, documentType "মাটির ছবি" এবং notes-এ ল্যাবে পরীক্ষার পরামর্শ দাও।
কোনো তথ্য না পেলে সেই ফিল্ড বাদ দাও — বানিয়ে লিখো না।
শুধু JSON দেবে, অন্য কিছু নয়।
স্কিমা:
{
  "documentType": "সার সুপারিশ কার্ড | মাটি পরীক্ষার রিপোর্ট | মাটির ছবি | অন্যান্য",
  "soilType": "দোআঁশ | এঁটেল | বেলে | বেলে-দোআঁশ | এঁটেল-দোআঁশ | পলি",
  "phLevel": 6.2,
  "ecValue": 0.9,
  "nitrogen": "low|medium|high",
  "phosphorus": "low|medium|high",
  "potassium": "low|medium|high",
  "organicMatter": "low|medium|high",
  "sulfur": "low|medium|high",
  "zincLevel": "low|medium|high",
  "boronLevel": "low|medium|high",
  "calcium": "low|medium|high",
  "magnesium": "low|medium|high",
  "plannedCrop": "কার্ডে লেখা ফসল থাকলে",
  "notes": ["বাংলায় ২-৫টি সংক্ষিপ্ত পর্যবেক্ষণ — কোন মান পড়া গেছে/যায়নি তা উল্লেখ করো"],
  "confidence": "high|medium|low"
}`;

    const images = data.files.map((f) => ({ mimeType: f.mimeType, data: f.data }));

    // মাঝে মাঝে মডেল খালি বা অর্ধেক উত্তর দেয় — তাই একবার ব্যর্থ হলে আরেকবার চেষ্টা করা হয়
    let text = "";
    let failed = false;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        text = await callAi(setting, {
          system,
          messages: [{ role: "user", content: "এই ফাইল/ছবি থেকে মাটির তথ্য বের করে JSON দাও।" }],
          images,
          json: true,
          temperature: attempt === 0 ? 0.2 : 0.4,
          maxTokens: 4096,
        });
        if (text) break;
        console.error("AI soil extract empty output, retrying");
      } catch (err) {
        if (err instanceof Error && err.message.includes("চেষ্টা")) throw err;
        console.error("AI soil extract exception", err);
        failed = true;
        if (attempt === 1) throw new Error("ফাইল বিশ্লেষণে সমস্যা হয়েছে, আবার চেষ্টা করুন।");
      }
    }

    if (!text) {
      throw new Error(
        failed
          ? "ফাইল বিশ্লেষণে সমস্যা হয়েছে, আবার চেষ্টা করুন।"
          : "ফাইল থেকে মাটির তথ্য পাওয়া যায়নি — পরিষ্কার ছবি দিয়ে আবার চেষ্টা করুন।",
      );
    }

    const cleaned = text
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/, "")
      .trim();
    const match = cleaned.match(/\{[\s\S]*\}/);

    let parsed: any;
    try {
      parsed = JSON.parse(match ? match[0] : cleaned);
    } catch {
      console.error("Gemini soil extract unparsable output", cleaned.slice(0, 500));
      throw new Error("ফাইল থেকে মাটির তথ্য পাওয়া যায়নি — পরিষ্কার ছবি দিয়ে আবার চেষ্টা করুন।");
    }

    const lvl = (v: unknown) => (v === "low" || v === "medium" || v === "high" ? v : undefined);
    const ph = Number(parsed?.phLevel);

    return {
      soilType: typeof parsed?.soilType === "string" ? parsed.soilType : undefined,
      phLevel: Number.isFinite(ph) && ph >= 3 && ph <= 10 ? Math.round(ph * 10) / 10 : undefined,
      nitrogen: lvl(parsed?.nitrogen),
      phosphorus: lvl(parsed?.phosphorus),
      potassium: lvl(parsed?.potassium),
      organicMatter: lvl(parsed?.organicMatter),
      sulfur: lvl(parsed?.sulfur),
      zincLevel: lvl(parsed?.zincLevel),
      boronLevel: lvl(parsed?.boronLevel),
      calcium: lvl(parsed?.calcium),
      magnesium: lvl(parsed?.magnesium),
      ecValue:
        Number.isFinite(Number(parsed?.ecValue)) &&
        Number(parsed?.ecValue) >= 0 &&
        Number(parsed?.ecValue) <= 40
          ? Math.round(Number(parsed.ecValue) * 100) / 100
          : undefined,
      documentType:
        parsed?.documentType === "সার সুপারিশ কার্ড" ||
        parsed?.documentType === "মাটি পরীক্ষার রিপোর্ট" ||
        parsed?.documentType === "মাটির ছবি"
          ? parsed.documentType
          : "অন্যান্য",
      plannedCrop: typeof parsed?.plannedCrop === "string" ? parsed.plannedCrop : undefined,
      notes: Array.isArray(parsed?.notes)
        ? parsed.notes.filter((n: unknown) => typeof n === "string").slice(0, 5)
        : [],
      confidence:
        parsed?.confidence === "high" || parsed?.confidence === "low"
          ? parsed.confidence
          : "medium",
    };
  });
