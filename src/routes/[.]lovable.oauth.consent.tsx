import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Details = {
  client?: { name?: string; redirect_uri?: string; client_uri?: string } | null;
  scope?: string;
  redirect_url?: string;
  redirect_to?: string;
  user?: { email?: string } | null;
};
type Result = { data: { redirect_url?: string; redirect_to?: string } | null; error: { message: string } | null };
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: Details | null; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<Result>;
  denyAuthorization: (id: string) => Promise<Result>;
};
const oauth = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("অনুমোদনের আইডি পাওয়া যায়নি");
    const { data } = await supabase.auth.getSession();
    const next = location.pathname + location.searchStr;
    if (!data.session) throw redirect({ to: "/login", search: { next } });
  },
  loader: async ({ location }) => {
    const id = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth().getAuthorizationDetails(id);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    const { data: s } = await supabase.auth.getSession();
    return { details: data, email: s.session?.user.email ?? "" };
  },
  head: () => ({ meta: [{ title: "সংযোগ অনুমোদন — কৃষক বন্ধু" }, { name: "robots", content: "noindex" }] }),
  component: Consent,
  pendingComponent: () => <main className="min-h-screen flex items-center justify-center text-muted-foreground">লোড হচ্ছে…</main>,
  errorComponent: ({ error }) => (
    <main className="min-h-screen flex items-center justify-center p-6 text-center">
      <div className="max-w-sm rounded-2xl bg-card p-6 shadow">
        <h1 className="text-lg font-bold">অনুরোধটি খোলা যায়নি</h1>
        <p className="mt-2 text-sm text-muted-foreground">লিংকটির মেয়াদ শেষ হতে পারে। আবার সংযোগ করার চেষ্টা করুন।</p>
        <p className="mt-2 text-xs text-muted-foreground">{String((error as Error)?.message ?? error)}</p>
      </div>
    </main>
  ),
});

function scopeLabel(s: string) {
  if (s === "openid") return "আপনার পরিচয় যাচাই";
  if (s === "email") return "আপনার ইমেইল ঠিকানা";
  if (s === "profile") return "আপনার সাধারণ প্রোফাইল";
  return `অতিরিক্ত অনুমতি: ${s}`;
}

function Consent() {
  const { details, email } = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const client = details?.client?.name ?? "একটি অ্যাপ";
  const scopes = (details?.scope ?? "").split(/\s+/).filter(Boolean);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await oauth().approveAuthorization(authorization_id)
      : await oauth().denyAuthorization(authorization_id);
    if (error) { setBusy(false); setError(error.message); return; }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) { setBusy(false); setError("অনুমোদন সার্ভার থেকে ফেরত ঠিকানা পাওয়া যায়নি।"); return; }
    window.location.href = target;
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-[var(--shadow-card)] space-y-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-bold">{client}-কে কৃষক বন্ধুর সাথে সংযুক্ত করবেন?</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {client} আপনার হয়ে কৃষক বন্ধুর টুল ব্যবহার করতে পারবে: ফসল গাইড দেখা, বাজারদর দেখা এবং বাজারদর জমা দেওয়া।
        </p>
        {email && <p className="text-sm">প্রবেশ করা অ্যাকাউন্ট: <b>{email}</b></p>}
        {details?.client?.redirect_uri && (
          <p className="text-xs text-muted-foreground break-all">ফেরত ঠিকানা: {details.client.redirect_uri}</p>
        )}
        {scopes.length > 0 && (
          <ul className="text-sm list-disc pl-5 space-y-1">
            {scopes.map((s) => <li key={s}>{scopeLabel(s)}</li>)}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">এটি অ্যাপের অনুমতি বা নিরাপত্তা নিয়ম এড়িয়ে যায় না।</p>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" disabled={busy} onClick={() => decide(false)}>সংযোগ বাতিল</Button>
          <Button className="flex-1" disabled={busy} onClick={() => decide(true)}>অনুমোদন দিন</Button>
        </div>
      </div>
    </main>
  );
}
