// Server-only helpers for Open-Meteo. NEVER import from client code.
import type { Forecast, CurrentWeather, HourlyPoint, DailyPoint } from "./weather-types";
export type { Forecast, CurrentWeather, HourlyPoint, DailyPoint } from "./weather-types";

const WEATHER_ENDPOINTS = [
  "https://api.open-meteo.com/v1/forecast",
  "https://api.open-meteo.com/v1/gfs",
];

const MET_NO_ENDPOINT = "https://api.met.no/weatherapi/locationforecast/2.0/compact";

// In-memory cache to dedupe concurrent requests and reduce 429s.
// Key: "lat,lng" rounded. Value: { data, expiresAt } or in-flight promise.
type CacheEntry = { promise: Promise<Forecast>; expiresAt: number };
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30 * 60_000; // 30 min — reduce 429s from Open-Meteo

export async function fetchForecast(lat: number, lng: number): Promise<Forecast> {
  // Round to 0.1° (~11km) so nearby GPS readings share cache
  const key = `${lat.toFixed(1)},${lng.toFixed(1)}`;
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expiresAt > now) return hit.promise;

  const promise = fetchForecastInner(lat, lng).catch((e) => {
    if (cache.get(key)?.promise === promise) cache.delete(key);
    throw e;
  });
  cache.set(key, { promise, expiresAt: now + CACHE_TTL_MS });
  return promise;
}

async function fetchForecastInner(lat: number, lng: number): Promise<Forecast> {
  let lastError: Error | null = null;

  for (const endpoint of WEATHER_ENDPOINTS) {
    try {
      return await fetchForecastFromEndpoint(endpoint, lat, lng);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error("weather unavailable");
      console.warn(`[weather] ${endpoint} failed: ${lastError.message}`);
    }
  }

  try {
    return await fetchForecastFromMetNo(lat, lng);
  } catch (e) {
    lastError = e instanceof Error ? e : new Error("weather unavailable");
    console.warn(`[weather] ${MET_NO_ENDPOINT} failed: ${lastError.message}`);
  }

  throw lastError ?? new Error("weather unavailable");
}

async function fetchForecastFromEndpoint(
  endpoint: string,
  lat: number,
  lng: number,
): Promise<Forecast> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lng.toString(),
    current:
      "temperature_2m,weather_code,precipitation_probability,wind_speed_10m,relative_humidity_2m,is_day",
    hourly: "temperature_2m,precipitation_probability,weather_code",
    daily:
      "temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weather_code",
    timezone: "Asia/Dhaka",
    forecast_days: "7",
  });

  const url = `${endpoint}?${params}`;
  let res: Response | null = null;
  let lastStatus = 0;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      res = await fetch(url, { headers: { accept: "application/json" } });
      if (res.ok) break;
      lastStatus = res.status;
      if (res.status === 429) break;
      // Retry on 429 / 5xx
      if (res.status < 500) break;
    } catch (e) {
      lastStatus = -1;
    }
    // Short backoff with jitter before trying again or falling back to another endpoint
    const delay = 400 * Math.pow(2, attempt) + Math.floor(Math.random() * 200);
    await new Promise((r) => setTimeout(r, delay));
  }
  if (!res || !res.ok) {
    const status = res?.status ?? lastStatus;
    throw new Error(status === 429 ? "rate-limited" : `upstream ${status}`);
  }
  const data = (await res.json()) as any;

  if (!data?.current || !data?.hourly?.time?.length || !data?.daily?.time?.length) {
    throw new Error("incomplete data");
  }

  const c = data.current;
  const current: CurrentWeather = {
    temperature: c.temperature_2m,
    weather_code: c.weather_code,
    precipitation_prob: c.precipitation_probability ?? 0,
    wind_speed: c.wind_speed_10m ?? 0,
    humidity: c.relative_humidity_2m ?? 0,
    is_day: c.is_day === 1,
    time: c.time,
  };

  const h = data.hourly;
  const nowMs = Date.now();
  const hourly: HourlyPoint[] = [];
  for (let i = 0; i < h.time.length; i++) {
    const t = new Date(h.time[i]).getTime();
    if (t < nowMs - 60 * 60_000) continue;
    if (hourly.length >= 24) break;
    hourly.push({
      time: h.time[i],
      temperature: h.temperature_2m[i],
      precipitation_probability: h.precipitation_probability[i] ?? 0,
      weather_code: h.weather_code[i],
    });
  }

  const d = data.daily;
  const allDaily: DailyPoint[] = d.time.map((t: string, i: number) => ({
    date: t,
    temp_max: d.temperature_2m_max[i],
    temp_min: d.temperature_2m_min[i],
    precipitation_sum: d.precipitation_sum[i] ?? 0,
    precipitation_probability_max: d.precipitation_probability_max[i] ?? 0,
    weather_code: d.weather_code[i],
  }));
  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });
  const daily = allDaily.filter((x) => x.date >= todayStr).slice(0, 7);
  const past_rainfall = allDaily
    .filter((x) => x.date < todayStr)
    .slice(-7)
    .map((x) => ({ date: x.date, rainfall: x.precipitation_sum }));

  return { current, hourly, daily, past_rainfall };
}

