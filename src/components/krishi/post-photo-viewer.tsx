import type { ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

/** Facebook-style dark photo popup with reactions/comments panel below the photo. */
export function PostPhotoViewer({
  src,
  open,
  onOpenChange,
  caption,
  children,
}: {
  src: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caption?: string;
  children: ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[80] bg-black/90 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          data-guest-allow
          className="fixed inset-0 z-[81] flex flex-col overflow-y-auto outline-none"
        >
          <DialogPrimitive.Title className="sr-only">পোস্টের ছবি</DialogPrimitive.Title>
          <DialogPrimitive.Close
            aria-label="বন্ধ করুন"
            className="fixed right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
          >
            <X className="h-6 w-6" />
          </DialogPrimitive.Close>
          <div
            className="flex min-h-[60vh] flex-1 items-center justify-center p-2 pt-16"
            onClick={() => onOpenChange(false)}
          >
            <img
              src={src}
              alt="পোস্টের ছবি"
              className="max-h-[75vh] max-w-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          {caption && (
            <p className="mx-auto w-full max-w-2xl whitespace-pre-wrap break-words px-4 pb-3 text-sm leading-relaxed text-white/90 line-clamp-4">
              {caption}
            </p>
          )}
          <div className="mx-auto w-full max-w-2xl rounded-t-2xl bg-background pb-6">
            {children}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
