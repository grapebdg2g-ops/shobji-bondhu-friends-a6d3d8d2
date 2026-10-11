import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/user-context";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toBn } from "@/lib/bn";
import { format } from "date-fns";

export const Route = createFileRoute("/admin/notify")({ component: NotifyPage });

type Target = "all" | "district" | "upazila" | "crop";

function NotifyPage() {
  const { user } = useUser();
  const qc = useQueryClient();
  const [target, setTarget] = useState<Target>("all");
  const [value, setValue] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("/feed");
  const [icon, setIcon] = useState("🌿");
  const [confirming, setConfirming] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<"now" | "later">("now");
  const [scheduledAt, setScheduledAt] = useState("");

  const { data: reach = 0 } = useQuery({
    queryKey: ["admin", "notify", "reach", target, value],
    queryFn: async () => {
      let q = supabase.from("profiles").select("id", { count: "exact", head: true });
      if (target === "district" && value) q = q.eq("district", value);
      if (target === "upazila" && value) q = q.eq("upazila", value);
      if (target === "crop" && value) q = q.contains("crops", [value]);
      const { count } = await q;
      return count ?? 0;
    },
  });

  const { data: history = [] } = useQuery({
    queryKey: ["admin", "notify", "history"],
    queryFn: async () => {
      const { data } = await supabase
        .from("notification_broadcasts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const send = useMutation({
    mutationFn: async () => {
      if (scheduleMode === "later") {
        if (!scheduledAt) throw new Error("সময় দিন");
        const when = new Date(scheduledAt);
        if (isNaN(when.getTime()) || when.getTime() < Date.now())
          throw new Error("ভবিষ্যৎ সময় দিন");
        await supabase.from("notification_broadcasts").insert({
          admin_id: user!.id,
          title,
          body,
          link,
          icon,
          target_type: target,
          target_value: value || null,
          scheduled_at: when.toISOString(),
          sent_count: 0,
        });
        await supabase.from("admin_actions").insert({
          admin_id: user!.id,
          action_type: "broadcast_scheduled",
          details: { title, target, value, scheduled_at: when.toISOString() } as never,
        });
        return -1;
      }
      // resolve target users
      let q = supabase.from("profiles").select("id");
      if (target === "district" && value) q = q.eq("district", value);
      if (target === "upazila" && value) q = q.eq("upazila", value);
      if (target === "crop" && value) q = q.contains("crops", [value]);
      const { data: users, error: e1 } = await q;
      if (e1) throw e1;
      const ids = (users ?? []).map((u) => u.id);

      const rows = ids.map((id) => ({
        user_id: id,
        type: "broadcast",
        title,
        body,
        ref_type: "broadcast",
      }));
      for (let i = 0; i < rows.length; i += 500) {
        const slice = rows.slice(i, i + 500);
        if (slice.length) await supabase.from("notifications").insert(slice);
      }

      await supabase.from("notification_broadcasts").insert({
        admin_id: user!.id,
        title,
        body,
        link,
        icon,
        target_type: target,
        target_value: value || null,
        sent_count: ids.length,
        sent_at: new Date().toISOString(),
      });
      await supabase.from("admin_actions").insert({
        admin_id: user!.id,
        action_type: "broadcast",
        details: { title, target, value, count: ids.length } as never,
      });
      return ids.length;
    },
    onSuccess: (count) => {
      if (count < 0) toast.success("নির্ধারিত সময়ে পাঠানো হবে");
      else toast.success(`${toBn(count)} জনকে পাঠানো হয়েছে`);
      setTitle("");
      setBody("");
      setConfirming(false);
      setScheduledAt("");
      qc.invalidateQueries({ queryKey: ["admin", "notify", "history"] });
    },
    onError: (e: Error) => {
      toast.error(e.message || "পাঠাতে ব্যর্থ");
      setConfirming(false);
    },
  });

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <p className="text-sm font-bold">টার্গেট</p>
        <div className="flex flex-wrap gap-2">
          {(["all", "district", "upazila", "crop"] as Target[]).map((t) => (
            <button
              key={t}
              onClick={() => setTarget(t)}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold border ${target === t ? "bg-purple-600 text-white border-purple-600" : "bg-white border-input"}`}
            >
              {t === "all"
                ? "সকল কৃষক"
                : t === "district"
                  ? "জেলা"
                  : t === "upazila"
                    ? "উপজেলা"
                    : "ফসল"}
            </button>
          ))}
        </div>
        {target !== "all" && (
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={target === "crop" ? "ফসলের নাম (ধান, আলু…)" : "নাম লিখুন"}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <p className="text-sm font-bold mb-1">
              শিরোনাম <span className="text-gray-400 text-xs">({toBn(title.length)}/৫০)</span>
            </p>
            <Input value={title} maxLength={50} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <p className="text-sm font-bold mb-1">আইকন</p>
            <div className="flex gap-1.5">
              {["🌿", "📢", "⚠️", "💰", "🐛", "☀️", "🌧️"].map((e) => (
                <button
                  key={e}
                  onClick={() => setIcon(e)}
                  className={`h-9 w-9 text-lg rounded-md border ${icon === e ? "bg-purple-100 border-purple-400" : "bg-white border-input"}`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div>
          <p className="text-sm font-bold mb-1">
            বার্তা <span className="text-gray-400 text-xs">({toBn(body.length)}/১৫০)</span>
          </p>
          <Textarea
            value={body}
            maxLength={150}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
          />
        </div>
        <div>
          <p className="text-sm font-bold mb-1">লিংক</p>
          <select
            value={link}
            onChange={(e) => setLink(e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="/feed">/feed</option>
            <option value="/prices">/prices</option>
            <option value="/exchange">/exchange</option>
            <option value="/disease-detection">/disease-detection</option>
            <option value="/weather">/weather</option>
          </select>
        </div>

        <div className="border border-gray-200 rounded-xl p-3 bg-gray-50">
          <p className="text-[10px] font-bold uppercase text-gray-500 mb-1">প্রিভিউ</p>
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <p className="text-xs text-gray-500">{icon} KrishokBondhu</p>
            <p className="text-sm font-bold">{title || "শিরোনাম এখানে"}</p>
            <p className="text-xs text-gray-700">{body || "বার্তা এখানে দেখাবে…"}</p>
          </div>
          <p className="text-xs mt-2 text-gray-600">
            আনুমানিক প্রাপক: <b>~{toBn(reach)} জন</b>
          </p>
        </div>

        <div className="flex flex-col gap-2 border-t border-gray-100 pt-3">
          <div className="flex gap-2">
            {(["now", "later"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setScheduleMode(m)}
                className={`px-3 py-1.5 rounded-md text-sm font-semibold border ${scheduleMode === m ? "bg-purple-600 text-white border-purple-600" : "bg-white border-input"}`}
              >
                {m === "now" ? "এখনই পাঠান" : "পরে নির্ধারণ করুন"}
              </button>
            ))}
          </div>
          {scheduleMode === "later" && (
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
            />
          )}
        </div>

        <Button
          disabled={!title || !body || send.isPending || (scheduleMode === "later" && !scheduledAt)}
          onClick={() => setConfirming(true)}
        >
          <Send className="h-4 w-4" /> {scheduleMode === "later" ? "নির্ধারণ করুন" : "পাঠান"}
        </Button>

        {confirming && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-5 max-w-sm w-full">
              <p className="font-bold mb-2">নিশ্চিত করুন</p>
              <p className="text-sm text-gray-700">
                ~{toBn(reach)} জন কৃষককে notification পাঠাবেন?
              </p>
              <div className="flex gap-2 mt-4 justify-end">
                <Button variant="outline" onClick={() => setConfirming(false)}>
                  বাতিল
                </Button>
                <Button onClick={() => send.mutate()} disabled={send.isPending}>
                  হ্যাঁ, পাঠান
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-600">
            <tr>
              <th className="text-left px-3 py-2">তারিখ</th>
              <th className="text-left px-3 py-2">শিরোনাম</th>
              <th className="text-right px-3 py-2">পাঠানো</th>
              <th className="text-right px-3 py-2">খোলা</th>
              <th className="text-right px-3 py-2">CTR</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.id} className="border-t border-gray-100">
                <td className="px-3 py-2 text-xs">
                  {format(new Date(h.created_at), "d MMM HH:mm")}
                </td>
                <td className="px-3 py-2">{h.title}</td>
                <td className="px-3 py-2 text-right">{toBn(h.sent_count)}</td>
                <td className="px-3 py-2 text-right">{toBn(h.opened_count)}</td>
                <td className="px-3 py-2 text-right">
                  {h.sent_count > 0
                    ? toBn(Math.round((h.opened_count / h.sent_count) * 100)) + "%"
                    : "—"}
                </td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-6 text-gray-400">
                  এখনো কোনো broadcast নেই
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
