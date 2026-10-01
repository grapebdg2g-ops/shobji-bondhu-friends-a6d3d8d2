import { useState } from "react";
import { BadgeCheck, Check, Clock3, MapPin, MessageCircle, Phone, Sprout, UserPlus, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  useConnectionState,
  type ConnectionState,
  type ConnectionRow,
} from "@/hooks/use-connections";
import { LazyImage } from "@/components/krishi/lazy-image";
import { DirectMessagePopup } from "@/components/krishi/direct-message-popup";

export type FarmerProfile = {
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

export function FarmerCard({
  profile,
  currentUserId,
  connection,
  compact = false,
}: {
  profile: FarmerProfile;
  currentUserId?: string;
  connection?: ConnectionRow | null;
  compact?: boolean;
}) {
  const [contactBusy, setContactBusy] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const { state, busy, request, respond, cancel } = useConnectionState(profile.id);
  const isSelf = profile.id === currentUserId;
  const effectiveState: ConnectionState = connection?.status === "accepted" ? "accepted" : state;

  const contact = async (kind: "message" | "call") => {
    if (isSelf) return;
    if (kind === "message") {
      setMessageOpen(true);
      return;
    }
    if (effectiveState !== "accepted") {
      toast.info("যোগাযোগ করতে আগে সংযোগ গ্রহণ করুন");
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
      <article
      className={`home-pressable rounded-[22px] border border-border bg-card shadow-[var(--shadow-card)] ${compact ? "p-2.5" : "p-3"}`}
    >
      <div className="flex items-center gap-3">
        {!isSelf && (
          <div className="flex shrink-0 items-center gap-1.5 pr-1">
            <button
              type="button"
              disabled={contactBusy}
              onClick={() => void contact("message")}
              aria-label={`${profile.name} কে মেসেজ করুন`}
              className="home-pressable flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary disabled:opacity-50"
            >
              <MessageCircle className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={contactBusy}
              onClick={() => void contact("call")}
              aria-label={`${profile.name} কে কল করুন`}
              className="home-pressable flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 disabled:opacity-50"
            >
              <Phone className="h-4 w-4" />
            </button>
          </div>
        )}

        <Link
          to="/u/$userId"
          params={{ userId: profile.id }}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          <div
            className={`${compact ? "h-10 w-10 rounded-full" : "h-12 w-12 rounded-full"} shrink-0 overflow-hidden bg-primary/10 text-primary ring-2 ring-primary/10`}
          >
            {profile.avatar_url ? (
              <LazyImage
                src={profile.avatar_url}
                alt={profile.name}
                wrapperClassName="h-full w-full"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center font-black">
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
            <p className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-muted-foreground">
              <MapPin className="h-2.5 w-2.5 shrink-0" />
              {profile.upazila
                ? `${profile.upazila}, ${profile.district}`
                : (profile.district ?? "বাংলাদেশ")}
            </p>
            {profile.crops && profile.crops.length > 0 && (
              <div className="mt-1.5 flex flex-wrap items-start gap-1" aria-label="চাষের ফসল">
                <Sprout className="mr-0.5 mt-0.5 h-3 w-3 shrink-0 text-primary" aria-hidden="true" />
                {profile.crops.map((crop) => (
                  <span key={crop} className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold leading-tight text-primary">
                    {crop}
                  </span>
                ))}
              </div>
            )}
          </div>
        </Link>
      </div>

      {!isSelf && (
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/70 pt-2.5">
          {effectiveState === "accepted" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-extrabold text-emerald-700">
              <Check className="h-3 w-3" /> সংযুক্ত কৃষক
            </span>
          ) : effectiveState === "outgoing_pending" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void cancel()}
              className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-extrabold text-amber-700 disabled:opacity-50"
            >
              <Clock3 className="h-3 w-3" /> অনুরোধ বাতিল
            </button>
          ) : effectiveState === "incoming_pending" ? (
            <div className="flex gap-1.5">
              <button
                type="button"
                disabled={busy}
                onClick={() => void respond("accepted")}
                className="home-pressable inline-flex items-center gap-1 rounded-xl bg-primary px-2.5 py-1.5 text-[10px] font-extrabold text-primary-foreground disabled:opacity-50"
              >
                <Check className="h-3 w-3" /> গ্রহণ
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void respond("declined")}
                className="home-pressable flex h-7 w-7 items-center justify-center rounded-xl bg-destructive/10 text-destructive disabled:opacity-50"
                aria-label="প্রত্যাখ্যান"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => void request()}
              className="home-pressable inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-[10px] font-extrabold text-primary-foreground disabled:opacity-50"
            >
              <UserPlus className="h-3 w-3" /> সংযোগ করুন
            </button>
          )}
          {effectiveState !== "accepted" && (
            <span className="text-[10px] text-muted-foreground">সংযুক্ত হলে মেসেজ/কল</span>
          )}
        </div>
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
