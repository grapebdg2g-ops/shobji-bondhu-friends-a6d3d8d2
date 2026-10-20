import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  MapPin,
  Navigation,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { getWeatherForecast } from "@/lib/weather.functions";
import { weatherCodeBn } from "@/lib/weather-rules";
import { useGeolocation } from "@/hooks/use-geolocation";
import type { Forecast, DailyPoint, CurrentWeather } from "@/lib/weather-types";
import { dashboardWeatherLocation } from "@/lib/weather-location";
import { getDistricts } from "@/data/bd-locations";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const BN_DAYS = ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহঃ", "শুক্র", "শনি"];

const toBn = (n: number | string) => String(n).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);

function weatherEmoji(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 2) return "⛅";
  if (code === 3) return "☁️";
  if (code >= 45 && code <= 48) return "🌫️";
  if (code >= 51 && code <= 57) return "🌦️";
  if (code >= 61 && code <= 65) return "🌧️";
  if (code >= 71 && code <= 77) return "🌨️";
  if (code >= 80 && code <= 82) return "🌧️";
  if (code === 95) return "⛈️";
  if (code >= 96) return "🌩️";
  return "🌤️";
}

function farmingAdvice(
  c: CurrentWeather,
  today: DailyPoint | undefined,
): {
  text: string;
  tone: "good" | "warn" | "danger";
} {
  if (c.weather_code === 95 || c.weather_code >= 96)
    return { text: "⛈️ বজ্রপাতের সম্ভাবনা — মাঠে যাবেন না", tone: "danger" };
  if (c.wind_speed > 30) return { text: "💨 ঝড়ো বাতাস — ফসল বেঁধে রাখুন", tone: "danger" };
  const rainProb = Math.max(c.precipitation_prob, today?.precipitation_probability_max ?? 0);
  if (rainProb > 70)
    return { text: "⚠️ আজ সেচ দেওয়ার প্রয়োজন নেই — বৃষ্টির সম্ভাবনা", tone: "warn" };
  if (c.temperature > 35) return { text: "🌡️ গরম বেশি — ফসলে সকালে পানি দিন", tone: "warn" };
  return { text: "✅ আজকের আবহাওয়া চাষের জন্য ভালো", tone: "good" };
}

const tonePresentation: Record<
  "good" | "warn" | "danger",
  {
    label: string;
    badge: string;
    icon: typeof CheckCircle2;
    card: string;
    iconWrap: string;
    iconColor: string;
    badgeColor: string;
  }
> = {
  good: {
    label: "আবহাওয়া চাষের জন্য ভালো",
    badge: "নিরাপদ",
    icon: CheckCircle2,
    card: "border-primary/20 bg-card",
    iconWrap: "bg-primary/10",
    iconColor: "text-primary",
    badgeColor: "bg-primary/10 text-primary",
  },
  warn: {
    label: "আজ একটু সতর্ক থাকুন",
    badge: "সতর্কতা",
    icon: AlertTriangle,
    card: "border-accent bg-card",
    iconWrap: "bg-accent",
    iconColor: "text-accent-foreground",
    badgeColor: "bg-accent text-accent-foreground",
  },
  danger: {
    label: "আজ মাঠে যাওয়ার আগে সতর্ক হন",
    badge: "জরুরি",
    icon: ShieldAlert,
    card: "border-destructive/30 bg-card",
    iconWrap: "bg-destructive/10",
    iconColor: "text-destructive",
    badgeColor: "bg-destructive/10 text-destructive",
  },
};

