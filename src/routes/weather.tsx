import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Cloud,
  Droplets,
  Wind,
  Thermometer,
  Sun,
  CloudRain,
  CloudLightning,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip as RTooltip } from "recharts";
import { getWeatherForecast } from "@/lib/weather.functions";
import { weatherCodeBn } from "@/lib/weather-rules";
import { useUser } from "@/contexts/user-context";
import type { Forecast, DailyPoint } from "@/lib/weather-types";
import { NotificationToggle } from "@/components/krishi/notification-toggle";
import { useGeolocation } from "@/hooks/use-geolocation";
import { Navigation } from "lucide-react";

export const Route = createFileRoute("/weather")({
  component: WeatherPage,
  head: () => ({
    meta: [
      { title: "আবহাওয়া — কৃষক বন্ধু" },
      {
        name: "description",
        content: "আপনার জেলার আজকের ও আগামী ৭ দিনের আবহাওয়া + কৃষি পরামর্শ।",
      },
    ],
  }),
});

function weatherIcon(code: number, className = "h-6 w-6") {
  if (code >= 95) return <CloudLightning className={className} />;
  if (code >= 61) return <CloudRain className={className} />;
  if (code >= 45) return <Cloud className={className} />;
  if (code <= 2) return <Sun className={className} />;
  return <Cloud className={className} />;
}

const BN_DAYS = ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহঃ", "শুক্র", "শনি"];

function farmingTip(d: DailyPoint): string {
  if (d.weather_code >= 95) return "⛈️ মাঠে যাবেন না";
  if (d.precipitation_probability_max > 70 || d.weather_code >= 61)
    return "⚠️ কীটনাশক দেবেন না; সেচ লাগবে না";
  if (d.weather_code === 3) return "✅ চারা রোপণের ভালো সময়";
  if (d.temp_max > 35) return "🌡️ বিকেলে অতিরিক্ত পানি দিন";
  if (d.weather_code <= 2) return "✅ জমি চাষ ও সার প্রয়োগের উপযুক্ত";
  return "✅ স্বাভাবিক কাজ চালিয়ে যান";
}

function WeatherPage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const district = user?.district ?? "ঢাকা";
  const upazila = user?.upazila ?? null;

  const fetchForecast = useServerFn(getWeatherForecast);
  const { pos, status: geoStatus, request: requestGeo } = useGeolocation(true);
  const { data, isLoading, error } = useQuery({
    queryKey: ["weather-full", district, upazila, pos?.lat ?? null, pos?.lng ?? null],
    queryFn: () =>
      fetchForecast({
        data: { district, upazila, lat: pos?.lat ?? null, lng: pos?.lng ?? null },
      }),
    enabled: !!district,
    staleTime: 15 * 60_000,
  });

  return (
    <main className="min-h-screen bg-background pb-12">
      <header
        className="px-5 pt-10 pb-12 rounded-b-3xl"
        style={{ background: "var(--gradient-brand)" }}
      >
        <button
          onClick={() => navigate({ to: "/dashboard" })}
          className="flex items-center gap-1 text-white/90 mb-4"
          aria-label="পেছনে"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="text-sm font-medium">পেছনে</span>
        </button>
        <h1 className="text-2xl font-bold text-white">আবহাওয়া</h1>
        <p className="text-sm text-white/80 mt-0.5">
          📍 {pos ? "আপনার লাইভ লোকেশন" : upazila ? `${upazila}, ${district}` : district}
          {pos && (
            <span className="ml-2 text-[10px] font-bold bg-white/20 px-1.5 py-0.5 rounded">
              GPS
            </span>
          )}
        </p>
        {!pos && geoStatus !== "loading" && geoStatus !== "unavailable" && (
          <button
            onClick={requestGeo}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 ring-1 ring-white/30 text-white text-xs font-semibold"
          >
            <Navigation className="h-3.5 w-3.5" />
            লাইভ লোকেশন ব্যবহার করুন
          </button>
        )}
      </header>

      <div className="px-5">
        <NotificationToggle />
      </div>

      {isLoading && (
        <div className="px-5 mt-6">
          <div className="rounded-2xl bg-card p-8 text-center text-muted-foreground">
            লোড হচ্ছে…
          </div>
        </div>
      )}
      {(error || (data && !data.forecast)) && (
        <div className="px-5 mt-6">
          <div className="rounded-2xl bg-destructive/10 border border-destructive p-4 text-sm text-destructive">
            আবহাওয়া তথ্য আনা যায়নি।
          </div>
        </div>
      )}

      {data?.forecast && <WeatherContent forecast={data.forecast} />}
    </main>
  );
}

