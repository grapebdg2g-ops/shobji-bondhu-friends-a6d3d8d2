import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus, MapPin, TrendingUp, TrendingDown, Sprout, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DISTRICTS, getUpazilas } from "@/lib/bd-data";
import { toast } from "sonner";
import { useUser } from "@/contexts/user-context";
import { BengaliButton } from "@/components/krishi/bengali-button";
import { ErrorMessage } from "@/components/krishi/error-message";
import { EmptyState } from "@/components/krishi/empty-state";
import { BottomSheet } from "@/components/krishi/bottom-sheet";
import { PriceCardSkeleton } from "@/components/krishi/price-card-skeleton";
import { sanitize } from "@/lib/sanitize";
import { ContentMenu } from "@/components/krishi/content-menu";
import { useMutedIds } from "@/hooks/use-muted-users";

export const Route = createFileRoute("/prices")({
  component: PricesPage,
  head: () => ({ meta: [
    { title: "আজকের বাজারদর — কৃষক বন্ধু" },
    { name: "description", content: "বাংলাদেশের জেলা ও উপজেলাভিত্তিক সরকারি DAM ও কৃষকদের বাজারদর, উৎস ও রিপোর্টের তারিখসহ।" },
    { property: "og:title", content: "আজকের বাজারদর — কৃষক বন্ধু" },
    { property: "og:description", content: "এলাকার সবজি ও কৃষিপণ্যের সর্বশেষ বাজারদর দেখুন, লগইন ছাড়াই।" },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

type Price = {
  id: string;
  product_name: string;
  price: number;
  unit: string;
  market_name: string;
  district: string;
  upazila: string | null;
  category: string;
  user_id: string;
  user_name: string;
  previous_price: number | null;
  created_at: string;
  source?: "community" | "DAM";
  price_type?: "retail" | "wholesale" | "growers";
  price_min?: number | null;
  price_max?: number | null;
};

type GovtPrice = {
  id: string;
  product_name: string;
  price_avg: number;
  price_min: number | null;
  price_max: number | null;
  unit: string | null;
  market_name: string | null;
  district: string;
  price_date: string;
  price_type: "retail" | "wholesale" | "growers";
  source: string;
};

const CATEGORIES = ["সব", "ধান", "সবজি", "ফল", "মসলা"] as const;
const UNITS = ["কেজি", "মণ", "পিস", "লিটার"] as const;
const SOURCE_FILTERS = ["সব উৎস", "সরকারি DAM", "কৃষক রিপোর্ট"] as const;

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
const toBn = (n: number | string) => String(n).replace(/\d/g, (d) => BN_DIGITS[+d]);

const BN_MONTHS = [
  "জানুয়ারি",
  "ফেব্রুয়ারি",
  "মার্চ",
  "এপ্রিল",
  "মে",
  "জুন",
  "জুলাই",
  "আগস্ট",
  "সেপ্টেম্বর",
  "অক্টোবর",
  "নভেম্বর",
  "ডিসেম্বর",
];
function bnDate(d = new Date()) {
  return `${toBn(d.getDate())} ${BN_MONTHS[d.getMonth()]}, ${toBn(d.getFullYear())}`;
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${toBn(s)} সেকেন্ড আগে`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${toBn(m)} মিনিট আগে`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${toBn(h)} ঘণ্টা আগে`;
  const d = Math.floor(h / 24);
  return `${toBn(d)} দিন আগে`;
}

function PricesPage() {
  const navigate = useNavigate();
  const { user, loading: userLoading } = useUser();
  const [district, setDistrict] = useState<string>("");
  const [upazila, setUpazila] = useState<string>("all");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("সব");
  const [sourceFilter, setSourceFilter] = useState<(typeof SOURCE_FILTERS)[number]>("সব উৎস");
  const [prices, setPrices] = useState<Price[]>([]);
  const [govtPrices, setGovtPrices] = useState<GovtPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [officialWarning, setOfficialWarning] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [focusProduct, setFocusProduct] = useState<string | null>(null);

  useEffect(() => {
    if (userLoading) return;
    if (!district) {
      setDistrict(user?.district || "ঢাকা");
      setUpazila(user?.upazila ?? "all");
    }
  }, [user, userLoading, district, navigate]);

  const upazilaOptions = useMemo(() => getUpazilas(district), [district]);

  const loadPrices = useCallback(async (d: string) => {
    setLoading(true);
    setError(null);
    setOfficialWarning(null);
    const [communityResult, officialResult] = await Promise.all([
      supabase
        .from("prices")
        .select("*")
        .eq("district", d)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("govt_prices")
        .select("*")
        .eq("district", d)
        .order("price_date", { ascending: false })
        .limit(100),
    ]);

    if (communityResult.error) {
      setError("সংযোগ সমস্যা, আবার চেষ্টা করুন");
      setPrices([]);
    } else {
      setPrices((communityResult.data as Price[]) ?? []);
    }
    if (officialResult.error) {
      setGovtPrices([]);
      setOfficialWarning("সরকারি দরের ডেটা এখনো সংযুক্ত হয়নি");
    } else {
      const officialRows = (officialResult.data as GovtPrice[]) ?? [];
      setGovtPrices(officialRows);
      setOfficialWarning(
        officialRows.length ? null : "এই জেলার জন্য এখনো সরকারি DAM রিপোর্ট পাওয়া যায়নি",
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!district) return;
    loadPrices(district);

    const ch = supabase
      .channel(`prices-${district}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "prices", filter: `district=eq.${district}` },
        (payload) => {
          setPrices((cur) => [payload.new as Price, ...cur].slice(0, 100));
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "govt_prices",
          filter: `district=eq.${district}`,
        },
        (payload) => {
          setGovtPrices((cur) => [payload.new as GovtPrice, ...cur].slice(0, 100));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [district, loadPrices]);

  const { data: mutedIds = [] } = useMutedIds();
  const mutedSet = useMemo(() => new Set(mutedIds), [mutedIds]);

  const filtered = useMemo(() => {
    let r = prices;
    if (upazila !== "all") r = r.filter((p) => p.upazila === upazila);
    if (category !== "সব") r = r.filter((p) => p.category === category);
    if (focusProduct) r = r.filter((p) => p.product_name === focusProduct);
    if (mutedSet.size > 0) r = r.filter((p) => !mutedSet.has(p.user_id));
    return r;
  }, [prices, category, focusProduct, upazila, mutedSet]);

  const filteredGovt = useMemo(() => {
    if (sourceFilter === "কৃষক রিপোর্ট" || category !== "সব") return [];
    let rows = govtPrices;
    if (focusProduct) rows = rows.filter((p) => p.product_name === focusProduct);
    return rows;
  }, [govtPrices, sourceFilter, category, focusProduct]);

  const showCommunity = sourceFilter !== "সরকারি DAM";
  const showOfficial = sourceFilter !== "কৃষক রিপোর্ট";

  return (
    <main className="min-h-screen bg-background pb-28">
      {/* Header */}
      <header
        className="px-5 pt-10 pb-5 rounded-b-3xl"
        style={{ background: "var(--gradient-brand)" }}
      >
        <div className="flex items-center gap-3 text-white">
          <Link
            to={user ? "/dashboard" : "/"}
            className="h-10 w-10 rounded-full bg-white/15 flex items-center justify-center"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold flex-1">বাজার দর</h1>
          <Link
            to="/price-prediction"
            className="px-3 py-2 rounded-full bg-white/20 hover:bg-white/30 text-white text-sm font-semibold flex items-center gap-1.5 active:scale-95 transition"
          >
            <BarChart3 className="h-4 w-4" />
            পূর্বাভাস
          </Link>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <div className="flex-1 relative">
            <MapPin className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-primary" />
            <select
              value={district}
              onChange={(e) => {
                setDistrict(e.target.value);
                setUpazila("all");
              }}
              className="w-full appearance-none bg-white text-foreground font-semibold rounded-xl pl-9 pr-4 py-3 text-sm shadow-[var(--shadow-card)]"
            >
              {DISTRICTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div className="text-white/90 text-xs text-right leading-tight">
            <div className="opacity-80">আজ</div>
            <div className="font-semibold">{bnDate()}</div>
          </div>
        </div>
      </header>

      {/* Upazila chips */}
      {upazilaOptions.length > 0 && (
        <div className="px-5 mt-3 overflow-x-auto" data-guest-allow>
          <div className="flex gap-2 min-w-max pb-1">
            <button
              onClick={() => setUpazila("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${upazila === "all" ? "bg-primary text-primary-foreground" : "bg-card text-foreground border border-border"}`}
            >
              সব উপজেলা
            </button>
            {upazilaOptions.map((u) => (
              <button
                key={u}
                onClick={() => setUpazila(u)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${upazila === u ? "bg-primary text-primary-foreground" : "bg-card text-foreground border border-border"}`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
      )}

      {showCommunity && (
        <PricePulse prices={prices} selected={focusProduct} onSelect={setFocusProduct} />
      )}

      {/* Filter chips */}
      <div className="px-5 mt-4 -mb-1 overflow-x-auto" data-guest-allow>
        <div className="flex gap-2 min-w-max pb-1">
          {CATEGORIES.map((c) => {
            const active = c === category;
            return (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                  active
                    ? "bg-primary text-primary-foreground shadow-[var(--shadow-card)]"
                    : "bg-card text-foreground border border-border"
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-5 mt-3 overflow-x-auto" data-guest-allow>
        <div className="flex min-w-max gap-2 pb-1">
          {SOURCE_FILTERS.map((source) => (
            <button
              key={source}
              type="button"
              onClick={() => setSourceFilter(source)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${sourceFilter === source ? "bg-[#E7F3FF] text-[#1877F2] ring-1 ring-[#1877F2]/20" : "bg-card text-muted-foreground ring-1 ring-border"}`}
            >
              {source}
            </button>
          ))}
        </div>
      </div>
      {officialWarning && sourceFilter !== "কৃষক রিপোর্ট" && (
        <p className="mx-5 mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
          {officialWarning}
        </p>
      )}
      {showOfficial && filteredGovt.length > 0 && <OfficialPriceList prices={filteredGovt} />}

      {/* Community price list */}
      {showCommunity && (
        <section className="px-5 mt-4 space-y-3">
          {loading ? (
            <>
              <PriceCardSkeleton />
              <PriceCardSkeleton />
              <PriceCardSkeleton />
              <PriceCardSkeleton />
            </>
          ) : error ? (
            <ErrorMessage onRetry={() => loadPrices(district)} />
          ) : filtered.length === 0 && filteredGovt.length === 0 ? (
            <EmptyState
              icon={<Sprout className="h-8 w-8" />}
              title="কোনো দাম পাওয়া যায়নি"
              description="এই জেলায় এখনো কোনো দাম যোগ হয়নি।"
              action={
                <BengaliButton
                  variant="warning"
                  size="md"
                  onClick={() => user ? setOpen(true) : navigate({ to: "/login" })}
                  leftIcon={<Plus className="h-5 w-5" />}
                >
                  প্রথম দাম যোগ করুন
                </BengaliButton>
              }
            />
          ) : (
            filtered.map((p) => {
              const diff = p.previous_price != null ? p.price - p.previous_price : 0;
              return (
                <article
                  key={p.id}
                  className="rounded-2xl bg-card border border-border p-4 shadow-[var(--shadow-card)]"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="min-w-0 truncate text-lg font-bold text-foreground">
                          {p.product_name}
                        </h3>
                        <span className="shrink-0 rounded-full bg-[#E7F3FF] px-2 py-0.5 text-[10px] font-bold text-[#1877F2]">
                          কৃষক রিপোর্ট
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {p.market_name}
                        {p.upazila ? ` • ${p.upazila}` : ""}, {p.district}
                      </p>
                    </div>
                    <div className="flex items-start gap-1 shrink-0">
                      <div className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <span className="text-2xl font-extrabold text-primary leading-none">
                            ৳{toBn(p.price)}
                          </span>
                          {diff > 0 && <TrendingUp className="h-5 w-5 text-red-500" />}
                          {diff < 0 && <TrendingDown className="h-5 w-5 text-green-600" />}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          প্রতি {p.unit} ·{" "}
                          {p.price_type === "wholesale"
                            ? "পাইকারি"
                            : p.price_type === "growers"
                              ? "উৎপাদক"
                              : "খুচরা"}
                        </p>
                      </div>
                      {user && <ContentMenu
                        contentType="price"
                        contentId={p.id}
                        authorId={p.user_id}
                        authorName={p.user_name}
                        onDelete={async () => {
                          const { error } = await supabase.from("prices").delete().eq("id", p.id);
                          if (error) {
                            toast.error("মুছে ফেলা যায়নি");
                            return;
                          }
                          setPrices((cur) => cur.filter((x) => x.id !== p.id));
                          toast.success("মুছে ফেলা হয়েছে");
                        }}
                      />}
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border flex justify-between items-center text-xs text-muted-foreground">
                    {p.user_id ? (
                      <Link
                        to="/u/$userId"
                        params={{ userId: p.user_id }}
                        className="hover:underline"
                      >
                        {p.user_name || "অজ্ঞাত"}
                      </Link>
                    ) : (
                      <span>{p.user_name || "অজ্ঞাত"}</span>
                    )}
                    <div className="flex items-center gap-2">
                      <Link
                        to="/price-prediction"
                        search={{ product: p.product_name, district: p.district }}
                        className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-[11px] hover:bg-emerald-100"
                      >
                        📊 পূর্বাভাস
                      </Link>
                      <span>{timeAgo(p.created_at)} · কৃষক রিপোর্ট</span>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>
      )}

      {/* FAB */}
      <button
        onClick={() => user ? setOpen(true) : navigate({ to: "/login" })}
        className="fixed bottom-24 right-5 h-14 w-14 rounded-full bg-[#E07A2C] text-white shadow-lg flex items-center justify-center active:scale-95 transition"
        aria-label="দাম যোগ করুন"
      >
        <Plus className="h-7 w-7" strokeWidth={2.5} />
      </button>

      {/* Add price sheet */}
      {user && (
        <AddPriceSheet
          open={open}
          profile={{
            id: user.id,
            name: user.name,
            district: user.district ?? "",
            upazila: user.upazila ?? null,
          }}
          defaultDistrict={district}
          onClose={() => setOpen(false)}
        />
      )}
    </main>
  );
}

function OfficialPriceList({ prices }: { prices: GovtPrice[] }) {
  return (
    <section className="mt-4 px-5">
      <div className="rounded-2xl border border-[#B7E4C7] bg-[#F3FBF5] p-4 shadow-[var(--shadow-card)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#2D6A4F]">
              সরকারি উৎস
            </p>
            <h2 className="mt-1 text-base font-extrabold text-foreground">
              কৃষি বিপণন অধিদপ্তরের দর
            </h2>
          </div>
          <span className="rounded-full bg-[#D8F3DC] px-2 py-1 text-[10px] font-bold text-[#2D6A4F]">
            DAM রিপোর্ট
          </span>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          সরকারি রিপোর্টের সর্বশেষ প্রকাশিত দর। স্থানীয় কৃষক রিপোর্টের সঙ্গে তুলনা করে সিদ্ধান্ত
          নিন।
        </p>
        <div className="mt-3 space-y-2">
          {prices.slice(0, 8).map((price) => (
            <div
              key={price.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-3 ring-1 ring-[#D8E5DB]"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-foreground">{price.product_name}</p>
                <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                  {price.market_name || "ঢাকা সরকারি রিপোর্ট"} · {price.unit || "কেজি"} ·{" "}
                  {dateLabel(price.price_date)}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-base font-black text-[#2D6A4F]">
                  ৳
                  {toBn(
                    price.price_min != null && price.price_max != null
                      ? `${price.price_min}–${price.price_max}`
                      : price.price_avg,
                  )}
                </p>
                <p className="text-[10px] text-muted-foreground">গড় ৳{toBn(price.price_avg)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function dateLabel(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("bn-BD", {
    day: "numeric",
    month: "short",
  });
}

function PricePulse({
  prices,
  selected,
  onSelect,
}: {
  prices: Price[];
  selected: string | null;
  onSelect: (product: string | null) => void;
}) {
  const products = useMemo(() => {
    const groups = new Map<string, Price[]>();
    prices.forEach((price) => {
      const current = groups.get(price.product_name) ?? [];
      groups.set(price.product_name, [...current, price]);
    });
    return [...groups.entries()]
      .map(([name, rows]) => {
        const latest = rows[0];
        const values = rows
          .slice(0, 6)
          .map((row) => row.price)
          .reverse();
        const min = Math.min(...values);
        const max = Math.max(...values);
        const delta = latest?.previous_price != null ? latest.price - latest.previous_price : 0;
        return { name, latest, values, min, max, delta };
      })
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 4);
  }, [prices]);

  if (products.length === 0) return null;

  return (
    <section className="px-5 mt-4">
      <div className="rounded-2xl bg-card border border-border p-4 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
              Market pulse
            </p>
            <h2 className="text-base font-extrabold text-foreground">দামের গতি</h2>
          </div>
          {selected && (
            <button
              type="button"
              onClick={() => onSelect(null)}
              className="text-xs font-bold text-primary hover:underline"
            >
              সব দেখুন
            </button>
          )}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {products.map((product) => {
            const span = Math.max(1, product.max - product.min);
            const isSelected = selected === product.name;
            return (
              <button
                key={product.name}
                type="button"
                onClick={() => onSelect(isSelected ? null : product.name)}
                className={`rounded-xl p-3 text-left transition hover:-translate-y-0.5 active:scale-[0.98] ${isSelected ? "bg-primary text-primary-foreground ring-2 ring-primary/20" : "bg-muted/60 text-foreground"}`}
                aria-pressed={isSelected}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-bold">{product.name}</span>
                  <span
                    className={`text-[10px] font-bold ${isSelected ? "text-primary-foreground/80" : product.delta > 0 ? "text-red-600" : product.delta < 0 ? "text-emerald-700" : "text-muted-foreground"}`}
                  >
                    {product.delta > 0 ? "↑" : product.delta < 0 ? "↓" : "—"}{" "}
                    {toBn(Math.abs(product.delta))}
                  </span>
                </div>
                <div className="mt-2 flex h-8 items-end gap-1">
                  {product.values.map((value, index) => (
                    <span
                      key={`${product.name}-${index}`}
                      className={`flex-1 rounded-t-sm ${isSelected ? "bg-white/70" : product.delta > 0 ? "bg-red-400" : "bg-emerald-400"}`}
                      style={{
                        height: `${Math.max(20, ((value - product.min) / span) * 75 + 20)}%`,
                      }}
                    />
                  ))}
                </div>
                <p
                  className={`mt-2 text-[10px] ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}
                >
                  সর্বশেষ ৳{toBn(product.latest?.price ?? 0)}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function AddPriceSheet({
  open,
  profile,
  defaultDistrict,
  onClose,
}: {
  open: boolean;
  profile: { id: string; name: string; district: string; upazila: string | null };
  defaultDistrict: string;
  onClose: () => void;
}) {
  const [productName, setProductName] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState<(typeof UNITS)[number]>("কেজি");
  const [priceType, setPriceType] = useState<"retail" | "wholesale">("retail");
  const [marketName, setMarketName] = useState("");
  const [category, setCategory] = useState("সবজি");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanProduct = sanitize(productName);
    const cleanMarket = sanitize(marketName);
    const numericPrice = Number(price);
    if (!cleanProduct || !Number.isFinite(numericPrice) || numericPrice <= 0 || !cleanMarket) {
      toast.error("পণ্য, বাজার ও সঠিক দাম লিখুন");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("prices").insert({
      product_name: cleanProduct,
      price: numericPrice,
      unit,
      price_type: priceType,
      source: "community",
      market_name: cleanMarket,
      district: defaultDistrict || profile.district,
      upazila: profile.upazila,
      category,
      user_id: profile.id,
      user_name: sanitize(profile.name),
    });
    setSubmitting(false);
    if (error) {
      toast.error("সংযোগ সমস্যা, আবার চেষ্টা করুন");
      return;
    }
    toast.success("দাম যোগ হয়েছে");
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="নতুন দাম যোগ করুন">
      <form onSubmit={submit}>
        <div className="space-y-3">
          <Field label="পণ্যের নাম">
            <input
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="যেমন: আলু"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="দাম (৳)">
              <input
                type="number"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="০"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base"
              />
            </Field>
            <Field label="একক">
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as (typeof UNITS)[number])}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="দামের ধরন">
            <select
              value={priceType}
              onChange={(e) => setPriceType(e.target.value as "retail" | "wholesale")}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base"
            >
              <option value="retail">খুচরা</option>
              <option value="wholesale">পাইকারি</option>
            </select>
          </Field>

          <Field label="বাজারের নাম">
            <input
              value={marketName}
              onChange={(e) => setMarketName(e.target.value)}
              placeholder="যেমন: কারওয়ান বাজার"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base"
            />
          </Field>

          <Field label="শ্রেণি">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base"
            >
              {["ধান", "সবজি", "ফল", "মসলা", "অন্যান্য"].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>

          <Field label="জেলা">
            <input
              value={defaultDistrict || profile.district}
              disabled
              className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-base text-muted-foreground"
            />
          </Field>
        </div>

        <BengaliButton type="submit" fullWidth loading={submitting} className="mt-5">
          দাম আপডেট করুন
        </BengaliButton>
      </form>
    </BottomSheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-foreground mb-1.5">{label}</span>
      {children}
    </label>
  );
}
