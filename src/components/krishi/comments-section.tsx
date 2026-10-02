import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Reply, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/user-context";
import { sanitize } from "@/lib/sanitize";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type Comment = {
  id: string;
  user_id: string;
  user_name: string;
  content: string;
  created_at: string;
  parent_id: string | null;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "এখনই";
  if (m < 60) return `${m} মি আগে`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ঘ আগে`;
  return `${Math.floor(h / 24)} দিন আগে`;
}

export function CommentsSection({ postId, onCommentAdded }: { postId: string; onCommentAdded: () => void }) {
  const { user } = useUser();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("post_comments")
        .select("id, user_id, user_name, content, created_at, parent_id")
        .eq("post_id", postId)
        .order("created_at", { ascending: true })
        .limit(100);
      if (active) {
        setComments((data as Comment[]) ?? []);
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [postId]);

  const authorIds = useMemo(
    () => [...new Set([...comments.map((comment) => comment.user_id), ...(user ? [user.id] : [])])].sort(),
    [comments, user?.id],
  );
  const { data: avatars = {} } = useQuery({
    queryKey: ["comment-author-avatars", authorIds],
    enabled: authorIds.length > 0,
    staleTime: 60_000,
    queryFn: async (): Promise<Record<string, string | null>> => {
      const { data, error } = await supabase.from("profiles").select("id, avatar_url").in("id", authorIds);
      if (error) throw error;
      return Object.fromEntries((data ?? []).map((profile) => [profile.id, profile.avatar_url]));
    },
  });

  const authorAvatar = (id: string | undefined, name: string, size: string) => (
    <Avatar className={`${size} bg-primary/15`}>
      <AvatarImage src={id ? avatars[id] ?? undefined : undefined} alt={`${name}-এর প্রোফাইল ছবি`} className="object-cover" />
      <AvatarFallback className="bg-primary/15 text-xs font-bold text-primary">{name.charAt(0) || "ক"}</AvatarFallback>
    </Avatar>
  );

  const topLevel = useMemo(() => comments.filter((comment) => !comment.parent_id), [comments]);
  const repliesByParent = useMemo(() => {
    const map = new Map<string, Comment[]>();
    for (const comment of comments) {
      if (!comment.parent_id) continue;
      const replies = map.get(comment.parent_id) ?? [];
      replies.push(comment);
      map.set(comment.parent_id, replies);
    }
    return map;
  }, [comments]);
  const visibleTopLevel = showAll ? topLevel : topLevel.slice(0, 3);

  const submit = async (rawText: string, parentId: string | null) => {
    const trimmed = sanitize(rawText);
    if (!trimmed || sending) return;
    if (!user) { toast.error("মন্তব্য করতে লগইন করুন"); return; }
    if (trimmed.length > 200) { toast.error("মন্তব্য ২০০ অক্ষরের মধ্যে রাখুন"); return; }
    setSending(true);
    const optimistic: Comment = {
      id: `tmp-${Date.now()}`,
      user_id: user.id,
      user_name: user.name || "আমি",
      content: trimmed,
      created_at: new Date().toISOString(),
      parent_id: parentId,
    };
    setComments((current) => [...current, optimistic]);
    if (parentId) { setReplyText(""); setReplyTo(null); } else setText("");

    const { data, error } = await supabase
      .from("post_comments")
      .insert({ post_id: postId, user_id: user.id, user_name: user.name || "আমি", content: trimmed, parent_id: parentId })
      .select("id, user_id, user_name, content, created_at, parent_id")
      .single();
    if (error || !data) {
      setComments((current) => current.filter((comment) => comment.id !== optimistic.id));
      toast.error(parentId ? "উত্তর পাঠানো যায়নি" : "মন্তব্য পাঠানো যায়নি");
      setSending(false);
      return;
    }
    setComments((current) => current.map((comment) => comment.id === optimistic.id ? data as Comment : comment));
    await supabase.rpc("increment_comments", { post_id: postId });
    onCommentAdded();
    setSending(false);
  };

  const renderComment = (comment: Comment, depth = 0) => {
    const replies = repliesByParent.get(comment.id) ?? [];
    return (
      <div key={comment.id} className={depth > 0 ? "ml-8 mt-2" : "mt-3"}>
        <div className="flex min-w-0 gap-2">
          {authorAvatar(comment.user_id, comment.user_name, "h-8 w-8")}
          <div className="min-w-0 flex-1">
            <div className="rounded-2xl bg-muted/70 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs font-bold text-foreground">{comment.user_name}</p>
                <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(comment.created_at)}</span>
              </div>
              <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-foreground">{comment.content}</p>
            </div>
            <div className="mt-1 flex items-center gap-3 pl-2">
              {depth < 2 && (
                <button type="button" onClick={() => setReplyTo((current) => current === comment.id ? null : comment.id)} className="inline-flex min-h-7 items-center gap-1 text-[11px] font-bold text-muted-foreground hover:text-primary">
                  <Reply className="h-3.5 w-3.5" /> উত্তর দিন
                </button>
              )}
            </div>
            {replyTo === comment.id && (
              <div className="mt-2 flex min-w-0 items-center gap-2">
                {authorAvatar(user?.id, user?.name || "আমি", "h-7 w-7")}
                <input
                  autoFocus
                  value={replyText}
                  onChange={(event) => setReplyText(event.target.value.slice(0, 200))}
                  onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) void submit(replyText, comment.id); }}
                  placeholder={`${comment.user_name}-কে উত্তর দিন...`}
                  className="h-9 min-w-0 flex-1 rounded-full bg-muted px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button type="button" onClick={() => void submit(replyText, comment.id)} disabled={!replyText.trim() || sending} aria-label="উত্তর পাঠান" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"><Send className="h-4 w-4" /></button>
              </div>
            )}
          </div>
        </div>
        {replies.map((reply) => renderComment(reply, Math.min(depth + 1, 2)))}
      </div>
    );
  };

  return (
    <div className="mt-3 space-y-3 border-t border-border pt-3">
      {loading ? <p className="text-xs text-muted-foreground">লোড হচ্ছে...</p> : comments.length === 0 ? <p className="text-xs text-muted-foreground">কোনো মন্তব্য নেই — প্রথম মন্তব্য করুন</p> : (
        <>
          {visibleTopLevel.map((comment) => renderComment(comment))}
          {!showAll && topLevel.length > 3 && <button type="button" onClick={() => setShowAll(true)} className="inline-flex min-h-8 items-center gap-1 pl-2 text-xs font-bold text-primary">আরো মন্তব্য দেখুন <ChevronDown className="h-3 w-3" /></button>}
        </>
      )}
      <div className="flex min-w-0 items-center gap-2 pt-1">
        {authorAvatar(user?.id, user?.name || "আমি", "h-8 w-8")}
        <input
          value={text}
          onChange={(event) => setText(event.target.value.slice(0, 200))}
          onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) void submit(text, null); }}
          placeholder="মন্তব্য লিখুন..."
          className="h-9 min-w-0 flex-1 rounded-full bg-muted px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button type="button" onClick={() => void submit(text, null)} disabled={!text.trim() || sending} aria-label="মন্তব্য পাঠান" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"><Send className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
