import { confirmAsk } from "@/components/krishi/confirm-dialog";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Shield, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/user-context";
import { useRole } from "@/hooks/use-role";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/moderation")({
  component: ModerationPage,
  head: () => ({
    meta: [{ title: "মডারেশন — কৃষক বন্ধু" }, { name: "robots", content: "noindex" }],
  }),
});

type ModPost = {
  id: string;
  user_id: string;
  user_name: string;
  district: string | null;
  content: string;
  type: string;
  created_at: string;
};

type ModExchange = {
  id: string;
  user_id: string;
  user_name: string;
  district: string;
  title: string;
  type: string;
  created_at: string;
};

function ModerationPage() {
  const navigate = useNavigate();
  const { user, loading: userLoading } = useUser();
  const { isStaff, loading: roleLoading } = useRole();
  const qc = useQueryClient();

  useEffect(() => {
    if (!userLoading && !user) navigate({ to: "/login" });
  }, [user, userLoading, navigate]);

  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ["mod", "posts"],
    enabled: isStaff,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("id, user_id, user_name, district, content, type, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data as ModPost[]) ?? [];
    },
  });

  const { data: exchanges = [], isLoading: exLoading } = useQuery({
    queryKey: ["mod", "exchanges"],
    enabled: isStaff,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exchanges")
        .select("id, user_id, user_name, district, title, type, created_at")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data as ModExchange[]) ?? [];
    },
  });

  const deletePost = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("পোস্ট মুছে ফেলা হয়েছে");
      qc.invalidateQueries({ queryKey: ["mod", "posts"] });
    },
    onError: () => toast.error("মুছে ফেলা ব্যর্থ"),
  });

  const deleteExchange = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("exchanges").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("বিনিময় মুছে ফেলা হয়েছে");
      qc.invalidateQueries({ queryKey: ["mod", "exchanges"] });
    },
    onError: () => toast.error("মুছে ফেলা ব্যর্থ"),
  });

  if (userLoading || roleLoading) {
    return (
      <main className="p-4 space-y-3">
        <Skeleton className="h-20 w-full rounded-2xl" />
      </main>
    );
  }

  if (!isStaff) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <Shield className="h-12 w-12 mx-auto text-muted-foreground" />
          <p className="mt-3 font-bold">শুধু মডারেটর/প্রশাসকদের জন্য</p>
          <button
            onClick={() => navigate({ to: "/dashboard" })}
            className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold"
          >
            হোমে ফিরে যান
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background pb-20">
      <header
        className="px-4 pt-6 pb-6 rounded-b-3xl"
        style={{ background: "var(--gradient-brand)" }}
      >
        <button
          onClick={() => navigate({ to: "/dashboard" })}
          aria-label="ফিরে যান"
          className="h-10 w-10 rounded-full bg-white/15 flex items-center justify-center ring-2 ring-white/20"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </button>
        <div className="mt-3 flex items-center gap-2">
          <Shield className="h-6 w-6 text-white" />
          <h1 className="text-xl font-bold text-white">মডারেশন</h1>
        </div>
      </header>

      <section className="px-4 mt-4">
        <h2 className="text-sm font-bold text-muted-foreground mb-2">সাম্প্রতিক পোস্ট</h2>
        <div className="space-y-2">
          {postsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))
          ) : posts.length === 0 ? (
            <p className="text-xs text-muted-foreground">কোনো পোস্ট নেই</p>
          ) : (
            posts.map((p) => (
              <article key={p.id} className="bg-card rounded-xl border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold truncate">
                      {p.user_name} · {p.district ?? "—"}
                    </p>
                    <p className="text-xs text-foreground mt-1 line-clamp-3 whitespace-pre-wrap">
                      {p.content}
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      if (await confirmAsk("পোস্টটি স্থায়ীভাবে মুছে ফেলবেন?")) deletePost.mutate(p.id);
                    }}
                    className="h-8 px-2 rounded-md bg-red-50 text-red-600 text-xs font-bold inline-flex items-center gap-1 shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> মুছুন
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="px-4 mt-6">
        <h2 className="text-sm font-bold text-muted-foreground mb-2">সাম্প্রতিক বিনিময়</h2>
        <div className="space-y-2">
          {exLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))
          ) : exchanges.length === 0 ? (
            <p className="text-xs text-muted-foreground">কোনো বিনিময় নেই</p>
          ) : (
            exchanges.map((e) => (
              <article
                key={e.id}
                className="bg-card rounded-xl border border-border p-3 flex items-center gap-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold truncate">{e.title}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {e.user_name} · {e.district}
                  </p>
                </div>
                <button
                  onClick={async () => {
                    if (await confirmAsk("বিনিময়টি মুছে ফেলবেন?")) deleteExchange.mutate(e.id);
                  }}
                  className="h-8 px-2 rounded-md bg-red-50 text-red-600 text-xs font-bold inline-flex items-center gap-1 shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" /> মুছুন
                </button>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
