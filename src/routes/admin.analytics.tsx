import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import { Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getCacheStats } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { toBn, fmtBdt } from "@/lib/bn";
import { subDays } from "date-fns";

export const Route = createFileRoute("/admin/analytics")({ component: AnalyticsPage });

type Range = "1" | "7" | "30";

function AnalyticsPage() {
  const [range, setRange] = useState<Range>("30");
  const since = useMemo(() => subDays(new Date(), Number(range)).toISOString(), [range]);

  const { data: districts = [] } = useQuery({
    queryKey: ["admin", "analytics", "districts", range],
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select("district")
        .gte("created_at", since)
        .limit(2000);
      const c: Record<string, number> = {};
      (data ?? []).forEach((r) => {
        if (r.district) c[r.district] = (c[r.district] ?? 0) + 1;
      });
      return Object.entries(c)
        .map(([d, n]) => ({ district: d, count: n }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["admin", "analytics", "products", range],
    queryFn: async () => {
      const { data } = await supabase
        .from("prices")
        .select("product_name")
        .gte("created_at", since)
        .limit(2000);
      const c: Record<string, number> = {};
      (data ?? []).forEach((r) => {
        if (r.product_name) c[r.product_name] = (c[r.product_name] ?? 0) + 1;
      });
      return Object.entries(c)
        .map(([p, n]) => ({ product: p, count: n }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    },
  });

  const { data: diseases = [] } = useQuery({
    queryKey: ["admin", "analytics", "diseases", range],
    queryFn: async () => {
      const { data } = await supabase
        .from("disease_history")
        .select("disease_name, crop_type")
        .gte("created_at", since)
        .limit(2000);
      const c: Record<string, number> = {};
      (data ?? []).forEach((r) => {
        if (r.disease_name) c[r.disease_name] = (c[r.disease_name] ?? 0) + 1;
      });
      return Object.entries(c)
        .map(([d, n]) => ({ disease: d, count: n }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    },
  });

  const { data: retention } = useQuery({
    queryKey: ["admin", "analytics", "retention"],
    queryFn: async () => {
      const w1 = subDays(new Date(), 14).toISOString();
      const w1end = subDays(new Date(), 7).toISOString();
      const { data: cohort } = await supabase
        .from("profiles")
        .select("id, created_at")
        .gte("created_at", w1)
        .lt("created_at", w1end);
      const ids = (cohort ?? []).map((c) => c.id);
      if (!ids.length) return { week1: 0, total: 0 };
      const { data: active } = await supabase
        .from("posts")
        .select("user_id")
        .gte("created_at", w1end)
        .in("user_id", ids);
      const returned = new Set((active ?? []).map((a) => a.user_id)).size;
      return { week1: Math.round((returned / ids.length) * 100), total: ids.length };
    },
  });
  const { data: predictionPerf } = useQuery({
    queryKey: ["admin", "analytics", "predictions", range],
    queryFn: async () => {
      const { data } = await supabase
        .from("price_predictions")
        .select("product_name, was_correct, checked_at")
        .gte("created_at", since)
        .limit(5000);
      const rows = data ?? [];
      const total = rows.length;
      const checked = rows.filter((r) => r.was_correct !== null);
      const correct = checked.filter((r) => r.was_correct === true).length;
      const accuracy = checked.length > 0 ? Math.round((correct / checked.length) * 100) : 0;

      const byProduct: Record<string, { total: number; correct: number; checked: number }> = {};
      for (const r of rows) {
        const p = r.product_name;
        if (!byProduct[p]) byProduct[p] = { total: 0, correct: 0, checked: 0 };
        byProduct[p].total += 1;
        if (r.was_correct !== null) {
          byProduct[p].checked += 1;
          if (r.was_correct) byProduct[p].correct += 1;
        }
      }
      const productStats = Object.entries(byProduct).map(([product, s]) => ({
        product,
        total: s.total,
        accuracy: s.checked > 0 ? Math.round((s.correct / s.checked) * 100) : null,
        checked: s.checked,
      }));
      const requested = [...productStats].sort((a, b) => b.total - a.total).slice(0, 5);
      const checkedOnly = productStats.filter((p) => p.accuracy !== null && p.checked >= 2);
      const best = [...checkedOnly]
        .sort((a, b) => (b.accuracy ?? 0) - (a.accuracy ?? 0))
        .slice(0, 5);
      const worst = [...checkedOnly]
        .sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0))
        .slice(0, 5);
      return { total, checked: checked.length, accuracy, requested, best, worst };
    },
  });

  const cacheStatsFn = useServerFn(getCacheStats);
  const { data: cacheStats } = useQuery({
    queryKey: ["admin", "analytics", "cache"],
    queryFn: () => cacheStatsFn(),
  });

  const exportCsv = (rows: Array<Record<string, unknown>>, name: string) => {
    if (!rows.length) return;
    const keys = Object.keys(rows[0]);
    const csv = [
      keys.join(","),
      ...rows.map((r) => keys.map((k) => JSON.stringify(r[k] ?? "")).join(",")),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-2">
        <p className="font-bold text-sm pl-2">Analytics</p>
        <div className="flex gap-1">
          {(["1", "7", "30"] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold ${range === r ? "bg-purple-600 text-white" : "text-gray-700"}`}
            >
              {r === "1" ? "আজ" : `${toBn(r)} দিন`}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Stat
          label="১ম সপ্তাহে ফিরে আসা"
          value={`${toBn(retention?.week1 ?? 0)}%`}
          sub={`কোহোর্ট: ${toBn(retention?.total ?? 0)} জন`}
        />
        <Stat label="সক্রিয় জেলা" value={toBn(districts.length)} />
        <Stat label="MRR (Revenue)" value={fmtBdt(0)} sub="Pro শীঘ্রই" />
      </div>

      <Card title="সক্রিয় জেলা (টপ ১০)" onExport={() => exportCsv(districts, "districts")}>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={districts}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="district" fontSize={10} angle={-25} textAnchor="end" height={60} />
            <YAxis fontSize={10} />
            <Tooltip />
            <Bar dataKey="count" fill="#16a34a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card title="জনপ্রিয় পণ্য (দাম আপডেট)" onExport={() => exportCsv(products, "products")}>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={products}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="product" fontSize={10} />
            <YAxis fontSize={10} />
            <Tooltip />
            <Bar dataKey="count" fill="#0284c7" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card title="শীর্ষ ৫ রোগ" onExport={() => exportCsv(diseases, "diseases")}>
        <ul className="divide-y divide-gray-100">
          {diseases.map((d) => (
            <li key={d.disease} className="py-2 flex justify-between text-sm">
              <span>{d.disease}</span>
              <span className="font-bold">{toBn(d.count)}</span>
            </li>
          ))}
          {diseases.length === 0 && (
            <li className="py-4 text-center text-gray-400 text-sm">তথ্য নেই</li>
          )}
        </ul>
      </Card>

      <Card title="🤖 AI পূর্বাভাস পারফরম্যান্স">
        <div className="grid grid-cols-3 gap-2 mb-3">
          <MiniStat label="মোট পূর্বাভাস" value={toBn(predictionPerf?.total ?? 0)} />
          <MiniStat label="যাচাই হয়েছে" value={toBn(predictionPerf?.checked ?? 0)} />
          <MiniStat label="নির্ভুলতা" value={`${toBn(predictionPerf?.accuracy ?? 0)}%`} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <PredList
            title="সবচেয়ে অনুরোধকৃত"
            rows={predictionPerf?.requested ?? []}
            field="total"
          />
          <PredList
            title="✅ সবচেয়ে সঠিক"
            rows={predictionPerf?.best ?? []}
            field="accuracy"
            suffix="%"
          />
          <PredList
            title="❌ সবচেয়ে ভুল"
            rows={predictionPerf?.worst ?? []}
            field="accuracy"
            suffix="%"
          />
        </div>
      </Card>

      <Card title="🗄️ AI Cache পরিসংখ্যান">
        {(() => {
          const total = cacheStats?.total ?? 0;
          const active = cacheStats?.active ?? 0;
          const hits = cacheStats?.totalHits ?? 0;
          const totalReq = hits + active;
          const hitRate = totalReq > 0 ? Math.round((hits / totalReq) * 100) : 0;
          const tokensSaved = hits * 350;
          return (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                <MiniStat label="মোট Cache" value={`${toBn(active)} টি`} />
                <MiniStat label="মোট Hit" value={`${toBn(hits)} বার`} />
                <MiniStat label="Hit Rate" value={`${toBn(hitRate)}%`} />
                <MiniStat label="Token সাশ্রয়" value={`~${toBn(tokensSaved)}`} />
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <MiniStat label="👍 সহায়ক" value={toBn(cacheStats?.helpful ?? 0)} />
                <MiniStat label="👎 সহায়ক নয়" value={toBn(cacheStats?.unhelpful ?? 0)} />
              </div>

              <p className="text-xs font-bold text-gray-600 mb-1">বিভাগ অনুযায়ী</p>
              <ul className="mb-3 space-y-1">
                {(cacheStats?.byCategory ?? []).map((c) => {
                  const pct = active > 0 ? Math.round((c.count / active) * 100) : 0;
                  return (
                    <li key={c.category} className="flex items-center gap-2 text-xs">
                      <span className="w-24 truncate">{c.category}</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded">
                        <div className="h-2 bg-purple-500 rounded" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-16 text-right font-bold">
                        {toBn(pct)}% ({toBn(c.count)})
                      </span>
                    </li>
                  );
                })}
                {(cacheStats?.byCategory?.length ?? 0) === 0 && (
                  <li className="text-[11px] text-gray-400 py-2 text-center">তথ্য নেই</li>
                )}
              </ul>

              <p className="text-xs font-bold text-gray-600 mb-1">শীর্ষ প্রশ্ন (সর্বাধিক hit)</p>
              <ul className="space-y-1">
                {(cacheStats?.topQuestions ?? []).map((q, idx) => (
                  <li key={q.id} className="flex justify-between text-xs gap-2">
                    <span className="truncate">
                      {toBn(idx + 1)}. {q.question}
                    </span>
                    <span className="font-bold shrink-0">{toBn(q.hit_count)} বার</span>
                  </li>
                ))}
                {(cacheStats?.topQuestions?.length ?? 0) === 0 && (
                  <li className="text-[11px] text-gray-400 py-2 text-center">তথ্য নেই</li>
                )}
              </ul>
            </>
          );
        })()}
      </Card>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3">
      <p className="text-xs font-semibold text-gray-500">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {sub && <p className="text-[11px] text-gray-500">{sub}</p>}
    </div>
  );
}

function Card({
  title,
  children,
  onExport,
}: {
  title: string;
  children: React.ReactNode;
  onExport?: () => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-bold">{title}</h3>
        {onExport && (
          <Button size="sm" variant="outline" onClick={onExport}>
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
        )}
      </div>
      {children}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-2 text-center">
      <p className="text-[10px] font-semibold text-gray-500">{label}</p>
      <p className="text-lg font-extrabold leading-none mt-0.5">{value}</p>
    </div>
  );
}

type PredRow = { product: string; total: number; accuracy: number | null; checked: number };
function PredList({
  title,
  rows,
  field,
  suffix,
}: {
  title: string;
  rows: PredRow[];
  field: "total" | "accuracy";
  suffix?: string;
}) {
  return (
    <div className="border border-gray-100 rounded-lg p-2">
      <p className="text-xs font-bold text-gray-600 mb-1">{title}</p>
      {rows.length === 0 ? (
        <p className="text-[11px] text-gray-400 py-2 text-center">তথ্য নেই</p>
      ) : (
        <ul className="space-y-1">
          {rows.map((r) => {
            const v = field === "total" ? r.total : r.accuracy;
            return (
              <li key={r.product} className="flex justify-between text-xs">
                <span className="truncate">{r.product}</span>
                <span className="font-bold ml-2">
                  {toBn(v ?? 0)}
                  {suffix ?? ""}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
