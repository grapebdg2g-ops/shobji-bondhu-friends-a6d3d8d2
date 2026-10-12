import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { toIsoDate } from "@/lib/bn-date";
import { getPhiDays } from "@/data/crop-knowledge";
import { toBn } from "@/lib/bn";
import type { SprayEvent } from "@/lib/spray-schedule";

const CHECKS = [
  "মাস্ক, গ্লাভস, চশমা ও লম্বা জামা পরেছি",
  "আবার দেখেছি — বৃষ্টি নেই, বাতাস কম",
  "পুকুর, নলকূপ ও বাড়ি থেকে দূরে স্প্রে করেছি",
  "স্প্রের পর অন্তত ২৪ ঘণ্টা কেউ জমিতে ঢুকবে না, গবাদিপশু চরবে না",
  "খালি বোতল ধুয়ে ছিদ্র করে মাটিতে পুঁতেছি — অন্য কাজে ব্যবহার করব না",
];

type Props = {
  event: SprayEvent;
  planId: string;
  userId: string;
  land: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
};

/** Pre-spray safety checklist + real spray log (product, date, dose, area). */
export function SprayLogDialog({ event, planId, userId, land, onClose, onSaved }: Props) {
  const options = event.problem?.chemicals.map((c) => c.name) ?? [];
  const [product, setProduct] = useState(options[0] ?? event.title.replace(/^জৈব বিকল্প:\s*/, ""));
  const [other, setOther] = useState("");
  const [dose, setDose] = useState(event.problem?.chemicals[0]?.dose ?? "");
  const [date, setDate] = useState(toIsoDate(new Date()));
  const [shotok, setShotok] = useState(land > 0 ? String(land) : "");
  const [checked, setChecked] = useState<boolean[]>(CHECKS.map(() => false));
  const [saving, setSaving] = useState(false);
  const name = product === "__other" ? other.trim() : product;
  const phi = getPhiDays(name) ?? 0;
  const allChecked = checked.every(Boolean);

  async function save() {
    if (!name) return toast.error("কোন ওষুধ দিয়েছেন লিখুন");
    setSaving(true);
    const { error } = await supabase.from("spray_logs").insert({
      user_id: userId,
      plan_id: planId,
      event_id: event.id,
      product: name,
      dose: dose || null,
      shotok: parseFloat(shotok) || null,
      sprayed_on: date,
      phi_days: phi,
    });
    if (error) {
      setSaving(false);
      return toast.error("স্প্রের তথ্য সংরক্ষণ হয়নি, আবার চেষ্টা করুন");
    }
    await onSaved();
    setSaving(false);
    toast.success(phi > 0 ? `সংরক্ষিত — ${toBn(phi)} দিন ফসল তুলবেন না` : "স্প্রে সংরক্ষিত");
    onClose();
  }

  const field = "w-full rounded-xl bg-card ring-1 ring-border px-3 py-3 text-base";
  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 flex items-end sm:items-center justify-center">
      <div className="bg-background w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5 space-y-4">
        <h3 className="text-lg font-bold text-foreground">স্প্রে সম্পন্ন — তথ্য লিখুন</h3>

        <div className="space-y-2">
          <p className="text-sm font-bold text-foreground">🦺 নিরাপত্তা যাচাই</p>
          {CHECKS.map((c, i) => (
            <label key={c} className="flex items-start gap-3 min-h-11 text-sm text-foreground">
              <input
                type="checkbox"
                className="mt-0.5 h-6 w-6 shrink-0 accent-primary"
                checked={checked[i]}
                onChange={(e) =>
                  setChecked((p) => p.map((v, j) => (j === i ? e.target.checked : v)))
                }
              />
              {c}
            </label>
          ))}
        </div>

        <label className="block text-sm font-semibold text-foreground">
          কোন ওষুধ দিয়েছেন
          <select
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            className={`${field} mt-1`}
          >
            {options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
            {!options.length && <option value={product}>{product}</option>}
            <option value="__other">অন্য ওষুধ…</option>
          </select>
        </label>
        {product === "__other" && (
          <input
            value={other}
            onChange={(e) => setOther(e.target.value)}
            placeholder="ওষুধের নাম"
            className={field}
          />
        )}
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-semibold text-foreground">
            তারিখ
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`${field} mt-1`}
            />
          </label>
          <label className="block text-sm font-semibold text-foreground">
            জমি (শতক)
            <input
              inputMode="decimal"
              value={shotok}
              onChange={(e) => setShotok(e.target.value)}
              className={`${field} mt-1`}
            />
          </label>
        </div>
        <label className="block text-sm font-semibold text-foreground">
          মাত্রা
          <input
            value={dose}
            onChange={(e) => setDose(e.target.value)}
            className={`${field} mt-1`}
          />
        </label>
        {phi > 0 && (
          <p className="rounded-xl bg-destructive/10 p-3 text-sm font-semibold text-destructive">
            ⛔ এই ওষুধের পর {toBn(phi)} দিন ফসল তুলবেন না/খাবেন না।
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={onClose}
            className="min-h-12 rounded-xl ring-1 ring-border font-bold text-foreground"
          >
            বাতিল
          </button>
          <button
            onClick={save}
            disabled={!allChecked || saving}
            className="min-h-12 rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-50"
          >
            {saving ? "সংরক্ষণ…" : allChecked ? "সংরক্ষণ করুন" : "সব টিক দিন"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Poisoning first-aid card shown permanently in the spray section. */
export function FirstAidCard() {
  return (
    <details className="rounded-xl bg-destructive/5 ring-1 ring-destructive/20 p-3 text-sm">
      <summary className="font-bold text-destructive min-h-11 flex items-center cursor-pointer">
        🚑 বিষক্রিয়া হলে কী করবেন
      </summary>
      <ul className="mt-2 space-y-1 text-foreground list-disc pl-5">
        <li>আক্রান্তকে সঙ্গে সঙ্গে খোলা বাতাসে নিন, ভেজা কাপড় খুলে দিন।</li>
        <li>ত্বক ও চোখ প্রচুর পরিষ্কার পানিতে ১৫ মিনিট ধুয়ে দিন।</li>
        <li>জোর করে বমি করাবেন না; অজ্ঞান হলে কিছু খাওয়াবেন না।</li>
        <li>ওষুধের বোতল/লেবেল সঙ্গে নিয়ে দ্রুত নিকটস্থ হাসপাতালে যান।</li>
        <li>
          জরুরি সেবা:{" "}
          <a href="tel:999" className="font-bold text-destructive underline">
            ৯৯৯
          </a>{" "}
          · স্বাস্থ্য বাতায়ন:{" "}
          <a href="tel:16263" className="font-bold text-destructive underline">
            ১৬২৬৩
          </a>
        </li>
      </ul>
    </details>
  );
}
