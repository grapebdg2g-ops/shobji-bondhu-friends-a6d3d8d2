import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Read only public profile photo fields, once for the authors currently shown. */
export function useAuthorAvatars(ids: string[]) {
  const authorIds = useMemo(() => [...new Set(ids)].sort(), [ids.join(",")]);
  return useQuery({
    queryKey: ["author-avatars", authorIds],
    enabled: authorIds.length > 0,
    staleTime: 60_000,
    queryFn: async (): Promise<Record<string, string | null>> => {
      const { data, error } = await supabase.from("profiles").select("id, avatar_url").in("id", authorIds);
      if (error) throw error;
      return Object.fromEntries((data ?? []).map((profile) => [profile.id, profile.avatar_url]));
    },
  });
}