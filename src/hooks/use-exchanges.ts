import { useCallback, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Exchange = Tables<"exchanges">;
export type ExchangeType = "seed" | "sapling" | "tool" | "labor";

export type ExchangeFilters = {
  district: string | null;
  type: ExchangeType | "all";
  query: string;
  freeOnly: boolean;
  sort: "newest" | "cheapest";
};

type ServerFilters = Omit<ExchangeFilters, "query">;

const exchangesKey = (f: ServerFilters) =>
  ["exchanges", f.district, f.type, f.freeOnly, f.sort] as const;

const EXCHANGE_COLS =
  "id,created_at,title,description,type,is_free,price,unit,district,upazila,image_url,is_active,user_name,user_id";

async function fetchExchanges(filters: ServerFilters): Promise<Exchange[]> {
  let q = supabase
    .from("exchanges")
    .select(EXCHANGE_COLS)
    .eq("is_active", true)
    .limit(100);
  if (filters.district) q = q.eq("district", filters.district);
  if (filters.type !== "all") q = q.eq("type", filters.type);
  if (filters.freeOnly) q = q.eq("is_free", true);
  q = filters.sort === "cheapest"
    ? q.order("is_free", { ascending: false }).order("price", { ascending: true, nullsFirst: false })
    : q.order("created_at", { ascending: false });
  const { data, error } = await q;
  if (error) throw error;
  return ((data ?? []) as unknown) as Exchange[];
}

export function useExchanges(filters: ExchangeFilters) {
  const qc = useQueryClient();
  const serverFilters: ServerFilters = {
    district: filters.district,
    type: filters.type,
    freeOnly: filters.freeOnly,
    sort: filters.sort,
  };
  const key = exchangesKey(serverFilters);

  const { data: items = [], isLoading, error, refetch } = useQuery({
    queryKey: key,
    queryFn: () => fetchExchanges(serverFilters),
    staleTime: 30_000,
  });

  // Realtime: just invalidate active filter sets — Query will refetch only what's mounted
  useEffect(() => {
    const ch = supabase
      .channel(`exchanges-rt-${Math.random().toString(36).slice(2, 10)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "exchanges" }, () => {
        qc.invalidateQueries({ queryKey: ["exchanges"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const filtered = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) =>
      i.title.toLowerCase().includes(q) ||
      (i.description ?? "").toLowerCase().includes(q),
    );
  }, [items, filters.query]);

  const addOptimistic = useCallback((item: Exchange) => {
    qc.setQueryData<Exchange[]>(key, (prev) => [item, ...(prev ?? [])]);
  }, [qc, key]);

  const replaceOptimistic = useCallback((tempId: string, real: Exchange) => {
    qc.setQueryData<Exchange[]>(key, (prev) =>
      (prev ?? []).map((i) => (i.id === tempId ? real : i)),
    );
  }, [qc, key]);

  const removeOptimistic = useCallback((id: string) => {
    qc.setQueryData<Exchange[]>(key, (prev) => (prev ?? []).filter((i) => i.id !== id));
  }, [qc, key]);

  return {
    items: filtered,
    loading: isLoading,
    error: error ? "তালিকা লোড করা যায়নি" : null,
    refresh: () => refetch(),
    addOptimistic,
    replaceOptimistic,
    removeOptimistic,
  };
}
