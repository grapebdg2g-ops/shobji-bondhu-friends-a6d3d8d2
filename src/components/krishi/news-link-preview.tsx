import { ExternalLink } from "lucide-react";
import { useState } from "react";
import { newsPostPreview } from "@/lib/news-preview";

export function NewsLinkPreview({ post }: { post: { user_name: string; content: string; image_url: string | null } }) {
  const preview = newsPostPreview(post);
  const [failedImage, setFailedImage] = useState<string | null>(null);
  if (!preview) return null;
  return (
    <a href={preview.url} target="_blank" rel="noopener noreferrer" data-guest-allow
      className="block overflow-hidden border-y border-border bg-muted/40 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
      aria-label={`${preview.title} — ${preview.source}`}>
      {post.image_url && failedImage !== post.image_url && (
        <img src={post.image_url} alt={preview.title} loading="lazy" referrerPolicy="no-referrer"
          onError={() => setFailedImage(post.image_url)} className="block aspect-[1.91/1] w-full object-cover bg-muted" />
      )}
      <div className="space-y-1 px-4 py-3">
        <p className="flex items-center gap-2 text-xs text-muted-foreground"><span className="min-w-0 truncate">{preview.source}</span><ExternalLink className="h-3.5 w-3.5 shrink-0" /></p>
        <p className="break-words text-base font-semibold leading-snug text-foreground">{preview.title}</p>
        <p className="truncate text-xs text-muted-foreground">{new URL(preview.url).hostname}</p>
      </div>
    </a>
  );
}