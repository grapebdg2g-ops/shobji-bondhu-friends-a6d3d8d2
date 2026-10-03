// Tomato-specific spray schedule supplied by the farmer/agronomist:
// day-offset nutrient sprays, transplant Trichoderma drench, and fixed
// calendar-date pest sprays with a late-blight spray 3 days after each.
import { PESTICIDE_GUIDE } from "@/data/pesticide-guide";
import { addDays, toIsoDate } from "@/lib/bn-date";
import type { SprayEvent } from "@/lib/spray-schedule";

const prob = (id: string) => PESTICIDE_GUIDE.find((p) => p.id === id);

const NUTRIENTS: { day: number; range: string; title: string; dose: string; purpose: string }[] = [
  { day: 5, range: "৫–৭", title: "সিউইড এক্সট্র্যাক্ট", dose: "১০–২০ মিলি", purpose: "চারা রোপণের ধকল (transplant shock) কমানো" },
  { day: 12, range: "১২–১৪", title: "ক্যালসিয়াম নাইট্রেট", dose: "১০–১৫ গ্রাম", purpose: "গাছ শক্ত করা, ক্যালসিয়াম সরবরাহ" },
  { day: 18, range: "১৮–২০", title: "ম্যাগনেসিয়াম সালফেট", dose: "৫–১০ গ্রাম", purpose: "Mg/S সরবরাহ, পাতার সবুজ কণা (ক্লোরোফিল)" },
  { day: 25, range: "২৫–২৭", title: "অণুখাদ্য মিশ্রণ (Zn+B+Fe+Mn)", dose: "লেবেল ডোজ", purpose: "অণুখাদ্যের ঘাটতি প্রতিরোধ" },
  { day: 32, range: "৩২–৩৫", title: "ক্যালসিয়াম নাইট্রেট", dose: "১০–১৫ গ্রাম", purpose: "ফুলের প্রস্তুতি ও ক্যালসিয়াম সরবরাহ" },
  { day: 40, range: "৪০–৪২", title: "পটাশিয়াম সমৃদ্ধ সার", dose: "লেবেল ডোজ", purpose: "ফুল ও ফল ধরা" },
  { day: 48, range: "৪৮–৫০", title: "ম্যাগনেসিয়াম সালফেট", dose: "৫–১০ গ্রাম", purpose: "পাতার কার্যক্ষমতা বাড়ানো" },
  { day: 55, range: "৫৫–৫৮", title: "ক্যালসিয়াম নাইট্রেট", dose: "১০–১৫ গ্রাম", purpose: "ফলের প্রাথমিক বৃদ্ধি" },
  { day: 63, range: "৬৩–৬৫", title: "পটাশিয়াম সার", dose: "লেবেল ডোজ", purpose: "ফলের আকার ও গুণমান" },
  { day: 70, range: "৭০–৭২", title: "অণুখাদ্য + বোরন", dose: "লেবেল ডোজ", purpose: "ফুল ও ফল ঝরে পড়া রোধ" },
  { day: 78, range: "৭৮–৮০", title: "ক্যালসিয়াম নাইট্রেট", dose: "১০ গ্রাম", purpose: "ফলে ক্যালসিয়াম সরবরাহ" },
  { day: 87, range: "৮৭–৯০", title: "পটাশিয়াম সার", dose: "লেবেল ডোজ", purpose: "ফলের মান ও দৃঢ়তা" },
];

/** First occurrence of month/day on or after the planting date. */
function nextDate(planting: Date, month: number, day: number): Date {
  const d = new Date(planting.getFullYear(), month - 1, day);
  if (d < planting) d.setFullYear(d.getFullYear() + 1);
  return d;
}

const dayDiff = (a: Date, b: Date) => Math.round((a.getTime() - b.getTime()) / 86400000);

