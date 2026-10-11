import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type UserProfile = {
  id: string;
  name: string;
  phone: string | null;
  district: string | null;
  upazila: string | null;
  crops: string[];
  role: string;
};

type UserContextValue = {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
  signOut: () => Promise<void>;
};

const UserContext = createContext<UserContextValue | undefined>(undefined);

const profileKey = (uid: string | null) => ["profile", uid] as const;

async function fetchProfile(uid: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, district, upazila, crops, role")
    .eq("id", uid)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  // Phone is column-restricted via RLS; fetch via SECURITY DEFINER RPC (owner only).
  const { data: phone } = await supabase.rpc("get_my_phone" as never);
  return { ...(data as Omit<UserProfile, "phone">), phone: (phone as string | null) ?? null };
}

export function UserProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [uid, setUid] = useState<string | null | undefined>(undefined); // undefined = unknown yet

  // Resolve current session uid once + subscribe to auth changes
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setUid(data.session?.user.id ?? null);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!mounted) return;
      const nextUid = session?.user.id ?? null;
      setUid(nextUid);
      if (!nextUid) qc.setQueryData(profileKey(null), null);
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [qc]);

  const query = useQuery({
    queryKey: profileKey(uid ?? null),
    queryFn: () => (uid ? fetchProfile(uid) : Promise.resolve(null)),
    enabled: uid !== undefined,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });

  const refreshUser = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const nextUid = data.session?.user.id ?? null;
    setUid(nextUid);
    if (nextUid) {
      await qc.invalidateQueries({ queryKey: profileKey(nextUid) });
    } else {
      qc.setQueryData(profileKey(null), null);
    }
  }, [qc]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUid(null);
    qc.setQueryData(profileKey(null), null);
  }, [qc]);

  const loading = uid === undefined || (uid !== null && query.isLoading);
  const error = query.error ? "প্রোফাইল লোড করা যায়নি" : null;

  return (
    <UserContext.Provider
      value={{
        user: (query.data as UserProfile | null) ?? null,
        loading,
        error,
        refreshUser,
        signOut,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
}
