import { useMemo, useState } from "react";
import { ShieldCheck, Check, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { buildGapTasks, getGapProfile, GAP_PHASE_LABEL, type GapPhase } from "@/data/gap-protocol";
import { toBn } from "@/lib/bn";

type Props = {
  cropType: string;
  daysUntilHarvest: number;
  completions: Set<string>;
  onComplete: (taskId: string) => void;
};

const PHASES: GapPhase[] = ["land", "seed", "ipm", "spray", "harvest", "record"];

export function GapProtocolSection({ cropType, daysUntilHarvest, completions, onComplete }: Props) {
  const profile = getGapProfile(cropType);
  const tasks = useMemo(() => buildGapTasks(cropType), [cropType]);
  const [open, setOpen] = useState<GapPhase | null>("land");
  if (!profile) return null;

  const done = tasks.filter((t) => completions.has(t.id)).length;
  const pct = Math.round((done / tasks.length) * 100);
  const inPhi = daysUntilHarvest <= profile.phiDays;

  return (
    <section className="mx-5 mt-4 rounded-2xl bg-card ring-1 ring-primary/30 shadow-sm overflow-hidden">
      <div className="p-4 bg-primary/10">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="font-bold text-foreground">GAP (উত্তম কৃষি চর্চা) চেকলিস্ট</h2>
        </div>
        <p className="text-xs text-muted-foreground mt-1">সব কাজ শেষ করলে সার্টিফিকেশনের জন্য প্রস্তুত থাকবেন।</p>
        <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs mt-1 text-foreground">{toBn(done)}/{toBn(tasks.length)} সম্পন্ন ({toBn(pct)}%)</p>
        {inPhi && (
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-destructive/10 p-2 text-xs text-destructive font-semibold">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            সংগ্রহের {toBn(profile.phiDays)} দিনের মধ্যে — এখন কোনো রাসায়নিক স্প্রে করবেন না (GAP নিয়ম)।
          </p>
        )}
      </div>
      {PHASES.map((ph) => {
        const list = tasks.filter((t) => t.phase === ph);
        if (!list.length) return null;
        const phDone = list.filter((t) => completions.has(t.id)).length;
        const isOpen = open === ph;
        return (
          <div key={ph} className="border-t border-border">
            <button onClick={() => setOpen(isOpen ? null : ph)} className="w-full flex items-center justify-between px-4 py-3 text-left">
              <span className="font-semibold text-foreground text-sm">{GAP_PHASE_LABEL[ph]}</span>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                {toBn(phDone)}/{toBn(list.length)}
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </span>
            </button>
            {isOpen && (
              <ul className="px-4 pb-3 space-y-2">
                {list.map((t) => {
                  const ok = completions.has(t.id);
                  return (
                    <li key={t.id} className="flex gap-3 rounded-xl bg-muted/50 p-3">
                      <button
                        aria-label={ok ? "সম্পন্ন" : "সম্পন্ন করুন"}
                        disabled={ok}
                        onClick={() => onComplete(t.id)}
                        className={`h-6 w-6 shrink-0 rounded-full border-2 flex items-center justify-center ${ok ? "bg-primary border-primary text-primary-foreground" : "border-primary/50"}`}
                      >
                        {ok && <Check className="h-4 w-4" />}
                      </button>
                      <div>
                        <p className={`text-sm font-semibold ${ok ? "line-through text-muted-foreground" : "text-foreground"}`}>{t.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </section>
  );
}
