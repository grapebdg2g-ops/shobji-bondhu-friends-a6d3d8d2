import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  BadgeCheck,
  Check,
  ChevronRight,
  MapPin,
  MessageCircle,
  Search,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/user-context";
import { useConnectionState, type ConnectionRow } from "@/hooks/use-connections";
import { LazyImage } from "@/components/krishi/lazy-image";
import { DirectMessagePopup } from "@/components/krishi/direct-message-popup";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/connections")({
  component: ConnectionsPage,
  head: () => ({
    meta: [
      { title: "সংযোগ — কৃষক বন্ধু" },
      { name: "description", content: "আপনার এলাকার কৃষকদের সঙ্গে সংযুক্ত হন।" },
    ],
  }),
});

type Tab = "connections" | "requests" | "discover";
type Profile = {
  id: string;
  name: string;
  district: string | null;
  upazila: string | null;
  avatar_url: string | null;
  bio: string | null;
  crops: string[] | null;
  role: string;
  is_verified: boolean;
};

function ConnectionsPage() {
  const { user } = useUser();
  const [tab, setTab] = useState<Tab>("discover");
  const [query, setQuery] = useState("");

  const connectionsQuery = useQuery({
    queryKey: ["connections", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("connections")
        .select("*")
        .or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      const rows = (data as ConnectionRow[]) ?? [];
      const ids = Array.from(
        new Set(
          rows
            .flatMap((row) => [row.requester_id, row.addressee_id])
            .filter((id) => id !== user!.id),
        ),
      );
      const profiles = ids.length
        ? await supabase
            .from("profiles")
            .select("id,name,district,upazila,avatar_url,bio,crops,role,is_verified")
            .in("id", ids)
        : { data: [] };
      return { rows, profiles: (profiles.data as Profile[]) ?? [] };
    },
  });

  const discoverQuery = useQuery({
    queryKey: ["connections", "discover", user?.id, user?.district],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,name,district,upazila,avatar_url,bio,crops,role,is_verified")
        .neq("id", user!.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data as Profile[]) ?? [];
    },
  });

  const profilesById = useMemo(
    () => new Map((connectionsQuery.data?.profiles ?? []).map((p) => [p.id, p])),
    [connectionsQuery.data?.profiles],
  );
  const rows = connectionsQuery.data?.rows ?? [];
  const requests = rows.filter((row) => row.status === "pending" && row.addressee_id === user?.id);
  const connectedRows = rows.filter((row) => row.status === "accepted");
  const visibleRows = tab === "requests" ? requests : connectedRows;
  const discover = (discoverQuery.data ?? []).filter((p) => {
    const q = query.trim().toLocaleLowerCase("bn-BD");
    return (
      !q ||
      [p.name, p.district, p.upazila, ...(p.crops ?? [])]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("bn-BD")
        .includes(q)
    );
  });

  return (
    <main className="min-h-screen bg-background pb-24">
      <header className="relative overflow-hidden rounded-b-[30px] px-4 pb-7 pt-8 sm:px-6">
        <div className="pointer-events-none absolute -right-14 -top-16 h-48 w-48 rounded-full bg-[#74C69D]/25 blur-3xl" />
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-white/65">
              কৃষক নেটওয়ার্ক
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-white">আপনার কৃষক সংযোগ</h1>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/75">
              আপনার এলাকার অভিজ্ঞ কৃষকদের খুঁজুন, প্রশ্ন করুন এবং একসঙ্গে শিখুন।
            </p>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-md">
            <Users className="h-6 w-6" />
          </div>
        </div>
      </header>

      <section className="px-4 pt-4 sm:px-6">
        <div className="home-gradient-border flex gap-1 overflow-x-auto rounded-2xl border border-border bg-card p-1 shadow-[var(--shadow-card)]">
          {(
            [
              ["discover", "কৃষক খুঁজুন", Search],
              ["connections", "সংযুক্ত", Users],
              ["requests", `অনুরোধ${requests.length ? ` · ${requests.length}` : ""}`, UserPlus],
            ] as const
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`home-pressable flex min-h-11 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 text-xs font-extrabold ${tab === key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>
      </section>

      {tab === "discover" ? (
        <section className="px-4 pb-6 pt-4 sm:px-6">
          <label className="relative block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="নাম, এলাকা বা ফসল দিয়ে খুঁজুন"
              className="h-12 w-full rounded-2xl border border-border bg-card pl-10 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <div className="mt-4 space-y-3">
            {discoverQuery.isLoading ? (
              <ProfileSkeletons />
            ) : discover.length === 0 ? (
              <EmptyPeople text="কোনো কৃষক পাওয়া যায়নি" />
            ) : (
              discover.map((profile) => <PersonCard key={profile.id} profile={profile} />)
            )}
          </div>
        </section>
      ) : (
        <section className="home-stagger px-4 pb-6 pt-4 sm:px-6">
          {connectionsQuery.isLoading ? (
            <ProfileSkeletons />
          ) : visibleRows.length === 0 ? (
            <EmptyPeople
              text={tab === "requests" ? "নতুন কোনো সংযোগ অনুরোধ নেই" : "এখনো কোনো সংযোগ নেই"}
            />
          ) : (
            <div className="space-y-3">
              {visibleRows.map((row) => {
                const profile = profilesById.get(
                  row.requester_id === user?.id ? row.addressee_id : row.requester_id,
                );
                return profile ? (
                  <PersonCard
                    key={row.id}
                    profile={profile}
                    connection={row}
                    requestMode={tab === "requests"}
                  />
                ) : null;
              })}
            </div>
          )}
        </section>
      )}
    </main>
  );
}

function PersonCard({
  profile,
  connection,
  requestMode = false,
}: {
  profile: Profile;
  connection?: ConnectionRow;
  requestMode?: boolean;
}) {
  const [messageOpen, setMessageOpen] = useState(false);
  const { state, busy, request, respond } = useConnectionState(profile.id);
  const effectiveState =
    connection?.status === "accepted" ? "accepted" : requestMode ? "incoming_pending" : state;

  return (
    <>
      <article className="home-pressable flex items-center gap-3 rounded-[22px] border border-border bg-card p-3 shadow-[var(--shadow-card)]">
        <Link
          to="/u/$userId"
          params={{ userId: profile.id }}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-primary/10 text-primary ring-2 ring-primary/10">
            {profile.avatar_url ? (
              <LazyImage
                src={profile.avatar_url}
                alt={profile.name}
                wrapperClassName="h-full w-full"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xl font-black">
                {profile.name?.charAt(0) || "ক"}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <h2 className="truncate text-sm font-extrabold text-foreground">
                {profile.name || "কৃষক"}
              </h2>
              {profile.is_verified && <BadgeCheck className="h-4 w-4 shrink-0 text-primary" />}
            </div>
            <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              {profile.upazila
                ? `${profile.upazila}, ${profile.district}`
                : (profile.district ?? "বাংলাদেশ")}
            </p>
            <div className="mt-1 flex gap-1 overflow-hidden">
              {(profile.crops ?? []).slice(0, 2).map((crop) => (
                <span
                  key={crop}
                  className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary"
                >
                  {crop}
                </span>
              ))}
            </div>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Link>
        {requestMode ? (
          <div className="flex shrink-0 gap-1.5">
            <button
              type="button"
              disabled={busy}
              onClick={() => void respond("accepted")}
              aria-label="গ্রহণ করুন"
              className="home-pressable flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void respond("declined")}
              aria-label="প্রত্যাখ্যান করুন"
              className="home-pressable flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : effectiveState === "accepted" ? (
          <button
            type="button"
            onClick={() => setMessageOpen(true)}
            aria-label={`${profile.name} কে মেসেজ করুন`}
            className="home-pressable flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E7F3FF] text-[#1877F2]"
          >
            <MessageCircle className="h-4 w-4" />
          </button>
        ) : effectiveState === "outgoing_pending" ? (
          <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-extrabold text-amber-700">
            অপেক্ষায়
          </span>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => void request()}
            className="home-pressable flex h-10 shrink-0 items-center gap-1 rounded-xl bg-primary px-3 text-xs font-extrabold text-primary-foreground disabled:opacity-50"
          >
            <UserPlus className="h-3.5 w-3.5" /> সংযোগ
          </button>
        )}
      </article>
      <DirectMessagePopup
        recipient={profile}
        open={messageOpen}
        onClose={() => setMessageOpen(false)}
        canMessage={effectiveState === "accepted"}
      />
    </>
  );
}

function ProfileSkeletons() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-[22px] border border-border bg-card p-3"
        >
          <Skeleton className="h-14 w-14 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-2.5 w-24" />
          </div>
          <Skeleton className="h-10 w-20 rounded-xl" />
        </div>
      ))}
    </div>
  );
}

function EmptyPeople({ text }: { text: string }) {
  return (
    <div className="rounded-[22px] border border-dashed border-primary/30 bg-primary/5 px-5 py-10 text-center">
      <Users className="mx-auto h-8 w-8 text-primary/60" />
      <p className="mt-3 text-sm font-bold text-foreground">{text}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        এলাকার কৃষকদের সঙ্গে যুক্ত হলে এখানে দেখা যাবে।
      </p>
    </div>
  );
}
