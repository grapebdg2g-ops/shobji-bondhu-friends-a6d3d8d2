import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Printer, Wallet } from "lucide-react";
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
  const [form, setForm] = useState<{ type: EntryType; title: string; amount: string }>({ type: "expense", title: "", amount: "" });

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

  async function updateAmount(r: Entry, v: string) {
    const amount = Math.max(0, Number(v) || 0);
    if (amount === Number(r.amount)) return;
    const { error } = await supabase.from("crop_plan_finances").update({ amount }).eq("id", r.id);
    if (error) return toast.error("সংরক্ষণ ব্যর্থ");
    qc.invalidateQueries({ queryKey: key });
  }
  async function add() {
    const title = form.title.trim();
    if (!title) return toast.error("আইটেমের নাম লিখুন");
    const { error } = await supabase.from("crop_plan_finances").insert({ user_id: userId, plan_id: planId, entry_type: form.type, title: title.slice(0, 80), amount: Math.max(0, Number(form.amount) || 0) });
    if (error) return toast.error("যোগ করা যায়নি");
    setForm({ ...form, title: "", amount: "" });
    qc.invalidateQueries({ queryKey: key });
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
    <section className="px-5 mt-5">
      <div className="bg-white rounded-2xl p-4 shadow-sm ring-1 ring-emerald-100">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-900 inline-flex items-center gap-2"><Wallet className="h-5 w-5 text-emerald-600" /> আয়-ব্যয়ের খাতা</h2>
          <button onClick={printReport} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold ring-1 ring-emerald-200">
            <Printer className="h-4 w-4" /> প্রিন্ট / PDF
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs mb-4">
          <div className="rounded-xl bg-sky-50 p-2">মূলধন<br /><b className="text-base">{fmtBdt(totals.capital)}</b></div>
          <div className="rounded-xl bg-rose-50 p-2">মোট ব্যয়<br /><b className="text-base">{fmtBdt(totals.expense)}</b></div>
          <div className="rounded-xl bg-emerald-50 p-2">মোট আয়<br /><b className="text-base">{fmtBdt(totals.income)}</b></div>
          <div className={`rounded-xl p-2 ${profit >= 0 ? "bg-emerald-100" : "bg-rose-100"}`}>নীট {profit >= 0 ? "লাভ" : "ক্ষতি"}<br /><b className="text-base">{fmtBdt(Math.abs(profit))}</b></div>
        </div>
        {isLoading ? <p className="text-sm text-gray-500">লোড হচ্ছে…</p> : (["capital", "expense", "income"] as EntryType[]).map((t) => (
          <div key={t} className="mb-3">
            <p className="text-sm font-bold text-gray-800 mb-1">{LABEL[t]} ({toBn(rows.filter((r) => r.entry_type === t).length)})</p>
            {rows.filter((r) => r.entry_type === t).map((r) => (
              <div key={r.id} className="flex items-center gap-2 py-1 border-b border-gray-100">
                <span className="flex-1 text-sm text-gray-700 truncate">{r.title}</span>
                <input type="number" min={0} defaultValue={Number(r.amount) || ""} placeholder="৳ ০"
                  onBlur={(e) => updateAmount(r, e.target.value)}
                  className="w-24 rounded-lg border border-gray-200 px-2 py-1 text-sm text-right" />
                <button onClick={() => remove(r.id)} aria-label="মুছুন" className="text-gray-400 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        ))}
        <div className="mt-3 rounded-xl bg-gray-50 p-3 space-y-2">
          <p className="text-sm font-semibold text-gray-800">নতুন আইটেম যোগ করুন</p>
          <div className="flex gap-2">
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as EntryType })} className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm">
              <option value="expense">ব্যয়</option><option value="income">আয়</option><option value="capital">মূলধন</option>
            </select>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={80} placeholder="আইটেমের নাম" className="flex-1 min-w-0 rounded-lg border border-gray-200 px-2 py-1.5 text-sm" />
          </div>
          <div className="flex gap-2">
            <input type="number" min={0} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="টাকা" className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm" />
            <button onClick={add} className="inline-flex items-center gap-1 px-4 rounded-lg bg-emerald-600 text-white text-sm font-bold"><Plus className="h-4 w-4" /> যোগ</button>
          </div>
        </div>
      </div>
    </section>
  );
}
