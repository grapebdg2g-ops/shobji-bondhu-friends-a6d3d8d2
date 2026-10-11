import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "./use-role";

export type UserMeta = {
  topRole: AppRole;
  roles: AppRole[];
  isVerified: boolean;
  expertSpecialty: string | null;
  expertInstitution: string | null;
};

const RANK: Record<AppRole, number> = { farmer: 0, expert: 1, moderator: 2, admin: 3 };

/**
 * Batch-fetch role/verification info for a set of user IDs.
 * Returns a map keyed by user_id.
 */
export function useUsersMeta(userIds: string[]) {
  const key = [...new Set(userIds)].sort().join(",");
  return useQuery({
    queryKey: ["users-meta", key],
    enabled: userIds.length > 0,
    staleTime: 60_000,
    queryFn: async (): Promise<Record<string, UserMeta>> => {
      const ids = Array.from(new Set(userIds));
      const [rolesRes, profRes] = await Promise.all([
        supabase.rpc("get_public_user_roles" as never, { _ids: ids } as never),
        supabase
          .from("profiles")
          .select("id, is_verified, expert_specialty, expert_institution")
          .in("id", ids),
      ]);
      const rolesByUser = new Map<string, AppRole[]>();
      for (const r of (rolesRes.data as { user_id: string; role: AppRole }[] | null) ?? []) {
        const list = rolesByUser.get(r.user_id) ?? [];
        list.push(r.role);
        rolesByUser.set(r.user_id, list);
      }
      const profById = new Map<
        string,
        { is_verified: boolean; expert_specialty: string | null; expert_institution: string | null }
      >();
      for (const p of (profRes.data as
        | {
            id: string;
            is_verified: boolean;
            expert_specialty: string | null;
            expert_institution: string | null;
          }[]
        | null) ?? []) {
        profById.set(p.id, p);
      }
      const out: Record<string, UserMeta> = {};
      for (const id of ids) {
        const roles = rolesByUser.get(id) ?? ["farmer"];
        const top = roles.reduce<AppRole>((a, r) => (RANK[r] > RANK[a] ? r : a), "farmer");
        const p = profById.get(id);
        out[id] = {
          topRole: top,
          roles,
          isVerified: !!p?.is_verified,
          expertSpecialty: p?.expert_specialty ?? null,
          expertInstitution: p?.expert_institution ?? null,
        };
      }
      return out;
    },
  });
}
