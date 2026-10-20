import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useReducer, useRef, useState } from "react";
import {
  ArrowLeft,
  Camera,
  ImageIcon,
  ScanSearch,
  Leaf,
  RefreshCw,
  Save,
  Share2,
  ChevronDown,
  X,
  History,
} from "lucide-react";
import { toast } from "sonner";
import { BengaliButton } from "@/components/krishi/bengali-button";
import { cn } from "@/lib/utils";
import { analyzeDisease, type DiseaseResult } from "@/lib/disease.functions";
import { toBn } from "@/lib/bn";
import { supabase } from "@/integrations/supabase/client";
import { AI_CROP_LABELS } from "@/lib/crop-options";
import { optimizeImage, fileToBase64, fileToRawBase64 } from "@/lib/image-optimizer";

export const Route = createFileRoute("/disease-detection")({
  component: DiseaseDetectionPage,
  head: () => ({
    meta: [
      { title: "রোগ শনাক্ত — কৃষক বন্ধু" },
      { name: "description", content: "ফসলের ছবি তুলে AI দিয়ে রোগ শনাক্ত করুন।" },
    ],
  }),
});

const CROPS = AI_CROP_LABELS;

type Stage = "landing" | "preview" | "analyzing" | "result" | "error";

type State = {
  stage: Stage;
  crop: string | null;
  imageDataUrl: string | null;
  imageBase64: string | null;
  mimeType: string | null;
  result: DiseaseResult | null;
  errorMsg: string | null;
};

type Action =
  | { type: "SET_CROP"; crop: string }
  | { type: "SET_IMAGE"; dataUrl: string; base64: string; mime: string }
  | { type: "START_ANALYZE" }
  | { type: "SET_RESULT"; result: DiseaseResult }
  | { type: "SET_ERROR"; msg: string }
  | { type: "RESET" }
  | { type: "RETAKE" };

const initialState: State = {
  stage: "landing",
  crop: null,
  imageDataUrl: null,
  imageBase64: null,
  mimeType: null,
  result: null,
  errorMsg: null,
};

function reducer(state: State, a: Action): State {
  switch (a.type) {
    case "SET_CROP":
      return { ...state, crop: a.crop };
    case "SET_IMAGE":
      return {
        ...state,
        stage: "preview",
        imageDataUrl: a.dataUrl,
        imageBase64: a.base64,
        mimeType: a.mime,
      };
    case "START_ANALYZE":
      return { ...state, stage: "analyzing", errorMsg: null };
    case "SET_RESULT":
      if (!a.result.detected) {
        return {
          ...state,
          stage: "error",
          errorMsg: a.result.reason || "ছবিটি অস্পষ্ট, আবার চেষ্টা করুন",
        };
      }
      return { ...state, stage: "result", result: a.result };
    case "SET_ERROR":
      return { ...state, stage: "error", errorMsg: a.msg };
    case "RETAKE":
      return {
        ...state,
        stage: "landing",
        imageDataUrl: null,
        imageBase64: null,
        mimeType: null,
        result: null,
        errorMsg: null,
      };
    case "RESET":
      return initialState;
  }
}

function DiseaseDetectionPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, initialState);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const analyzeFn = useServerFn(analyzeDisease);

  const handleFile = async (file: File) => {
    if (!state.crop) {
      toast.error("আগে ফসল নির্বাচন করুন");
      return;
    }
    try {
      const compressed = await optimizeImage(file, "disease");
      const dataUrl = await fileToBase64(compressed);
      const base64 = await fileToRawBase64(compressed);
      dispatch({ type: "SET_IMAGE", dataUrl, base64, mime: compressed.type });
    } catch (e) {
      console.error(e);
      toast.error("ছবি প্রক্রিয়া করা যায়নি");
    }
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) void handleFile(f);
  };

  const analyze = async () => {
    if (!state.imageBase64 || !state.mimeType || !state.crop) return;
    dispatch({ type: "START_ANALYZE" });
    abortRef.current = new AbortController();
    try {
      const result = await analyzeFn({
        data: {
          imageBase64: state.imageBase64,
          mimeType: state.mimeType,
          crop: state.crop,
        },
        signal: abortRef.current.signal,
      });
      dispatch({ type: "SET_RESULT", result });
      // Save to disease_history (best-effort, fire-and-forget)
      if (result.detected) {
        const { data: sess } = await supabase.auth.getSession();
        const uid = sess.session?.user.id;
        if (uid) {
          supabase
            .from("disease_history")
            .insert({
              user_id: uid,
              crop_type: state.crop,
              disease_name: result.diseaseName,
              severity: result.severity,
              result_json: result as never,
            })
            .then(({ error }) => {
              if (error) console.error("history save failed:", error);
            });
        }
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        dispatch({ type: "RETAKE" });
        return;
      }
      console.error(e);
      const raw = (e as Error).message ?? "";
      const msg =
        raw && /[\u0980-\u09FF]/.test(raw) ? raw : "শনাক্ত করা সম্ভব হয়নি, আবার চেষ্টা করুন";
      dispatch({ type: "SET_ERROR", msg });
    }
  };

  const cancelAnalyze = () => {
    abortRef.current?.abort();
  };

  const saveResult = () => {
    if (!state.result || !state.imageDataUrl) return;
    try {
      const saved = JSON.parse(localStorage.getItem("disease_saves") || "[]");
      saved.unshift({
        ...state.result,
        crop: state.crop,
        savedAt: new Date().toISOString(),
      });
      localStorage.setItem("disease_saves", JSON.stringify(saved.slice(0, 50)));
      toast.success("সংরক্ষণ করা হয়েছে", {
        action: {
          label: "ইতিহাস দেখুন",
          onClick: () => navigate({ to: "/profile/disease-history" }),
        },
      });
    } catch {
      toast.error("সংরক্ষণ ব্যর্থ");
    }
  };

  const shareResult = async () => {
    if (!state.result) return;
    const r = state.result;
    const text = `🌱 ${r.diseaseName}\n\n${r.description}\n\nচিকিৎসা:\n${r.treatments
      .map((t, i) => `${i + 1}. ${t}`)
      .join("\n")}\n\n— কৃষক বন্ধু অ্যাপ`;
    try {
      if (navigator.share) {
        await navigator.share({ title: r.diseaseName, text });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success("কপি করা হয়েছে");
      }
    } catch {
      // user cancelled
    }
  };

  return (
    <main className="min-h-screen bg-background pb-10">
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b border-border">
        <div className="flex items-center gap-3 px-4 h-14">
          <button
            onClick={() =>
              router.history.length > 1 ? router.history.back() : navigate({ to: "/dashboard" })
            }
            className="h-10 w-10 -ml-2 rounded-full flex items-center justify-center active:bg-muted"
            aria-label="ফিরে যান"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground leading-tight">রোগ শনাক্ত</h1>
            <p className="text-xs text-muted-foreground">ফসলের ছবি তুলুন, রোগ জানুন</p>
          </div>
          <button
            onClick={() => navigate({ to: "/profile/disease-history" })}
            className="h-10 w-10 -mr-2 rounded-full flex items-center justify-center active:bg-muted"
            aria-label="রোগ শনাক্তের ইতিহাস"
          >
            <History className="h-5 w-5" />
          </button>
        </div>
      </header>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={onPick}
      />
      <input ref={galleryInputRef} type="file" accept="image/*" hidden onChange={onPick} />

      {state.stage === "landing" && (
        <LandingScreen
          crop={state.crop}
          onCrop={(c) => dispatch({ type: "SET_CROP", crop: c })}
          onCamera={() => cameraInputRef.current?.click()}
          onGallery={() => galleryInputRef.current?.click()}
        />
      )}

      {state.stage === "preview" && state.imageDataUrl && (
        <PreviewScreen
          imageUrl={state.imageDataUrl}
          crop={state.crop!}
          onRetake={() => dispatch({ type: "RETAKE" })}
          onAnalyze={analyze}
        />
      )}

      {state.stage === "analyzing" && state.imageDataUrl && (
        <AnalyzingScreen imageUrl={state.imageDataUrl} onCancel={cancelAnalyze} />
      )}

      {state.stage === "result" && state.result && state.imageDataUrl && (
        <ResultScreen
          result={state.result}
          imageUrl={state.imageDataUrl}
          onNew={() => dispatch({ type: "RETAKE" })}
          onSave={saveResult}
          onShare={shareResult}
        />
      )}

      {state.stage === "error" && (
        <ErrorScreen
          message={state.errorMsg || "আবার চেষ্টা করুন"}
          onRetry={() => dispatch({ type: "RETAKE" })}
        />
      )}
    </main>
  );
}

// ─── Landing ───────────────────────────────────────────

