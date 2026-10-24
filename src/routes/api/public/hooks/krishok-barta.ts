import { createFileRoute } from "@tanstack/react-router";
import { isAuthorizedCronRequest, unauthorizedCronResponse } from "@/lib/cron-auth.server";

// "কৃষক বার্তা": 3x daily (08/13/18 Dhaka) collects one public Bangladesh agri
// news item from Google News RSS, summarises it in simple Bangla and posts it
// to the community feed under a verified bot profile. One post per run; URLs
// are deduped in krishok_barta_items.

const BOT_EMAIL = "krishok-barta@krishokbondhu.bd";
const BOT_NAME = "কৃষক বার্তা";

const SLOTS: { tag: string; queries: string[] }[] = [
  { tag: "বাজারদর", queries: ["সবজির দাম বাজার", "চালের দাম বাজার", "কাঁচাবাজার দাম"] },
  { tag: "কৃষি সহায়তা", queries: ["কৃষি প্রণোদনা কৃষক", "কৃষি ঋণ কৃষক", "সার বীজ বিতরণ কৃষক"] },
  { tag: "কৃষি সংবাদ", queries: ["কৃষি অধিদপ্তর কৃষক", "ফসল চাষ কৃষক", "কৃষি আবহাওয়া ফসল"] },
];

type NewsItem = { title: string; link: string; source: string; pubDate: string };

function decode(s: string) {
  return s
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

async function fetchNews(query: string): Promise<NewsItem[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query + " when:2d")}&hl=bn&gl=BD&ceid=BD:bn`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 KrishokBondhu" } });
  if (!res.ok) return [];
  const xml = await res.text();
  const items: NewsItem[] = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const b = m[1];
    const get = (t: string) => decode(b.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`))?.[1] ?? "");
    const title = get("title");
    const link = get("link");
    if (title && link) items.push({ title, link, source: get("source"), pubDate: get("pubDate") });
  }
  return items.slice(0, 15);
}

async function ensureBotUser(admin: any): Promise<string> {
  const { data: stored } = await admin
    .from("internal_secrets")
    .select("value")
    .eq("name", "krishok_barta_user_id")
    .maybeSingle();
  if (stored?.value) return stored.value as string;
  const { data, error } = await admin.auth.admin.createUser({
    email: BOT_EMAIL,
    email_confirm: true,
    password: crypto.randomUUID() + crypto.randomUUID(),
    user_metadata: { name: BOT_NAME },
  });
  if (error || !data.user) throw new Error("bot user create failed: " + error?.message);
  const id = data.user.id;
  await admin.from("profiles").upsert({ id, name: BOT_NAME, is_verified: true, bio: "বাংলাদেশের কৃষি সংবাদ, বাজারদর ও সহায়তার দৈনিক আপডেট" });
  await admin.from("internal_secrets").upsert({ name: "krishok_barta_user_id", value: id });
  return id;
}

export const Route = createFileRoute("/api/public/hooks/krishok-barta")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isAuthorizedCronRequest(request)) return unauthorizedCronResponse();
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { getAiSetting, callAi } = await import("@/lib/ai-settings.server");
        const admin = supabaseAdmin as any;

        const setting = await getAiSetting("krishok_barta");
        if (!setting.is_active) return Response.json({ ok: true, skipped: "disabled" });

        const hour = Number(
          new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka", hour: "numeric", hour12: false }),
        );
        const slot = hour < 11 ? SLOTS[0] : hour < 16 ? SLOTS[1] : SLOTS[2];

        // Gather candidates, drop already-posted URLs/titles.
        const all: NewsItem[] = [];
        for (const q of slot.queries) all.push(...(await fetchNews(q)));
        if (!all.length) return Response.json({ ok: true, posted: 0, reason: "no news" });
        const { data: seen } = await admin
          .from("krishok_barta_items")
          .select("source_url,title")
          .gte("created_at", new Date(Date.now() - 14 * 864e5).toISOString());
        const seenSet = new Set((seen ?? []).flatMap((r: any) => [r.source_url, r.title]));
        const fresh = all.filter((n) => !seenSet.has(n.link) && !seenSet.has(n.title)).slice(0, 8);
        if (!fresh.length) return Response.json({ ok: true, posted: 0, reason: "all seen" });

        const list = fresh.map((n, i) => `${i + 1}. ${n.title} (${n.source || "সংবাদ"})`).join("\n");
        const raw = await callAi(setting, {
          json: true,
          system:
            "তুমি 'কৃষক বার্তা' — বাংলাদেশের কৃষকদের জন্য সংবাদ সম্পাদক। শুধু দেওয়া শিরোনাম থেকে তথ্য নাও, কিছু বানাবে না।",
          messages: [
            {
              role: "user",
              content: `বিষয়: ${slot.tag}\nনিচের সংবাদ শিরোনাম থেকে কৃষকের জন্য সবচেয়ে গুরুত্বপূর্ণ একটি বেছে নাও (কৃষি/বাজার/সহায়তা-সম্পর্কিত না হলে index 0 দাও)।\n${list}\n\nJSON দাও: {"index": number (1-based), "summary": "সহজ বাংলায় ২-৩ বাক্যে কৃষকের জন্য সারসংক্ষেপ ও করণীয়"}`,
            },
          ],
        });
        let pick: { index: number; summary: string };
        try {
          pick = JSON.parse(raw.replace(/```json|```/g, "").trim());
        } catch {
          return Response.json({ ok: false, error: "bad ai output" }, { status: 502 });
        }
        const item = fresh[pick.index - 1];
        if (!item || !pick.summary) return Response.json({ ok: true, posted: 0, reason: "nothing relevant" });

        const userId = await ensureBotUser(admin);
        const content = `📰 ${slot.tag} | ${item.title}\n\n${pick.summary.trim()}\n\nসূত্র: ${item.source || "সংবাদ"}\n${item.link}`;
        const { data: post, error } = await admin
          .from("posts")
          .insert({ user_id: userId, user_name: BOT_NAME, content, type: "general", crop_tag: null })
          .select("id")
          .single();
        if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
        await admin
          .from("krishok_barta_items")
          .insert({ source_url: item.link, title: item.title, source_name: item.source, post_id: post.id });
        return Response.json({ ok: true, posted: 1, post_id: post.id });
      },
    },
  },
});
