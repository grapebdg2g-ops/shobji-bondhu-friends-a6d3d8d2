// Weather-triggered IPM risk rules (pure; safe on client and server).
import type { Forecast } from "./weather-types";

export type IpmAlert = { crop: string; title: string; body: string };

const BLIGHT = ["টমেটো", "আলু"];
const FUNGAL = ["মরিচ", "বেগুন", "শসা", "লাউ", "মিষ্টি কুমড়া", "করলা", "ক্যাপসিকাম"];
const SUCKING = ["বেগুন", "মরিচ", "শিম", "বরবটি", "শসা", "টমেটো", "ক্যাপসিকাম"];

export function ipmWeatherAlerts(f: Forecast, crops: string[]): IpmAlert[] {
  const temps = f.hourly.slice(0, 24).map((h) => h.temperature);
  const rain = Math.max(0, ...f.hourly.slice(0, 24).map((h) => h.precipitation_probability));
  const tMin = temps.length ? Math.min(...temps) : f.current.temperature;
  const tMax = temps.length ? Math.max(...temps) : f.current.temperature;
  const humid = f.current.humidity >= 85 || rain >= 60;
  const out: IpmAlert[] = [];
  for (const crop of new Set(crops)) {
    if (BLIGHT.includes(crop) && humid && tMin >= 10 && tMax <= 25)
      out.push({
        crop,
        title: `⚠️ ${crop}: লেট ব্লাইটের ঝুঁকি`,
        body: "ঠান্ডা ও ভেজা আবহাওয়া। আজই পাতার নিচে বাদামি দাগ খুঁজুন, আক্রান্ত পাতা তুলে ফেলুন, সেচ কমান।",
      });
    else if (FUNGAL.includes(crop) && humid && tMax >= 25)
      out.push({
        crop,
        title: `⚠️ ${crop}: ছত্রাক রোগের ঝুঁকি`,
        body: "গরম ও আর্দ্র আবহাওয়া। পাতায় দাগ বা পচন দেখুন, জমির পানি নিকাশ রাখুন, গাছ ঘন হলে ছাঁটাই করুন।",
      });
    else if (SUCKING.includes(crop) && !humid && tMax >= 32 && rain < 30)
      out.push({
        crop,
        title: `⚠️ ${crop}: জাবপোকা/সাদা মাছির ঝুঁকি`,
        body: "গরম ও শুকনা আবহাওয়ায় রস-চোষা পোকা বাড়ে। হলুদ আঠালো ফাঁদ দিন, পাতার নিচে দেখুন।",
      });
  }
  return out;
}
