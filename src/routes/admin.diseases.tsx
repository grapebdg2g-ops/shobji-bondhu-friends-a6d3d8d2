import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { toBn } from "@/lib/bn";
import { format } from "date-fns";
import { Bug, Search } from "lucide-react";

export const Route = createFileRoute("/admin/diseases")({ component: DiseasesPage });

type Severity = "all" | "low" | "medium" | "high";

function DiseasesPage() {
  const [q, setQ] = useState("");
  const [sev, setSev] = useState<Severity>("all");
  const [crop, setCrop] = useState<string>("all");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin", "diseases", sev, crop],
    queryFn: async () => {
      let query = supabase
        .from("disease_history")
        .select("id, user_id, crop_type, disease_name, severity, image_url, created_at")
        .order("created_at", { ascending: false })
        .limit(300);
      if (sev !== "all") query = query.eq("severity", sev);
      if (crop !== "all") query = query.eq("crop_type", crop);
      const { data } = await query;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter(
      (r) => r.disease_name?.toLowerCase().includes(t) || r.crop_type?.toLowerCase().includes(t),
    );
  }, [rows, q]);

  const crops = useMemo(() => {
    const s = new Set(rows.map((r) => r.crop_type).filter(Boolean));
    return Array.from(s);
  }, [rows]);

  const stats = useMemo(() => {
    const total = rows.length;
    const high = rows.filter((r) => r.severity === "high").length;
    const med = rows.filter((r) => r.severity === "medium").length;
    const low = rows.filter((r) => r.severity === "low").length;
    return { total, high, med, low };
  }, [rows]);

  const sevColor = (s: string) =>
    s === "high"
      ? "bg-red-100 text-red-700 border-red-300"
      : s === "medium"
        ? "bg-amber-100 text-amber-700 border-amber-300"
        : "bg-emerald-100 text-emerald-700 border-emerald-300";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Bug className="h-5 w-5 text-purple-600" /> রোগ শনাক্ত লগ
        </h1>
        <p className="text-xs text-gray-500">সব ব্যবহারকারীর রোগ নির্ণয়ের ইতিহাস</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { label: "মোট", v: stats.total, c: "text-gray-900" },
          { label: "উচ্চ", v: stats.high, c: "text-red-600" },
          { label: "মাঝারি", v: stats.med, c: "text-amber-600" },
          { label: "নিম্ন", v: stats.low, c: "text-emerald-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-3">
            <p className="text-[11px] text-gray-500 font-semibold">{s.label}</p>
            <p className={`text-2xl font-bold ${s.c}`}>{toBn(s.v)}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="রোগ বা ফসল খুঁজুন"
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg"
          />
        </div>
        <select
          value={sev}
          onChange={(e) => setSev(e.target.value as Severity)}
          className="text-sm border border-gray-200 rounded-lg px-2 py-2"
        >
          <option value="all">সব মাত্রা</option>
          <option value="high">উচ্চ</option>
          <option value="medium">মাঝারি</option>
          <option value="low">নিম্ন</option>
        </select>
        <select
          value={crop}
          onChange={(e) => setCrop(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-2 py-2"
        >
          <option value="all">সব ফসল</option>
          {crops.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {isLoading && (
          <div className="p-3">
            <Skeleton className="h-24 w-full" />
          </div>
        )}
        {!isLoading && filtered.length === 0 && (
          <p className="text-center text-gray-400 py-10 text-sm">কোনো রেকর্ড নেই</p>
        )}
        {filtered.map((r) => (
          <div key={r.id} className="p-3 flex items-start gap-3">
            {r.image_url ? (
              <img
                src={r.image_url}
                alt={r.disease_name}
                className="h-14 w-14 rounded-lg object-cover bg-gray-100 shrink-0"
              />
            ) : (
              <div className="h-14 w-14 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                <Bug className="h-5 w-5 text-gray-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-sm text-gray-900 truncate">{r.disease_name}</p>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border ${sevColor(r.severity)}`}
                >
                  {r.severity === "high" ? "উচ্চ" : r.severity === "medium" ? "মাঝারি" : "নিম্ন"}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {r.crop_type} • {format(new Date(r.created_at), "d MMM, HH:mm")}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
