// Bangladesh GAP (উত্তম কৃষি চর্চা) protocol, layered on the master crop catalog.
// Keyed by the Bangla crop name stored in user_crop_plans.crop_type.

export type GapPhase = "land" | "seed" | "ipm" | "spray" | "harvest" | "record";

export interface GapTask {
  id: string;
  phase: GapPhase;
  title: string;
  desc: string;
}

export interface GapCropProfile {
  /** Minimum days between last chemical spray and harvest under GAP. */
  phiDays: number;
  keyPests: string[];
  ipm: string[];
  bioOptions: string[];
  harvest: string[];
}

export const GAP_PHASE_LABEL: Record<GapPhase, string> = {
  land: "জমি প্রস্তুতি",
  seed: "বীজ ও চারা",
  ipm: "সমন্বিত বালাই দমন (IPM)",
  spray: "নিরাপদ স্প্রে নিয়ম",
  harvest: "সংগ্রহ ও সংরক্ষণ",
  record: "রেকর্ড রাখা",
};

const SOLANACEAE_IPM = ["হলুদ ও নীল আঠালো ফাঁদ (প্রতি শতকে ১-২টি)", "নেট-ঢাকা বীজতলা", "আক্রান্ত পাতা/ফল তুলে মাটিতে পুঁতে ফেলা"];
const CUCURBIT_IPM = ["কিউলিউর ফেরোমোন ফাঁদ (প্রতি ৫ শতকে ১টি)", "বিষটোপ ফাঁদ (মিষ্টি কুমড়া/মাছি)", "পচা ফল সংগ্রহ করে নষ্ট করা"];
const CRUCIFER_IPM = ["ডায়মন্ড ব্যাক মথের ফেরোমোন ফাঁদ", "সীমানায় সরিষা ফাঁদ ফসল", "ডিমের গাদা হাতে সংগ্রহ"];
const LEGUME_IPM = ["ফল ছিদ্রকারী পোকার ফেরোমোন ফাঁদ", "হলুদ আঠালো ফাঁদ (জাব পোকা)", "আক্রান্ত ফুল-ফল তুলে ফেলা"];

