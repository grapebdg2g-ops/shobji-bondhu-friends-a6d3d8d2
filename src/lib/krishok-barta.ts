import { z } from "zod";

export function isDhakaNewsToday(pubDate: string, now = new Date()): boolean {
  const date = new Date(pubDate);
  if (!Number.isFinite(date.getTime()) || date > now) return false;
  const format = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" });
  return format.format(date) === format.format(now);
}

export function parseNewsSelection(raw: string, count: number) {
  return z.object({
    index: z.number().int().min(0).max(count),
    summary: z.string().trim().min(1).max(2000),
    tag: z.enum(["বাজারদর", "কৃষি সহায়তা", "সতর্কতা", "কৃষি সংবাদ"]).optional(),
  }).safeParse(JSON.parse(raw.replace(/```json|```/g, "").trim()));
}