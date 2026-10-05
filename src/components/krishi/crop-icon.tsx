import { getAllCrops } from "@/data/master-crop-data";
import { cn } from "@/lib/utils";

/** Resolve both persisted Bengali labels and master IDs without duplicating icon maps. */
export function CropIcon({ crop, fallback = "🌱", className }: {
  crop: string; fallback?: string; className?: string;
}) {
  const entry = getAllCrops().find((item) => item.id === crop || item.name === crop);
  return (
    <span className={cn("inline-flex h-[1.25em] w-[1.25em] shrink-0 items-center justify-center align-middle", className)} aria-hidden="true">
      {entry?.iconImage ? (
        <img src={entry.iconImage} alt="" width={128} height={128} loading="lazy" decoding="async" className="h-full w-full rounded-sm object-contain" />
      ) : entry?.icon ?? fallback}
    </span>
  );
}