import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Users, UserRoundCheck, UserRoundPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/user-context";
import { FarmerCard, type FarmerProfile } from "@/components/krishi/farmer-card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/farmers")({
  component: FarmersPage,
  head: () => ({
    meta: [
      { title: "সকল কৃষক — কৃষক বন্ধু" },
      { name: "description", content: "কৃষক বন্ধুতে নিবন্ধিত কৃষকদের খুঁজুন এবং সংযুক্ত হন।" },
      { property: "og:title", content: "সকল কৃষক — কৃষক বন্ধু" },
      { property: "og:description", content: "কৃষক বন্ধুতে নিবন্ধিত কৃষকদের ফসল দেখে খুঁজুন এবং সংযুক্ত হন।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Tab = "all" | "connected";
type Connection = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "declined" | "cancelled";
  created_at: string;
  updated_at: string;
};

const PROFILE_FIELDS = "id,name,district,upazila,avatar_url,bio,crops,role,is_verified";

function FarmersPage() {
  const { user } = useUser();
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");

  const allFarmersQuery = useQuery({
    queryKey: ["farmers-directory", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(PROFILE_FIELDS)
        .neq("id", user!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data as FarmerProfile[]) ?? [];
    },
  });

  const connectedQuery = useQuery({
    queryKey: ["farmers-directory-connected", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("connections")
        .select("id,requester_id,addressee_id,status,created_at,updated_at")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      const rows = (data as Connection[]) ?? [];
      const ids = Array.from(
        new Set(
          rows.map((row) => (row.requester_id === user!.id ? row.addressee_id : row.requester_id)),
        ),
      );
      if (!ids.length) return { rows, profiles: [] as FarmerProfile[] };
      const profiles = await supabase.from("profiles").select(PROFILE_FIELDS).in("id", ids);
      if (profiles.error) throw profiles.error;
      return { rows, profiles: (profiles.data as FarmerProfile[]) ?? [] };
    },
  });

  const connectedById = useMemo(
    () =>
      new Map(
        (connectedQuery.data?.rows ?? []).map((row) => [
          row.requester_id === user?.id ? row.addressee_id : row.requester_id,
          row,
        ]),
      ),
    [connectedQuery.data?.rows, user?.id],
  );
  const source = useMemo(
    () => (tab === "all" ? (allFarmersQuery.data ?? []) : (connectedQuery.data?.profiles ?? [])),
    [allFarmersQuery.data, connectedQuery.data?.profiles, tab],
  );
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("bn-BD");
    if (!needle) return source;
    return source.filter((farmer) =>
      [farmer.name, farmer.district, farmer.upazila, farmer.bio, ...(farmer.crops ?? [])]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("bn-BD")
        .includes(needle),
    );
  }, [query, source]);

  const loading = tab === "all" ? allFarmersQuery.isLoading : connectedQuery.isLoading;
  const error = tab === "all" ? allFarmersQuery.error : connectedQuery.error;

  return (
    <main className="min-h-screen bg-background pb-24">
      <header className="rounded-b-[30px] bg-primary px-4 pb-7 pt-8 text-primary-foreground sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase">
              কৃষক নেটওয়ার্ক
            </p>
            <h1 className="mt-1 text-2xl font-black">সকল কৃষক</h1>
            <p className="mt-2 max-w-sm text-sm leading-relaxed">
              বাংলাদেশের কৃষকদের খুঁজুন, সংযোগ তৈরি করুন এবং একসঙ্গে চাষাবাদ শিখুন।
            </p>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-foreground/10 text-primary-foreground ring-1 ring-primary-foreground/25">
            <Users className="h-6 w-6" />
          </div>
        </div>
      </header>

      <section className="px-4 pt-4 sm:px-6">
        <div className="home-gradient-border flex gap-1 overflow-x-auto rounded-2xl border border-border bg-card p-1 shadow-[var(--shadow-card)]">
          <TabButton
            active={tab === "all"}
            onClick={() => setTab("all")}
            icon={Users}
            label="সকল কৃষক"
          />
          <TabButton
            active={tab === "connected"}
            onClick={() => setTab("connected")}
            icon={UserRoundCheck}
            label={`সংযুক্ত কৃষক${connectedQuery.data?.profiles.length ? ` · ${connectedQuery.data.profiles.length}` : ""}`}
          />
        </div>
        <label className="relative mt-4 block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="নাম, এলাকা বা ফসল দিয়ে খুঁজুন"
            className="h-12 w-full rounded-2xl border border-border bg-card pl-10 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>
      </section>

      <section className="px-4 pb-6 pt-4 sm:px-6">
        {loading ? (
          <FarmerSkeletons />
        ) : error ? (
          <div className="rounded-[22px] border border-dashed border-destructive/30 bg-destructive/5 px-5 py-10 text-center text-sm font-bold text-destructive">
            কৃষকদের তালিকা লোড করা যায়নি। আবার চেষ্টা করুন।
          </div>
        ) : filtered.length === 0 ? (
          <EmptyFarmers connected={tab === "connected"} />
        ) : (
          <div className="space-y-3">
            {filtered.map((farmer) => (
              <FarmerCard
                key={farmer.id}
                profile={farmer}
                currentUserId={user?.id}
                connection={connectedById.get(farmer.id) ?? null}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Users;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`home-pressable flex min-h-11 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 text-xs font-extrabold ${active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"}`}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

function FarmerSkeletons() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 rounded-[22px] border border-border bg-card p-3"
        >
          <Skeleton className="h-14 w-14 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-36" />
            <Skeleton className="h-2.5 w-24" />
          </div>
          <Skeleton className="h-10 w-20 rounded-xl" />
        </div>
      ))}
    </div>
  );
}

function EmptyFarmers({ connected }: { connected: boolean }) {
  return (
    <div className="rounded-[22px] border border-dashed border-primary/30 bg-primary/5 px-5 py-10 text-center">
      <UserRoundPlus className="mx-auto h-8 w-8 text-primary/60" />
      <p className="mt-3 text-sm font-bold text-foreground">
        {connected ? "এখনো কোনো সংযুক্ত কৃষক নেই" : "কোনো কৃষক পাওয়া যায়নি"}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {connected
          ? "সকল কৃষক তালিকা থেকে কৃষকদের সঙ্গে সংযোগ তৈরি করুন।"
          : "অন্য নামে বা এলাকায় খুঁজে দেখুন।"}
      </p>
    </div>
  );
}
