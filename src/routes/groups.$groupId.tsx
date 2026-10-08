import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Flag, LogOut, Send, Trash2, UserMinus, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/user-context";
import { useRole } from "@/hooks/use-role";
import { useMyFriends, groupThreadsKey, type GroupMessage } from "@/hooks/use-group-chats";
import { pushGroupMessage } from "@/lib/group-chat.functions";
import { BottomSheet } from "@/components/krishi/bottom-sheet";
import { ReportModal } from "@/components/krishi/report-modal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/groups/$groupId")({
  component: GroupChatPage,
  head: () => ({
    meta: [
      { title: "গ্রুপ চ্যাট — কৃষক বন্ধু" },
      { name: "description", content: "কৃষকদের গ্রুপ আলোচনা" },
      { property: "og:title", content: "গ্রুপ চ্যাট — কৃষক বন্ধু" },
      { property: "og:description", content: "কৃষকদের গ্রুপ আলোচনা" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Member = { user_id: string; role: string; name: string; avatar_url: string | null };

function GroupChatPage() {
  const { groupId } = Route.useParams();
  const { user } = useUser();
  const { isAdmin: isAppAdmin } = useRole() as { isAdmin?: boolean };
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [membersOpen, setMembersOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const groupQ = useQuery({
    queryKey: ["group", groupId],
    queryFn: async () => {
      const { data, error } = await supabase.from("group_chats").select("*").eq("id", groupId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const membersQ = useQuery({
    queryKey: ["group-members", groupId],
    queryFn: async (): Promise<Member[]> => {
      const { data } = await supabase.from("group_chat_members").select("user_id, role").eq("group_id", groupId);
      const ids = (data ?? []).map((m) => m.user_id);
      if (!ids.length) return [];
      const { data: profs } = await supabase.from("profiles").select("id, name, avatar_url").in("id", ids);
      const map = new Map((profs ?? []).map((p) => [p.id, p]));
      return (data ?? []).map((m) => ({
        ...m,
        name: map.get(m.user_id)?.name ?? "কৃষক",
        avatar_url: map.get(m.user_id)?.avatar_url ?? null,
      }));
    },
  });
  const members = membersQ.data ?? [];
  const memberMap = useMemo(() => new Map(members.map((m) => [m.user_id, m])), [members]);
  const me = user ? memberMap.get(user.id) : undefined;
  const isGroupAdmin = me?.role === "admin";
  const friends = useMyFriends();

  useEffect(() => {
    let active = true;
    supabase
      .from("group_chat_messages")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => {
        if (active) setMessages((data ?? []).reverse());
      });
    void supabase.rpc("mark_group_read", { _group_id: groupId }).then(() =>
      qc.invalidateQueries({ queryKey: groupThreadsKey(user?.id ?? null) }),
    );
    const ch = supabase
      .channel(`group-${groupId}-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "group_chat_messages", filter: `group_id=eq.${groupId}` },
        (payload) => {
          const m = payload.new as GroupMessage;
          setMessages((cur) => (cur.some((x) => x.id === m.id) ? cur : [...cur, m]));
          void supabase.rpc("mark_group_read", { _group_id: groupId });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "group_chat_members", filter: `group_id=eq.${groupId}` },
        () => qc.invalidateQueries({ queryKey: ["group-members", groupId] }),
      )
      .subscribe();
    return () => {
      active = false;
      void supabase.removeChannel(ch);
    };
  }, [groupId, qc, user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const send = async () => {
    const body = text.trim();
    if (!body || !user) return;
    setText("");
    const { data, error } = await supabase
      .from("group_chat_messages")
      .insert({ group_id: groupId, sender_id: user.id, body })
      .select()
      .single();
    if (error) {
      toast.error("মেসেজ পাঠানো যায়নি");
      setText(body);
      return;
    }
    setMessages((cur) => (cur.some((x) => x.id === data.id) ? cur : [...cur, data]));
    void pushGroupMessage({ data: { messageId: data.id } }).catch(() => {});
  };

  const addMembers = async () => {
    const { error } = await supabase.rpc("add_group_members", { _group_id: groupId, _member_ids: picked });
    if (error) return toast.error("সদস্য যোগ করা যায়নি");
    toast.success("সদস্য যোগ হয়েছে");
    setPicked([]);
    setAddOpen(false);
    qc.invalidateQueries({ queryKey: ["group-members", groupId] });
  };

  const removeMember = async (uid: string) => {
    const { error } = await supabase.rpc("remove_group_member", { _group_id: groupId, _user_id: uid });
    if (error) return toast.error("সরানো যায়নি");
    if (uid === user?.id) {
      toast.success("গ্রুপ থেকে বের হয়েছেন");
      navigate({ to: "/messages" });
      return;
    }
    toast.success("সদস্য সরানো হয়েছে");
    qc.invalidateQueries({ queryKey: ["group-members", groupId] });
  };

  const deleteGroup = async () => {
    const { error } = await supabase.from("group_chats").delete().eq("id", groupId);
    if (error) return toast.error("মুছে ফেলা যায়নি");
    toast.success("গ্রুপ মুছে ফেলা হয়েছে");
    qc.invalidateQueries({ queryKey: groupThreadsKey(user?.id ?? null) });
    navigate({ to: "/messages" });
  };

  if (groupQ.isSuccess && !groupQ.data) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background p-6 text-center">
        <p className="font-bold text-foreground">গ্রুপটি পাওয়া যায়নি বা আপনি এর সদস্য নন</p>
        <Link to="/messages" className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
          মেসেজে ফিরে যান
        </Link>
      </main>
    );
  }

  const g = groupQ.data;
  const addable = (friends.data ?? []).filter((f) => !memberMap.has(f.id));

  return (
    <main className="flex h-dvh flex-col bg-background">
      <header className="flex items-center gap-2 border-b border-border bg-card px-3 py-3">
        <Link to="/messages" aria-label="ফিরে যান" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <button type="button" onClick={() => setMembersOpen(true)} className="min-w-0 flex-1 text-left">
          <h1 className="truncate text-base font-black text-foreground">{g?.name ?? "..."}</h1>
          <p className="truncate text-xs text-muted-foreground">
            {g?.topic ? `${g.topic} · ` : ""}
            {members.length} জন সদস্য
          </p>
        </button>
        <button type="button" onClick={() => setMembersOpen(true)} aria-label="সদস্য" className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary">
          <Users className="h-5 w-5" />
        </button>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto px-3 py-4">
        {messages.length === 0 && (
          <p className="pt-10 text-center text-sm text-muted-foreground">এখনো কোনো মেসেজ নেই — আলোচনা শুরু করুন</p>
        )}
        {messages.map((m, i) => {
          const mine = m.sender_id === user?.id;
          const sender = memberMap.get(m.sender_id);
          const showName = !mine && messages[i - 1]?.sender_id !== m.sender_id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[78%]">
                {showName && <p className="mb-0.5 ml-2 text-[11px] font-bold text-muted-foreground">{sender?.name ?? "সাবেক সদস্য"}</p>}
                <div className={`whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                  {m.body}
                </div>
                <p className={`mt-0.5 text-[10px] text-muted-foreground ${mine ? "text-right mr-2" : "ml-2"}`}>
                  {new Date(m.created_at).toLocaleTimeString("bn-BD", { hour: "numeric", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {me ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
          className="flex items-end gap-2 border-t border-border bg-card px-3 py-2"
          style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            rows={1}
            maxLength={2000}
            placeholder="মেসেজ লিখুন..."
            className="max-h-32 flex-1 resize-none rounded-2xl bg-muted px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button type="submit" disabled={!text.trim()} aria-label="পাঠান" className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40">
            <Send className="h-4 w-4" />
          </button>
        </form>
      ) : (
        <p className="border-t border-border bg-card p-3 text-center text-xs text-muted-foreground">
          আপনি এই গ্রুপের সদস্য নন{isAppAdmin ? " — অ্যাডমিন হিসেবে দেখছেন" : ""}
        </p>
      )}

      <BottomSheet open={membersOpen} onClose={() => setMembersOpen(false)} title="গ্রুপের তথ্য">
        <div className="space-y-4 pb-4">
          {g?.topic && <p className="rounded-xl bg-muted p-3 text-sm text-foreground">{g.topic}</p>}
          {isGroupAdmin && (
            <button type="button" onClick={() => { setMembersOpen(false); setAddOpen(true); }} className="flex w-full items-center gap-3 rounded-xl bg-secondary p-3 text-sm font-bold text-primary">
              <UserPlus className="h-5 w-5" /> বন্ধু যোগ করুন
            </button>
          )}
          <div className="divide-y divide-border">
            {members.map((m) => (
              <div key={m.user_id} className="flex items-center gap-3 py-2.5">
                <Avatar name={m.name} url={m.avatar_url} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">{m.name}{m.user_id === user?.id ? " (আপনি)" : ""}</p>
                  {m.role === "admin" && <p className="text-[11px] font-semibold text-primary">গ্রুপ অ্যাডমিন</p>}
                </div>
                {isGroupAdmin && m.role !== "admin" && (
                  <button type="button" onClick={() => void removeMember(m.user_id)} aria-label="সরান" className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                    <UserMinus className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {me && (
            <button type="button" onClick={() => { setMembersOpen(false); setReportOpen(true); }} className="flex w-full items-center gap-3 rounded-xl border border-border p-3 text-sm font-bold text-foreground">
              <Flag className="h-5 w-5 text-destructive" /> অ্যাপ অ্যাডমিনের কাছে রিপোর্ট করুন
            </button>
          )}
          {me && !isGroupAdmin && (
            <button type="button" onClick={() => void removeMember(me.user_id)} className="flex w-full items-center gap-3 rounded-xl border border-border p-3 text-sm font-bold text-foreground">
              <LogOut className="h-5 w-5" /> গ্রুপ থেকে বের হোন
            </button>
          )}
          {(isGroupAdmin || isAppAdmin) && (
            <button type="button" onClick={() => setConfirmDelete(true)} className="flex w-full items-center gap-3 rounded-xl bg-destructive/10 p-3 text-sm font-bold text-destructive">
              <Trash2 className="h-5 w-5" /> পুরো গ্রুপ চ্যাট মুছে ফেলুন
            </button>
          )}
        </div>
      </BottomSheet>

      <BottomSheet open={addOpen} onClose={() => setAddOpen(false)} title="বন্ধু যোগ করুন">
        <FriendPicker friends={addable} picked={picked} setPicked={setPicked} />
        <button type="button" disabled={!picked.length} onClick={() => void addMembers()} className="mt-3 w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-40">
          যোগ করুন ({picked.length})
        </button>
      </BottomSheet>

      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} contentType="group_chat" contentId={groupId} />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>আপনি কি নিশ্চিত মুছে ফেলতে চান?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>বাতিল</AlertDialogCancel>
            <AlertDialogAction onClick={() => void deleteGroup()}>মুছে ফেলুন</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

export function Avatar({ name, url }: { name: string; url: string | null }) {
  return url ? (
    <img src={url} alt={name} className="h-10 w-10 shrink-0 rounded-full object-cover" loading="lazy" />
  ) : (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary font-black text-primary">
      {name.charAt(0) || "ক"}
    </span>
  );
}

export function FriendPicker({
  friends,
  picked,
  setPicked,
}: {
  friends: Array<{ id: string; name: string; avatar_url: string | null; district: string | null }>;
  picked: string[];
  setPicked: (v: string[]) => void;
}) {
  if (!friends.length) return <p className="py-6 text-center text-sm text-muted-foreground">যোগ করার মতো কোনো বন্ধু নেই</p>;
  return (
    <div className="max-h-[50vh] divide-y divide-border overflow-y-auto">
      {friends.map((f) => {
        const on = picked.includes(f.id);
        return (
          <label key={f.id} className="flex cursor-pointer items-center gap-3 py-2.5">
            <Avatar name={f.name} url={f.avatar_url} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-foreground">{f.name}</p>
              {f.district && <p className="text-[11px] text-muted-foreground">{f.district}</p>}
            </div>
            <input
              type="checkbox"
              checked={on}
              onChange={() => setPicked(on ? picked.filter((x) => x !== f.id) : [...picked, f.id])}
              className="h-5 w-5 accent-primary"
            />
          </label>
        );
      })}
    </div>
  );
}
