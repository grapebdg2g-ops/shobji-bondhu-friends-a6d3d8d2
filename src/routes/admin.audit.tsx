import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollText, Search } from "lucide-react";
import { toBn } from "@/lib/bn";
import { format } from "date-fns";

export const Route = createFileRoute("/admin/audit")({ component: AuditPage });

function AuditPage() {
  const [q, setQ] = useState("");
  const [actionType, setActionType] = useState("all");

  const { data: actions = [], isLoading } = useQuery({
    queryKey: ["admin", "audit", actionType],
    queryFn: async () => {
      let query = supabase
        .from("admin_actions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);
      if (actionType !== "all") query = query.eq("action_type", actionType);
      const { data } = await query;
      return data ?? [];
    },
  });

  const adminIds = useMemo(
    () => Array.from(new Set(actions.map((a) => a.admin_id).filter(Boolean))),
    [actions],
  );

  const { data: admins = [] } = useQuery({
    queryKey: ["admin", "audit", "admins", adminIds.join(",")],
    enabled: adminIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, name").in("id", adminIds);
      return data ?? [];
    },
  });

  const nameOf = (id: string) => admins.find((a) => a.id === id)?.name || id.slice(0, 8);

  const types = useMemo(() => Array.from(new Set(actions.map((a) => a.action_type))), [actions]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return actions;
    return actions.filter(
      (a) =>
        a.action_type?.toLowerCase().includes(t) ||
        JSON.stringify(a.details).toLowerCase().includes(t) ||
        nameOf(a.admin_id).toLowerCase().includes(t),
    );
  }, [actions, q, admins]);

  const actionColor = (t: string) => {
    if (t.includes("delete") || t.includes("suspend")) return "bg-red-100 text-red-700";
    if (t.includes("warn")) return "bg-amber-100 text-amber-700";
    if (t.includes("verify") || t.includes("actioned")) return "bg-emerald-100 text-emerald-700";
    if (t.includes("role")) return "bg-blue-100 text-blue-700";
    return "bg-purple-100 text-purple-700";
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <ScrollText className="h-5 w-5 text-purple-600" /> এডমিন অ্যাকশন লগ
        </h1>
        <p className="text-xs text-gray-500">মোট {toBn(actions.length)}টি অ্যাকশন</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="অ্যাকশন, এডমিন বা বিবরণ"
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg"
          />
        </div>
        <select
          value={actionType}
          onChange={(e) => setActionType(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-2 py-2"
        >
          <option value="all">সব অ্যাকশন</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {isLoading && (
          <div className="p-3">
            <Skeleton className="h-20 w-full" />
          </div>
        )}
        {!isLoading && filtered.length === 0 && (
          <p className="text-center text-gray-400 py-10 text-sm">কোনো লগ নেই</p>
        )}
        {filtered.map((a) => (
          <div key={a.id} className="p-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${actionColor(a.action_type)}`}
              >
                {a.action_type}
              </span>
              <p className="text-xs text-gray-500">
                {nameOf(a.admin_id)} • {format(new Date(a.created_at), "d MMM, HH:mm")}
              </p>
            </div>
            {a.target_id && <p className="text-[11px] text-gray-400 mt-1">Target: {a.target_id}</p>}
            {a.details && Object.keys(a.details as object).length > 0 && (
              <pre className="mt-1 text-[11px] bg-gray-50 rounded p-2 text-gray-600 overflow-x-auto">
                {JSON.stringify(a.details, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
