import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  MessageCircle,
  Phone,
  Search,
  SlidersHorizontal,
  Sprout,
  UserX,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/user-context";
import { type FarmerProfile } from "@/components/krishi/farmer-card";
import { LazyImage } from "@/components/krishi/lazy-image";
import { DirectMessagePopup } from "@/components/krishi/direct-message-popup";
import { type ConnectionRow } from "@/hooks/use-connections";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/friends")({
  component: FriendsPage,
  head: () => ({
    meta: [
      { title: "বন্ধু তালিকা — কৃষক বন্ধু" },
      { name: "description", content: "আপনার সঙ্গে সংযুক্ত কৃষকদের বন্ধু তালিকা দেখুন এবং সাজান।" },
    ],
  }),
});

type SortMode = "newest" | "oldest" | "name";
type FriendRecord = { profile: FarmerProfile; connection: ConnectionRow };

function FriendsPage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("newest");

  const friendsQuery = useQuery({
    queryKey: ["friends-page", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("connections")
        .select("id,requester_id,addressee_id,status,created_at,updated_at")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      const connections = (data as ConnectionRow[]) ?? [];
      const profileIds = Array.from(
        new Set(
          connections.map((row) =>
            row.requester_id === user!.id ? row.addressee_id : row.requester_id,
          ),
        ),
      );
      if (!profileIds.length) return [] as FriendRecord[];
      const profilesResult = await supabase
        .from("profiles")
        .select("id,name,district,upazila,avatar_url,bio,crops,role,is_verified")
        .in("id", profileIds);
      if (profilesResult.error) throw profilesResult.error;
      const profileById = new Map(
        ((profilesResult.data as FarmerProfile[]) ?? []).map((profile) => [profile.id, profile]),
      );
      return connections.flatMap((connection) => {
        const friendId =
          connection.requester_id === user!.id ? connection.addressee_id : connection.requester_id;
        const profile = profileById.get(friendId);
        return profile ? [{ profile, connection }] : [];
      });
    },
  });

  const filteredFriends = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("bn-BD");
    const filtered = (friendsQuery.data ?? []).filter(
      ({ profile }) =>
        !needle ||
        [profile.name, profile.district, profile.upazila, profile.bio, ...(profile.crops ?? [])]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("bn-BD")
          .includes(needle),
    );
    return [...filtered].sort((a, b) => {
      if (sortMode === "name")
        return (a.profile.name ?? "").localeCompare(b.profile.name ?? "", "bn-BD");
      const aDate = new Date(a.connection.updated_at || a.connection.created_at).getTime();
      const bDate = new Date(b.connection.updated_at || b.connection.created_at).getTime();
      return sortMode === "newest" ? bDate - aDate : aDate - bDate;
    });
  }, [friendsQuery.data, query, sortMode]);

  return (
    <main className="min-h-screen bg-[#F0F2F5] pb-24 text-[#1C1E21]">
      <header className="sticky top-0 z-20 border-b border-[#DADDE1] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.08)]">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-3 sm:px-4">
          <button
            type="button"
            onClick={() => navigate({ to: "/profile" })}
            aria-label="প্রোফাইলে ফিরে যান"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E4E6EB] text-[#1C1E21] transition hover:bg-[#D8DADF]"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-semibold text-[#65676B]">প্রোফাইল</p>
            <h1 className="truncate text-lg font-extrabold leading-tight text-[#1C1E21]">
              বন্ধু তালিকা
            </h1>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E7F3FF] text-[#1877F2]">
            <Users className="h-5 w-5" />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl">
        <section className="border-b border-[#DADDE1] bg-white px-4 pb-4 pt-5 sm:rounded-b-xl sm:border-x sm:px-6">
          <div className="relative -mx-4 -mt-5 mb-4 h-20 overflow-hidden bg-gradient-to-r from-[#1B4332] via-[#2D6A4F] to-[#74C69D] sm:-mx-6">
            <div className="absolute -right-8 -top-16 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
            <div className="absolute -bottom-20 left-1/3 h-36 w-36 rounded-full bg-[#F4A261]/20 blur-2xl" />
          </div>
          <div className="flex items-center gap-3">
            <div className="-mt-3 flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-[#E7F3FF] text-2xl font-black text-[#1877F2] shadow-sm">
              {user?.name?.charAt(0) ?? "ক"}
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-extrabold text-[#1C1E21]">আপনার বন্ধুরা</h2>
              <p className="mt-0.5 text-sm text-[#65676B]">
                {friendsQuery.data?.length ?? 0} জন সংযুক্ত কৃষক · আপনার কৃষি নেটওয়ার্ক
              </p>
            </div>
          </div>
          <div className="mt-5 flex border-b border-[#DADDE1]">
            <div className="relative px-1 pb-3 text-sm font-extrabold text-[#1877F2]">
              সব বন্ধু
              <span className="absolute inset-x-0 bottom-[-1px] h-0.5 rounded-full bg-[#1877F2]" />
            </div>
          </div>
        </section>

        <section className="mt-3 border-y border-[#DADDE1] bg-white px-3 py-3 sm:rounded-xl sm:border sm:px-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#65676B]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="বন্ধু খুঁজুন"
                className="h-10 w-full rounded-full bg-[#F0F2F5] pl-9 pr-4 text-sm text-[#1C1E21] outline-none placeholder:text-[#65676B] focus:ring-2 focus:ring-[#1877F2]/25"
              />
            </label>
            <div className="flex h-10 items-center gap-1.5 rounded-full bg-[#F0F2F5] px-3 sm:w-64">
              <SlidersHorizontal className="h-4 w-4 shrink-0 text-[#65676B]" />
              <label htmlFor="friend-sort" className="sr-only">
                বন্ধু সাজান
              </label>
              <select
                id="friend-sort"
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as SortMode)}
                className="min-w-0 flex-1 bg-transparent text-xs font-bold text-[#1C1E21] outline-none"
              >
                <option value="newest">নতুন থেকে পুরোনো</option>
                <option value="oldest">পুরোনো থেকে নতুন</option>
                <option value="name">নাম অনুযায়ী</option>
              </select>
            </div>
          </div>
        </section>

        <section className="mt-3 border-y border-[#DADDE1] bg-white px-3 py-3 sm:rounded-xl sm:border sm:px-4">
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-sm font-extrabold text-[#1C1E21]">বন্ধুর তালিকা</p>
            <p className="text-xs font-semibold text-[#65676B]">
              {filteredFriends.length} জন দেখাচ্ছে
            </p>
          </div>
          {friendsQuery.isLoading ? (
            <FriendSkeletons />
          ) : friendsQuery.error ? (
            <EmptyFriends text="বন্ধু তালিকা লোড করা যায়নি" />
          ) : filteredFriends.length === 0 ? (
            <EmptyFriends
              text={query ? "এই নামে কোনো বন্ধু পাওয়া যায়নি" : "এখনো কোনো সংযুক্ত কৃষক নেই"}
            />
          ) : (
            <div className="divide-y divide-[#E4E6EB]">
              {filteredFriends.map(({ profile, connection }) => (
                <FacebookFriendRow key={connection.id} profile={profile} connection={connection} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function FacebookFriendRow({
  profile,
  connection,
}: {
  profile: FarmerProfile;
  connection: ConnectionRow;
}) {
  const navigate = useNavigate();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [contactBusy, setContactBusy] = useState(false);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);

  const confirmRemove = async () => {
    if (!connection?.id || removeBusy) return;
    setRemoveBusy(true);
    const { error } = await supabase.rpc("unfriend_connection", { connection_id: connection.id });
    setRemoveBusy(false);
    if (error) {
      toast.error("বন্ধু সরানো যায়নি, আবার চেষ্টা করুন");
      return;
    }
    setRemoveOpen(false);
    toast.success(`${profile.name || "কৃষক"} বন্ধু তালিকা থেকে সরানো হয়েছে`);
    await queryClient.invalidateQueries({ queryKey: ["friends-page", user?.id] });
    await queryClient.invalidateQueries({ queryKey: ["connections"] });
    await queryClient.invalidateQueries({ queryKey: ["friend-connections"] });
    await queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
  };

  const contact = async (kind: "message" | "call") => {
    if (kind === "message") {
      setMessageOpen(true);
      return;
    }
    setContactBusy(true);
    const { data, error } = await supabase.rpc(
      "get_connected_farmer_phone" as never,
      { target_user_id: profile.id } as never,
    );
    setContactBusy(false);
    if (error || !data) {
      toast.info("এই কৃষকের ফোন নম্বর পাওয়া যায়নি");
      return;
    }
    window.location.href = `tel:${String(data)}`;
  };

  return (
    <>
      <div className="flex items-center gap-3 px-1 py-3 sm:px-2">
      <Link
        to="/u/$userId"
        params={{ userId: profile.id }}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1 transition hover:bg-[#F0F2F5]"
      >
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-[#E7F3FF] text-xl font-black text-[#1877F2]">
          {profile.avatar_url ? (
            <LazyImage
              src={profile.avatar_url}
              alt={profile.name}
              wrapperClassName="h-full w-full"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              {profile.name?.charAt(0) || "ক"}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold text-[#1C1E21]">{profile.name || "কৃষক"}</p>
          <p className="mt-0.5 truncate text-xs text-[#65676B]">
            {profile.upazila
              ? `${profile.upazila}, ${profile.district}`
              : profile.district || "বাংলাদেশ"}
          </p>
          {profile.crops && profile.crops.length > 0 && (
            <div className="mt-1 flex flex-wrap items-center gap-1" aria-label="চাষের ফসল">
              <Sprout className="h-3 w-3 shrink-0 text-[#18A058]" aria-hidden="true" />
              {profile.crops.slice(0, 4).map((crop) => (
                <span
                  key={crop}
                  className="rounded bg-[#E7F8EF] px-1.5 py-0.5 text-[10px] font-semibold leading-tight text-[#18A058]"
                >
                  {crop}
                </span>
              ))}
              {profile.crops.length > 4 && (
                <span className="text-[10px] font-semibold text-[#65676B]">
                  +{profile.crops.length - 4}
                </span>
              )}
            </div>
          )}
          <p className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-[#65676B]">
            <CalendarDays className="h-3 w-3" /> সংযুক্ত:{" "}
            {formatDate(connection.updated_at || connection.created_at)}
          </p>
        </div>
      </Link>
      <div className="flex shrink-0 gap-1.5">
        <button
          type="button"
          disabled={contactBusy}
          onClick={() => void contact("message")}
          aria-label={`${profile.name} কে মেসেজ করুন`}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E7F3FF] text-[#1877F2] transition hover:bg-[#D8ECFF] disabled:opacity-50"
        >
          <MessageCircle className="h-4 w-4" />
        </button>
        <button
          type="button"
          disabled={contactBusy}
          onClick={() => void contact("call")}
          aria-label={`${profile.name} কে কল করুন`}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E7F8EF] text-[#18A058] transition hover:bg-[#D7F3E4] disabled:opacity-50"
        >
          <Phone className="h-4 w-4" />
        </button>
        <button
          type="button"
          disabled={removeBusy}
          onClick={() => setRemoveOpen(true)}
          aria-label={`${profile.name} কে বন্ধু তালিকা থেকে সরান`}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FDECEC] text-[#D93025] transition hover:bg-[#FBDCDC] disabled:opacity-50"
        >
          <UserX className="h-4 w-4" />
        </button>
      </div>
      </div>
      <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <AlertDialogContent className="max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>আপনি কি নিশ্চিত মুছে ফেলতে চান?</AlertDialogTitle>
            <AlertDialogDescription>
              {profile.name || "এই কৃষক"} আপনার বন্ধু তালিকা থেকে সরে যাবে। চাইলে পরে আবার সংযোগের অনুরোধ পাঠাতে পারবেন।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeBusy}>বাতিল</AlertDialogCancel>
            <AlertDialogAction
              disabled={removeBusy}
              onClick={(event) => {
                event.preventDefault();
                void confirmRemove();
              }}
              className="bg-[#D93025] text-white hover:bg-[#B3261E]"
            >
              {removeBusy ? "সরানো হচ্ছে..." : "মুছে ফেলুন"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <DirectMessagePopup
        recipient={profile}
        open={messageOpen}
        onClose={() => setMessageOpen(false)}
        canMessage
      />
    </>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("bn-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function FriendSkeletons() {
  return (
    <div className="divide-y divide-[#E4E6EB]">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 px-1 py-3">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-36" />
            <Skeleton className="h-2.5 w-24" />
          </div>
          <Skeleton className="h-9 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function EmptyFriends({ text }: { text: string }) {
  return (
    <div className="px-4 py-12 text-center">
      <Users className="mx-auto h-9 w-9 text-[#BCC0C4]" />
      <p className="mt-3 text-sm font-bold text-[#65676B]">{text}</p>
      <p className="mt-1 text-xs text-[#8A8D91]">
        সকল কৃষক পেজ থেকে আরও কৃষকের সঙ্গে সংযোগ তৈরি করুন।
      </p>
    </div>
  );
}
