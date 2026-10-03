import { useMemo, useState } from "react";
import { Bell, Check, SprayCan, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { buildSpraySchedule, syncSprayReminders, type SprayEvent } from "@/lib/spray-schedule";
import { TOMATO_SPRAY_NOTES } from "@/lib/tomato-spray-schedule";
import { addDays, formatBnDate } from "@/lib/bn-date";
import { toBn } from "@/lib/bn";

type Props = {
  userId: string;
  planId: string;
  cropType: string;
  plantingDate: string;
  days: number;
  completions: Set<string>;
  onComplete: (taskId: string) => Promise<void>;
};

export function SprayScheduleSection({ userId, planId, cropType, plantingDate, days, completions, onComplete }: Props) {
  const events = useMemo(() => buildSpraySchedule(cropType, plantingDate), [cropType, plantingDate]);
  const main = events.filter((e) => e.kind !== "nutrient");
  const nutrients = events.filter((e) => e.kind === "nutrient");
  const [showNutrients, setShowNutrients] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (events.length === 0) return null;

  const next = main.find((e) => !completions.has(e.id) && e.day >= days - 3);

  async function setReminders() {
    setBusy(true);
    try {
      const n = await syncSprayReminders(userId, planId, cropType, plantingDate);
      toast.success(n > 0 ? `${toBn(n)}টি স্প্রে রিমাইন্ডার সেট হয়েছে` : "সব স্প্রে রিমাইন্ডার আগেই সেট করা আছে");
    } catch {
      toast.error("রিমাইন্ডার সেট করা যায়নি");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="px-5 mt-5">
      <div className="bg-card rounded-2xl shadow-sm ring-1 ring-border overflow-hidden">
        <div className="p-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-foreground inline-flex items-center gap-2">
              <SprayCan className="h-5 w-5 text-primary" /> স্প্রে শিডিউল
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              মোট {toBn(events.length)}টি স্প্রে · সম্পন্ন {toBn(events.filter((e) => completions.has(e.id)).length)}টি
            </p>
          </div>
          <button
            onClick={setReminders}
            disabled={busy}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold disabled:opacity-60"
          >
            <Bell className="h-4 w-4" /> {busy ? "সেট হচ্ছে…" : "রিমাইন্ডার সেট"}
          </button>
        </div>

        {next && (
          <div className="mx-4 mb-3 rounded-xl bg-primary/10 p-3 text-sm">
            <p className="text-xs font-semibold text-primary">পরবর্তী স্প্রে</p>
            <p className="font-bold text-foreground">{next.title}</p>
            <p className="text-xs text-muted-foreground">{formatBnDate(addDays(plantingDate, next.day))} ({toBn(next.day)}তম দিন)</p>
          </div>
        )}

        {cropType === "টমেটো" && (
          <div className="mx-4 mb-3 rounded-xl bg-accent/40 p-3 text-xs text-foreground space-y-1">
            <p className="font-bold">📝 জরুরি নোট</p>
            {TOMATO_SPRAY_NOTES.map((n) => <p key={n}>• {n}</p>)}
          </div>
        )}

        <ol className="px-4 pb-3 space-y-2">{main.map(renderEvent)}</ol>

        {nutrients.length > 0 && (
          <div className="px-4 pb-4">
            <button
              onClick={() => setShowNutrients((v) => !v)}
              className="w-full flex items-center justify-between rounded-xl bg-primary/10 px-3 py-2.5 text-sm font-bold text-primary"
            >
              <span>🌿 অন্যান্য পুষ্টিজনিত স্প্রে ({toBn(nutrients.length)}টি)</span>
              {showNutrients ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showNutrients && <ol className="mt-2 space-y-2">{nutrients.map(renderEvent)}</ol>}
          </div>
        )}
      </div>
    </section>
  );
}
