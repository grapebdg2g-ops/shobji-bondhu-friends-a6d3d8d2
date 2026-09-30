import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/user-context";
import type { Database } from "@/integrations/supabase/types";

export type DirectMessage = Database["public"]["Tables"]["direct_messages"]["Row"];
export type DirectThread = Database["public"]["Functions"]["get_direct_threads"]["Returns"][number];

type PresencePayload = { typing?: boolean; online_at?: string };

function isForConversation(message: DirectMessage, userId: string, peerId: string) {
  return (
    (message.sender_id === userId && message.recipient_id === peerId) ||
    (message.sender_id === peerId && message.recipient_id === userId)
  );
}

export function useDirectThreads() {
  const { user } = useUser();
  const [threads, setThreads] = useState<DirectThread[]>([]);
  const [loading, setLoading] = useState(Boolean(user));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setThreads([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error: rpcError } = await supabase.rpc("get_direct_threads");
      if (rpcError) throw rpcError;
      setThreads((data ?? []) as DirectThread[]);
      setError(null);
    } catch (caught) {
      console.error("[direct-messages] thread load failed", caught);
      setError(caught instanceof Error ? caught.message : "মেসেজ লোড করা যায়নি");
      setThreads([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
    if (!user) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    // Unique topic per hook instance: the hook is mounted in several places
    // (nav badge + messages page) and reusing a topic returns an already
    // subscribed channel, which throws when adding callbacks.
    const instanceId = Math.random().toString(36).slice(2, 10);
    try {
      channel = supabase
        .channel(`direct-thread-list-${user.id}-${instanceId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "direct_messages" },
          () => void refresh(),
        )
        .subscribe((status) => {
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            setError("মেসেজ সেবা সংযোগ করা যায়নি");
          }
        });
    } catch (caught) {
      console.error("[direct-messages] thread subscription failed", caught);
      setError("মেসেজ সেবা সংযোগ করা যায়নি");
    }
    return () => {
      if (channel) void supabase.removeChannel(channel);
    };
  }, [refresh, user]);

  return {
    threads,
    loading,
    unreadCount: threads.reduce((total, thread) => total + Number(thread.unread_count ?? 0), 0),
    error,
    refresh,
  };
}

export function useDirectConversation(peerId: string | undefined) {
  const { user } = useUser();
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(Boolean(user && peerId));
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [peerOnline, setPeerOnline] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const markRead = useCallback(async () => {
    if (!user || !peerId) return;
    await supabase.rpc("mark_direct_messages_read", { peer_user_id: peerId });
  }, [peerId, user]);

  const refresh = useCallback(async () => {
    if (!user || !peerId) {
      setMessages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error: queryError } = await supabase
        .from("direct_messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user.id},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${user.id})`,
        )
        .order("created_at", { ascending: true })
        .limit(200);
      if (queryError) throw queryError;
      setMessages((data ?? []) as DirectMessage[]);
      setError(null);
      void markRead();
    } catch (caught) {
      console.error("[direct-messages] conversation load failed", caught);
      setError(caught instanceof Error ? caught.message : "মেসেজ লোড করা যায়নি");
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [markRead, peerId, user]);

  useEffect(() => {
    void refresh();
    if (!user || !peerId) return;

    const roomId = [user.id, peerId].sort().join(":");
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const updatePresence = () => {
      const activeChannel = channelRef.current;
      if (!activeChannel) return;
      const state = activeChannel.presenceState<PresencePayload>();
      const peerEntries = state[peerId] ?? [];
      setPeerOnline(peerEntries.length > 0);
      setPeerTyping(peerEntries.some((entry) => entry.typing === true));
    };
    try {
      channel = supabase
        .channel(`direct-message-room-${roomId}`, { config: { presence: { key: user.id } } })
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "direct_messages" },
          (payload) => {
            const message = payload.new as DirectMessage;
            if (!isForConversation(message, user.id, peerId)) return;
            setMessages((previous) =>
              previous.some((item) => item.id === message.id) ? previous : [...previous, message],
            );
            if (message.recipient_id === user.id) void markRead();
          },
        )
        .on("presence", { event: "sync" }, () => {
          updatePresence();
        })
        .on("presence", { event: "join" }, () => {
          updatePresence();
        })
        .on("presence", { event: "leave" }, () => {
          updatePresence();
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            void channel?.track({ online_at: new Date().toISOString(), typing: false });
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            setError("মেসেজ সেবা সংযোগ করা যায়নি");
          }
        });
      channelRef.current = channel;
    } catch (caught) {
      console.error("[direct-messages] conversation subscription failed", caught);
      setError("মেসেজ সেবা সংযোগ করা যায়নি");
    }
    return () => {
      channelRef.current = null;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [markRead, peerId, refresh, user]);

  const setTyping = useCallback((typing: boolean) => {
    if (!channelRef.current) return;
    void channelRef.current.track({ online_at: new Date().toISOString(), typing });
  }, []);

  const sendMessage = useCallback(
    async (body: string) => {
      const trimmed = body.trim();
      if (!user || !peerId || !trimmed || sending) return null;
      setSending(true);
      const { data, error } = await supabase.rpc("send_direct_message", {
        target_user_id: peerId,
        message_body: trimmed,
      });
      setSending(false);
      if (error) throw new Error(error.message);
      const message = data as DirectMessage;
      setMessages((previous) =>
        previous.some((item) => item.id === message.id) ? previous : [...previous, message],
      );
      return message;
    },
    [peerId, sending, user],
  );

  return {
    messages,
    loading,
    sending,
    peerOnline,
    peerTyping,
    error,
    refresh,
    markRead,
    setTyping,
    sendMessage,
  };
}
