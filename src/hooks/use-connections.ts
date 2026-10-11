import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/user-context";

export type ConnectionState = "accepted" | "outgoing_pending" | "incoming_pending" | null;

export type ConnectionRow = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "declined" | "cancelled";
  created_at: string;
  updated_at: string;
};

export function useConnectionState(targetUserId: string | null) {
  const { user } = useUser();
  const [state, setState] = useState<ConnectionState>(null);
  const [connection, setConnection] = useState<ConnectionRow | null>(null);
  const [loading, setLoading] = useState(Boolean(targetUserId && user));
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!targetUserId || !user || targetUserId === user.id) {
      setState(null);
      setConnection(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("connections")
      .select("*")
      .or(
        `and(requester_id.eq.${user.id},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${user.id})`,
      )
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!error && data) {
      const row = data as ConnectionRow;
      setConnection(row);
      setState(
        row.status === "accepted"
          ? "accepted"
          : row.status === "pending"
            ? row.requester_id === user.id
              ? "outgoing_pending"
              : "incoming_pending"
            : null,
      );
    } else if (!error) {
      setConnection(null);
      setState(null);
    }
    setLoading(false);
  }, [targetUserId, user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const request = useCallback(async () => {
    if (!targetUserId || !user || busy) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("request_connection", {
      target_user_id: targetUserId,
    });
    if (error) {
      toast.error("সংযোগ অনুরোধ পাঠানো যায়নি");
    } else {
      setConnection((data as ConnectionRow) ?? null);
      setState((data as ConnectionRow)?.status === "accepted" ? "accepted" : "outgoing_pending");
      toast.success(
        (data as ConnectionRow)?.status === "accepted"
          ? "এখন আপনারা সংযুক্ত"
          : "সংযোগ অনুরোধ পাঠানো হয়েছে",
      );
    }
    setBusy(false);
  }, [targetUserId, user, busy]);

  const respond = useCallback(
    async (nextStatus: "accepted" | "declined") => {
      if (!connection?.id || busy) return;
      setBusy(true);
      const { error } = await supabase.rpc("respond_connection", {
        connection_id: connection.id,
        next_status: nextStatus,
      });
      if (error) {
        toast.error("সংযোগ অনুরোধ আপডেট করা যায়নি");
      } else {
        setState(nextStatus === "accepted" ? "accepted" : null);
        setConnection((row) => (row ? { ...row, status: nextStatus } : row));
        toast.success(
          nextStatus === "accepted" ? "সংযোগ গ্রহণ করা হয়েছে" : "অনুরোধ প্রত্যাখ্যান করা হয়েছে",
        );
      }
      setBusy(false);
    },
    [connection, busy],
  );

  const cancel = useCallback(async () => {
    if (!connection?.id || busy) return;
    setBusy(true);
    const { error } = await supabase.rpc("cancel_connection", { connection_id: connection.id });
    if (error) {
      toast.error("অনুরোধ বাতিল করা যায়নি");
    } else {
      setState(null);
      setConnection((row) => (row ? { ...row, status: "cancelled" } : row));
      toast.success("সংযোগ অনুরোধ বাতিল হয়েছে");
    }
    setBusy(false);
  }, [connection, busy]);

  return { state, connection, loading, busy, request, respond, cancel, refresh };
}
