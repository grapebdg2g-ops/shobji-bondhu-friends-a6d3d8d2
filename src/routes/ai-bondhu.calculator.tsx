import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  AlertTriangle,
  Save,
  Share2,
  RotateCcw,
  Printer,
  Bell,
  Sparkles,
  FlaskConical,
} from "lucide-react";
import {
  CROPS,
  SOIL_TYPES,
  UNIT_LABEL,
  UNIT_TO_SHOTOK,
  calculate,
  type SoilType,
  type Unit,
  type CalcResult,
} from "@/data/fertilizer-guide";
import { toBn, fmtBdt } from "@/lib/bn";
import { CALCULATOR_CROP_OPTIONS } from "@/lib/crop-options";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/ai-bondhu/calculator")({
  component: CalculatorPage,
  head: () => ({ meta: [{ title: "সার ক্যালকুলেটর — কৃষক বন্ধু" }] }),
});

function bn1(n: number) {
  return toBn(n.toFixed(1).replace(/\.0$/, ""));
}

type GrowthStage = "seedling" | "vegetative" | "flowering" | "fruiting";

const GROWTH_STAGES: { id: GrowthStage; label: string; note: string }[] = [
  { id: "seedling", label: "চারা/বীজতলা", note: "চারা শক্ত হওয়ার সময়" },
  { id: "vegetative", label: "পাতা ও ডাল বৃদ্ধি", note: "গাছ দ্রুত বাড়ছে" },
  { id: "flowering", label: "ফুল আসার সময়", note: "ফুল ও কুঁড়ি দেখা যাচ্ছে" },
  { id: "fruiting", label: "ফল ধরার সময়", note: "ফল বড় হচ্ছে" },
];

function CalculatorPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [cropId, setCropId] = useState<string>("");
  const [amount, setAmount] = useState("1");
  const [unit, setUnit] = useState<Unit>("bigha");
  const [soil, setSoil] = useState<SoilType>("loam");
  const [growthStage, setGrowthStage] = useState<GrowthStage>("vegetative");

  const shotok = useMemo(() => (parseFloat(amount) || 0) * UNIT_TO_SHOTOK[unit], [amount, unit]);
  const crop = CROPS.find((c) => c.id === cropId);
  const result: CalcResult | null = useMemo(
    () => (step === 3 && cropId && shotok > 0 ? calculate(cropId, shotok, soil) : null),
    [step, cropId, shotok, soil],
  );

  const reset = () => {
    setStep(1);
    setCropId("");
    setAmount("1");
    setUnit("bigha");
    setSoil("loam");
    setGrowthStage("vegetative");
  };

  return (
    <main className="min-h-screen bg-[#F0FFF4] md:max-w-[640px] md:mx-auto pb-10">
      <header
        className="px-5 pt-8 pb-10 rounded-b-3xl text-white"
        style={{ background: "var(--gradient-brand)" }}
      >
        <div className="flex items-center justify-between">
          <button
            onClick={() =>
              step === 1 ? navigate({ to: "/ai-bondhu" }) : setStep((step - 1) as 1 | 2)
            }
            className="h-9 w-9 rounded-full bg-white/15 flex items-center justify-center"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                className={`h-2 rounded-full transition-all ${step >= n ? "bg-white w-6" : "bg-white/30 w-2"}`}
              />
            ))}
          </div>
          <span className="w-9" />
        </div>
        <h1 className="mt-5 text-2xl font-bold">সার ক্যালকুলেটর</h1>
        <p className="text-sm text-white/85 mt-1">
          {step === 1 && "ফসল বাছাই করুন"}
          {step === 2 && "জমি, মাটি ও পর্যায়ের তথ্য দিন"}
          {step === 3 && "সারের সম্পূর্ণ হিসাব"}
        </p>
      </header>

      <section className="px-4 -mt-6">
        {step === 1 && <StepCrop cropId={cropId} setCropId={setCropId} onNext={() => setStep(2)} />}
        {step === 2 && (
          <StepLand
            amount={amount}
            setAmount={setAmount}
            unit={unit}
            setUnit={setUnit}
            soil={soil}
            setSoil={setSoil}
            shotok={shotok}
            growthStage={growthStage}
            setGrowthStage={setGrowthStage}
            onNext={() => setStep(3)}
          />
        )}
        {step === 3 && result && crop && (
          <StepResult
            crop={crop}
            amount={amount}
            unit={unit}
            soil={soil}
            shotok={shotok}
            growthStage={growthStage}
            result={result}
            onReset={reset}
          />
        )}
      </section>
    </main>
  );
}

