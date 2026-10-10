import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/user-context";
import { CropFinanceSection } from "@/components/krishi/crop-finance-section";
import { CropIcon } from "@/components/krishi/crop-icon";
import { summarize, perUnit, type FinanceEntry } from "@/lib/crop-finance";
import { fmtBdt, toBn } from "@/lib/bn";

export const Route = createFileRoute("/crop-finance/$planId")({
  head: () => ({
    meta: [
      { title: "ফসলের পূর্ণ আয়-ব্যয় হিসাব — কৃষক বন্ধু" },
      { name: "description", content: "শতক ও কেজি প্রতি খরচ, লাভ, বাকি ও খাতভিত্তিক খরচের চার্ট।" },
      { property: "og:title", content: "ফসলের পূর্ণ আয়-ব্যয় হিসাব — কৃষক বন্ধু" },
      { property: "og:description", content: "শতক ও কেজি প্রতি খরচ, লাভ, বাকি ও খাতভিত্তিক খরচের চার্ট।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FinancePage,
  errorComponent: ({ error }) => <div className="p-6 text-center">ত্রুটি: {(error as Error).message}</div>,
  notFoundComponent: () => <div className="p-6 text-center">পরিকল্পনা পাওয়া যায়নি</div>,
});

type Plan = { id: string; crop_type: string; land_shotok: number | null; yield_kg: number | null };

function FinancePage() {
  const { planId } = Route.useParams();
  const { user, loading } = useUser();
  const navigate = useNavigate();
  const qc = useQueryClient();
  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [loading, user, navigate]);

  const { data: plan } = useQuery({
    queryKey: ["plan-meta", planId],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_crop_plans").select("id,crop_type,land_shotok,yield_kg").eq("id", planId).maybeSingle();
      if (error) throw error;
      return data as Plan | null;
    },
  });
  const { data: rows = [] } = useQuery({
    queryKey: ["crop-finances", planId],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("crop_plan_finances").select("*").eq("plan_id", planId).order("created_at");
      if (error) throw error;
      return (data ?? []) as FinanceEntry[];
    },
  });

  const [land, setLand] = useState("");
  const [yieldKg, setYieldKg] = useState("");
  useEffect(() => {
    if (plan) { setLand(plan.land_shotok ? String(plan.land_shotok) : ""); setYieldKg(plan.yield_kg ? String(plan.yield_kg) : ""); }
  }, [plan]);

  const s = useMemo(() => summarize(rows), [rows]);
  const byCategory = useMemo(() => {
    const m = new Map<string, number>();
    rows.filter((r) => r.entry_type === "expense" || r.entry_type === "credit_purchase").forEach((r) => {
      const k = r.title.replace(/\s*\(বাকি\)$/, "");
      m.set(k, (m.get(k) ?? 0) + Number(r.amount));
    });
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);
  const maxCat = byCategory[0]?.[1] ?? 1;

  async function saveMeta() {
    const l = Number(land) || null, y = Number(yieldKg) || null;
    const { error } = await supabase.from("user_crop_plans").update({ land_shotok: l, yield_kg: y }).eq("id", planId);
    if (error) return toast.error("সংরক্ষণ ব্যর্থ");
    qc.invalidateQueries({ queryKey: ["plan-meta", planId] });
    toast.success("সংরক্ষিত");
  }

  if (!user || !plan) return <div className="min-h-screen flex items-center justify-center text-gray-500">লোড হচ্ছে…</div>;

  const shotok = plan.land_shotok, kg = plan.yield_kg;
  const costPerShotok = perUnit(s.totalCost, shotok);
  const profitPerShotok = perUnit(s.profit, shotok);
  const costPerKg = perUnit(s.totalCost, kg);
  const costPerMon = costPerKg === null ? null : costPerKg * 40;

  return (
    <main className="min-h-screen bg-[#F0FFF4] pb-24 md:max-w-[560px] md:mx-auto">
      <header className="px-5 pt-8 pb-5 rounded-b-3xl text-white" style={{ background: "var(--gradient-brand)" }}>
        <Link to="/crop-guide/plan/$planId" params={{ planId }} aria-label="ফিরে যান" className="h-9 w-9 rounded-full bg-white/15 inline-flex items-center justify-center mb-3">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold inline-flex items-center gap-2"><CropIcon crop={plan.crop_type} /> {plan.crop_type} — পূর্ণ হিসাব</h1>
      </header>

      <section className="px-5 mt-5">
        <div className="bg-white rounded-2xl p-4 shadow-sm ring-1 ring-emerald-100 space-y-3">
          <p className="font-bold text-gray-900">জমি ও ফলন</p>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-gray-600">জমি (শতক)
              <input type="number" min={0} value={land} onChange={(e) => setLand(e.target.value)} placeholder="যেমন ৩৩" className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm" />
            </label>
            <label className="text-xs text-gray-600">মোট ফলন (কেজি)
              <input type="number" min={0} value={yieldKg} onChange={(e) => setYieldKg(e.target.value)} placeholder="যেমন ২০০০" className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm" />
            </label>
          </div>
          <button onClick={saveMeta} className="w-full py-2 rounded-full bg-emerald-600 text-white text-sm font-bold">সংরক্ষণ</button>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Stat label="শতক প্রতি খরচ" v={costPerShotok} />
            <Stat label={`শতক প্রতি ${s.profit >= 0 ? "লাভ" : "ক্ষতি"}`} v={profitPerShotok === null ? null : Math.abs(profitPerShotok)} />
            <Stat label="কেজি প্রতি উৎপাদন খরচ" v={costPerKg} />
            <Stat label="মণ প্রতি উৎপাদন খরচ" v={costPerMon} />
          </div>
          {(!shotok || !kg) && <p className="text-[11px] text-gray-500">জমি ও ফলন লিখলে এই হিসাবগুলো দেখা যাবে।</p>}
        </div>
      </section>

      <section className="px-5 mt-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm ring-1 ring-emerald-100">
          <p className="font-bold text-gray-900 mb-3">কোন খাতে কত খরচ</p>
          {byCategory.length === 0 ? <p className="text-sm text-gray-500">এখনো কোনো খরচ যোগ হয়নি।</p> : byCategory.map(([name, amt]) => (
            <div key={name} className="mb-2">
              <div className="flex justify-between text-xs text-gray-700"><span className="truncate">{name}</span><span className="font-bold">{fmtBdt(amt)} ({toBn(Math.round((amt / s.totalCost) * 100))}%)</span></div>
              <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${(amt / maxCat) * 100}%` }} /></div>
            </div>
          ))}
        </div>
      </section>

      <CropFinanceSection userId={user.id} planId={planId} cropType={plan.crop_type} full />
    </main>
  );
}

function Stat({ label, v }: { label: string; v: number | null }) {
  return <div className="rounded-xl bg-gray-50 p-2">{label}<br /><b className="text-base">{v === null ? "—" : fmtBdt(v)}</b></div>;
}
