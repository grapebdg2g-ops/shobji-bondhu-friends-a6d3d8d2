import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, CalendarIcon } from "lucide-react";
import { FARMING_STAGES } from "@/data/farming-guide";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/user-context";
import { formatBnDate, toIsoDate } from "@/lib/bn-date";
import { toast } from "sonner";

export const Route = createFileRoute("/crop-guide/new/$crop")({
  component: NewCropPlan,
  loader: ({ params }) => {
    const guide = FARMING_STAGES[params.crop];
    if (!guide) throw notFound();
    return { crop: params.crop, guide };
  },
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <div>
        <p className="text-gray-700 mb-3">ফসল পাওয়া যায়নি</p>
        <Link to="/crop-guide" className="text-emerald-600 font-semibold">← ফিরুন</Link>
      </div>
    </div>
  ),
  errorComponent: ({ error, reset }) => (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <div>
        <p className="text-gray-700 mb-3">ত্রুটি: {(error as Error).message}</p>
        <button onClick={reset} className="text-emerald-600 font-semibold">পুনরায় চেষ্টা</button>
      </div>
    </div>
  ),
});

function NewCropPlan() {
  const { crop, guide } = Route.useLoaderData();
  const navigate = useNavigate();
  const { user } = useUser();
  const [date, setDate] = useState<Date>(new Date());
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!user) { navigate({ to: "/login" }); return; }
    setSaving(true);
    const { data, error } = await supabase
      .from("user_crop_plans" as never)
      .insert({ user_id: user.id, crop_type: crop, planting_date: toIsoDate(date) } as never)
      .select("id")
      .single();
    setSaving(false);
    if (error || !data) {
      toast.error("সংরক্ষণ ব্যর্থ হয়েছে");
      return;
    }
    toast.success("ফসল পরিকল্পনা যোগ হয়েছে");
    navigate({ to: "/crop-guide/plan/$planId", params: { planId: (data as { id: string }).id } });
  }

  return (
    <main className="min-h-screen bg-[#F0FFF4] pb-24 md:max-w-[560px] md:mx-auto">
      <header className="px-5 pt-8 pb-6 rounded-b-3xl text-white" style={{ background: "var(--gradient-brand)" }}>
        <div className="flex items-center gap-3 mb-3">
          <Link to="/crop-guide" aria-label="ফিরে যান" className="h-9 w-9 rounded-full bg-white/15 flex items-center justify-center">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-4xl">{guide.icon}</span>
          <div>
            <h1 className="text-2xl font-bold">{crop}</h1>
            <p className="text-sm text-white/85">{guide.season}</p>
          </div>
        </div>
      </header>

      <section className="px-5 mt-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100">
          <h2 className="font-bold text-gray-900 mb-1">কবে রোপণ করেছেন / করবেন?</h2>
          <p className="text-xs text-gray-500 mb-4">রোপণের তারিখ বেছে নিন (আজ ডিফল্ট)</p>

          <Popover>
            <PopoverTrigger asChild>
              <button className="w-full inline-flex items-center justify-between gap-2 rounded-xl border border-emerald-200 px-4 py-3 bg-emerald-50 text-emerald-900 font-semibold">
                <span className="inline-flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  {formatBnDate(date)}
                </span>
                <span className="text-xs text-emerald-700">পরিবর্তন</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => d && setDate(d)}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          <div className="mt-4 text-xs text-gray-600 space-y-1">
            <p>• মোট চক্র: <strong>{guide.totalDays} দিন</strong></p>
            <p>• আনুমানিক ফলন: <strong>{guide.yield}</strong></p>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-5 w-full py-3 rounded-xl bg-emerald-600 text-white font-bold disabled:opacity-60"
          >
            {saving ? "সংরক্ষণ হচ্ছে…" : "পরামর্শ দেখুন"}
          </button>
        </div>
      </section>
    </main>
  );
}
