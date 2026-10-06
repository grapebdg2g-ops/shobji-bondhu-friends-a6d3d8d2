import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Film, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/user-context";
import { ORGANIC_FERTILIZER_GUIDE, type OrganicFertilizerKey } from "@/data/organic-fertilizer-guide";
import { useOrganicGuideVideos, organicGuideVideosKey, type OrganicGuideVideo } from "@/hooks/use-organic-guide-videos";
import { supabase } from "@/integrations/supabase/client";
import { isYouTubeUrl } from "@/lib/youtube";

export const Route = createFileRoute("/admin/organic-videos")({
  component: OrganicVideosAdminPage,
  head: () => ({
    meta: [
      { title: "জৈব কর্নার ভিডিও — কৃষক বন্ধু" },
      { name: "description", content: "জৈব কর্নারের ভিডিও গাইড পরিচালনা করুন।" },
      { property: "og:title", content: "জৈব কর্নার ভিডিও — কৃষক বন্ধু" },
      { property: "og:description", content: "জৈব কর্নারের ভিডিও গাইড পরিচালনা করুন।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const GUIDE_KEYS = Object.keys(ORGANIC_FERTILIZER_GUIDE) as OrganicFertilizerKey[];

type Draft = {
  id?: string;
  guideKey: OrganicFertilizerKey;
  title: string;
  url: string;
  duration: string;
  sortOrder: string;
};

const emptyDraft = (): Draft => ({ guideKey: "goborSar", title: "", url: "", duration: "", sortOrder: "0" });

function OrganicVideosAdminPage() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const { data: videos = [], isLoading } = useOrganicGuideVideos(true);
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  const save = useMutation({
    mutationFn: async (value: Draft) => {
      if (!user) throw new Error("not-authenticated");
      if (!value.title.trim() || !isYouTubeUrl(value.url)) throw new Error("invalid");
      const payload = {
        guide_key: value.guideKey,
        title: value.title.trim(),
        youtube_url: value.url.trim(),
        source: "YouTube",
        duration: value.duration.trim() || null,
        sort_order: Number(value.sortOrder) || 0,
        created_by: user.id,
      };
      const result = value.id
        ? await supabase.from("organic_guide_videos").update(payload).eq("id", value.id)
        : await supabase.from("organic_guide_videos").insert(payload);
      if (result.error) throw result.error;
    },
    onSuccess: () => {
      setDraft(emptyDraft());
      void queryClient.invalidateQueries({ queryKey: organicGuideVideosKey });
      toast.success("ভিডিও লিংক সংরক্ষণ হয়েছে");
    },
    onError: (error) => toast.error(error.message === "invalid" ? "সঠিক YouTube লিংক ও শিরোনাম দিন" : "ভিডিও লিংক সংরক্ষণ করা যায়নি"),
  });

  const updateVideo = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<OrganicGuideVideo> }) => {
      const { error } = await supabase.from("organic_guide_videos").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: organicGuideVideosKey }),
    onError: () => toast.error("স্ট্যাটাস আপডেট করা যায়নি"),
  });

  const removeVideo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("organic_guide_videos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: organicGuideVideosKey });
      toast.success("ভিডিও মুছে ফেলা হয়েছে");
    },
    onError: () => toast.error("ভিডিও মুছে ফেলা যায়নি"),
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    save.mutate(draft);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900"><Film className="h-5 w-5 text-purple-600" /> জৈব কর্নার ভিডিও</h1>
        <p className="text-xs text-gray-500">প্রতিটি গাইডে দেখানো YouTube ভিডিও পরিচালনা করুন</p>
      </div>

      <form onSubmit={submit} className="grid gap-3 rounded-lg border border-gray-200 bg-white p-4 md:grid-cols-2">
        <label className="text-sm font-semibold text-gray-700">গাইড
          <select value={draft.guideKey} onChange={(event) => setDraft((value) => ({ ...value, guideKey: event.target.value as OrganicFertilizerKey }))} className="mt-1 h-11 w-full rounded-md border border-gray-200 px-3">
            {GUIDE_KEYS.map((key) => <option key={key} value={key}>{ORGANIC_FERTILIZER_GUIDE[key].name}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold text-gray-700">ভিডিওর শিরোনাম
          <input required value={draft.title} onChange={(event) => setDraft((value) => ({ ...value, title: event.target.value }))} className="mt-1 h-11 w-full rounded-md border border-gray-200 px-3" />
        </label>
        <label className="text-sm font-semibold text-gray-700 md:col-span-2">YouTube লিংক
          <input required type="url" placeholder="https://www.youtube.com/watch?v=..." value={draft.url} onChange={(event) => setDraft((value) => ({ ...value, url: event.target.value }))} className="mt-1 h-11 w-full rounded-md border border-gray-200 px-3" />
        </label>
        <label className="text-sm font-semibold text-gray-700">সময় (ঐচ্ছিক)
          <input placeholder="৮ মিনিট" value={draft.duration} onChange={(event) => setDraft((value) => ({ ...value, duration: event.target.value }))} className="mt-1 h-11 w-full rounded-md border border-gray-200 px-3" />
        </label>
        <label className="text-sm font-semibold text-gray-700">ক্রম
          <input type="number" min="0" value={draft.sortOrder} onChange={(event) => setDraft((value) => ({ ...value, sortOrder: event.target.value }))} className="mt-1 h-11 w-full rounded-md border border-gray-200 px-3" />
        </label>
        <div className="flex gap-2 md:col-span-2">
          <Button type="submit" disabled={save.isPending}><Plus className="h-4 w-4" /> {draft.id ? "আপডেট করুন" : "ভিডিও যোগ করুন"}</Button>
          {draft.id && <Button type="button" variant="outline" onClick={() => setDraft(emptyDraft())}>বাতিল</Button>}
        </div>
      </form>

      <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
        {isLoading && <p className="p-5 text-sm text-gray-500">লোড হচ্ছে…</p>}
        {!isLoading && videos.length === 0 && <p className="p-5 text-center text-sm text-gray-500">এখনো কোনো ভিডিও যোগ করা হয়নি</p>}
        {videos.map((video) => (
          <div key={video.id} className="flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-purple-700">{ORGANIC_FERTILIZER_GUIDE[video.guide_key].name}</p>
              <p className="truncate text-sm font-semibold text-gray-900">{video.title}</p>
              <p className="truncate text-xs text-gray-500">{video.youtube_url}</p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={() => updateVideo.mutate({ id: video.id, patch: { is_active: !video.is_active } })}>{video.is_active ? "সক্রিয়" : "বন্ধ"}</Button>
            <Button type="button" size="icon" variant="outline" aria-label="সম্পাদনা" onClick={() => setDraft({ id: video.id, guideKey: video.guide_key, title: video.title, url: video.youtube_url, duration: video.duration ?? "", sortOrder: String(video.sort_order) })}><Pencil className="h-4 w-4" /></Button>
            <Button type="button" size="icon" variant="destructive" aria-label="মুছুন" onClick={() => removeVideo.mutate(video.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}