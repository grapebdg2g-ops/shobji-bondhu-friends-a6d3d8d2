import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  FlaskConical,
  Sprout,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Droplets,
  Thermometer,
  Info,
  ClipboardList,
  Leaf,
  Mountain,
  Ruler,
  Copy,
  RefreshCw,
  Camera,
  FileText,
  Upload,
  X,
  Loader2,
  Save,
  Share2,
  Printer,
  Calculator,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  analyzeSoil,
  extractSoilReport,
  type SoilAnalysisResult,
  type SoilExtraction,
} from "@/lib/soil.functions";
import { BengaliButton } from "@/components/krishi/bengali-button";
import { MASTER_CROP_LABELS } from "@/lib/crop-options";
import { useUser } from "@/contexts/user-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ai-bondhu/soil")({
  component: SoilAnalysisPage,
  head: () => ({
    meta: [
      { title: "মৃত্তিকা বিশ্লেষণ — মাটির স্বাস্থ্য ও সার পরিকল্পনা" },
      {
        name: "description",
        content:
          "মাটির ধরন, pH ও NPK মাত্রা দিয়ে স্বাস্থ্য স্কোর, চুনের পরিমাণ ও জমির মাপ অনুযায়ী সঠিক সারের হিসাব পান।",
      },
      { property: "og:title", content: "মৃত্তিকা বিশ্লেষণ — কৃষক বন্ধু" },
      {
        property: "og:description",
        content: "AI মৃত্তিকা বিশ্লেষণে মাটির স্বাস্থ্য স্কোর ও জমির মাপ অনুযায়ী সারের সুপারিশ।",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const SOIL_TYPES = [
  { name: "দোআঁশ", hint: "সবচেয়ে উর্বর, প্রায় সব ফসলে ভালো" },
  { name: "এঁটেল", hint: "পানি ধরে রাখে, ধান-পাটে ভালো" },
  { name: "বেলে", hint: "পানি ধরে না, ঘন সেচ লাগে" },
  { name: "বেলে-দোআঁশ", hint: "আলু, বাদাম, সবজিতে উপযুক্ত" },
  { name: "এঁটেল-দোআঁশ", hint: "ধান ও শীতকালীন সবজিতে ভালো" },
  { name: "পলি", hint: "নদী তীরবর্তী, উর্বর ও নরম" },
];

const NUTRIENT_LEVELS = [
  { value: "low", label: "কম" },
  { value: "medium", label: "মাঝারি" },
  { value: "high", label: "বেশি" },
  { value: "unknown", label: "জানা নেই" },
];

const AREA_UNITS = ["শতক", "বিঘা", "একর", "হেক্টর"] as const;

const toBn = (v: number | string) =>
  String(v).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);

function scoreColor(score: number) {
  if (score >= 80) return { ring: "text-emerald-600", bg: "bg-emerald-600", soft: "bg-emerald-50" };
  if (score >= 65) return { ring: "text-lime-600", bg: "bg-lime-600", soft: "bg-lime-50" };
  if (score >= 50) return { ring: "text-amber-500", bg: "bg-amber-500", soft: "bg-amber-50" };
  return { ring: "text-red-500", bg: "bg-red-500", soft: "bg-red-50" };
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("ফাইলটি পড়া যায়নি"));
    reader.readAsDataURL(file);
  });
}

// বড় মোবাইল ছবি (৫-১০ মেগাবাইট) সরাসরি পাঠালে AI ধীর হয়ে যায় বা ব্যর্থ হয়,
// তাই ছবি ছোট করে (সর্বোচ্চ ১৬০০px, JPEG) পাঠানো হয় — ছকের লেখা পড়তে এটাই যথেষ্ট।
function fileToOptimizedBase64(file: File): Promise<{ mimeType: string; data: string }> {
  if (file.type === "application/pdf") {
    return readFileAsBase64(file).then((url) => ({
      mimeType: "application/pdf",
      data: url.split(",")[1] ?? "",
    }));
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const maxSide = 1600;
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      if (scale === 1 && file.size < 900 * 1024) {
        readFileAsBase64(file)
          .then((url) => resolve({ mimeType: file.type, data: url.split(",")[1] ?? "" }))
          .catch(reject);
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("ছবিটি প্রস্তুত করা যায়নি"));
        return;
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      resolve({ mimeType: "image/jpeg", data: dataUrl.split(",")[1] ?? "" });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      // ছবি হিসেবে খোলা না গেলে মূল ফাইলটাই পাঠাই
      readFileAsBase64(file)
        .then((url) => resolve({ mimeType: file.type, data: url.split(",")[1] ?? "" }))
        .catch(reject);
    };
    img.src = objectUrl;
  });
}

