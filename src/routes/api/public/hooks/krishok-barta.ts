import { createFileRoute } from "@tanstack/react-router";
import { isAuthorizedCronRequest, unauthorizedCronResponse } from "@/lib/cron-auth.server";
import { collectNewsPreview } from "@/lib/news-preview.server";
import { newsPostPreview } from "@/lib/news-preview";

// "কৃষক বার্তা": daily at 08:00 Dhaka, analyses today's agri news across Bangladesh
// newspapers and posts the single most useful item from Google News RSS, summarises it in simple Bangla and posts it
// to the community feed under a verified bot profile. One post per run; URLs
// are deduped in krishok_barta_items.

const BOT_EMAIL = "krishok-barta@krishokbondhu.bd";
const BOT_NAME = "কৃষক বার্তা";

// Bangladesh newspapers whose agriculture pages are searched each morning.
const PAPERS = [
  "prothomalo.com", "jugantor.com", "kalerkantho.com", "ittefaq.com.bd", "samakal.com",
  "bd-pratidin.com", "dailynayadiganta.com", "jagonews24.com", "bdnews24.com", "banglanews24.com",
  "dhakapost.com", "risingbd.com", "somoynews.tv", "dailyinqilab.com", "bonikbarta.com",
  "ajkerpatrika.com", "deshrupantor.com", "manabzamin.com", "thedailystar.net", "tbsnews.net",
  "krishi.gov.bd", "agrinews24.com",
];
const TOPICS = "(কৃষি OR কৃষক OR ফসল OR সার OR বাজারদর)";

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
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query + " when:1d")}&hl=bn&gl=BD&ceid=BD:bn`;
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
  return items.slice(0, 20);
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

        // A bounded repair mode enriches old posts without publishing duplicates.
        if (new URL(request.url).searchParams.get("enrich") === "1") {
          const { data: stored } = await admin.from("internal_secrets").select("value").eq("name", "krishok_barta_user_id").maybeSingle();
          if (!stored?.value) return Response.json({ ok: true, enriched: 0 });
          const { data: existing, error } = await admin.from("posts").select("id,user_name,content,image_url")
            .eq("user_id", stored.value).is("image_url", null).order("created_at", { ascending: false }).limit(5);
          if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
          let enriched = 0;
          for (const post of existing ?? []) {
            const news = newsPostPreview(post);
            if (!news) continue;
            const preview = await collectNewsPreview(news.url);
            if (!preview.image) continue;
            const content = post.content.replace(news.url, preview.url);
            const { error: updateError } = await admin.from("posts").update({ content, image_url: preview.image }).eq("id", post.id).eq("user_id", stored.value);
            if (updateError) return Response.json({ ok: false, error: updateError.message }, { status: 500 });
            enriched++;
          }
          return Response.json({ ok: true, enriched });
        }

        const setting = await getAiSetting("krishok_barta");
        if (!setting.is_active) return Response.json({ ok: true, skipped: "disabled" });

        // Today's (Dhaka) agriculture news from every listed newspaper, in small site groups.
        const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });
        const all: NewsItem[] = [];
        for (let i = 0; i < PAPERS.length; i += 6) {
          const sites = PAPERS.slice(i, i + 6).map((d) => `site:${d}`).join(" OR ");
          all.push(...(await fetchNews(`${TOPICS} (${sites})`)));
        }
        const todays = all.filter((n) => {
          const d = new Date(n.pubDate);
          return isNaN(d.getTime()) || d.toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" }) === today
            || Date.now() - d.getTime() < 24 * 36e5;
        });
        if (!todays.length) return Response.json({ ok: true, posted: 0, reason: "no news" });
        const { data: seen } = await admin
          .from("krishok_barta_items")
          .select("source_url,title")
          .gte("created_at", new Date(Date.now() - 14 * 864e5).toISOString());
        const seenSet = new Set((seen ?? []).flatMap((r: any) => [r.source_url, r.title]));
        const fresh = todays.filter((n) => !seenSet.has(n.link) && !seenSet.has(n.title)).slice(0, 30);
        if (!fresh.length) return Response.json({ ok: true, posted: 0, reason: "all seen" });

        const list = fresh.map((n, i) => `${i + 1}. ${n.title} (${n.source || "সংবাদ"})`).join("\n");
        const raw = await callAi(setting, {
          json: true,
          system:
            "তুমি 'কৃষক বার্তা' — বাংলাদেশের কৃষকদের জন্য সংবাদ সম্পাদক। শুধু দেওয়া শিরোনাম থেকে তথ্য নাও, কিছু বানাবে না।",
          messages: [
            {
              role: "user",
              content: `আজকের বিভিন্ন সংবাদপত্রের কৃষি সংবাদ বিশ্লেষণ করে বাংলাদেশের সাধারণ কৃষকের জন্য সবচেয়ে কার্যকর (সরাসরি কাজে লাগে: বাজারদর, সহায়তা/প্রণোদনা, রোগ-পোকা সতর্কতা, আবহাওয়া, নতুন প্রযুক্তি) একটি সংবাদ বেছে নাও। কৃষি-সম্পর্কিত না হলে index 0 দাও।\n${list}\n\nJSON দাও: {"index": number (1-based), "tag": "বাজারদর|কৃষি সহায়তা|সতর্কতা|কৃষি সংবাদ", "summary": "সহজ বাংলায় ২-৩ বাক্যে কৃষকের জন্য সারসংক্ষেপ ও করণীয়"}`,
            },
          ],
        });
        let pick: { index: number; summary: string; tag?: string };
        try {
          pick = JSON.parse(raw.replace(/```json|```/g, "").trim());
        } catch {
          return Response.json({ ok: false, error: "bad ai output" }, { status: 502 });
        }
        const item = fresh[pick.index - 1];
        if (!item || !pick.summary) return Response.json({ ok: true, posted: 0, reason: "nothing relevant" });

        const userId = await ensureBotUser(admin);
        const preview = await collectNewsPreview(item.link);
        const footer = `\n\nসূত্র: ${item.source || "সংবাদ"}\n${preview.url}`;
        const heading = `📰 ${pick.tag || "আজকের সেরা কৃষি সংবাদ"} | ${item.title}\n\n`;
        const available = 500 - heading.length - footer.length;
        // Never truncate the source URL; skip exceptionally long headlines/URLs.
        if (available < 20) return Response.json({ ok: true, posted: 0, reason: "source too long" });
        const summary = pick.summary.trim();
        const content = heading + (summary.length > available ? summary.slice(0, available - 1) + "…" : summary) + footer;
        const { data: post, error } = await admin
          .from("posts")
          .insert({ user_id: userId, user_name: BOT_NAME, content, image_url: preview.image, type: "general", crop_tag: null })
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
