import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/user-context";
import { formatDistanceToNow } from "date-fns";
import { bn } from "date-fns/locale";

export const Route = createFileRoute("/price-prediction/history")({
  component: HistoryPage,
  head: () => ({
    meta: [
      { title: "আমার সংরক্ষিত পূর্বাভাস — কৃষক বন্ধু" },
      { name: "description", content: "আপনার AI দাম পূর্বাভাসের ইতিহাস ও নির্ভুলতা।" },
    ],
  }),
});

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
const toBn = (n: number | string) => String(n).replace(/\d/g, (d) => BN_DIGITS[+d]);

type Row = {
  id: string;
  product_name: string;
  district: string;
  prediction_json: {
    direction?: string;
    predicted_change_percent?: number;
    current_avg_price?: number;
  };
  was_correct: boolean | null;
  actual_price: number | null;
  checked_at: string | null;
  created_at: string;
};

function HistoryPage() {
  const navigate = useNavigate();
  const { user, loading: userLoading } = useUser();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("price_predictions")
        .select(
          "id, product_name, district, prediction_json, was_correct, actual_price, checked_at, created_at",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (!alive) return;
      setRows((data ?? []) as unknown as Row[]);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [user, userLoading, navigate]);

  const stats = useMemo(() => {
    const checked = rows.filter((r) => r.was_correct !== null);
    const correct = checked.filter((r) => r.was_correct === true).length;
    const accuracy = checked.length > 0 ? Math.round((correct / checked.length) * 100) : 0;
    return { total: rows.length, correct, accuracy, checked: checked.length };
  }, [rows]);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-gradient-to-r from-emerald-600 to-green-700 text-white px-4 py-4 sticky top-0 z-10 shadow">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate({ to: "/price-prediction", search: {} })}
            className="p-1 -ml-1"
            aria-label="ফিরে যান"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold leading-tight">📜 আমার সংরক্ষিত পূর্বাভাস</h1>
            <p className="text-xs text-emerald-100">আপনার অতীত পূর্বাভাসের নির্ভুলতা</p>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2">
          <StatCard
            label="মোট"
            value={toBn(stats.total)}
            suffix="টি"
            tint="bg-blue-50 text-blue-700"
          />
          <StatCard
            label="সঠিক"
            value={toBn(stats.correct)}
            suffix="টি"
            tint="bg-green-50 text-green-700"
          />
          <StatCard
            label="নির্ভুলতা"
            value={toBn(stats.accuracy)}
            suffix="%"
            tint="bg-purple-50 text-purple-700"
          />
        </div>

        {stats.checked < stats.total && (
          <p className="text-xs text-gray-500 text-center">
            {toBn(stats.total - stats.checked)} টি পূর্বাভাস এখনো যাচাইয়ের অপেক্ষায় (৭ দিন পর)
          </p>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-400 text-sm">লোড হচ্ছে…</div>
        ) : rows.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-4xl mb-2">📊</p>
            <p className="font-semibold text-gray-700">কোনো পূর্বাভাস নেই</p>
            <p className="text-sm text-gray-500 mt-1">প্রথম পূর্বাভাস তৈরি করুন</p>
            <button
              onClick={() => navigate({ to: "/price-prediction", search: {} })}
              className="mt-4 bg-emerald-600 text-white text-sm font-bold rounded-full px-5 py-2"
            >
              নতুন পূর্বাভাস
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <PredictionCard key={r.id} row={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  suffix,
  tint,
}: {
  label: string;
  value: string;
  suffix: string;
  tint: string;
}) {
  return (
    <div className={`rounded-xl border border-gray-200 p-3 text-center ${tint}`}>
      <p className="text-[11px] font-semibold opacity-80">{label}</p>
      <p className="text-2xl font-extrabold leading-none mt-1">
        {value}
        <span className="text-xs font-bold opacity-70 ml-0.5">{suffix}</span>
      </p>
    </div>
  );
}

function PredictionCard({ row }: { row: Row }) {
  const pred = row.prediction_json ?? {};
  const direction = pred.direction ?? "—";
  const pct = Number(pred.predicted_change_percent ?? 0);
  const current = Number(pred.current_avg_price ?? 0);
  const actual = row.actual_price != null ? Number(row.actual_price) : null;
  const actualChange = actual != null && current > 0 ? ((actual - current) / current) * 100 : null;

  const ago = formatDistanceToNow(new Date(row.created_at), { addSuffix: true, locale: bn });
  const dirIcon = direction.includes("বাড়") ? (
    <TrendingUp className="w-4 h-4 text-red-600 inline" />
  ) : direction.includes("কম") ? (
    <TrendingDown className="w-4 h-4 text-green-600 inline" />
  ) : (
    <ArrowRight className="w-4 h-4 text-gray-500 inline" />
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3">
      <div className="flex items-center justify-between">
        <div className="font-bold text-sm">
          {row.product_name} • {row.district}
        </div>
        <div className="text-[11px] text-gray-500">{ago}</div>
      </div>

      <div className="mt-2 text-sm">
        <span className="text-gray-500">পূর্বাভাস:</span> {dirIcon}{" "}
        <span className="font-semibold">{direction}</span>{" "}
        {pct ? <span className="text-gray-700">{toBn(pct)}%</span> : null}
      </div>

      {actual != null ? (
        <div className="mt-1 text-sm">
          <span className="text-gray-500">বাস্তবে:</span> ৳{toBn(current.toFixed(0))} → ৳
          {toBn(actual.toFixed(0))}{" "}
          {actualChange != null && (
            <span className={actualChange >= 0 ? "text-red-600" : "text-green-600"}>
              ({actualChange >= 0 ? "+" : ""}
              {toBn(actualChange.toFixed(1))}%)
            </span>
          )}
        </div>
      ) : (
        <div className="mt-1 text-xs text-gray-400 flex items-center gap-1">
          <Clock className="w-3 h-3" /> ৭ দিন পর যাচাই হবে
        </div>
      )}

      {row.was_correct != null && (
        <div className="mt-2 flex justify-end">
          {row.was_correct ? (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-50 rounded-full px-2.5 py-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> সঠিক ছিল
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 rounded-full px-2.5 py-1">
              <XCircle className="w-3.5 h-3.5" /> ভুল ছিল
            </span>
          )}
        </div>
      )}
    </div>
  );
}