/* ---------- STEP 1 ---------- */
function StepCrop({
  cropId,
  setCropId,
  onNext,
}: {
  cropId: string;
  setCropId: (id: string) => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h2 className="font-bold text-gray-900 mb-1">কোন ফসলের সার হিসাব করবেন?</h2>
        <p className="mb-3 text-[11px] leading-relaxed text-gray-500">
          ফসলের তালিকা master crop data থেকে এসেছে। যেসব ফসলের official BARC/BARI/BRRI dose mapping
          এখনো সম্পূর্ণ নয়, সেগুলোকে প্রাথমিক হিসাব হিসেবে দেখানো হবে—চূড়ান্ত প্রয়োগের আগে মাটি
          পরীক্ষা করুন।
        </p>
        <div className="grid grid-cols-3 gap-2.5">
          {CALCULATOR_CROP_OPTIONS.map((c) => {
            const supported = Boolean(c.calculatorId);
            const active = cropId === c.calculatorId;
            return (
              <button
                key={c.id}
                type="button"
                disabled={!supported}
                onClick={() => c.calculatorId && setCropId(c.calculatorId)}
                className={`relative aspect-square rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition ${
                  active
                    ? "border-emerald-600 bg-emerald-50"
                    : supported
                      ? "border-gray-200 bg-gray-50 active:bg-gray-100"
                      : "border-gray-100 bg-gray-50/70 opacity-60"
                }`}
              >
                {active && (
                  <span className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-emerald-600 flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" />
                  </span>
                )}
                <span className="text-2xl">{c.icon}</span>
                <span className="px-1 text-center text-[11px] font-semibold leading-tight text-gray-800">
                  {c.label}
                </span>
                {!supported && (
                  <span className="text-[9px] font-semibold text-gray-400">শীঘ্রই</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <button
        disabled={!cropId}
        onClick={onNext}
        className="w-full h-12 rounded-xl bg-emerald-600 text-white font-bold disabled:bg-gray-300 disabled:text-gray-500 active:bg-emerald-700 flex items-center justify-center gap-2"
      >
        পরবর্তী <ArrowRight className="h-5 w-5" />
      </button>
      <Link
        to="/ai-bondhu/soil"
        className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-white px-4 py-3.5 shadow-sm transition active:bg-emerald-50"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <FlaskConical className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-black text-gray-900">মাটির রিপোর্ট আছে?</span>
            <span className="mt-0.5 block text-[11px] text-gray-500">
              মৃত্তিকা বিশ্লেষণে আপনার জমির মাপ অনুযায়ী সঠিক ডোজ জানুন
            </span>
          </span>
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 text-emerald-600" />
      </Link>
    </div>
  );
}

/* ---------- STEP 2 ---------- */
function StepLand({
  amount,
  setAmount,
  unit,
  setUnit,
  soil,
  setSoil,
  shotok,
  growthStage,
  setGrowthStage,
  onNext,
}: {
  amount: string;
  setAmount: (v: string) => void;
  unit: Unit;
  setUnit: (u: Unit) => void;
  soil: SoilType;
  setSoil: (s: SoilType) => void;
  shotok: number;
  growthStage: GrowthStage;
  setGrowthStage: (v: GrowthStage) => void;
  onNext: () => void;
}) {
  const conv =
    shotok > 0 ? `= ${bn1(shotok)} শতক = ${bn1(shotok / 33)} বিঘা = ${bn1(shotok / 100)} একর` : "";

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
        <h2 className="font-bold text-gray-900">জমির পরিমাণ</h2>
        <div className="flex gap-2">
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="flex-1 h-12 px-3 rounded-xl bg-gray-100 text-base font-semibold"
          />
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value as Unit)}
            className="h-12 px-3 rounded-xl bg-gray-100 text-sm font-semibold"
          >
            {(Object.keys(UNIT_LABEL) as Unit[]).map((u) => (
              <option key={u} value={u}>
                {UNIT_LABEL[u]}
              </option>
            ))}
          </select>
        </div>
        {conv && <p className="text-xs text-emerald-700 font-semibold">{conv}</p>}
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h2 className="font-bold text-gray-900 mb-1">মাটির ধরন (তথ্য হিসেবে)</h2>
        <p className="mb-3 text-[11px] leading-relaxed text-gray-500">
          মাটি নির্বাচনটি হিসাবের context হিসেবে রাখা হচ্ছে। FRG-2024 অনুযায়ী final dose-এর জন্য
          soil test report দরকার।
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          {SOIL_TYPES.map((s) => {
            const active = soil === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSoil(s.id)}
                className={`relative rounded-xl border-2 p-3 text-left transition ${
                  active
                    ? "border-emerald-600 bg-emerald-50"
                    : "border-gray-200 bg-gray-50 active:bg-gray-100"
                }`}
              >
                {active && (
                  <span className="absolute top-2 right-2 h-5 w-5 rounded-full bg-emerald-600 flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" />
                  </span>
                )}
                <div className="text-2xl">{s.emoji}</div>
                <div className="font-bold text-sm mt-1 text-gray-900">{s.label}</div>
                <div className="text-[11px] text-gray-500 mt-0.5">{s.note}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays className="h-4 w-4 text-emerald-700" />
          <h2 className="font-bold text-gray-900">গাছের বর্তমান পর্যায়</h2>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {GROWTH_STAGES.map((stage) => {
            const active = growthStage === stage.id;
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => setGrowthStage(stage.id)}
                className={`rounded-xl border-2 p-3 text-left transition ${active ? "border-emerald-600 bg-emerald-50" : "border-gray-200 bg-gray-50 active:bg-gray-100"}`}
              >
                <span className="block text-xs font-bold text-gray-900">{stage.label}</span>
                <span className="mt-1 block text-[10px] leading-snug text-gray-500">
                  {stage.note}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <button
        disabled={shotok <= 0}
        onClick={onNext}
        className="w-full h-12 rounded-xl bg-emerald-600 text-white font-bold disabled:bg-gray-300 disabled:text-gray-500 active:bg-emerald-700 flex items-center justify-center gap-2"
      >
        হিসাব করুন <Sparkles className="h-5 w-5" />
      </button>
    </div>
  );
}

/* ---------- STEP 3 ---------- */
function StepResult({
  crop,
  amount,
  unit,
  soil,
  shotok,
  growthStage,
  result,
  onReset,
}: {
  crop: (typeof CROPS)[number];
  amount: string;
  unit: Unit;
  soil: SoilType;
  shotok: number;
  growthStage: GrowthStage;
  result: CalcResult;
  onReset: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const soilLabel = SOIL_TYPES.find((s) => s.id === soil)!.label;
  const stage = GROWTH_STAGES.find((s) => s.id === growthStage)!;
  const rows = [
    { key: "urea", name: "ইউরিয়া", kg: result.urea, color: "bg-emerald-500" },
    { key: "tsp", name: "টিএসপি", kg: result.tsp, color: "bg-orange-500" },
    { key: "mop", name: "এমওপি", kg: result.mop, color: "bg-purple-500" },
    { key: "gypsum", name: "জিপসাম", kg: result.gypsum, color: "bg-blue-500" },
    { key: "zinc", name: "জিংক সালফেট", kg: result.zinc, color: "bg-pink-500" },
  ];
  const max = Math.max(...rows.map((r) => r.kg));

  async function handleSave() {
    setSaving(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id;
      if (!uid) {
        toast.error("সংরক্ষণ করতে লগইন করুন");
        return;
      }
      const { error } = await supabase.from("saved_calculations").insert({
        user_id: uid,
        crop_type: crop.label,
        area_value: parseFloat(amount) || 0,
        area_unit: unit,
        area_shotok: shotok,
        soil_type: soilLabel,
        result_json: JSON.parse(JSON.stringify({ ...result, growthStage })),
      });
      if (error) throw error;
      toast.success("হিসাব সংরক্ষণ হয়েছে");
    } catch (e) {
      toast.error("সংরক্ষণ করা যায়নি");
    } finally {
      setSaving(false);
    }
  }

  function buildShareText() {
    const lines = [
      `🌾 ${crop.label} — ${toBn(amount)} ${UNIT_LABEL[unit]} জমির সার`,
      ``,
      ...rows.map((r) => `• ${r.name}: ${bn1(r.kg)} কেজি`),
      ``,
      `আনুমানিক খরচ: ${fmtBdt(result.totalCost)}`,
      `মাটি: ${soilLabel}`,
      `পর্যায়: ${stage.label}`,
      `উৎস: ${crop.sourceTitle}`,
      `মাটি পরীক্ষা করে চূড়ান্ত dose নির্ধারণ করুন`,
      ``,
      `— কৃষক বন্ধু অ্যাপ`,
    ];
    return lines.join("\n");
  }

  async function handleShare() {
    const text = buildShareText();
    if (navigator.share) {
      try {
        await navigator.share({ title: "সারের হিসাব", text });
        return;
      } catch {
        /* user cancelled */
      }
    }
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">
              {crop.emoji} {crop.label} — {toBn(amount)} {UNIT_LABEL[unit]}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {bn1(shotok)} শতাংশ • {soilLabel} • {stage.label}
            </p>
          </div>
          <span
            className={`text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap ${crop.verified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}
          >
            {crop.verified ? "BARC ২০২৪ ✓" : "প্রাথমিক হিসাব"}
          </span>
        </div>
      </div>

      <div
        className={`rounded-2xl border p-4 ${crop.verified ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}
      >
        <div className="flex items-start gap-2">
          <AlertTriangle
            className={`mt-0.5 h-4 w-4 shrink-0 ${crop.verified ? "text-emerald-700" : "text-amber-700"}`}
          />
          <div className="min-w-0">
            <p
              className={`text-xs font-bold ${crop.verified ? "text-emerald-900" : "text-amber-900"}`}
            >
              {crop.sourceTitle}
            </p>
            <p
              className={`mt-1 text-[11px] leading-relaxed ${crop.verified ? "text-emerald-800" : "text-amber-900"}`}
            >
              {crop.sourceNote}
            </p>
            <a
              href={crop.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className={`mt-2 inline-flex text-[11px] font-extrabold underline ${crop.verified ? "text-emerald-800" : "text-amber-900"}`}
            >
              official source দেখুন ↗
            </a>
          </div>
        </div>
      </div>

      {/* AMOUNTS */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="font-bold text-gray-900 mb-3">প্রয়োজনীয় সারের পরিমাণ</h3>
        <div className="space-y-2.5">
          {rows.map((r) => (
            <div key={r.key}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-gray-800">{r.name}</span>
                <span className="font-bold text-gray-900">{bn1(r.kg)} কেজি</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={`h-full ${r.color}`}
                  style={{ width: `${max > 0 ? (r.kg / max) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t border-dashed border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-600">আনুমানিক মোট খরচ</span>
            <span className="text-lg font-extrabold text-emerald-700">
              {fmtBdt(result.totalCost)}
            </span>
          </div>
          <p className="text-[11px] text-gray-500 mt-0.5">
            সরকারি নির্ধারিত দামে; জৈব/অন্যান্য supplemental input-এর দাম এতে ধরা নেই
          </p>
        </div>
      </div>

      {result.supplemental.length > 0 && (
        <div className="rounded-2xl border border-lime-200 bg-lime-50 p-4">
          <h3 className="font-bold text-lime-950">অতিরিক্ত উপকরণ — official protocol</h3>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {result.supplemental.map((item) => (
              <div key={item.name} className="rounded-xl bg-white/70 px-3 py-2">
                <p className="text-xs font-bold text-lime-950">{item.name}</p>
                <p className="mt-1 text-sm font-extrabold text-lime-900">{bn1(item.kg)} কেজি</p>
                {item.note && (
                  <p className="mt-0.5 text-[10px] leading-snug text-lime-800">{item.note}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STAGE GUIDANCE */}
      <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4">
        <div className="flex items-start gap-2">
          <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-sky-700" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-sky-700">
              এই পর্যায়ের ফোকাস
            </p>
            <p className="mt-1 text-sm font-bold text-sky-950">{stage.label}</p>
            <p className="mt-1 text-xs leading-relaxed text-sky-800">
              সারের পরিমাণের পাশাপাশি পর্যায় অনুযায়ী ভাগ করে প্রয়োগ করুন এবং প্রতিবার প্রয়োগের
              আগে জমির আর্দ্রতা দেখুন।
            </p>
          </div>
        </div>
      </div>

      {/* SOIL NOTE */}
      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5">
        <span className="text-lg">🧪</span>
        <p className="text-xs font-semibold leading-relaxed text-amber-900">
          নির্বাচিত মাটি: {soilLabel}। FRG-2024 অনুযায়ী final dose মাটি পরীক্ষা ও এলাকার উপর নির্ভর
          করে; এই হিসাব soil-test report-এর বিকল্প নয়।
        </p>
      </div>

      {/* SCHEDULE */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="font-bold text-gray-900 mb-4">প্রয়োগের সময়সূচি</h3>
        <ol className="relative border-l-2 border-emerald-200 ml-3 space-y-5">
          {result.schedule.map((s, i) => (
            <li key={i} className="pl-5">
              <span className="absolute -left-[11px] h-5 w-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">
                {toBn(i + 1)}
              </span>
              <p className="font-bold text-sm text-gray-900">
                {i === 0 ? "🌱 " : "📅 "}
                {s.when}
              </p>
              <p className="text-xs text-gray-600 mt-0.5">{s.detail}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {s.amounts.map((a, j) => (
                  <span
                    key={j}
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700"
                  >
                    {a.name} {bn1(a.kg)} কেজি
                  </span>
                ))}
              </div>
              <button
                onClick={() => toast.success(`${s.when} — মনে করিয়ে দেওয়া হবে`)}
                className="mt-2 inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold active:bg-emerald-100"
              >
                <Bell className="h-3.5 w-3.5" /> মনে করিয়ে দিন
              </button>
            </li>
          ))}
        </ol>
      </div>

      {/* WARNINGS */}
      {result.warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-700" />
            <h3 className="font-bold text-amber-800 text-sm">সতর্কতা</h3>
          </div>
          <ul className="space-y-1.5">
            {result.warnings.map((w, i) => (
              <li key={i} className="text-xs text-amber-900 flex gap-1.5">
                <span>•</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ACTIONS */}
      <div className="grid grid-cols-2 gap-2.5 print:hidden">
        <button
          onClick={handleSave}
          disabled={saving}
          className="h-11 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center gap-2 active:bg-emerald-700 disabled:opacity-60"
        >
          <Save className="h-4 w-4" /> {saving ? "সংরক্ষণ..." : "সংরক্ষণ"}
        </button>
        <button
          onClick={handleShare}
          className="h-11 rounded-xl bg-white border border-gray-200 text-gray-800 font-bold flex items-center justify-center gap-2 active:bg-gray-50"
        >
          <Share2 className="h-4 w-4" /> শেয়ার
        </button>
        <button
          onClick={onReset}
          className="h-11 rounded-xl bg-white border border-gray-200 text-gray-800 font-bold flex items-center justify-center gap-2 active:bg-gray-50"
        >
          <RotateCcw className="h-4 w-4" /> নতুন হিসাব
        </button>
        <button
          onClick={() => window.print()}
          className="h-11 rounded-xl bg-white border border-gray-200 text-gray-800 font-bold flex items-center justify-center gap-2 active:bg-gray-50"
        >
          <Printer className="h-4 w-4" /> প্রিন্ট
        </button>
      </div>
      <Link
        to="/ai-bondhu/soil"
        className="flex items-center justify-center gap-2 rounded-xl border-2 border-emerald-600 bg-emerald-50 h-12 font-bold text-emerald-800 transition active:bg-emerald-100 print:hidden"
      >
        <FlaskConical className="h-4 w-4" /> মৃত্তিকা বিশ্লেষণ দিয়ে আরও নিখুঁত হিসাব করুন
      </Link>
    </div>
  );
}
