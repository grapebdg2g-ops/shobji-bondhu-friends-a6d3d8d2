import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PostType = "general" | "help" | "success" | "weather";

export type Post = {
  id: string;
  user_id: string;
  user_name: string;
  user_district: string | null;
  type: PostType;
  content: string;
  image_url: string | null;
  crop_tag: string | null;
  likes_count: number;
  comments_count: number;
  district: string | null;
  upazila: string | null;
  created_at: string;
};

export type FeedScope = "myUpazila" | "myDistrict" | "all" | "specific";

export type FeedFilters = {
  /** Backwards-compat: kept as `districtMode` but now supports `myUpazila`. */
  districtMode: FeedScope;
  district: string | null;
  crop: string | null;
  types: PostType[];
};

const PAGE_SIZE = 10;

export function useFeed(
  filters: FeedFilters,
  myDistrict: string | null,
  myUpazila: string | null = null,
  mutedIds: string[] = [],
) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageRef = useRef(0);
  const reqIdRef = useRef(0);

  const buildQuery = useCallback((from: number, to: number) => {
    let q = supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (filters.districtMode === "myUpazila" && myDistrict && myUpazila) {
      q = q.eq("district", myDistrict).eq("upazila", myUpazila);
    } else if (filters.districtMode === "myDistrict" && myDistrict) {
      q = q.eq("district", myDistrict);
    } else if (filters.districtMode === "specific" && filters.district) {
      q = q.eq("district", filters.district);
    }
    if (filters.crop) q = q.eq("crop_tag", filters.crop);
    if (filters.types.length > 0 && filters.types.length < 4) {
      q = q.in("type", filters.types);
    }
    if (mutedIds.length > 0) {
      q = q.not("user_id", "in", `(${mutedIds.join(",")})`);
    }
    return q;
  }, [filters, myDistrict, myUpazila, mutedIds]);

  const load = useCallback(async (reset: boolean) => {
    const myReq = ++reqIdRef.current;
    if (reset) {
      pageRef.current = 0;
      setLoading(true);
      setHasMore(true);
    } else {
      setLoadingMore(true);
    }
    const from = pageRef.current * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await buildQuery(from, to);
    if (myReq !== reqIdRef.current) return;
    if (error) {
      setError("ফিড লোড করা যায়নি");
      setLoading(false);
      setLoadingMore(false);
      return;
    }
    const rows = (data as Post[]) ?? [];
    setPosts((prev) => (reset ? rows : [...prev, ...rows]));
    setHasMore(rows.length === PAGE_SIZE);
    pageRef.current += 1;
    setLoading(false);
    setLoadingMore(false);
    setError(null);
  }, [buildQuery]);

  const removeById = useCallback((id: string) => setPosts((prev) => prev.filter((x) => x.id !== id)), []);

  useEffect(() => {
    load(true);
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel(`shared-feed-${filters.districtMode}-${filters.district ?? "none"}-${myDistrict ?? "none"}-${myUpazila ?? "none"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, (payload) => {
        if (payload.eventType === "DELETE") {
          removeById((payload.old as { id: string }).id);
          return;
        }
        const incoming = payload.new as Post;
        if (mutedIds.includes(incoming.user_id)) return;
        const districtMatches = filters.districtMode === "all"
          || (filters.districtMode === "myDistrict" && incoming.district === myDistrict)
          || (filters.districtMode === "myUpazila" && incoming.district === myDistrict && incoming.upazila === myUpazila)
          || (filters.districtMode === "specific" && incoming.district === filters.district);
        const cropMatches = !filters.crop || incoming.crop_tag === filters.crop;
        const typeMatches = filters.types.length === 0 || filters.types.includes(incoming.type);
        if (!districtMatches || !cropMatches || !typeMatches) return;
        setPosts((current) => {
          const exists = current.some((post) => post.id === incoming.id);
          if (exists) return current.map((post) => post.id === incoming.id ? incoming : post);
          if (payload.eventType !== "INSERT") return current;
          return [incoming, ...current];
        });
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [filters, mutedIds, myDistrict, myUpazila, removeById]);

  const loadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore) return;
    load(false);
  }, [load, loading, loadingMore, hasMore]);

  const prepend = useCallback((p: Post) => setPosts((prev) => [p, ...prev]), []);
  const updateById = useCallback((id: string, patch: Partial<Post>) => {
    setPosts((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }, []);

  return { posts, loading, loadingMore, hasMore, error, loadMore, prepend, removeById, updateById, refresh: () => load(true) };
}
