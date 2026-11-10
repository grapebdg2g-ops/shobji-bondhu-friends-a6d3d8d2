export function safeNewsUrl(value: string, base?: string): string | null {
  try {
    const url = new URL(value, base);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || url.username || url.password || !host.includes(".") ||
      host.endsWith(".local") || host.endsWith(".internal") || host.includes(":") ||
      /^\d+\.\d+\.\d+\.\d+$/.test(host)) return null;
    return url.href;
  } catch { return null; }
}

export function newsPostPreview(post: { user_name: string; content: string }) {
  if (post.user_name !== "কৃষক বার্তা") return null;
  const match = post.content.match(/https:\/\/[^\s<>]+/);
  const url = match ? safeNewsUrl(match[0]) : null;
  if (!url) return null;
  const lines = post.content.replace(match?.[0] ?? "", "").trim().split("\n");
  const title = (lines.shift() ?? "").replace(/^📰\s*[^|]+\|\s*/, "").trim();
  const source = lines.find((line) => line.startsWith("সূত্র:"))?.replace(/^সূত্র:\s*/, "") || new URL(url).hostname;
  return { url, title, source, summary: lines.filter((line) => !line.startsWith("সূত্র:")).join("\n").trim() };
}