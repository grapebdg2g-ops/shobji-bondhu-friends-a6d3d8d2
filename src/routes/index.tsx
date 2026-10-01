import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({ meta: [
    { title: "কৃষক বন্ধু — কৃষকের বিশ্বস্ত সঙ্গী" },
    { name: "description", content: "কৃষক বন্ধুর বাজারদর, কৃষি পরামর্শ ও কৃষক সম্প্রদায়ে প্রবেশ করুন।" },
    { property: "og:title", content: "কৃষক বন্ধু — কৃষকের বিশ্বস্ত সঙ্গী" },
    { property: "og:description", content: "কৃষক বন্ধুর বাজারদর, কৃষি পরামর্শ ও কৃষক সম্প্রদায়ে প্রবেশ করুন।" },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!data.session) {
        navigate({ to: "/login" });
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("district")
        .eq("id", data.session.user.id)
        .maybeSingle();
      if (cancelled) return;
      navigate({ to: profile?.district ? "/dashboard" : "/register" });
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center px-8 text-center"
      style={{ background: "var(--gradient-brand)" }}
    >
      <div className="flex flex-col items-center gap-6">
        <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-white/15 backdrop-blur-sm ring-4 ring-white/20 shadow-2xl overflow-hidden">
          <img src={logo} alt="কৃষক বন্ধু লোগো" width={96} height={96} fetchPriority="high" decoding="async" className="h-24 w-24 object-contain" />
        </div>
        <h1 className="text-5xl font-black tracking-tight text-white drop-shadow-lg">
          কৃষক বন্ধু
        </h1>
        <p className="text-lg font-medium text-white/90">কৃষকের বিশ্বস্ত সঙ্গী</p>
      </div>
      <div className="absolute bottom-12 flex gap-1.5">
        <span className="h-2 w-2 animate-pulse rounded-full bg-white/80" />
        <span className="h-2 w-2 animate-pulse rounded-full bg-white/80 [animation-delay:200ms]" />
        <span className="h-2 w-2 animate-pulse rounded-full bg-white/80 [animation-delay:400ms]" />
      </div>
    </main>
  );
}
