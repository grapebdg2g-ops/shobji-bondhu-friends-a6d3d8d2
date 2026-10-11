import { useEffect, useState } from "react";
import { Bell, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usePushNotifications } from "@/hooks/use-push-notifications";

export function NotificationToggle() {
  const { status, supported, busy, enable, disable } = usePushNotifications();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Render a stable, SSR-safe placeholder until client mount to avoid hydration mismatch.
  if (!mounted || status === "loading") {
    return (
      <div className="mt-4 rounded-xl border border-border bg-card p-3 flex items-center justify-center text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> লোড হচ্ছে…
      </div>
    );
  }

  if (!supported || status === "unsupported") {
    return (
      <div className="mt-4 rounded-xl border border-yellow-300 bg-yellow-50 p-4">
        <p className="text-sm text-yellow-900 leading-relaxed">
          ⚠️ আপনার ফোনে push notification সাপোর্ট নেই। In-app রিমাইন্ডার অবশ্যই দেখা যাবে।
        </p>
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
        <p className="text-sm text-foreground leading-relaxed">
          🔕 নোটিফিকেশন অনুমতি ব্লক করা আছে। ব্রাউজার সেটিংস থেকে অনুমতি দিন।
        </p>
      </div>
    );
  }

  if (status === "enabled") {
    return (
      <div className="mt-4 rounded-xl border border-[#22C55E] bg-[#DCFCE7] p-3 flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Bell className="h-4 w-4" /> ✅ কৃষি ও আবহাওয়া সতর্কতা চালু আছে
        </span>
        <button
          disabled={busy}
          onClick={async () => {
            const ok = await disable();
            if (ok) toast("🔕 সতর্কতা বন্ধ হয়েছে");
            else toast.error("বন্ধ করা যায়নি");
          }}
          className="text-sm font-semibold text-destructive px-3 py-1.5 rounded-lg hover:bg-white/60 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "বন্ধ করুন"}
        </button>
      </div>
    );
  }

  return (
    <button
      disabled={busy}
      onClick={async () => {
        const ok = await enable();
        if (ok) toast.success("✅ সতর্কতা চালু হয়েছে!");
        else toast.error("❌ সতর্কতা চালু করা যায়নি");
      }}
      className="mt-4 w-full rounded-xl border-2 border-primary bg-card text-primary font-bold py-3 flex items-center justify-center gap-2 hover:bg-primary/5 disabled:opacity-60"
    >
      {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Bell className="h-5 w-5" />}
      🔔 কৃষি ও আবহাওয়া সতর্কতা চালু করুন
    </button>
  );
}
