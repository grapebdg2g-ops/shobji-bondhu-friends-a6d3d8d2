import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, SlidersHorizontal, Plus, HelpCircle, Star, CloudRain, ChevronDown, ArrowUp, CheckCircle2, Trophy, ImagePlus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/user-context";
import { useFeed, type FeedFilters, type Post, type PostType } from "@/hooks/use-feed";
import { useMutedIds } from "@/hooks/use-muted-users";
import { ContentMenu } from "@/components/krishi/content-menu";
import { BottomSheet } from "@/components/krishi/bottom-sheet";
import { CreatePostSheet } from "@/components/krishi/create-post-sheet";
import { CommentsSection } from "@/components/krishi/comments-section";
import { DISTRICTS } from "@/lib/bd-data";
import { MASTER_CROP_LABELS } from "@/lib/crop-options";

import { EmptyState } from "@/components/krishi/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { LazyImage } from "@/components/krishi/lazy-image";
import { PostSocialActions } from "@/components/krishi/post-social-actions";
import { readSavedPostIds, writeSavedPostIds } from "@/lib/saved-posts";
import { usePostReactions } from "@/hooks/use-post-reactions";

const feedSearchSchema = z.object({
  filter: fallback(z.enum(["all", "help", "success"]), "all").default("all"),
});

export const Route = createFileRoute("/feed")({
  validateSearch: zodValidator(feedSearchSchema),
  component: FeedPage,
  head: () => ({
    meta: [
      { title: "সংবাদ ফিড — কৃষক বন্ধু" },
      { name: "description", content: "কৃষকদের সাম্প্রতিক পোস্ট, সাহায্য ও সাফল্যের গল্প।" },
    ],
  }),
});

const CROPS = MASTER_CROP_LABELS;
const TYPE_META: Record<PostType, { label: string; badge: string; border: string; icon: typeof HelpCircle | null; iconColor: string }> = {
  general: { label: "সাধারণ", badge: "", border: "border-border bg-card", icon: null, iconColor: "" },
  help: { label: "সাহায্য চাই", badge: "❓ সাহায্য চাই", border: "border-amber-300 bg-amber-50", icon: HelpCircle, iconColor: "text-amber-600" },
  success: { label: "সাফল্য", badge: "🌟 সাফল্য", border: "border-emerald-300 bg-emerald-50", icon: Star, iconColor: "text-emerald-600" },
  weather: { label: "সতর্কতা", badge: "🌧️ সতর্কতা", border: "border-sky-300 bg-sky-50", icon: CloudRain, iconColor: "text-sky-600" },
};

