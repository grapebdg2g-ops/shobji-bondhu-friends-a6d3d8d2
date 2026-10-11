import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Search,
  MoreVertical,
  CheckCircle2,
  Ban,
  ShieldAlert,
  UserCog,
  Eye,
  Trash2,
} from "lucide-react";
import { hardDeleteUser } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/user-context";
import type { AppRole } from "@/hooks/use-role";
import { RoleBadge } from "@/components/krishi/role-badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toBn } from "@/lib/bn";
import { format } from "date-fns";

export const Route = createFileRoute("/admin/users")({
  component: UsersPage,
});

type AdminProfile = {
  id: string;
  name: string;
  phone: string | null;
  district: string | null;
  upazila: string | null;
  is_verified: boolean;
  is_suspended: boolean;
  suspension_until: string | null;
  expert_specialty: string | null;
  expert_institution: string | null;
  posts_count: number;
  last_active: string | null;
  created_at: string;
};

const ROLES: AppRole[] = ["farmer", "expert", "moderator", "admin"];
const RANK: Record<AppRole, number> = { farmer: 0, expert: 1, moderator: 2, admin: 3 };
const ROLE_BN: Record<AppRole, string> = {
  farmer: "কৃষক",
  expert: "বিশেষজ্ঞ",
  moderator: "মডারেটর",
  admin: "প্রশাসক",
};

async function logAction(
  adminId: string,
  action_type: string,
  target_id: string | null,
  details: Record<string, unknown>,
) {
  await supabase.from("admin_actions").insert({
    admin_id: adminId,
    action_type,
    target_id,
    details: details as never,
  });
}

