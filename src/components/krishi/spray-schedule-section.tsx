import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getWeatherForecast } from "@/lib/weather.functions";
import { useUser } from "@/contexts/user-context";
import { FARMING_STAGES } from "@/data/farming-guide";
import { groupKey } from "@/data/crop-knowledge";
import { evaluateSprayWeather, parseDosePerLiter, tankPlan, mixRank, MIX_LABELS, tankMixWarnings, maxPhiDays, phiConflict, TANK_LITERS, LITERS_PER_SHOTOK } from "@/lib/spray-tools";
import { Bell, Check, SprayCan, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { buildSpraySchedule, syncSprayReminders, type SprayEvent } from "@/lib/spray-schedule";
import { TOMATO_SPRAY_NOTES } from "@/lib/tomato-spray-schedule";
import { addDays, formatBnDate } from "@/lib/bn-date";
import { toBn } from "@/lib/bn";
import { getAllChemicalInfo, getBioOptions } from "@/data/crop-knowledge";

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
  const [showMain, setShowMain] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shotok, setShotok] = useState("");
  const { user } = useUser();
  const fetchWeather = useServerFn(getWeatherForecast);
  const weather = useQuery({
    queryKey: ["spray-weather", user?.district, user?.upazila],
    enabled: !!user?.district,
    staleTime: 30 * 60 * 1000,
    queryFn: () => fetchWeather({ data: { district: user!.district!, upazila: user?.upazila ?? null } }),
  });
  useEffect(() => {
    const v = localStorage.getItem(`spray-land:${planId}`);
    if (v) setShotok(v);
  }, [planId]);
  function saveLand(v: string) {
    setShotok(v);
    localStorage.setItem(`spray-land:${planId}`, v);
  }
  const land = parseFloat(shotok.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)))) || 0;
  const harvestDay = FARMING_STAGES[cropType]?.totalDays ?? 0;
  if (events.length === 0) return null;
  const sw = weather.data?.forecast ? evaluateSprayWeather(weather.data.forecast) : null;

  function rotationWarning(e: SprayEvent): string | null {
    if (!e.problem) return null;
    const idx = main.indexOf(e);
    const prev = [...main.slice(0, idx)].reverse().find((p) => completions.has(p.id) && p.problem);
    if (!prev?.problem) return null;
    const prevGroups = new Set(getAllChemicalInfo(prev.problem.chemicals[0]?.name ?? "").filter((a) => !a.group.startsWith("M")).map(groupKey));
    const mine = getAllChemicalInfo(e.problem.chemicals[0]?.name ?? "").filter((a) => prevGroups.has(groupKey(a)));
    if (mine.length === 0) return null;
    const alt = e.problem.chemicals.find((c) => getAllChemicalInfo(c.name).every((a) => !prevGroups.has(groupKey(a))));
    return `গত স্প্রেতে ${mine[0].system} ${mine[0].group} গ্রুপ দিয়েছেন — একই গ্রুপ পরপর দিলে পোকা/রোগ ওষুধ সহ্য করতে শেখে।${alt ? ` এবার দিন: ${alt.name}` : " এবার অন্য গ্রুপের ওষুধ দিন।"}`;
  }

  const next = main.find((e) => !completions.has(e.id) && e.day >= days - 3);
  const nextDose = next?.problem ? parseDosePerLiter(next.problem.chemicals[0]?.dose ?? "") : null;

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

  function renderEvent(e: SprayEvent) {
    const done = completions.has(e.id);
    const overdue = !done && e.day < days;
    const isOpen = open === e.id;
    return (
      <li key={e.id} className="rounded-xl bg-muted/50">
        <button onClick={() => setOpen(isOpen ? null : e.id)} className="w-full p-3 flex items-center gap-3 text-left">
          <span className="text-xl">{e.kind === "nutrient" ? "🌿" : e.kind === "disease" ? "🍂" : "🐛"}</span>
          <div className="flex-1 min-w-0">
            <p className={`font-semibold text-sm truncate ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>{e.title}</p>
            <p className="text-[11px] text-muted-foreground">
              {formatBnDate(addDays(plantingDate, e.day))} · {e.stageIcon} {e.stageName}
              {overdue && <span className="text-destructive font-semibold"> · তারিখ পেরিয়েছে</span>}
            </p>
          </div>
          {done ? <Check className="h-5 w-5 text-primary" /> : isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
        {isOpen && (
          <div className="px-3 pb-3 space-y-2 text-sm">
            <p className="text-foreground/80">{e.desc}</p>
            {e.problem && (
              <div className="rounded-lg bg-card p-2.5 ring-1 ring-border space-y-1">
                {e.problem.chemicals.map((c) => {
                  const info = getAllChemicalInfo(c.name);
                  return (
                    <div key={c.name} className="text-xs space-y-0.5">
                      <p><strong>{c.name}</strong> — {c.dose} ({c.method})</p>
                      {info.map((a) => (
                        <div key={a.id} className="space-y-0.5">
                          <p className="text-[11px] text-muted-foreground">
                            <span className="inline-block rounded bg-primary/10 text-primary font-semibold px-1.5 mr-1">{a.system} {a.group}</span>
                            {a.ingredient} {a.formulation} · ফসল তোলার {toBn(a.phiDays)} দিন আগে বন্ধ · বিষাক্ততা {a.toxicity} · {a.safety}
                          </p>
                          <p className="text-[11px] text-foreground/80">
                            <span className="inline-block rounded bg-primary/10 text-primary font-semibold px-1.5 mr-1">🌱 জৈব</span>
                            {a.organic}
                          </p>
                        </div>
                      ))}
                    </div>
                  );
                })}
                {getBioOptions(`${e.title} ${e.desc} ${e.problem.name}`).length > 0 && (
                  <div className="rounded-lg bg-primary/5 p-2.5 space-y-1.5">
                    <p className="text-xs font-bold text-primary">🧪 জৈব রাসায়নিক (একই সমস্যায় জৈব অপশন)</p>
                    {getBioOptions(`${e.title} ${e.desc} ${e.problem.name}`).map((b) => (
                      <div key={b.id} className="text-xs space-y-0.5">
                        <p className="text-foreground/90"><strong>{b.name}</strong> — {b.dose}</p>
                        <p className="text-[11px] text-muted-foreground">{b.method} · {b.note}{b.phiDays > 0 && ` · ফসল তোলার ${toBn(b.phiDays)} দিন আগে বন্ধ`}</p>
                      </div>
                    ))}
                  </div>
                )}
                {e.problem.organic[0] && <p className="text-xs text-muted-foreground">জৈব বিকল্প: {e.problem.organic[0]}</p>}
                {e.problem.phi && <p className="text-xs text-destructive">ফসল তোলার অন্তত {e.problem.phi} আগে স্প্রে বন্ধ করুন</p>}
              </div>
            )}
            {!done && e.problem && (() => {
              const names = e.problem.chemicals.map((c) => c.name);
              const phi = maxPhiDays(names.slice(0, 1));
              const pc = phiConflict(e.day, harvestDay, phi);
              const rot = rotationWarning(e);
              const dose = parseDosePerLiter(e.problem.chemicals[0]?.dose ?? "");
              const mix = [...names].sort((a, b) => mixRank(a) - mixRank(b));
              const mixW = tankMixWarnings(names);
              return (
                <div className="space-y-2">
                  {pc.conflict && (
                    <p className="rounded-lg bg-destructive/10 p-2 text-xs text-destructive font-semibold">⛔ ফসল তোলার মাত্র {toBn(Math.max(0, pc.daysLeft))} দিন বাকি, কিন্তু এই ওষুধের বিষ কাটতে {toBn(phi)} দিন লাগে। এই স্প্রের পর {toBn(phi)} দিন ফসল তুলবেন না/খাবেন না, অথবা জৈব বিকল্প ব্যবহার করুন।</p>
                  )}
                  {rot && <p className="rounded-lg bg-accent/50 p-2 text-xs text-foreground">🔄 {rot}</p>}
                  {dose && (
                    <div className="rounded-lg bg-primary/5 p-2 text-xs">
                      <p className="font-bold text-primary">🪣 ড্রাম হিসাব ({toBn(TANK_LITERS)} লিটার স্প্রেয়ার)</p>
                      <p>প্রতি ড্রামে: <strong>{toBn(tankPlan(0, dose.amount).perTank)} {dose.unit}</strong> {e.problem.chemicals[0].name.split(" (")[0]}</p>
                      {land > 0 ? (
                        <p>{toBn(land)} শতকে লাগবে ≈ {toBn(tankPlan(land, dose.amount).waterLiters)} লিটার পানি = <strong>{toBn(tankPlan(land, dose.amount).tanks)} ড্রাম</strong>, মোট ওষুধ {toBn(tankPlan(land, dose.amount).total)} {dose.unit}</p>
                      ) : <p className="text-muted-foreground">উপরে জমির পরিমাণ দিলে মোট ড্রাম দেখাবে।</p>}
                    </div>
                  )}
                  {names.length > 1 && (
                    <div className="rounded-lg bg-muted p-2 text-xs space-y-0.5">
                      <p className="font-bold">🧴 একসাথে মেশালে এই ক্রমে দিন</p>
                      {mix.map((n, i) => <p key={n}>{toBn(i + 1)}. {n} <span className="text-muted-foreground">({MIX_LABELS[mixRank(n)]})</span></p>)}
                      {mixW.map((w) => <p key={w} className="text-destructive font-semibold">⚠️ {w}</p>)}
                    </div>
                  )}
                </div>
              );
            })()}
            <p className="text-[11px] text-muted-foreground">⚠️ লেবেলের নির্দেশনা মেনে, সকাল/বিকেলে বাতাসহীন সময়ে স্প্রে করুন।</p>
            <button
              onClick={() => onComplete(e.id)}
              disabled={done}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
            >
              <Check className="h-4 w-4" /> {done ? "স্প্রে সম্পন্ন" : "স্প্রে সম্পন্ন হয়েছে"}
            </button>
          </div>
        )}
      </li>
    );
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

        <div className="mx-4 mb-3 grid gap-2">
          {sw ? (
            <div className={`rounded-xl p-3 text-xs ${sw.ok ? "bg-primary/10" : "bg-destructive/10"}`}>
              <p className={`font-bold text-sm ${sw.ok ? "text-primary" : "text-destructive"}`}>{sw.ok ? "✅ আজ স্প্রে করার উপযোগী" : "⛔ আজ স্প্রে করবেন না"}</p>
              {sw.reasons.map((r) => <p key={r} className="text-foreground">• {r}</p>)}
              <p className="text-muted-foreground mt-0.5">সেরা সময়: {sw.bestTime} (বাতাস কম থাকে)</p>
            </div>
          ) : !user?.district ? (
            <p className="rounded-xl bg-muted p-3 text-xs text-muted-foreground">প্রোফাইলে জেলা দিলে আজকের আবহাওয়া দেখে স্প্রে পরামর্শ পাবেন।</p>
          ) : weather.isLoading ? (
            <p className="rounded-xl bg-muted p-3 text-xs text-muted-foreground">আবহাওয়া দেখা হচ্ছে…</p>
          ) : null}
          <label className="rounded-xl bg-muted p-3 text-xs flex items-center gap-2">
            <span className="font-semibold text-foreground">🌾 জমির পরিমাণ</span>
            <input inputMode="decimal" value={shotok} onChange={(ev) => saveLand(ev.target.value)} placeholder="যেমন ২০" className="w-20 rounded-lg bg-card ring-1 ring-border px-2 py-1.5 text-sm" />
            <span className="text-muted-foreground">শতক — ড্রাম হিসাবের জন্য</span>
          </label>
        </div>

        {cropType === "টমেটো" && (
          <div className="mx-4 mb-3 rounded-xl bg-accent/40 p-3 text-xs text-foreground space-y-1">
            <p className="font-bold">📝 জরুরি নোট</p>
            {TOMATO_SPRAY_NOTES.map((n) => <p key={n}>• {n}</p>)}
          </div>
        )}

        <div className="px-4 pb-3">
          <button
            onClick={() => setShowMain((v) => !v)}
            className="w-full flex items-center justify-between rounded-xl bg-muted px-3 py-2.5 text-sm font-bold text-foreground"
          >
            <span>📋 পুরো স্প্রে শিডিউল ({toBn(main.length)}টি)</span>
            {showMain ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showMain && <ol className="mt-2 space-y-2">{main.map(renderEvent)}</ol>}
        </div>

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
