import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  MapPin,
  Menu,
  ChevronRight,
  Stethoscope,
  MessageSquareText,
  CalendarDays,
  Leaf,
  FlaskConical,
  ShoppingBasket,
  Bug,
  Sprout,
  Camera,
  MessageCircle,
  Sparkles,
  CircleCheck,
  CloudRain,
  ArrowUpRight,
  Activity,
  Recycle,
  Carrot,
  TrendingUp,
  ArrowLeftRight,
  UserCheck,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useNotifications } from "@/hooks/use-notifications";
import { useUser } from "@/contexts/user-context";
import { WeatherAlertBanner } from "@/components/krishi/weather-alert-banner";
import { DashboardWeatherWidget } from "@/components/krishi/dashboard-weather-widget";
import { useSidebar } from "@/components/krishi/app-sidebar";
const CreatePostSheet = lazy(() => import("@/components/krishi/create-post-sheet").then((m) => ({ default: m.CreatePostSheet })));
import { CommentsSection } from "@/components/krishi/comments-section";
import { PostSocialActions } from "@/components/krishi/post-social-actions";
const CropAdvisoryWidget = lazy(() => import("@/components/krishi/crop-advisory-widget").then((m) => ({ default: m.CropAdvisoryWidget })));
import { useMutedIds } from "@/hooks/use-muted-users";
import { supabase } from "@/integrations/supabase/client";
import type { Post } from "@/hooks/use-feed";
import { readSavedPostIds, writeSavedPostIds } from "@/lib/saved-posts";
import { usePostReactions } from "@/hooks/use-post-reactions";
import { useAuthorAvatars } from "@/hooks/use-author-avatars";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "হোম — কৃষক বন্ধু" }] }),
});

