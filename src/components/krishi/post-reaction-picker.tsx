import { useEffect, useRef, useState } from "react";
import { REACTION_META, REACTION_TYPES, type ReactionType } from "@/lib/reactions";
import { Button } from "@/components/ui/button";

export function PostReactionPicker({
  value,
  onChange,
}: {
  value: ReactionType | null;
  onChange: (reaction: ReactionType | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const active = value ? REACTION_META[value] : REACTION_META.like;

  useEffect(() => {
    if (!open) return;
    const closeIfOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeIfOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeIfOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const keepOpen = () => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    setOpen(true);
  };

  const closeSoon = () => {
    closeTimerRef.current = window.setTimeout(() => setOpen(false), 220);
  };

  return (
    <div ref={rootRef} className="relative min-w-0" onMouseEnter={keepOpen} onMouseLeave={closeSoon}>
      {open && (
        <div
          role="menu"
          aria-label="প্রতিক্রিয়া বাছুন"
          className="reaction-tray absolute bottom-[calc(100%+8px)] left-0 z-30 grid w-[min(20rem,calc(100vw-2rem))] grid-cols-7 items-end gap-0.5 rounded-full border border-border bg-card px-2 py-1.5 shadow-[var(--shadow-lift)]"
        >
          {REACTION_TYPES.map((reaction) => {
            const meta = REACTION_META[reaction];
            return (
              <Button
                key={reaction}
                type="button"
                variant="ghost"
                size="icon"
                role="menuitem"
                title={meta.label}
                aria-label={`${meta.label} reaction দিন`}
                onClick={() => { onChange(value === reaction ? null : reaction); setOpen(false); }}
                className={`reaction-option h-10 w-full min-w-0 rounded-full p-1 ${value === reaction ? "bg-primary/10 ring-2 ring-primary" : "hover:bg-muted"}`}
              >
                <img src={meta.image} alt="" aria-hidden="true" className="h-8 w-8 select-none object-contain" draggable={false} />
              </Button>
            );
          })}
        </div>
      )}
      <Button
        type="button"
        variant="ghost"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={value ? `${active.label} reaction পরিবর্তন করুন` : "প্রতিক্রিয়া দিন"}
        onClick={() => setOpen(true)}
        className={`home-pressable min-h-11 min-w-0 gap-1 rounded-lg px-1 text-xs font-semibold ${value ? active.className : "text-muted-foreground"}`}
      >
        {value ? (
          <img src={active.image} alt="" aria-hidden="true" className="h-5 w-5 object-contain" />
        ) : (
          <span className="text-base leading-none" aria-hidden="true">👍</span>
        )}
        <span className="hidden min-[360px]:inline">{value ? active.label : "প্রতিক্রিয়া"}</span>
      </Button>
    </div>
  );
}
