import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, MessageCircle, Plus, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/user-context";
import { useGroupThreads, useMyFriends, groupThreadsKey, type GroupThread } from "@/hooks/use-group-chats";
import { BottomSheet } from "@/components/krishi/bottom-sheet";
import { FriendPicker } from "@/components/krishi/group-chat-parts";
import { useMemo, useState } from "react";
import { DirectMessagePopup } from "@/components/krishi/direct-message-popup";
import { LazyImage } from "@/components/krishi/lazy-image";
import { useDirectThreads, type DirectThread } from "@/hooks/use-direct-messages";

export const Route = createFileRoute("/messages")({
  component: MessagesPage,
  head: () => ({
    meta: [
      { title: "মেসেজ ও গ্রুপ চ্যাট — কৃষক বন্ধু" },
      { name: "description", content: "কৃষক বন্ধুদের সাথে ব্যক্তিগত ও গ্রুপ মেসেজ" },
      { property: "og:title", content: "মেসেজ ও গ্রুপ চ্যাট — কৃষক বন্ধু" },
      { property: "og:description", content: "কৃষক বন্ধুদের সাথে ব্যক্তিগত ও গ্রুপ মেসেজ" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function formatThreadTime(value: string) {
  const date = new Date(value);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return date.toLocaleTimeString("bn-BD", { hour: "numeric", minute: "2-digit" });
  return date.toLocaleDateString("bn-BD", { day: "numeric", month: "short" });
}

function MessagesPage() {
  const navigate = useNavigate();
  const { threads, loading, unreadCount: dmUnread, error, refresh } = useDirectThreads();
  const groups = useGroupThreads();
  const unreadCount = dmUnread + groups.unreadCount;
  const [tab, setTab] = useState<"all" | "direct" | "groups">("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedThread, setSelectedThread] = useState<DirectThread | null>(null);
  const filtered = useMemo(() => {
    const value = query.trim().toLocaleLowerCase("bn-BD");
    if (!value) return threads;
    return threads.filter((thread) =>
      `${thread.peer_name} ${thread.peer_district ?? ""}`
        .toLocaleLowerCase("bn-BD")
        .includes(value),
    );
  }, [query, threads]);
  const filteredGroups = useMemo(() => {
    const value = query.trim().toLocaleLowerCase("bn-BD");
    if (!value) return groups.threads;
    return groups.threads.filter((g) => `${g.name} ${g.topic ?? ""}`.toLocaleLowerCase("bn-BD").includes(value));
  }, [query, groups.threads]);
  const showDirect = tab !== "groups";
  const showGroups = tab !== "direct";

  return (
    <main className="min-h-[calc(100dvh-4rem)] bg-[#F0FFF4] px-3 pb-6 sm:px-5">
      <header className="mx-auto flex max-w-2xl items-center gap-3 border-b border-[#E4E6EB] py-4">
        <button
          type="button"
          onClick={() => navigate({ to: "/dashboard" })}
          aria-label="ফিরে যান"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#1C1E21] shadow-sm"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-black text-[#1C1E21]">মেসেজ</h1>
          <p className="text-xs text-[#65676B]">বন্ধু ও গ্রুপের সঙ্গে কথা বলুন</p>
        </div>
        {unreadCount > 0 && (
          <span className="rounded-full bg-[#1877F2] px-2.5 py-1 text-xs font-black text-white">
            {unreadCount > 99 ? "৯৯+" : unreadCount}
          </span>
        )}
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-1 rounded-full bg-[#1877F2] px-3 py-2 text-xs font-bold text-white"
        >
          <Plus className="h-4 w-4" /> নতুন গ্রুপ
        </button>
      </header>

      <section className="mx-auto mt-4 max-w-2xl rounded-2xl border border-[#E4E6EB] bg-white p-3 shadow-sm">
        <label className="relative block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#65676B]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="মেসেজ খুঁজুন..."
            className="h-11 w-full rounded-full bg-[#F0F2F5] pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-[#1877F2]/30"
          />
        </label>
        <div className="mt-3 flex gap-2">
          {([["all", "সব"], ["direct", "ব্যক্তিগত"], ["groups", "গ্রুপ"]] as const).map(([k, l]) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={`rounded-full px-4 py-1.5 text-xs font-bold ${tab === k ? "bg-[#1877F2] text-white" : "bg-[#F0F2F5] text-[#1C1E21]"}`}
            >
              {l}
            </button>
          ))}
        </div>
      </section>

      {showGroups && filteredGroups.length > 0 && (
        <section className="mx-auto mt-3 max-w-2xl overflow-hidden rounded-2xl border border-[#E4E6EB] bg-white shadow-sm">
          <p className="px-4 pt-3 text-xs font-black text-[#65676B]">গ্রুপ চ্যাট</p>
          <div className="divide-y divide-[#E4E6EB]">
            {filteredGroups.map((g) => (
              <GroupRow key={g.group_id} group={g} />
            ))}
          </div>
        </section>
      )}
      {tab === "groups" && filteredGroups.length === 0 && !groups.loading && (
        <section className="mx-auto mt-3 max-w-2xl rounded-2xl border border-[#E4E6EB] bg-white px-6 py-12 text-center shadow-sm">
          <Users className="mx-auto h-8 w-8 text-[#1877F2]" />
          <p className="mt-3 text-sm font-bold text-[#1C1E21]">এখনো কোনো গ্রুপ নেই</p>
          <button type="button" onClick={() => setCreateOpen(true)} className="mt-3 rounded-full bg-[#1877F2] px-4 py-2 text-sm font-bold text-white">
            নতুন গ্রুপ খুলুন
          </button>
        </section>
      )}

      {showDirect && (
      <section className="mx-auto mt-3 max-w-2xl overflow-hidden rounded-2xl border border-[#E4E6EB] bg-white shadow-sm">
        {error ? (
          <div className="px-6 py-14 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
              <MessageCircle className="h-6 w-6" />
            </span>
            <h2 className="mt-4 text-base font-black text-[#1C1E21]">
              মেসেজ সেবা এখন লোড হচ্ছে না
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-[#65676B]">
              সংযোগ বা সার্ভার সেটআপে সমস্যা হয়েছে। একটু পরে আবার চেষ্টা করুন।
            </p>
            <button
              type="button"
              onClick={() => void refresh()}
              className="mt-4 rounded-full bg-[#1877F2] px-4 py-2.5 text-sm font-bold text-white"
            >
              আবার চেষ্টা করুন
            </button>
          </div>
        ) : loading ? (
          <div className="space-y-3 p-4">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-16 animate-pulse rounded-xl bg-[#F0F2F5]" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#E7F3FF] text-[#1877F2]">
              {query ? <Search className="h-6 w-6" /> : <Users className="h-6 w-6" />}
            </span>
            <h2 className="mt-4 text-base font-black text-[#1C1E21]">
              {query ? "কোনো মেসেজ পাওয়া যায়নি" : "এখনো কোনো মেসেজ নেই"}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-[#65676B]">
              {query
                ? "অন্য নাম দিয়ে খুঁজে দেখুন।"
                : "বন্ধু তালিকা থেকে সংযুক্ত কৃষক বেছে নিয়ে প্রথম মেসেজ পাঠান।"}
            </p>
            {!query && (
              <Link
                to="/friends"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#1877F2] px-4 py-2.5 text-sm font-bold text-white"
              >
                বন্ধু তালিকা দেখুন <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[#E4E6EB]">
            {filtered.map((thread) => (
              <ThreadRow
                key={thread.peer_id}
                thread={thread}
                onOpen={() => setSelectedThread(thread)}
              />
            ))}
          </div>
        )}
      </section>
      )}
      <CreateGroupSheet open={createOpen} onClose={() => setCreateOpen(false)} />
      {selectedThread && (
        <DirectMessagePopup
          recipient={{
            id: selectedThread.peer_id,
            name: selectedThread.peer_name || "কৃষক",
            avatar_url: selectedThread.peer_avatar_url,
            district: selectedThread.peer_district,
          }}
          open
          onClose={() => setSelectedThread(null)}
          canMessage
        />
      )}
    </main>
  );
}

function ThreadRow({ thread, onOpen }: { thread: DirectThread; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[#F0F2F5]"
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-[#E7F3FF] text-lg font-black text-[#1877F2]">
        {thread.peer_avatar_url ? (
          <LazyImage
            src={thread.peer_avatar_url}
            alt={thread.peer_name}
            wrapperClassName="h-full w-full"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            {thread.peer_name?.charAt(0) || "ক"}
          </div>
        )}
        <span
          className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#31A24C]"
          aria-label="অনলাইন"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h2
            className={`truncate text-sm ${thread.unread_count ? "font-black text-[#1C1E21]" : "font-bold text-[#1C1E21]"}`}
          >
            {thread.peer_name || "কৃষক"}
          </h2>
          <span className="shrink-0 text-[10px] text-[#65676B]">
            {formatThreadTime(thread.last_message_at)}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <p
            className={`truncate text-xs ${thread.unread_count ? "font-bold text-[#1C1E21]" : "text-[#65676B]"}`}
          >
            {thread.last_body}
          </p>
          {thread.unread_count > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1877F2] px-1 text-[10px] font-black text-white">
              {thread.unread_count > 9 ? "৯+" : thread.unread_count}
            </span>
          )}
        </div>
        {thread.peer_district && (
          <p className="mt-1 truncate text-[10px] text-[#65676B]">{thread.peer_district}</p>
        )}
      </div>
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E7F3FF] text-[#1877F2]"
        aria-hidden="true"
      >
        <MessageCircle className="h-5 w-5" />
      </span>
    </button>
  );
}

function GroupRow({ group }: { group: GroupThread }) {
  const unread = Number(group.unread_count ?? 0);
  return (
    <Link
      to="/groups/$groupId"
      params={{ groupId: group.group_id }}
      className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[#F0F2F5]"
    >
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#E7F3FF] text-[#1877F2]">
        <Users className="h-6 w-6" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h2 className={`truncate text-sm text-[#1C1E21] ${unread ? "font-black" : "font-bold"}`}>{group.name}</h2>
          <span className="shrink-0 text-[10px] text-[#65676B]">{formatThreadTime(group.last_message_at)}</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <p className={`truncate text-xs ${unread ? "font-bold text-[#1C1E21]" : "text-[#65676B]"}`}>
            {group.last_body ? `${group.last_sender_name ?? "কৃষক"}: ${group.last_body}` : group.topic || `${group.member_count} জন সদস্য`}
          </p>
          {unread > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1877F2] px-1 text-[10px] font-black text-white">
              {unread > 9 ? "৯+" : unread}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function CreateGroupSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useUser();
  const friends = useMyFriends();
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const create = async () => {
    if (!name.trim()) return toast.error("গ্রুপের নাম দিন");
    setSaving(true);
    const { data, error } = await supabase.rpc("create_group_chat", { _name: name.trim(), _topic: topic.trim(), _member_ids: picked });
    setSaving(false);
    if (error || !data) return toast.error("গ্রুপ খোলা যায়নি");
    qc.invalidateQueries({ queryKey: groupThreadsKey(user?.id ?? null) });
    setName("");
    setTopic("");
    setPicked([]);
    onClose();
    navigate({ to: "/groups/$groupId", params: { groupId: data } });
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="নতুন গ্রুপ চ্যাট">
      <div className="space-y-3 pb-2">
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="গ্রুপের নাম (যেমন: টমেটো চাষি ভাইরা)" className="h-11 w-full rounded-xl bg-muted px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
        <textarea value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={300} rows={2} placeholder="আলোচনার বিষয় (ঐচ্ছিক)" className="w-full resize-none rounded-xl bg-muted px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
        <p className="text-xs font-bold text-muted-foreground">বন্ধু তালিকা থেকে সদস্য বেছে নিন</p>
        <FriendPicker friends={friends.data ?? []} picked={picked} setPicked={setPicked} />
        <button type="button" disabled={saving || !name.trim()} onClick={() => void create()} className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-40">
          {saving ? "খোলা হচ্ছে..." : `গ্রুপ খুলুন${picked.length ? ` (${picked.length} জন)` : ""}`}
        </button>
      </div>
    </BottomSheet>
  );
}