async function fetchForecastFromMetNo(lat: number, lng: number): Promise<Forecast> {
  const params = new URLSearchParams({ lat: lat.toString(), lon: lng.toString() });
  const res = await fetch(`${MET_NO_ENDPOINT}?${params}`, {
    headers: {
      accept: "application/json",
      "user-agent": "KrishokBondhu/1.0 https://shobji-bondhu-friends.lovable.app",
    },
  });
  if (!res.ok) throw new Error(`upstream ${res.status}`);
  const data = (await res.json()) as any;
  const series: any[] = data?.properties?.timeseries ?? [];
  if (!series.length) throw new Error("incomplete data");

  const nowMs = Date.now();
  const upcoming = series.filter((x) => new Date(x.time).getTime() >= nowMs - 60 * 60_000);
  const first = upcoming[0] ?? series[0];
  const firstInstant = first.data?.instant?.details ?? {};
  const firstNext =
    first.data?.next_1_hours ?? first.data?.next_6_hours ?? first.data?.next_12_hours ?? {};
  const current: CurrentWeather = {
    temperature: firstInstant.air_temperature ?? 0,
    weather_code: metSymbolToWmo(firstNext.summary?.symbol_code),
    precipitation_prob: metPrecipProbability(first),
    wind_speed: (firstInstant.wind_speed ?? 0) * 3.6,
    humidity: firstInstant.relative_humidity ?? 0,
    is_day: isDhakaDay(first.time),
    time: first.time,
  };

  const hourly: HourlyPoint[] = upcoming.slice(0, 24).map((x) => {
    const instant = x.data?.instant?.details ?? {};
    const next = x.data?.next_1_hours ?? x.data?.next_6_hours ?? x.data?.next_12_hours ?? {};
    return {
      time: x.time,
      temperature: instant.air_temperature ?? 0,
      precipitation_probability: metPrecipProbability(x),
      weather_code: metSymbolToWmo(next.summary?.symbol_code),
    };
  });

  const byDate = new Map<string, any[]>();
  for (const x of upcoming) {
    const date = new Date(x.time).toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date)!.push(x);
  }
  const daily: DailyPoint[] = Array.from(byDate.entries())
    .slice(0, 7)
    .map(([date, rows]) => {
      const temps = rows
        .map((x) => x.data?.instant?.details?.air_temperature)
        .filter((n) => typeof n === "number");
      const probs = rows.map(metPrecipProbability);
      const precip = rows.reduce((sum, x) => {
        const next = x.data?.next_1_hours ?? x.data?.next_6_hours ?? x.data?.next_12_hours ?? {};
        return sum + (next.details?.precipitation_amount ?? 0);
      }, 0);
      const symbol =
        rows.find((x) => x.data?.next_1_hours?.summary?.symbol_code)?.data?.next_1_hours?.summary
          ?.symbol_code ?? rows[0]?.data?.next_6_hours?.summary?.symbol_code;
      return {
        date,
        temp_max: temps.length ? Math.max(...temps) : current.temperature,
        temp_min: temps.length ? Math.min(...temps) : current.temperature,
        precipitation_sum: Number(precip.toFixed(1)),
        precipitation_probability_max: probs.length ? Math.max(...probs) : 0,
        weather_code: metSymbolToWmo(symbol),
      };
    });

  return { current, hourly, daily, past_rainfall: [] };
}

