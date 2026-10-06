import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, ExternalLink, ChevronDown } from "lucide-react";
import {
  ORGANIC_FERTILIZER_GUIDE,
  ORGANIC_APPLICATION_RATES,
  CHEMICAL_REDUCTION,
  type OrganicFertilizerKey,
} from "@/data/organic-fertilizer-guide";
import { UNIT_LABEL, UNIT_TO_SHOTOK, type Unit } from "@/data/fertilizer-guide";
import { MASTER_CROP_LABELS } from "@/lib/crop-options";
import { toBn } from "@/lib/bn";
import { useOrganicGuideVideos } from "@/hooks/use-organic-guide-videos";

export const Route = createFileRoute("/organic-fertilizer")({
  component: OrganicFertilizerPage,
  head: () => ({
    meta: [
      { title: "জৈব কর্নার — কৃষক বন্ধু" },
      {
        name: "description",
        content:
          "নিজে জমির জৈব সার নিজেই উৎপাদন করুন—গোবর, কম্পোস্ট, ভার্মি কম্পোস্ট ও জৈব বালাইনাশকের বাংলা গাইড।",
      },
    ],
  }),
});

const TABS: { key: OrganicFertilizerKey; label: string; icon: string }[] = [
  { key: "goborSar", label: "গোবর সার", icon: "🐄" },
  { key: "compost", label: "কম্পোস্ট", icon: "♻️" },
  { key: "vermicompost", label: "ভার্মি কম্পোস্ট", icon: "🪱" },
  { key: "trichoCompost", label: "ট্রাইকো কম্পোস্ট", icon: "🍄" },
  { key: "greenManure", label: "সবুজ সার", icon: "🌿" },
  { key: "biopesticide", label: "জৈব বালাইনাশক", icon: "🌶️" },
];

const CALC_KEYS: Record<OrganicFertilizerKey, keyof typeof ORGANIC_APPLICATION_RATES | null> = {
  goborSar: "gobor",
  compost: "compost",
  vermicompost: "vermicompost",
  trichoCompost: "trichoCompost",
  greenManure: null,
  biopesticide: null,
};

const REDUCTION_KEYS: Record<OrganicFertilizerKey, keyof typeof CHEMICAL_REDUCTION | null> = {
  goborSar: "gobor",
  compost: "compost",
  vermicompost: "vermicompost",
  trichoCompost: "trichoCompost",
  greenManure: "greenManure",
  biopesticide: null,
};

// Rough fertilizer prices (BDT/kg) for savings estimate
const PRICES = { urea: 27, tsp: 27, mop: 20 };

