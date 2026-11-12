import type { ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

/** Facebook-style photo theater: dark photo stage + side panel (desktop) / bottom sheet (mobile). */
export function PostPhotoViewer({
  src,
  open,
  onOpenChange,
  caption,
  authorName,
  authorAvatar,
  subtitle,
  children,
}: {
  src: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caption?: string;
  authorName?: string;
  authorAvatar?: string | null;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[80] bg-foreground/95 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          data-guest-allow
          className="fixed inset-0 z-[81] flex flex-col overflow-y-auto outline-none md:flex-row md:overflow-hidden"
        >
          <DialogPrimitive.Title className="sr-only">পোস্টের ছবি</DialogPrimitive.Title>
          <div
            className="relative flex min-h-[55vh] shrink-0 items-center justify-center bg-foreground md:h-full md:min-h-0 md:flex-1"
            onClick={() => onOpenChange(false)}
          >
            <DialogPrimitive.Close
              aria-label="বন্ধ করুন"
              className="absolute left-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-background/20 text-background transition hover:bg-background/35"
            >
              <X className="h-6 w-6" />
            </DialogPrimitive.Close>
            <img
              src={src}
              alt="পোস্টের ছবি"
              className="max-h-[70vh] max-w-full object-contain md:max-h-full"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <aside className="flex w-full flex-col bg-card md:h-full md:w-[400px] md:shrink-0 md:overflow-y-auto md:border-l md:border-border">
            {authorName && (
              <div className="flex items-center gap-3 px-4 pt-4">
                <Avatar className="h-10 w-10 bg-primary/15">
                  <AvatarImage src={authorAvatar ?? undefined} alt="" className="object-cover" />
                  <AvatarFallback className="bg-primary/15 font-bold text-primary">
                    {authorName.charAt(0) || "ক"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-foreground">{authorName}</p>
                  {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
                </div>
              </div>
            )}
            {caption && (
              <p className="whitespace-pre-wrap break-words px-4 pb-3 pt-3 text-[15px] leading-relaxed text-foreground">
                {caption}
              </p>
            )}
            <div className="pb-6">{children}</div>
          </aside>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
