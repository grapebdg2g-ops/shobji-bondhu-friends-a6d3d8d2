import { CropIcon } from "@/components/krishi/crop-icon";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { ArrowLeft, Search, Flame, TrendingUp } from "lucide-react";
import { getAllCrops, type Category, type RiskLevel } from "@/data/master-crop-data";
import { toBn } from "@/lib/bn";
import { CropAdvisoryWidget } from "@/components/krishi/crop-advisory-widget";

export const Route = createFileRoute("/vegetable-guide/")({
  component: VegetableGuidePage,
  head: () => ({
    meta: [
      { title: "ফসল চাষ গাইড — কৃষক বন্ধু" },
      { property: "og:title", content: "ফসল চাষ গাইড — কৃষক বন্ধু" },
      { property: "og:description", content: "২৭+ ফসলের পূর্ণাঙ্গ চাষ পদ্ধতি, লাভ, ঝুঁকি ও জাত-পরিচিতি।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "description", content: "২৭+ ফসলের পূর্ণাঙ্গ চাষ পদ্ধতি, লাভ, ঝুঁকি ও জাত-পরিচিতি।" },
    ],
  }),
});

type Filter = "all" | Category;
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "সবগুলো" },
  { id: "সবজি", label: "সবজি" },
  { id: "ধান্য", label: "ধান্য" },
  { id: "মসলা", label: "মসলা" },
  { id: "তেল", label: "তেল" },
  { id: "কন্দাল", label: "কন্দাল" },
];

const RISK_STYLE: Record<RiskLevel, { bg: string; text: string; icon: string }> = {
  কম: { bg: "bg-emerald-50", text: "text-emerald-700", icon: "🟢" },
  মাঝারি: { bg: "bg-amber-50", text: "text-amber-700", icon: "🟡" },
  বেশি: { bg: "bg-red-50", text: "text-red-700", icon: "🔴" },
};

function fmtTk(n: number) {
  // Convert to thousands (হাজার) for compactness
  const k = Math.round(n / 1000);
  return `৳${toBn(k)} হাজার`;
}

function seasonText(seasons: string[], plantingMonths: number[]) {
  const monthsBn = ["জানু", "ফেব্রু", "মার্চ", "এপ্রি", "মে", "জুন", "জুলা", "আগ", "সেপ্ট", "অক্টো", "নভে", "ডিসে"];
  if (plantingMonths.length === 0) return seasons.join(", ");
  const first = monthsBn[plantingMonths[0] - 1];
  const last = monthsBn[plantingMonths[plantingMonths.length - 1] - 1];
  return `${seasons.join("/")} (${first}${first !== last ? `-${last}` : ""})`;
}

function VegetableGuidePage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("সবজি");

  const filtered = useMemo(() => {
    const s = q.trim();
    return getAllCrops().filter((c) => {
      const matchQ = !s || c.name.includes(s) || c.nameEn.toLowerCase().includes(s.toLowerCase());
      const matchF = filter === "all" || c.category === filter;
      return matchQ && matchF;
    });
  }, [q, filter]);

  return (
    <main className="min-h-screen bg-[#F0FFF4] md:max-w-[560px] md:mx-auto pb-8">
      <header className="px-5 pt-8 pb-8 rounded-b-3xl text-white" style={{ background: "var(--gradient-brand)" }}>
        <button onClick={() => navigate({ to: "/dashboard" })} className="h-9 w-9 rounded-full bg-white/15 flex items-center justify-center">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="mt-4 text-2xl font-bold">ফসল চাষ গাইড</h1>
        <p className="text-sm text-white/85 mt-1">{toBn(getAllCrops().length)}+ ফসলের পূর্ণাঙ্গ তথ্য</p>
      </header>

      <CropAdvisoryWidget />

      <div className="px-4 mt-4">
        <Link
          to="/crop-guide"
          className="block bg-white rounded-2xl p-4 border border-emerald-200 active:scale-[0.99] transition"
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">📋</span>
            <div className="flex-1">
              <p className="font-bold text-gray-900 text-sm">ফসল পরামর্শ</p>
              <p className="text-[11px] text-gray-500 mt-0.5">রোপণ থেকে বিক্রি পর্যন্ত সম্পূর্ণ গাইড</p>
            </div>
            <span className="text-emerald-600 text-sm font-semibold">দেখুন →</span>
          </div>
        </Link>
      </div>

      <div className="px-4 mt-4">
        <div className="bg-white rounded-2xl p-3 shadow-sm flex items-center gap-2">
          <Search className="h-5 w-5 text-gray-400 ml-1" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ফসল খুঁজুন..."
            className="flex-1 h-9 outline-none text-sm bg-transparent"
          />
        </div>
      </div>

      <div className="px-4 mt-4 flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap border transition ${
              filter === f.id
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-white text-gray-700 border-gray-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <section className="px-4 mt-4 space-y-3">
        {filtered.map((c) => {
          const risk = RISK_STYLE[c.riskLevel];
          const isHot = c.roi >= 150;
          return (
            <Link
              key={c.id}
              to="/vegetable-guide/$slug"
              params={{ slug: c.id }}
              className="bg-white rounded-2xl p-4 border border-gray-100 active:scale-[0.98] transition block"
            >
              <div className="flex items-start gap-3">
                <span className="text-4xl shrink-0"><CropIcon crop={c.id} /></span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900 text-base truncate">{c.name}</h3>
                    {isHot && <Flame className="h-4 w-4 text-orange-500 shrink-0" />}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">{seasonText(c.seasons, c.plantingMonths)}</p>
                  <p className="text-[11px] text-emerald-700 mt-1 font-semibold">
                    ফলন: {toBn(c.yieldMin)}–{toBn(c.yieldMax)} মণ/বিঘা
                  </p>

                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full text-[11px] font-semibold">
                      <TrendingUp className="h-3 w-3" />
                      লাভ: {fmtTk(c.profitMin)}–{fmtTk(c.profitMax)}
                    </div>
                    <div className={`flex items-center gap-1 ${risk.bg} ${risk.text} px-2 py-1 rounded-full text-[11px] font-semibold`}>
                      {risk.icon} ঝুঁকি: {c.riskLevel}
                    </div>
                  </div>
                </div>
                <span className="text-emerald-600 text-xs font-semibold whitespace-nowrap self-end">বিস্তারিত →</span>
              </div>
            </Link>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center text-gray-500 py-12 text-sm">কোন ফসল পাওয়া যায়নি</div>
        )}
      </section>
    </main>
  );
}
