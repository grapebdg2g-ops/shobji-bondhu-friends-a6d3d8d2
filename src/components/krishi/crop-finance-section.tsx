import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Printer, Wallet, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fmtBdt, toBn } from "@/lib/bn";
import { formatBnDate } from "@/lib/bn-date";

type EntryType = "capital" | "expense" | "income";
type Entry = { id: string; entry_type: EntryType; title: string; amount: number; entry_date: string; note: string | null };

const LABEL: Record<EntryType, string> = { capital: "মূলধন", expense: "ব্যয়", income: "আয়" };
const DEFAULTS: Array<[EntryType, string]> = [
  ["capital", "নিজস্ব মূলধন"],
  ["expense", "জমি চাষ/হালচাষ"], ["expense", "বীজ/চারা"], ["expense", "সার"],
  ["expense", "কীটনাশক/বালাইনাশক"], ["expense", "সেচ"], ["expense", "শ্রমিক মজুরি"],
  ["expense", "জমি লিজ/ভাড়া"], ["expense", "পরিবহন"],
  ["income", "ফসল বিক্রি"],
];
const SUGGESTIONS: Record<EntryType, string[]> = {
  capital: ["নিজস্ব মূলধন", "ঋণ/ধার"],
  expense: ["জমি চাষ/হালচাষ", "বীজ/চারা", "সার", "কীটনাশক/বালাইনাশক", "সেচ", "শ্রমিক মজুরি", "জমি লিজ/ভাড়া", "পরিবহন", "মাচা/সাপোর্ট", "বীজতলা তৈরি"],
  income: ["ফসল বিক্রি", "পাশাপাশি ফসল বিক্রি", "বীজ/চারা বিক্রি"],
};
const CUSTOM = "__custom";