function LandingScreen({
  crop,
  onCrop,
  onCamera,
  onGallery,
}: {
  crop: string | null;
  onCrop: (c: string) => void;
  onCamera: () => void;
  onGallery: () => void;
}) {
  const guard = (fn: () => void) => () => {
    if (!crop) {
      toast.error("আগে ফসল নির্বাচন করুন");
      return;
    }
    fn();
  };
  return (
    <div className="px-5 pt-6 space-y-6">
      <div className="relative mx-auto h-56 w-56 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border-4 border-dashed border-primary/40 animate-pulse" />
        <div className="absolute inset-4 rounded-full bg-primary/5" />
        <div className="relative flex flex-col items-center">
          <div className="relative">
            <Leaf className="h-20 w-20 text-primary" strokeWidth={1.6} />
            <ScanSearch className="absolute -bottom-2 -right-2 h-9 w-9 text-[#E07A2C] bg-card rounded-full p-1.5 shadow" />
          </div>
        </div>
      </div>
      <p className="text-center text-sm font-medium text-muted-foreground">
        ছবি তুলুন বা গ্যালারি থেকে বেছে নিন
      </p>

      <div className="grid grid-cols-2 gap-3">
        <BengaliButton
          variant="primary"
          onClick={guard(onCamera)}
          leftIcon={<Camera className="h-5 w-5" />}
        >
          ক্যামেরা
        </BengaliButton>
        <BengaliButton
          variant="outline"
          onClick={guard(onGallery)}
          leftIcon={<ImageIcon className="h-5 w-5" />}
        >
          গ্যালারি
        </BengaliButton>
      </div>

      <div>
        <h2 className="text-base font-bold text-foreground mb-2">
          কোন ফসল? <span className="text-destructive">*</span>
        </h2>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-none">
          {CROPS.map((c) => (
            <button
              key={c}
              onClick={() => onCrop(c)}
              className={cn(
                "shrink-0 px-4 h-10 rounded-full border font-semibold text-sm transition active:scale-95",
                crop === c
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-primary/5 border border-primary/20 p-4">
        <p className="text-sm font-bold text-foreground mb-2">💡 ভালো ফলাফলের জন্য</p>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• রোগাক্রান্ত অংশের কাছে থেকে তুলুন</li>
          <li>• ভালো আলোতে তুলুন</li>
          <li>• ছবি স্পষ্ট রাখুন</li>
        </ul>
      </div>
    </div>
  );
}

// ─── Preview ───────────────────────────────────────────

function PreviewScreen({
  imageUrl,
  crop,
  onRetake,
  onAnalyze,
}: {
  imageUrl: string;
  crop: string;
  onRetake: () => void;
  onAnalyze: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="relative">
        <img src={imageUrl} alt="preview" className="w-full max-h-[60vh] object-contain bg-black" />
        <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow">
          {crop}
        </span>
      </div>
      <div className="px-5 grid grid-cols-2 gap-3">
        <BengaliButton
          variant="outline"
          onClick={onRetake}
          leftIcon={<RefreshCw className="h-5 w-5" />}
        >
          পুনরায় তুলুন
        </BengaliButton>
        <BengaliButton
          variant="primary"
          onClick={onAnalyze}
          leftIcon={<ScanSearch className="h-5 w-5" />}
        >
          বিশ্লেষণ করুন
        </BengaliButton>
      </div>
    </div>
  );
}

// ─── Analyzing ─────────────────────────────────────────

function AnalyzingScreen({ imageUrl, onCancel }: { imageUrl: string; onCancel: () => void }) {
  const [progress, setProgress] = useState(12);

  useEffect(() => {
    const timer = window.setInterval(() => setProgress((value) => Math.min(88, value + 7)), 700);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="px-5 pt-6 space-y-6 text-center">
      <button
        onClick={onCancel}
        className="mx-auto inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition active:scale-95"
      >
        <ArrowLeft className="h-4 w-4" />
        ফিরে যান
      </button>

      <div className="relative mx-auto max-w-sm overflow-hidden rounded-2xl">
        <img
          src={imageUrl}
          alt=""
          className="w-full max-h-[50vh] object-contain bg-black blur-[2px] brightness-75"
        />
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_20px_4px] shadow-primary animate-[scan_2s_ease-in-out_infinite]" />
        </div>
      </div>
      <div className="mx-auto w-full max-w-sm">
        <div className="flex items-center justify-between text-sm">
          <p className="text-lg font-bold text-foreground">বিশ্লেষণ করা হচ্ছে...</p>
          <span className="font-bold text-primary">{progress}%</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#2D6A4F] to-[#74C69D] transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-[11px] font-semibold">
          <span className="rounded-full bg-primary/10 px-2 py-1 text-primary">ছবি পড়া</span>
          <span
            className={`rounded-full px-2 py-1 ${progress > 35 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
          >
            রোগ খোঁজা
          </span>
          <span
            className={`rounded-full px-2 py-1 ${progress > 70 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
          >
            পরামর্শ তৈরি
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-3">সাধারণত ১০-১৫ সেকেন্ড লাগে</p>
      </div>
      <button
        onClick={onCancel}
        className="text-sm text-muted-foreground underline mx-auto inline-flex items-center gap-1"
      >
        <X className="h-4 w-4" /> বাতিল করুন
      </button>
      <style>{`@keyframes scan { 0% { top: 0%; } 50% { top: 100%; } 100% { top: 0%; } }`}</style>
    </div>
  );
}

// ─── Result ────────────────────────────────────────────

const SEVERITY = {
  low: { label: "কম", color: "bg-green-100 text-green-800 border-green-300", dot: "🟢" },
  medium: { label: "মাঝারি", color: "bg-yellow-100 text-yellow-800 border-yellow-300", dot: "🟡" },
  high: { label: "বেশি", color: "bg-red-100 text-red-800 border-red-300", dot: "🔴" },
} as const;

function ResultScreen({
  result,
  imageUrl,
  onNew,
  onSave,
  onShare,
}: {
  result: DiseaseResult;
  imageUrl: string;
  onNew: () => void;
  onSave: () => void;
  onShare: () => void;
}) {
  const sev = SEVERITY[result.severity];
  return (
    <div className="px-5 pt-4 space-y-4">
      <div className="rounded-2xl bg-card border border-border p-4 shadow-sm flex gap-3">
        <img
          src={imageUrl}
          alt=""
          className="h-20 w-20 rounded-xl object-cover bg-muted shrink-0"
        />
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-foreground leading-tight">{result.diseaseName}</h2>
          <span
            className={cn(
              "inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-full border text-xs font-bold",
              sev.color,
            )}
          >
            {sev.dot} তীব্রতা: {sev.label}
          </span>
          {typeof result.confidence === "number" && (
            <span className="inline-flex items-center gap-1 mt-2 ml-2 px-2.5 py-1 rounded-full border border-gray-200 bg-gray-50 text-xs text-gray-600">
              নিশ্চয়তা: {toBn(String(Math.round(result.confidence)))}%
            </span>
          )}
          <p className="mt-2 text-[11px] text-gray-500">
            AI সহায়ক বিশ্লেষণ — নিশ্চিত নির্ণয় নয়। রাসায়নিক ব্যবহারের আগে product label, PHI/PPE
            যাচাই করুন{result.severity === "high" ? " এবং উপজেলা কৃষি কর্মকর্তার পরামর্শ নিন" : ""}।
          </p>
        </div>
      </div>

      <Section icon="📋" title="রোগের বিবরণ" defaultOpen>
        <p className="text-sm text-foreground leading-relaxed">{result.description}</p>
      </Section>

      <Section icon="💊" title="চিকিৎসা পদ্ধতি" defaultOpen>
        <ol className="text-sm text-foreground space-y-2 list-decimal pl-5">
          {result.treatments.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ol>
      </Section>

      <Section icon="🛡️" title="প্রতিরোধ ব্যবস্থা">
        <ul className="text-sm text-foreground space-y-2">
          {result.prevention.map((p, i) => (
            <li key={i} className="flex gap-2">
              <span>•</span>
              {p}
            </li>
          ))}
        </ul>
      </Section>

      <Section icon="💰" title="আনুমানিক খরচ">
        {result.cost.length === 0 ? (
          <p className="text-sm text-muted-foreground">তথ্য নেই</p>
        ) : (
          <ul className="text-sm text-foreground divide-y divide-border">
            {result.cost.map((c, i) => (
              <li key={i} className="flex justify-between py-2">
                <span>{c.name}</span>
                <span className="font-bold">{c.price}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <div className="grid grid-cols-2 gap-3 pt-2">
        <BengaliButton
          variant="primary"
          onClick={onNew}
          leftIcon={<RefreshCw className="h-5 w-5" />}
        >
          নতুন ছবি
        </BengaliButton>
        <BengaliButton variant="outline" onClick={onSave} leftIcon={<Save className="h-5 w-5" />}>
          সংরক্ষণ
        </BengaliButton>
      </div>
      <BengaliButton
        variant="ghost"
        fullWidth
        onClick={onShare}
        leftIcon={<Share2 className="h-5 w-5" />}
      >
        শেয়ার করুন
      </BengaliButton>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
  defaultOpen = false,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 active:bg-muted"
      >
        <span className="font-bold text-foreground text-base flex items-center gap-2">
          <span>{icon}</span> {title}
        </span>
        <ChevronDown
          className={cn("h-5 w-5 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

// ─── Error ─────────────────────────────────────────────

function ErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="px-5 pt-10 text-center space-y-4">
      <div className="mx-auto h-32 w-32 rounded-full bg-muted flex items-center justify-center text-6xl">
        🥀
      </div>
      <h2 className="text-xl font-bold text-foreground">শনাক্ত করা সম্ভব হয়নি</h2>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto">{message}</p>
      <div className="pt-2 space-y-2">
        <BengaliButton
          variant="primary"
          fullWidth
          onClick={onRetry}
          leftIcon={<RefreshCw className="h-5 w-5" />}
        >
          আবার চেষ্টা করুন
        </BengaliButton>
        <button className="text-sm text-primary font-semibold underline">
          বিশেষজ্ঞের সাথে কথা বলুন
        </button>
      </div>
    </div>
  );
}

// ─── Utils ─────────────────────────────────────────────
// fileToBase64 is now imported from @/lib/image-optimizer
