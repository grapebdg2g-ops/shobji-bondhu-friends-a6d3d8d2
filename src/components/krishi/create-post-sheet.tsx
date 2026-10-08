import { useReducer, useRef, useState } from "react";
import { toast } from "sonner";
import { capturePricesFromContent } from "@/lib/price-from-text.functions";
import { optimizeImage } from "@/lib/image-optimizer";
import { Camera, X, FileText, HelpCircle, Star, CloudRain } from "lucide-react";
import { BottomSheet } from "@/components/krishi/bottom-sheet";
import { supabase } from "@/integrations/supabase/client";
import type { Post, PostType } from "@/hooks/use-feed";
import { useUser } from "@/contexts/user-context";
import { sanitize } from "@/lib/sanitize";
import { COMMUNITY_CROP_LABELS } from "@/lib/crop-options";

const CROPS = COMMUNITY_CROP_LABELS;

const TYPE_OPTIONS: { value: PostType; label: string; Icon: typeof FileText; color: string }[] = [
  { value: "general", label: "সাধারণ", Icon: FileText, color: "bg-slate-100 text-slate-700" },
  { value: "help", label: "সাহায্য চাই", Icon: HelpCircle, color: "bg-amber-100 text-amber-700" },
  { value: "success", label: "সাফল্য", Icon: Star, color: "bg-emerald-100 text-emerald-700" },
  { value: "weather", label: "সতর্কতা", Icon: CloudRain, color: "bg-sky-100 text-sky-700" },
];

type State = {
  step: 1 | 2;
  type: PostType | null;
  content: string;
  crop: string;
  imageFile: File | null;
  preview: string | null;
};

type Action =
  | { type: "set"; patch: Partial<State> }
  | { type: "reset" };

const initial: State = { step: 1, type: null, content: "", crop: "সব ফসল", imageFile: null, preview: null };
function reducer(s: State, a: Action): State {
  if (a.type === "reset") return initial;
  return { ...s, ...a.patch };
}

function reportPrices(kind: "post" | "comment", id: string) {
  void capturePricesFromContent({ data: { kind, id } })
    .then((r) => { if (r.added > 0) toast.success(`আপনার জানানো দাম বাজারদরে যোগ হয়েছে: ${(r.products ?? []).join(", ")}`); })
    .catch(() => {});
}

export function CreatePostSheet({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (p: Post) => void;
}) {
  const { user } = useUser();
  const [s, dispatch] = useReducer(reducer, initial);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const close = () => { dispatch({ type: "reset" }); onClose(); };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const compressed = await optimizeImage(f, "post");
      const preview = URL.createObjectURL(compressed);
      dispatch({ type: "set", patch: { imageFile: compressed, preview } });
    } catch {
      toast.error("ছবি প্রস্তুত করা যায়নি");
    }
  };

  const submit = async () => {
    if (!user) { toast.error("পোস্ট করতে লগইন করুন"); return; }
    if (!s.type) return;
    const text = sanitize(s.content);
    if (!text) { toast.error("কিছু লিখুন"); return; }
    if (text.length > 500) { toast.error("৫০০ অক্ষরের মধ্যে রাখুন"); return; }
    setSubmitting(true);

    let imageUrl: string | null = null;
    if (s.imageFile) {
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      const { error: upErr } = await supabase.storage.from("feed-images").upload(path, s.imageFile, { contentType: "image/jpeg" });
      if (upErr) {
        toast.error("ছবি আপলোড ব্যর্থ");
        setSubmitting(false);
        return;
      }
      const { data } = supabase.storage.from("feed-images").getPublicUrl(path);
      imageUrl = data.publicUrl;
    }

    const payload = {
      user_id: user.id,
      user_name: user.name || "কৃষক",
      user_district: user.district,
      type: s.type,
      content: text,
      image_url: imageUrl,
      crop_tag: s.crop === "সব ফসল" ? null : s.crop,
      district: user.district,
      upazila: user.upazila,
    };

    const { data, error } = await supabase.from("posts").insert(payload).select("*").single();
    if (error || !data) {
      toast.error("পোস্ট করা যায়নি");
      setSubmitting(false);
      return;
    }
    onCreated(data as Post);
    reportPrices("post", data.id);
    toast.success("পোস্ট প্রকাশিত");
    setSubmitting(false);
    close();
  };

  return (
    <BottomSheet open={open} onClose={close} title={s.step === 1 ? "পোস্টের ধরন" : "পোস্ট লিখুন"}>
      {s.step === 1 ? (
        <div className="grid grid-cols-2 gap-3">
          {TYPE_OPTIONS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => dispatch({ type: "set", patch: { type: t.value, step: 2 } })}
              className={`flex flex-col items-center gap-2 py-6 rounded-2xl ${t.color} active:scale-95 transition`}
            >
              <t.Icon className="h-7 w-7" />
              <span className="font-bold text-sm">{t.label}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative">
            <textarea
              value={s.content}
              onChange={(e) => dispatch({ type: "set", patch: { content: e.target.value.slice(0, 500) } })}
              placeholder="আপনার মনের কথা লিখুন..."
              rows={4}
              className="w-full p-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
            <span className="absolute bottom-2 right-3 text-[10px] text-muted-foreground">{s.content.length}/৫০০</span>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">ফসল ট্যাগ</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {CROPS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => dispatch({ type: "set", patch: { crop: c } })}
                  className={`shrink-0 px-3 h-8 rounded-full text-xs font-semibold border ${s.crop === c ? "bg-primary text-primary-foreground border-primary" : "bg-background text-foreground border-input"}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">ছবি (ঐচ্ছিক)</p>
            {s.preview ? (
              <div className="relative">
                <img src={s.preview} alt="" className="w-full rounded-xl aspect-[4/3] object-cover" />
                <button
                  type="button"
                  onClick={() => dispatch({ type: "set", patch: { imageFile: null, preview: null } })}
                  className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/60 text-white flex items-center justify-center"
                  aria-label="মুছুন"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full h-24 rounded-xl border-2 border-dashed border-input flex flex-col items-center justify-center gap-1 text-muted-foreground active:scale-[0.99]"
              >
                <Camera className="h-5 w-5" />
                <span className="text-xs">ছবি যোগ করুন</span>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>জেলা: <span className="font-semibold text-foreground">{user?.district ?? "—"}</span></span>
            <button type="button" onClick={() => dispatch({ type: "set", patch: { step: 1 } })} className="font-semibold">← আগে</button>
          </div>

          <button
            type="button"
            onClick={submit}
            disabled={submitting || !s.content.trim()}
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-50 active:scale-[0.99]"
          >
            {submitting ? "প্রকাশিত হচ্ছে..." : "পোস্ট করুন"}
          </button>
        </div>
      )}
    </BottomSheet>
  );
}
