import { safeNewsUrl } from "./news-preview";

function decode(value: string) {
  return value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

export function extractNewsImage(html: string, pageUrl: string): string | null {
  const tags = [...html.matchAll(/<meta\b[^>]*>/gi)];
  for (const key of ["og:image:secure_url", "og:image", "twitter:image"]) {
    for (const [tag] of tags) {
      const attrs = Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/gs)].map((m) => [m[1].toLowerCase(), decode(m[3])]));
      if ((attrs.property ?? attrs.name)?.toLowerCase() === key && attrs.content) {
        const url = safeNewsUrl(attrs.content, pageUrl);
        if (url) return url;
      }
    }
  }
  return null;
}

// Validate every redirect, limit downloaded HTML, and never fetch private addresses.
async function fetchPage(value: string, signal: AbortSignal): Promise<{ url: string; html: string }> {
  let url = safeNewsUrl(value);
  for (let hop = 0; url && hop < 5; hop++) {
    const response = await fetch(url, { redirect: "manual", signal, headers: { "User-Agent": "Mozilla/5.0 KrishokBondhu News Preview" } });
    if (response.status >= 300 && response.status < 400) {
      const next = response.headers.get("location");
      await response.body?.cancel();
      url = next ? safeNewsUrl(next, url) : null;
      continue;
    }
    if (!response.ok) { await response.body?.cancel(); throw new Error(`News page: ${response.status}`); }
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Empty news page");
    const decoder = new TextDecoder();
    let html = "", bytes = 0;
    try {
      while (bytes < 1_000_000) {
        const { value: chunk, done } = await reader.read();
        if (done) break;
        bytes += chunk.byteLength;
        html += decoder.decode(chunk, { stream: true });
      }
    } finally { await reader.cancel(); }
    return { url, html };
  }
  throw new Error("Invalid news URL or redirect limit");
}

export async function collectNewsPreview(sourceUrl: string) {
  const signal = AbortSignal.timeout(15_000);
  try {
    let page = await fetchPage(sourceUrl, signal);
    const parsed = new URL(page.url);
    if (parsed.hostname === "news.google.com") {
      const id = parsed.pathname.split("/").pop();
      const signature = page.html.match(/data-n-a-sg="([^"]+)"/)?.[1];
      const timestamp = page.html.match(/data-n-a-ts="(\d+)"/)?.[1];
      if (id && signature && timestamp) {
        const context = [["X", "X", ["X", "X"], null, null, 1, 1, "US:en", null, 1, null, null, null, null, null, 0, 1], "X", "X", 1, [1, 1, 1], 1, 1, null, 0, 0, null, 0];
        const payload = JSON.stringify(["garturlreq", context, id, Number(timestamp), signature]);
        const response = await fetch("https://news.google.com/_/DotsSplashUi/data/batchexecute", {
          method: "POST", signal, headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ "f.req": JSON.stringify([[["Fbv4je", payload, null, "0"]]]) }),
        });
        if (response.ok) {
          const body = await response.text();
          for (const line of body.split("\n")) {
            if (!line.startsWith("[[")) continue;
            try {
              for (const row of JSON.parse(line)) {
                if (row[0] !== "wrb.fr" || typeof row[2] !== "string") continue;
                const result = JSON.parse(row[2]);
                if (result[0] === "garturlres" && safeNewsUrl(result[1])) page = await fetchPage(result[1], signal);
              }
            } catch { /* Keep original source if Google cannot decode it. */ }
          }
        }
      }
    }
    return { url: page.url, image: new URL(page.url).hostname === "news.google.com" ? null : extractNewsImage(page.html, page.url) };
  } catch (error) {
    console.warn("News preview unavailable:", error instanceof Error ? error.message : "fetch failed");
    return { url: sourceUrl, image: null };
  }
}