export const GAP_CROPS: Record<string, GapCropProfile> = {
  "টমেটো": { phiDays: 7, keyPests: ["ফল ছিদ্রকারী পোকা", "সাদা মাছি", "লিফ মাইনার", "লেট ব্লাইট"], ipm: [...SOLANACEAE_IPM, "হেলিকোভার্পা ফেরোমোন ফাঁদ"], bioOptions: ["নিম তেল ৫ মিলি/লি", "ট্রাইকোডার্মা মাটিতে", "HNPV/ Bt"], harvest: ["সকালে বা বিকেলে তুলুন", "প্লাস্টিক ক্রেটে রাখুন, মাটিতে নয়"] },
  "বেগুন": { phiDays: 7, keyPests: ["ডগা ও ফল ছিদ্রকারী পোকা", "জাব পোকা", "ঢলে পড়া রোগ"], ipm: [...SOLANACEAE_IPM, "লিউসিনোডস ফেরোমোন ফাঁদ (প্রতি ৪ শতকে ১টি)", "আক্রান্ত ডগা সপ্তাহে ২ বার কেটে ফেলা"], bioOptions: ["Bt (Bacillus thuringiensis)", "নিম তেল", "ট্রাইকোগ্রামা অবমুক্ত"], harvest: ["কচি চকচকে বেগুন তুলুন", "ছিদ্রযুক্ত ফল আলাদা করুন"] },
  "মরিচ": { phiDays: 7, keyPests: ["থ্রিপস", "মাকড়", "এনথ্রাকনোজ"], ipm: [...SOLANACEAE_IPM], bioOptions: ["নিম তেল", "সালফার (মাকড়, কম ক্ষতিকর)"], harvest: ["বোঁটাসহ তুলুন", "শুকানোর সময় মাটি থেকে উঁচু মাচায়"] },
  "ক্যাপসিকাম": { phiDays: 7, keyPests: ["থ্রিপস", "মাকড়", "ঢলে পড়া রোগ"], ipm: [...SOLANACEAE_IPM, "নেট হাউস বা পলিশেড হলে উত্তম"], bioOptions: ["নিম তেল", "ট্রাইকোডার্মা"], harvest: ["ধারালো ছুরি দিয়ে বোঁটাসহ কাটুন", "পরিষ্কার কাপড়ে মুছে ক্রেটে রাখুন"] },
  "আলু": { phiDays: 14, keyPests: ["লেট ব্লাইট (মড়ক)", "কাটুই পোকা", "জাব পোকা"], ipm: ["প্রত্যয়িত রোগমুক্ত বীজ আলু", "কাটুই পোকার জন্য সন্ধ্যায় আলোক ফাঁদ", "কুয়াশার আগে রোগের পূর্বাভাস দেখা"], bioOptions: ["ট্রাইকোডার্মা দিয়ে বীজ শোধন"], harvest: ["তোলার ১০ দিন আগে গাছ কেটে ফেলুন (হাম পুলিং)", "ছায়ায় শুকিয়ে বাছাই করুন"] },
  "শসা": { phiDays: 3, keyPests: ["ফলের মাছি", "লাল পাম্পকিন বিটল", "ডাউনি মিলডিউ"], ipm: [...CUCURBIT_IPM], bioOptions: ["নিম তেল", "ছাই ছিটানো (বিটল)"], harvest: ["কচি অবস্থায় প্রতি ১-২ দিনে তুলুন"] },
  "লাউ": { phiDays: 3, keyPests: ["ফলের মাছি", "লাল পাম্পকিন বিটল"], ipm: [...CUCURBIT_IPM, "মাচায় চাষ"], bioOptions: ["নিম তেল", "ছাই ছিটানো"], harvest: ["নখ দিয়ে চাপলে দাগ পড়ে এমন কচি লাউ তুলুন"] },
  "মিষ্টি কুমড়া": { phiDays: 7, keyPests: ["ফলের মাছি", "লাল পাম্পকিন বিটল", "পাউডারি মিলডিউ"], ipm: [...CUCURBIT_IPM, "হাতে পরাগায়ন"], bioOptions: ["নিম তেল", "ট্রাইকোডার্মা"], harvest: ["বোঁটা শুকালে তুলুন", "শুকনো ছায়াযুক্ত জায়গায় সংরক্ষণ"] },
  "করলা": { phiDays: 3, keyPests: ["ফলের মাছি", "জাব পোকা"], ipm: [...CUCURBIT_IPM, "মাচায় চাষ"], bioOptions: ["নিম তেল"], harvest: ["সবুজ কচি করলা প্রতি ২-৩ দিনে তুলুন"] },
  "বাঁধাকপি": { phiDays: 7, keyPests: ["ডায়মন্ড ব্যাক মথ", "কাটুই পোকা", "জাব পোকা"], ipm: [...CRUCIFER_IPM], bioOptions: ["Bt", "Spinosad (কম অবশিষ্টাংশ)", "নিম তেল"], harvest: ["মাথা শক্ত হলে তুলুন", "বাইরের নষ্ট পাতা ছাঁটাই"] },
  "ফুলকপি": { phiDays: 7, keyPests: ["ডায়মন্ড ব্যাক মথ", "কাটুই পোকা", "অল্টারনারিয়া পাতা দাগ"], ipm: [...CRUCIFER_IPM], bioOptions: ["Bt", "নিম তেল"], harvest: ["কার্ড সাদা ও আঁটসাঁট থাকতেই তুলুন"] },
  "ব্রকলি": { phiDays: 7, keyPests: ["ডায়মন্ড ব্যাক মথ", "জাব পোকা"], ipm: [...CRUCIFER_IPM], bioOptions: ["Bt", "নিম তেল"], harvest: ["কুঁড়ি ফোটার আগে কাটুন", "দ্রুত ঠান্ডা জায়গায় রাখুন"] },
  "শিম": { phiDays: 5, keyPests: ["ফল ছিদ্রকারী পোকা", "জাব পোকা", "মোজাইক ভাইরাস"], ipm: [...LEGUME_IPM], bioOptions: ["নিম তেল", "সাবান-পানি (জাব পোকা)"], harvest: ["কচি শিম ৩-৪ দিন পরপর তুলুন"] },
  "বরবটি": { phiDays: 5, keyPests: ["ফল ছিদ্রকারী পোকা", "জাব পোকা"], ipm: [...LEGUME_IPM], bioOptions: ["নিম তেল", "সাবান-পানি"], harvest: ["দানা শক্ত হওয়ার আগে তুলুন"] },
};

export function getGapProfile(cropName: string): GapCropProfile | null {
  return GAP_CROPS[cropName] ?? null;
}

export function isGapEligible(cropName: string): boolean {
  return cropName in GAP_CROPS;
}

/** Chemical sprays are blocked inside the PHI window before expected harvest. */
export function isSprayAllowedUnderGap(cropName: string, daysUntilHarvest: number): boolean {
  const p = getGapProfile(cropName);
  if (!p) return true;
  return daysUntilHarvest > p.phiDays;
}

