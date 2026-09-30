import { Bookmark, MessageCircle, Share2 } from "lucide-react";
import { PostReactionPicker } from "@/components/krishi/post-reaction-picker";
import { REACTION_META, REACTION_TYPES, type ReactionType } from "@/lib/reactions";
import { Button } from "@/components/ui/button";

export function PostSocialActions({
  myReaction,
  reactionCounts,
  commentsCount,
  saved,
  commentOpen,
  commentLabel = "মন্তব্য",
  onReact,
  onComment,
  onSave,
  onShare,
}: {
  myReaction: ReactionType | null;
  reactionCounts: Partial<Record<ReactionType, number>>;
  commentsCount: number;
  saved: boolean;
  commentOpen?: boolean;
  commentLabel?: string;
  onReact: (reaction: ReactionType | null) => void;
  onComment: () => void;
  onSave: () => void;
  onShare: () => void;
}) {
  const totalReactions = REACTION_TYPES.reduce((sum, reaction) => sum + (reactionCounts[reaction] ?? 0), 0);
  const topReactions = [...REACTION_TYPES]
    .filter((reaction) => (reactionCounts[reaction] ?? 0) > 0)
    .sort((a, b) => (reactionCounts[b] ?? 0) - (reactionCounts[a] ?? 0))
    .slice(0, 3);

  return (
    <div className="min-w-0">
      <div className="flex min-w-0 items-center justify-between gap-2 border-t border-border/60 px-4 py-2 text-xs text-muted-foreground">
        <div className="flex min-w-0 items-center gap-1.5 truncate">
          {totalReactions > 0 ? (
            <>
              <span className="flex shrink-0 items-center -space-x-1" aria-hidden="true">
                {topReactions.map((reaction) => (
                   <span key={reaction} className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-card bg-muted p-0.5"><img src={REACTION_META[reaction].image} alt="" className="h-full w-full object-contain" /></span>
                ))}
              </span>
              <span className="truncate">{totalReactions} জনের প্রতিক্রিয়া</span>
            </>
          ) : (
            <span>প্রথমে আপনিই প্রতিক্রিয়া দিন</span>
          )}
        </div>
        <Button type="button" variant="ghost" onClick={onComment} className="h-auto max-w-[46%] shrink-0 truncate px-0 py-0 text-xs font-semibold text-muted-foreground hover:text-primary">
          {commentsCount > 0 ? `${commentsCount}টি মন্তব্য` : "মন্তব্য করুন"}
        </Button>
      </div>
      <div className="grid min-w-0 grid-cols-4 border-t border-border/60 px-2 py-1.5">
        <PostReactionPicker value={myReaction} onChange={onReact} />
         <Button
          type="button"
          onClick={onComment}
          aria-label="মন্তব্য দেখুন বা লিখুন"
           variant="ghost"
           className={`home-pressable min-h-11 min-w-0 gap-1 rounded-lg px-1 text-xs font-semibold ${commentOpen ? "text-primary" : "text-muted-foreground"}`}
        >
          <MessageCircle className="h-4 w-4" />
          <span className="hidden min-[360px]:inline">{commentLabel}</span>
          {commentsCount > 0 && <span>({commentsCount})</span>}
         </Button>
         <Button
          type="button"
          onClick={onSave}
          aria-label={saved ? "সংরক্ষণ থেকে সরান" : "পোস্ট সংরক্ষণ করুন"}
           variant="ghost"
           className={`home-pressable min-h-11 min-w-0 gap-1 rounded-lg px-1 text-xs font-semibold ${saved ? "text-reaction-care" : "text-muted-foreground"}`}
        >
          <Bookmark className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />
          <span className="hidden min-[360px]:inline">সংরক্ষণ</span>
         </Button>
         <Button
          type="button"
          onClick={onShare}
          aria-label="পোস্ট শেয়ার করুন"
           variant="ghost"
           className="home-pressable min-h-11 min-w-0 gap-1 rounded-lg px-1 text-xs font-semibold text-muted-foreground"
        >
          <Share2 className="h-4 w-4" />
          <span className="hidden min-[360px]:inline">শেয়ার</span>
         </Button>
      </div>
    </div>
  );
}
