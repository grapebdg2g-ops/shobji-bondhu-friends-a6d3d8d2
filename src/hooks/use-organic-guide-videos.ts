import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { OrganicFertilizerKey } from "@/data/organic-fertilizer-guide";

export type OrganicGuideVideo = {
  id: string;
  guide_key: OrganicFertilizerKey;
  title: string;
  youtube_url: string;
  source: string;
  duration: string | null;
  is_active: boolean;
  sort_order: number;
};

export const organicGuideVideosKey = ["organic-guide-videos"] as const;

export function useOrganicGuideVideos(includeInactive = false) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: [...organicGuideVideosKey, includeInactive],
    queryFn: async () => {
      let request = supabase
        .from("organic_guide_videos")
        .select("id, guide_key, title, youtube_url, source, duration, is_active, sort_order")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (!includeInactive) request = request.eq("is_active", true);
      const { data, error } = await request;
      if (error) throw error;
      return (data ?? []) as OrganicGuideVideo[];
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel(`organic-guide-videos-${includeInactive ? "admin" : "app"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "organic_guide_videos" }, () => {
        void queryClient.invalidateQueries({ queryKey: organicGuideVideosKey });
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [includeInactive, queryClient]);

  return query;
}