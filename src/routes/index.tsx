import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import farmer from "@/assets/farmer-intro.webp";
import { useUser } from "@/contexts/user-context";
import { Sprout, TrendingUp, Users } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "কৃষক বন্ধু — কৃষকের বিশ্বস্ত সঙ্গী" },
      {
        name: "description",
        content: "কৃষক বন্ধুর বাজারদর, কৃষি পরামর্শ ও কৃষক সম্প্রদায়ে প্রবেশ করুন।",
      },
      { property: "og:title", content: "কৃষক বন্ধু — কৃষকের বিশ্বস্ত সঙ্গী" },
      {
        property: "og:description",
        content: "কৃষক বন্ধুর বাজারদর, কৃষি পরামর্শ ও কৃষক সম্প্রদায়ে প্রবেশ করুন।",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Index() {
  const { user } = useUser();
  return (
    <main className="bg-background text-foreground">
      <section className="relative isolate flex min-h-[480px] items-center overflow-hidden brand-banner">
        <img src={farmer} alt="সবজির ক্ষেতে ফুলকপি পরীক্ষা করছেন একজন কৃষক" width={1536} height={1024} fetchPriority="high" className="absolute inset-0 -z-20 h-full w-full object-cover object-right" />
        <div className="intro-shade absolute inset-0 -z-10" />
        <div className="mx-auto w-full max-w-6xl px-6 py-16">
          <div className="max-w-lg">
            <h1 className="text-4xl font-bold md:text-5xl">কৃষক বন্ধু</h1>
            <p className="mt-4 text-xl">কৃষকের বিশ্বস্ত সঙ্গী</p>
            <p className="mt-4 text-base leading-7">আজকের বাজারদর, ফসলের চাষ পদ্ধতি ও কৃষি পরামর্শ—বাংলায়, আপনার হাতের কাছে।</p>
            <div className="mt-6 flex flex-wrap gap-3"><Button asChild><Link to="/prices">আজকের বাজারদর</Link></Button><Button variant="secondary" asChild><Link to="/vegetable-guide">ফসল গাইড</Link></Button></div>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-6 py-10">
        <h2 className="text-2xl font-bold">চাষ থেকে বাজার—পাশে আছি</h2>
        <div className="mt-6 grid gap-8 md:grid-cols-3">
          <div><TrendingUp className="text-primary" /><h3 className="mt-3 text-lg font-bold">এলাকার বাজারদর</h3><p className="mt-2 text-muted-foreground">সরকারি কৃষি বিপণন অধিদপ্তর ও কৃষকদের দেওয়া দাম, উৎস ও তারিখসহ।</p></div>
          <div><Sprout className="text-primary" /><h3 className="mt-3 text-lg font-bold">ফসলের চাষ গাইড</h3><p className="mt-2 text-muted-foreground">ফসলের মৌসুম, জাত, পরিচর্যা, আনুমানিক খরচ ও ফলনের তথ্য।</p></div>
          <div><Users className="text-primary" /><h3 className="mt-3 text-lg font-bold">নিজের কৃষি সঙ্গী</h3><p className="mt-2 text-muted-foreground">নিজের ফসলের পরিকল্পনা, আয়-ব্যয়ের হিসাব ও কৃষকদের সঙ্গে আলোচনা।</p></div>
        </div>
        <div className="mt-10 border-t border-border pt-6"><Button asChild><Link to={user ? "/dashboard" : "/register"}>{user ? "আমার কৃষক বন্ধু" : "কৃষক বন্ধুতে যোগ দিন"}</Link></Button></div>
      </section>
    </main>
  );
}
