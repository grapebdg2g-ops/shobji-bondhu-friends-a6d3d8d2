import { createServerFn } from "@tanstack/react-start";
import { LANDING_POST_LIMIT, latestLandingPosts, type LandingPost } from "./landing-posts";

/** Public preview uses existing anonymous read permissions, never privileged access. */
export const getLandingPosts = createServerFn({ method: "GET" }).handler(async () => {
  const url = process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return { posts: [] as LandingPost[], unavailable: true };
  try {
    const query = new URLSearchParams({
      select: "id,user_name,content,image_url,crop_tag,likes_count,comments_count,created_at",
      order: "created_at.desc,id.desc",
      limit: String(LANDING_POST_LIMIT),
    });
    const response = await fetch(`${url}/rest/v1/posts?${query}`, {
      headers: { apikey: key },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      console.error("Public post preview unavailable", response.status);
      return { posts: [] as LandingPost[], unavailable: true };
    }
    const posts = (await response.json()) as LandingPost[];
    return { posts: latestLandingPosts(posts), unavailable: false };
  } catch {
    return { posts: [] as LandingPost[], unavailable: true };
  }
});