export function buildTomatoSchedule(plantingDate: string, totalDays: number): SprayEvent[] {
  const p = new Date(plantingDate);
  const planting = new Date(p.getFullYear(), p.getMonth(), p.getDate());
  const events: SprayEvent[] = [];
  const inCrop = (day: number) => day >= 0 && day <= totalDays;

  events.push({
    id: "spray::tomato::damping",
    day: 0,
    title: "ড্যাম্পিং অফ (টমেটো) দমন — বীজ/বীজতলা শোধন",
    desc: "চারার গোড়া পচা রোধে বীজ শোধন ও বীজতলার মাটি ভিজিয়ে দিন।",
    kind: "disease", stageName: "বীজতলা", stageIcon: "🌱", problem: prob("tomato-damping"),
  });
  events.push({
    id: "spray::tomato::trichoderma",
    day: 1,
    title: "ট্রাইকোডার্মা ড্রেঞ্চিং (গোড়ায়)",
    desc: "চারা লাগানোর সাথে সাথে গাছের গোড়ায় ট্রাইকোডার্মা গোলানো পানি ঢেলে দিন (লেবেল ডোজ) — গোড়া পচা ও মাটিবাহিত রোগ প্রতিরোধ।",
    kind: "disease", stageName: "রোপণ", stageIcon: "🚜",
  });

  const fixed = (key: string, date: Date, title: string, desc: string, kind: "pest" | "disease", problemId?: string) => {
    const day = dayDiff(date, planting);
    if (!inCrop(day)) return;
    events.push({ id: `spray::tomato::${key}::${toIsoDate(date)}`, day, title, desc, kind, stageName: "নির্ধারিত তারিখ", stageIcon: "📅", problem: problemId ? prob(problemId) : undefined });
  };

  fixed("mz-cb", nextDate(planting, 11, 15), "ম্যানকোজেব + কার্বেন্ডাজিম স্প্রে", "ছত্রাকজনিত রোগ (ব্লাইট, উইল্ট) প্রতিরোধে পুরো গাছে স্প্রে করুন।", "disease");
  const wfm = "সাদা মাছি + মাকড় দমন স্প্রে";
  const wfmDesc = "সাদা মাছি ও মাকড়ের ঔষধ একসাথে — পাতার নিচের দিকে ভালোভাবে স্প্রে করুন।";
  for (const [m, d] of [[11, 25], [11, 30], [12, 7]] as const) {
    fixed("wfm", nextDate(planting, m, d), wfm, wfmDesc, "pest", "tomato-whitefly");
  }

  // From 22 Dec: every 5 days whitefly + mite + fruit borer, late blight 3 days after each, until crop ends.
  const end = addDays(planting, totalDays);
  for (let d = nextDate(planting, 12, 22); d <= end; d = addDays(d, 5)) {
    fixed("wfmfb", d, "সাদা মাছি + মাকড় + ফল ছিদ্রকারী পোকা স্প্রে", "তিনটি পোকার ঔষধ একসাথে — পুরো গাছে, বিশেষত ফুল, ফল ও পাতার নিচে।", "pest", "tomato-fruitborer");
    fixed("lb", addDays(d, 3), "লেট ব্লাইট (টমেটো) প্রতিরোধ স্প্রে", "কীটনাশক স্প্রের ৩ দিন পর লেট ব্লাইটের ঔষধ পাতা ও কান্ডে স্প্রে করুন।", "disease", "tomato-lateblight");
  }

  for (const n of NUTRIENTS) {
    if (!inCrop(n.day)) continue;
    events.push({
      id: `spray::tomato::nutrient::${n.day}`,
      day: n.day,
      title: n.title,
      desc: `${n.range} দিনে · প্রতি ১০ লিটার পানিতে ${n.dose} · উদ্দেশ্য: ${n.purpose}`,
      kind: "nutrient", stageName: `${n.range} দিন`, stageIcon: "🌿",
    });
  }

  return events.sort((a, b) => a.day - b.day);
}

export const TOMATO_SPRAY_NOTES = [
  "বৃষ্টি হলে পরের দিন কপার জাতীয় ছত্রাকনাশক (যেমন কপার অক্সিক্লোরাইড) স্প্রে করুন।",
  "আকাশে মেঘ থাকলে স্প্রের সাথে স্টিকার (আঠা) মিশিয়ে নিন, যাতে বৃষ্টির পানিতে ঔষধ ধুয়ে না যায়।",
];
