import { useEffect, useState } from "react";
import { Download, Smartphone, WifiOff } from "lucide-react";
import { BottomSheet } from "./bottom-sheet";
import { BengaliButton } from "./bengali-button";
import { supabase } from "@/integrations/supabase/client";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isPreviewOrIframe() {
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }
  const h = window.location.hostname;
  return (
    h.includes("id-preview--") ||
    h.includes("lovableproject.com") ||
    (h.includes("lovable.app") && h.includes("id-preview"))
  );
}

export function PWAManager() {
  const [showInstall, setShowInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BIPEvent | null>(null);
  const [online, setOnline] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [inPreview, setInPreview] = useState(true);

  useEffect(() => {
    setHydrated(true);
    setInPreview(isPreviewOrIframe());
    setOnline(navigator.onLine);
  }, []);

  // Service worker registration — production only, never in iframe/preview
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const inPreview = isPreviewOrIframe();
    const isProd = import.meta.env.PROD;

    if (inPreview || !isProd) {
      // Clean up any previously registered SW in preview/dev contexts
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      });
      return;
    }

    // Dynamically import workbox-window so it's never bundled into preview/dev
    import("workbox-window")
      .then(({ Workbox }) => {
        const wb = new Workbox("/sw.js", { scope: "/" });
        wb.register().catch((err) => console.warn("SW registration failed:", err));
      })
      .catch((err) => console.warn("workbox-window load failed:", err));
  }, []);

  // Online/offline tracking
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // beforeinstallprompt handler with visit-count gate
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Increment visit count once per session
    try {
      const key = "visitCount";
      const sessionKey = "visitCountedThisSession";
      if (!sessionStorage.getItem(sessionKey)) {
        const visits = parseInt(localStorage.getItem(key) || "0", 10);
        localStorage.setItem(key, String(visits + 1));
        sessionStorage.setItem(sessionKey, "1");
      }
    } catch {
      // localStorage unavailable — ignore
    }

    const handler = (e: Event) => {
      e.preventDefault();
      const evt = e as BIPEvent;
      setDeferredPrompt(evt);

      try {
        const visits = parseInt(localStorage.getItem("visitCount") || "0", 10);
        const dismissedAt = parseInt(localStorage.getItem("installDismissedAt") || "0", 10);
        const dismissedRecently = dismissedAt && Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000;

        if (visits >= 1 && !dismissedRecently) {
          setShowInstall(true);
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        try {
          const { data } = await supabase.auth.getSession();
          await supabase.from("app_installs").insert({
            user_id: data.session?.user.id ?? null,
            platform: navigator.platform,
            user_agent: navigator.userAgent,
          });
        } catch {
          // best-effort tracking
        }
        // Best-effort: ask for notification permission right after install
        try {
          if ("Notification" in window && Notification.permission === "default") {
            await Notification.requestPermission();
            // Actual subscription happens on /weather page where the user can
            // see the toggle and where the VAPID key + serverFn call live.
          }
        } catch {
          // ignore
        }
      }
    } finally {
      setDeferredPrompt(null);
      setShowInstall(false);
    }
  };

  const handleDismiss = () => {
    try {
      localStorage.setItem("installDismissedAt", String(Date.now()));
    } catch {
      // ignore
    }
    setShowInstall(false);
  };

  return (
    <>
      {hydrated && !inPreview && !online && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-[#E07A2C] text-white text-sm font-semibold py-2 px-4 flex items-center justify-center gap-2 shadow">
          <WifiOff className="h-4 w-4" />
          <span>📡 অফলাইন মোড — সীমিত সুবিধা</span>
        </div>
      )}

      <BottomSheet open={showInstall} onClose={handleDismiss}>
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground">
              <Smartphone className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">কৃষক বন্ধু ইনস্টল করুন</h3>
              <p className="text-xs text-muted-foreground">হোম স্ক্রিনে যোগ করুন</p>
            </div>
          </div>

          <p className="text-sm text-foreground leading-relaxed">
            ফোনে সরাসরি ব্যবহার করুন — ইন্টারনেট ছাড়াও অনেক কিছু দেখুন।
          </p>

          <div className="flex flex-col gap-2">
            <BengaliButton
              variant="primary"
              fullWidth
              leftIcon={<Download className="h-5 w-5" />}
              onClick={handleInstall}
            >
              এখনই ইনস্টল করুন
            </BengaliButton>
            <BengaliButton variant="ghost" fullWidth onClick={handleDismiss}>
              পরে করব
            </BengaliButton>
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
