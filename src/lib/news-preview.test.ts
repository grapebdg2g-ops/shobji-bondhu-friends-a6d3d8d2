import { describe, expect, it } from "bun:test";
import { newsPostPreview, safeNewsUrl } from "./news-preview";
import { extractNewsImage } from "./news-preview.server";

describe("news source previews", () => {
  it("keeps the source link and news headline from existing কৃষক বার্তা posts", () => {
    expect(newsPostPreview({ user_name: "কৃষক বার্তা", content: "📰 বাজারদর | সবজির দাম\n\nআজকের খবর\nসূত্র: সংবাদ\nhttps://example.com/news" })).toEqual({ url: "https://example.com/news", title: "সবজির দাম", source: "সংবাদ", summary: "আজকের খবর" });
  });
  it("uses the publisher featured image, including relative and entity-encoded URLs", () => {
    expect(extractNewsImage(`<meta content='/photo.jpg?a=1&amp;b=2' property='og:image'>`, "https://example.com/news")).toBe("https://example.com/photo.jpg?a=1&b=2");
  });
  it("rejects private and unsafe image or source URLs", () => {
    for (const url of ["https://127.0.0.1/a", "https://10.0.0.1", "https://localhost", "https://host.internal", "javascript:alert(1)"]) expect(safeNewsUrl(url)).toBeNull();
  });
  it("does not invent an image when the publisher provides none", () => {
    expect(extractNewsImage("<title>News</title>", "https://example.com/news")).toBeNull();
  });
});