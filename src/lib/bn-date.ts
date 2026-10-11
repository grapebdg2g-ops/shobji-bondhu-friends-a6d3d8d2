import { toBn } from "./bn";

const BN_MONTHS = [
  "জানুয়ারি",
  "ফেব্রুয়ারি",
  "মার্চ",
  "এপ্রিল",
  "মে",
  "জুন",
  "জুলাই",
  "আগস্ট",
  "সেপ্টেম্বর",
  "অক্টোবর",
  "নভেম্বর",
  "ডিসেম্বর",
];

export function formatBnDate(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dt.getTime())) return "—";
  return `${toBn(dt.getDate())} ${BN_MONTHS[dt.getMonth()]} ${toBn(dt.getFullYear())}`;
}

export function daysSince(d: Date | string): number {
  const dt = typeof d === "string" ? new Date(d) : d;
  const diff = Date.now() - dt.getTime();
  return Math.floor(diff / 86400000);
}

export function addDays(d: Date | string, days: number): Date {
  const dt = typeof d === "string" ? new Date(d) : new Date(d);
  dt.setDate(dt.getDate() + days);
  return dt;
}

export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
