import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Repeat2, Trash2, Search, Eye, EyeOff } from "lucide-react";
import { toBn, fmtBdt } from "@/lib/bn";
import { format } from "date-fns";

export const Route = createFileRoute("/admin/exchanges")({ component: ExchangesPage });

function ExchangesPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [active, setActive] = useState<"all" | "true" | "false">("all");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["admin", "exchanges", type, active],
    queryFn: async () => {
      let query = supabase
        .from("exchanges")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);
      if (type !== "all") query = query.eq("type", type);
      if (active !== "all") query = query.eq("is_active", active === "true");
      const { data } = await query;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return items;
    return items.filter(
      (e) =>
        e.title?.toLowerCase().includes(t) ||
        e.user_name?.toLowerCase().includes(t) ||
        e.district?.toLowerCase().includes(t),
    );
  }, [items, q]);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("exchanges").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("মুছে ফেলা হয়েছে");
      qc.invalidateQueries({ queryKey: ["admin", "exchanges"] });
    },
    onError: () => toast.error("ব্যর্থ"),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, val }: { id: string; val: boolean }) => {
      const { error } = await supabase.from("exchanges").update({ is_active: val }).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, val }) => {
      await qc.cancelQueries({ queryKey: ["admin", "exchanges"] });
      const previous = qc.getQueryData<any[]>(["admin", "exchanges"]);
      qc.setQueryData<any[]>(["admin", "exchanges"], (current = []) => current.map((item) => item.id === id ? { ...item, is_active: val } : item));
      return { previous };
    },
    onSuccess: () => {
      toast.success("আপডেট হয়েছে");
      qc.invalidateQueries({ queryKey: ["admin", "exchanges"] });
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Repeat2 className="h-5 w-5 text-purple-600" /> বিনিময় ব্যবস্থাপনা
        </h1>
        <p className="text-xs text-gray-500">মোট {toBn(items.length)}টি বিনিময় পোস্ট</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="শিরোনাম, ব্যবহারকারী বা জেলা"
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg"
          />
        </div>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-2 py-2"
        >
          <option value="all">সব ধরন</option>
          <option value="seed">বীজ</option>
          <option value="tool">যন্ত্র</option>
          <option value="other">অন্যান্য</option>
        </select>
        <select
          value={active}
          onChange={(e) => setActive(e.target.value as any)}
          className="text-sm border border-gray-200 rounded-lg px-2 py-2"
        >
          <option value="all">সব অবস্থা</option>
          <option value="true">সক্রিয়</option>
          <option value="false">নিষ্ক্রিয়</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {isLoading && <div className="p-3"><Skeleton className="h-20 w-full" /></div>}
        {!isLoading && filtered.length === 0 && (
          <p className="text-center text-gray-400 py-10 text-sm">কোনো পোস্ট নেই</p>
        )}
        {filtered.map((e) => (
          <div key={e.id} className="p-3 flex items-start gap-3">
            {e.image_url ? (
              <img src={e.image_url} alt={e.title} className="h-14 w-14 rounded-lg object-cover bg-gray-100 shrink-0" />
            ) : (
              <div className="h-14 w-14 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                <Repeat2 className="h-5 w-5 text-gray-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-sm text-gray-900 truncate">{e.title}</p>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                  {e.type}
                </span>
                {!e.is_active && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-200 text-gray-600">
                    নিষ্ক্রিয়
                  </span>
                )}
                {e.is_free && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
                    ফ্রি
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-600 mt-0.5">
                {e.price ? `${fmtBdt(Number(e.price))}${e.unit ? ` / ${e.unit}` : ""} • ` : ""}
                {e.district}
              </p>
              <p className="text-[11px] text-gray-400">
                {e.user_name} • {format(new Date(e.created_at), "d MMM, HH:mm")}
              </p>
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => toggleActive.mutate({ id: e.id, val: !e.is_active })}
              >
                {e.is_active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </Button>
              <Button size="sm" variant="destructive" onClick={() => del.mutate(e.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
