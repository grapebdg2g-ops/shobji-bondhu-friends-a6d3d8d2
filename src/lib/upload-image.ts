import { supabase } from "@/integrations/supabase/client";
import { optimizeImage, type ImageType } from "@/lib/image-optimizer";

/**
 * Upload engine: optimizes the image in the browser right away, then uploads
 * it to storage under `<userId>/<prefix>-<timestamp>.jpg` and returns its public URL.
 * Uses unique paths without upsert — upsert needs a storage SELECT policy that
 * the public buckets intentionally don't have (listing is disabled).
 */
export async function uploadOptimizedImage(opts: {
  file: File;
  userId: string;
  bucket: string;
  prefix: string;
  type: ImageType;
}): Promise<string> {
  const { file, userId, bucket, prefix, type } = opts;
  if (!file.type.startsWith("image/")) throw new Error("শুধু ছবি আপলোড করা যাবে");
  if (file.size > 20 * 1024 * 1024) throw new Error("ছবি ২০MB এর বেশি বড়");
  const optimized = await optimizeImage(file, type);
  const path = `${userId}/${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await supabase.storage.from(bucket).upload(path, optimized, {
    contentType: optimized.type || "image/jpeg",
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) {
    console.error("[upload] failed", error);
    throw new Error("ছবি আপলোড ব্যর্থ — আবার চেষ্টা করুন");
  }
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
