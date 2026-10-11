import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Search, Plus, Sprout, Leaf, Wrench, HardHat } from "lucide-react";
import { useUser } from "@/contexts/user-context";
import { useExchanges, type ExchangeType } from "@/hooks/use-exchanges";
import { ExchangeCard } from "@/components/krishi/exchange-card";
import { EmptyState } from "@/components/krishi/empty-state";
import { LoadingSpinner } from "@/components/krishi/loading-spinner";
import { NewAdWizard } from "@/components/krishi/new-ad-wizard";
import { DISTRICTS } from "@/lib/bd-data";

export const Route = createFileRoute("/exchange")({
  component: ExchangePage,
  head: () => ({ meta: [{ title: "বিনিময় — কৃষক বন্ধু" }] }),
});

const TABS: { type: ExchangeType; label: string; icon: typeof Sprout }[] = [
  { type: "seed", label: "বীজ", icon: Sprout },
  { type: "sapling", label: "চারা", icon: Leaf },
  { type: "tool", label: "যন্ত্রপাতি", icon: Wrench },
  { type: "labor", label: "শ্রমিক", icon: HardHat },
];

function ExchangePage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [type, setType] = useState<ExchangeType | "all">("all");
  const [query, setQuery] = useState("");
  const [district, setDistrict] = useState<string | null>(user?.district ?? null);
  const [freeOnly, setFreeOnly] = useState(false);
  const [sort, setSort] = useState<"newest" | "cheapest">("newest");
  const [sheetOpen, setSheetOpen] = useState(false);

  const filters = useMemo(
    () => ({ district, type, query, freeOnly, sort }),
    [district, type, query, freeOnly, sort],
  );
  const { items, loading, addOptimistic } = useExchanges(filters);

  return (
    <main className="min-h-screen bg-background pb-28">
      <header
        className="px-4 pt-10 pb-4 rounded-b-3xl"
        style={{ background: "var(--gradient-brand)" }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate({ to: "/dashboard" })}
            aria-label="ফিরে যান"
            className="h-10 w-10 rounded-full bg-white/15 flex items-center justify-center ring-2 ring-white/20"
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </button>
          <h1 className="text-xl font-bold text-white">বিনিময়</h1>
        </div>
        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="খুঁজুন..."
            className="w-full h-11 pl-10 pr-3 rounded-xl bg-white text-foreground placeholder:text-muted-foreground text-sm focus:outline-none"
          />
        </div>
      </header>

      <div className="px-4 mt-3">
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
          <TabPill active={type === "all"} onClick={() => setType("all")} label="সব" />
          {TABS.map(({ type: t, label, icon: Icon }) => (
            <TabPill
              key={t}
              active={type === t}
              onClick={() => setType(t)}
              icon={<Icon className="h-4 w-4" />}
              label={label}
            />
          ))}
        </div>
      </div>

      <div className="px-4 mt-3 flex gap-2 flex-wrap">
        <select
          value={district ?? ""}
          onChange={(e) => setDistrict(e.target.value || null)}
          className="h-9 px-3 rounded-lg bg-card border border-border text-sm font-medium"
        >
          <option value="">সব জেলা</option>
          {DISTRICTS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <button
          onClick={() => setFreeOnly((v) => !v)}
          className={`h-9 px-3 rounded-lg border text-sm font-medium ${freeOnly ? "bg-accent text-accent-foreground border-accent" : "bg-card border-border"}`}
        >
          {freeOnly ? "বিনামূল্যে" : "সব মূল্য"}
        </button>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as "newest" | "cheapest")}
          className="h-9 px-3 rounded-lg bg-card border border-border text-sm font-medium"
        >
          <option value="newest">নতুন প্রথম</option>
          <option value="cheapest">কম দাম প্রথম</option>
        </select>
      </div>

      <section className="px-4 mt-4 space-y-3">
        {loading ? (
          <LoadingSpinner />
        ) : items.length === 0 ? (
          <EmptyState title="কোনো বিজ্ঞাপন নেই" description="ফিল্টার বদলান বা নতুন বিজ্ঞাপন দিন।" />
        ) : (
          items.map((item) => <ExchangeCard key={item.id} item={item} />)
        )}
      </section>

      <button
        onClick={() => setSheetOpen(true)}
        className="fixed bottom-24 right-4 h-14 px-5 rounded-full bg-[#E07A2C] text-white font-bold shadow-lg active:scale-95 inline-flex items-center gap-2"
      >
        <Plus className="h-5 w-5" /> বিজ্ঞাপন দিন
      </button>

      <NewAdWizard
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        defaultDistrict={user?.district ?? "ঢাকা"}
        defaultUpazila={user?.upazila ?? null}
        userId={user?.id ?? null}
        userName={user?.name ?? "কৃষক"}
        userPhone={user?.phone ?? null}
        onCreated={addOptimistic}
      />
    </main>
  );
}

function TabPill({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 inline-flex items-center gap-1.5 px-3 h-10 text-sm font-medium border-b-2 ${active ? "border-primary text-primary font-bold" : "border-transparent text-muted-foreground"}`}
    >
      {icon} {label}
    </button>
  );
}