function UsersPage() {
  const { user } = useUser();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | AppRole>("all");
  const [districtFilter, setDistrictFilter] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState<"all" | "yes" | "no">("all");
  const [suspendedFilter, setSuspendedFilter] = useState<"all" | "yes" | "no">("all");
  const [sortBy, setSortBy] = useState<"new" | "active" | "posts">("new");

  const [detailId, setDetailId] = useState<string | null>(null);
  const [verifyFor, setVerifyFor] = useState<AdminProfile | null>(null);
  const [suspendFor, setSuspendFor] = useState<AdminProfile | null>(null);
  const [warnFor, setWarnFor] = useState<AdminProfile | null>(null);
  const [deleteFor, setDeleteFor] = useState<AdminProfile | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const hardDeleteFn = useServerFn(hardDeleteUser);

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["admin", "users", "profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, name, district, upazila, is_verified, is_suspended, suspension_until, expert_specialty, expert_institution, posts_count, last_active, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      const rows = (data as Omit<AdminProfile, "phone">[]) ?? [];
      const ids = rows.map((r) => r.id);
      const phoneMap = new Map<string, string | null>();
      if (ids.length) {
        const { data: phones } = await supabase.rpc(
          "admin_get_phones" as never,
          { _ids: ids } as never,
        );
        for (const r of (phones as { id: string; phone: string | null }[] | null) ?? []) {
          phoneMap.set(r.id, r.phone);
        }
      }
      return rows.map((r) => ({ ...r, phone: phoneMap.get(r.id) ?? null })) as AdminProfile[];
    },
  });

  const { data: allRoles = [] } = useQuery({
    queryKey: ["admin", "users", "roles"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("user_id, role");
      return (data as { user_id: string; role: AppRole }[] | null) ?? [];
    },
  });

  const rolesByUser = useMemo(() => {
    const m = new Map<string, AppRole[]>();
    for (const r of allRoles) {
      const arr = m.get(r.user_id) ?? [];
      arr.push(r.role);
      m.set(r.user_id, arr);
    }
    return m;
  }, [allRoles]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = profiles.filter((p) => {
      if (q && !(p.name?.toLowerCase().includes(q) || p.phone?.toLowerCase().includes(q)))
        return false;
      if (districtFilter && p.district !== districtFilter) return false;
      if (verifiedFilter === "yes" && !p.is_verified) return false;
      if (verifiedFilter === "no" && p.is_verified) return false;
      if (suspendedFilter === "yes" && !p.is_suspended) return false;
      if (suspendedFilter === "no" && p.is_suspended) return false;
      if (roleFilter !== "all") {
        const r = rolesByUser.get(p.id) ?? ["farmer"];
        const top = r.reduce<AppRole>((a, x) => (RANK[x] > RANK[a] ? x : a), "farmer");
        if (top !== roleFilter) return false;
      }
      return true;
    });
    if (sortBy === "active") {
      list = [...list].sort(
        (a, b) => new Date(b.last_active ?? 0).getTime() - new Date(a.last_active ?? 0).getTime(),
      );
    } else if (sortBy === "posts") {
      list = [...list].sort((a, b) => (b.posts_count ?? 0) - (a.posts_count ?? 0));
    }
    return list;
  }, [
    profiles,
    search,
    districtFilter,
    verifiedFilter,
    suspendedFilter,
    roleFilter,
    sortBy,
    rolesByUser,
  ]);

  const districts = useMemo(() => {
    const s = new Set<string>();
    profiles.forEach((p) => p.district && s.add(p.district));
    return Array.from(s).sort();
  }, [profiles]);

  const setRole = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: AppRole }) => {
      const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", userId);
      if (delErr) throw delErr;
      const { error: insErr } = await supabase.from("user_roles").insert({
        user_id: userId,
        role: newRole,
        granted_by: user?.id ?? null,
      });
      if (insErr) throw insErr;
      if (user?.id) await logAction(user.id, "role_change", userId, { role: newRole });
    },
    onSuccess: () => {
      toast.success("ভূমিকা আপডেট হয়েছে");
      qc.invalidateQueries({ queryKey: ["admin", "users", "roles"] });
      qc.invalidateQueries({ queryKey: ["role"] });
    },
    onError: () => toast.error("ভূমিকা পরিবর্তন ব্যর্থ"),
  });

  const verifyExpert = useMutation({
    mutationFn: async ({
      userId,
      specialty,
      institution,
      note,
    }: {
      userId: string;
      specialty: string;
      institution: string;
      note: string;
    }) => {
      const { error } = await supabase
        .from("profiles")
        .update({
          is_verified: true,
          verified_at: new Date().toISOString(),
          verified_by: user?.id ?? null,
          expert_specialty: specialty || null,
          expert_institution: institution || null,
        })
        .eq("id", userId);
      if (error) throw error;
      // ensure has expert role
      await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: "expert", granted_by: user?.id ?? null })
        .select();
      await supabase.from("notifications").insert({
        user_id: userId,
        type: "verify",
        title: "✅ বিশেষজ্ঞ যাচাই হয়েছে",
        body: `আপনি ${specialty || "কৃষি"} বিশেষজ্ঞ হিসেবে যাচাই হয়েছেন${institution ? " (" + institution + ")" : ""}`,
      });
      if (user?.id) await logAction(user.id, "verify", userId, { specialty, institution, note });
    },
    onSuccess: () => {
      toast.success("বিশেষজ্ঞ যাচাই হয়েছে");
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      setVerifyFor(null);
    },
    onError: () => toast.error("যাচাই ব্যর্থ"),
  });

  const suspendUser = useMutation({
    mutationFn: async ({
      userId,
      reason,
      days,
    }: {
      userId: string;
      reason: string;
      days: number;
    }) => {
      const patch =
        days > 0
          ? {
              is_suspended: true,
              suspension_reason: reason,
              suspension_until: new Date(Date.now() + days * 86400_000).toISOString(),
            }
          : { is_suspended: true, suspension_reason: reason, suspension_until: null };
      const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
      if (error) throw error;
      await supabase.from("notifications").insert({
        user_id: userId,
        type: "warn",
        title: "⚠️ আপনার অ্যাকাউন্ট বরখাস্ত",
        body: reason + (days > 0 ? ` (${days} দিন)` : " (স্থায়ী)"),
      });
      if (user?.id) await logAction(user.id, "suspend", userId, { reason, days });
    },
    onSuccess: () => {
      toast.success("সম্পন্ন");
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      setSuspendFor(null);
    },
    onError: () => toast.error("ব্যর্থ"),
  });

  const unsuspend = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("profiles")
        .update({
          is_suspended: false,
          suspension_reason: null,
          suspension_until: null,
        })
        .eq("id", userId);
      if (error) throw error;
      if (user?.id) await logAction(user.id, "unsuspend", userId, {});
    },
    onSuccess: () => {
      toast.success("স্থগিতাদেশ তোলা হয়েছে");
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });

  const hardDelete = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) =>
      hardDeleteFn({ data: { userId, reason } }),
    onSuccess: () => {
      toast.success("অ্যাকাউন্ট স্থায়ীভাবে মুছে ফেলা হয়েছে");
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      setDeleteFor(null);
      setDeleteReason("");
    },
    onError: (e: Error) => toast.error(e.message || "মুছতে ব্যর্থ"),
  });

  const warnUser = useMutation({
    mutationFn: async ({ userId, message }: { userId: string; message: string }) => {
      await supabase.from("notifications").insert({
        user_id: userId,
        type: "warn",
        title: "⚠️ সতর্কবার্তা",
        body: message,
      });
      if (user?.id) await logAction(user.id, "warn", userId, { message });
    },
    onSuccess: () => {
      toast.success("সতর্কবার্তা পাঠানো হয়েছে");
      setWarnFor(null);
    },
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 grid grid-cols-1 md:grid-cols-6 gap-2">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="নাম বা ফোন..."
            className="pl-9"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as never)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="all">সব রোল</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_BN[r]}
            </option>
          ))}
        </select>
        <select
          value={districtFilter}
          onChange={(e) => setDistrictFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="">সব জেলা</option>
          {districts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select
          value={verifiedFilter}
          onChange={(e) => setVerifiedFilter(e.target.value as never)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="all">যাচাই: সব</option>
          <option value="yes">যাচাইকৃত</option>
          <option value="no">অযাচাই</option>
        </select>
        <select
          value={suspendedFilter}
          onChange={(e) => setSuspendedFilter(e.target.value as never)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="all">স্থিতি: সব</option>
          <option value="yes">স্থগিত</option>
          <option value="no">সক্রিয়</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as never)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm md:col-start-6"
        >
          <option value="new">নতুন</option>
          <option value="active">সক্রিয়</option>
          <option value="posts">পোস্ট সংখ্যা</option>
        </select>
      </div>

      <p className="text-xs text-gray-500">মোট: {toBn(filtered.length)} জন</p>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-600">
            <tr>
              <th className="text-left px-3 py-2.5">ব্যবহারকারী</th>
              <th className="text-left px-3 py-2.5">ফোন</th>
              <th className="text-left px-3 py-2.5">জেলা</th>
              <th className="text-left px-3 py-2.5">রোল</th>
              <th className="text-left px-3 py-2.5">যোগদান</th>
              <th className="text-left px-3 py-2.5">পোস্ট</th>
              <th className="text-right px-3 py-2.5">ক্রিয়া</th>
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={7} className="p-2">
                    <Skeleton className="h-10 w-full" />
                  </td>
                </tr>
              ))}
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-400">
                  কেউ নেই
                </td>
              </tr>
            )}
            {filtered.map((p) => {
              const roles = rolesByUser.get(p.id) ?? ["farmer"];
              const top = roles.reduce<AppRole>((a, r) => (RANK[r] > RANK[a] ? r : a), "farmer");
              return (
                <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-xs">
                        {p.name?.[0] || "ক"}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold truncate max-w-[140px]">{p.name || "—"}</p>
                          <RoleBadge role={top} verified={p.is_verified} />
                          {p.is_suspended && (
                            <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-red-100 text-red-700">
                              স্থগিত
                            </span>
                          )}
                        </div>
                        {p.expert_specialty && (
                          <p className="text-[10px] text-gray-500 truncate">{p.expert_specialty}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-gray-700">{p.phone || "—"}</td>
                  <td className="px-3 py-2.5 text-gray-700">{p.district || "—"}</td>
                  <td className="px-3 py-2.5">{ROLE_BN[top]}</td>
                  <td className="px-3 py-2.5 text-gray-600 text-xs">
                    {format(new Date(p.created_at), "d MMM yyyy")}
                  </td>
                  <td className="px-3 py-2.5">{toBn(p.posts_count ?? 0)}</td>
                  <td className="px-3 py-2.5 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>{p.name || "ব্যবহারকারী"}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => setDetailId(p.id)}>
                          <Eye className="h-4 w-4" /> প্রোফাইল দেখুন
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setVerifyFor(p)}>
                          <CheckCircle2 className="h-4 w-4" /> বিশেষজ্ঞ যাচাই
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-[10px] text-gray-500">
                          রোল পরিবর্তন
                        </DropdownMenuLabel>
                        {ROLES.map((r) => (
                          <DropdownMenuItem
                            key={r}
                            onSelect={() => setRole.mutate({ userId: p.id, newRole: r })}
                          >
                            <UserCog className="h-4 w-4" /> {ROLE_BN[r]}
                            {top === r ? " ✓" : ""}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => setWarnFor(p)}>
                          <ShieldAlert className="h-4 w-4" /> সতর্ক করুন
                        </DropdownMenuItem>
                        {p.is_suspended ? (
                          <DropdownMenuItem onSelect={() => unsuspend.mutate(p.id)}>
                            <CheckCircle2 className="h-4 w-4" /> স্থগিতাদেশ তুলুন
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onSelect={() => setSuspendFor(p)}
                            className="text-red-600"
                          >
                            <Ban className="h-4 w-4" /> বরখাস্ত করুন
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onSelect={() => setDeleteFor(p)}
                          disabled={p.id === user?.id}
                          className="text-red-700"
                        >
                          <Trash2 className="h-4 w-4" /> স্থায়ীভাবে মুছুন
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <UserDetailDialog userId={detailId} onClose={() => setDetailId(null)} />

      <VerifyDialog
        profile={verifyFor}
        onClose={() => setVerifyFor(null)}
        onSubmit={(specialty, institution, note) =>
          verifyFor && verifyExpert.mutate({ userId: verifyFor.id, specialty, institution, note })
        }
      />

      <SuspendDialog
        profile={suspendFor}
        onClose={() => setSuspendFor(null)}
        onSubmit={(reason, days) =>
          suspendFor && suspendUser.mutate({ userId: suspendFor.id, reason, days })
        }
      />

      <WarnDialog
        profile={warnFor}
        onClose={() => setWarnFor(null)}
        onSubmit={(message) => warnFor && warnUser.mutate({ userId: warnFor.id, message })}
      />

      <Dialog
        open={!!deleteFor}
        onOpenChange={(o) => !o && (setDeleteFor(null), setDeleteReason(""))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-700">স্থায়ীভাবে মুছুন</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-gray-700">
              <b>{deleteFor?.name || "ব্যবহারকারী"}</b> এর অ্যাকাউন্ট ও সব ডেটা স্থায়ীভাবে মুছে
              যাবে। এটি ফেরত আনা যাবে না।
            </p>
            <Textarea
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="কারণ (অডিট লগের জন্য)"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteFor(null);
                setDeleteReason("");
              }}
            >
              বাতিল
            </Button>
            <Button
              variant="destructive"
              disabled={hardDelete.isPending || !deleteFor}
              onClick={() =>
                deleteFor && hardDelete.mutate({ userId: deleteFor.id, reason: deleteReason })
              }
            >
              {hardDelete.isPending ? "মুছছি..." : "হ্যাঁ, স্থায়ীভাবে মুছুন"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UserDetailDialog({ userId, onClose }: { userId: string | null; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "user-detail", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [prof, posts, exch, dx, reports, phoneRpc] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id, name, district, upazila, crops, role, created_at, updated_at, avatar_url, bio, posts_count, exchanges_count, prices_count, is_verified, is_suspended, suspension_reason, suspension_until, verified_at, verified_by, expert_specialty, expert_institution, last_active, total_reports",
          )
          .eq("id", userId!)
          .single(),
        supabase
          .from("posts")
          .select("id, content, created_at")
          .eq("user_id", userId!)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("exchanges")
          .select("id, title, created_at")
          .eq("user_id", userId!)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("disease_history")
          .select("id, disease_name, crop_type, created_at")
          .eq("user_id", userId!)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("user_reports")
          .select("id, reason, created_at, status")
          .eq("reported_user_id", userId!)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase.rpc("admin_get_phones" as never, { _ids: [userId!] } as never),
      ]);
      const phone =
        ((phoneRpc.data as { id: string; phone: string | null }[] | null) ?? [])[0]?.phone ?? null;
      const profile = prof.data
        ? ({ ...(prof.data as Record<string, unknown>), phone } as typeof prof.data & {
            phone: string | null;
          })
        : null;
      return {
        profile,
        posts: posts.data ?? [],
        exchanges: exch.data ?? [],
        disease: dx.data ?? [],
        reports: reports.data ?? [],
      };
    },
  });

  return (
    <Dialog open={!!userId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>প্রোফাইল বিবরণ</DialogTitle>
        </DialogHeader>
        {isLoading && <Skeleton className="h-40 w-full" />}
        {data?.profile && (
          <div className="space-y-4 text-sm">
            <section className="grid grid-cols-2 gap-2">
              <Info label="নাম" value={data.profile.name} />
              <Info label="ফোন" value={data.profile.phone} />
              <Info label="জেলা" value={data.profile.district} />
              <Info label="উপজেলা" value={data.profile.upazila} />
              <Info
                label="যোগদান"
                value={format(new Date(data.profile.created_at), "d MMM yyyy")}
              />
              <Info
                label="সর্বশেষ সক্রিয়"
                value={
                  data.profile.last_active
                    ? format(new Date(data.profile.last_active), "d MMM yyyy")
                    : "—"
                }
              />
              <Info label="পোস্ট" value={toBn(data.profile.posts_count)} />
              <Info label="বিনিময়" value={toBn(data.profile.exchanges_count)} />
            </section>

            <Section title={`সাম্প্রতিক পোস্ট (${toBn(data.posts.length)})`}>
              {data.posts.map((p) => (
                <li key={p.id} className="py-1.5 border-t border-gray-100 text-xs">
                  <p className="truncate">{p.content}</p>
                  <p className="text-gray-400">{format(new Date(p.created_at), "d MMM yyyy")}</p>
                </li>
              ))}
            </Section>

            <Section title={`বিনিময় (${toBn(data.exchanges.length)})`}>
              {data.exchanges.map((e) => (
                <li key={e.id} className="py-1.5 border-t border-gray-100 text-xs">
                  <p className="truncate font-medium">{e.title}</p>
                </li>
              ))}
            </Section>

            <Section title={`রোগ শনাক্ত (${toBn(data.disease.length)})`}>
              {data.disease.map((d) => (
                <li key={d.id} className="py-1.5 border-t border-gray-100 text-xs">
                  {d.crop_type} — {d.disease_name}
                </li>
              ))}
            </Section>

            <Section title={`রিপোর্ট প্রাপ্ত (${toBn(data.reports.length)})`}>
              {data.reports.map((r) => (
                <li key={r.id} className="py-1.5 border-t border-gray-100 text-xs">
                  {r.reason} — <span className="text-gray-500">{r.status}</span>
                </li>
              ))}
            </Section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <p className="text-[10px] uppercase text-gray-400 font-semibold">{label}</p>
      <p className="font-medium text-gray-800">{value ?? "—"}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="font-bold text-xs text-gray-700 mb-1">{title}</h4>
      <ul>{children}</ul>
    </div>
  );
}

function VerifyDialog({
  profile,
  onClose,
  onSubmit,
}: {
  profile: AdminProfile | null;
  onClose: () => void;
  onSubmit: (specialty: string, institution: string, note: string) => void;
}) {
  const [specialty, setSpecialty] = useState("");
  const [institution, setInstitution] = useState("");
  const [note, setNote] = useState("");
  return (
    <Dialog open={!!profile} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>বিশেষজ্ঞ যাচাই — {profile?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <select
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">বিশেষত্ব নির্বাচন</option>
            <option>ধান</option>
            <option>সবজি</option>
            <option>ফল</option>
            <option>পশুপালন</option>
            <option>মৎস্য</option>
          </select>
          <Input
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
            placeholder="প্রতিষ্ঠান (BRRI, BAU…)"
          />
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="যাচাই নোট"
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            বাতিল
          </Button>
          <Button onClick={() => onSubmit(specialty, institution, note)} disabled={!specialty}>
            যাচাই করুন
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SuspendDialog({
  profile,
  onClose,
  onSubmit,
}: {
  profile: AdminProfile | null;
  onClose: () => void;
  onSubmit: (reason: string, days: number) => void;
}) {
  const [reason, setReason] = useState("");
  const [days, setDays] = useState<number>(7);
  return (
    <Dialog open={!!profile} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>বরখাস্ত করুন — {profile?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="কারণ"
            rows={2}
          />
          <div className="flex gap-2">
            {[1, 7, 30, 0].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`flex-1 h-9 rounded-md text-xs font-bold border ${days === d ? "bg-red-600 text-white border-red-600" : "bg-white border-input"}`}
              >
                {d === 0 ? "স্থায়ী" : `${toBn(d)} দিন`}
              </button>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            বাতিল
          </Button>
          <Button
            variant="destructive"
            disabled={!reason.trim()}
            onClick={() => onSubmit(reason.trim(), days)}
          >
            নিশ্চিত
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WarnDialog({
  profile,
  onClose,
  onSubmit,
}: {
  profile: AdminProfile | null;
  onClose: () => void;
  onSubmit: (message: string) => void;
}) {
  const [msg, setMsg] = useState("");
  return (
    <Dialog open={!!profile} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>সতর্কবার্তা — {profile?.name}</DialogTitle>
        </DialogHeader>
        <Textarea
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="বার্তা লিখুন"
          rows={3}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            বাতিল
          </Button>
          <Button disabled={!msg.trim()} onClick={() => onSubmit(msg.trim())}>
            পাঠান
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
