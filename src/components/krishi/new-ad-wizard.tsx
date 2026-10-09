import { useReducer, useRef, useState, type ReactNode } from "react";
import { Camera, Sprout, Leaf, Wrench, HardHat, X as XIcon, ArrowLeft, CheckCircle2 } from "lucide-react";
import imageCompression from "browser-image-compression";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { BottomSheet } from "@/components/krishi/bottom-sheet";
import { BengaliButton } from "@/components/krishi/bengali-button";
import { supabase } from "@/integrations/supabase/client";
import { DISTRICTS, getUpazilas } from "@/lib/bd-data";
import type { Exchange, ExchangeType } from "@/hooks/use-exchanges";
import { sanitize, sanitizeOptional } from "@/lib/sanitize";

type State = {
  step: 1 | 2 | 3 | 4; // 4 = success
  type: ExchangeType | null;
  title: string;
  description: string;
  isFree: boolean;
  price: string;
  unit: string;
  imageFile: File | null;
  imagePreview: string | null;
  imageUrl: string | null;
  district: string;
  upazila: string;
  phone: string;
};

type Action =
  | { type: "set"; patch: Partial<State> }
  | { type: "next" }
  | { type: "prev" }
  | { type: "goto"; step: State["step"] }
  | { type: "reset"; defaults: Partial<State> };

const initial = (defaults: Partial<State>): State => ({
  step: 1,
  type: null,
  title: "",
  description: "",
  isFree: false,
  price: "",
  unit: "কেজি",
  imageFile: null,
  imagePreview: null,
  imageUrl: null,
  district: defaults.district ?? "ঢাকা",
  upazila: defaults.upazila ?? "",
  phone: defaults.phone ?? "",
});

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "set": return { ...s, ...a.patch };
    case "next": return { ...s, step: Math.min(4, s.step + 1) as State["step"] };
    case "prev": return { ...s, step: Math.max(1, s.step - 1) as State["step"] };
    case "goto": return { ...s, step: a.step };
    case "reset": return initial(a.defaults);
  }
}

const CATEGORIES: { type: ExchangeType; label: string; icon: typeof Sprout }[] = [
  { type: "seed", label: "বীজ", icon: Sprout },
  { type: "sapling", label: "চারা", icon: Leaf },
  { type: "tool", label: "যন্ত্র", icon: Wrench },
  { type: "labor", label: "শ্রমিক", icon: HardHat },
];

const TYPE_LABELS: Record<ExchangeType, string> = {
  seed: "বীজ", sapling: "চারা", tool: "যন্ত্র", labor: "শ্রমিক",
};