const FILTER_HEADER: Record<"all" | "help" | "success", { title: string; subtitle: string | null }> = {
  all: { title: "সংবাদ ফিড", subtitle: null },
  help: { title: "কৃষকদের প্রশ্নোত্তর", subtitle: "প্রশ্ন করুন, উত্তর পান" },
  success: { title: "সফল কৃষকের গল্প", subtitle: "অনুপ্রেরণার উৎস" },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "এখনই";
  if (m < 60) return `${m} মি`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ঘ`;
  return `${Math.floor(h / 24)} দিন`;
}

function FeedPage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { filter } = Route.useSearch() as { filter: "all" | "help" | "success" };
  const headerMeta = FILTER_HEADER[filter];

  const [filters, setFilters] = useState<FeedFilters>({
    districtMode: user?.upazila ? "myUpazila" : "myDistrict",
    district: null,
    crop: null,
    types: filter === "help" ? ["help"] : filter === "success" ? ["success"] : [],
  });
  const [filterOpen, setFilterOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>([]);

  useEffect(() => { setSavedIds(readSavedPostIds()); }, []);

  // Sync URL filter → types lock
  useEffect(() => {
    setFilters((f) => {
      const want: PostType[] = filter === "help" ? ["help"] : filter === "success" ? ["success"] : [];
      const same = f.types.length === want.length && want.every((t) => f.types.includes(t));
      if (same) return f;
      return { ...f, types: want };
    });
  }, [filter]);

  const { data: mutedIds = [] } = useMutedIds();
  const { posts, loading, loadingMore, hasMore, error, loadMore, prepend, removeById, updateById, refresh } = useFeed(filters, user?.district ?? null, user?.upazila ?? null, mutedIds);

  // Sort posts based on active filter mode
  const displayPosts = useMemo(() => {
    if (filter === "success") {
      return [...posts].sort((a, b) => b.likes_count - a.likes_count);
    }
    if (filter === "help") {
      return [...posts].sort((a, b) => {
        const aAns = a.comments_count > 0 ? 1 : 0;
        const bAns = b.comments_count > 0 ? 1 : 0;
        if (aAns !== bAns) return aAns - bAns; // unanswered (0) first
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }
    return posts;
  }, [posts, filter]);

  // Monthly top farmers (success mode only)
  const { data: leaderboard = [] } = useQuery({
    queryKey: ["feed", "leaderboard", "success-month"],
    enabled: filter === "success",
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("posts")
        .select("user_id, user_name, likes_count")
        .eq("type", "success")
        .gte("created_at", startOfMonth.toISOString())
        .limit(200);
      const map = new Map<string, { user_id: string; name: string; posts: number; likes: number }>();
      for (const r of (data as { user_id: string; user_name: string; likes_count: number }[]) ?? []) {
        const ex = map.get(r.user_id) ?? { user_id: r.user_id, name: r.user_name, posts: 0, likes: 0 };
        ex.posts += 1;
        ex.likes += r.likes_count ?? 0;
        map.set(r.user_id, ex);
      }
      return Array.from(map.values()).sort((a, b) => b.likes - a.likes || b.posts - a.posts).slice(0, 3);
    },
  });


  // Active users (stories) — distinct recent posters. Cached, refetched at most every 2 min.
  const { data: activeUsers = [] } = useQuery({
    queryKey: ["feed", "active-users"],
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select("user_id, user_name, user_district, created_at")
        .order("created_at", { ascending: false })
        .limit(40);
      const seen = new Set<string>();
      const unique: { id: string; name: string; district: string | null }[] = [];
      for (const r of (data as { user_id: string; user_name: string; user_district: string | null }[]) ?? []) {
        if (!seen.has(r.user_id)) {
          seen.add(r.user_id);
          unique.push({ id: r.user_id, name: r.user_name, district: r.user_district });
        }
        if (unique.length >= 12) break;
      }
      return unique;
    },
    staleTime: 2 * 60_000,
  });


  // Realtime new-post banner
  const [newCount, setNewCount] = useState(0);
  const dismissTimer = useRef<number | null>(null);
  const districtForSub = useMemo(() => {
    if (filters.districtMode === "myUpazila" || filters.districtMode === "myDistrict") return user?.district ?? null;
    if (filters.districtMode === "specific") return filters.district;
    return null; // 'all'
  }, [filters, user]);

  useEffect(() => {
    setNewCount(0);
    const filterStr = districtForSub ? `district=eq.${districtForSub}` : undefined;
    const ch = supabase
      .channel(`feed-${districtForSub ?? "all"}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts", ...(filterStr ? { filter: filterStr } : {}) },
        (payload) => {
          const np = payload.new as Post;
          if (user && np.user_id === user.id) return; // skip own
          setNewCount((c) => c + 1);
          if (dismissTimer.current) window.clearTimeout(dismissTimer.current);
          dismissTimer.current = window.setTimeout(() => setNewCount(0), 8000);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); if (dismissTimer.current) window.clearTimeout(dismissTimer.current); };
  }, [districtForSub, user]);


  // Infinite scroll
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore]);


  const toggleSave = useCallback((post: Post) => {
    setSavedIds((current) => {
      const saved = current.includes(post.id);
      const next = saved ? current.filter((id) => id !== post.id) : [post.id, ...current];
      writeSavedPostIds(next);
      toast.success(saved ? "সংরক্ষণ থেকে সরানো হয়েছে" : "পোস্ট সংরক্ষণ হয়েছে");
      return next;
    });
  }, []);

  const share = async (p: Post) => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const text = `${p.user_name} (${p.district ?? ""}): ${p.content}`;
    try {
      if (navigator.share) await navigator.share({ title: "কৃষক বন্ধু পোস্ট", text, url });
      else { await navigator.clipboard.writeText(`${text}\n${url}`); toast.success("কপি হয়েছে"); }
    } catch { /* user cancel */ }
  };

  return (
    <main className="min-h-screen min-w-0 max-w-full overflow-x-hidden bg-background pb-20">
      {/* Header */}
      <header className="relative overflow-hidden rounded-b-[28px] px-4 pb-6 pt-8 sm:px-6" style={{ background: "var(--gradient-brand)" }}>
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#74C69D]/20 blur-3xl" />
        <div className="relative z-10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate({ to: "/dashboard" })}
              aria-label="ফিরে যান"
              className="home-pressable flex h-11 w-11 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/20"
            >
              <ArrowLeft className="h-5 w-5 text-white" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white leading-tight">{headerMeta.title}</h1>
              {headerMeta.subtitle && (
                <p className="text-[11px] text-white/80 mt-0.5">{headerMeta.subtitle}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => setFilterOpen(true)}
            aria-label="ফিল্টার"
            className="home-pressable flex h-11 w-11 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/20"
          >
            <SlidersHorizontal className="h-5 w-5 text-white" />
          </button>
        </div>
      </header>

      <nav className="relative z-10 mx-auto -mt-4 max-w-3xl px-4" aria-label="ফিডের ধরন">
        <div className="grid grid-cols-3 gap-1 rounded-2xl border border-border bg-card p-1 shadow-[var(--shadow-card)]">
          {([
            { value: "all", label: "সবার পোস্ট", icon: "🌾" },
            { value: "help", label: "প্রশ্নোত্তর", icon: "❓" },
            { value: "success", label: "সাফল্যের গল্প", icon: "🌟" },
          ] as const).map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => navigate({ to: "/feed", search: { filter: tab.value } })}
              className={`home-pressable min-h-11 rounded-xl px-1 text-xs font-bold transition ${filter === tab.value ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"}`}
            >
              <span className="mr-1">{tab.icon}</span>{tab.label}
            </button>
          ))}
        </div>
      </nav>

      <section className="mx-auto mt-3 max-w-3xl px-4">
        <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 font-bold text-primary">{user?.name?.charAt(0) || "ক"}</div>
            <button type="button" onClick={() => setCreateOpen(true)} className="flex h-10 flex-1 items-center rounded-full bg-muted px-4 text-left text-sm text-muted-foreground transition hover:bg-muted/80">
              আজ কী শেয়ার করবেন, {user?.name?.split(" ")[0] || "কৃষক"}?
            </button>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-1 border-t border-border/60 pt-3">
            <button type="button" onClick={() => setCreateOpen(true)} className="home-pressable flex min-h-10 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted"><ImagePlus className="h-4 w-4 text-emerald-600" /> ছবি</button>
            <button type="button" onClick={() => { setCreateOpen(true); toast.info("পোস্টের ধরনে ‘সাহায্য চাই’ বেছে নিন"); }} className="home-pressable flex min-h-10 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted"><HelpCircle className="h-4 w-4 text-amber-600" /> প্রশ্ন</button>
            <button type="button" onClick={() => { setCreateOpen(true); toast.info("পোস্টের ধরনে ‘সাফল্য’ বেছে নিন"); }} className="home-pressable flex min-h-10 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted"><Sparkles className="h-4 w-4 text-sky-600" /> সাফল্য</button>
          </div>
        </div>
      </section>

      {/* Stories row */}
      <section className="mx-auto mt-4 mb-4 min-w-0 max-w-3xl px-4">
        <div className="mb-2 flex items-center justify-between px-1">
          <p className="text-xs font-extrabold tracking-tight text-foreground">এখন সক্রিয় কৃষক</p>
          <span className="text-[10px] font-semibold text-muted-foreground">আপনার এলাকার আপডেট</span>
        </div>
        <div className="home-gradient-border min-w-0 max-w-full overflow-x-auto overscroll-x-contain rounded-2xl border border-border bg-card px-3 py-3 shadow-[var(--shadow-card)]">
          <div className="flex items-start gap-3 w-max">
            <button
              onClick={() => setCreateOpen(true)}
              className="flex flex-col items-center w-16 shrink-0"
            >
              <div className="h-14 w-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center ring-2 ring-primary/30">
                <Plus className="h-6 w-6" />
              </div>
              <span className="mt-1 text-[10px] font-semibold text-foreground text-center leading-tight">পোস্ট করুন</span>
            </button>
            {activeUsers.map((u) => (
              <Link key={u.id} to="/u/$userId" params={{ userId: u.id }} className="home-pressable flex w-16 min-w-[4rem] shrink-0 flex-col items-center rounded-xl px-1 py-1">
                <div className="relative h-14 w-14 rounded-full bg-gradient-to-br from-emerald-200 to-emerald-400 p-[2px]">
                  <div className="h-full w-full rounded-full bg-card flex items-center justify-center text-base font-bold text-primary">
                    {u.name.charAt(0)}
                  </div>
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card bg-emerald-500" />
                </div>
                <span className="mt-1 w-full truncate text-center text-[10px] text-muted-foreground" title={u.district ?? ""}>
                  {u.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* New posts banner */}
      {newCount > 0 && (
        <div className="sticky top-2 z-20 mx-auto max-w-3xl px-4">
          <button
            onClick={() => {
              setNewCount(0);
              refresh();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="home-pressable flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-lg"
          >
            <ArrowUp className="h-4 w-4" />
            <span>{`${newCount}টি নতুন পোস্ট দেখুন`}</span>
          </button>
        </div>
      )}

      {/* Monthly leaderboard for success mode */}
      {filter === "success" && leaderboard.length > 0 && (
        <section className="mx-auto mb-3 max-w-3xl px-4">
          <div className="bg-gradient-to-br from-amber-50 to-yellow-100 border-2 border-amber-300 rounded-2xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-5 w-5 text-amber-600" />
              <h2 className="text-sm font-bold text-amber-900">এই মাসের সেরা চাষী</h2>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {leaderboard.map((u, i) => {
                const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉";
                return (
                  <Link
                    key={u.user_id}
                    to="/u/$userId"
                    params={{ userId: u.user_id }}
                    className="flex flex-col items-center text-center bg-white/70 rounded-xl p-2 active:scale-95"
                  >
                    <div className="text-2xl">{medal}</div>
                    <div className="h-9 w-9 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-bold mt-1">
                      {u.name.charAt(0) || "ক"}
                    </div>
                    <p className="mt-1 text-[11px] font-bold text-foreground truncate w-full">{u.name}</p>
                    <p className="text-[10px] text-muted-foreground">{u.posts} পোস্ট</p>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Posts */}
      <section className="home-stagger mx-auto mt-4 min-w-0 max-w-3xl space-y-3 px-4">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => <PostSkeleton key={i} />)}
          </div>
        ) : error ? (
          <p className="text-center text-sm text-destructive py-6">{error}</p>
        ) : displayPosts.length === 0 ? (
          <EmptyState
            title={filter === "help" ? "কোনো প্রশ্ন নেই" : filter === "success" ? "কোনো সাফল্যের গল্প নেই" : "কোনো পোস্ট নেই"}
            description={filter === "help" ? "প্রথম প্রশ্নটি আপনিই করুন" : "ফিল্টার বদলান বা প্রথম পোস্টটি আপনিই করুন"}
          />
        ) : (
          displayPosts.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              visiblePostIds={displayPosts.map((post) => post.id)}
              mode={filter}
              onShare={() => share(p)}
              saved={savedIds.includes(p.id)}
              onSave={() => toggleSave(p)}
              onCommentAdded={() => updateById(p.id, { comments_count: p.comments_count + 1 })}
              onDeleted={() => removeById(p.id)}
            />
          ))
        )}

        <div ref={sentinelRef} className="h-2" />
        {loadingMore && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => <PostSkeleton key={`m-${i}`} />)}
          </div>
        )}
        {!hasMore && displayPosts.length > 0 && (
          <p className="text-center text-xs text-muted-foreground py-4">আর কোনো পোস্ট নেই</p>
        )}
      </section>

      <FilterSheet open={filterOpen} onClose={() => setFilterOpen(false)} value={filters} onApply={(f) => { setFilters(f); setFilterOpen(false); }} />
      <CreatePostSheet open={createOpen} onClose={() => setCreateOpen(false)} onCreated={prepend} />
    </main>
  );
}


function PostSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-11 w-11 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-2.5 w-16" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
  );
}

function PostCard({
  post,
  visiblePostIds,
  mode = "all",
  saved,
  onShare,
  onSave,
  onCommentAdded,
  onDeleted,
}: {
  post: Post;
  visiblePostIds: string[];
  mode?: "all" | "help" | "success";
  saved: boolean;
  onShare: () => void;
  onSave: () => void;
  onCommentAdded: () => void;
  onDeleted: () => void;
}) {
  const meta = TYPE_META[post.type];
  const [expanded, setExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const long = post.content.length > 180;
  const text = expanded || !long ? post.content : post.content.slice(0, 180) + "...";
  const isAnswered = post.type === "help" && post.comments_count > 0;
  const isSuccessHighlight = mode === "success" && post.type === "success";
  const { counts: reactionCounts, mine: myReaction, setReaction } = usePostReactions(post.id, visiblePostIds);

  const handleReaction = async (reaction: Parameters<typeof setReaction>[0]) => {
    const result = await setReaction(reaction);
    if (!result.ok) {
      toast.error(result.reason === "unauthenticated" ? "প্রতিক্রিয়া দিতে লগইন করুন" : "প্রতিক্রিয়া সংরক্ষণ করা যায়নি");
    }
  };

  const handleDelete = async () => {
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    if (error) {
      toast.error("মুছে ফেলা যায়নি");
      return;
    }
    toast.success("পোস্ট মুছে ফেলা হয়েছে");
    onDeleted();
  };

  return (
    <article className={`home-pressable relative min-w-0 rounded-2xl border-2 ${isSuccessHighlight ? "border-amber-400 bg-gradient-to-br from-amber-50 to-white" : meta.border} shadow-sm`}>
      {isSuccessHighlight && (
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-amber-400 text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow z-10">
          <Star className="h-3 w-3 fill-current" /> সাফল্যের গল্প
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold shrink-0">
            {post.user_name.charAt(0) || "ক"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <Link
                to="/u/$userId"
                params={{ userId: post.user_id }}
                className="font-semibold text-foreground text-sm truncate hover:underline"
              >
                {post.user_name}
              </Link>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[10px] text-muted-foreground">{timeAgo(post.created_at)}</span>
                <ContentMenu
                  contentType="post"
                  contentId={post.id}
                  authorId={post.user_id}
                  authorName={post.user_name}
                  onDelete={handleDelete}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {post.upazila ? `${post.upazila}, ${post.district ?? "—"}` : post.district ?? "—"}
            </p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {meta.badge && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${meta.iconColor} bg-white/80 border border-current/20`}>
                  {meta.badge}
                </span>
              )}
              {isAnswered && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-300">
                  <CheckCircle2 className="h-3 w-3" /> উত্তর পেয়েছি
                </span>
              )}
              {post.crop_tag && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary">
                  🌾 {post.crop_tag}
                </span>
              )}
            </div>
          </div>
        </div>

        <p className="mt-3 text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed">{text}</p>
        {long && (
          <button onClick={() => setExpanded((x) => !x)} className="mt-1 text-xs font-semibold text-primary">
            {expanded ? "কম দেখুন" : "আরো পড়ুন"}
          </button>
        )}
      </div>

      {post.image_url && (
        <LazyImage
          src={post.image_url}
          alt=""
          wrapperClassName="w-full aspect-[4/3] bg-muted"
        />
      )}

      <PostSocialActions
        myReaction={myReaction}
        reactionCounts={reactionCounts}
        commentsCount={post.comments_count}
        saved={saved}
        commentOpen={showComments}
        commentLabel={post.type === "help" ? "উত্তর" : "মন্তব্য"}
        onReact={(reaction) => void handleReaction(reaction)}
        onComment={() => setShowComments((s) => !s)}
        onSave={onSave}
        onShare={onShare}
      />

      {showComments && (
        <div className="px-4 pb-4">
          <CommentsSection postId={post.id} onCommentAdded={onCommentAdded} />
        </div>
      )}
    </article>
  );
}

function FilterSheet({
  open,
  onClose,
  value,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  value: FeedFilters;
  onApply: (f: FeedFilters) => void;
}) {
  const [draft, setDraft] = useState<FeedFilters>(value);
  useEffect(() => { if (open) setDraft(value); }, [open, value]);

  const TYPES: { value: PostType; label: string }[] = [
    { value: "general", label: "সাধারণ" },
    { value: "help", label: "সাহায্য" },
    { value: "success", label: "সাফল্য" },
    { value: "weather", label: "সতর্কতা" },
  ];

  const toggleType = (t: PostType) =>
    setDraft((d) => ({ ...d, types: d.types.includes(t) ? d.types.filter((x) => x !== t) : [...d.types, t] }));

  return (
    <BottomSheet open={open} onClose={onClose} title="ফিল্টার">
      <div className="space-y-5">
        <div>
          <p className="text-sm font-bold text-foreground mb-2">কোন জেলার পোস্ট দেখবেন?</p>
          <div className="flex gap-2 flex-wrap">
            {([
              { v: "myUpazila", l: "আমার উপজেলা" },
              { v: "myDistrict", l: "আমার জেলা" },
              { v: "all", l: "সব বাংলাদেশ" },
              { v: "specific", l: "নির্দিষ্ট জেলা" },
            ] as const).map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => setDraft((d) => ({ ...d, districtMode: o.v }))}
                className={`home-pressable min-h-11 rounded-full border px-3 text-xs font-semibold ${draft.districtMode === o.v ? "bg-primary text-primary-foreground border-primary" : "bg-background border-input text-foreground"}`}
              >
                {o.l}
              </button>
            ))}
          </div>
          {draft.districtMode === "specific" && (
            <div className="mt-2 relative">
              <select
                value={draft.district ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, district: e.target.value || null }))}
                className="w-full h-10 px-3 pr-8 rounded-xl border border-input bg-background text-sm appearance-none"
              >
                <option value="">— বাছুন —</option>
                {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          )}
        </div>

        <div>
          <p className="text-sm font-bold text-foreground mb-2">কোন ফসলের পোস্ট?</p>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setDraft((d) => ({ ...d, crop: null }))}
              className={`home-pressable min-h-11 rounded-full border px-3 text-xs font-semibold ${draft.crop === null ? "bg-primary text-primary-foreground border-primary" : "bg-background border-input text-foreground"}`}
            >
              সব ফসল
            </button>
            {CROPS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setDraft((d) => ({ ...d, crop: c }))}
                className={`home-pressable min-h-11 rounded-full border px-3 text-xs font-semibold ${draft.crop === c ? "bg-primary text-primary-foreground border-primary" : "bg-background border-input text-foreground"}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-bold text-foreground mb-2">পোস্টের ধরন?</p>
          <div className="flex gap-2 flex-wrap">
            {TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => toggleType(t.value)}
                className={`home-pressable min-h-11 rounded-full border px-3 text-xs font-semibold ${draft.types.includes(t.value) ? "bg-primary text-primary-foreground border-primary" : "bg-background border-input text-foreground"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">কিছু না বাছলে সব ধরনই দেখানো হবে</p>
        </div>

        <button
          type="button"
          onClick={() => onApply(draft)}
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold active:scale-[0.99]"
        >
          ফলাফল দেখুন
        </button>
      </div>
    </BottomSheet>
  );
}
