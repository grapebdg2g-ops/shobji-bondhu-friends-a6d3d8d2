import { CropIcon } from "@/components/krishi/crop-icon";
import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft, Share2, Clock, Maximize2, Droplets, AlertTriangle,
  TrendingUp, Calendar, Sprout, Leaf, FlaskConical, Lightbulb, Sparkles,
  Landmark, ChevronDown, ChevronUp, Star, CheckCircle2, XCircle, BarChart3,
} from "lucide-react";
import { getCrop, type CropData, type Variety, type SoilType } from "@/data/master-crop-data";
import { toBn, fmtBdt } from "@/lib/bn";

export const Route = createFileRoute("/vegetable-guide/$slug")({
  component: CropDetailPage,
  loader: ({ params }) => {
    const crop = getCrop(params.slug);
    if (!crop) throw notFound();
    return { crop };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.crop.name ?? "ফসল"} চাষ গাইড — কৃষক বন্ধু` },
      { property: "og:title", content: `${loaderData?.crop.name ?? "ফসল"} চাষ গাইড — কৃষক বন্ধু` },
      { property: "og:description", content: `${loaderData?.crop.name ?? ""} চাষের পদ্ধতি, খরচ, লাভ, জাত ও বাজার বিশ্লেষণ।` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "description", content: `${loaderData?.crop.name ?? ""} চাষের পদ্ধতি, খরচ, লাভ, জাত ও বাজার বিশ্লেষণ।` },
    ],
  }),
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <div>
        <p className="text-gray-700 mb-3">ফসল পাওয়া যায়নি</p>
        <Link to="/vegetable-guide" className="text-emerald-600 font-semibold">← গাইডে ফিরুন</Link>
      </div>
    </div>
  ),
});

const MONTHS_BN = ["জানু", "ফেব্রু", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগ", "সেপ্ট", "অক্টো", "নভে", "ডিসে"];
const MONTHS_FULL = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];

const SOIL_RANK: Record<SoilType, { label: string; ok: boolean }> = {
  "দোআঁশ": { label: "দোআঁশ মাটি (সেরা)", ok: true },
  "এঁটেল": { label: "এঁটেল দোআঁশ (ভালো)", ok: true },
  "বেলে-দোআঁশ": { label: "বেলে দোআঁশ (চলবে)", ok: true },
  "পলি": { label: "পলি মাটি (ভালো)", ok: true },
  "বালি": { label: "বালি মাটি", ok: true },
};

const VARIETY_BADGE: Record<Variety["type"], string> = {
  "উফশী": "bg-emerald-100 text-emerald-700",
  "হাইব্রিড": "bg-blue-100 text-blue-700",
  "স্থানীয়": "bg-orange-100 text-orange-700",
};

function CropDetailPage() {
  const { crop } = Route.useLoaderData() as { crop: CropData };
  const navigate = useNavigate();

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: crop.name, url }); } catch { /* ignore */ }
    } else {
      try { await navigator.clipboard.writeText(url); } catch { /* ignore */ }
    }
  };

  return (
    <main className="min-h-screen bg-[#F0FFF4] md:max-w-[560px] md:mx-auto pb-48 md:pb-32">
      {/* HEADER */}
      <header className="px-5 pt-8 pb-6 rounded-b-3xl text-white" style={{ background: "var(--gradient-brand)" }}>
        <div className="flex items-center justify-between">
          <button onClick={() => navigate({ to: "/vegetable-guide" })} className="h-9 w-9 rounded-full bg-white/15 flex items-center justify-center">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button onClick={handleShare} className="h-9 w-9 rounded-full bg-white/15 flex items-center justify-center">
            <Share2 className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4 text-center">
          <div className="text-[80px] leading-none"><CropIcon crop={crop.id} /></div>
          <h1 className="mt-2 text-[28px] font-bold">{crop.name}</h1>
          <div className="mt-2 inline-block bg-white/20 px-3 py-1 rounded-full text-xs font-semibold">
            {crop.seasons.join(" / ")} মৌসুম
          </div>
          <p className="text-sm text-white/85 mt-2">{crop.nameEn} — {crop.category}</p>
        </div>

        {/* Quick stats */}
        <div className="mt-5 grid grid-cols-4 gap-2 text-center">
          <Stat icon="🕐" top={`${toBn(crop.totalDays)} দিন`} bottom="মোট সময়" />
          <Stat icon="📏" top={`বিঘা = ${toBn(33)} শতক`} bottom="পরিমাপ" />
          <Stat icon="💧" top={crop.waterRequirement} bottom="পানি" />
          <Stat icon="⚡" top={crop.riskLevel} bottom="ঝুঁকি" />
        </div>
      </header>

      <div className="px-4 mt-4 space-y-3">
        <FinancialSection crop={crop} />
        <SeasonSection crop={crop} />
        <VarietiesSection crop={crop} />
        <SoilSection crop={crop} />
        <StagesSection crop={crop} />
        <FertilizerSummary crop={crop} />
        <TipsSection crop={crop} />
        <CompanionsSection crop={crop} />
        {crop.govtSupport.length > 0 && <GovtSection crop={crop} />}
      </div>

      {/* Sticky bottom bar */}
      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 md:max-w-[560px] md:left-1/2 md:-translate-x-1/2 bg-white border-t border-gray-200 px-3 py-2.5 flex gap-2 z-30">
        <Link
          to="/crop-guide"
          className="flex-1 flex flex-col items-center bg-emerald-600 text-white rounded-xl py-2 text-[11px] font-semibold"
        >
          📋 চাষের গাইড
        </Link>
        <Link
          to="/ai-bondhu/calculator"
          search={{ crop: crop.id } as never}
          className="flex-1 flex flex-col items-center bg-amber-500 text-white rounded-xl py-2 text-[11px] font-semibold"
        >
          🧪 সার হিসাব
        </Link>
        <Link
          to="/prices"
          className="flex-1 flex flex-col items-center bg-blue-600 text-white rounded-xl py-2 text-[11px] font-semibold"
        >
          📊 বাজার দর
        </Link>
      </div>
    </main>
  );
}

function Stat({ icon, top, bottom }: { icon: string; top: string; bottom: string }) {
  return (
    <div className="bg-white/15 rounded-xl py-2 px-1">
      <div className="text-lg">{icon}</div>
      <div className="text-[11px] font-bold mt-0.5 leading-tight">{top}</div>
      <div className="text-[9px] text-white/80 leading-tight">{bottom}</div>
    </div>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100">
      <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-3">
        <span>{icon}</span> {title}
      </h2>
      {children}
    </div>
  );
}

// ════════ SECTION 1: Financial ════════
function FinancialSection({ crop }: { crop: CropData }) {
  const [open, setOpen] = useState(false);
  const avg = Math.round((crop.profitMin + crop.profitMax) / 2);
  const costs = [
    { label: "বীজ ও চারা", v: crop.seedCostPerBigha },
    { label: "সার", v: crop.fertilizerCost },
    { label: "কীটনাশক", v: crop.pesticideCost },
    { label: "শ্রমিক", v: crop.laborCost },
    { label: "অন্যান্য", v: crop.otherCost },
  ];

  const demandPct = crop.demandLevel === "বেশি" ? 100 : crop.demandLevel === "মাঝারি" ? 60 : 30;
  const demandColor = crop.demandLevel === "বেশি" ? "bg-emerald-500" : crop.demandLevel === "মাঝারি" ? "bg-amber-500" : "bg-gray-400";

  return (
    <SectionCard title="বাজার ও লাভের তথ্য" icon="💰">
      {/* Profit card */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-4 text-white">
        <p className="text-xs font-semibold text-white/90">বিঘা প্রতি আনুমানিক লাভ</p>
        <div className="grid grid-cols-3 gap-2 mt-3 text-center">
          <div>
            <p className="text-[10px] text-white/80">সর্বনিম্ন</p>
            <p className="text-base font-bold">{fmtBdt(crop.profitMin)}</p>
          </div>
          <div className="border-x border-white/30">
            <p className="text-[10px] text-white/80">সর্বোচ্চ</p>
            <p className="text-base font-bold">{fmtBdt(crop.profitMax)}</p>
          </div>
          <div>
            <p className="text-[10px] text-white/80">গড়</p>
            <p className="text-base font-bold">{fmtBdt(avg)}</p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-white/20 flex items-center justify-between">
          <span className="text-xs">ROI</span>
          <span className="text-lg font-bold">{toBn(crop.roi)}% <span className="text-[10px] font-normal">(বিনিয়োগের {(crop.roi / 100).toFixed(1).replace(/\d/g, d => "০১২৩৪৫৬৭৮৯"[+d])} গুণ)</span></span>
        </div>
      </div>

      {/* Cost breakdown */}
      <button
        onClick={() => setOpen(o => !o)}
        className="mt-3 w-full flex items-center justify-between bg-gray-50 rounded-xl p-3"
      >
        <span className="text-sm font-semibold text-gray-800">বিঘা প্রতি আনুমানিক খরচ — {fmtBdt(crop.totalCost)}</span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && (
        <div className="mt-2 border border-gray-100 rounded-xl overflow-hidden text-sm">
          {costs.map((c) => (
            <div key={c.label} className="flex justify-between px-3 py-2 border-b border-gray-50 last:border-0">
              <span className="text-gray-700">{c.label}</span>
              <span className="font-semibold text-gray-900">{fmtBdt(c.v)}</span>
            </div>
          ))}
          <div className="flex justify-between px-3 py-2 bg-gray-50 font-bold">
            <span>মোট খরচ</span>
            <span>{fmtBdt(crop.totalCost)}</span>
          </div>
        </div>
      )}

      {/* Market intelligence */}
      <div className="mt-4 space-y-3">
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1"><BarChart3 className="h-4 w-4" /> বাজার বিশ্লেষণ</h3>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-600">চাহিদার মাত্রা</span>
            <span className="font-semibold text-gray-900">{crop.demandLevel}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full ${demandColor}`} style={{ width: `${demandPct}%` }} />
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">রপ্তানি সম্ভাবনা</span>
          <span className="font-semibold">{crop.exportPotential ? "✅ আছে" : "❌ নেই"}</span>
        </div>

        {/* Best selling months */}
        <div>
          <p className="text-xs font-bold text-gray-800 mb-2">কোন মাসে দাম বেশি?</p>
          <div className="grid grid-cols-12 gap-0.5">
            {MONTHS_BN.map((m, i) => {
              const month = i + 1;
              const best = crop.bestSellingMonths.includes(month);
              const harvest = crop.harvestMonths.includes(month);
              const planting = crop.plantingMonths.includes(month);
              const dot = best ? "🟢" : harvest ? "🟡" : planting ? "🟣" : "⚪";
              return (
                <div key={i} className="text-center">
                  <div className="text-[9px] text-gray-500">{m}</div>
                  <div className="text-xs leading-none mt-0.5">{dot}</div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-3 mt-2 text-[10px] text-gray-600">
            <span>🟢 ভালো দাম</span><span>🟡 সংগ্রহ</span><span>🟣 রোপণ</span>
          </div>
        </div>

        {crop.bestSellingMonths.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-xs font-bold text-amber-800 flex items-center gap-1"><Lightbulb className="h-3.5 w-3.5" /> দাম সম্পর্কে জানুন</p>
            <p className="text-xs text-gray-800 mt-1.5 leading-relaxed">
              {crop.bestSellingMonths.length > 1
                ? `${MONTHS_FULL[crop.bestSellingMonths[0] - 1]} থেকে ${MONTHS_FULL[crop.bestSellingMonths[crop.bestSellingMonths.length - 1] - 1]}`
                : MONTHS_FULL[crop.bestSellingMonths[0] - 1]} মাসে {crop.name}-এর দাম সবচেয়ে বেশি থাকে। সেই অনুযায়ী রোপণের পরিকল্পনা করুন।
            </p>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

// ════════ SECTION 2: Season ════════
function SeasonSection({ crop }: { crop: CropData }) {
  const plantStart = crop.plantingMonths[0];
  const plantEnd = crop.plantingMonths[crop.plantingMonths.length - 1];
  const harvestStart = crop.harvestMonths[0];
  const harvestEnd = crop.harvestMonths[crop.harvestMonths.length - 1];

  return (
    <SectionCard title="চাষের সময়সূচি" icon="📅">
      <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
        <p className="text-xs font-bold text-emerald-700">মূল মৌসুম: {crop.seasons.join(", ")}</p>
        <div className="mt-2 space-y-1.5 text-sm">
          <Row label="রোপণ" value={`${MONTHS_FULL[plantStart - 1]}${plantEnd !== plantStart ? ` - ${MONTHS_FULL[plantEnd - 1]}` : ""}`} />
          <Row label="সংগ্রহ" value={`${MONTHS_FULL[harvestStart - 1]}${harvestEnd !== harvestStart ? ` - ${MONTHS_FULL[harvestEnd - 1]}` : ""}`} />
          <Row label="মোট সময়" value={`${toBn(crop.totalDays)} দিন`} />
        </div>
      </div>

      {/* Visual timeline */}
      <div className="mt-3">
        <p className="text-xs font-bold text-gray-700 mb-2">মাস-ভিত্তিক টাইমলাইন</p>
        <div className="grid grid-cols-12 gap-0.5">
          {MONTHS_BN.map((m, i) => {
            const month = i + 1;
            const planting = crop.plantingMonths.includes(month);
            const harvest = crop.harvestMonths.includes(month);
            const between = !planting && !harvest && crop.plantingMonths.some(p => crop.harvestMonths.some(h => {
              if (p <= h) return month > p && month < h;
              return month > p || month < h;
            }));
            const bg = planting ? "bg-emerald-500 text-white" : harvest ? "bg-amber-500 text-white" : between ? "bg-emerald-100 text-emerald-700" : "bg-gray-50 text-gray-400";
            return (
              <div key={i} className={`rounded text-center py-1 text-[9px] font-semibold ${bg}`}>{m}</div>
            );
          })}
        </div>
        <div className="flex gap-3 mt-2 text-[10px] text-gray-600">
          <span>🟩 রোপণ</span><span>🟧 সংগ্রহ</span><span>🟢 বৃদ্ধি</span>
        </div>
      </div>
    </SectionCard>
  );
}

// ════════ SECTION 3: Varieties ════════
function VarietiesSection({ crop }: { crop: CropData }) {
  const [compare, setCompare] = useState(false);
  const [filter, setFilter] = useState<string>("সব");
  const [open, setOpen] = useState(false);

  if (crop.varieties.length === 0) return null;
  const bestYield = Math.max(...crop.varieties.map(v => v.yieldPerBigha));

  const categorize = (v: Variety): string => {
    const s = (v.special ?? "").toLowerCase();
    if (s.includes("রঙিন")) return "রঙিন";
    if (s.includes("আগাম")) return "আগাম";
    if (s.includes("নাবী")) return "নাবী";
    if (s.includes("মাঝারি")) return "মাঝারি";
    return "অন্যান্য";
  };

  const CATS = ["সব", "আগাম", "মাঝারি", "নাবী", "রঙিন"] as const;
  const counts = CATS.reduce<Record<string, number>>((acc, c) => {
    acc[c] = c === "সব" ? crop.varieties.length : crop.varieties.filter(v => categorize(v) === c).length;
    return acc;
  }, {});
  const availableCats = CATS.filter(c => counts[c] > 0);

  const shown = filter === "সব" ? crop.varieties : crop.varieties.filter(v => categorize(v) === filter);

  return (
    <SectionCard title="বাংলাদেশে প্রচলিত জাত" icon="🌱">
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between text-sm font-semibold text-gray-800 bg-gray-50 hover:bg-gray-100 rounded-xl px-3 py-2 transition"
      >
        <span>{open ? "জাত তালিকা লুকান" : `জাত তালিকা দেখুন (${toBn(crop.varieties.length)}টি)`}</span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && <div className="mt-3">
      {availableCats.length > 2 && (

        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2 -mx-1 px-1">
          {availableCats.map(c => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition ${
                filter === c
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-gray-700 border-gray-200 hover:border-emerald-300"
              }`}
            >
              {c} <span className="opacity-70">({toBn(counts[c])})</span>
            </button>
          ))}
        </div>
      )}
      <div className="space-y-2.5">
        {shown.map((v) => {
          const isBest = v.yieldPerBigha === bestYield;
          return (
            <div key={v.name} className="border border-gray-100 rounded-xl p-3 relative">
              {isBest && (
                <span className="absolute -top-2 right-3 bg-amber-400 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                  <Star className="h-3 w-3 fill-current" /> সুপারিশকৃত
                </span>
              )}
              <div className="flex justify-between items-start">
                <p className="font-bold text-gray-900">{v.name}</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${VARIETY_BADGE[v.type]}`}>{v.type}</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div className="text-gray-700"><span className="text-gray-500">ফলন:</span> <b>{toBn(v.yieldPerBigha)} মণ/বিঘা</b></div>
                <div className="text-gray-700"><span className="text-gray-500">সময়:</span> <b>{toBn(v.daysToHarvest)} দিন</b></div>
              </div>
              {v.special && <p className="mt-1.5 text-xs text-emerald-700 font-semibold">{v.special}</p>}
            </div>
          );
        })}
        {shown.length === 0 && (
          <p className="text-center text-sm text-gray-500 py-4">এই ক্যাটাগরিতে কোনো জাত নেই</p>
        )}
      </div>


      <button onClick={() => setCompare(c => !c)} className="mt-3 w-full text-sm font-semibold text-emerald-700 bg-emerald-50 rounded-xl py-2">
        {compare ? "তুলনা বন্ধ করুন" : "জাত তুলনা করুন →"}
      </button>
      {compare && (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-2">জাত</th>
                <th className="text-right p-2">ফলন</th>
                <th className="text-right p-2">সময়</th>
              </tr>
            </thead>
            <tbody>
              {crop.varieties.map((v) => (
                <tr key={v.name} className="border-t border-gray-100">
                  <td className="p-2 font-semibold">{v.name}</td>
                  <td className="p-2 text-right">{toBn(v.yieldPerBigha)} মণ</td>
                  <td className="p-2 text-right">{toBn(v.daysToHarvest)} দিন</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>}
    </SectionCard>

  );
}

// ════════ SECTION 4: Soil ════════
function SoilSection({ crop }: { crop: CropData }) {
  const allSoils: SoilType[] = ["দোআঁশ", "এঁটেল", "বেলে-দোআঁশ", "পলি", "বালি"];
  const pct = ((crop.phRange.min + crop.phRange.max) / 2 - 4) / 6 * 100;

  return (
    <SectionCard title="উপযুক্ত জমি ও মাটি" icon="🌍">
      <div className="space-y-1.5">
        {allSoils.map((s) => {
          const ok = crop.soilTypes.includes(s);
          return (
            <div key={s} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${ok ? "bg-emerald-50 text-emerald-800" : "bg-gray-50 text-gray-400"}`}>
              {ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-gray-300" />}
              {SOIL_RANK[s]?.label || s}
            </div>
          );
        })}
      </div>

      <div className="mt-4">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-600">মাটির অম্লতা (pH)</span>
          <span className="font-bold text-gray-900">{toBn(crop.phRange.min)} - {toBn(crop.phRange.max)}</span>
        </div>
        <div className="relative h-2 bg-gradient-to-r from-red-200 via-emerald-300 to-purple-200 rounded-full">
          <div className="absolute h-4 w-1 bg-emerald-700 rounded -top-1" style={{ left: `${Math.min(95, Math.max(0, pct))}%` }} />
        </div>
        <div className="flex justify-between text-[10px] text-gray-500 mt-0.5"><span>৪</span><span>৭</span><span>১০</span></div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="bg-blue-50 rounded-xl p-3">
          <p className="text-[10px] font-semibold text-blue-700">পানির প্রয়োজন</p>
          <p className="text-sm font-bold text-blue-900 mt-1">
            {crop.waterRequirement === "বেশি" ? "💧💧💧" : crop.waterRequirement === "মাঝারি" ? "💧💧" : "💧"} {crop.waterRequirement}
          </p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-3">
          <p className="text-[10px] font-semibold text-emerald-700">সেচ প্রয়োজন</p>
          <p className="text-sm font-bold text-emerald-900 mt-1">{crop.irrigationNeeded ? "হ্যাঁ ✅" : "প্রয়োজন নেই"}</p>
        </div>
      </div>
    </SectionCard>
  );
}

// ════════ SECTION 5: Stages summary ════════
function StagesSection({ crop }: { crop: CropData }) {
  const [open, setOpen] = useState<string | null>(crop.stages[0]?.id ?? null);
  return (
    <SectionCard title="সংক্ষিপ্ত চাষ পদ্ধতি" icon="📋">
      <div className="space-y-2">
        {crop.stages.map((s, i) => {
          const isOpen = open === s.id;
          return (
            <div key={s.id} className="border border-gray-100 rounded-xl overflow-hidden">
              <button
                onClick={() => setOpen(isOpen ? null : s.id)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
              >
                <span className="text-base">{i + 1}️⃣</span>
                <span className="text-xl">{s.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-900">{s.name}</p>
                  <p className="text-[10px] text-gray-500">দিন {toBn(s.startDay)}–{toBn(s.endDay)}</p>
                </div>
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {isOpen && (
                <div className="px-3 pb-3 space-y-2 border-t border-gray-100 pt-2">
                  {s.tasks.slice(0, 4).map((t, j) => (
                    <div key={j} className="text-xs">
                      <p className="font-semibold text-gray-800">• {t.title}</p>
                      <p className="text-gray-600 mt-0.5 pl-3">{t.desc}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <Link
        to="/crop-guide"
        className="mt-3 block text-center bg-emerald-600 text-white font-semibold rounded-xl py-2.5 text-sm"
      >
        সম্পূর্ণ ধাপে ধাপে গাইড দেখতে →
      </Link>
    </SectionCard>
  );
}

// ════════ SECTION 6: Fertilizer summary ════════
function FertilizerSummary({ crop }: { crop: CropData }) {
  const fert = crop.fertilizerGuide?.perBigha ?? {};
  const entries = Object.entries(fert);
  if (entries.length === 0) return null;
  const max = Math.max(...entries.map(([, v]) => Number(v)));

  return (
    <SectionCard title="সার ব্যবস্থাপনা (সংক্ষেপ)" icon="💊">
      <p className="text-xs text-gray-600 mb-2">প্রধান সার (প্রতি বিঘা)</p>
      <div className="space-y-2">
        {entries.map(([name, kg]) => {
          const pct = (Number(kg) / max) * 100;
          return (
            <div key={name}>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="font-semibold text-gray-800">{name}</span>
                <span className="text-gray-700">{toBn(Number(kg))} কেজি</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      <Link
        to="/ai-bondhu/calculator"
        search={{ crop: crop.id } as never}
        className="mt-3 block text-center bg-amber-500 text-white font-semibold rounded-xl py-2.5 text-sm"
      >
        🧪 সার ক্যালকুলেটর খুলুন
      </Link>
    </SectionCard>
  );
}

// ════════ SECTION 7: Tips ════════
function TipsSection({ crop }: { crop: CropData }) {
  if (crop.tips.length === 0 && crop.riskFactors.length === 0) return null;
  return (
    <SectionCard title="অভিজ্ঞ কৃষকের পরামর্শ" icon="💡">
      <div className="space-y-2">
        {crop.tips.map((t, i) => (
          <div key={i} className="bg-emerald-50 border-l-4 border-emerald-400 rounded-r-lg p-3 text-sm text-gray-800">
            <Sparkles className="inline h-3.5 w-3.5 text-emerald-600 mr-1" /> {t}
          </div>
        ))}
      </div>
      {crop.riskFactors.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-bold text-red-700 flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> ঝুঁকি সম্পর্কে জানুন</h3>
          <ul className="mt-2 space-y-1.5">
            {crop.riskFactors.map((r, i) => (
              <li key={i} className="text-sm text-gray-800 bg-red-50 rounded-lg p-2.5">• {r}</li>
            ))}
          </ul>
        </div>
      )}
    </SectionCard>
  );
}

// ════════ SECTION 8: Companions ════════
function CompanionsSection({ crop }: { crop: CropData }) {
  if (crop.goodCompanions.length === 0 && crop.badCompanions.length === 0) return null;
  return (
    <SectionCard title="একসাথে চাষ করুন" icon="🌿">
      {crop.goodCompanions.length > 0 && (
        <div>
          <p className="text-xs font-bold text-emerald-700 mb-2">✅ ভালো সঙ্গী</p>
          <div className="flex flex-wrap gap-2">
            {crop.goodCompanions.map((c, i) => (
              <span key={i} className="bg-emerald-50 text-emerald-800 text-xs px-3 py-1.5 rounded-full font-semibold">{c}</span>
            ))}
          </div>
        </div>
      )}
      {crop.badCompanions.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-bold text-red-700 mb-2">❌ এড়িয়ে চলুন</p>
          <div className="flex flex-wrap gap-2">
            {crop.badCompanions.map((c, i) => (
              <span key={i} className="bg-red-50 text-red-800 text-xs px-3 py-1.5 rounded-full font-semibold">{c}</span>
            ))}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

// ════════ SECTION 9: Govt support ════════
function GovtSection({ crop }: { crop: CropData }) {
  return (
    <SectionCard title="সরকারি সুবিধা" icon="🏛️">
      <ul className="space-y-2">
        {crop.govtSupport.map((g, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-800">
            <Landmark className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            {g}
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="text-xs text-gray-500 w-20 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-800 flex-1 font-semibold">{value}</span>
    </div>
  );
}
