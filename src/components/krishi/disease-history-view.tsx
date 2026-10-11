import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ScanSearch, Leaf, X, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState } from "@/components/krishi/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { toBn } from "@/lib/bn";
import { cn } from "@/lib/utils";
import type { DiseaseResult } from "@/lib/disease.functions";

type HistoryRow = {
  id: string;
  crop_type: string;
  disease_name: string;
  severity: "low" | "medium" | "high" | string;
  result_json: DiseaseResult;
  image_url: string | null;
  created_at: string;
};

const SEVERITY = {
  low: { label: "কম", color: "bg-green-100 text-green-800 border-green-300", dot: "🟢" },
  medium: { label: "মাঝারি", color: "bg-yellow-100 text-yellow-800 border-yellow-300", dot: "🟡" },
  high: { label: "বেশি", color: "bg-red-100 text-red-800 border-red-300", dot: "🔴" },
} as const;

function bnDate(iso: string) {
  const d = new Date(iso);
  const months = [
    "জানু",
    "ফেব",
    "মার্চ",
    "এপ্রিল",
    "মে",
    "জুন",
    "জুলাই",
    "আগ",
    "সেপ",
    "অক্টো",
    "নভে",
    "ডিসে",
  ];
  return `${toBn(d.getDate())} ${months[d.getMonth()]}, ${toBn(d.getFullYear())}`;
}

export function DiseaseHistoryView({ userId }: { userId: string }) {
  const [rows, setRows] = useState<HistoryRow[] | null>(null);
  const [selected, setSelected] = useState<HistoryRow | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("disease_history")
        .select("id, crop_type, disease_name, severity, result_json, image_url, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100);
      setRows((data as HistoryRow[] | null) ?? []);
    })();
  }, [userId]);

  if (rows === null) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Leaf className="h-8 w-8" />}
        title="এখনো কোনো বিশ্লেষণ করা হয়নি"
        description="আপনার প্রথম রোগ শনাক্ত করুন"
        action={
          <Link
            to="/disease-detection"
            className="inline-flex h-10 px-4 rounded-xl bg-primary text-primary-foreground font-bold items-center gap-2"
          >
            <ScanSearch className="h-4 w-4" /> রোগ শনাক্ত করুন
          </Link>
        }
      />
    );
  }

  const now = new Date();
  const thisMonth = rows.filter((r) => {
    const d = new Date(r.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const healthy = rows.filter((r) => r.severity === "low").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="মোট" sub="বিশ্লেষণ" value={rows.length} />
        <StatCard label="এই মাসে" sub="বিশ্লেষণ" value={thisMonth} />
        <StatCard label="সুস্থ" sub="গাছ" value={healthy} />
      </div>

      <div className="space-y-3">
        {rows.map((r) => {
          const sev =
            SEVERITY[
              (r.severity as keyof typeof SEVERITY) in SEVERITY
                ? (r.severity as keyof typeof SEVERITY)
                : "medium"
            ];
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelected(r)}
              className="w-full text-left rounded-2xl border border-border bg-card p-3 flex gap-3 active:scale-[0.99] transition"
            >
              <div className="h-16 w-16 rounded-xl bg-muted shrink-0 flex items-center justify-center overflow-hidden">
                {r.image_url ? (
                  <img src={r.image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Leaf className="h-7 w-7 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{r.disease_name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">ফসল: {r.crop_type}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold",
                      sev.color,
                    )}
                  >
                    {sev.dot} {sev.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{bnDate(r.created_at)}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {selected && <ResultModal row={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function StatCard({ label, sub, value }: { label: string; sub: string; value: number }) {
  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border py-3 text-center">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold text-foreground leading-tight mt-1">{toBn(value)}</p>
      <p className="text-[10px] text-muted-foreground">{sub}</p>
    </div>
  );
}

function ResultModal({ row, onClose }: { row: HistoryRow; onClose: () => void }) {
  const r = row.result_json;
  const sev =
    SEVERITY[
      (row.severity as keyof typeof SEVERITY) in SEVERITY
        ? (row.severity as keyof typeof SEVERITY)
        : "medium"
    ];
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-background w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-card/95 backdrop-blur border-b border-border flex items-center justify-between px-4 h-12">
          <h2 className="text-base font-bold text-foreground truncate pr-2">{row.disease_name}</h2>
          <button
            onClick={onClose}
            aria-label="বন্ধ"
            className="h-9 w-9 rounded-full flex items-center justify-center active:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="rounded-2xl bg-card border border-border p-4 flex gap-3">
            {row.image_url ? (
              <img
                src={row.image_url}
                alt=""
                className="h-20 w-20 rounded-xl object-cover bg-muted shrink-0"
              />
            ) : (
              <div className="h-20 w-20 rounded-xl bg-muted shrink-0 flex items-center justify-center">
                <Leaf className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-foreground">{row.disease_name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">ফসল: {row.crop_type}</p>
              <span
                className={cn(
                  "inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-full border text-xs font-bold",
                  sev.color,
                )}
              >
                {sev.dot} তীব্রতা: {sev.label}
              </span>
              <p className="text-[10px] text-muted-foreground mt-2">{bnDate(row.created_at)}</p>
            </div>
          </div>

          {r?.description && (
            <Section icon="📋" title="রোগের বিবরণ" defaultOpen>
              <p className="text-sm text-foreground leading-relaxed">{r.description}</p>
            </Section>
          )}

          {r?.treatments?.length > 0 && (
            <Section icon="💊" title="চিকিৎসা পদ্ধতি" defaultOpen>
              <ol className="text-sm text-foreground space-y-2 list-decimal pl-5">
                {r.treatments.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ol>
            </Section>
          )}

          {r?.prevention?.length > 0 && (
            <Section icon="🛡️" title="প্রতিরোধ ব্যবস্থা">
              <ul className="text-sm text-foreground space-y-2">
                {r.prevention.map((p, i) => (
                  <li key={i} className="flex gap-2">
                    <span>•</span>
                    {p}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {r?.cost?.length > 0 && (
            <Section icon="💰" title="আনুমানিক খরচ">
              <ul className="text-sm text-foreground divide-y divide-border">
                {r.cost.map((c, i) => (
                  <li key={i} className="flex justify-between py-2">
                    <span>{c.name}</span>
                    <span className="font-bold">{c.price}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
  defaultOpen = false,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 active:bg-muted"
      >
        <span className="font-bold text-foreground text-base flex items-center gap-2">
          <span>{icon}</span> {title}
        </span>
        <ChevronDown
          className={cn("h-5 w-5 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
