export const REACTION_TYPES = ["like", "love", "care", "haha", "wow", "sad", "angry"] as const;

export type ReactionType = (typeof REACTION_TYPES)[number];

export const REACTION_META: Record<ReactionType, { emoji: string; image: string; label: string; className: string }> = {
  like: { emoji: "👍", image: "/reactions/like.svg", label: "পছন্দ", className: "text-reaction-like" },
  love: { emoji: "❤️", image: "/reactions/love.svg", label: "ভালোবাসা", className: "text-reaction-love" },
  care: { emoji: "🤗", image: "/reactions/care.svg", label: "যত্ন", className: "text-reaction-care" },
  haha: { emoji: "😂", image: "/reactions/haha.svg", label: "হাহা", className: "text-reaction-haha" },
  wow: { emoji: "😮", image: "/reactions/wow.svg", label: "বাহ", className: "text-reaction-wow" },
  sad: { emoji: "😢", image: "/reactions/sad.svg", label: "দুঃখ", className: "text-reaction-sad" },
  angry: { emoji: "😡", image: "/reactions/angry.svg", label: "রাগ", className: "text-reaction-angry" },
};
