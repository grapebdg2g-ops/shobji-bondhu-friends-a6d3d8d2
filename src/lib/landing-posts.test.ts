import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { latestLandingPosts, type LandingPost } from "./landing-posts";

describe("landing community preview", () => {
  it("shows only the latest 10 real posts", () => {
    const posts: LandingPost[] = Array.from({ length: 12 }, (_, i) => ({
      id: String(i), user_name: "Farmer", content: "Post", image_url: null,
      crop_tag: null, likes_count: 0, comments_count: 0,
      created_at: `2026-10-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
    }));
    const result = latestLandingPosts(posts);
    assert.equal(result.length, 10);
    assert.equal(result[0].id, "11");
    assert.equal(result[9].id, "2");
  });
});