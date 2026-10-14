import { useEffect, useState } from "react";
import { BellRing, CloudRain, Sprout, Bug } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { PushStatus } from "@/hooks/use-push-notifications";

const KEY = "notifPromptDismissedAt";
const SNOOZE_MS = 3 * 24 * 60 * 60 * 1000;

export function NotificationPrompt({
  status,
  busy,
  enable,
  loggedIn,
}: {
  status: PushStatus;
  busy: boolean;
  enable: () => Promise<boolean>;
  loggedIn: boolean;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!loggedIn || status !== "disabled") return;
    try {
      const at = parseInt(localStorage.getItem(KEY) || "0", 10);
      if (Date.now() - at < SNOOZE_MS) return;
    } catch {
      /* ignore */
    }
    const t = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(t);
  }, [loggedIn, status]);

  const later = () => {
    try {
      localStorage.setItem(KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  const turnOn = async () => {
    const ok = await enable();
    if (ok) {
      toast.success("বিজ্ঞপ্তি চালু হয়েছে ✅");
      setOpen(false);
    } else {
      toast.error("অনুমতি পাওয়া যায়নি। ফোনের সেটিংস থেকে বিজ্ঞপ্তি চালু করুন।");
      later();
    }
  };

  const items = [
    { Icon: Sprout, text: "স্প্রে ও সার দেওয়ার সঠিক সময় মনে করিয়ে দেবে" },
    { Icon: CloudRain, text: "ঝড়-বৃষ্টির জরুরি সতর্কতা সাথে সাথে" },
    { Icon: Bug, text: "পোকা ও রোগের আগাম সতর্কবার্তা" },
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : later())}>
      <DialogContent className="max-w-sm overflow-hidden rounded-3xl border-0 p-0">
        <div className="brand-banner flex flex-col items-center px-6 pb-6 pt-8 text-center">
          <div className="relative mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-background/20">
            <span className="absolute inset-0 animate-ping rounded-full bg-background/20" />
            <BellRing className="h-10 w-10 animate-bounce" />
          </div>
          <DialogTitle className="text-xl font-bold leading-snug">
            জরুরি খবর সরাসরি আপনার ফোনে
          </DialogTitle>
          <DialogDescription className="mt-1 text-[15px] opacity-90" style={{ color: "inherit" }}>
            বিজ্ঞপ্তি চালু করলে কোনো জরুরি বার্তা মিস হবে না
          </DialogDescription>
        </div>
        <div className="space-y-3 px-6 pt-5">
          {items.map(({ Icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-[15px] text-foreground">{text}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2 px-6 pb-6 pt-5">
          <Button size="lg" className="h-12 text-base" onClick={turnOn} disabled={busy}>
            {busy ? "চালু হচ্ছে…" : "বিজ্ঞপ্তি চালু করুন"}
          </Button>
          <Button variant="ghost" className="h-11 text-muted-foreground" onClick={later}>
            পরে মনে করান
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
