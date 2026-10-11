import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Check,
  Clock3,
  Loader2,
  MapPin,
  MessageCircle,
  Share2,
  Sprout,
  UserPlus,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ContentMenu } from "@/components/krishi/content-menu";
import { useConnectionState } from "@/hooks/use-connections";
import { useUser } from "@/contexts/user-context";
import { EmptyState } from "@/components/krishi/empty-state";
import { ConnectedFarmersList } from "@/components/krishi/connected-farmers-list";
import { DirectMessagePopup } from "@/components/krishi/direct-message-popup";

type Profile = {
  id: string;
  name: string;
  district: string | null;
  upazila: string | null;
  avatar_url: string | null;
  cover_url?: string | null;
  bio: string | null;
  crops: string[] | null;
  role: string;
  is_verified: boolean;
  posts_count: number;
  prices_count: number;
  exchanges_count: number;
  created_at: string;
};

export const Route = createFileRoute("/u/$userId")({
  head: () => ({
    meta: [{ title: "ব্যবহারকারী প্রোফাইল" }],
  }),
  component: PublicProfilePage,
});

function PublicProfilePage() {
  const { userId } = Route.useParams();
  const navigate = useNavigate();
  const { user, loading: userLoading } = useUser();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const {
    state: connectionState,
    busy: connectionBusy,
    request,
    respond,
    cancel,
  } = useConnectionState(profile?.id ?? null);

  useEffect(() => {
    let cancelled = false;
    if (userLoading) return;
    if (user?.id === userId) {
      void navigate({ to: "/profile" });
      return;
    }
    (async () => {
      try {
        setLoading(true);
        const fields =
          "id,name,district,upazila,avatar_url,bio,crops,role,is_verified,posts_count,prices_count,exchanges_count,created_at";

        // Try with cover_url
        let { data, error } = await supabase
          .from("profiles")
          .select(`${fields},cover_url`)
          .eq("id", userId)
          .maybeSingle();

        // Fallback if cover_url fails
        if (error) {
          console.warn("Public profile fetch failed, trying fallback...", error.message);
          const { data: fallbackData, error: fallbackErr } = await supabase
            .from("profiles")
            .select(fields)
            .eq("id", userId)
            .maybeSingle();

          if (fallbackErr) throw fallbackErr;
          // Fallback lacks cover_url — normalize it so the shapes match
          data = (fallbackData ? { ...fallbackData, cover_url: null } : null) as typeof data;
        }

        if (cancelled) return;

        if (!data) {
          setNotFound(true);
        } else {
          setProfile(data as any);
        }
      } catch (err) {
        console.error("Public profile load error:", err);
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate, user?.id, userId, userLoading]);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F0F2F5] pb-24 text-[#1C1E21]">
      <header className="sticky top-0 z-20 border-b border-[#DADDE1] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-3 sm:px-4">
          <button
            type="button"
            onClick={() => navigate({ to: "/feed" })}
            aria-label="ফিরে যান"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E4E6EB] transition hover:bg-[#D8DADF]"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="min-w-0 flex-1 truncate text-base font-extrabold">প্রোফাইল</h1>
          {profile && (
            <ContentMenu
              contentType="user"
              contentId={profile.id}
              authorId={profile.id}
              authorName={profile.name}
            />
          )}
        </div>
      </header>

      {loading ? (
        <div className="mx-auto max-w-3xl space-y-3 bg-white p-4">
          <div className="h-36 animate-pulse rounded-2xl bg-[#E4E6EB]" />
          <div className="h-24 animate-pulse rounded-2xl bg-[#E4E6EB]" />
          <div className="h-40 animate-pulse rounded-2xl bg-[#E4E6EB]" />
        </div>
      ) : notFound || !profile ? (
        <div className="mx-auto max-w-3xl px-4 pt-10">
          <EmptyState
            title="ব্যবহারকারী পাওয়া যায়নি"
            description="এই অ্যাকাউন্ট আর নেই বা মুছে দেওয়া হয়েছে।"
          />
        </div>
      ) : (
        <>
          <section className="mx-auto max-w-3xl overflow-hidden bg-white sm:rounded-b-2xl">
            <div className="relative h-24 overflow-hidden bg-gray-100 sm:h-48">
              {profile.cover_url ? (
                <img src={profile.cover_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-[#1B4332] via-[#2D6A4F] to-[#74C69D]">
                  <div className="pointer-events-none absolute -right-10 -top-20 h-56 w-56 rounded-full bg-white/15 blur-2xl" />
                  <div className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-[#F4A261]/20 blur-2xl" />
                </div>
              )}
            </div>
            <div className="px-4 pb-4 pt-3 sm:px-6 sm:pb-5 sm:pt-4">
              <div className="flex items-end justify-between gap-3">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border-4 border-white bg-[#E7F3FF] text-3xl font-black text-[#1877F2] shadow-md sm:h-32 sm:w-32 sm:text-4xl">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      {profile.name.charAt(0) || "ক"}
                    </div>
                  )}
                </div>
                {user?.id !== profile.id && (
                  <div className="flex gap-2 pb-1">
                    {connectionState === "accepted" && (
                      <button
                        type="button"
                        onClick={() => setMessageOpen(true)}
                        className="home-pressable flex h-10 items-center gap-1.5 rounded-lg bg-[#1877F2] px-3 text-xs font-extrabold text-white shadow-sm transition hover:bg-[#166FE5]"
                      >
                        <MessageCircle className="h-4 w-4" /> <span>মেসেজ</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void navigator.clipboard?.writeText(window.location.href)}
                      aria-label="প্রোফাইল শেয়ার করুন"
                      className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#E4E6EB] text-[#1C1E21] transition hover:bg-[#D8DADF]"
                    >
                      <Share2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 sm:mt-3">
                <h2 className="text-xl font-black tracking-tight sm:text-2xl">
                  {profile.name || "অজ্ঞাত"}
                </h2>
                {profile.is_verified && <BadgeCheck className="h-5 w-5 text-[#1877F2]" />}
                <span className="rounded-full bg-[#E7F3FF] px-2.5 py-1 text-[11px] font-extrabold text-[#1877F2]">
                  {profile.role === "expert" ? "বিশেষজ্ঞ" : "কৃষক"}
                </span>
              </div>
              <p className="mt-1 text-xs font-semibold text-[#65676B]">
                {profile.district || "বাংলাদেশ"}
                {profile.upazila ? `, ${profile.upazila}` : ""} ·{" "}
                {formatMemberSince(profile.created_at)} থেকে সদস্য
              </p>
              {profile.bio && (
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#65676B]">
                  {profile.bio}
                </p>
              )}

              {user?.id !== profile.id && connectionState !== "accepted" && (
                <div className="mt-4 flex gap-2">
                  {connectionState === "outgoing_pending" ? (
                    <button
                      type="button"
                      disabled={connectionBusy}
                      onClick={() => void cancel()}
                      className="home-pressable flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#FFF4D6] text-xs font-extrabold text-[#8A5A00] disabled:opacity-50"
                    >
                      <Clock3 className="h-4 w-4" /> অনুরোধ বাতিল
                    </button>
                  ) : connectionState === "incoming_pending" ? (
                    <>
                      <button
                        type="button"
                        disabled={connectionBusy}
                        onClick={() => void respond("accepted")}
                        className="home-pressable flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#1877F2] text-xs font-extrabold text-white disabled:opacity-50"
                      >
                        <Check className="h-4 w-4" /> গ্রহণ করুন
                      </button>
                      <button
                        type="button"
                        disabled={connectionBusy}
                        onClick={() => void respond("declined")}
                        className="home-pressable flex h-10 w-10 items-center justify-center rounded-lg bg-[#FDE7E7] text-red-600 disabled:opacity-50"
                        aria-label="প্রত্যাখ্যান"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={connectionBusy}
                      onClick={() => void request()}
                      className="home-pressable flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#1877F2] text-xs font-extrabold text-white disabled:opacity-50"
                    >
                      <UserPlus className="h-4 w-4" /> সংযোগ করুন
                    </button>
                  )}
                </div>
              )}

              <div className="mt-4 grid grid-cols-3 divide-x divide-[#DADDE1] rounded-xl border border-[#E4E6EB] bg-[#F7F8FA] py-2 text-center sm:mt-5">
                <Stat label="পোস্ট" value={profile.posts_count} />
                <Stat label="দাম" value={profile.prices_count} />
                <Stat label="বিনিময়" value={profile.exchanges_count} />
              </div>
            </div>
          </section>

          <div className="mx-auto mt-3 max-w-3xl space-y-3">
            <section className="border-y border-[#DADDE1] bg-white px-4 py-4 sm:rounded-xl sm:border sm:px-6">
              <h3 className="text-base font-black">পরিচিতি</h3>
              <div className="mt-3 grid gap-3 text-sm text-[#65676B] sm:grid-cols-2">
                <p className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0 text-[#1877F2]" />
                  {profile.upazila
                    ? `${profile.upazila}, ${profile.district}`
                    : profile.district || "বাংলাদেশ"}
                </p>
                <p className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 shrink-0 text-[#1877F2]" />
                  {formatMemberSince(profile.created_at)} থেকে কৃষক বন্ধুতে
                </p>
                <p className="flex items-center gap-2">
                  <Sprout className="h-4 w-4 shrink-0 text-[#18A058]" />
                  {profile.crops?.length
                    ? `${profile.crops.length}টি ফসল নিয়ে কাজ করছেন`
                    : "ফসলের তথ্য যোগ করেননি"}
                </p>
              </div>
              {profile.crops && profile.crops.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5 border-t border-[#E4E6EB] pt-3">
                  {profile.crops.map((crop) => (
                    <span
                      key={crop}
                      className="rounded-full bg-[#E7F8EF] px-2.5 py-1 text-xs font-bold text-[#18A058]"
                    >
                      {crop}
                    </span>
                  ))}
                </div>
              )}
            </section>

            <ConnectedFarmersList profileId={profile.id} currentUserId={user?.id} />
            <Link
              to="/feed"
              className="block px-4 pb-4 text-center text-sm font-bold text-[#1877F2]"
            >
              ফিডে ফিরে যান
            </Link>
          </div>
          <DirectMessagePopup
            recipient={profile}
            open={messageOpen}
            onClose={() => setMessageOpen(false)}
            canMessage={connectionState === "accepted"}
          />
        </>
      )}
    </main>
  );
}

function formatMemberSince(value: string) {
  return new Date(value).toLocaleDateString("bn-BD", { month: "long", year: "numeric" });
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 text-center">
      <div className="text-lg font-bold text-foreground">{value ?? 0}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}