export function NewAdWizard({
  open, onClose, defaultDistrict, defaultUpazila, userId, userName, userPhone,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  defaultDistrict: string;
  defaultUpazila: string | null;
  userId: string | null;
  userName: string;
  userPhone: string | null;
  onCreated: (item: Exchange) => void;
}) {
  const [state, dispatch] = useReducer(
    reducer,
    initial({ district: defaultDistrict, upazila: defaultUpazila ?? "", phone: userPhone ?? "" }),
  );
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    onClose();
    // reset only on successful close (step 4) or explicit close
    if (state.step === 4) {
      dispatch({ type: "reset", defaults: { district: defaultDistrict, upazila: defaultUpazila ?? "", phone: userPhone ?? "" } });
    }
  };

  const pickImage = async (file: File) => {
    if (file.size > 2 * 1024 * 1024 * 4) { // accept up to 8MB raw, compress
      toast.error("ছবি খুব বড়, ছোট ছবি দিন");
      return;
    }
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 2,
        maxWidthOrHeight: 800,
        useWebWorker: true,
      });
      const preview = URL.createObjectURL(compressed);
      dispatch({ type: "set", patch: { imageFile: compressed as File, imagePreview: preview } });
    } catch {
      toast.error("ছবি প্রক্রিয়া করা যায়নি");
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!state.imageFile || !userId) return null;
    setUploadProgress(10);
    const mime = state.imageFile.type || "image/jpeg";
    const ext = (mime.split("/")[1] || "jpg").replace("jpeg", "jpg").replace(/[^a-z0-9]/gi, "") || "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    setUploadProgress(40);
    const { error } = await supabase.storage
      .from("exchange-images")
      .upload(path, state.imageFile, { upsert: false, contentType: mime });
    if (error) { setUploadProgress(0); return null; }
    setUploadProgress(80);
    const { data } = supabase.storage.from("exchange-images").getPublicUrl(path);
    setUploadProgress(100);
    return data.publicUrl;
  };

  const validateStep = (step: State["step"]): string | null => {
    if (step === 1) {
      if (!state.type) return "ধরন বাছাই করুন";
      if (!state.title.trim()) return "শিরোনাম দিন";
    }
    if (step === 2) {
      if (!state.isFree && (!state.price || Number(state.price) <= 0)) return "মূল্য দিন";
    }
    if (step === 3) {
      if (!state.district) return "জেলা দিন";
      if (!/^01\d{9}$/.test(state.phone)) return "১১ অঙ্কের ফোন নম্বর দিন";
    }
    return null;
  };

  const goNext = () => {
    const err = validateStep(state.step);
    if (err) { toast.error(err); return; }
    dispatch({ type: "next" });
  };

  const submit = async () => {
    if (!userId) { toast.error("লগইন করুন"); return; }
    const err = validateStep(3);
    if (err) { toast.error(err); return; }
    setSubmitting(true);
    let imageUrl = state.imageUrl;
    if (state.imageFile && !imageUrl) {
      imageUrl = await uploadImage();
      if (state.imageFile && !imageUrl) {
        setSubmitting(false);
        toast.error("ছবি আপলোড ব্যর্থ, আবার চেষ্টা করুন");
        return;
      }
    }
    const { data, error } = await supabase.from("exchanges").insert({
      title: sanitize(state.title),
      description: sanitizeOptional(state.description),
      type: state.type!,
      is_free: state.isFree,
      price: state.isFree ? null : Number(state.price),
      unit: state.isFree ? null : state.unit,
      image_url: imageUrl,
      district: state.district,
      upazila: sanitizeOptional(state.upazila),
      user_id: userId,
      user_name: sanitize(userName),
      user_phone: state.phone,
    }).select("id,created_at,title,description,type,is_free,price,unit,image_url,district,upazila,user_id,user_name,is_active").single();
    setSubmitting(false);
    if (error || !data) {
      toast.error("সংরক্ষণ ব্যর্থ হয়েছে, আবার চেষ্টা করুন");
      return;
    }
    onCreated(data as Exchange);
    dispatch({ type: "goto", step: 4 });
    try {
      confetti({ particleCount: 120, spread: 75, origin: { y: 0.6 } });
    } catch { /* no-op */ }
  };

  return (
    <BottomSheet open={open} onClose={handleClose} title={state.step === 4 ? undefined : "নতুন বিজ্ঞাপন"}>
      {state.step !== 4 && (
        <div className="flex items-center justify-between mb-4 -mt-2">
          <button
            type="button"
            onClick={() => state.step > 1 ? dispatch({ type: "prev" }) : handleClose()}
            className="h-9 w-9 rounded-full bg-muted flex items-center justify-center"
            aria-label="পেছনে"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <StepDots step={state.step} />
          <div className="h-9 w-9" />
        </div>
      )}

      {state.step === 1 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold">কী বিনিময় করতে চান?</h3>
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map(({ type, label, icon: Icon }) => {
              const active = state.type === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => dispatch({ type: "set", patch: { type } })}
                  className={`flex flex-col items-center justify-center gap-2 h-24 rounded-2xl border-2 transition-all ${active ? "border-primary bg-primary/10" : "border-border bg-card"}`}
                >
                  <Icon className={`h-8 w-8 ${active ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={`text-base font-bold ${active ? "text-primary" : "text-foreground"}`}>{label}</span>
                </button>
              );
            })}
          </div>
          {state.type && (
            <>
              <Field label={`শিরোনাম (${state.title.length}/60)`}>
                <input
                  value={state.title}
                  maxLength={60}
                  onChange={(e) => dispatch({ type: "set", patch: { title: e.target.value } })}
                  placeholder="যেমন: উফশী ধানের বীজ আছে"
                  className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm"
                />
              </Field>
              <Field label={`বিবরণ (${state.description.length}/300)`}>
                <textarea
                  value={state.description}
                  maxLength={300}
                  onChange={(e) => dispatch({ type: "set", patch: { description: e.target.value } })}
                  placeholder="পরিমাণ, মান, শর্ত সম্পর্কে লিখুন"
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm resize-none"
                />
              </Field>
            </>
          )}
          <BengaliButton fullWidth onClick={goNext} disabled={!state.type || !state.title.trim()}>পরবর্তী</BengaliButton>
        </div>
      )}

      {state.step === 2 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold">মূল্য ও ছবি</h3>
          <label className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <span className="text-sm font-medium">বিনামূল্যে দিচ্ছি</span>
            <input
              type="checkbox"
              checked={state.isFree}
              onChange={(e) => dispatch({ type: "set", patch: { isFree: e.target.checked } })}
              className="h-5 w-5"
            />
          </label>
          {!state.isFree && (
            <div className="grid grid-cols-2 gap-2">
              <Field label="মূল্য (৳)">
                <input
                  value={state.price}
                  onChange={(e) => dispatch({ type: "set", patch: { price: e.target.value } })}
                  type="number"
                  inputMode="decimal"
                  className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm"
                />
              </Field>
              <Field label="একক">
                <select
                  value={state.unit}
                  onChange={(e) => dispatch({ type: "set", patch: { unit: e.target.value } })}
                  className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm"
                >
                  {["কেজি", "মণ", "পিস", "দিন", "লিটার"].map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </Field>
            </div>
          )}
          <Field label="ছবি (ঐচ্ছিক)">
            {state.imagePreview ? (
              <div className="relative rounded-xl overflow-hidden border border-border">
                <img src={state.imagePreview} alt="preview" className="w-full h-48 object-cover" />
                <button
                  type="button"
                  onClick={() => dispatch({ type: "set", patch: { imageFile: null, imagePreview: null } })}
                  className="absolute top-2 right-2 h-9 w-9 rounded-full bg-black/60 flex items-center justify-center"
                  aria-label="ছবি সরান"
                >
                  <XIcon className="h-4 w-4 text-white" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full h-40 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground"
              >
                <Camera className="h-8 w-8" />
                <span className="text-sm font-medium">ছবি যোগ করুন</span>
                <span className="text-xs">সর্বোচ্চ ২ MB</span>
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) pickImage(f);
                e.target.value = "";
              }}
            />
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${uploadProgress}%` }} />
              </div>
            )}
          </Field>
          <BengaliButton fullWidth onClick={goNext}>পরবর্তী</BengaliButton>
        </div>
      )}

      {state.step === 3 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold">অবস্থান ও যোগাযোগ</h3>
          <Field label="জেলা">
            <select
              value={state.district}
              onChange={(e) => dispatch({ type: "set", patch: { district: e.target.value, upazila: "" } })}
              className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm"
            >
              {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="উপজেলা">
            <select
              value={state.upazila}
              disabled={!state.district}
              onChange={(e) => dispatch({ type: "set", patch: { upazila: e.target.value } })}
              className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm disabled:opacity-60"
            >
              <option value="">— উপজেলা বেছে নিন —</option>
              {getUpazilas(state.district).map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </Field>
          <Field label="ফোন নম্বর">
            <input
              value={state.phone}
              onChange={(e) => dispatch({ type: "set", patch: { phone: e.target.value.replace(/\D/g, "") } })}
              inputMode="tel"
              maxLength={11}
              placeholder="01XXXXXXXXX"
              className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">ক্রেতা এই নম্বরে WhatsApp করবে</p>
          </Field>

          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <div className="flex gap-3">
              {state.imagePreview && (
                <img src={state.imagePreview} alt="" className="h-16 w-16 rounded-lg object-cover" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{state.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  ধরন: {state.type ? TYPE_LABELS[state.type] : "—"} · মূল্য: {state.isFree ? "বিনামূল্যে" : `৳${state.price}/${state.unit}`}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">📍 {state.district}{state.upazila ? `, ${state.upazila}` : ""}</p>
              </div>
            </div>
          </div>

          <BengaliButton fullWidth loading={submitting} onClick={submit} className="bg-[#22A55F] hover:bg-[#1e9456]">
            বিজ্ঞাপন প্রকাশ করুন
          </BengaliButton>
        </div>
      )}

      {state.step === 4 && (
        <div className="py-6 text-center space-y-5">
          <div className="mx-auto h-20 w-20 rounded-full bg-[#22A55F]/15 flex items-center justify-center">
            <CheckCircle2 className="h-12 w-12 text-[#22A55F]" />
          </div>
          <div>
            <h3 className="text-xl font-bold">আপনার বিজ্ঞাপন প্রকাশিত হয়েছে!</h3>
            <p className="text-sm text-muted-foreground mt-1">কৃষকরা আপনার সাথে যোগাযোগ করতে পারবেন।</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <BengaliButton
              variant="outline"
              fullWidth
              onClick={() => dispatch({ type: "reset", defaults: { district: defaultDistrict, upazila: defaultUpazila ?? "", phone: userPhone ?? "" } })}
            >
              আরো দিন
            </BengaliButton>
            <BengaliButton fullWidth onClick={handleClose}>তালিকা দেখুন</BengaliButton>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}

function StepDots({ step }: { step: number }) {
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={`h-2 rounded-full transition-all ${i === step ? "w-6 bg-primary" : i < step ? "w-2 bg-primary/60" : "w-2 bg-muted"}`}
        />
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground mb-1 block">{label}</label>
      {children}
    </div>
  );
}
