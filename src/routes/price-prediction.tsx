import { CropIcon } from "@/components/krishi/crop-icon";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, TrendingUp, TrendingDown, ArrowRight, Bell, RotateCw, Share2,
  Calendar, CloudRain, Info, Sparkles,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceArea,
} from "recharts";
import { z } from "zod";
import { toast } from "sonner";
import { useUser } from "@/contexts/user-context";
import { DISTRICTS } from "@/lib/bd-data";
import { getPricePrediction, setPriceAlert } from "@/lib/price-prediction.functions";
import { POPULAR_CROP_OPTIONS } from "@/lib/crop-options";

const searchSchema = z.object({
  product: z.string().optional(),
  district: z.string().optional(),
});

export const Route = createFileRoute("/price-prediction")({
  validateSearch: (s) => searchSchema.parse(s),
  component: PricePredictionPage,
  head: () => ({
    meta: [
      { title: "দামের পূর্বাভাস — কৃষক বন্ধু" },
      { property: "og:title", content: "দামের পূর্বাভাস — কৃষক বন্ধু" },
      { property: "og:description", content: "AI ও বাজার ডেটা বিশ্লেষণ দিয়ে কৃষিপণ্যের দাম পূর্বাভাস।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "description", content: "AI ও বাজার ডেটা বিশ্লেষণ দিয়ে কৃষিপণ্যের দাম পূর্বাভাস।" },
    ],
  }),
});

const POPULAR = POPULAR_CROP_OPTIONS.map((crop) => ({ name: crop.label, icon: crop.icon }));

const BN_DIGITS = ["০","১","২","৩","৪","৫","৬","৭","৮","৯"];
const toBn = (n: number | string) => String(n).replace(/\d/g, (d) => BN_DIGITS[+d]);

type Prediction = {
  direction: string;
  confidence: number;
  predicted_change_percent: number;
  timeframe: string;
  current_avg_price: number;
  predicted_price_range: { min: number; max: number };
  main_reason: string;
  factors: string[];
  advice: string;
  risk_level: string;
};

type HistoryPoint = {
  price_date: string;
  avg_price: number;
  source: string;
};

type PredictionResult = {
  prediction: Prediction;
  trend: string;
  cached: boolean;
  cached_at: string | null;
  history: HistoryPoint[];
};

function PricePredictionPage() {
  const navigate = useNavigate();
  const { user, loading: userLoading } = useUser();
  const search = Route.useSearch();

  const [product, setProduct] = useState(search.product ?? "");
  const [district, setDistrict] = useState(search.district ?? "");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const runPrediction = useServerFn(getPricePrediction);
  const runSetAlert = useServerFn(setPriceAlert);

  useEffect(() => {
    if (userLoading) return;
    if (!user) { navigate({ to: "/login" }); return; }
    if (!district && user.district) setDistrict(user.district);
  }, [user, userLoading, district, navigate]);

  // Auto-run if prefilled
  useEffect(() => {
    if (search.product && search.district && !result && !loading) {
      void handleSubmit(search.product, search.district);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(p?: string, d?: string) {
    const prod = (p ?? product).trim();
    const dist = (d ?? district).trim();
    if (!prod) { toast.error("পণ্য নির্বাচন করুন"); return; }
    if (!dist) { toast.error("জেলা নির্বাচন করুন"); return; }
    setLoading(true);
    setStep(0);
    setResult(null);
    setNotice(null);
    const stepTimer = setInterval(() => setStep((s) => Math.min(s + 1, 3)), 1400);
    try {
      const res = await runPrediction({ data: { product: prod, district: dist } });
      if ((res as { insufficient?: boolean }).insufficient) {
        setResult(null);
        setNotice((res as { message: string }).message);
      } else {
        setNotice(null);
        setResult(res as PredictionResult);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "পূর্বাভাস পাওয়া যায়নি");
    } finally {
      clearInterval(stepTimer);
      setLoading(false);
    }
  }

  async function handleAlert() {
    if (!result) return;
    try {
      await runSetAlert({ data: { product, district, threshold: 10, direction: "both" } });
      toast.success("🔔 দাম পরিবর্তনে জানানো হবে");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ব্যর্থ হয়েছে");
    }
  }

  function handleShare() {
    if (!result) return;
    const text = `${product}: ${result.prediction.direction} (${toBn(result.prediction.predicted_change_percent)}%) — কৃষক বন্ধু`;
    if (navigator.share) {
      void navigator.share({ title: "দামের পূর্বাভাস", text });
    } else {
      void navigator.clipboard.writeText(text);
      toast.success("কপি হয়েছে");
    }
  }

  function handleReset() {
    setResult(null);
    setProduct("");
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-gradient-to-r from-emerald-600 to-green-700 text-white px-4 py-4 sticky top-0 z-10 shadow">
        <div className="flex items-center gap-3">
          <button
            onClick={() => (result ? handleReset() : navigate({ to: "/prices" }))}
            className="p-1 -ml-1"
            aria-label="ফিরে যান"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold leading-tight">📊 দামের পূর্বাভাস</h1>
            <p className="text-xs text-emerald-100">AI + বাজার ডেটা বিশ্লেষণ</p>
          </div>
          <button
            onClick={() => navigate({ to: "/price-prediction/history" })}
            className="text-xs font-semibold bg-white/20 hover:bg-white/30 rounded-full px-3 py-1.5"
          >
            📜 ইতিহাস
          </button>
        </div>
      </header>

      {!result && !loading && (
        <>
          {notice && (
            <div className="mx-4 mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-foreground">
              <div className="flex gap-2">
                <Info className="h-4 w-4 shrink-0 text-amber-600" />
                <p>{notice}</p>
              </div>
            </div>
          )}
          <SelectorScreen
            product={product} setProduct={setProduct}
            district={district} setDistrict={setDistrict}
            onSubmit={() => handleSubmit()}
          />
        </>
      )}


      {loading && <LoadingScreen step={step} />}

      {result && !loading && (
        <ResultScreen
          product={product}
          district={district}
          result={result}
          onAlert={handleAlert}
          onReset={() => handleSubmit()}
          onShare={handleShare}
        />
      )}
    </div>
  );
}

/* ──────────────────── SELECTOR ──────────────────── */

function SelectorScreen(props: {
  product: string; setProduct: (s: string) => void;
  district: string; setDistrict: (s: string) => void;
  onSubmit: () => void;
}) {
  const { product, setProduct, district, setDistrict, onSubmit } = props;

  return (
    <div className="p-4 space-y-5 animate-fade-in">
      <div>
        <label className="text-sm font-semibold text-gray-700 mb-2 block">
          🔍 পণ্য খুঁজুন
        </label>
        <input
          type="text"
          value={product}
          onChange={(e) => setProduct(e.target.value)}
          placeholder="যেমন: আলু, পেঁয়াজ..."
          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none text-base"
        />
      </div>

      <div>
        <div className="text-xs text-gray-600 mb-2">জনপ্রিয় পণ্য</div>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          {POPULAR.map((p) => (
            <button
              key={p.name}
              onClick={() => setProduct(p.name)}
              className={`shrink-0 px-3 py-2 rounded-full border text-sm font-medium transition active:scale-95 ${
                product === p.name
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-gray-700 border-gray-200"
              }`}
            >
              <CropIcon crop={p.name} /> {p.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-semibold text-gray-700 mb-2 block">
          📍 জেলা
        </label>
        <select
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none text-base"
        >
          <option value="">জেলা নির্বাচন করুন</option>
          {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <button
        onClick={onSubmit}
        disabled={!product || !district}
        className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-green-700 text-white font-bold text-lg shadow-lg disabled:opacity-50 active:scale-[0.99] flex items-center justify-center gap-2"
      >
        <Sparkles className="w-5 h-5" />
        পূর্বাভাস দেখুন
      </button>
    </div>
  );
}

/* ──────────────────── LOADING ──────────────────── */

function LoadingScreen({ step }: { step: number }) {
  const steps = [
    "বাজারের ডেটা সংগ্রহ",
    "আবহাওয়া পর্যালোচনা",
    "মৌসুমি প্রভাব বিশ্লেষণ",
    "পূর্বাভাস তৈরি",
  ];
  return (
    <div className="p-6 pt-12 text-center animate-fade-in">
      <div className="inline-flex w-24 h-24 rounded-full bg-emerald-100 items-center justify-center mb-6 animate-pulse">
        <Sparkles className="w-12 h-12 text-emerald-600" />
      </div>
      <h2 className="text-xl font-bold text-gray-800 mb-1">AI বিশ্লেষণ করছে...</h2>
      <p className="text-sm text-gray-500 mb-8">সাধারণত ৫-১০ সেকেন্ড লাগে</p>

      <div className="max-w-xs mx-auto space-y-3 text-left">
        {steps.map((label, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <div key={label} className="flex items-center gap-3 text-base">
              <span className={`inline-flex w-6 h-6 rounded-full items-center justify-center text-sm ${
                done ? "bg-emerald-500 text-white"
                  : active ? "bg-amber-100 text-amber-700 animate-pulse"
                  : "bg-gray-100 text-gray-400"
              }`}>
                {done ? "✓" : active ? "⏳" : "○"}
              </span>
              <span className={done ? "text-gray-700" : active ? "text-gray-800 font-medium" : "text-gray-400"}>
                {label}{active && "..."}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ──────────────────── RESULT ──────────────────── */

function ResultScreen(props: {
  product: string;
  district: string;
  result: PredictionResult;
  onAlert: () => void;
  onReset: () => void;
  onShare: () => void;
}) {
  const { product, result, onAlert, onReset, onShare } = props;
  const p = result.prediction;

  const dirInfo = useMemo(() => {
    if (p.direction.includes("বাড়")) return {
      bg: "bg-gradient-to-br from-red-50 to-orange-50", icon: TrendingUp, color: "text-red-600", label: "দাম বাড়বে",
    };
    if (p.direction.includes("কম")) return {
      bg: "bg-gradient-to-br from-green-50 to-emerald-50", icon: TrendingDown, color: "text-green-600", label: "দাম কমবে",
    };
    return {
      bg: "bg-gradient-to-br from-blue-50 to-sky-50", icon: ArrowRight, color: "text-blue-600", label: "দাম স্থির",
    };
  }, [p.direction]);

  const risk = p.risk_level || "মাঝারি";
  const riskColor = risk.includes("কম") ? "bg-green-100 text-green-700"
    : risk.includes("বেশি") ? "bg-red-100 text-red-700"
    : "bg-amber-100 text-amber-700";
  const riskEmoji = risk.includes("কম") ? "🟢" : risk.includes("বেশি") ? "🔴" : "🟡";

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      {/* MAIN CARD */}
      <div className={`relative rounded-2xl p-6 shadow-sm ${dirInfo.bg}`}>
        <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-semibold ${riskColor}`}>
          {riskEmoji} {risk} ঝুঁকি
        </div>

        <div className="flex flex-col items-center text-center pt-2">
          <dirInfo.icon className={`w-14 h-14 ${dirInfo.color} mb-2`} />
          <div className="text-2xl font-bold text-gray-800">{dirInfo.label}</div>
          <div className="text-sm text-gray-600 mt-1">
            {p.timeframe || "আগামী ৭ দিনে"} ~{toBn(p.predicted_change_percent)}% পর্যন্ত
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 w-full text-sm">
            <div className="bg-white/70 rounded-lg p-3">
              <div className="text-gray-500 text-xs">বর্তমান</div>
              <div className="font-bold text-gray-800 text-base">৳{toBn(p.current_avg_price)}/কেজি</div>
            </div>
            <div className="bg-white/70 rounded-lg p-3">
              <div className="text-gray-500 text-xs">পূর্বাভাস</div>
              <div className="font-bold text-gray-800 text-base">
                ৳{toBn(p.predicted_price_range?.min ?? 0)}–{toBn(p.predicted_price_range?.max ?? 0)}
              </div>
            </div>
          </div>

          <div className="mt-4 w-full">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>নির্ভরযোগ্যতা</span><span className="font-semibold">{toBn(p.confidence)}%</span>
            </div>
            <div className="h-2 bg-white/70 rounded-full overflow-hidden">
              <div className={`h-full ${dirInfo.color.replace("text-", "bg-")}`} style={{ width: `${p.confidence}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* MAIN REASON */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center">
            <Info className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <div className="text-xs text-gray-500 font-medium mb-1">মূল কারণ</div>
            <div className="text-gray-800 text-base">{p.main_reason}</div>
          </div>
        </div>
      </div>

      {/* FACTORS */}
      {p.factors?.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-sm font-semibold text-gray-700 mb-3">প্রভাবকারী কারণসমূহ</div>
          <div className="space-y-2.5">
            {p.factors.map((f, i) => {
              const icon = /বৃষ্টি|আবহাওয়া|তাপ/.test(f) ? <CloudRain className="w-4 h-4" />
                : /মৌসুম|মাস/.test(f) ? <Calendar className="w-4 h-4" />
                : /দাম|বেড়|কম/.test(f) ? <TrendingUp className="w-4 h-4" />
                : <Info className="w-4 h-4" />;
              return (
                <div key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                  <span className="text-emerald-600 mt-0.5">{icon}</span>
                  <span className="flex-1">{f}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* HISTORY CHART */}
      <HistoryChart history={result.history} prediction={p} />

      {/* ADVICE */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-emerald-200 rounded-xl p-4">
        <div className="text-sm font-semibold text-emerald-800 mb-1">কৃষকের জন্য পরামর্শ 💡</div>
        <div className="text-gray-800 text-base leading-relaxed">{p.advice}</div>
      </div>

      {/* SOURCE */}
      <div className="text-xs text-gray-500 text-center space-y-1">
        <div>📊 তথ্য উৎস: কৃষক বন্ধু বাজার ডেটা + সরকারি DAM ডেটা</div>
        {result.cached && result.cached_at && (
          <div>🕐 আপডেট: {relativeTime(result.cached_at)}</div>
        )}
      </div>

      {/* ACTIONS */}
      <div className="grid grid-cols-3 gap-2 pt-2">
        <button onClick={onAlert} className="flex flex-col items-center gap-1 py-3 rounded-xl bg-white border border-gray-200 text-sm active:scale-95">
          <Bell className="w-5 h-5 text-amber-600" />
          <span className="text-xs">দাম জানান</span>
        </button>
        <button onClick={onReset} className="flex flex-col items-center gap-1 py-3 rounded-xl bg-white border border-gray-200 text-sm active:scale-95">
          <RotateCw className="w-5 h-5 text-emerald-600" />
          <span className="text-xs">নতুন পূর্বাভাস</span>
        </button>
        <button onClick={onShare} className="flex flex-col items-center gap-1 py-3 rounded-xl bg-white border border-gray-200 text-sm active:scale-95">
          <Share2 className="w-5 h-5 text-blue-600" />
          <span className="text-xs">শেয়ার</span>
        </button>
      </div>
    </div>
  );
}

/* ──────────────────── CHART ──────────────────── */

function HistoryChart({ history, prediction }: { history: HistoryPoint[]; prediction: Prediction }) {
  // Bucket by date with separate fields per source
  const byDate = new Map<string, { date: string; app?: number; govt?: number }>();
  for (const h of history) {
    const cur = byDate.get(h.price_date) ?? { date: h.price_date };
    if (h.source === "app") cur.app = h.avg_price;
    else cur.govt = h.avg_price;
    byDate.set(h.price_date, cur);
  }
  const past = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));

  // Append 7-day prediction zone using midpoint
  const lastDate = past.at(-1)?.date ?? new Date().toISOString().slice(0, 10);
  const midPred = ((prediction.predicted_price_range?.min ?? 0) + (prediction.predicted_price_range?.max ?? 0)) / 2;
  const future: Array<{ date: string; predicted: number }> = [];
  for (let i = 1; i <= 7; i++) {
    const d = new Date(lastDate);
    d.setDate(d.getDate() + i);
    future.push({ date: d.toISOString().slice(0, 10), predicted: midPred });
  }
  const data = [
    ...past.map((p) => ({ ...p, predicted: undefined as number | undefined })),
    ...future.map((f) => ({ date: f.date, app: undefined, govt: undefined, predicted: f.predicted })),
  ];
  const firstFuture = future[0]?.date;
  const lastFuture = future.at(-1)?.date;

  if (past.length === 0) {
    return (
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center text-sm text-gray-500">
        ঐতিহাসিক দামের ডেটা যথেষ্ট নেই
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="text-sm font-semibold text-gray-700 mb-3">গত ৩০ দিনের দাম</div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip
              formatter={(v: number) => `৳${toBn(Math.round(v))}`}
              labelFormatter={(l) => `${l}`}
            />
            {firstFuture && lastFuture && (
              <ReferenceArea x1={firstFuture} x2={lastFuture} fill="#fef3c7" fillOpacity={0.5} />
            )}
            <Line type="monotone" dataKey="app" name="অ্যাপ ডেটা" stroke="#2563eb" strokeWidth={2} dot={{ r: 2 }} connectNulls />
            <Line type="monotone" dataKey="govt" name="সরকারি (DAM)" stroke="#f97316" strokeWidth={2} dot={{ r: 2 }} connectNulls />
            <Line type="monotone" dataKey="predicted" name="পূর্বাভাস" stroke="#10b981" strokeWidth={2} strokeDasharray="5 4" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-3 text-xs text-gray-600 mt-2 flex-wrap">
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-600 inline-block" /> অ্যাপ ডেটা</span>
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-orange-500 inline-block" /> সরকারি DAM</span>
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-emerald-500 inline-block" style={{ borderTop: "2px dashed" }} /> পূর্বাভাস</span>
      </div>
    </div>
  );
}

function relativeTime(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${toBn(s)} সেকেন্ড আগে`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${toBn(m)} মিনিট আগে`;
  const h = Math.floor(m / 60);
  return `${toBn(h)} ঘণ্টা আগে`;
}
