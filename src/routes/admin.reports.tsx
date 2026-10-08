import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/user-context";
import { toast } from "sonner";
import { Flag, CheckCircle2, XCircle, Trash2 } from "lucide-react";
import { toBn } from "@/lib/bn";
import { format } from "date-fns";

export const Route = createFileRoute("/admin/reports")({ component: ReportsPage });

type Status = "pending" | "actioned" | "dismissed" | "all";

function ReportsPage() {
  const [status, setStatus] = useState<Status>("pending");
  const [type, setType] = useState<string>("all");
  const qc = useQueryClient();
  const { user } = useUser();

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["admin", "reports", status, type],
    queryFn: async () => {
      let q = supabase
        .from("user_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (status !== "all") q = q.eq("status", status);
      if (type !== "all") q = q.eq("content_type", type);
      const { data } = await q;
      return data ?? [];
    },
  });

  const counts = useQuery({
    queryKey: ["admin", "reports", "counts"],
    queryFn: async () => {
      const { data } = await supabase.from("user_reports").select("status");
      const c = { pending: 0, actioned: 0, dismissed: 0 };
      (data ?? []).forEach((r: any) => {
        if (r.status in c) (c as any)[r.status]++;
      });
      return c;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: string }) => {
      const { error } = await supabase
        .from("user_reports")
        .update({ status: newStatus, reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      if (user) {
        await supabase.from("admin_actions").insert({
          admin_id: user.id,
          action_type: `report_${newStatus}`,
          target_id: id,
          details: {},
        });
      }
    },
    onSuccess: () => {
      toast.success("আপডেট হয়েছে");
      qc.invalidateQueries({ queryKey: ["admin", "reports"] });
    },
    onError: () => toast.error("ব্যর্থ"),
  });

  const deleteContent = useMutation({
    mutationFn: async (r: any) => {
      if (r.content_id && r.content_type) {
        const tableMap: Record<string, string> = {
          post: "posts", exchange: "exchanges", price: "prices", comment: "post_comments", group_chat: "group_chats",
        };
        const tbl = tableMap[r.content_type];
        if (tbl) await supabase.from(tbl as any).delete().eq("id", r.content_id);
      }
      await supabase
        .from("user_reports")
        .update({ status: "actioned", reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
        .eq("id", r.id);
      if (user) {
        await supabase.from("admin_actions").insert({
          admin_id: user.id,
          action_type: "delete_content",
          target_id: r.content_id,
          details: { content_type: r.content_type, report_id: r.id },
        });
      }
    },
    onSuccess: () => {
      toast.success("কন্টেন্ট মুছে ফেলা হয়েছে");
      qc.invalidateQueries({ queryKey: ["admin", "reports"] });
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Flag className="h-5 w-5 text-purple-600" /> রিপোর্ট ব্যবস্থাপনা
        </h1>
        <p className="text-xs text-gray-500">ব্যবহারকারীদের পাঠানো রিপোর্ট পর্যালোচনা করুন</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { k: "pending", label: "অপেক্ষমাণ", v: counts.data?.pending ?? 0, c: "text-amber-600" },
          { k: "actioned", label: "সমাধান", v: counts.data?.actioned ?? 0, c: "text-emerald-600" },
          { k: "dismissed", label: "খারিজ", v: counts.data?.dismissed ?? 0, c: "text-gray-500" },
        ].map((s) => (
          <button
            key={s.k}
            onClick={() => setStatus(s.k as Status)}
            className={`bg-white rounded-xl border p-3 text-left ${status === s.k ? "border-purple-400 ring-2 ring-purple-100" : "border-gray-200"}`}
          >
            <p className="text-[11px] text-gray-500 font-semibold">{s.label}</p>
            <p className={`text-2xl font-bold ${s.c}`}>{toBn(s.v)}</p>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-3 flex gap-2 items-center flex-wrap">
        <span className="text-xs font-semibold text-gray-600">ধরন:</span>
        {["all", "post", "exchange", "price", "comment", "group_chat"].map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`px-3 py-1 rounded-full text-xs font-semibold ${type === t ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-700"}`}
          >
            {t === "all" ? "সব" : t === "post" ? "পোস্ট" : t === "exchange" ? "বিনিময়" : t === "price" ? "দাম" : t === "group_chat" ? "গ্রুপ চ্যাট" : "মন্তব্য"}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {isLoading && <div className="p-3"><Skeleton className="h-24 w-full" /></div>}
        {!isLoading && reports.length === 0 && (
          <p className="text-center text-gray-400 py-10 text-sm">কোনো রিপোর্ট নেই</p>
        )}
        {reports.map((r: any) => (
          <div key={r.id} className="p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                    {r.content_type}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      r.status === "pending"
                        ? "bg-amber-100 text-amber-700"
                        : r.status === "actioned"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {r.status}
                  </span>
                  <p className="text-xs text-gray-500">{format(new Date(r.created_at), "d MMM, HH:mm")}</p>
                </div>
                <p className="mt-1 text-sm font-semibold text-gray-900">কারণ: {r.reason}</p>
                {r.description && <p className="text-xs text-gray-600 mt-0.5">{r.description}</p>}
                <p className="text-[11px] text-gray-400 mt-1">Content ID: {r.content_id || "—"}</p>
                {r.content_type === "group_chat" && r.content_id && (
                  <Link to="/groups/$groupId" params={{ groupId: r.content_id }} className="mt-1 inline-block text-xs font-bold text-purple-700 underline">
                    গ্রুপ চ্যাট ও সব মেসেজ দেখুন →
                  </Link>
                )}
              </div>
              {r.status === "pending" && (
                <div className="flex flex-col gap-1 shrink-0">
                  <Button size="sm" variant="destructive" onClick={() => deleteContent.mutate(r)}>
                    <Trash2 className="h-3.5 w-3.5" /> মুছুন
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStatus.mutate({ id: r.id, newStatus: "dismissed" })}
                  >
                    <XCircle className="h-3.5 w-3.5" /> খারিজ
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStatus.mutate({ id: r.id, newStatus: "actioned" })}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> সমাধান
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
