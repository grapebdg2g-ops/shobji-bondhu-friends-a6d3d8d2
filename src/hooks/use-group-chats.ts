import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/user-context";
import type { Database } from "@/integrations/supabase/types";

export type GroupThread = Database["public"]["Functions"]["get_group_threads"]["Returns"][number];
export type GroupMessage = Database["public"]["Tables"]["group_chat_messages"]["Row"];

export const groupThreadsKey = (userId: string | null) => ["group-threads", userId] as const;

export function useGroupThreads() {
  const { user } = useUser();
  const userId = user?.id ?? null;
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: groupThreadsKey(userId),
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_group_threads");
      if (error) throw error;
      return (data ?? []) as GroupThread[];
    },
  });

  useEffect(() => {
    if (!userId) return;
    const id = Math.random().toString(36).slice(2, 10);
    const ch = supabase
      .channel(`group-threads-${userId}-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "group_chat_messages" }, () =>
        qc.invalidateQueries({ queryKey: groupThreadsKey(userId) }),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "group_chat_members" }, () =>
        qc.invalidateQueries({ queryKey: groupThreadsKey(userId) }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [userId, qc]);

  const threads = query.data ?? [];
  return {
    threads,
    loading: query.isLoading,
    unreadCount: threads.reduce((t, g) => t + Number(g.unread_count ?? 0), 0),
  };
}

export type FriendOption = { id: string; name: string; avatar_url: string | null; district: string | null };

export function useMyFriends() {
  const { user } = useUser();
  return useQuery({
    queryKey: ["my-friends", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_connected_farmers", { target_user_id: user!.id });
      if (error) throw error;
      return (data ?? []) as FriendOption[];
    },
  });
}
