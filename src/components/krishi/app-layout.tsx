import { useRouterState } from "@tanstack/react-router";
import { AppSidebar, useSidebar } from "./app-sidebar";
import { BottomNav } from "./bottom-nav";
import { useUser } from "@/contexts/user-context";

const HIDDEN_ON = new Set<string>(["/", "/login", "/register", "/offline"]);

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useUser();
  const { collapsed, setCollapsed, isMobile } = useSidebar();

  const hide = HIDDEN_ON.has(pathname) || pathname.startsWith("/groups/") || !user;

  if (hide) return <>{children}</>;

  return (
    <div className="flex min-h-screen w-full">
      <AppSidebar collapsed={collapsed} setCollapsed={setCollapsed} isMobile={isMobile} />
      <div className="flex-1 min-w-0 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
