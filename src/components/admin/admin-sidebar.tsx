import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  FileText,
  Bell,
  BarChart3,
  Flag,
  ExternalLink,
  Settings2,
  Bug as BugIcon,
  TrendingUp,
  Repeat2,
  ScrollText,
  Crown,
  Film,
} from "lucide-react";
import { useState } from "react";

const ITEMS: Array<{ to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }> = [
  { to: "/admin", label: "ওভারভিউ", icon: LayoutDashboard, exact: true },
  { to: "/admin/users", label: "ব্যবহারকারী", icon: Users },
  { to: "/admin/content", label: "কন্টেন্ট", icon: FileText },
  { to: "/admin/prices", label: "বাজার দর", icon: TrendingUp },
  { to: "/admin/exchanges", label: "বিনিময়", icon: Repeat2 },
  { to: "/admin/diseases", label: "রোগ শনাক্ত লগ", icon: BugIcon },
  { to: "/admin/reports", label: "রিপোর্ট", icon: Flag },
  { to: "/admin/notify", label: "নোটিফিকেশন", icon: Bell },
  { to: "/admin/organic-videos", label: "জৈব কর্নার ভিডিও", icon: Film },
  { to: "/admin/pro", label: "Pro ও আয়", icon: Crown },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/audit", label: "অ্যাকশন লগ", icon: ScrollText },
];

const REF: Array<{ to: string; label: string; icon: typeof TrendingUp }> = [
  { to: "/dashboard", label: "মূল ড্যাশবোর্ড", icon: ExternalLink },
];

export function AdminSidebar({ onNavigate }: { onNavigate?: () => void } = {}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="h-full flex flex-col bg-white border-r border-gray-200">
      <div className="p-4 border-b border-gray-100 flex items-center gap-2">
        <div className="h-9 w-9 rounded-lg bg-purple-600 text-white flex items-center justify-center">
          <Settings2 className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">KrishokBondhu</p>
          <p className="text-[11px] text-purple-700 font-semibold -mt-0.5">Admin</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-3">
        <ul className="space-y-0.5 px-2">
          {ITEMS.map((it) => {
            const active = it.exact ? pathname === it.to : pathname.startsWith(it.to);
            return (
              <li key={it.to}>
                <Link
                  to={it.to as never}
                  onClick={onNavigate}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                    active
                      ? "bg-purple-100 text-purple-800"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <it.icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{it.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="my-3 mx-3 border-t border-gray-100" />
        <p className="px-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
          দ্রুত যান
        </p>
        <ul className="space-y-0.5 px-2">
          {REF.map((it) => (
            <li key={it.to}>
              <Link
                to={it.to as never}
                onClick={onNavigate}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-gray-600 hover:bg-gray-50"
              >
                <it.icon className="h-4 w-4 shrink-0" />
                <span>{it.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-gray-100 p-3">
        <Link
          to="/dashboard"
          onClick={onNavigate}
          className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          মূল অ্যাপে যান
        </Link>
      </div>
    </nav>
  );
}

export function AdminLayoutShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Desktop sidebar */}
      <div className="hidden md:block w-60 shrink-0">
        <div className="fixed top-0 left-0 h-full w-60">
          <AdminSidebar />
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setOpen(false)}
          />
          <div className="fixed top-0 left-0 z-50 w-64 h-full md:hidden">
            <AdminSidebar onNavigate={() => setOpen(false)} />
          </div>
        </>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-12 sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-200 flex items-center px-3 md:px-5 gap-3">
          <button
            onClick={() => setOpen(true)}
            className="md:hidden h-8 w-8 rounded-md border border-gray-200 flex items-center justify-center"
            aria-label="মেনু"
          >
            <Settings2 className="h-4 w-4" />
          </button>
          <p className="text-sm font-bold text-gray-900">অ্যাডমিন প্যানেল</p>
        </header>
        <main className="flex-1 p-3 md:p-6">{children}</main>
      </div>
    </div>
  );
}
