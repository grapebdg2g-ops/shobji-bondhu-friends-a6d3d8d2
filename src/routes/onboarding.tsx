import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Camera, Check, ChevronRight, ImagePlus, Loader2, MapPin, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/user-context";
import { optimizeImage } from "@/lib/image-optimizer";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
  head: () => ({
    meta: [
      { title: "প্রোফাইল সম্পূর্ণ করুন — কৃষক বন্ধু" },
      { name: "description", content: "ছবি, কাভার, ঠিকানা যোগ করুন এবং একই ফসলের কৃষকদের সাথে যুক্ত হোন।" },
      { property: "og:title", content: "প্রোফাইল সম্পূর্ণ করুন — কৃষক বন্ধু" },
      { property: "og:description", content: "ছবি, কাভার, ঠিকানা যোগ করুন এবং একই ফসলের কৃষকদের সাথে যুক্ত হোন।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Suggestion = {
  id: string; name: string; district: string | null; upazila: string | null;
  avatar_url: string | null; common_crops: string[]; is_verified: boolean;
};

const STEPS = ["ছবি", "ঠিকানা", "বন্ধু"] as const;

function initials(n: string) {
  return n.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("") || "?";
}

function OnboardingPage() {
  const navigate = useNavigate();
  const { user, loading } = useUser();
  const [step, setStep] = useState(0);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [cover, setCover] = useState<string | null>(null);
  const [uploading, setUploading] = useState<"avatar" | "cover" | null>(null);
  const [addr, setAddr] = useState({ address_line: "", village: "", post_office: "", postcode: "", courier_phone: "" });
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingSug, setLoadingSug] = useState(false);
  const [sent, setSent] = useState<Set<string>>(new Set());
  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/login" }); return; }
    supabase.from("profiles").select("avatar_url, cover_url").eq("id", user.id).maybeSingle()
      .then(({ data }) => { if (data) { setAvatar(data.avatar_url); setCover(data.cover_url); } });
    supabase.from("profile_details").select("*").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data) setAddr({
          address_line: data.address_line ?? "", village: data.village ?? "",
          post_office: data.post_office ?? "", postcode: data.postcode ?? "",
          courier_phone: data.courier_phone ?? "",
        });
      });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (step !== 2 || !user) return;
    setLoadingSug(true);
    supabase.rpc("suggest_farmers_by_crops", { _limit: 20 }).then(({ data, error }) => {
      setLoadingSug(false);
      if (error) return toast.error("সাজেশন লোড করা যায়নি");
      setSuggestions((data ?? []) as Suggestion[]);
    });
  }, [step, user]);

  const upload = async (file: File | undefined, kind: "avatar" | "cover") => {
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) return toast.error("শুধু ছবি আপলোড করা যাবে");
    setUploading(kind);
    try {
      const compressed = await optimizeImage(file, kind === "avatar" ? "profile" : "cover");
      const path = `${user.id}/${kind}-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, compressed, { contentType: compressed.type, upsert: true });
      if (upErr) throw upErr;
      const url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
      const patch = kind === "avatar" ? { avatar_url: url } : { cover_url: url };
      const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
      if (error) throw error;
      kind === "avatar" ? setAvatar(url) : setCover(url);
      toast.success(kind === "avatar" ? "প্রোফাইল ছবি যোগ হয়েছে" : "কাভার ছবি যোগ হয়েছে");
    } catch {
      toast.error("ছবি আপলোড করা যায়নি");
    } finally {
      setUploading(null);
    }
  };

  const saveDetails = async (complete: boolean) => {
    if (!user) return false;
    const { error } = await supabase.from("profile_details").upsert({
      user_id: user.id,
      ...Object.fromEntries(Object.entries(addr).map(([k, v]) => [k, v.trim() || null])),
      ...(complete ? { onboarding_completed_at: new Date().toISOString() } : {}),
      updated_at: new Date().toISOString(),
    });
    if (error) { toast.error("তথ্য সংরক্ষণ করা যায়নি"); return false; }
    return true;
  };

  const nextFromAddress = async () => {
    setSaving(true);
    const ok = await saveDetails(false);
    setSaving(false);
    if (ok) setStep(2);
  };

  const finish = async () => {
    setSaving(true);
    const ok = await saveDetails(true);
    setSaving(false);
    if (ok) { toast.success("প্রোফাইল সম্পূর্ণ হয়েছে!"); navigate({ to: "/dashboard", replace: true }); }
  };

  const addFriend = async (id: string) => {
    const { error } = await supabase.rpc("request_connection", { target_user_id: id });
    if (error) return toast.error("অনুরোধ পাঠানো যায়নি");
    setSent((s) => new Set(s).add(id));
  };

  if (loading || !user) {
    return <main className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></main>;
  }

  return (
    <main className="min-h-screen bg-muted/40 pb-28">
      <div className="mx-auto max-w-lg">
        <header className="bg-card px-5 pt-6 pb-4 shadow-sm">
          <h1 className="text-xl font-bold text-foreground">প্রোফাইল সম্পূর্ণ করুন</h1>
          <p className="text-sm text-muted-foreground">স্বাগতম, {user.name}! কয়েকটি ধাপে আপনার প্রোফাইল সাজিয়ে নিন।</p>
          <div className="mt-4 flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s} className="flex flex-1 flex-col gap-1">
                <div className={`h-1.5 rounded-full ${i <= step ? "bg-primary" : "bg-border"}`} />
                <span className={`text-xs font-semibold ${i === step ? "text-primary" : "text-muted-foreground"}`}>{i + 1}. {s}</span>
              </div>
            ))}
          </div>
        </header>

        {step === 0 && (
          <section className="mt-3 bg-card shadow-sm">
            <div className="relative">
              <button type="button" onClick={() => coverRef.current?.click()}
                className="relative flex h-44 w-full items-center justify-center overflow-hidden bg-primary/10 text-primary" aria-label="কাভার ছবি যোগ করুন">
                {cover ? <img src={cover} alt="" className="h-full w-full object-cover" /> : (
                  <span className="flex flex-col items-center gap-1 text-sm font-semibold"><ImagePlus className="h-7 w-7" />কাভার ছবি যোগ করুন</span>
                )}
                {uploading === "cover" && <span className="absolute inset-0 flex items-center justify-center bg-background/60"><Loader2 className="h-6 w-6 animate-spin" /></span>}
              </button>
              <div className="absolute -bottom-14 left-1/2 -translate-x-1/2">
                <button type="button" onClick={() => avatarRef.current?.click()}
                  className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-card bg-primary text-3xl font-bold text-primary-foreground shadow-lg" aria-label="প্রোফাইল ছবি যোগ করুন">
                  {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : initials(user.name)}
                  {uploading === "avatar" && <span className="absolute inset-0 flex items-center justify-center bg-background/60"><Loader2 className="h-6 w-6 animate-spin text-foreground" /></span>}
                </button>
                <span className="pointer-events-none absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-card bg-muted text-foreground"><Camera className="h-4 w-4" /></span>
              </div>
            </div>
            <div className="px-5 pt-16 pb-6 text-center">
              <p className="text-lg font-bold text-foreground">{user.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">ছবি দিলে অন্য কৃষকরা আপনাকে সহজে চিনতে পারবে।</p>
            </div>
            <input ref={avatarRef} type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0], "avatar")} />
            <input ref={coverRef} type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0], "cover")} />
          </section>
        )}

        {step === 1 && (
          <section className="mt-3 space-y-4 bg-card px-5 py-6 shadow-sm">
            <div className="flex items-center gap-2 text-foreground"><MapPin className="h-5 w-5 text-primary" /><h2 className="text-lg font-bold">কুরিয়ার ঠিকানা</h2></div>
            <p className="text-sm text-muted-foreground">এই ঠিকানা শুধু আপনি দেখতে পাবেন — পণ্য পাঠানো/গ্রহণের জন্য।</p>
            <p className="rounded-lg bg-muted px-3 py-2 text-sm text-foreground">জেলা: <b>{user.district}</b> · উপজেলা: <b>{user.upazila}</b></p>
            {([
              ["address_line", "বাড়ি / রাস্তা", "যেমন: বাড়ি ১২, মসজিদ রোড"],
              ["village", "গ্রাম / মহল্লা", "গ্রামের নাম"],
              ["post_office", "ডাকঘর", "ডাকঘরের নাম"],
              ["postcode", "পোস্ট কোড", "যেমন: ৫৮০০"],
              ["courier_phone", "কুরিয়ারের জন্য মোবাইল", "01XXXXXXXXX"],
            ] as const).map(([k, label, ph]) => (
              <div key={k}>
                <Label htmlFor={k} className="text-base">{label}</Label>
                <Input id={k} value={addr[k]} maxLength={200} placeholder={ph}
                  inputMode={k === "postcode" || k === "courier_phone" ? "tel" : undefined}
                  onChange={(e) => setAddr((a) => ({ ...a, [k]: e.target.value }))} className="mt-1 h-12 text-base" />
              </div>
            ))}
          </section>
        )}

        {step === 2 && (
          <section className="mt-3 bg-card px-4 py-5 shadow-sm">
            <div className="flex items-center gap-2 px-1 text-foreground"><Users className="h-5 w-5 text-primary" /><h2 className="text-lg font-bold">আপনার মতো কৃষকরা</h2></div>
            <p className="px-1 text-sm text-muted-foreground">আপনার পছন্দের ফসল ({user.crops.join(", ")}) যারা চাষ করেন।</p>
            {loadingSug ? (
              <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : suggestions.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">এখনো মিল আছে এমন কৃষক পাওয়া যায়নি।</p>
            ) : (
              <ul className="mt-4 grid grid-cols-2 gap-3">
                {suggestions.map((s) => {
                  const done = sent.has(s.id);
                  return (
                    <li key={s.id} className="overflow-hidden rounded-xl border border-border bg-card">
                      <div className="flex aspect-square items-center justify-center bg-primary/10 text-3xl font-bold text-primary">
                        {s.avatar_url ? <img src={s.avatar_url} alt={s.name} loading="lazy" className="h-full w-full object-cover" /> : initials(s.name)}
                      </div>
                      <div className="space-y-1 p-2.5">
                        <p className="truncate text-sm font-bold text-foreground">{s.name}{s.is_verified && " ✓"}</p>
                        <p className="truncate text-xs text-muted-foreground">{[s.upazila, s.district].filter(Boolean).join(", ")}</p>
                        <p className="line-clamp-1 text-xs text-primary">🌱 {s.common_crops.join(", ")}</p>
                        <Button size="sm" variant={done ? "secondary" : "default"} disabled={done} onClick={() => addFriend(s.id)} className="mt-1 w-full gap-1">
                          {done ? <><Check className="h-4 w-4" />পাঠানো হয়েছে</> : <><UserPlus className="h-4 w-4" />বন্ধু যোগ</>}
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}
      </div>

      <footer className="fixed inset-x-0 bottom-0 border-t border-border bg-card px-5 py-3">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <Button variant="ghost" className="h-12" disabled={saving}
            onClick={() => (step < 2 ? setStep(step + 1) : finish())}>
            এড়িয়ে যান
          </Button>
          <Button className="h-12 flex-1 gap-1 text-base font-bold" disabled={saving || uploading !== null}
            onClick={() => (step === 0 ? setStep(1) : step === 1 ? nextFromAddress() : finish())}>
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : step === 2 ? "শেষ করুন" : <>পরবর্তী <ChevronRight className="h-5 w-5" /></>}
          </Button>
        </div>
      </footer>
    </main>
  );
}
