import { useState, type CSSProperties } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Newspaper,
  User,
  Plus,
  ScanSearch,
  MessageSquareText,
  TrendingUp,
  UserRoundPlus,
  Users,
} from "lucide-react";

type Tab = {
  to: "/dashboard" | "/prices" | "/feed" | "/profile";
  label: string;
  Icon: typeof Home;
};

const LEFT: Tab[] = [
  { to: "/dashboard", label: "হোম", Icon: Home },
  { to: "/prices", label: "বাজার", Icon: TrendingUp },
];

const RIGHT: Tab[] = [
  { to: "/feed", label: "কমিউনিটি", Icon: Newspaper },
  { to: "/profile", label: "প্রোফাইল", Icon: User },
];

const QUICK_ACTIONS = [
  { to: "/disease-detection", label: "রোগ শনাক্ত", Icon: ScanSearch },
  { to: "/ai-bondhu/chat", label: "AI বন্ধুকে জিজ্ঞেস করুন", Icon: MessageSquareText },
  { to: "/feed", label: "কমিউনিটিতে যান", Icon: Newspaper },
  { to: "/farmers", label: "সকল কৃষক", Icon: Users },
  { to: "/messages", label: "মেসেজ", Icon: MessageSquareText },
  { to: "/connections", label: "সংযোগ অনুরোধ", Icon: UserRoundPlus },
] as const;

// Center notch (circle cutout with curved edges flowing into the top & bottom
// borders) carved out of the bar background via an SVG mask. The 160x64 SVG
// sits centered at the top; side slabs and a bottom strip fill the rest.
const NOTCH_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='64'%3E%3Cpath fill='black' fill-rule='evenodd' d='M0 0h160v64H0ZM46 32a32 32 0 1 0 64 0a32 32 0 1 0 -64 0Z'/%3E%3C/svg%3E";
const SOLID = "linear-gradient(#000, #000)";
const notchMaskStyle: CSSProperties = {
  WebkitMaskImage: `url("${NOTCH_SVG}"), ${SOLID}, ${SOLID}, ${SOLID}`,
  maskImage: `url("${NOTCH_SVG}"), ${SOLID}, ${SOLID}, ${SOLID}`,
  WebkitMaskPosition: "center top, left top, right top, center bottom",
  maskPosition: "center top, left top, right top, center bottom",
  WebkitMaskSize:
    "160px 64px, calc(50% - 80px) 100%, calc(50% - 80px) 100%, 160px calc(100% - 64px)",
  maskSize:
    "160px 64px, calc(50% - 80px) 100%, calc(50% - 80px) 100%, 160px calc(100% - 64px)",
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
};

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const isActive = (to: string) => pathname === to || pathname.startsWith(to + "/");

  return (
    <nav aria-label="মূল মেনু" className="md:hidden fixed bottom-0 inset-x-0 z-40">
      <div className="relative" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div
          aria-hidden
          className="absolute inset-0 border-t border-border bg-card/95 backdrop-blur-xl"
          style={notchMaskStyle}
        />
        <div className="relative grid grid-cols-5 items-end h-16">
        {LEFT.map((t) => (
          <TabBtn key={t.to} tab={t} active={isActive(t.to)} />
        ))}

        <div className="flex justify-center">
          {open && (
            <div className="absolute bottom-[4.5rem] left-1/2 -translate-x-1/2 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-border/70 bg-card/95 p-2 shadow-2xl backdrop-blur-xl animate-fade-in">
              <p className="px-3 pt-1 pb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                দ্রুত কাজ
              </p>
              {QUICK_ACTIONS.map((action) => (
                <Link
                  key={action.to}
                  to={action.to}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted active:scale-[0.98]"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-primary">
                    <action.Icon className="h-4.5 w-4.5" />
                  </span>
                  {action.label}
                </Link>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-label="দ্রুত কাজের মেনু"
            aria-expanded={open}
            className={`absolute -top-6 h-16 w-16 rounded-full flex flex-col items-center justify-center text-white shadow-lg transition duration-200 active:scale-95 ${open ? "rotate-45" : ""}`}
            style={{ background: "var(--gradient-brand)" }}
          >
            <Plus className="h-7 w-7" strokeWidth={2.5} />
            <span className="text-[10px] font-bold mt-0.5 leading-none">নতুন কাজ</span>
          </button>
        </div>

        {RIGHT.map((t) => (
          <TabBtn key={t.to} tab={t} active={isActive(t.to)} />
        ))}
      </div>
    </nav>
  );
}

function TabBtn({ tab, active }: { tab: Tab; active: boolean }) {
  return (
    <Link
      to={tab.to}
      className={`h-16 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors ${
        active ? "text-primary" : "text-muted-foreground"
      }`}
    >
      <tab.Icon className="h-5 w-5" strokeWidth={active ? 2.6 : 2} />
      <span>{tab.label}</span>
    </Link>
  );
}
