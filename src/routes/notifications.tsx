import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bell,
  Check,
  CheckCheck,
  Heart,
  MessageCircle,
  Trash2,
  TrendingDown,
  UserPlus,
  CalendarDays,
} from "lucide-react";
import { useUser } from "@/contexts/user-context";
import { useNotifications, type Notification } from "@/hooks/use-notifications";
import { useRef, useState } from "react";
import { EmptyState } from "@/components/krishi/empty-state";
import { LoadingSpinner } from "@/components/krishi/loading-spinner";

export const Route = createFileRoute("/notifications")({
  component: NotificationsPage,
  head: () => ({ meta: [{ title: "বিজ্ঞপ্তি — কৃষক বন্ধু" }] }),
});

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "এখনই";
  if (m < 60) return `${m} মি`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ঘ`;
  return `${Math.floor(h / 24)} দিন`;
}

function iconFor(type: string) {
  if (type === "like") return { Icon: Heart, color: "text-rose-500", bg: "bg-rose-50" };
  if (type === "comment" || type === "comment_reply") return { Icon: MessageCircle, color: "text-sky-500", bg: "bg-sky-50" };
  if (type === "reaction") return { Icon: Heart, color: "text-rose-500", bg: "bg-rose-50" };
  if (type === "message") return { Icon: MessageCircle, color: "text-[#1877F2]", bg: "bg-[#E7F3FF]" };
  if (type === "price_alert")
    return { Icon: TrendingDown, color: "text-amber-600", bg: "bg-amber-50" };
  if (type === "connection_request")
    return { Icon: UserPlus, color: "text-emerald-600", bg: "bg-emerald-50" };
  if (type === "connection_response" || type === "friend_added")
    return { Icon: Check, color: "text-primary", bg: "bg-primary/10" };
  if (type === "crop_reminder")
    return { Icon: CalendarDays, color: "text-emerald-600", bg: "bg-emerald-50" };
  return { Icon: Bell, color: "text-primary", bg: "bg-primary/10" };
}

function NotificationsPage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { items, loading, unreadCount, markAllRead, markRead, remove } = useNotifications(
    user?.id ?? null,
  );

  const open = async (n: Notification) => {
    if (!n.is_read) await markRead(n.id);
    if (n.type === "message" && n.ref_id) navigate({ to: "/messages/$userId", params: { userId: n.ref_id } });
    else if (n.ref_type === "connection") navigate({ to: "/connections" });
    else if (n.ref_type === "friend" && n.ref_id) navigate({ to: "/u/$userId", params: { userId: n.ref_id } });
    else if (n.ref_type === "post") navigate({ to: "/feed" });
    else if (n.ref_type === "price") navigate({ to: "/prices" });
    else if (n.ref_type === "crop_reminder" || n.ref_type === "crop_plan_task") navigate({ to: "/crop-diary" });
  };

  return (
    <main className="min-h-screen bg-background pb-20">
      <header
        className="px-4 pt-10 pb-5 rounded-b-3xl"
        style={{ background: "var(--gradient-brand)" }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate({ to: "/dashboard" })}
              aria-label="ফিরে যান"
              className="home-pressable flex h-11 w-11 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/20"
            >
              <ArrowLeft className="h-5 w-5 text-white" />
            </button>
            <h1 className="text-xl font-bold text-white">বিজ্ঞপ্তি</h1>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="home-pressable flex min-h-11 items-center gap-1.5 rounded-full bg-white/15 px-3 text-xs font-semibold text-white ring-2 ring-white/20"
            >
              <CheckCheck className="h-4 w-4" /> সব পঠিত
            </button>
          )}
        </div>
      </header>

      <section className="px-4 mt-4 space-y-2">
        {loading ? (
          <div className="py-10">
            <LoadingSpinner />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="কোনো বিজ্ঞপ্তি নেই"
            description="নতুন প্রতিক্রিয়া, মন্তব্য বা দাম পরিবর্তন হলে এখানে দেখা যাবে"
          />
        ) : (
          items.map((n) => (
            <NotifRow key={n.id} n={n} onOpen={() => open(n)} onDelete={() => remove(n.id)} />
          ))
        )}
      </section>
    </main>
  );
}

function NotifRow({
  n,
  onOpen,
  onDelete,
}: {
  n: Notification;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const { Icon, color, bg } = iconFor(n.type);
  const [dx, setDx] = useState(0);
  const startX = useRef<number | null>(null);

  const onStart = (x: number) => {
    startX.current = x;
  };
  const onMove = (x: number) => {
    if (startX.current === null) return;
    const d = Math.min(0, x - startX.current);
    setDx(Math.max(-120, d));
  };
  const onEnd = () => {
    if (dx < -70) onDelete();
    else setDx(0);
    startX.current = null;
  };

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div className="absolute inset-y-0 right-0 w-28 bg-destructive flex items-center justify-end pr-5">
        <Trash2 className="h-5 w-5 text-destructive-foreground" />
      </div>
      <button
        onClick={onOpen}
        onTouchStart={(e) => onStart(e.touches[0].clientX)}
        onTouchMove={(e) => onMove(e.touches[0].clientX)}
        onTouchEnd={onEnd}
        onMouseDown={(e) => onStart(e.clientX)}
        onMouseMove={(e) => e.buttons === 1 && onMove(e.clientX)}
        onMouseUp={onEnd}
        onMouseLeave={onEnd}
        style={{
          transform: `translateX(${dx}px)`,
          transition: startX.current === null ? "transform 0.2s" : "none",
        }}
        className={`home-pressable relative flex min-h-[76px] w-full items-start gap-3 rounded-2xl border p-4 text-left ${n.is_read ? "bg-card border-border" : "bg-primary/5 border-primary/30"}`}
      >
        <div className={`h-10 w-10 rounded-full ${bg} flex items-center justify-center shrink-0`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-bold text-foreground truncate">{n.title}</p>
            <span className="text-[10px] text-muted-foreground shrink-0">
              {timeAgo(n.created_at)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
        </div>
        {!n.is_read && <span className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />}
      </button>
    </div>
  );
}
