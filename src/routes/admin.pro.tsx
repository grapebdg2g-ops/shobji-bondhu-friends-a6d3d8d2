import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/user-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toBn } from "@/lib/bn";
import { format } from "date-fns";
import { Plus, Crown, BadgeDollarSign } from "lucide-react";

export const Route = createFileRoute("/admin/pro")({ component: ProPage });

type Sub = {
  id: string;
  user_id: string;
  plan: string;
  status: string;
  started_at: string;
  expires_at: string | null;
  amount: number;
  currency: string;
  payment_ref: string | null;
};
type Tx = {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  type: string;
  status: string;
  reference: string | null;
  created_at: string;
};

function ProPage() {
  const { user } = useUser();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [plan, setPlan] = useState("pro");
  const [amount, setAmount] = useState("0");
  const [days, setDays] = useState("30");
  const [ref, setRef] = useState("");

  const { data: subs = [] } = useQuery({
    queryKey: ["admin", "pro", "subs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("pro_subscriptions")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(500);
      return (data ?? []) as Sub[];
    },
  });

  const { data: txs = [] } = useQuery({
    queryKey: ["admin", "pro", "txs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("revenue_transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      return (data ?? []) as Tx[];
    },
  });

  const stats = useMemo(() => {
    const activeSubs = subs.filter(
      (s) =>
        s.status === "active" && (!s.expires_at || new Date(s.expires_at).getTime() > Date.now()),
    ).length;
    const totalRev = txs
      .filter((t) => t.status === "succeeded" && t.type !== "refund")
      .reduce((a, t) => a + Number(t.amount), 0);
    const mtd = txs
      .filter((t) => {
        const d = new Date(t.created_at);
        const now = new Date();
        return (
          t.status === "succeeded" &&
          t.type !== "refund" &&
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      })
      .reduce((a, t) => a + Number(t.amount), 0);
    return { activeSubs, totalRev, mtd };
  }, [subs, txs]);

  const add = useMutation({
    mutationFn: async () => {
      const { data: foundId, error: pe } = await supabase.rpc(
        "admin_find_user_by_phone" as never,
        { _phone: phone.trim() } as never,
      );
      if (pe) throw pe;
      const prof = foundId ? { id: foundId as unknown as string } : null;
      if (!prof) throw new Error("ব্যবহারকারী পাওয়া যায়নি");
      const amt = Number(amount) || 0;
      const expires =
        Number(days) > 0 ? new Date(Date.now() + Number(days) * 86400_000).toISOString() : null;
      const { data: sub, error: se } = await supabase
        .from("pro_subscriptions")
        .upsert(
          {
            user_id: prof.id,
            plan,
            status: "active",
            started_at: new Date().toISOString(),
            expires_at: expires,
            amount: amt,
            currency: "BDT",
            payment_ref: ref || null,
          },
          { onConflict: "user_id" },
        )
        .select()
        .single();
      if (se) throw se;
      if (amt > 0) {
        await supabase.from("revenue_transactions").insert({
          user_id: prof.id,
          subscription_id: sub.id,
          amount: amt,
          currency: "BDT",
          type: "subscription",
          status: "succeeded",
          reference: ref || null,
        });
      }
      await supabase.from("admin_actions").insert({
        admin_id: user!.id,
        action_type: "pro_grant",
        target_id: prof.id,
        details: { plan, amount: amt, days: Number(days) || null, ref } as never,
      });
    },
    onSuccess: () => {
      toast.success("Pro সাবস্ক্রিপশন যোগ হয়েছে");
      setOpen(false);
      setPhone("");
      setAmount("0");
      setRef("");
      qc.invalidateQueries({ queryKey: ["admin", "pro"] });
    },
    onError: (e: Error) => toast.error(e.message || "ব্যর্থ"),
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("pro_subscriptions").update({ status: "canceled" }).eq("id", id);
      if (user?.id) {
        await supabase.from("admin_actions").insert({
          admin_id: user.id,
          action_type: "pro_cancel",
          target_id: id,
          details: {} as never,
        });
      }
    },
    onSuccess: () => {
      toast.success("বাতিল করা হয়েছে");
      qc.invalidateQueries({ queryKey: ["admin", "pro", "subs"] });
    },
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Stat
          icon={<Crown className="h-5 w-5" />}
          label="সক্রিয় Pro"
          value={toBn(stats.activeSubs)}
          color="amber"
        />
        <Stat
          icon={<BadgeDollarSign className="h-5 w-5" />}
          label="মোট আয়"
          value={`৳${toBn(Math.round(stats.totalRev))}`}
          color="emerald"
        />
        <Stat
          icon={<BadgeDollarSign className="h-5 w-5" />}
          label="এই মাসে"
          value={`৳${toBn(Math.round(stats.mtd))}`}
          color="purple"
        />
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Pro যোগ করুন
        </Button>
      </div>

      <Section title="সাবস্ক্রিপশন">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-600">
            <tr>
              <th className="text-left px-3 py-2">User ID</th>
              <th className="text-left px-3 py-2">প্ল্যান</th>
              <th className="text-left px-3 py-2">স্থিতি</th>
              <th className="text-right px-3 py-2">টাকা</th>
              <th className="text-left px-3 py-2">মেয়াদ শেষ</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {subs.map((s) => (
              <tr key={s.id} className="border-t border-gray-100">
                <td className="px-3 py-2 text-xs font-mono">{s.user_id.slice(0, 8)}…</td>
                <td className="px-3 py-2">{s.plan}</td>
                <td className="px-3 py-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${s.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}
                  >
                    {s.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">৳{toBn(Number(s.amount))}</td>
                <td className="px-3 py-2 text-xs">
                  {s.expires_at ? format(new Date(s.expires_at), "d MMM yyyy") : "—"}
                </td>
                <td className="px-3 py-2 text-right">
                  {s.status === "active" && (
                    <Button size="sm" variant="outline" onClick={() => cancel.mutate(s.id)}>
                      বাতিল
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {subs.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-6 text-gray-400">
                  কোনো Pro নেই
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Section>

      <Section title="লেনদেন">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-600">
            <tr>
              <th className="text-left px-3 py-2">তারিখ</th>
              <th className="text-left px-3 py-2">User</th>
              <th className="text-left px-3 py-2">টাইপ</th>
              <th className="text-right px-3 py-2">টাকা</th>
              <th className="text-left px-3 py-2">স্থিতি</th>
              <th className="text-left px-3 py-2">রেফ</th>
            </tr>
          </thead>
          <tbody>
            {txs.map((t) => (
              <tr key={t.id} className="border-t border-gray-100">
                <td className="px-3 py-2 text-xs">
                  {format(new Date(t.created_at), "d MMM HH:mm")}
                </td>
                <td className="px-3 py-2 text-xs font-mono">{t.user_id.slice(0, 8)}…</td>
                <td className="px-3 py-2 text-xs">{t.type}</td>
                <td className="px-3 py-2 text-right">৳{toBn(Number(t.amount))}</td>
                <td className="px-3 py-2 text-xs">{t.status}</td>
                <td className="px-3 py-2 text-xs">{t.reference || "—"}</td>
              </tr>
            ))}
            {txs.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-6 text-gray-400">
                  কোনো লেনদেন নেই
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pro সাবস্ক্রিপশন যোগ করুন</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-semibold mb-1">ফোন</p>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01..." />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="font-semibold mb-1">প্ল্যান</p>
                <select
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="pro">Pro</option>
                  <option value="pro_annual">Pro Annual</option>
                </select>
              </div>
              <div>
                <p className="font-semibold mb-1">মেয়াদ (দিন)</p>
                <Input value={days} onChange={(e) => setDays(e.target.value)} type="number" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="font-semibold mb-1">টাকা</p>
                <Input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" />
              </div>
              <div>
                <p className="font-semibold mb-1">পেমেন্ট রেফ</p>
                <Input
                  value={ref}
                  onChange={(e) => setRef(e.target.value)}
                  placeholder="bKash TrxID..."
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              বাতিল
            </Button>
            <Button disabled={!phone || add.isPending} onClick={() => add.mutate()}>
              যোগ করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  const colors: Record<string, string> = {
    amber: "bg-amber-50 text-amber-700",
    emerald: "bg-emerald-50 text-emerald-700",
    purple: "bg-purple-50 text-purple-700",
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
      <p className="text-sm font-bold px-3 py-2 border-b border-gray-100">{title}</p>
      {children}
    </div>
  );
}
