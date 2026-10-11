import { useMemo, useState } from "react";
import { ShieldCheck, Check, ChevronDown, ChevronUp, AlertTriangle, Printer } from "lucide-react";
import { buildGapTasks, getGapProfile, GAP_PHASE_LABEL, type GapPhase } from "@/data/gap-protocol";
import { toBn } from "@/lib/bn";
import { formatBnDate } from "@/lib/bn-date";
import { toast } from "sonner";
import { useUser } from "@/contexts/user-context";

type Props = {
  cropType: string;
  plantingDate: string;
  daysUntilHarvest: number;
  completions: Set<string>;
  onComplete: (taskId: string) => void;
};

const PHASES: GapPhase[] = ["land", "seed", "ipm", "spray", "harvest", "record"];

export function GapProtocolSection({ cropType, plantingDate, daysUntilHarvest, completions, onComplete }: Props) {
  const profile = getGapProfile(cropType);
  const tasks = useMemo(() => buildGapTasks(cropType), [cropType]);
  const [open, setOpen] = useState<GapPhase | null>("land");
  const { user } = useUser();
  if (!profile) return null;

  const done = tasks.filter((t) => completions.has(t.id)).length;
  const pct = Math.round((done / tasks.length) * 100);
  const inPhi = daysUntilHarvest <= profile.phiDays;

  function printReport() {
    const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
    const phaseRows = PHASES
      .map((ph) => ({ ph, list: tasks.filter((t) => t.phase === ph) }))
      .filter((g) => g.list.length > 0)
      .map((g) => `<h3>${esc(GAP_PHASE_LABEL[g.ph])}</h3><table><tr><th style="width:28px">অবস্থা</th><th>কাজ</th><th>বিবরণ</th></tr>${g.list.map((t) => {
        const ok = completions.has(t.id);
        return `<tr><td class="c">${ok ? "✓" : "—"}</td><td>${esc(t.title)}</td><td class="d">${esc(t.desc)}</td></tr>`;
      }).join("")}</table>`).join("");
    const loc = user?.district ? `${user.district}${user?.upazila ? ", " + user.upazila : ""}` : "";
    const w = window.open("", "_blank");
    if (!w) return toast.error("পপআপ চালু করুন");
    w.document.write(`<html><head><meta charset="utf-8"><title>GAP রিপোর্ট — ${esc(cropType)}</title><link href="https://fonts.googleapis.com/css2?family=Tiro+Bangla&display=swap" rel="stylesheet"><style>body{font-family:'Tiro Bangla',serif;padding:24px;color:#111}table{width:100%;border-collapse:collapse;margin-bottom:12px}td,th{border:1px solid #999;padding:6px;text-align:left;vertical-align:top}.c{text-align:center;font-weight:bold}.d{font-size:12px;color:#444}h1{margin:0}h3{margin:16px 0 6px}.sum td{font-weight:bold}</style></head><body>
<h1>কৃষক বন্ধু — GAP (উত্তম কৃষি চর্চা) উৎপাদন রিপোর্ট</h1>
<table class="sum"><tr><td>কৃষক</td><td>${esc(user?.name ?? "—")}</td></tr>${loc ? `<tr><td>এলাকা</td><td>${esc(loc)}</td></tr>` : ""}<tr><td>ফসল</td><td>${esc(cropType)}</td></tr><tr><td>রোপণের তারিখ</td><td>${formatBnDate(plantingDate)}</td></tr><tr><td>রিপোর্টের তারিখ</td><td>${formatBnDate(new Date().toISOString().slice(0, 10))}</td></tr><tr><td>মূল বালাই</td><td>${esc(profile.keyPests.join(", "))}</td></tr><tr><td>PHI (স্প্রে বন্ধের নিয়ম)</td><td>ফসল তোলার ${toBn(profile.phiDays)} দিন আগে রাসায়নিক স্প্রে বন্ধ</td></tr></table>
<h3>সারসংক্ষেপ</h3><p>সম্পন্ন: <b>${toBn(done)}</b> / ${toBn(tasks.length)} টি কাজ (${toBn(pct)}%)${inPhi ? " — <b>সতর্কতা: বর্তমানে PHI উইন্ডোর মধ্যে, রাসায়নিক স্প্রে নিষিদ্ধ</b>" : ""}</p>
${phaseRows}
<p style="margin-top:48px">কৃষকের স্বাক্ষর: ____________________ &nbsp;&nbsp;&nbsp; পরিদর্শকের স্বাক্ষর: ____________________</p>
<script>setTimeout(()=>print(),600)</script></body></html>`);
    w.document.close();
  }

  return (
    <section className="mx-5 mt-4 rounded-2xl bg-card ring-1 ring-primary/30 shadow-sm overflow-hidden">
      <div className="p-4 bg-primary/10">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="font-bold text-foreground">GAP (উত্তম কৃষি চর্চা) চেকলিস্ট</h2>
          <button
            onClick={printReport}
            className="ml-auto shrink-0 inline-flex items-center gap-1 rounded-full bg-card ring-1 ring-primary/30 px-2.5 py-1 text-xs font-bold text-primary"
          >
            <Printer className="h-3.5 w-3.5" /> রিপোর্ট
          </button>
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
