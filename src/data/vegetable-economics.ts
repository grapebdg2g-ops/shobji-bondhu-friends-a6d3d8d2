// বাংলাদেশের সবজি চাষের আনুমানিক অর্থনৈতিক তথ্য (প্রতি বিঘা)
// সূত্র: DAE, BBS বাজারদর, কৃষি বিপণন অধিদপ্তর (২০২৪-২৫ আনুমানিক)

export type VegEconomics = {
  costs: {
    seed: number; // বীজ/চারা
    fertilizer: number; // সার
    labor: number; // শ্রমিক
    irrigation: number; // সেচ
    pesticide: number; // বালাইনাশক
    other: number; // অন্যান্য (জমি প্রস্তুতি, পরিবহন)
  };
  pricePerMaund: { min: number; max: number }; // টাকা/মণ পাইকারি
  yieldMaund: { min: number; max: number }; // মণ/বিঘা
  demand: "উচ্চ" | "মাঝারি" | "নিম্ন";
  demandNote: string;
  peakMonths: string; // সবচেয়ে ভালো দাম পাওয়ার সময়
  buyers: string; // ক্রেতা
  valueAdd?: string; // মূল্য সংযোজনের উপায়
};

export const VEG_ECONOMICS: Record<string, VegEconomics> = {
  tomato: {
    costs: {
      seed: 2500,
      fertilizer: 6000,
      labor: 12000,
      irrigation: 2500,
      pesticide: 3500,
      other: 4500,
    },
    pricePerMaund: { min: 800, max: 2500 },
    yieldMaund: { min: 80, max: 100 },
    demand: "উচ্চ",
    demandNote: "সারা দেশে রান্না, সালাদ ও সস শিল্পে ব্যাপক চাহিদা।",
    peakMonths: "নভেম্বর শুরু ও মার্চ শেষে (আগাম-নাবি)",
    buyers: "পাইকারি আড়ত, সুপারশপ, প্রাণ-আকিজ সস কারখানা।",
    valueAdd: "সস, কেচাপ বা সান-ড্রায়েড টমেটো তৈরিতে ২–৩ গুণ লাভ।",
  },
  brinjal: {
    costs: {
      seed: 1500,
      fertilizer: 5500,
      labor: 13000,
      irrigation: 3000,
      pesticide: 5000,
      other: 4000,
    },
    pricePerMaund: { min: 700, max: 2000 },
    yieldMaund: { min: 150, max: 200 },
    demand: "উচ্চ",
    demandNote: "সারা বছর স্থিতিশীল চাহিদা; ইফতারে দাম বাড়ে।",
    peakMonths: "রমজান মাস ও বর্ষাকাল",
    buyers: "স্থানীয় বাজার, পাইকারি আড়ত, রেস্তোরাঁ।",
  },
  chili: {
    costs: {
      seed: 2000,
      fertilizer: 5000,
      labor: 12000,
      irrigation: 2500,
      pesticide: 4500,
      other: 4000,
    },
    pricePerMaund: { min: 2000, max: 8000 },
    yieldMaund: { min: 40, max: 60 },
    demand: "উচ্চ",
    demandNote: "বর্ষায় দাম আকাশছোঁয়া; শুকনো মরিচের রপ্তানি সম্ভাবনা।",
    peakMonths: "জুন–সেপ্টেম্বর (বর্ষা)",
    buyers: "মসলা কোম্পানি (রাঁধুনি, প্রাণ), পাইকারি আড়ত।",
    valueAdd: "শুকিয়ে গুঁড়া করে বিক্রিতে ৩–৪ গুণ লাভ।",
  },
  "bottle-gourd": {
    costs: {
      seed: 1200,
      fertilizer: 4500,
      labor: 9000,
      irrigation: 2500,
      pesticide: 2500,
      other: 3500,
    },
    pricePerMaund: { min: 600, max: 1500 },
    yieldMaund: { min: 100, max: 150 },
    demand: "মাঝারি",
    demandNote: "শহুরে বাজারে নিয়মিত চাহিদা; পাতা-ডগারও দাম আছে।",
    peakMonths: "অক্টোবর–ডিসেম্বর",
    buyers: "স্থানীয় বাজার, কাঁচাবাজার।",
  },
  pumpkin: {
    costs: {
      seed: 1000,
      fertilizer: 4000,
      labor: 8500,
      irrigation: 2000,
      pesticide: 2000,
      other: 3500,
    },
    pricePerMaund: { min: 500, max: 1400 },
    yieldMaund: { min: 120, max: 180 },
    demand: "মাঝারি",
    demandNote: "দীর্ঘ সংরক্ষণযোগ্য বলে অফসিজনে দাম বাড়ে।",
    peakMonths: "এপ্রিল–জুন",
    buyers: "পাইকারি আড়ত, হোটেল-রেস্তোরাঁ।",
    valueAdd: "বীজ শুকিয়ে আলাদা বিক্রিতে অতিরিক্ত আয়।",
  },
  shim: {
    costs: {
      seed: 1500,
      fertilizer: 3500,
      labor: 9000,
      irrigation: 2000,
      pesticide: 2500,
      other: 3500,
    },
    pricePerMaund: { min: 1200, max: 3500 },
    yieldMaund: { min: 60, max: 80 },
    demand: "উচ্চ",
    demandNote: "শীতের শুরুতে আগাম শিমে রেকর্ড দাম।",
    peakMonths: "সেপ্টেম্বর–অক্টোবর (আগাম)",
    buyers: "পাইকারি আড়ত, সুপারশপ।",
  },
  borboti: {
    costs: {
      seed: 1000,
      fertilizer: 3500,
      labor: 8500,
      irrigation: 2500,
      pesticide: 2500,
      other: 3000,
    },
    pricePerMaund: { min: 1000, max: 2500 },
    yieldMaund: { min: 70, max: 90 },
    demand: "মাঝারি",
    demandNote: "গ্রীষ্মে নিয়মিত চাহিদা।",
    peakMonths: "এপ্রিল–মে",
    buyers: "স্থানীয় বাজার।",
  },
  okra: {
    costs: {
      seed: 1200,
      fertilizer: 4000,
      labor: 9000,
      irrigation: 3000,
      pesticide: 3000,
      other: 3500,
    },
    pricePerMaund: { min: 1000, max: 2800 },
    yieldMaund: { min: 60, max: 80 },
    demand: "উচ্চ",
    demandNote: "গ্রীষ্মে শহরের বাজারে চাহিদা সর্বোচ্চ।",
    peakMonths: "মার্চ–মে",
    buyers: "সুপারশপ, পাইকারি আড়ত, রপ্তানিকারক।",
  },
  potol: {
    costs: {
      seed: 2500,
      fertilizer: 4500,
      labor: 9500,
      irrigation: 2500,
      pesticide: 2500,
      other: 3500,
    },
    pricePerMaund: { min: 1500, max: 3500 },
    yieldMaund: { min: 80, max: 100 },
    demand: "উচ্চ",
    demandNote: "মৌসুমের শুরুতে দাম দ্বিগুণ।",
    peakMonths: "মার্চ–এপ্রিল",
    buyers: "পাইকারি আড়ত, বড় বাজার।",
  },
  bittergourd: {
    costs: {
      seed: 1500,
      fertilizer: 4000,
      labor: 9000,
      irrigation: 2500,
      pesticide: 3000,
      other: 3500,
    },
    pricePerMaund: { min: 1500, max: 3500 },
    yieldMaund: { min: 50, max: 70 },
    demand: "উচ্চ",
    demandNote: "ডায়াবেটিক রোগীদের চাহিদায় সুপারশপে দাম ভালো।",
    peakMonths: "এপ্রিল–জুন",
    buyers: "সুপারশপ, ভেষজ কোম্পানি, কাঁচাবাজার।",
    valueAdd: "শুকিয়ে গুঁড়া বা ক্যাপসুল আকারে ভেষজ বাজারে।",
  },
  spinach: {
    costs: {
      seed: 800,
      fertilizer: 2500,
      labor: 5000,
      irrigation: 1500,
      pesticide: 1000,
      other: 2500,
    },
    pricePerMaund: { min: 600, max: 1800 },
    yieldMaund: { min: 40, max: 50 },
    demand: "উচ্চ",
    demandNote: "শীতে শহুরে বাজারে সর্বোচ্চ চাহিদা।",
    peakMonths: "নভেম্বর–জানুয়ারি",
    buyers: "সুপারশপ, কাঁচাবাজার, রেস্তোরাঁ।",
  },
  lalshak: {
    costs: {
      seed: 500,
      fertilizer: 2000,
      labor: 4500,
      irrigation: 1500,
      pesticide: 800,
      other: 2200,
    },
    pricePerMaund: { min: 500, max: 1500 },
    yieldMaund: { min: 30, max: 40 },
    demand: "মাঝারি",
    demandNote: "দ্রুত ফসল; চক্রাকার চাষে নিয়মিত আয়।",
    peakMonths: "সারা বছর সমান",
    buyers: "স্থানীয় বাজার, কাঁচাবাজার।",
  },
  radish: {
    costs: {
      seed: 1000,
      fertilizer: 3000,
      labor: 6000,
      irrigation: 2000,
      pesticide: 1500,
      other: 2500,
    },
    pricePerMaund: { min: 400, max: 1200 },
    yieldMaund: { min: 100, max: 150 },
    demand: "মাঝারি",
    demandNote: "শীতের শুরুতে আগাম মুলায় দাম ভালো।",
    peakMonths: "অক্টোবর–নভেম্বর",
    buyers: "পাইকারি আড়ত, স্থানীয় বাজার।",
  },
  carrot: {
    costs: {
      seed: 3000,
      fertilizer: 4500,
      labor: 9000,
      irrigation: 2500,
      pesticide: 2000,
      other: 4000,
    },
    pricePerMaund: { min: 1000, max: 3000 },
    yieldMaund: { min: 80, max: 100 },
    demand: "উচ্চ",
    demandNote: "শহরে সালাদ ও জুসের জন্য চাহিদা ক্রমবর্ধমান।",
    peakMonths: "ডিসেম্বর–জানুয়ারি",
    buyers: "সুপারশপ, জুস বার, রেস্তোরাঁ, পাইকারি আড়ত।",
  },
  cauliflower: {
    costs: {
      seed: 2000,
      fertilizer: 6000,
      labor: 11000,
      irrigation: 2500,
      pesticide: 3500,
      other: 4000,
    },
    pricePerMaund: { min: 800, max: 3500 },
    yieldMaund: { min: 100, max: 150 },
    demand: "উচ্চ",
    demandNote: "আগাম জাতে দাম দ্বিগুণ-তিনগুণ।",
    peakMonths: "সেপ্টেম্বর–অক্টোবর (আগাম)",
    buyers: "পাইকারি আড়ত, সুপারশপ।",
  },
  cabbage: {
    costs: {
      seed: 1800,
      fertilizer: 6000,
      labor: 10000,
      irrigation: 2500,
      pesticide: 3000,
      other: 3700,
    },
    pricePerMaund: { min: 500, max: 1800 },
    yieldMaund: { min: 150, max: 200 },
    demand: "উচ্চ",
    demandNote: "শীতের শেষে রপ্তানির (মালয়েশিয়া, সিঙ্গাপুর) সম্ভাবনা।",
    peakMonths: "নভেম্বর–ডিসেম্বর",
    buyers: "পাইকারি আড়ত, রপ্তানিকারক, সুপারশপ।",
  },
  broccoli: {
    costs: {
      seed: 4000,
      fertilizer: 6500,
      labor: 11000,
      irrigation: 2500,
      pesticide: 3000,
      other: 4000,
    },
    pricePerMaund: { min: 2500, max: 6000 },
    yieldMaund: { min: 80, max: 100 },
    demand: "উচ্চ",
    demandNote: "শহুরে অভিজাত শ্রেণি ও সুপারশপে চাহিদা দ্রুত বাড়ছে।",
    peakMonths: "ডিসেম্বর–ফেব্রুয়ারি",
    buyers: "সুপারশপ (স্বপ্ন, মীনা বাজার), রেস্তোরাঁ, হোটেল।",
  },
  potato: {
    costs: {
      seed: 12000,
      fertilizer: 8000,
      labor: 11000,
      irrigation: 3000,
      pesticide: 3500,
      other: 5500,
    },
    pricePerMaund: { min: 600, max: 2000 },
    yieldMaund: { min: 250, max: 350 },
    demand: "উচ্চ",
    demandNote: "প্রধান অর্থকরী ফসল; কোল্ড স্টোরেজ করে অফসিজনে বিক্রিতে বেশি লাভ।",
    peakMonths: "জুলাই–সেপ্টেম্বর (অফসিজন)",
    buyers: "কোল্ড স্টোরেজ, প্রাণ-বম্বে চিপস কারখানা, রপ্তানিকারক।",
    valueAdd: "চিপস, ফ্রেঞ্চ ফ্রাই বা স্টার্চ তৈরিতে ৩ গুণ লাভ।",
  },
  onion: {
    costs: {
      seed: 8000,
      fertilizer: 6500,
      labor: 12000,
      irrigation: 3500,
      pesticide: 3000,
      other: 5000,
    },
    pricePerMaund: { min: 1500, max: 5000 },
    yieldMaund: { min: 80, max: 120 },
    demand: "উচ্চ",
    demandNote: "জাতীয় ঘাটতি বিদ্যমান; সংরক্ষণ করে দাম বাড়লে বিক্রিতে দ্বিগুণ লাভ।",
    peakMonths: "আগস্ট–অক্টোবর (অফসিজন)",
    buyers: "পাইকারি আড়ত, খাতুনগঞ্জ, রপ্তানিকারক।",
    valueAdd: "ডিহাইড্রেটেড পেঁয়াজ গুঁড়া রপ্তানিযোগ্য পণ্য।",
  },
  garlic: {
    costs: {
      seed: 15000,
      fertilizer: 5500,
      labor: 10000,
      irrigation: 3000,
      pesticide: 2500,
      other: 4500,
    },
    pricePerMaund: { min: 4000, max: 9000 },
    yieldMaund: { min: 40, max: 60 },
    demand: "উচ্চ",
    demandNote: "আমদানি নির্ভরশীল; দেশি রসুনের দাম সবসময় ভালো।",
    peakMonths: "জুলাই–সেপ্টেম্বর",
    buyers: "মসলা কোম্পানি, পাইকারি আড়ত, ভেষজ কোম্পানি।",
  },
  ginger: {
    costs: {
      seed: 18000,
      fertilizer: 6000,
      labor: 12000,
      irrigation: 3000,
      pesticide: 2500,
      other: 5000,
    },
    pricePerMaund: { min: 3500, max: 9000 },
    yieldMaund: { min: 60, max: 80 },
    demand: "উচ্চ",
    demandNote: "আমদানি বিকল্প হিসেবে দেশি আদার চাহিদা বাড়ছে।",
    peakMonths: "নভেম্বর–জানুয়ারি",
    buyers: "মসলা কোম্পানি, ভেষজ কোম্পানি, পাইকারি আড়ত।",
    valueAdd: "শুকিয়ে গুঁড়া বা জিঞ্জার অয়েলে কয়েক গুণ লাভ।",
  },
  turmeric: {
    costs: {
      seed: 8000,
      fertilizer: 5500,
      labor: 11000,
      irrigation: 2500,
      pesticide: 2000,
      other: 4500,
    },
    pricePerMaund: { min: 1500, max: 4000 },
    yieldMaund: { min: 100, max: 150 },
    demand: "উচ্চ",
    demandNote: "মসলা ও ভেষজ শিল্পে ব্যাপক চাহিদা; রপ্তানিযোগ্য।",
    peakMonths: "জানুয়ারি–মার্চ",
    buyers: "রাঁধুনি/প্রাণ মসলা, ভেষজ কোম্পানি, রপ্তানিকারক।",
    valueAdd: "সিদ্ধ ও শুকিয়ে গুঁড়া করলে ৩ গুণ দাম।",
  },
};

export function getEconomicsBySlug(slug: string): VegEconomics | undefined {
  return VEG_ECONOMICS[slug];
}

export function calcTotalCost(e: VegEconomics): number {
  const c = e.costs;
  return c.seed + c.fertilizer + c.labor + c.irrigation + c.pesticide + c.other;
}

// বাংলা সংখ্যা ফরম্যাট
const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
export function toBn(n: number | string): string {
  return String(n).replace(/\d/g, (d) => BN_DIGITS[+d]);
}
export function fmtBDT(n: number): string {
  return "৳" + toBn(n.toLocaleString("en-US"));
}
