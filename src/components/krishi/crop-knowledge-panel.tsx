import { useMemo, useState } from "react";
import { Droplets, ShieldAlert, Sprout, ChevronDown, ChevronUp, History, Leaf } from "lucide-react";
import { findCrop, getStageAtDay, getIrrigationAdvice, getIpmRules, checkResistance, BIO_PESTICIDES } from "@/data/crop-knowledge";
import { buildSpraySchedule } from "@/lib/spray-schedule";
import { toBn } from "@/lib/bn";

type Props = { cropType: string; plantingDate: string; days: number; completions: Set<string> };

export function CropKnowledgePanel({ cropType, plantingDate, days, completions }: Props) {
  const crop = useMemo(() => findCrop(cropType), [cropType]);
  const [showIpm, setShowIpm] = useState(false);
  const history = useMemo(() => {
    const done = buildSpraySchedule(cropType, plantingDate).filter((e) => completions.has(e.id) && e.problem);
    const names = done.map((e) => e.problem!.chemicals[0]?.name ?? "");
    return { count: done.length, warnings: checkResistance(names) };
  }, [cropType, plantingDate, completions]);
  if (!crop) return null;
  const stage = getStageAtDay(crop, days);
  const irr = getIrrigationAdvice(crop, stage);
  const rules = getIpmRules(crop);

  return (
    <section className="px-5 mt-4 space-y-3">
      {stage && (
        <div className="rounded-2xl bg-card ring-1 ring-border p-4">
          <p className="text-xs font-semibold text-primary inline-flex items-center gap-1"><Sprout className="h-4 w-4" /> এই পর্যায়ের করণীয় ({toBn(days)} দিন)</p>
          <p className="font-bold text-foreground mt-1">{stage.icon} {stage.name}</p>
          <ul className="mt-2 space-y-1">
            {stage.tasks.slice(0, 4).map((t) => (
              <li key={t.title} className="text-sm text-foreground/80">• <strong>{t.title}</strong> — {t.desc}</li>
            ))}
          </ul>
        </div>
      )}

      <div className={`rounded-2xl p-4 ring-1 ${irr.critical ? "bg-destructive/5 ring-destructive/30" : "bg-card ring-border"}`}>
        <p className="text-xs font-semibold text-primary inline-flex items-center gap-1"><Droplets className="h-4 w-4" /> সেচ পরামর্শ</p>
        <p className="font-bold text-foreground mt-1">প্রতি {toBn(irr.intervalDays)} দিন পর পর · {irr.method}</p>
        {irr.critical && <p className="text-xs font-semibold text-destructive mt-1">⚠️ সেচের জন্য সংবেদনশীল পর্যায়</p>}
        <p className="text-sm text-foreground/80 mt-1">{irr.note}</p>
      </div>

      <div className="rounded-2xl bg-card ring-1 ring-border p-4">
        <p className="text-xs font-semibold text-primary inline-flex items-center gap-1"><History className="h-4 w-4" /> স্প্রে ইতিহাস</p>
        <p className="text-sm text-foreground mt-1">এ পর্যন্ত {toBn(history.count)}টি স্প্রে সম্পন্ন।</p>
        {history.warnings.length === 0 ? (
          <p className="text-xs text-muted-foreground mt-1">ঔষধের গ্রুপ ঠিকমতো পালাক্রমে ব্যবহার হচ্ছে।</p>
        ) : history.warnings.map((w) => (
          <p key={w.groupKey} className="text-xs font-semibold text-destructive mt-1">⚠️ {w.label} গ্রুপ পরপর {toBn(w.count)} বার — পরের বার ভিন্ন গ্রুপের ঔষধ নিন, নাহলে পোকা/রোগ সহনশীল হয়ে যাবে।</p>
        ))}
      </div>

      <div className="rounded-2xl bg-card ring-1 ring-border">
        <button onClick={() => setShowBio(!showBio)} className="w-full p-4 flex items-center justify-between text-left">
          <span className="text-sm font-bold text-foreground inline-flex items-center gap-1.5"><Leaf className="h-4 w-4 text-primary" /> জৈব রাসায়নিক ({toBn(BIO_PESTICIDES.length)})</span>
          {showBio ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {showBio && (
          <ul className="px-4 pb-4 space-y-2">
            {BIO_PESTICIDES.map((b) => (
              <li key={b.id} className="rounded-xl bg-muted/50 p-3 text-sm">
                <p className="font-semibold text-foreground">{b.name} <span className="text-xs text-muted-foreground">({b.kind})</span></p>
                <p className="text-foreground/80 mt-0.5">মাত্রা: {b.dose}</p>
                <p className="text-foreground/80">{b.method}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{b.note}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl bg-card ring-1 ring-border">
        <button onClick={() => setShowIpm(!showIpm)} className="w-full p-4 flex items-center justify-between text-left">
          <span className="text-sm font-bold text-foreground inline-flex items-center gap-1.5"><ShieldAlert className="h-4 w-4 text-primary" /> লক্ষণ দেখা দিলে কী করবেন ({toBn(rules.length)})</span>
          {showIpm ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {showIpm && (
          <ul className="px-4 pb-4 space-y-2">
            {rules.map((r) => (
              <li key={r.id} className="rounded-xl bg-muted/50 p-3 text-sm">
                <p className="font-semibold text-foreground">যদি: {r.condition}</p>
                <p className="text-foreground/80 mt-0.5">তাহলে: {r.action}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
