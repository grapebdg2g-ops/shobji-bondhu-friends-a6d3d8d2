export const LANDING_POST_LIMIT = 10;

export type LandingPost = {
  id: string;
  user_name: string;
  content: string;
  image_url: string | null;
  crop_tag: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
};

export function latestLandingPosts(posts: LandingPost[]) {
  return [...posts]
    .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id))
    .slice(0, LANDING_POST_LIMIT);
}