function SoilAnalysisPage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const analyzeFn = useServerFn(analyzeSoil);
  const extractFn = useServerFn(extractSoilReport);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [result, setResult] = useState<SoilAnalysisResult | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [extractionNotes, setExtractionNotes] = useState<string[]>([]);

  const [soilType, setSoilType] = useState("");
  const [phLevel, setPhLevel] = useState<number | null>(null);
  const [nitrogen, setNitrogen] = useState("unknown");
  const [phosphorus, setPhosphorus] = useState("unknown");
  const [potassium, setPotassium] = useState("unknown");
  const [organicMatter, setOrganicMatter] = useState("unknown");
  const [calcium, setCalcium] = useState("unknown");
  const [magnesium, setMagnesium] = useState("unknown");
  const [sulfur, setSulfur] = useState("unknown");
  const [ecValue, setEcValue] = useState<number | null>(null);
  const [docType, setDocType] = useState<string | null>(null);
  const [lastCrop, setLastCrop] = useState("");
  const [plannedCrop, setPlannedCrop] = useState("");
  const [areaValue, setAreaValue] = useState("১");
  const [areaUnit, setAreaUnit] = useState<(typeof AREA_UNITS)[number]>("বিঘা");
  const [irrigation, setIrrigation] = useState<"সেচ সুবিধা আছে" | "বৃষ্টিনির্ভর">("সেচ সুবিধা আছে");

  const areaNumber = useMemo(() => {
    const normalized = areaValue.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)));
    const n = parseFloat(normalized);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [areaValue]);

  const level = (v: string) => (v === "unknown" ? undefined : (v as "low" | "medium" | "high"));

  const handleFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (selected.length === 0) return;
    const invalid = selected.find(
      (file) => !file.type.startsWith("image/") && file.type !== "application/pdf",
    );
    if (invalid) {
      toast.error("শুধু JPG, PNG বা PDF ফাইল আপলোড করুন");
      return;
    }
    if (selected.some((file) => file.size > 10 * 1024 * 1024)) {
      toast.error("প্রতিটি ফাইল ১০ মেগাবাইটের কম হতে হবে");
      return;
    }
    const nextFiles = [...uploadedFiles, ...selected].slice(0, 3);
    if (uploadedFiles.length + selected.length > 3) {
      toast.error("সর্বোচ্চ ৩টি ছবি বা রিপোর্ট আপলোড করা যাবে");
    }
    setUploadedFiles(nextFiles);
    setExtractionNotes([]);
    setExtracting(true);
    try {
      const files = await Promise.all(nextFiles.map(async (file) => ({
        name: file.name,
        ...(await fileToOptimizedBase64(file)),
      })));
      const extracted = await extractFn({ data: { files } });
      applyExtraction(extracted);
      setExtractionNotes(extracted.notes);
      toast.success("রিপোর্টের তথ্য ফর্মে বসানো হয়েছে — প্রয়োজনে যাচাই করে নিন");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ফাইল পড়া যায়নি, আবার চেষ্টা করুন");
    } finally {
      setExtracting(false);
    }
  };

  const applyExtraction = (extracted: SoilExtraction) => {
    if (extracted.soilType && SOIL_TYPES.some((item) => item.name === extracted.soilType)) {
      setSoilType(extracted.soilType);
    }
    if (extracted.phLevel != null) setPhLevel(extracted.phLevel);
    if (extracted.nitrogen) setNitrogen(extracted.nitrogen);
    if (extracted.phosphorus) setPhosphorus(extracted.phosphorus);
    if (extracted.potassium) setPotassium(extracted.potassium);
    if (extracted.organicMatter) setOrganicMatter(extracted.organicMatter);
    if (extracted.calcium) setCalcium(extracted.calcium);
    if (extracted.magnesium) setMagnesium(extracted.magnesium);
    if (extracted.sulfur) setSulfur(extracted.sulfur);
    if (extracted.ecValue != null) setEcValue(extracted.ecValue);
    setDocType(extracted.documentType ?? null);
    if (extracted.plannedCrop && MASTER_CROP_LABELS.includes(extracted.plannedCrop)) {
      setPlannedCrop(extracted.plannedCrop);
    }
  };

  const removeFile = (name: string) => {
    setUploadedFiles((files) => files.filter((file) => file.name !== name));
    setExtractionNotes([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!soilType) {
      toast.error("দয়া করে মাটির ধরন নির্বাচন করুন");
      return;
    }
    setLoading(true);
    try {
      const data = await analyzeFn({
        data: {
          soilType,
          phLevel: phLevel ?? undefined,
          nitrogen: level(nitrogen),
          phosphorus: level(phosphorus),
          potassium: level(potassium),
          organicMatter: level(organicMatter),
          calcium: level(calcium),
          magnesium: level(magnesium),
          sulfur: level(sulfur),
          ecValue: ecValue ?? undefined,
          lastCrop: lastCrop || undefined,
          plannedCrop: plannedCrop || undefined,
          district: user?.district ?? undefined,
          areaValue: areaNumber ?? undefined,
          areaUnit,
          irrigation,
        },
      });
      setResult(data);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error("বিশ্লেষণ করা যায়নি, আবার চেষ্টা করুন");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main className="min-h-[100dvh] bg-[#F6FBF7] pb-28">
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-emerald-100 px-4 py-3">
        <div className="flex items-center gap-3 max-w-3xl mx-auto">
          <button
            onClick={() => (result ? setResult(null) : navigate({ to: "/ai-bondhu" }))}
            className="home-pressable flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"
            aria-label="পেছনে"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-black text-gray-900 leading-none">মৃত্তিকা বিশ্লেষণ</h1>
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mt-1">
              SRDI/BARI ভিত্তিক সার পরিকল্পনা
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 pt-6">
        {loading ? (
          <LoadingView />
        ) : result ? (
          <ResultView result={result} onReset={reset} />
        ) : (
          <div className="space-y-5">
            <div className="rounded-3xl bg-gradient-to-br from-[#1B4332] to-[#2D6A4F] p-6 text-white shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black">মাটির স্বাস্থ্য পরীক্ষা করুন</h2>
                  <p className="mt-2 text-xs leading-relaxed text-emerald-50/80">
                    মাটির ধরন ও পুষ্টির তথ্য দিন — জমির মাপ অনুযায়ী কেজি হিসাবে সার, চুনের পরিমাণ ও
                    উপযুক্ত ফসলের তালিকা পাবেন।
                  </p>
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
                  <Mountain className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4 text-[10px] font-bold uppercase tracking-widest">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> স্বাস্থ্য স্কোর
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> সারের কেজি হিসাব
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> চুনের মাত্রা
                </span>
              </div>
            </div>

            <Link
              to="/ai-bondhu/calculator"
              className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-white px-4 py-3.5 shadow-sm transition active:bg-emerald-50"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <Calculator className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-black text-gray-900">সরাসরি সারের হিসাব দরকার?</span>
                  <span className="mt-0.5 block text-[11px] text-gray-500">
                    মাটি পরীক্ষা ছাড়াই সার ক্যালকুলেটরে ফসলভিত্তিক ডোজ বের করুন
                  </span>
                </span>
              </span>
              <ArrowLeft className="h-4 w-4 rotate-180 shrink-0 text-emerald-600" />
            </Link>

            <form onSubmit={handleSubmit} className="space-y-5 pb-6">
              <Card icon={Upload} title="ছবি বা রিপোর্ট দিয়ে শুরু করুন">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  multiple
                  onChange={handleFiles}
                  className="sr-only"
                  aria-label="মাটি নমুনার ছবি বা রিপোর্ট আপলোড করুন"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={extracting || uploadedFiles.length >= 3}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/60 px-4 py-5 text-left transition hover:border-emerald-400 disabled:opacity-60"
                >
                  {extracting ? <Loader2 className="h-6 w-6 animate-spin text-emerald-600" /> : <Camera className="h-6 w-6 text-emerald-600" />}
                  <span>
                    <span className="block text-sm font-black text-emerald-900">
                      {extracting ? "রিপোর্ট পড়া হচ্ছে..." : "মাটির ছবি বা রিপোর্ট আপলোড করুন"}
                    </span>
                    <span className="mt-1 block text-[11px] text-emerald-700">
                      SRDI "সার সুপারিশ কার্ড", ল্যাব রিপোর্ট বা মাটির ছবি · JPG, PNG বা PDF · সর্বোচ্চ ৩টি
                    </span>
                  </span>
                </button>
                <p className="mt-2 text-[10px] leading-relaxed text-gray-400">
                  হাতে লেখা সার সুপারিশ কার্ড থেকেও pH, EC (লবণাক্ততা), N-P-K, গন্ধক, দস্তা, বোরন,
                  ক্যালশিয়াম ও ম্যাগনেসিয়ামের শ্রেণী পড়ে ফর্মে বসে যাবে। ছক স্পষ্ট দেখা যায় এমন সোজা ছবি তুলুন।
                </p>
                {docType && (
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" /> শনাক্ত: {docType}
                  </div>
                )}
                {uploadedFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {uploadedFiles.map((file) => (
                      <div key={`${file.name}-${file.lastModified}`} className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-xs">
                        {file.type === "application/pdf" ? <FileText className="h-4 w-4 text-red-500" /> : <Camera className="h-4 w-4 text-emerald-600" />}
                        <span className="min-w-0 flex-1 truncate font-bold text-gray-700">{file.name}</span>
                        <button type="button" onClick={() => removeFile(file.name)} className="rounded-full p-1 text-gray-400 hover:bg-white hover:text-red-500" aria-label={`${file.name} সরান`}>
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {extractionNotes.length > 0 && (
                  <div className="mt-3 rounded-xl bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-800">
                    <p className="font-black">AI-এর পড়া তথ্য যাচাই করুন</p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-4">
                      {extractionNotes.map((note, index) => <li key={`${note}-${index}`}>{note}</li>)}
                    </ul>
                  </div>
                )}
              </Card>

              {/* Soil type */}
              <Card icon={Mountain} title="মাটির ধরন *">
                <div className="grid grid-cols-2 gap-2">
                  {SOIL_TYPES.map((t) => (
                    <button
                      key={t.name}
                      type="button"
                      onClick={() => setSoilType(t.name)}
                      className={cn(
                        "rounded-2xl border p-3 text-left transition-all",
                        soilType === t.name
                          ? "bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-200"
                          : "bg-gray-50 border-gray-100 text-gray-700 hover:border-emerald-200",
                      )}
                    >
                      <div className="text-sm font-black">{t.name}</div>
                      <div
                        className={cn(
                          "mt-0.5 text-[10px] leading-snug",
                          soilType === t.name ? "text-emerald-50/90" : "text-gray-400",
                        )}
                      >
                        {t.hint}
                      </div>
                    </button>
                  ))}
                </div>
              </Card>

              {/* Area */}
              <Card icon={Ruler} title="জমির পরিমাণ">
                <div className="flex gap-2">
                  <input
                    inputMode="decimal"
                    value={areaValue}
                    onChange={(e) => setAreaValue(e.target.value)}
                    placeholder="যেমন: ১"
                    className="w-28 rounded-xl bg-gray-50 border border-gray-100 p-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  <div className="flex flex-1 gap-1.5">
                    {AREA_UNITS.map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setAreaUnit(u)}
                        className={cn(
                          "flex-1 rounded-xl border py-2 text-xs font-bold transition-all",
                          areaUnit === u
                            ? "bg-emerald-600 border-emerald-600 text-white"
                            : "bg-gray-50 border-gray-100 text-gray-600",
                        )}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="mt-2 text-[10px] text-gray-400">
                  সারের হিসাব এই মাপ অনুযায়ী মোট পরিমাণে দেখানো হবে (১ বিঘা = ৩৩ শতক)।
                </p>
              </Card>

              {/* pH */}
              <Card icon={Thermometer} title="pH লেভেল (জানা থাকলে)">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-black text-emerald-700">
                    {phLevel == null ? "—" : toBn(phLevel.toFixed(1))}
                  </span>
                  {phLevel != null && (
                    <button
                      type="button"
                      onClick={() => setPhLevel(null)}
                      className="text-[11px] font-bold text-gray-400 underline"
                    >
                      মুছুন
                    </button>
                  )}
                </div>
                <input
                  type="range"
                  min={3.5}
                  max={9.5}
                  step={0.1}
                  value={phLevel ?? 6.5}
                  onChange={(e) => setPhLevel(parseFloat(e.target.value))}
                  className="mt-3 w-full accent-emerald-600"
                />
                <div className="mt-1 flex justify-between text-[10px] font-bold text-gray-400">
                  <span>অম্লীয় ৩.৫</span>
                  <span className="text-emerald-600">আদর্শ ৬–৭.৫</span>
                  <span>ক্ষারীয় ৯.৫</span>
                </div>
              </Card>

              {/* Nutrients */}
              <Card icon={FlaskConical} title="পুষ্টির মাত্রা (মাটি পরীক্ষার রিপোর্ট থাকলে)">
                <div className="space-y-4">
                  <NutrientSelect label="নাইট্রোজেন (N)" value={nitrogen} onChange={setNitrogen} />
                  <NutrientSelect label="ফসফরাস (P)" value={phosphorus} onChange={setPhosphorus} />
                  <NutrientSelect label="পটাশিয়াম (K)" value={potassium} onChange={setPotassium} />
                  <NutrientSelect label="জৈব উপাদান" value={organicMatter} onChange={setOrganicMatter} />
                  <NutrientSelect label="ক্যালশিয়াম (Ca)" value={calcium} onChange={setCalcium} />
                  <NutrientSelect label="ম্যাগনেসিয়াম (Mg)" value={magnesium} onChange={setMagnesium} />
                  <NutrientSelect label="গন্ধক (S)" value={sulfur} onChange={setSulfur} />
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest">
                      লবণাক্ততা EC (ডিএস/মিটার)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        inputMode="decimal"
                        value={ecValue == null ? "" : String(ecValue)}
                        onChange={(e) => {
                          const n = parseFloat(e.target.value.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d))));
                          setEcValue(Number.isFinite(n) && n >= 0 ? n : null);
                        }}
                        placeholder="যেমন: ১.২"
                        className="w-32 rounded-xl bg-gray-50 border border-gray-100 p-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                      <span className="text-[10px] text-gray-400 leading-snug">
                        ২-এর কম স্বাভাবিক · ২–৪ সামান্য · ৪–৮ মাঝারি · ৮+ তীব্র লবণাক্ত
                      </span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Cropping plan */}
              <Card icon={Sprout} title="চাষাবাদ পরিকল্পনা">
                <div className="space-y-4">
                  <CropSelect label="আগের ফসল" value={lastCrop} onChange={setLastCrop} />
                  <CropSelect label="পরিকল্পিত ফসল" value={plannedCrop} onChange={setPlannedCrop} />
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest">
                      সেচ ব্যবস্থা
                    </label>
                    <div className="flex gap-2">
                      {(["সেচ সুবিধা আছে", "বৃষ্টিনির্ভর"] as const).map((o) => (
                        <button
                          key={o}
                          type="button"
                          onClick={() => setIrrigation(o)}
                          className={cn(
                            "flex-1 rounded-xl border py-2.5 text-xs font-bold transition-all",
                            irrigation === o
                              ? "bg-emerald-600 border-emerald-600 text-white"
                              : "bg-gray-50 border-gray-100 text-gray-600",
                          )}
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>

              <div className="flex items-start gap-2 rounded-2xl bg-emerald-50 p-3 text-[11px] leading-relaxed text-emerald-800 border border-emerald-100">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                পুষ্টির মাত্রা জানা না থাকলেও চলবে — সেক্ষেত্রে BARI-এর সাধারণ সুপারিশ ধরে হিসাব হবে।
              </div>

              <BengaliButton
                type="submit"
                variant="primary"
                className="w-full py-4 text-base rounded-2xl shadow-lg shadow-emerald-200"
                disabled={loading}
              >
                বিশ্লেষণ শুরু করুন
              </BengaliButton>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}

function Card({
  icon: Icon,
  title,
  children,
}: {
  icon: any;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm border border-emerald-50">
      <h3 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-emerald-600" /> {title}
      </h3>
      {children}
    </section>
  );
}

function CropSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl bg-gray-50 border border-gray-100 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
      >
        <option value="">নির্বাচন করুন</option>
        {MASTER_CROP_LABELS.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </div>
  );
}

function LoadingView() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="relative h-24 w-24">
        <div className="absolute inset-0 rounded-full border-4 border-emerald-100 animate-pulse" />
        <div className="absolute inset-0 rounded-full border-t-4 border-emerald-600 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <FlaskConical className="h-10 w-10 text-emerald-600" />
        </div>
      </div>
      <h2 className="mt-6 text-xl font-black text-gray-900">মাটি বিশ্লেষণ করা হচ্ছে...</h2>
      <p className="mt-2 text-sm text-gray-500 max-w-xs">
        pH, পুষ্টির মাত্রা ও জমির মাপ মিলিয়ে সারের হিসাব তৈরি হচ্ছে।
      </p>
    </div>
  );
}

function NutrientSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest">
        {label}
      </label>
      <div className="flex gap-2">
        {NUTRIENT_LEVELS.map((n) => (
          <button
            key={n.value}
            type="button"
            onClick={() => onChange(n.value)}
            className={cn(
              "flex-1 rounded-xl py-2 text-xs font-bold border transition-all",
              value === n.value
                ? "bg-white border-emerald-500 text-emerald-700 shadow-sm"
                : "bg-gray-50 border-gray-100 text-gray-500",
            )}
          >
            {n.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ResultView({ result, onReset }: { result: SoilAnalysisResult; onReset: () => void }) {
  const colors = scoreColor(result.healthScore);
  const dash = 2 * Math.PI * 42;
  const [saving, setSaving] = useState(false);

  const buildReportText = () =>
    [
      `🌱 মৃত্তিকা বিশ্লেষণ রিপোর্ট`,
      `স্বাস্থ্য স্কোর: ${toBn(result.healthScore)}/১০০ (${result.scoreLabel})`,
      result.summary,
      ``,
      `জমি: ${result.areaLabel}`,
      `চুন: ${result.limeAdvice.amount}`,
      `লবণাক্ততা: ${result.salinity.label}${result.salinity.value != null ? ` (EC ${toBn(result.salinity.value)})` : ""}`,
      ``,
      `সারের পরিমাণ:`,
      ...result.computedDoses.map((d) => `- ${d.name}: ${d.amount} (${d.note})`),
      ``,
      `ক্যালশিয়াম/ম্যাগনেসিয়াম:`,
      ...result.secondaryNutrients.map((s) => `- ${s.name} (${s.status}): ${s.dose}`),
      ...(result.salinity.actions.length
        ? [``, `লবণাক্ততা ব্যবস্থাপনা:`, ...result.salinity.actions.map((a) => `- ${a}`)]
        : []),
      ``,
      `উপযুক্ত ফসল: ${result.suitableCrops.join(", ")}`,
      ``,
      `— কৃষক বন্ধু অ্যাপ`,
    ].join("\n");

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(buildReportText());
      toast.success("রিপোর্ট কপি হয়েছে");
    } catch {
      toast.error("কপি করা যায়নি");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id;
      if (!uid) {
        toast.error("সংরক্ষণ করতে লগইন করুন");
        return;
      }
      const { error } = await supabase.from("soil_reports").insert({
        user_id: uid,
        health_score: result.healthScore,
        area_label: result.areaLabel,
        result_json: JSON.parse(JSON.stringify(result)),
      });
      if (error) throw error;
      toast.success("রিপোর্ট সংরক্ষণ হয়েছে");
    } catch {
      toast.error("সংরক্ষণ করা যায়নি");
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    const text = buildReportText();
    if (navigator.share) {
      try {
        await navigator.share({ title: "মৃত্তিকা বিশ্লেষণ রিপোর্ট", text });
        return;
      } catch {
        /* user cancelled */
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handlePrint = () => window.print();

  return (
    <div className="space-y-5 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Score */}
      <div className="rounded-3xl bg-white p-6 shadow-sm border border-emerald-50 text-center">
        <div className="relative mx-auto h-28 w-28">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle cx="50" cy="50" r="42" strokeWidth="10" className="stroke-gray-100" fill="none" />
            <circle
              cx="50"
              cy="50"
              r="42"
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
              className={cn("stroke-current transition-all duration-1000", colors.ring)}
              strokeDasharray={dash}
              strokeDashoffset={dash * (1 - result.healthScore / 100)}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-gray-900">{toBn(result.healthScore)}</span>
            <span className="text-[10px] font-bold text-gray-400">/ ১০০</span>
          </div>
        </div>
        <div
          className={cn(
            "mt-3 inline-block rounded-full px-3 py-1 text-xs font-black text-gray-800",
            colors.soft,
          )}
        >
          মাটির অবস্থা: {result.scoreLabel}
        </div>
        <p className="mt-3 text-sm text-gray-600 leading-relaxed">{result.summary}</p>
      </div>

      {/* pH + lime */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl bg-white p-5 shadow-sm border border-emerald-50">
          <h3 className="text-sm font-black text-gray-900 mb-2 flex items-center gap-2">
            <Thermometer className="h-4 w-4 text-emerald-600" /> pH অবস্থা
          </h3>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-gray-900">
              {result.phStatus.value == null ? "—" : toBn(result.phStatus.value.toFixed(1))}
            </span>
            <span className="text-xs font-bold text-emerald-700">{result.phStatus.label}</span>
          </div>
          <p className="mt-2 text-xs text-gray-500 leading-relaxed">{result.phStatus.advice}</p>
        </div>
        <div
          className={cn(
            "rounded-3xl p-5 shadow-sm border",
            result.limeAdvice.needed
              ? "bg-amber-50 border-amber-100"
              : "bg-white border-emerald-50",
          )}
        >
          <h3 className="text-sm font-black text-gray-900 mb-2 flex items-center gap-2">
            <Mountain className="h-4 w-4 text-emerald-600" /> চুন প্রয়োগ
          </h3>
          <div className="text-lg font-black text-gray-900">{result.limeAdvice.amount}</div>
          <p className="mt-2 text-xs text-gray-500 leading-relaxed">{result.limeAdvice.note}</p>
        </div>
      </div>

      {/* Nutrient status */}
      <div className="rounded-3xl bg-white p-5 shadow-sm border border-emerald-50">
        <h3 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-emerald-600" /> পুষ্টির অবস্থা
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <StatusItem label="নাইট্রোজেন" value={result.nutrientStatus.nitrogen} icon={Droplets} />
          <StatusItem label="ফসফরাস" value={result.nutrientStatus.phosphorus} icon={Activity} />
          <StatusItem label="পটাশিয়াম" value={result.nutrientStatus.potassium} icon={Activity} />
          <StatusItem label="জৈব উপাদান" value={result.nutrientStatus.organicMatter} icon={Leaf} />
        </div>
      </div>

      {/* Calcium / Magnesium / Sulfur */}
      {result.secondaryNutrients.length > 0 && (
        <div className="rounded-3xl bg-white p-5 shadow-sm border border-emerald-50">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
              <Mountain className="h-4 w-4 text-emerald-600" /> ক্যালশিয়াম ও ম্যাগনেসিয়াম
            </h3>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
              {result.areaLabel}
            </span>
          </div>
          <div className="space-y-3">
            {result.secondaryNutrients.map((s) => (
              <div key={s.name} className="rounded-2xl bg-gray-50 p-3 border border-gray-100">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-black text-gray-900">{s.name}</span>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-gray-500 border border-gray-100">
                    {s.status}
                  </span>
                </div>
                <div className="mt-2 inline-block rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-black text-white">
                  {s.dose}
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-gray-500">{s.note}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Salinity */}
      <div
        className={cn(
          "rounded-3xl p-5 shadow-sm border",
          result.salinity.severity === "high"
            ? "bg-red-50 border-red-100"
            : result.salinity.severity === "moderate"
              ? "bg-amber-50 border-amber-100"
              : "bg-white border-emerald-50",
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
            <Droplets className="h-4 w-4 text-emerald-600" /> লবণাক্ততা (EC)
          </h3>
          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-gray-700 border border-gray-100">
            {result.salinity.value != null ? `EC ${toBn(result.salinity.value)} dS/m · ` : ""}
            {result.salinity.label}
          </span>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-gray-600">{result.salinity.advice}</p>
        {result.salinity.actions.length > 0 && (
          <ul className="mt-3 space-y-2">
            {result.salinity.actions.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-700 leading-relaxed">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                {a}
              </li>
            ))}
          </ul>
        )}
        {result.salinity.tolerantCrops.length > 0 && (
          <div className="mt-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              লবণসহিষ্ণু ফসল/জাত
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {result.salinity.tolerantCrops.map((c) => (
                <span key={c} className="rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-gray-700 border border-gray-100">
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>



      {/* Dose table */}
      <div className="rounded-3xl bg-white p-5 shadow-sm border border-emerald-50">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-emerald-600" /> সারের পরিমাণ
          </h3>
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
            {result.areaLabel}
          </span>
        </div>
        <div className="divide-y divide-gray-100">
          {result.computedDoses.map((d) => (
            <div key={d.name} className="flex items-start justify-between gap-3 py-3">
              <div>
                <div className="text-sm font-bold text-gray-900">{d.name}</div>
                <div className="text-[11px] text-gray-500 mt-0.5">{d.note}</div>
              </div>
              <div className="shrink-0 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-black text-white">
                {d.amount}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Organic & management */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ListCard icon={Leaf} title="জৈব ব্যবস্থাপনা" items={result.recommendations.organicAmendments} />
        <ListCard icon={ClipboardList} title="চাষাবাদ পরামর্শ" items={result.recommendations.soilManagement} />
      </div>

      {result.suitableCrops.length > 0 && (
        <div className="rounded-3xl bg-emerald-900 p-5 text-white shadow-lg">
          <h3 className="text-sm font-black mb-4 flex items-center gap-2">
            <Sprout className="h-4 w-4 text-emerald-400" /> উপযুক্ত ফসল
          </h3>
          <div className="flex flex-wrap gap-2">
            {result.suitableCrops.map((crop) => (
              <span
                key={crop}
                className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold ring-1 ring-white/20"
              >
                {crop}
              </span>
            ))}
          </div>
        </div>
      )}

      {result.warnings.length > 0 && (
        <div className="rounded-3xl bg-amber-50 p-5 border border-amber-100">
          <h3 className="text-sm font-black text-amber-900 mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> গুরুত্বপূর্ণ সতর্কতা
          </h3>
          <ul className="space-y-2">
            {result.warnings.map((w, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-amber-800">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2.5 print:hidden">
        <BengaliButton
          variant="primary"
          className="py-3.5 text-sm rounded-2xl"
          onClick={handleSave}
          disabled={saving}
        >
          <Save className="mr-1.5 inline h-4 w-4" /> {saving ? "সংরক্ষণ..." : "সংরক্ষণ"}
        </BengaliButton>
        <BengaliButton
          variant="outline"
          className="py-3.5 text-sm rounded-2xl border-emerald-200 text-emerald-700"
          onClick={handleShare}
        >
          <Share2 className="mr-1.5 inline h-4 w-4" /> শেয়ার
        </BengaliButton>
        <BengaliButton
          variant="outline"
          className="py-3.5 text-sm rounded-2xl border-emerald-200 text-emerald-700"
          onClick={handlePrint}
        >
          <Printer className="mr-1.5 inline h-4 w-4" /> প্রিন্ট
        </BengaliButton>
      </div>
      <div className="flex gap-3 print:hidden">
        <BengaliButton
          variant="outline"
          className="flex-1 py-4 text-sm rounded-2xl border-emerald-200 text-emerald-700"
          onClick={copyReport}
        >
          <Copy className="mr-2 inline h-4 w-4" /> রিপোর্ট কপি
        </BengaliButton>
        <BengaliButton
          variant="primary"
          className="flex-1 py-4 text-sm rounded-2xl"
          onClick={onReset}
        >
          <RefreshCw className="mr-2 inline h-4 w-4" /> নতুন বিশ্লেষণ
        </BengaliButton>
      </div>
      <Link
        to="/ai-bondhu/calculator"
        className="flex items-center justify-center gap-2 rounded-2xl border-2 border-emerald-600 bg-emerald-50 py-3.5 text-sm font-bold text-emerald-800 transition active:bg-emerald-100 print:hidden"
      >
        <Calculator className="h-4 w-4" /> সার ক্যালকুলেটরে ফসলভিত্তিক হিসাব করুন
      </Link>
    </div>
  );
}

function ListCard({ icon: Icon, title, items }: { icon: any; title: string; items: string[] }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm border border-emerald-50">
      <h3 className="text-sm font-black text-gray-900 mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-emerald-600" /> {title}
      </h3>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-gray-600 leading-relaxed">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusItem({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="rounded-2xl bg-gray-50 p-3 border border-gray-100">
      <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="text-xs font-bold text-gray-800 leading-snug">{value}</div>
    </div>
  );
}