export function DashboardWeatherWidget({
  district,
  upazila,
}: {
  district: string | null | undefined;
  upazila?: string | null;
}) {
  const fetchForecast = useServerFn(getWeatherForecast);
  const { pos, status: geoStatus, request: requestGeo } = useGeolocation(true);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const location = dashboardWeatherLocation(district, upazila, pos, selectedDistrict);
  const controls = (
    <div data-guest-allow className="flex flex-wrap items-center gap-2">
      <Select value={location.district} onValueChange={setSelectedDistrict}>
        <SelectTrigger aria-label="আবহাওয়ার জেলা" className="h-11 w-auto min-w-36 flex-1 bg-background">
          <MapPin className="h-4 w-4 shrink-0 text-primary" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent data-guest-allow>
          {getDistricts().map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}
        </SelectContent>
      </Select>
      <Button variant="ghost" size="icon" aria-label="লাইভ লোকেশন" title="লাইভ লোকেশন" disabled={geoStatus === "loading"} onClick={() => { setSelectedDistrict(null); requestGeo(); }}>
        <Navigation className="h-4 w-4" />
      </Button>
    </div>
  );

  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ["weather-dashboard", location.district, location.upazila, location.lat, location.lng],
    queryFn: () =>
      fetchForecast({
        data: {
          district: location.district,
          upazila: location.upazila,
          lat: location.lat,
          lng: location.lng,
        },
      }),
    staleTime: 30 * 60_000,
    refetchInterval: 30 * 60_000,
  });

  if (isLoading) {
    return (
      <section className="w-full px-4 pt-4 sm:px-5 sm:pt-5">
        {controls}
        <div className="rounded-2xl bg-card border border-border p-4 animate-pulse h-44" />
      </section>
    );
  }

  if (error || !data || !data.forecast) {
    return (
      <section className="w-full px-4 pt-4 sm:px-5 sm:pt-5">
        {controls}
        <div className="rounded-2xl bg-card border border-border p-4 text-sm text-muted-foreground">
          আবহাওয়া তথ্য আনা যায়নি।{" "}
          <Button data-guest-allow variant="link" onClick={() => refetch()} className="text-primary font-semibold">
            আবার চেষ্টা
          </Button>
        </div>
      </section>
    );
  }

  const f: Forecast = data.forecast;
  const c = f.current;
  const today = f.daily[0];
  const advice = farmingAdvice(c, today);
  const { usingGps, label: loc } = location;

  return (
    <section className="w-full space-y-4 px-4 pt-4 sm:space-y-5 sm:px-5 sm:pt-5">
      {geoStatus === "prompt" && (
        <Button data-guest-allow
          onClick={() => { setSelectedDistrict(null); requestGeo(); }}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary/10 border border-primary/30 text-primary text-sm font-semibold py-2.5 active:scale-[0.99] transition"
        >
          <Navigation className="h-4 w-4" />
          লাইভ লোকেশন থেকে আবহাওয়া দেখুন
        </Button>
      )}
      <div
        className="home-pressable block w-full overflow-hidden rounded-[24px] border border-border bg-card shadow-[var(--shadow-card)]"
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-3">
          <div className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-foreground">
            <MapPin className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">{loc}</span>
            {usingGps && (
              <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                GPS
              </span>
            )}
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2.5">
            <Button data-guest-allow variant="ghost" size="icon"
              onClick={() => refetch()}
              aria-label="আপডেট"
              title="আবহাওয়া আপডেট"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
        <div className="px-4 pt-3">{controls}</div>
        {!district && !usingGps && selectedDistrict === null && <p className="px-4 pt-2 text-xs text-muted-foreground">ডিফল্ট এলাকা: ঢাকা</p>}

        {/* Current */}
        <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-3 p-4 sm:grid-cols-[6.5rem_minmax(0,1fr)] sm:gap-4 sm:p-5">
          <div className="flex items-center justify-center text-5xl sm:text-6xl">
            {weatherEmoji(c.weather_code)}
          </div>
          <div className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-1 text-xs sm:grid-cols-2 sm:text-sm">
            <div className="col-span-2 truncate font-semibold text-muted-foreground">
              {weatherCodeBn(c.weather_code)}
            </div>
            <div>
              <span className="text-muted-foreground">তাপমাত্রা:</span>{" "}
              <span className="font-bold">{toBn(Math.round(c.temperature))}°C</span>
            </div>
            <div>
              <span className="text-muted-foreground">আর্দ্রতা:</span>{" "}
              <span className="font-bold">{toBn(Math.round(c.humidity))}%</span>
            </div>
            <div>
              <span className="text-muted-foreground">বাতাস:</span>{" "}
              <span className="font-bold">{toBn(Math.round(c.wind_speed))} km/h</span>
            </div>
            <div>
              <span className="text-muted-foreground">বৃষ্টি:</span>{" "}
              <span className="font-bold">{toBn(c.precipitation_prob)}%</span>
            </div>
          </div>
        </div>

        {/* 5-day */}
        <div className="border-t border-border px-3 py-3 sm:px-4">
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
            {f.daily.slice(0, 5).map((d, i) => {
              const date = new Date(d.date);
              const label = i === 0 ? "আজ" : i === 1 ? "কাল" : BN_DAYS[date.getDay()];
              return (
                <div
                  key={d.date}
                  className="min-w-0 rounded-xl bg-muted/30 px-1 py-2 text-center sm:py-2.5"
                >
                  <p className="truncate text-[10px] font-semibold sm:text-xs">{label}</p>
                  <p className="text-xl leading-7 sm:text-2xl">{weatherEmoji(d.weather_code)}</p>
                  <p className="text-[11px] font-bold sm:text-xs">
                    {toBn(Math.round(d.temp_max))}°
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Farming advice */}
      {(() => {
        const presentation = tonePresentation[advice.tone];
        const AdviceIcon = presentation.icon;
        const adviceTitle = advice.text.replace(/^[^\p{L}\p{N}]+/u, "").trim();
        return (
          <div
            role="status"
            aria-live="polite"
            className={`home-rise-in rounded-[22px] border p-3.5 shadow-[var(--shadow-card)] sm:p-4 ${presentation.card}`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${presentation.iconWrap}`}
              >
                <AdviceIcon className={`h-5 w-5 ${presentation.iconColor}`} strokeWidth={2.4} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">
                    আজকের কৃষি পরামর্শ
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${presentation.badgeColor}`}
                  >
                    {presentation.badge}
                  </span>
                </div>
                <h3 className="mt-1 text-sm font-extrabold leading-snug text-foreground sm:text-base">
                  {presentation.label}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{adviceTitle}</p>
              </div>
              <Lightbulb
                className={`mt-1 hidden h-4 w-4 shrink-0 sm:block ${presentation.iconColor}`}
              />
            </div>
            <Link
              to="/weather"
              className={`mt-3 inline-flex items-center gap-1 text-xs font-extrabold ${presentation.iconColor} transition hover:gap-2`}
            >
              বিস্তারিত আবহাওয়া দেখুন <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        );
      })()}
    </section>
  );
}
