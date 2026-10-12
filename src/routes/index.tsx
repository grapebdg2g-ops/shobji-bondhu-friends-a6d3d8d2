import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import farmer from "@/assets/farmer-intro.webp";
import { useUser } from "@/contexts/user-context";
import { ArrowRight, MessageCircle, Phone, Sprout, ThumbsUp, TrendingUp, Users } from "lucide-react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getLandingPosts } from "@/lib/landing-posts.functions";
import { toBn } from "@/lib/bn";

const landingPostsQuery = queryOptions({
  queryKey: ["landing-community-posts"],
  queryFn: () => getLandingPosts(),
  staleTime: 60_000,
});

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(landingPostsQuery),
  component: Index,
  head: () => ({
    meta: [
      { title: "কৃষক বন্ধু — কৃষকের বিশ্বস্ত সঙ্গী" },
      {
        name: "description",
        content: "আমরা কৃষক মিলে করব বাজারদর, ঠকব নাকো আর। আজকের বাজারদর দেখুন ও কৃষকদের সঙ্গে অভিজ্ঞতা ভাগ করুন।",
      },
      { property: "og:title", content: "কৃষক বন্ধু — কৃষকের বিশ্বস্ত সঙ্গী" },
      {
        property: "og:description",
        content: "আমরা কৃষক মিলে করব বাজারদর, ঠকব নাকো আর। আজকের বাজারদর দেখুন ও কৃষকদের সঙ্গে অভিজ্ঞতা ভাগ করুন।",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Index() {
  const { user } = useUser();
  const { data } = useSuspenseQuery(landingPostsQuery);
  return (
    <main className="bg-background text-foreground">
      <section className="relative isolate flex min-h-[480px] items-center overflow-hidden brand-banner">
        <img src={farmer} alt="সবজির ক্ষেতে ফুলকপি পরীক্ষা করছেন একজন কৃষক" width={1536} height={1024} fetchPriority="high" className="absolute inset-0 -z-20 h-full w-full object-cover object-right" />
        <div className="intro-shade absolute inset-0 -z-10" />
        <div className="mx-auto w-full max-w-6xl px-6 py-16">
          <div className="max-w-lg">
            <h1 className="text-4xl font-bold md:text-5xl">কৃষক বন্ধু</h1>
            <p className="mt-4 text-3xl font-bold leading-relaxed">আমরা কৃষক মিলে করব বাজারদর,<br />ঠকব নাকো আর।</p>
            <p className="mt-4 text-xl">কৃষকের বিশ্বস্ত সঙ্গী</p>
            <p className="mt-4 text-base leading-7">আজকের বাজারদর, ফসলের চাষ পদ্ধতি ও কৃষি পরামর্শ—বাংলায়, আপনার হাতের কাছে।</p>
            <div className="mt-6 flex flex-wrap gap-3"><Button size="lg" variant="secondary" asChild><Link to="/prices"><TrendingUp />আজকের বাজারদর<ArrowRight /></Link></Button><Button variant="outline" asChild><Link to="/vegetable-guide">ফসল গাইড</Link></Button></div>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
          <div><h2 className="text-2xl font-bold">সঠিক দাম জানি, একসঙ্গে এগিয়ে যাই</h2><p className="mt-2 text-muted-foreground">নিজের এলাকার দাম জানুন, অন্য কৃষকের দেওয়া দামের সঙ্গে মিলিয়ে নিন।</p></div>
          <Button size="lg" asChild><Link to="/prices"><TrendingUp />বাজারদর দেখুন<ArrowRight /></Link></Button>
        </div>
        <div className="mt-6 grid gap-8 md:grid-cols-3">
          <div><TrendingUp className="text-primary" /><h3 className="mt-3 text-lg font-bold">এলাকার বাজারদর</h3><p className="mt-2 text-muted-foreground">সরকারি কৃষি বিপণন অধিদপ্তর ও কৃষকদের দেওয়া দাম, উৎস ও তারিখসহ।</p></div>
          <div><Sprout className="text-primary" /><h3 className="mt-3 text-lg font-bold">ফসলের চাষ গাইড</h3><p className="mt-2 text-muted-foreground">ফসলের মৌসুম, জাত, পরিচর্যা, আনুমানিক খরচ ও ফলনের তথ্য।</p></div>
          <div><Users className="text-primary" /><h3 className="mt-3 text-lg font-bold">কৃষকের সঙ্গে কৃষকের যোগাযোগ</h3><p className="mt-2 text-muted-foreground">চাষের অভিজ্ঞতা ভাগ করুন, প্রশ্ন করুন এবং বন্ধুদের সঙ্গে ব্যক্তিগত ও গ্রুপে আলোচনা করুন।</p></div>
        </div>
        <div className="mt-10 border-t border-border pt-6"><Button asChild><Link to={user ? "/dashboard" : "/register"}>{user ? "আমার কৃষক বন্ধু" : "কৃষক বন্ধুতে যোগ দিন"}</Link></Button></div>
      </section>
      <section className="border-y border-border bg-muted/40">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div><div className="mb-2 flex items-center gap-2 text-primary"><Users /><span>কৃষকের পাশে কৃষক</span></div><h2 className="text-2xl font-bold">কৃষকদের কথা ও অভিজ্ঞতা</h2><p className="mt-2 text-muted-foreground">মাঠের খবর, চাষের সাফল্য আর একে অন্যের পাশে থাকার গল্প।</p></div>
            <Button asChild><Link to={user ? "/feed" : "/login"}><MessageCircle />আলোচনায় যোগ দিন</Link></Button>
          </div>
          {data.posts.length > 0 ? <div className="grid items-start gap-4 md:grid-cols-2">
            {data.posts.map((post) => <article key={post.id} className="overflow-hidden rounded-lg border border-border bg-card text-card-foreground">
              <div className="flex items-center gap-3 px-5 pt-5"><span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary text-lg font-bold text-secondary-foreground">{post.user_name.trim().slice(0, 1) || "ক"}</span><div className="min-w-0"><h3 className="break-words font-bold">{post.user_name}</h3><time dateTime={post.created_at} className="text-sm text-muted-foreground">{new Date(post.created_at).toLocaleDateString("bn-BD", { timeZone: "Asia/Dhaka", year: "numeric", month: "long", day: "numeric" })}</time></div></div>
              {post.crop_tag && <p className="mx-5 mt-3 text-sm text-primary">{post.crop_tag}</p>}
              <p className="whitespace-pre-wrap break-words px-5 py-4 text-base leading-7">{post.content}</p>
              {post.image_url && <img src={post.image_url} alt="কৃষকের পোস্টের ছবি" loading="lazy" className="max-h-96 w-full object-contain bg-muted" />}
              <div className="flex flex-wrap items-center gap-5 border-t border-border px-5 py-3 text-sm text-muted-foreground"><span className="inline-flex items-center gap-2"><ThumbsUp className="h-4 w-4" />{toBn(post.likes_count)} প্রতিক্রিয়া</span><span className="inline-flex items-center gap-2"><MessageCircle className="h-4 w-4" />{toBn(post.comments_count)} মন্তব্য</span></div>
            </article>)}
          </div> : <p className="py-8 text-muted-foreground">{data.unavailable ? "এই মুহূর্তে পোস্ট দেখা যাচ্ছে না। পরে আবার চেষ্টা করুন।" : "এখনো কোনো পোস্ট নেই। প্রথম অভিজ্ঞতাটি শেয়ার করুন।"}</p>}
        </div>
      </section>
      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8">
        <div><h2 className="text-xl font-bold">কৃষক বন্ধু — যোগাযোগ</h2><p className="mt-1 text-muted-foreground">আপনার কথা শুনতে আমরা আছি।</p></div>
        <Button size="lg" variant="outline" asChild><a href="tel:+8801615335955"><Phone />০১৬১৫৩৩৫৯৫৫</a></Button>
      </footer>
    </main>
  );
}