export function CropFinanceSection({ userId, planId, cropType }: { userId: string; planId: string; cropType: string }) {
  const qc = useQueryClient();
  const key = ["crop-finances", planId];
  const { data: rows = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from("crop_plan_finances").select("*").eq("plan_id", planId).order("created_at");
      if (error) throw error;
      return (data ?? []) as Entry[];
    },
  });
  const [seeded, setSeeded] = useState(false);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<EntryType>("expense");
  const [pick, setPick] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (isLoading || seeded || rows.length) return;
    setSeeded(true);
    supabase.from("crop_plan_finances").insert(DEFAULTS.map(([entry_type, title]) => ({ user_id: userId, plan_id: planId, entry_type, title, amount: 0 })))
      .then(() => qc.invalidateQueries({ queryKey: key }));
  }, [isLoading, rows.length, seeded]); // eslint-disable-line react-hooks/exhaustive-deps

  const totals = useMemo(() => {
    const t = { capital: 0, expense: 0, income: 0 };
    rows.forEach((r) => (t[r.entry_type] += Number(r.amount)));
    return t;
  }, [rows]);
  const profit = totals.income - totals.expense;
  const tabRows = rows.filter((r) => r.entry_type === tab);

  async function updateAmount(r: Entry, v: string) {
    const amt = Math.max(0, Number(v) || 0);
    if (amt === Number(r.amount)) return;
    const { error } = await supabase.from("crop_plan_finances").update({ amount: amt }).eq("id", r.id);
    if (error) return toast.error("সংরক্ষণ ব্যর্থ");
    qc.invalidateQueries({ queryKey: key });
  }
  async function add() {
    const title = (pick === CUSTOM ? customTitle : pick).trim();
    if (!title) return toast.error("তালিকা থেকে নির্বাচন করুন বা নিজের নাম লিখুন");
    const { error } = await supabase.from("crop_plan_finances").insert({ user_id: userId, plan_id: planId, entry_type: tab, title: title.slice(0, 80), amount: Math.max(0, Number(amount) || 0) });
    if (error) return toast.error("যোগ করা যায়নি");
    setPick(""); setCustomTitle(""); setAmount("");
    qc.invalidateQueries({ queryKey: key });
    toast.success("যোগ হয়েছে");
  }
  async function remove(id: string) {
    if (!confirm("আপনি কি নিশ্চিত মুছে ফেলতে চান?")) return;
    await supabase.from("crop_plan_finances").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: key });
  }

  function printReport() {
    const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
    const table = (t: EntryType) => `<h3>${LABEL[t]}</h3><table><tr><th>আইটেম</th><th>তারিখ</th><th>টাকা</th></tr>${rows.filter((r) => r.entry_type === t).map((r) => `<tr><td>${esc(r.title)}</td><td>${formatBnDate(r.entry_date)}</td><td class="r">${fmtBdt(Number(r.amount))}</td></tr>`).join("")}<tr><th colspan="2">মোট</th><th class="r">${fmtBdt(totals[t])}</th></tr></table>`;
    const w = window.open("", "_blank");
    if (!w) return toast.error("পপআপ চালু করুন");
    w.document.write(`<html><head><meta charset="utf-8"><title>${esc(cropType)} আয়-ব্যয় রিপোর্ট</title><link href="https://fonts.googleapis.com/css2?family=Tiro+Bangla&display=swap" rel="stylesheet"><style>body{font-family:'Tiro Bangla',serif;padding:24px;color:#111}table{width:100%;border-collapse:collapse;margin-bottom:12px}td,th{border:1px solid #999;padding:6px;text-align:left}.r{text-align:right}h1{margin:0}.sum td{font-weight:bold}</style></head><body>
<h1>কৃষক বন্ধু — আয়-ব্যয় রিপোর্ট</h1><p>ফসল: <b>${esc(cropType)}</b> · তারিখ: ${formatBnDate(new Date().toISOString().slice(0, 10))}</p>
${table("capital")}${table("expense")}${table("income")}
<h3>সারসংক্ষেপ</h3><table class="sum"><tr><td>মূলধন</td><td class="r">${fmtBdt(totals.capital)}</td></tr><tr><td>মোট ব্যয়</td><td class="r">${fmtBdt(totals.expense)}</td></tr><tr><td>মোট আয়</td><td class="r">${fmtBdt(totals.income)}</td></tr><tr><td>নীট ${profit >= 0 ? "লাভ" : "ক্ষতি"}</td><td class="r">${fmtBdt(Math.abs(profit))}</td></tr></table>
<p style="margin-top:48px">স্বাক্ষর: ____________________</p><script>setTimeout(()=>print(),600)</script></body></html>`);
    w.document.close();
  }

  return (
    <section className="px-5 mt-5 sticky top-0 z-30">
      <div className="bg-white rounded-2xl shadow-md ring-1 ring-emerald-100 overflow-hidden">
        {/* Always-visible collapsed bar */}
        <button onClick={() => setOpen((o) => !o)} className="w-full px-4 py-3 flex items-center justify-between gap-2 text-left">
          <span className="inline-flex items-center gap-2 text-base font-bold text-gray-900 min-w-0">
            <Wallet className="h-5 w-5 text-emerald-600 shrink-0" />
            <span className="truncate">এই ফসলের আয়ব্যয় রাখুন</span>
          </span>
          <span className="inline-flex items-center gap-2 shrink-0">
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${profit >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
              নীট {profit >= 0 ? "লাভ" : "ক্ষতি"} {fmtBdt(Math.abs(profit))}
            </span>
            {open ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
          </span>
        </button>

        {open && (
          <div className="px-4 pb-4">
            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
              <div className="rounded-xl bg-sky-50 p-2">মূলধন<br /><b className="text-base">{fmtBdt(totals.capital)}</b></div>
              <div className="rounded-xl bg-rose-50 p-2">মোট ব্যয়<br /><b className="text-base">{fmtBdt(totals.expense)}</b></div>
              <div className="rounded-xl bg-emerald-50 p-2">মোট আয়<br /><b className="text-base">{fmtBdt(totals.income)}</b></div>
              <div className={`rounded-xl p-2 ${profit >= 0 ? "bg-emerald-100" : "bg-rose-100"}`}>নীট {profit >= 0 ? "লাভ" : "ক্ষতি"}<br /><b className="text-base">{fmtBdt(Math.abs(profit))}</b></div>
            </div>

            {/* Type tabs */}
            <div className="flex gap-2 mb-3">
              {(["capital", "expense", "income"] as EntryType[]).map((t) => (
                <button key={t} onClick={() => { setTab(t); setPick(""); setCustomTitle(""); }}
                  className={`flex-1 py-1.5 rounded-full text-xs font-bold ring-1 transition ${tab === t ? "bg-emerald-600 text-white ring-emerald-600" : "bg-gray-50 text-gray-700 ring-gray-200"}`}>
                  {LABEL[t]} ({toBn(rows.filter((r) => r.entry_type === t).length)})
                </button>
              ))}
            </div>

            {isLoading ? <p className="text-sm text-gray-500">লোড হচ্ছে…</p> : tabRows.length === 0 ? (
              <p className="text-sm text-gray-500 py-2">এই খাতে এখনো কিছু নেই — নিচ থেকে যোগ করুন।</p>
            ) : tabRows.map((r) => (
              <div key={r.id} className="flex items-center gap-2 py-1.5 border-b border-gray-100">
                <span className="flex-1 text-sm text-gray-700 truncate">{r.title}</span>
                <input type="number" min={0} defaultValue={Number(r.amount) || ""} placeholder="৳ ০"
                  onBlur={(e) => updateAmount(r, e.target.value)}
                  className="w-24 rounded-lg border border-gray-200 px-2 py-1 text-sm text-right" />
                <button onClick={() => remove(r.id)} aria-label="মুছুন" className="text-gray-400 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}

            {/* Add item: dropdown select or custom name */}
            <div className="mt-3 rounded-xl bg-gray-50 p-3 space-y-2">
              <p className="text-sm font-semibold text-gray-800">নতুন {LABEL[tab]} যোগ করুন</p>
              <select value={pick} onChange={(e) => setPick(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm">
                <option value="">— তালিকা থেকে নির্বাচন করুন —</option>
                {SUGGESTIONS[tab].map((s) => <option key={s} value={s}>{s}</option>)}
                <option value={CUSTOM}>অন্য কিছু (নিজে নাম লিখুন)</option>
              </select>
              {pick === CUSTOM && (
                <input value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} maxLength={80} placeholder="আইটেমের নাম" className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm" />
              )}
              <div className="flex gap-2">
                <input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="টাকা" className="flex-1 min-w-0 rounded-lg border border-gray-200 px-2 py-1.5 text-sm" />
                <button onClick={add} className="inline-flex items-center gap-1 px-4 rounded-lg bg-emerald-600 text-white text-sm font-bold shrink-0"><Plus className="h-4 w-4" /> যোগ</button>
              </div>
            </div>

            <button onClick={printReport} className="mt-3 w-full inline-flex items-center justify-center gap-1 py-2 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold ring-1 ring-emerald-200">
              <Printer className="h-4 w-4" /> প্রিন্ট / PDF
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
