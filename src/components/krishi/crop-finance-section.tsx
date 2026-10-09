import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Printer, Wallet, ChevronDown, ChevronUp, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fmtBdt, toBn } from "@/lib/bn";
import { formatBnDate } from "@/lib/bn-date";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type EntryType = "capital" | "expense" | "income";
type Entry = { id: string; entry_type: EntryType; title: string; amount: number; entry_date: string; note: string | null };

const LABEL: Record<EntryType, string> = { capital: "মূলধন", expense: "ব্যয়", income: "আয়" };
const SUGGESTIONS: Record<EntryType, string[]> = {
  capital: ["নিজস্ব মূলধন", "ঋণ/ধার"],
  expense: ["জমি চাষ/হালচাষ", "বীজ/চারা", "সার", "কীটনাশক/বালাইনাশক", "সেচ", "শ্রমিক মজুরি", "জমি লিজ/ভাড়া", "পরিবহন", "মাচা/সাপোর্ট", "বীজতলা তৈরি"],
  income: ["ফসল বিক্রি", "পাশাপাশি ফসল বিক্রি", "বীজ/চারা বিক্রি"],
};
const CUSTOM = "__custom";
const PAGE = 5;

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

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
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<EntryType>("expense");
  const [pick, setPick] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [entryDate, setEntryDate] = useState(todayIso());
  const [delTarget, setDelTarget] = useState<Entry | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");
  const [showCount, setShowCount] = useState(PAGE);

  const totals = useMemo(() => {
    const t = { capital: 0, expense: 0, income: 0 };
    rows.forEach((r) => (t[r.entry_type] += Number(r.amount)));
    return t;
  }, [rows]);
  const profit = totals.income - totals.expense;
  const tabRows = rows.filter((r) => r.entry_type === tab);
  const visibleRows = tabRows.slice(0, showCount);

  async function saveEdit(r: Entry) {
    const amt = Math.max(0, Number(editAmount) || 0);
    const date = editDate || r.entry_date;
    if (amt === Number(r.amount) && date === r.entry_date) { setEditId(null); return; }
    const { error } = await supabase.from("crop_plan_finances").update({ amount: amt, entry_date: date }).eq("id", r.id);
    if (error) return toast.error("সংরক্ষণ ব্যর্থ");
    setEditId(null);
    qc.invalidateQueries({ queryKey: key });
    toast.success("আপডেট হয়েছে");
  }
  async function add() {
    const title = (pick === CUSTOM ? customTitle : pick).trim();
    if (!title) return toast.error("তালিকা থেকে নির্বাচন করুন বা নিজের নাম লিখুন");
    const { error } = await supabase.from("crop_plan_finances").insert({ user_id: userId, plan_id: planId, entry_type: tab, title: title.slice(0, 80), amount: Math.max(0, Number(amount) || 0), entry_date: entryDate || todayIso() });
    if (error) return toast.error("যোগ করা যায়নি");
    setPick(""); setCustomTitle(""); setAmount(""); setEntryDate(todayIso());
    qc.invalidateQueries({ queryKey: key });
    toast.success("যোগ হয়েছে");
  }
  async function remove(id: string) {
    const { error } = await supabase.from("crop_plan_finances").delete().eq("id", id);
    if (error) return toast.error("মুছে ফেলা যায়নি");
    setDelTarget(null);
    qc.invalidateQueries({ queryKey: key });
    toast.success("মুছে ফেলা হয়েছে");
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
            <span className="truncate">এই ফসলের আয়-ব্যয় রাখুন</span>
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
                <button key={t} onClick={() => { setTab(t); setPick(""); setCustomTitle(""); setEditId(null); setShowCount(PAGE); }}
                  className={`flex-1 py-1.5 rounded-full text-xs font-bold ring-1 transition ${tab === t ? "bg-emerald-600 text-white ring-emerald-600" : "bg-gray-50 text-gray-700 ring-gray-200"}`}>
                  {LABEL[t]} ({toBn(rows.filter((r) => r.entry_type === t).length)})
                </button>
              ))}
            </div>

            {/* Add item: dropdown select or custom name */}
            <div className="mb-3 rounded-xl bg-gray-50 p-3 space-y-2">
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
                <input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="টাকা" className="flex-[2] min-w-0 rounded-lg border border-gray-200 px-2 py-1.5 text-sm" />
                <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className="w-[6.5rem] shrink-0 rounded-lg border border-gray-200 px-1 py-1.5 text-xs" />
                <button onClick={add} className="inline-flex items-center gap-1 px-3 rounded-lg bg-emerald-600 text-white text-sm font-bold shrink-0"><Plus className="h-4 w-4" /> যোগ</button>
              </div>
            </div>
            {isLoading ? <p className="text-sm text-gray-500">লোড হচ্ছে…</p> : tabRows.length === 0 ? (
              <p className="text-sm text-gray-500 py-2">এই খাতে এখনো কিছু নেই — উপর থেকে যোগ করুন।</p>
            ) : (
              <>
                {visibleRows.map((r) => (
                  <div key={r.id} className="py-1.5 border-b border-gray-100">
                    {editId === r.id ? (
                      <div className="space-y-1.5">
                        <p className="text-sm font-semibold text-gray-800 truncate">{r.title}</p>
                        <div className="flex items-center gap-2">
                          <input type="number" min={0} value={editAmount} onChange={(e) => setEditAmount(e.target.value)} placeholder="টাকা"
                            className="w-24 rounded-lg border border-gray-200 px-2 py-1 text-sm text-right" />
                          <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)}
                            className="flex-1 min-w-0 rounded-lg border border-gray-200 px-2 py-1 text-sm" />
                          <button onClick={() => saveEdit(r)} aria-label="সংরক্ষণ" className="text-emerald-600 hover:text-emerald-700"><Check className="h-4 w-4" /></button>
                          <button onClick={() => setEditId(null)} aria-label="বাতিল" className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-700 truncate">{r.title}</p>
                          <p className="text-[11px] text-gray-400">{formatBnDate(r.entry_date)}</p>
                        </div>
                        <span className="text-sm font-bold text-gray-900 shrink-0">{fmtBdt(Number(r.amount))}</span>
                        <button onClick={() => { setEditId(r.id); setEditAmount(String(Number(r.amount) || "")); setEditDate(r.entry_date); }} aria-label="এডিট" className="text-gray-400 hover:text-emerald-600 shrink-0"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => setDelTarget(r)} aria-label="মুছুন" className="text-gray-400 hover:text-rose-600 shrink-0"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    )}
                  </div>
                ))}
                {tabRows.length > showCount && (
                  <button onClick={() => setShowCount((c) => c + PAGE)} className="mt-2 w-full inline-flex items-center justify-center gap-1 py-1.5 rounded-full bg-gray-50 text-gray-600 text-xs font-bold ring-1 ring-gray-200">
                    <ChevronDown className="h-3.5 w-3.5" /> আরও {toBn(Math.min(PAGE, tabRows.length - showCount))}টি দেখুন (মোট {toBn(tabRows.length)}টি)
                  </button>
                )}
              </>
            )}


            <button onClick={printReport} className="mt-3 w-full inline-flex items-center justify-center gap-1 py-2 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold ring-1 ring-emerald-200">
              <Printer className="h-4 w-4" /> প্রিন্ট / PDF
            </button>
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!delTarget} onOpenChange={(o) => !o && setDelTarget(null)}>
        <AlertDialogContent className="max-w-sm rounded-2xl p-5">
          <AlertDialogHeader className="items-center text-center space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100">
              <Trash2 className="h-6 w-6 text-rose-600" />
            </div>
            <AlertDialogTitle className="text-base font-bold text-gray-900">আপনি কি নিশ্চিত মুছে ফেলতে চান?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500">
              <span className="font-bold text-gray-700">“{delTarget?.title}”</span> আইটেমটি{delTarget && Number(delTarget.amount) > 0 ? <> এবং এতে লেখা <span className="font-bold text-gray-700">{fmtBdt(Number(delTarget.amount))}</span> টাকাও</> : null} হিসাব থেকে মুছে যাবে। এটি আর ফেরানো যাবে না।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2 sm:justify-center">
            <AlertDialogCancel className="flex-1 mt-0 rounded-full border-gray-200 bg-gray-50 text-gray-700 font-bold">বাতিল</AlertDialogCancel>
            <AlertDialogAction onClick={() => remove(delTarget!.id)} className="flex-1 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold">মুছে ফেলুন</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