function Dashboard() {
  const navigate = useNavigate();
  const { user, loading } = useUser();
  const { unreadCount, items: notifItems, markRead } = useNotifications(user?.id ?? null);
  const friendNotifs = notifItems.filter(
    (n) => !n.is_read && (n.type === "friend_added" || n.type === "connection_request"),
  );
  const { setCollapsed } = useSidebar();
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (!user.district) { navigate({ to: "/register" }); return; }
    // First login after sign-up: show the profile completion flow once.
    let cancelled = false;
    supabase
      .from("profile_details")
      .select("onboarding_completed_at")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled || error) return;
        if (!data?.onboarding_completed_at) navigate({ to: "/onboarding", replace: true });
      });
    return () => { cancelled = true; };
  }, [loading, user, navigate]);

  return (
    <main className="min-h-screen w-full bg-[#F6FBF7] md:mx-auto md:max-w-[760px]">
      {/* SECTION 1 — Dynamic Hero */}
      <header className="relative overflow-hidden rounded-b-[32px] px-4 pt-5 pb-12 sm:px-6 sm:pt-7 sm:pb-14" style={{ background: "var(--gradient-brand)" }}>
        <div className="home-float pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#74C69D]/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 bottom-0 h-40 w-40 rounded-full bg-[#F4A261]/15 blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCollapsed(false)}
                aria-label="মেনু খুলুন"
                className="home-pressable flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/20"
              >
                <Menu className="h-5 w-5" strokeWidth={2.5} />
              </button>
              <button
                onClick={() => navigate({ to: "/notifications" })}
                aria-label="বিজ্ঞপ্তি"
                className="home-pressable relative flex h-10 w-10 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20 backdrop-blur-md"
              >
                <Bell className="h-5 w-5 text-white" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-[#F4A261] px-1 text-[10px] font-extrabold text-[#123B2A] ring-2 ring-[#2D6A4F]">
                    {unreadCount > 9 ? "৯+" : unreadCount}
                  </span>
                )}
              </button>
            </div>
            <div className="inline-flex min-w-0 max-w-[62%] items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-white/95 ring-1 ring-white/20 backdrop-blur-md sm:max-w-none">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate text-xs font-bold">{user?.district ?? "আপনার এলাকা"}</span>
            </div>
          </div>
          <div className="mt-7 max-w-xl">
            <p className="text-sm font-semibold text-white/70">শুভ সকাল, {user?.name || "কৃষক"}</p>
            <h1 className="home-rise-in mt-1 text-[2rem] font-black leading-tight tracking-tight text-white">আজ কীভাবে সাহায্য করতে পারি?</h1>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-white/75">আপনার ফসল, আবহাওয়া এবং বাজারের খবর এক জায়গায় দেখে আজকের সেরা সিদ্ধান্ত নিন।</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                onClick={() => navigate({ to: "/ai-bondhu/pesticide" })}
                className="home-rise-in-2 home-pressable inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-xs font-extrabold text-[#1B4332] shadow-lg shadow-black/10"
              >
                <Leaf className="h-4 w-4" /> কীটনাশক গাইড
              </button>
              <button
                onClick={() => navigate({ to: "/ai-bondhu/calculator" })}
                className="home-rise-in-3 home-pressable inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-xs font-extrabold text-white ring-1 ring-white/25 backdrop-blur-md"
              >
                <FlaskConical className="h-4 w-4" /> সার ক্যালকুলেটর
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="relative -mt-8 px-4 sm:px-6">
        {friendNotifs.length > 0 && (
          <div className="mb-3 space-y-2">
            {friendNotifs.slice(0, 3).map((n) => (
              <div key={n.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-card)]">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  {n.type === "friend_added" ? <UserCheck className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
                </div>
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => {
                    void markRead(n.id);
                    if (n.type === "friend_added" && n.ref_id) navigate({ to: "/u/$userId", params: { userId: n.ref_id } });
                    else navigate({ to: "/connections" });
                  }}
                >
                  <p className="text-sm font-extrabold text-foreground">{n.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{n.body}</p>
                </button>
                <button type="button" aria-label="বন্ধ করুন" onClick={() => void markRead(n.id)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        <WeatherAlertBanner district={user?.district} />
        {/* SECTION 2 — Weather */}
        <DashboardWeatherWidget district={user?.district} upazila={user?.upazila} />
      </div>

      <TodayBrief onCreatePost={() => setCreateOpen(true)} />

      {/* Crop Advisory urgent tasks */}
      <Suspense fallback={null}><CropAdvisoryWidget /></Suspense>

      {/* SECTION 3 — AI কৃষি সমাধান */}
      <AiSolutionsSection />


      {/* SECTION 4 — Quick Actions */}
      <QuickActionsSection />

      {/* SECTION 5 — Community Feed */}
      <CommunityFeedSection userName={user?.name ?? null} onCompose={() => setCreateOpen(true)} />

      {createOpen && <Suspense fallback={null}><CreatePostSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          /* refresh handled via query invalidation in sheet */
        }}
      /></Suspense>}
    </main>
  );
}

/* ──────────────────────────── SECTION 3 ──────────────────────────── */

const AI_CARDS = [
  {
    href: "/ai-bondhu/disease",
    Icon: Stethoscope,
    title: "AI গাছের ডাক্তার",
    desc: "ফসলের ছবি তুলে রোগ শনাক্ত করুন",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-700",
  },
  {
    href: "/ai-bondhu/chat",
    Icon: MessageSquareText,
    title: "AI বন্ধু",
    desc: "ভয়েস বা টেক্সটে পরামর্শ নিন",
    iconBg: "bg-purple-100",
    iconColor: "text-purple-700",
  },
  {
    href: "/ai-bondhu/calendar",
    Icon: CalendarDays,
    title: "ফসল চাষের ক্যালেন্ডার",
    desc: "আপনার এলাকার চাষের সময়সূচি দেখুন",
    iconBg: "bg-orange-100",
    iconColor: "text-orange-700",
  },
  {
    href: "/vegetable-guide",
    Icon: Carrot,
    title: "সবজি চাষ গাইড",
    desc: "সবজি চাষের পূর্ব প্রস্তুতি হিসেবে সকল সবজি সম্পর্কে জানুন",
    iconBg: "bg-green-100",
    iconColor: "text-green-700",
  },
  {
    href: "/crop-planner",
    Icon: Sparkles,
    title: "ফসল পরিকল্পনা",
    desc: "মাটি ও লক্ষ্য অনুযায়ী সেরা ফসল সুপারিশ",
    iconBg: "bg-yellow-100",
    iconColor: "text-yellow-700",
  },
  {
    href: "/ai-bondhu/soil",
    Icon: Activity,
    title: "মৃত্তিকা বিশ্লেষণ",
    desc: "মাটির পুষ্টি ও সারের স্মার্ট রিপোর্ট",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-700",
  },
  {
    href: "/ai-bondhu/calculator",
    Icon: FlaskConical,
    title: "সার ক্যালকুলেটর",
    desc: "জমির জন্য প্রয়োজনীয় সার হিসাব করুন",
    iconBg: "bg-teal-100",
    iconColor: "text-teal-700",
  },
  {
    href: "/organic-fertilizer",
    Icon: Recycle,
    title: "জৈব কর্নার",
    desc: "নিজে জমির জৈব সার নিজেই উৎপাদন করুন",
    iconBg: "bg-lime-100",
    iconColor: "text-lime-700",
  },
  {
    href: "/ai-bondhu/pesticide",
    Icon: Leaf,
    title: "কীটনাশক গাইড",
    desc: "পোকা ও রোগ দমনের নিরাপদ পদ্ধতি",
    iconBg: "bg-red-100",
    iconColor: "text-red-700",
  },
  {
    href: "/price-prediction",
    Icon: TrendingUp,
    title: "দামের পূর্বাভাস",
    desc: "আপনার চাষকৃত সবজির বাজার মূল্য কেমন হতে পারে যাচাই করুন",
    iconBg: "bg-indigo-100",
    iconColor: "text-indigo-700",
  },
  {
    href: "/prices",
    Icon: ShoppingBasket,
    title: "বাজার দর দেখুন",
    desc: "আজকের বাজার দর কত দেখুন",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-700",
  },
  {
    href: "/exchange",
    Icon: ArrowLeftRight,
    title: "বিনিময়",
    desc: "কৃষকদের মাঝে আপনার দেশি বীজ ছড়িয়ে দিন অথবা নিজেদের মধ্যে ফসল, কৃষি পণ্য ও যন্ত্রপাতি বিনিময় করুন",
    iconBg: "bg-cyan-100",
    iconColor: "text-cyan-700",
  },
];

function AiSolutionsSection() {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeCard, setActiveCard] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveCard(Number(entry.target.getAttribute("data-card-index")));
          }
        });
      },
      { root: el, threshold: 0.6 }
    );
    el.querySelectorAll("[data-card-index]").forEach((card: Element) => observer.observe(card));
    return () => observer.disconnect();
  }, []);

  return (
    <section className="mt-6 px-4">
      <div className="relative overflow-hidden rounded-[28px] p-4 shadow-[0_20px_44px_-24px_rgba(27,67,50,0.9)]" style={{ background: "var(--gradient-brand)" }}>
        <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-[#74C69D]/25 blur-3xl" />
        <div className="relative z-10">
          <button onClick={() => navigate({ to: "/ai-bondhu" })} className="flex w-full items-start justify-between text-left text-white">
            <div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
                  <Sparkles className="h-4 w-4" />
                  <span className="home-soft-pulse absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#F4A261] ring-2 ring-[#2D6A4F]" />
                </span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/65">কৃষি সহায়ক</p>
                  <h2 className="text-lg font-black">আপনার নিজস্ব AI কৃষি সহকারী</h2>
                </div>
              </div>
              <p className="mt-3 max-w-md text-xs leading-relaxed text-white/75">আপনার কৃষি বিষয়ক সকল সহায়তার জন্য AI কৃষি সহকারী প্রস্তুত — কৃষি বিষয়ক যেকোনো প্রশ্ন করুন অথবা নিচের মেনু থেকে সাহায্য নিন।</p>
            </div>
            <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-white/80" strokeWidth={2.5} />
          </button>

          <div className="home-stagger mt-4 flex flex-wrap gap-2">
            {["টমেটোর পাতায় দাগ", "আজ কী সার দেব?", "বাজারদর কেমন?"] .map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => navigate({ to: "/ai-bondhu/chat" })}
                className="home-pressable rounded-full bg-white/10 px-3 py-2 text-[11px] font-bold text-white ring-1 ring-white/20 backdrop-blur-md"
              >
                {prompt}
              </button>
            ))}
          </div>

          <div ref={scrollRef} className="mt-4 flex gap-3 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1" style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}>
            {AI_CARDS.map((c, i) => (
              <button
                key={c.href}
                data-card-index={i}
                onClick={() => navigate({ to: c.href })}
                className="home-pressable snap-start shrink-0 w-[148px] min-w-[148px] rounded-2xl bg-white/95 p-3.5 text-left shadow-[var(--shadow-card)]"
                style={{ scrollSnapAlign: "start" }}
              >
                <div className={`mb-2.5 flex h-10 w-10 items-center justify-center rounded-xl ${c.iconBg}`}>
                  <c.Icon className={`h-5 w-5 ${c.iconColor}`} strokeWidth={2.2} />
                </div>
                <h3 className="text-sm font-extrabold leading-tight text-gray-900">{c.title}</h3>
                <p className="mt-1 text-[11px] leading-snug text-gray-500">{c.desc}</p>
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex gap-1.5">
              {AI_CARDS.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === activeCard ? "w-5 bg-white" : "w-1.5 bg-white/45"}`} />)}
            </div>
            <button type="button" onClick={() => navigate({ to: "/ai-bondhu/chat" })} className="home-pressable inline-flex items-center gap-1.5 rounded-full bg-[#F4A261] px-3 py-2 text-[11px] font-extrabold text-[#123B2A] shadow-sm">
              <MessageSquareText className="h-3.5 w-3.5" /> প্রশ্ন করুন
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}


/* ──────────────────────────── SECTION 4 ──────────────────────────── */

const QUICK_ACTIONS = [
  { href: "/prices", Icon: ShoppingBasket, label: "বাজারদর", desc: "আজকের দাম দেখুন", bg: "bg-[#FFF1E5]", color: "text-[#D96B27]" },
  { href: "/ai-bondhu/soil", Icon: Activity, label: "মৃত্তিকা বিশ্লেষণ", desc: "মাটির পুষ্টি পরীক্ষা", bg: "bg-[#E7F4FB]", color: "text-[#3186B7]" },
  { href: "/ai-bondhu/pesticide", Icon: Leaf, label: "কীটনাশক গাইড", desc: "নিরাপদে পোকা দমন করুন", bg: "bg-[#E8F7EC]", color: "text-[#2D6A4F]" },
  { href: "/crop-planner", Icon: Sprout, label: "ফসল পরিকল্পনা", desc: "চাষের ধাপ সাজান", bg: "bg-[#F0EBFF]", color: "text-[#7457C7]" },
];

function QuickActionsSection() {
  return (
    <section className="mt-6 px-4">
      <div className="mb-3 flex items-end justify-between px-1">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#52B788]">দ্রুত শুরু করুন</p>
          <h2 className="mt-1 text-lg font-black tracking-tight text-gray-900">আজ আপনার কী দরকার?</h2>
        </div>
        <Link to="/ai-bondhu" className="text-xs font-bold text-[#2D6A4F] hover:underline">সব টুল</Link>
      </div>
      <div className="home-stagger grid grid-cols-2 gap-2.5">
        {QUICK_ACTIONS.map((q) => (
          <Link
            key={q.label}
            to={q.href as never}
            className="home-pressable group rounded-[22px] border border-white/80 bg-white p-3.5 shadow-[var(--shadow-card)]"
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${q.bg}`}>
              <q.Icon className={`h-5 w-5 ${q.color}`} strokeWidth={2.2} />
            </div>
            <div className="mt-3 flex items-end justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-gray-900">{q.label}</h3>
                <p className="mt-1 text-[11px] leading-snug text-gray-500">{q.desc}</p>
              </div>
              <ArrowUpRight className={`h-4 w-4 shrink-0 ${q.color} transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5`} />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function TodayBrief({ onCreatePost }: { onCreatePost: () => void }) {
  const navigate = useNavigate();

  return (
    <section className="relative z-10 mt-5 px-4 sm:mt-6">
      <div className="home-gradient-border rounded-[28px] border border-white/80 bg-white/95 p-4 shadow-[0_18px_42px_-24px_rgba(27,67,50,0.55)] backdrop-blur-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-[#52B788]">আজকের ফোকাস</p>
            <h2 className="mt-1 text-xl font-black tracking-tight text-gray-900">আপনার কৃষি সারাংশ</h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={() => navigate({ to: "/crop-diary" })} className="home-pressable inline-flex min-h-9 items-center gap-1 rounded-full bg-[#E8F7EC] px-2.5 text-[11px] font-bold text-[#2D6A4F]"><CalendarDays className="h-3.5 w-3.5" /> প্ল্যান</button>
            <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-[#F0FFF4] text-[#2D6A4F]">
            <svg aria-label="আজকের কাজের অগ্রগতি" role="img" viewBox="0 0 36 36" className="absolute inset-0 h-full w-full -rotate-90">
              <path d="M18 3a15 15 0 1 1 0 30a15 15 0 1 1 0-30" fill="none" stroke="currentColor" strokeOpacity=".12" strokeWidth="3" />
              <path d="M18 3a15 15 0 1 1 0 30a15 15 0 1 1 0-30" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="72 100" className="home-ring-draw" />
            </svg>
              <span className="text-[10px] font-black">আজ</span>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-[#F6FBF7] px-3 py-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#D8F3DC] text-[#2D6A4F]"><CircleCheck className="h-4 w-4" /></span>
          <p className="text-xs font-semibold leading-relaxed text-gray-600">আপনার crop plan থেকে আজকের কাজ সাজানো হয়েছে। প্ল্যানে গিয়ে কাজ সম্পন্ন চিহ্ন দিন।</p>
          <ArrowUpRight className="ml-auto h-4 w-4 shrink-0 text-[#2D6A4F]" />
        </div>

        <div className="home-stagger mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => navigate({ to: "/weather" })}
            className="home-pressable group rounded-2xl bg-[#EAF6FF] p-3.5 text-left"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 text-sky-600 shadow-sm"><CloudRain className="h-5 w-5" /></span>
            <p className="mt-3 text-sm font-extrabold text-gray-900">বৃষ্টির প্রস্তুতি</p>
            <p className="mt-1 text-[11px] leading-snug text-gray-500">আবহাওয়া দেখে কাজ ঠিক করুন</p>
          </button>
          <button
            type="button"
            onClick={onCreatePost}
            className="home-pressable group rounded-2xl bg-[#FFF3E7] p-3.5 text-left"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 text-[#E07A2C] shadow-sm"><MessageCircle className="h-5 w-5" /></span>
            <p className="mt-3 text-sm font-extrabold text-gray-900">অভিজ্ঞতা শেয়ার</p>
            <p className="mt-1 text-[11px] leading-snug text-gray-500">কমিউনিটিতে আপনার খবর দিন</p>
          </button>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────── SECTION 5 ──────────────────────────── */

function CommunityFeedSection({ userName, onCompose }: { userName: string | null; onCompose: () => void }) {
  const { data: mutedIds = [] } = useMutedIds();
  const queryClient = useQueryClient();
  const feedKey = useMemo(() => ["dashboard-feed", mutedIds.join(",")], [mutedIds]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [openComments, setOpenComments] = useState<string | null>(null);
  const { data: posts = [], isLoading } = useQuery({
    queryKey: feedKey,
    queryFn: async () => {
      let q = supabase.from("posts").select("*").order("created_at", { ascending: false }).limit(5);
      if (mutedIds.length > 0) q = q.not("user_id", "in", `(${mutedIds.join(",")})`);
      const { data } = await q;
      return (data as Post[]) ?? [];
    },
    staleTime: 60_000,
  });
  const { data: authorAvatars = {} } = useAuthorAvatars(posts.map((post) => post.user_id));
  useEffect(() => { setSavedIds(readSavedPostIds()); }, []);

  useEffect(() => {
    const channel = supabase
      .channel("dashboard-community-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, (payload) => {
        queryClient.setQueryData<Post[]>(feedKey, (current = []) => {
          if (payload.eventType === "DELETE") return current.filter((post) => post.id !== (payload.old as { id: string }).id);
          const incoming = payload.new as Post;
          if (mutedIds.includes(incoming.user_id)) return current;
          const exists = current.some((post) => post.id === incoming.id);
          if (exists) return current.map((post) => post.id === incoming.id ? incoming : post);
          if (payload.eventType !== "INSERT") return current;
          return [incoming, ...current].slice(0, 5);
        });
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [feedKey, mutedIds, queryClient]);

  const updatePost = (postId: string, patch: Partial<Post>) => {
    queryClient.setQueryData<Post[]>(feedKey, (current) => (current ?? []).map((post) => post.id === postId ? { ...post, ...patch } : post));
  };

  const toggleSave = (post: Post) => {
    setSavedIds((current) => {
      const saved = current.includes(post.id);
      const next = saved ? current.filter((id) => id !== post.id) : [post.id, ...current];
      writeSavedPostIds(next);
      toast.success(saved ? "সংরক্ষণ থেকে সরানো হয়েছে" : "পোস্ট সংরক্ষণ হয়েছে");
      return next;
    });
  };

  const share = async (post: Post) => {
    const text = `${post.user_name} (${post.district ?? ""}): ${post.content}`;
    try {
      if (navigator.share) await navigator.share({ title: "কৃষক বন্ধু পোস্ট", text, url: window.location.href });
      else { await navigator.clipboard.writeText(`${text}\n${window.location.href}`); toast.success("পোস্টের লিংক কপি হয়েছে"); }
    } catch { /* user cancelled */ }
  };

  return (
    <section className="mx-auto mt-6 max-w-[760px] px-4 pb-8">
      <div className="mb-3 flex items-end justify-between px-1">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#52B788]">আপনার কমিউনিটি</p>
          <h2 className="mt-1 text-lg font-black tracking-tight text-gray-900">কমিউনিটি আপডেট</h2>
        </div>
        <Link to="/feed" className="text-xs font-bold text-[#2D6A4F]">সব পোস্ট</Link>
      </div>

      <button type="button" onClick={onCompose} className="home-pressable flex w-full items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3 text-left shadow-sm">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2D6A4F] font-bold text-white">{userName?.[0] ?? "ক"}</div>
        <span className="min-w-0 flex-1 truncate text-sm text-gray-500">আজ কী শেয়ার করবেন?</span>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F0FFF4] text-[#2D6A4F]"><Camera className="h-4 w-4" /></div>
      </button>

      <div className="mt-4 space-y-3">
        {isLoading ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-40 rounded-2xl border border-gray-100 bg-white animate-pulse" />)
          : posts.length === 0 ? <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center text-sm text-gray-500">এখনো কোনো পোস্ট নেই — প্রথম পোস্টটি আপনিই করুন!</div>
          : posts.map((post, i) => (
            <div key={post.id} className="animate-fade-in" style={{ animationDelay: `${i * 80}ms`, animationFillMode: "both" }}>
              <MiniPostCard
                post={post}
                avatarUrl={authorAvatars[post.user_id]}
                visiblePostIds={posts.map((item) => item.id)}
                saved={savedIds.includes(post.id)}
                commentsOpen={openComments === post.id}
                onSave={() => toggleSave(post)}
                onShare={() => share(post)}
                onComment={() => setOpenComments((current) => current === post.id ? null : post.id)}
                onCommentAdded={() => updatePost(post.id, { comments_count: post.comments_count + 1 })}
              />
            </div>
          ))}
      </div>

      <Link to="/feed" className="home-pressable mt-4 inline-flex h-12 w-full items-center justify-center gap-1 rounded-2xl border border-[#2D6A4F]/20 bg-white text-sm font-bold text-[#2D6A4F]">আরো পোস্ট দেখুন <ChevronRight className="h-4 w-4" strokeWidth={2.6} /></Link>
    </section>
  );
}

function MiniPostCard({
  post,
  avatarUrl,
  visiblePostIds,
  saved,
  commentsOpen,
  onSave,
  onShare,
  onComment,
  onCommentAdded,
}: {
  post: Post;
  avatarUrl?: string | null;
  visiblePostIds: string[];
  saved: boolean;
  commentsOpen: boolean;
  onSave: () => void;
  onShare: () => void;
  onComment: () => void;
  onCommentAdded: () => void;
}) {
  const { counts: reactionCounts, mine: myReaction, setReaction } = usePostReactions(post.id, visiblePostIds);
  const handleReaction = async (reaction: Parameters<typeof setReaction>[0]) => {
    const result = await setReaction(reaction);
    if (!result.ok) {
      toast.error(result.reason === "unauthenticated" ? "প্রতিক্রিয়া দিতে লগইন করুন" : "প্রতিক্রিয়া সংরক্ষণ করা যায়নি");
    }
  };

  return (
    <article className="home-pressable min-w-0 rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="p-4">
        <div className="flex min-w-0 items-start gap-3">
          <Link to="/u/$userId" params={{ userId: post.user_id }} aria-label={`${post.user_name}-এর প্রোফাইল`}>
            <Avatar className="h-10 w-10 bg-primary/15">
              <AvatarImage src={avatarUrl ?? undefined} alt={`${post.user_name}-এর প্রোফাইল ছবি`} className="object-cover" />
              <AvatarFallback className="bg-primary/15 font-bold text-primary">{post.user_name?.[0] ?? "ক"}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="min-w-0 flex-1">
            <Link to="/u/$userId" params={{ userId: post.user_id }} className="block truncate text-sm font-semibold text-gray-900 hover:underline">{post.user_name}</Link>
            <p className="truncate text-[11px] text-gray-500">{post.upazila ? `${post.upazila}, ${post.district ?? "—"}` : (post.district ?? "—")}</p>
          </div>
          <span className="shrink-0 text-[10px] text-gray-400">কমিউনিটি</span>
        </div>
        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-800 line-clamp-3">{post.content}</p>
      </div>
      {post.image_url && <img src={post.image_url} alt="" loading="lazy" className="block aspect-[4/3] w-full bg-gray-100 object-cover" />}
      <PostSocialActions
        myReaction={myReaction}
        reactionCounts={reactionCounts}
        commentsCount={post.comments_count}
        saved={saved}
        commentOpen={commentsOpen}
        onReact={(reaction) => void handleReaction(reaction)}
        onComment={onComment}
        onSave={onSave}
        onShare={onShare}
      />
      {commentsOpen && <div className="px-4 pb-4"><CommentsSection postId={post.id} onCommentAdded={onCommentAdded} /></div>}
      <Link to="/feed" className="block border-t border-gray-100 px-4 py-2.5 text-center text-xs font-bold text-[#2D6A4F]">পোস্টটি খুলে আরও দেখুন</Link>
    </article>
  );
}
