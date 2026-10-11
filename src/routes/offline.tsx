import { createFileRoute } from "@tanstack/react-router";
import { WifiOff, Check, X } from "lucide-react";
import { BengaliButton } from "@/components/krishi/bengali-button";

export const Route = createFileRoute("/offline")({
  head: () => ({
    meta: [
      { title: "অফলাইন — কৃষক বন্ধু" },
      {
        name: "description",
        content: "ইন্টারনেট সংযোগ নেই। অফলাইন মোডে সীমিত সুবিধা পাওয়া যাচ্ছে।",
      },
    ],
  }),
  component: OfflinePage,
});

function OfflinePage() {
  const handleRetry = () => {
    if (typeof window !== "undefined") window.location.reload();
  };

  const works = ["আগের বাজার দর দেখা যাবে", "আগের পোস্ট দেখা যাবে"];
  const limits = ["নতুন তথ্য আপডেট হবে না", "রোগ শনাক্ত করা যাবে না"];

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-primary/10 via-background to-background px-6 py-10">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="mx-auto h-28 w-28 rounded-full bg-primary/15 flex items-center justify-center ring-4 ring-primary/20">
          <WifiOff className="h-14 w-14 text-primary" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-primary">আপনি অফলাইনে আছেন</h1>
          <p className="mt-1 text-muted-foreground">ইন্টারনেট সংযোগ নেই</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 text-left space-y-3">
          {works.map((t) => (
            <div key={t} className="flex items-start gap-2">
              <Check className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <span className="text-sm text-foreground">{t}</span>
            </div>
          ))}
          {limits.map((t) => (
            <div key={t} className="flex items-start gap-2">
              <X className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
              <span className="text-sm text-muted-foreground">{t}</span>
            </div>
          ))}
        </div>

        <BengaliButton variant="primary" fullWidth onClick={handleRetry}>
          পুনরায় চেষ্টা করুন
        </BengaliButton>
      </div>
    </main>
  );
}
