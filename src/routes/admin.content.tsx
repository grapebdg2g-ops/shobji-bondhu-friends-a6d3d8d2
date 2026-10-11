import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toBn } from "@/lib/bn";
import { format } from "date-fns";

export const Route = createFileRoute("/admin/content")({ component: ContentPage });

type Tab = "post" | "exchange" | "price";
const TAB_LABEL: Record<Tab, string> = { post: "পোস্ট", exchange: "বিনিময়", price: "দাম আপডেট" };
const TAB_TABLE: Record<Tab, "posts" | "exchanges" | "prices"> = {
  post: "posts",
  exchange: "exchanges",
  price: "prices",
};

function ContentPage() {
  const [tab, setTab] = useState<Tab>("post");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const qc = useQueryClient();

  const { data: reports = [] } = useQuery({
    queryKey: ["admin", "content", "reports", tab],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_reports")
        .select("id, content_id, reason, status, created_at")
        .eq("content_type", tab)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  const reportedIds = useMemo(() => {
    const m = new Map<string, { count: number; reasons: string[] }>();
    reports.forEach((r) => {
      if (!r.content_id) return;
      const cur = m.get(r.content_id) ?? { count: 0, reasons: [] };
      cur.count++;
      cur.reasons.push(r.reason);
      m.set(r.content_id, cur);
    });
    return m;
  }, [reports]);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["admin", "content", "items", tab],
    queryFn: async () => {
      const table = TAB_TABLE[tab];
      const fields =
        tab === "post"
          ? "id, content, user_name, district, created_at"
          : tab === "exchange"
            ? "id, title, user_name, district, created_at"
            : "id, product_name, price, user_name, district, created_at";
      const { data } = await supabase
        .from(table)
        .select(fields)
        .order("created_at", { ascending: false })
        .limit(100);
      return (data ?? []) as unknown as Array<Record<string, unknown>>;
    },
  });

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      const ra = reportedIds.get(a.id as string)?.count ?? 0;
      const rb = reportedIds.get(b.id as string)?.count ?? 0;
      return rb - ra;
    });
  }, [items, reportedIds]);

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TAB_TABLE[tab]).delete().eq("id", id);
      if (error) throw error;
      await supabase
        .from("user_reports")
        .update({ status: "actioned" })
        .eq("content_type", tab)
        .eq("content_id", id);
    },
    onSuccess: () => {
      toast.success("মুছে ফেলা হয়েছে");
      qc.invalidateQueries({ queryKey: ["admin", "content"] });
    },
    onError: () => toast.error("ব্যর্থ"),
  });

  const dismissReports = useMutation({
    mutationFn: async (contentId: string) => {
      await supabase
        .from("user_reports")
        .update({ status: "dismissed" })
        .eq("content_type", tab)
        .eq("content_id", contentId);
    },
    onSuccess: () => {
      toast.success("রিপোর্ট খারিজ");
      qc.invalidateQueries({ queryKey: ["admin", "content"] });
    },
  });

  const bulkDelete = async () => {
    for (const id of selected) await deleteItem.mutateAsync(id);
    setSelected(new Set());
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-200 p-1 w-fit">
        {(Object.keys(TAB_LABEL) as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setSelected(new Set());
            }}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold ${tab === t ? "bg-purple-600 text-white" : "text-gray-700"}`}
          >
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>

      {selected.size > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-2 flex items-center justify-between">
          <p className="text-sm font-semibold">{toBn(selected.size)} নির্বাচিত</p>
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" onClick={bulkDelete}>
              সব মুছুন
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSelected(new Set())}>
              বাতিল
            </Button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {isLoading && (
          <div className="p-3">
            <Skeleton className="h-20 w-full" />
          </div>
        )}
        {!isLoading && sorted.length === 0 && (
          <p className="text-center text-gray-400 py-10 text-sm">কোনো কন্টেন্ট নেই</p>
        )}
        {sorted.map((it) => {
          const id = it.id as string;
          const rep = reportedIds.get(id);
          const checked = selected.has(id);
          return (
            <div key={id} className="p-3 flex items-start gap-3">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => {
                  const s = new Set(selected);
                  if (e.target.checked) s.add(id);
                  else s.delete(id);
                  setSelected(s);
                }}
                className="mt-1"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {rep && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-300">
                      <AlertCircle className="h-3 w-3 inline" /> {toBn(rep.count)} রিপোর্ট
                    </span>
                  )}
                  <p className="text-xs text-gray-500">
                    {String(it.user_name || "—")} • {String(it.district || "—")} •{" "}
                    {format(new Date(it.created_at as string), "d MMM")}
                  </p>
                </div>
                <p className="mt-1 text-sm text-gray-800 line-clamp-2">
                  {String(it.content || it.title || `${it.product_name} — ৳${it.price}`)}
                </p>
                {rep && (
                  <p className="text-[11px] text-red-600 mt-0.5">কারণ: {rep.reasons.join(", ")}</p>
                )}
              </div>
              <div className="flex flex-col gap-1">
                {rep && (
                  <Button size="sm" variant="outline" onClick={() => dismissReports.mutate(id)}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> ঠিক আছে
                  </Button>
                )}
                <Button size="sm" variant="destructive" onClick={() => deleteItem.mutate(id)}>
                  <Trash2 className="h-3.5 w-3.5" /> মুছুন
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
