import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/user-context";
import { toast } from "sonner";

const PAGE_SIZE = 10;

export function useMutedIds() {
  const { user } = useUser();
  return useQuery({
    queryKey: ["muted-users", user?.id ?? null],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      if (!user) return [] as string[];
      const { data } = await supabase.from("muted_users").select("muted_id").eq("user_id", user.id);
      return ((data ?? []) as { muted_id: string }[]).map((r) => r.muted_id);
    },
  });
}

export function useMutedList() {
  const { user } = useUser();
  return useQuery({
    queryKey: ["muted-users", "list", user?.id ?? null],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      const { data: muted } = await supabase
        .from("muted_users")
        .select("id, muted_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      const rows = (muted ?? []) as { id: string; muted_id: string; created_at: string }[];
      if (rows.length === 0) return [];
      const ids = rows.map((r) => r.muted_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, district, avatar_url")
        .in("id", ids);
      const pmap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
      return rows.map((r) => ({ ...r, profile: pmap.get(r.muted_id) }));
    },
  });
}

export function useMutedListPaginated() {
  const { data: list, isLoading } = useMutedList();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!list) return [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((row: any) => {
      const name = (row.profile?.name || "").toLowerCase();
      const district = (row.profile?.district || "").toLowerCase();
      return name.includes(q) || district.includes(q);
    });
  }, [list, search]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)), [filtered]);
  const safePage = Math.min(page, totalPages);

  const paginated = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safePage]);

  return {
    search,
    setSearch,
    page: safePage,
    setPage,
    totalPages,
    totalCount: filtered.length,
    data: paginated,
    isLoading,
    PAGE_SIZE,
  };
}

export function useMuteMutation() {
  const { user } = useUser();
  const qc = useQueryClient();

  const mute = useMutation({
    mutationFn: async (mutedId: string) => {
      if (!user) throw new Error("auth");
      if (user.id === mutedId) throw new Error("self");
      const { error } = await supabase
        .from("muted_users")
        .insert({ user_id: user.id, muted_id: mutedId });
      if (error && !error.message.includes("duplicate")) throw error;
    },
    onSuccess: () => {
      toast.success("ব্যবহারকারী মিউট করা হয়েছে");
      qc.invalidateQueries({ queryKey: ["muted-users"] });
    },
    onError: () => toast.error("মিউট করা যায়নি"),
  });

  const unmute = useMutation({
    mutationFn: async (mutedId: string) => {
      if (!user) throw new Error("auth");
      const { error } = await supabase
        .from("muted_users")
        .delete()
        .eq("user_id", user.id)
        .eq("muted_id", mutedId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("আনমিউট হয়েছে");
      qc.invalidateQueries({ queryKey: ["muted-users"] });
    },
    onError: () => toast.error("আনমিউট করা যায়নি"),
  });

  return { mute, unmute };
}
