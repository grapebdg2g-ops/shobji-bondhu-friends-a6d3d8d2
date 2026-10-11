import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DiseaseHistoryView } from "@/components/krishi/disease-history-view";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/profile/disease-history")({
  component: DiseaseHistoryPage,
  head: () => ({
    meta: [
      { title: "রোগ শনাক্তের ইতিহাস — কৃষক বন্ধু" },
      { name: "description", content: "আপনার পূর্ববর্তী রোগ বিশ্লেষণের ইতিহাস দেখুন।" },
    ],
  }),
});

function DiseaseHistoryPage() {
  const navigate = useNavigate();
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const id = data.session?.user.id;
      if (!id) {
        navigate({ to: "/login" });
        return;
      }
      setUid(id);
    })();
  }, [navigate]);

  return (
    <main className="min-h-screen bg-background pb-10">
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b border-border">
        <div className="flex items-center gap-3 px-4 h-14">
          <button
            onClick={() => navigate({ to: "/profile" })}
            className="h-10 w-10 -ml-2 rounded-full flex items-center justify-center active:bg-muted"
            aria-label="ফিরে যান"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground leading-tight">রোগ শনাক্তের ইতিহাস</h1>
            <p className="text-xs text-muted-foreground">পূর্ববর্তী বিশ্লেষণ দেখুন</p>
          </div>
        </div>
      </header>

      <div className="px-4 pt-4">
        {uid ? (
          <DiseaseHistoryView userId={uid} />
        ) : (
          <Skeleton className="h-40 w-full rounded-2xl" />
        )}
      </div>
    </main>
  );
}