function OrganicFertilizerPage() {
  const navigate = useNavigate();
  const [active, setActive] = useState<OrganicFertilizerKey>("goborSar");
  const item = ORGANIC_FERTILIZER_GUIDE[active] as any;
  const { data: managedVideos = [] } = useOrganicGuideVideos();
  const activeVideos = managedVideos.filter((video) => video.guide_key === active);
  const videos = activeVideos.length > 0
    ? activeVideos.map((video) => ({ title: video.title, url: video.youtube_url, source: video.source, duration: video.duration }))
    : (item.videoLinks ?? []);

  return (
    <main className="min-h-screen bg-[#F0FFF4] md:max-w-[560px] md:mx-auto pb-20">
      {/* Header */}
      <header
        className="px-5 pt-8 pb-8 rounded-b-3xl"
        style={{ background: "var(--gradient-brand)" }}
      >
        <button
          onClick={() => navigate({ to: "/dashboard" })}
          className="h-9 w-9 rounded-full bg-white/15 flex items-center justify-center text-white"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="mt-4 text-2xl font-bold text-white">🌿 জৈব কর্নার</h1>
        <p className="text-sm text-white/85 mt-1">নিজে জমির জৈব সার নিজেই উৎপাদন করুন</p>
      </header>

      {/* Tabs */}
      <nav className="-mt-4 mb-4 sticky top-0 z-10 bg-[#F0FFF4]/95 backdrop-blur">
        <div className="overflow-x-auto no-scrollbar">
          <ul className="flex gap-1 px-3 py-2 min-w-max">
            {TABS.map((t) => {
              const on = t.key === active;
              return (
                <li key={t.key}>
                  <button
                    onClick={() => setActive(t.key)}
                    className={`px-3 py-2 text-sm rounded-xl flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                      on
                        ? "bg-white text-emerald-800 font-bold border-b-2 border-emerald-700"
                        : "text-gray-600"
                    }`}
                  >
                    <span>{t.icon}</span>
                    <span>{t.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      <section className="px-4 space-y-4">
        {/* SECTION 2 — Info card */}
        <InfoCard item={item} />

        {/* SECTION 3 — Steps OR Recipes */}
        {item.recipes ? (
          <Recipes recipes={item.recipes} color={item.color} />
        ) : (
          <StepsCard steps={item.preparationSteps} color={item.color} />
        )}

        {/* Green manure extras */}
        {item.nitrogenProvided && (
          <Card title="🌱 নাইট্রোজেন সরবরাহ">
            <div className="grid gap-2">
              <Stat
                label="প্রতি বিঘায়"
                value={item.nitrogenProvided.perBigha}
                tone="emerald"
              />
              <Stat
                label="ইউরিয়া সাশ্রয়"
                value={item.nitrogenProvided.equivalentUrea}
                tone="amber"
              />
            </div>
          </Card>
        )}

        {item.suitableCrops && (
          <Card title="🌾 উপযুক্ত ফসল">
            <ul className="space-y-1.5">
              {item.suitableCrops.map((c: string) => (
                <li key={c} className="text-sm text-gray-800">
                  • {c}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* SECTION 4 — Calculator */}
        {CALC_KEYS[active] && (
          <Calculator activeKey={active} />
        )}

        {/* Business potential — vermicompost only */}
        {item.businessPotential && (
          <div className="bg-gradient-to-br from-amber-100 to-yellow-50 rounded-2xl border border-amber-200 p-4">
            <h3 className="font-bold text-amber-900 mb-3">💰 আয়ের সুযোগ!</h3>
            <div className="space-y-2 text-sm">
              <Row k="মাসিক উৎপাদন" v={item.businessPotential.productionPerMonth} />
              <Row k="বিক্রয় মূল্য" v={item.businessPotential.sellingPrice} />
              <Row k="মাসিক আয়" v={item.businessPotential.monthlyIncome} />
            </div>
            <p className="mt-3 text-xs italic text-amber-900 bg-white/60 rounded-lg px-3 py-2">
              "{item.businessPotential.note}"
            </p>
          </div>
        )}

        {/* SECTION 5 — Videos */}
        {videos.length > 0 && (
          <Card title="ভিডিও গাইড 📹">
            <ul className="space-y-2">
              {videos.map((v: any) => (
                <li key={v.url}>
                  <button
                    onClick={() => window.open(v.url, "_blank", "noopener,noreferrer")}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-left"
                  >
                    <span className="text-2xl">📹</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">
                        {v.title}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {v.source}
                        {v.duration ? ` • ${v.duration}` : ""}
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-emerald-700 flex items-center gap-0.5 shrink-0">
                      দেখুন <ExternalLink className="h-3 w-3" />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Biopesticide general tips */}
        {item.generalTips && (
          <Card title="💡 সাধারণ নিয়ম">
            <ul className="space-y-2">
              {item.generalTips.map((t: string) => (
                <li key={t} className="text-sm text-gray-800 leading-relaxed">
                  {t}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Per-item tips */}
        {item.tips && (
          <Card title="💡 পরামর্শ">
            <ul className="space-y-2">
              {item.tips.map((t: string) => (
                <li key={t} className="text-sm text-gray-800 leading-relaxed">
                  {t}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* GENERAL TIPS — bottom, all tabs */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
          <h3 className="font-bold text-yellow-900 mb-3">মনে রাখবেন</h3>
          <ul className="space-y-2.5">
            {[
              "জৈব সার রাসায়নিক সারের সাথে মিলিয়ে ব্যবহার করলে সেরা ফল পাওয়া যায়",
              "জৈব সার ব্যবহারে রাসায়নিক সারের খরচ ২৫-৫০% কমানো সম্ভব",
              "মাটির স্বাস্থ্য ভালো রাখতে প্রতি বছর জৈব সার দিন",
            ].map((t) => (
              <li key={t} className="flex gap-2 text-sm text-yellow-900">
                <span>💡</span>
                <span className="leading-relaxed">{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}

/* ─── components ─── */

function InfoCard({ item }: { item: any }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 flex gap-3">
        <div
          className="h-16 w-16 rounded-2xl flex items-center justify-center text-4xl shrink-0"
          style={{ background: item.bgColor }}
        >
          {item.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-gray-900">{item.name}</div>
          <p className="text-xs text-gray-600 mt-0.5">{item.shortDesc}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {item.difficulty && <Chip>কঠিনতা: {item.difficulty}</Chip>}
            {item.totalTime && <Chip>সময়: {item.totalTime}</Chip>}
            {item.cost && <Chip>খরচ: {item.cost}</Chip>}
          </div>
        </div>
      </div>

      {item.nutrientContent && (
        <div className="px-4 pb-4">
          <div className="text-xs font-semibold text-gray-500 mb-2">পুষ্টিগুণ</div>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(item.nutrientContent).map(([k, v]) => (
              <div key={k} className="bg-gray-50 rounded-lg p-2 text-center">
                <div className="text-[10px] text-gray-500 uppercase">{k.slice(0, 1)}</div>
                <div className="text-xs font-bold text-gray-900">{String(v)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {item.benefits && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3">
          <div className="text-xs font-semibold text-gray-500 mb-2">উপকারিতা</div>
          <ul className="space-y-1.5">
            {item.benefits.map((b: string) => (
              <li key={b} className="flex gap-2 text-sm text-gray-800">
                <span className="text-emerald-600">✅</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {item.materials && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3">
          <div className="text-xs font-semibold text-gray-500 mb-2">উপকরণ</div>
          <ul className="divide-y divide-gray-100">
            {item.materials.map((m: { name: string; amount: string }) => (
              <li key={m.name} className="py-1.5 flex justify-between text-sm">
                <span className="text-gray-800">{m.name}</span>
                <span className="font-semibold text-gray-900">{m.amount}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function StepsCard({ steps, color }: { steps: any[]; color: string }) {
  return (
    <Card title="তৈরির পদ্ধতি">
      <ol className="space-y-4">
        {steps.map((s, i) => (
          <li key={s.step} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className="h-9 w-9 rounded-full flex items-center justify-center font-bold text-white shrink-0"
                style={{ background: color }}
              >
                {s.step}
              </div>
              {i < steps.length - 1 && (
                <div className="w-px flex-1 bg-gray-200 my-1" />
              )}
            </div>
            <div className="flex-1 pb-1">
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold text-gray-900">{s.title}</div>
                <div className="text-xs text-gray-500 whitespace-nowrap flex items-center gap-1">
                  {s.duration} <span>{s.icon}</span>
                </div>
              </div>
              <p className="text-sm text-gray-700 mt-1 leading-relaxed">{s.desc}</p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function Recipes({ recipes, color }: { recipes: any[]; color: string }) {
  const [open, setOpen] = useState<string | null>(recipes[0]?.name ?? null);
  return (
    <div className="space-y-3">
      {recipes.map((r) => {
        const isOpen = open === r.name;
        return (
          <div
            key={r.name}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
          >
            <div className="p-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{r.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-gray-900">{r.name}</div>
                  <div className="text-xs text-gray-500">কার্যকর: {r.effectiveness}</div>
                </div>
              </div>

              <div className="mt-3">
                <div className="text-xs font-semibold text-gray-500 mb-1.5">উপকরণ</div>
                <ul className="space-y-1">
                  {r.ingredients.map((i: string) => (
                    <li key={i} className="text-sm text-gray-800">• {i}</li>
                  ))}
                </ul>
              </div>
            </div>

            <button
              onClick={() => setOpen(isOpen ? null : r.name)}
              className="w-full px-4 py-2.5 text-sm font-semibold text-emerald-700 bg-emerald-50 flex items-center justify-center gap-1 border-t border-emerald-100"
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
              প্রস্তুত প্রণালী {isOpen ? "লুকান" : "দেখুন"}
            </button>

            {isOpen && (
              <div className="p-4 space-y-3 border-t border-gray-100">
                <ol className="space-y-1.5">
                  {r.steps.map((s: string, i: number) => (
                    <li key={s} className="flex gap-2 text-sm text-gray-800">
                      <span
                        className="h-5 w-5 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                        style={{ background: color }}
                      >
                        {i + 1}
                      </span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ol>

                <div>
                  <div className="text-xs font-semibold text-gray-500 mb-1.5">টার্গেট পোকা</div>
                  <div className="flex flex-wrap gap-1.5">
                    {r.targetPests.map((p: string) => (
                      <span
                        key={p}
                        className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>

                {r.caution && (
                  <div className="text-xs text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    ⚠️ {r.caution}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Calculator({ activeKey }: { activeKey: OrganicFertilizerKey }) {
  const calcKey = CALC_KEYS[activeKey]!;
  const redKey = REDUCTION_KEYS[activeKey];
  const rates = ORGANIC_APPLICATION_RATES[calcKey];
  const item = ORGANIC_FERTILIZER_GUIDE[activeKey] as any;
  const crops = MASTER_CROP_LABELS;
  const availableCrops = new Set(Object.keys(rates));
  const getRateKey = (name: string) => {
    if (availableCrops.has(name)) return name;
    if (name.includes("ধান") && availableCrops.has("ধান")) return "ধান";
    if ((name === "লাউ" || name === "মিষ্টি কুমড়া") && availableCrops.has("লাউ/কুমড়া")) return "লাউ/কুমড়া";
    return null;
  };

  const [crop, setCrop] = useState<string>(() => crops.find((name) => getRateKey(name)) ?? crops[0]);
  const [areaInput, setAreaInput] = useState<string>("1");
  const [unit, setUnit] = useState<Unit>("bigha");

  const area = Number(areaInput) || 0;
  const shotok = area * UNIT_TO_SHOTOK[unit];
  const bigha = shotok / 33;

  const rateKey = getRateKey(crop);
  const ratePerBigha = rateKey ? ((rates as Record<string, number>)[rateKey] ?? 0) : 0;
  const totalKg = useMemo(() => Math.round(ratePerBigha * bigha), [ratePerBigha, bigha]);

  const reduction = redKey ? CHEMICAL_REDUCTION[redKey] : null;

  // Rough baseline chemical doses (kg/bigha) — DAE general guide
  const BASELINE = { urea: 20, tsp: 7, mop: 5 };
  const savings = reduction
    ? {
        urea: +(BASELINE.urea * reduction.urea * bigha).toFixed(2),
        tsp: +(BASELINE.tsp * reduction.tsp * bigha).toFixed(2),
        mop: +(BASELINE.mop * reduction.mop * bigha).toFixed(2),
      }
    : null;
  const moneySaved = savings
    ? Math.round(
        savings.urea * PRICES.urea + savings.tsp * PRICES.tsp + savings.mop * PRICES.mop
      )
    : 0;

  const bn1 = (n: number) => toBn(n.toFixed(1).replace(/\.0$/, ""));
  const conv = shotok > 0
    ? `= ${bn1(shotok)} শতক = ${bn1(shotok / 33)} বিঘা = ${bn1(shotok / 100)} একর`
    : "";

  return (
    <Card title="কতটুকু দেবেন?">
      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-gray-600">ফসল বাছাই করুন</label>
          <select
            value={crop}
            onChange={(e) => setCrop(e.target.value)}
            className="mt-1 w-full h-11 rounded-xl border border-gray-200 px-3 bg-white text-sm"
          >
            {crops.map((c) => (
              <option key={c} value={c} disabled={!getRateKey(c)}>{c}{getRateKey(c) ? "" : " — শীঘ্রই"}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-600">জমির পরিমাণ</label>
          <div className="mt-1 flex gap-2">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.1"
              value={areaInput}
              onChange={(e) => setAreaInput(e.target.value)}
              className="flex-1 h-11 rounded-xl border border-gray-200 px-3 text-sm font-semibold"
            />
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as Unit)}
              className="h-11 px-3 rounded-xl bg-gray-100 text-sm font-semibold"
            >
              {(Object.keys(UNIT_LABEL) as Unit[]).map((u) => (
                <option key={u} value={u}>{UNIT_LABEL[u]}</option>
              ))}
            </select>
          </div>
          {conv && (
            <p className="mt-1.5 text-xs text-emerald-700 font-semibold">{conv}</p>
          )}
        </div>

        {area > 0 && ratePerBigha > 0 && (
          <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3">
            <div className="font-bold text-emerald-900">
              {crop} — {toBn(area)} {UNIT_LABEL[unit]}-এর জন্য
            </div>


            <div className="flex items-center justify-between bg-white rounded-xl p-3">
              <span className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                <span className="text-xl">{item.icon}</span>
                {item.name}:
              </span>
              <span className="font-bold text-emerald-800">{totalKg} কেজি</span>
            </div>

            {savings && (
              <>
                <div className="text-xs font-semibold text-gray-700">
                  এই সার দিলে রাসায়নিক সার কমবে:
                </div>
                <ul className="space-y-1 text-sm">
                  <SaveRow label="ইউরিয়া" pct={reduction!.urea} kg={savings.urea} />
                  <SaveRow label="TSP" pct={reduction!.tsp} kg={savings.tsp} />
                  <SaveRow label="MOP" pct={reduction!.mop} kg={savings.mop} />
                </ul>
                <div className="bg-amber-100 rounded-xl px-3 py-2.5 text-sm font-bold text-amber-900">
                  💰 আনুমানিক সাশ্রয়: ৳{moneySaved.toLocaleString("bn-BD")}
                </div>
              </>
            )}
          </div>
        )}
        {area > 0 && ratePerBigha <= 0 && (
          <div className="mt-2 rounded-2xl border border-sky-200 bg-sky-50 p-3 text-xs leading-relaxed text-sky-900">
            এই crop-এর জৈব সারের rate এখনও যোগ করা হয়নি। master crop catalog-এ cropটি আছে; rate যুক্ত হলে calculator-এ স্বয়ংক্রিয়ভাবে সক্রিয় হবে।
          </div>
        )}
      </div>
    </Card>
  );
}

function SaveRow({ label, pct, kg }: { label: string; pct: number; kg: number }) {
  return (
    <li className="flex justify-between text-gray-800">
      <span>{label}: {Math.round(pct * 100)}% কম</span>
      <span className="font-semibold">= {kg} কেজি সাশ্রয়</span>
    </li>
  );
}

/* ─── small atoms ─── */

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <h3 className="font-bold text-gray-900 mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
      {children}
    </span>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-700">{k}</span>
      <span className="font-semibold text-gray-900">{v}</span>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "emerald" | "amber" }) {
  const cls =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-900 border-emerald-200"
      : "bg-amber-50 text-amber-900 border-amber-200";
  return (
    <div className={`rounded-xl border p-3 ${cls}`}>
      <div className="text-xs opacity-80">{label}</div>
      <div className="font-bold">{value}</div>
    </div>
  );
}
