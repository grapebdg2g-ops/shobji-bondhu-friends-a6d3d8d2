import { useEffect } from "react";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppSidebar, useSidebar } from "./app-sidebar";
import { BottomNav } from "./bottom-nav";
import { useUser } from "@/contexts/user-context";

// Pages that render their own back button or are top-level tabs.
const MAIN_TABS = ["/dashboard", "/prices", "/messages", "/profile", "/feed", "/ai-bondhu"];
const NEEDS_BACK = ["/connections", "/crop-diary", "/farmers", "/ai-bondhu/disease", "/admin"];

const HIDDEN_ON = new Set<string>(["/", "/login", "/register", "/offline", "/onboarding"]);
const ACTION_SELECTOR = 'button, [role="button"], input, textarea, select, [type="submit"]';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, loading } = useUser();
  const { collapsed, setCollapsed, isMobile } = useSidebar();
  const router = useRouter();
  const hide = HIDDEN_ON.has(pathname) || pathname.startsWith("/groups/");

  // Guests can view everything; any action (button/input) sends them to login.
  useEffect(() => {
    if (loading || user || hide) return;
    const block = (e: Event) => {
      const el = (e.target as HTMLElement | null)?.closest?.(ACTION_SELECTOR);
      if (!el || el.closest("a[href]") || el.closest("[data-guest-allow]")) return;
      e.preventDefault();
      e.stopPropagation();
      (el as HTMLElement).blur?.();
      router.navigate({ to: "/login" });
    };
    document.addEventListener("click", block, true);
    document.addEventListener("focusin", block, true);
    document.addEventListener("submit", block, true);
    return () => {
      document.removeEventListener("click", block, true);
      document.removeEventListener("focusin", block, true);
      document.removeEventListener("submit", block, true);
    };
  }, [loading, user, hide, router]);

  const showBack =
    !MAIN_TABS.includes(pathname) &&
    NEEDS_BACK.some((p) => pathname === p || pathname.startsWith(p + "/")) &&
    !/^\/crop-guide\/./.test(pathname);

  if (hide) return <>{children}</>;

  return (
    <div className="flex min-h-screen w-full">
      <div data-guest-allow className="contents">
        <AppSidebar collapsed={collapsed} setCollapsed={setCollapsed} isMobile={isMobile} />
      </div>
      <div className="flex-1 min-w-0 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
        <div className="mx-auto w-full max-w-6xl">
          {showBack && (
            <button
              type="button"
              data-guest-allow
              onClick={() => (window.history.length > 1 ? router.history.back() : router.navigate({ to: "/dashboard" }))}
              className="m-2 inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-muted-foreground hover:bg-muted"
            >
              <ArrowLeft className="h-5 w-5" /> ফিরে যান
            </button>
          )}
          {children}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