export function buildGapTasks(cropName: string): GapTask[] {
  const p = getGapProfile(cropName);
  if (!p) return [];
  const common: GapTask[] = [
    { id: "gap:land:history", phase: "land", title: "জমির পূর্ব ইতিহাস লিখুন", desc: "গত ২ মৌসুমে কী চাষ হয়েছে, কী রাসায়নিক দেওয়া হয়েছে তা লিখে রাখুন। শিল্প-কারখানা বা ড্রেনের পাশের জমি এড়িয়ে চলুন।" },
    { id: "gap:land:soil", phase: "land", title: "মাটি পরীক্ষা", desc: "উপজেলা কৃষি অফিস / SRDI থেকে মাটি পরীক্ষা করে সার সুপারিশ নিন।" },
    { id: "gap:land:water", phase: "land", title: "সেচের পানি নিরাপদ কিনা যাচাই", desc: "আর্সেনিক ও নর্দমার পানি ব্যবহার নিষেধ। গভীর নলকূপ বা পরিষ্কার উৎসের পানি ব্যবহার করুন।" },
    { id: "gap:land:manure", phase: "land", title: "শুধু পচা জৈব সার", desc: "কাঁচা গোবর সম্পূর্ণ নিষেধ। ভালোভাবে পচা কম্পোস্ট / ভার্মি / ট্রাইকো-কম্পোস্ট দিন।" },
    { id: "gap:land:buffer", phase: "land", title: "বাফার জোন তৈরি", desc: "পাশের সাধারণ জমির স্প্রে যেন না আসে — সীমানায় ১-২ সারি ধঞ্চে/ভুট্টা বা নেট দিন।" },
    { id: "gap:seed:certified", phase: "seed", title: "প্রত্যয়িত বীজ/চারা", desc: "অনুমোদিত উৎসের বীজ কিনুন, রসিদ ও প্যাকেট সংরক্ষণ করুন।" },
    { id: "gap:seed:treat", phase: "seed", title: "জৈব বীজ শোধন", desc: "ট্রাইকোডার্মা (৫ গ্রাম/কেজি বীজ) দিয়ে বীজ বা চারার শিকড় শোধন করুন।" },
    ...p.ipm.map((t, i) => ({ id: `gap:ipm:${i}`, phase: "ipm" as const, title: t, desc: `মূল বালাই: ${p.keyPests.join(", ")}। রাসায়নিকের আগে এটি প্রথমে করুন।` })),
    { id: "gap:spray:approved", phase: "spray", title: "শুধু DAE অনুমোদিত সবুজ/নীল লেবেলের ওষুধ", desc: `WHO Class Ia/Ib (লাল লেবেল) ওষুধ নিষেধ। আগে জৈব বিকল্প: ${p.bioOptions.join(", ")}।` },
    { id: "gap:spray:phi", phase: "spray", title: `সংগ্রহের ${p.phiDays} দিন আগে স্প্রে বন্ধ`, desc: "লেবেলে লেখা PHI এর চেয়ে বেশি হলে লেবেলের দিন মানুন। PHI শেষ না হলে ফসল তুলবেন না।" },
    { id: "gap:spray:ppe", phase: "spray", title: "সুরক্ষা পোশাক (PPE)", desc: "মাস্ক, গ্লাভস, ফুলহাতা জামা ও বুট পরুন; বাতাসের অনুকূলে স্প্রে করুন; শিশুদের দূরে রাখুন।" },
    { id: "gap:spray:storage", phase: "spray", title: "ওষুধ তালাবদ্ধ ঘরে, খালি বোতল ধ্বংস", desc: "খাবার ও পানির উৎস থেকে দূরে রাখুন। খালি বোতল ছিদ্র করে মাটিতে পুঁতে ফেলুন।" },
    ...p.harvest.map((t, i) => ({ id: `gap:harvest:${i}`, phase: "harvest" as const, title: t, desc: "পরিষ্কার হাত ও পাত্র ব্যবহার করুন; ফসল কখনও সরাসরি মাটিতে রাখবেন না।" })),
    { id: "gap:harvest:wash", phase: "harvest", title: "পরিষ্কার পানিতে ধোয়া ও ছায়ায় রাখা", desc: "পুকুর/নর্দমার পানিতে ধোবেন না।" },
    { id: "gap:record:log", phase: "record", title: "সব সার ও স্প্রের তারিখ, নাম, মাত্রা লিখুন", desc: "অ্যাপের স্প্রে শিডিউল ও আয়-ব্যয়ে এন্ট্রি দিলে রেকর্ড থাকবে; GAP পরিদর্শক এটি দেখতে চাইবেন।" },
    { id: "gap:record:contact", phase: "record", title: "উপজেলা কৃষি অফিসে GAP নিবন্ধন", desc: "সার্টিফিকেশনের জন্য উপজেলা কৃষি অফিসারের সাথে যোগাযোগ করুন।" },
  ];
  return common;
}
