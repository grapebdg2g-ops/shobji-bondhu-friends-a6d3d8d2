import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { TrendingUp, Trash2, Search } from "lucide-react";
import { toBn, fmtBdt } from "@/lib/bn";
import { format } from "date-fns";

export const Route = createFileRoute("/admin/prices")({ component: PricesPage });

function PricesPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [district, setDistrict] = useState("all");
  const [category, setCategory] = useState("all");

  const { data: prices = [], isLoading } = useQuery({
    queryKey: ["admin", "prices", district, category],
    queryFn: async () => {
      let query = supabase
        .from("prices")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);
      if (district !== "all") query = query.eq("district", district);
      if (category !== "all") query = query.eq("category", category);
      const { data } = await query;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return prices;
    return prices.filter(
      (p) =>
        p.product_name?.toLowerCase().includes(t) ||
        p.market_name?.toLowerCase().includes(t) ||
        p.user_name?.toLowerCase().includes(t),
    );
  }, [prices, q]);

  const districts = useMemo(
    () => Array.from(new Set(prices.map((p) => p.district).filter(Boolean))),
    [prices],
  );
  const categories = useMemo(
    () => Array.from(new Set(prices.map((p) => p.category).filter(Boolean))),
    [prices],
  );

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("prices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("দাম মুছে ফেলা হয়েছে");
      qc.invalidateQueries({ queryKey: ["admin", "prices"] });
    },
    onError: () => toast.error("ব্যর্থ"),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-purple-600" /> বাজার দর ব্যবস্থাপনা
        </h1>
        <p className="text-xs text-gray-500">মোট {toBn(prices.length)}টি দাম এন্ট্রি</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="পণ্য, বাজার বা ব্যবহারকারী"
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg"
          />
        </div>
        <select
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-2 py-2"
        >
          <option value="all">সব জেলা</option>
          {districts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-2 py-2"
        >
          <option value="all">সব ক্যাটাগরি</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {isLoading && (
          <div className="p-3">
            <Skeleton className="h-20 w-full" />
          </div>
        )}
        {!isLoading && filtered.length === 0 && (
          <p className="text-center text-gray-400 py-10 text-sm">কোনো এন্ট্রি নেই</p>
        )}
        {filtered.map((p) => {
          const change =
            p.previous_price && p.previous_price > 0
              ? Math.round(
                  ((Number(p.price) - Number(p.previous_price)) / Number(p.previous_price)) * 100,
                )
              : 0;
          return (
            <div key={p.id} className="p-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm text-gray-900">{p.product_name}</p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                    {p.category}
                  </span>
                  {change !== 0 && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        change < 0 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {change > 0 ? "+" : ""}
                      {toBn(change)}%
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-600 mt-0.5">
                  {fmtBdt(Number(p.price))} / {p.unit} • {p.market_name} • {p.district}
                </p>
                <p className="text-[11px] text-gray-400">
                  {p.user_name} • {format(new Date(p.created_at), "d MMM, HH:mm")}
                </p>
              </div>
              <Button size="sm" variant="destructive" onClick={() => del.mutate(p.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
