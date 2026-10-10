// Pure helpers for the spray schedule: weather window, tank calculator,
// tank-mix order/compatibility and PHI safety. Safe on client and server.
import type { Forecast } from "./weather-types";
import { getAllChemicalInfo } from "@/data/crop-knowledge";

export const TANK_LITERS = 16;
/** Typical knapsack spray volume: about 3 litres of water per শতক. */
export const LITERS_PER_SHOTOK = 3;

const BN = "০১২৩৪৫৬৭৮৯";
export function bnToNum(s: string): string {
  return s.replace(/[০-৯]/g, (d) => String(BN.indexOf(d)));
}

/** Parses "১ মিলি / লিটার পানি" → { amount: 1, unit: "মিলি" }. */
export function parseDosePerLiter(dose: string): { amount: number; unit: "মিলি" | "গ্রাম" } | null {
  const m = bnToNum(dose).match(/([\d.]+)\s*(মিলি|গ্রাম|ml|g)/i);
  if (!m) return null;
  const amount = parseFloat(m[1]);
  if (!isFinite(amount) || amount <= 0) return null;
  return { amount, unit: /গ্রাম|g/i.test(m[2]) ? "গ্রাম" : "মিলি" };
}

export function tankPlan(shotok: number, dosePerLiter: number) {
  const water = Math.max(0, shotok) * LITERS_PER_SHOTOK;
  const tanks = Math.ceil(water / TANK_LITERS);
  return {
    waterLiters: water,
    tanks,
    perTank: Math.round(dosePerLiter * TANK_LITERS * 10) / 10,
    total: Math.round(dosePerLiter * water * 10) / 10,
  };
}

export type SprayWeather = { ok: boolean; reasons: string[]; bestTime: string };

/** Judges whether today is suitable for spraying using the next 24 hours. */
export function evaluateSprayWeather(f: Forecast): SprayWeather {
  const next = f.hourly.slice(0, 24);
  const rain = Math.max(f.current.precipitation_prob ?? 0, ...next.map((h) => h.precipitation_probability));
  const storm = Math.max(f.current.weather_code, ...next.map((h) => h.weather_code)) >= 95;
  const reasons: string[] = [];
  if (storm) reasons.push("বজ্রঝড়ের সম্ভাবনা");
  if (rain > 50) reasons.push(`বৃষ্টির সম্ভাবনা ${Math.round(rain)}% — ওষুধ ধুয়ে যাবে`);
  if (f.current.wind_speed > 20) reasons.push(`বাতাস বেশি (${Math.round(f.current.wind_speed)} কিমি/ঘণ্টা) — ওষুধ উড়ে যাবে`);
  if (f.current.temperature > 35) reasons.push(`তাপমাত্রা বেশি (${Math.round(f.current.temperature)}°C) — দুপুরে স্প্রে করবেন না`);
  const ok = !storm && rain <= 50 && f.current.wind_speed <= 20;
  return { ok, reasons, bestTime: "সকাল ৭টা–৯টা অথবা বিকেল ৪টা–৬টা" };
}

/** Mixing order rank by formulation (lower goes into the tank first). */
export function mixRank(name: string): number {
  const s = name.toLowerCase();
  if (/ডব্লিউজি|ডব্লিউডিজি|wdg|wg|এসজি|sg|দানাদার/.test(s)) return 1;
  if (/ডব্লিউপি|wp|এসপি|sp|পাউডার/.test(s)) return 2;
  if (/এসসি|sc|সাসপেনশন/.test(s)) return 3;
  if (/ইসি|ec|এসএল|sl|তরল/.test(s)) return 4;
  return 5; // PGR, vitamins, micronutrients and others last
}
export const MIX_LABELS = ["", "দানাদার (WG/SG)", "পাউডার (WP/SP)", "সাসপেনশন (SC)", "তরল (EC/SL)", "ভিটামিন/অনুখাদ্য/অন্যান্য"];

const COPPER_SULFUR = /কপার|তামা|সালফার|গন্ধক|বোর্দো|copper|sulfur|sulphur/i;
const ALKALINE = /চুন|বোর্দো|lime/i;

/** Returns warnings for mixing the given products in one tank. */
export function tankMixWarnings(names: string[]): string[] {
  const w: string[] = [];
  const cs = names.filter((n) => COPPER_SULFUR.test(n));
  if (cs.length && names.length > cs.length)
    w.push("কপার/সালফার জাতীয় ওষুধ অন্য কীটনাশক বা ভিটামিনের সাথে মেশাবেন না — আলাদা দিনে দিন।");
  if (names.some((n) => ALKALINE.test(n)) && names.length > 1)
    w.push("চুন/বোর্দো মিশ্রণ ক্ষারীয় — বেশিরভাগ কীটনাশকের কার্যকারিতা নষ্ট করে।");
  if (names.length > 3) w.push("এক ড্রামে ৩টির বেশি ওষুধ মেশাবেন না।");
  return w;
}

export function maxPhiDays(names: string[]): number {
  return Math.max(0, ...names.flatMap((n) => getAllChemicalInfo(n).map((a) => a.phiDays)));
}

/** True when spraying on `sprayDay` leaves fewer days than PHI before harvest. */
export function phiConflict(sprayDay: number, harvestDay: number, phi: number) {
  const left = harvestDay - sprayDay;
  return { conflict: phi > 0 && left < phi, daysLeft: left };
}
