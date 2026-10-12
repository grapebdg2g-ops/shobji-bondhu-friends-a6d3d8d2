import { describe, expect, it } from "vitest";
import { latestLandingPosts, type LandingPost } from "./landing-posts";

describe("landing community preview", () => {
  it("shows only the latest 10 real posts", () => {
    const posts: LandingPost[] = Array.from({ length: 12 }, (_, i) => ({
      id: String(i), user_name: "Farmer", content: "Post", image_url: null,
      crop_tag: null, likes_count: 0, comments_count: 0,
      created_at: `2026-10-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
    }));
    const result = latestLandingPosts(posts);
    expect(result).toHaveLength(10);
    expect(result[0].id).toBe("11");
    expect(result[9].id).toBe("2");
  });
});