function WeatherContent({ forecast }: { forecast: Forecast }) {
  const c = forecast.current;
  const chartData = forecast.past_rainfall.map((p) => ({
    name: BN_DAYS[new Date(p.date).getDay()],
    rainfall: Math.round(p.rainfall * 10) / 10,
  }));

  return (
    <>
      {/* Current */}
      <section className="px-5 -mt-8">
        <div className="rounded-2xl bg-card p-6 shadow-[var(--shadow-card)] border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">এখন</p>
              <p className="text-5xl font-bold text-foreground mt-1">
                {Math.round(c.temperature)}°C
              </p>
              <p className="text-sm text-foreground mt-1">{weatherCodeBn(c.weather_code)}</p>
            </div>
            <div className="text-primary">{weatherIcon(c.weather_code, "h-16 w-16")}</div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-border">
            <div className="text-center">
              <Droplets className="h-5 w-5 mx-auto text-muted-foreground" />
              <p className="text-xs text-muted-foreground mt-1">বৃষ্টি</p>
              <p className="text-sm font-bold">{c.precipitation_prob}%</p>
            </div>
            <div className="text-center">
              <Wind className="h-5 w-5 mx-auto text-muted-foreground" />
              <p className="text-xs text-muted-foreground mt-1">বাতাস</p>
              <p className="text-sm font-bold">{Math.round(c.wind_speed)} km/h</p>
            </div>
            <div className="text-center">
              <Thermometer className="h-5 w-5 mx-auto text-muted-foreground" />
              <p className="text-xs text-muted-foreground mt-1">আর্দ্রতা</p>
              <p className="text-sm font-bold">{Math.round(c.humidity)}%</p>
            </div>
          </div>
        </div>
      </section>

      {/* Hourly */}
      <section className="px-5 mt-6">
        <h2 className="text-base font-bold text-foreground mb-2">আগামী ২৪ ঘণ্টা</h2>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-5 px-5 snap-x">
          {forecast.hourly.map((h) => {
            const t = new Date(h.time);
            const label = t.toLocaleTimeString("bn-BD", {
              hour: "2-digit",
              hour12: false,
              timeZone: "Asia/Dhaka",
            });
            return (
              <div
                key={h.time}
                className="snap-start shrink-0 w-20 rounded-xl bg-card border border-border p-3 text-center"
              >
                <p className="text-xs text-muted-foreground">{label}</p>
                <div className="my-1.5 flex justify-center text-primary">
                  {weatherIcon(h.weather_code, "h-6 w-6")}
                </div>
                <p className="text-sm font-bold">{Math.round(h.temperature)}°</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {h.precipitation_probability}%
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 7-day */}
      <section className="px-5 mt-6">
        <h2 className="text-base font-bold text-foreground mb-2">৭ দিনের পূর্বাভাস</h2>
        <div className="rounded-2xl bg-card border border-border divide-y divide-border overflow-hidden">
          {forecast.daily.map((d, i) => {
            const date = new Date(d.date);
            const day = i === 0 ? "আজ" : BN_DAYS[date.getDay()];
            return (
              <div key={d.date} className="flex items-center gap-3 p-3">
                <span className="w-12 text-sm font-semibold">{day}</span>
                <div className="text-primary">{weatherIcon(d.weather_code)}</div>
                <span className="flex-1 text-sm text-muted-foreground truncate">
                  {weatherCodeBn(d.weather_code)}
                </span>
                <span className="text-xs text-blue-600 w-10 text-right">
                  {d.precipitation_probability_max}%
                </span>
                <span className="text-sm font-bold w-20 text-right">
                  {Math.round(d.temp_max)}°/{Math.round(d.temp_min)}°
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Farming calendar */}
      <section className="px-5 mt-6">
        <h2 className="text-base font-bold text-foreground mb-2">এই সপ্তাহে কী করবেন?</h2>
        <div className="rounded-2xl bg-card border border-border p-4 space-y-2">
          {forecast.daily.map((d, i) => {
            const date = new Date(d.date);
            const day = i === 0 ? "আজ" : BN_DAYS[date.getDay()];
            return (
              <div key={d.date} className="flex gap-3 text-sm">
                <span className="w-12 font-semibold shrink-0">{day}</span>
                <span className="text-foreground/90">{farmingTip(d)}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Past 7-day rainfall */}
      {chartData.length > 0 && (
        <section className="px-5 mt-6">
          <h2 className="text-base font-bold text-foreground mb-2">গত ৭ দিনের বৃষ্টি (মিমি)</h2>
          <div className="rounded-2xl bg-card border border-border p-3 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <RTooltip />
                <Bar dataKey="rainfall" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </>
  );
}
