import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/user-context";
import { type ReactionType } from "@/lib/reactions";

export type PostReaction = {
  post_id: string;
  user_id: string;
  reaction_type: ReactionType;
};

export type ReactionWriteResult =
  | { ok: true }
  | { ok: false; reason: "unauthenticated" | "storage" };

type ReactionState = {
  counts: Record<ReactionType, number>;
  mine: ReactionType | null;
};

export const emptyReactionCounts = (): Record<ReactionType, number> => ({
  like: 0,
  love: 0,
  care: 0,
  haha: 0,
  wow: 0,
  sad: 0,
  angry: 0,
});

const isMissingReactionTable = (error: { code?: string; message?: string } | null) => {
  const message = error?.message ?? "";
  return (
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    (/post_reactions/i.test(message) && /(relation|table|schema cache|not found)/i.test(message))
  );
};

export function usePostReactions(postId: string, visiblePostIds: string[] = [postId]) {
  const { user: profileUser } = useUser();
  const queryClient = useQueryClient();
  const postIdsKey = useMemo(
    () => Array.from(new Set(visiblePostIds.filter(Boolean))).sort().join(","),
    [visiblePostIds],
  );
  const postIds = useMemo(() => postIdsKey.split(",").filter(Boolean), [postIdsKey]);
  const queryKey = useMemo(() => ["post-reactions-batch", postIdsKey] as const, [postIdsKey]);
  const currentUserId = profileUser?.id ?? null;
  const { data: rows = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("post_reactions")
        .select("post_id, user_id, reaction_type")
        .in("post_id", postIds);
      if (!error) return (data as PostReaction[]) ?? [];
      if (!isMissingReactionTable(error)) throw new Error(error.message);

      // Backward-compatible fallback while the new migration is being applied.
      const { data: legacyLikes, error: legacyError } = await supabase
        .from("post_likes")
        .select("post_id, user_id")
        .in("post_id", postIds);
      if (legacyError) throw new Error(legacyError.message);
      return ((legacyLikes as { post_id: string; user_id: string }[]) ?? []).map((like) => ({
        ...like,
        reaction_type: "like" as const,
      }));
    },
    staleTime: 30_000,
  });

  const state = useMemo<ReactionState>(() => {
    const counts = emptyReactionCounts();
    let mine: ReactionType | null = null;
    for (const row of rows) {
      if (row.post_id !== postId) continue;
      if (row.reaction_type in counts) counts[row.reaction_type] += 1;
      if (row.user_id === currentUserId) mine = row.reaction_type;
    }
    return { counts, mine };
  }, [currentUserId, postId, rows]);

  const setReaction = useCallback(
    async (reaction: ReactionType | null): Promise<ReactionWriteResult> => {
      const { data: sessionData } = await supabase.auth.getUser();
      const userId = sessionData.user?.id ?? currentUserId;
      if (!userId) return { ok: false, reason: "unauthenticated" };

      const previous = queryClient.getQueryData<PostReaction[]>(queryKey) ?? [];
      const optimistic = previous.filter((row) => row.user_id !== userId);
      if (reaction) optimistic.push({ post_id: postId, user_id: userId, reaction_type: reaction });
      queryClient.setQueryData(queryKey, optimistic);

      const result = reaction
        ? await supabase
            .from("post_reactions")
            .upsert(
              { post_id: postId, user_id: userId, reaction_type: reaction },
              { onConflict: "post_id,user_id" },
            )
        : await supabase
            .from("post_reactions")
            .delete()
            .eq("post_id", postId)
            .eq("user_id", userId);

      if (!result.error) return { ok: true };

      // Keep the primary Like action usable with the existing post_likes table.
      if (isMissingReactionTable(result.error) && (reaction === "like" || reaction === null)) {
        const legacyResult = reaction
          ? await supabase
              .from("post_likes")
              .upsert({ post_id: postId, user_id: userId }, { onConflict: "post_id,user_id" })
          : await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", userId);
        if (!legacyResult.error) return { ok: true };
      }

      queryClient.setQueryData(queryKey, previous);
      return { ok: false, reason: "storage" };
    },
    [currentUserId, postId, queryClient, queryKey],
  );

  return { ...state, isLoading, setReaction };
}