function metPrecipProbability(point: any): number {
  const next =
    point.data?.next_1_hours ?? point.data?.next_6_hours ?? point.data?.next_12_hours ?? {};
  const details = next.details ?? {};
  if (typeof details.probability_of_precipitation === "number")
    return Math.round(details.probability_of_precipitation);
  const amount = details.precipitation_amount ?? 0;
  return amount > 0 ? Math.min(95, Math.round(25 + amount * 18)) : 0;
}

function metSymbolToWmo(symbol = ""): number {
  const s = symbol.toLowerCase();
  if (s.includes("thunder")) return 95;
  if (s.includes("snow") || s.includes("sleet")) return 71;
  if (s.includes("heavyrain")) return 65;
  if (s.includes("rainshowers")) return 80;
  if (s.includes("rain")) return 61;
  if (s.includes("fog")) return 45;
  if (s.includes("cloudy")) return s.includes("partly") ? 2 : 3;
  if (s.includes("fair")) return 1;
  if (s.includes("clearsky")) return 0;
  return 2;
}

function isDhakaDay(isoTime: string): boolean {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: "Asia/Dhaka",
    }).format(new Date(isoTime)),
  );
  return hour >= 6 && hour < 18;
}

function buildFallbackForecast(lat: number, lng: number): Forecast {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: "Asia/Dhaka",
    }).format(new Date()),
  );
  const isDay = hour >= 6 && hour < 18;
  const seasonalBase = 28 + Math.sin((Date.now() / 86_400_000 + lat + lng) / 14) * 3;
  const rainBase = Math.max(
    15,
    Math.min(75, Math.round(42 + Math.sin((Date.now() / 86_400_000 + lat) / 5) * 22)),
  );
  const code = rainBase > 60 ? 61 : rainBase > 40 ? 51 : isDay ? 2 : 3;
  const dateInDhaka = (offsetDays: number) =>
    new Date(Date.now() + offsetDays * 86_400_000).toLocaleDateString("en-CA", {
      timeZone: "Asia/Dhaka",
    });

  const current: CurrentWeather = {
    temperature: Number(seasonalBase.toFixed(1)),
    weather_code: code,
    precipitation_prob: rainBase,
    wind_speed: 9,
    humidity: 78,
    is_day: isDay,
    time: new Date().toISOString(),
  };

  const hourly: HourlyPoint[] = Array.from({ length: 24 }, (_, i) => ({
    time: new Date(Date.now() + i * 3_600_000).toISOString(),
    temperature: Number((seasonalBase + Math.sin(((hour + i) / 24) * Math.PI * 2) * 2).toFixed(1)),
    precipitation_probability: Math.max(10, Math.min(90, rainBase + ((i % 6) - 2) * 5)),
    weather_code: code,
  }));

  const daily: DailyPoint[] = Array.from({ length: 7 }, (_, i) => ({
    date: dateInDhaka(i),
    temp_max: Math.round(seasonalBase + 4 + (i % 3)),
    temp_min: Math.round(seasonalBase - 3 - (i % 2)),
    precipitation_sum: Number(((rainBase / 100) * (i % 2 ? 8 : 4)).toFixed(1)),
    precipitation_probability_max: Math.max(10, Math.min(90, rainBase + (i % 3) * 6)),
    weather_code: code,
  }));

  return { current, hourly, daily, past_rainfall: [] };
}

// Alert evaluation + Bengali weather descriptions live in `weather-rules.ts`
// (client-safe). Re-export for server callers' convenience.
export { evaluateAlert, weatherCodeBn } from "./weather-rules";
export type { AlertType, Severity, WeatherAlert } from "./weather-rules";
