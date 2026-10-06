import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type Completion = { plan_id: string; task_id: string };

export const cropCompletionsKey = (userId: string | null) => ["crop-task-completions", userId] as const;

export function useCropCompletions(userId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = cropCompletionsKey(userId);
  const query = useQuery({
    queryKey,
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crop_task_completions" as never)
        .select("plan_id, task_id")
        .eq("user_id", userId!);
      if (error) throw error;
      return ((data as Completion[] | null) ?? []);
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`crop-completions-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "crop_task_completions", filter: `user_id=eq.${userId}` }, () => {
        void queryClient.invalidateQueries({ queryKey });
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [queryClient, queryKey, userId]);

  const keys = useMemo(() => new Set((query.data ?? []).map((row) => `${row.plan_id}::${row.task_id}`)), [query.data]);

  const complete = useMutation({
    mutationFn: async ({ planId, taskId }: { planId: string; taskId: string }) => {
      if (!userId) throw new Error("not-authenticated");
      const { error } = await supabase
        .from("crop_task_completions" as never)
        .upsert({ user_id: userId, plan_id: planId, task_id: taskId } as never, { onConflict: "user_id,plan_id,task_id" });
      if (error) throw error;
      return { plan_id: planId, task_id: taskId };
    },
    onMutate: async ({ planId, taskId }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Completion[]>(queryKey) ?? [];
      if (!previous.some((row) => row.plan_id === planId && row.task_id === taskId)) {
        queryClient.setQueryData<Completion[]>(queryKey, [...previous, { plan_id: planId, task_id: taskId }]);
      }
      return { previous };
    },
    onError: (_error, _value, context) => queryClient.setQueryData(queryKey, context?.previous ?? []),
    onSettled: () => void queryClient.invalidateQueries({ queryKey }),
  });

  return { ...query, keys, complete };
}