import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/user-context";

export type AppRole = "farmer" | "expert" | "moderator" | "admin";

type RoleState = {
  role: AppRole;
  roles: AppRole[];
  isFarmer: boolean;
  isExpert: boolean;
  isModerator: boolean;
  isAdmin: boolean;
  isStaff: boolean; // moderator OR admin
  isSuspended: boolean;
  suspensionUntil: string | null;
  suspensionReason: string | null;
  loading: boolean;
};

const RANK: Record<AppRole, number> = { farmer: 0, expert: 1, moderator: 2, admin: 3 };

export function useRole(): RoleState {
  const { user } = useUser();
  const uid = user?.id ?? null;

  const { data, isLoading } = useQuery({
    queryKey: ["role", uid],
    enabled: !!uid,
    staleTime: 60_000,
    queryFn: async () => {
      const [rolesRes, profRes] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", uid!),
        supabase
          .from("profiles")
          .select("is_suspended, suspension_until, suspension_reason")
          .eq("id", uid!)
          .maybeSingle(),
      ]);
      const roles = ((rolesRes.data as { role: AppRole }[] | null) ?? []).map((r) => r.role);
      const prof = profRes.data as {
        is_suspended: boolean;
        suspension_until: string | null;
        suspension_reason: string | null;
      } | null;
      const suspended =
        !!prof?.is_suspended &&
        (!prof.suspension_until || new Date(prof.suspension_until).getTime() > Date.now());
      return {
        roles: roles.length ? roles : (["farmer"] as AppRole[]),
        isSuspended: suspended,
        suspensionUntil: prof?.suspension_until ?? null,
        suspensionReason: prof?.suspension_reason ?? null,
      };
    },
  });

  const roles = data?.roles ?? ["farmer"];
  const top = roles.reduce<AppRole>((acc, r) => (RANK[r] > RANK[acc] ? r : acc), "farmer");

  return {
    role: top,
    roles,
    isFarmer: top === "farmer",
    isExpert: roles.includes("expert"),
    isModerator: roles.includes("moderator"),
    isAdmin: roles.includes("admin"),
    isStaff: roles.includes("moderator") || roles.includes("admin"),
    isSuspended: data?.isSuspended ?? false,
    suspensionUntil: data?.suspensionUntil ?? null,
    suspensionReason: data?.suspensionReason ?? null,
    loading: !!uid && isLoading,
  };
}
