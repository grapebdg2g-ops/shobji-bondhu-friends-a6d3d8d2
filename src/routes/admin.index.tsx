import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Users, UserPlus, FileText, Bug, Repeat2, TrendingUp, Star, DollarSign,
  Activity,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { toBn, fmtBdt } from "@/lib/bn";
import { formatDistanceToNow, subDays, startOfDay, format } from "date-fns";
import { bn } from "date-fns/locale";

export const Route = createFileRoute("/admin/")({
  component: OverviewPage,
});

const COLORS = ["#16a34a", "#0284c7", "#f59e0b", "#8b5cf6", "#ef4444"];

function OverviewPage() {
  const { data: stats } = useQuery({
    queryKey: ["admin", "overview", "stats"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const startToday = startOfDay(new Date()).toISOString();
      const [
        farmers, todayUsers, posts, todayPosts, exchanges, prices, disease, todayDisease,
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", startToday),
        supabase.from("posts").select("*", { count: "exact", head: true }),
        supabase.from("posts").select("*", { count: "exact", head: true }).gte("created_at", startToday),
        supabase.from("exchanges").select("*", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("prices").select("*", { count: "exact", head: true }),
        supabase.from("disease_history").select("*", { count: "exact", head: true }),
        supabase.from("disease_history").select("*", { count: "exact", head: true }).gte("created_at", startToday),
      ]);
      return {
        farmers: farmers.count ?? 0,
        todayUsers: todayUsers.count ?? 0,
        posts: posts.count ?? 0,
        todayPosts: todayPosts.count ?? 0,
        exchanges: exchanges.count ?? 0,
        prices: prices.count ?? 0,
        disease: disease.count ?? 0,
        todayDisease: todayDisease.count ?? 0,
      };
    },
  });

  const { data: growth = [] } = useQuery({
    queryKey: ["admin", "overview", "growth"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const since = subDays(new Date(), 30).toISOString();
      const { data } = await supabase
        .from("profiles")
        .select("created_at")
        .gte("created_at", since);
      const byDay: Record<string, number> = {};
      for (let i = 29; i >= 0; i--) {
        const k = format(subDays(new Date(), i), "yyyy-MM-dd");
        byDay[k] = 0;
      }
      (data ?? []).forEach((p) => {
        const k = format(new Date(p.created_at), "yyyy-MM-dd");
        if (k in byDay) byDay[k]++;
      });
      return Object.entries(byDay).map(([d, count]) => ({
        d: format(new Date(d), "d MMM", { locale: bn }),
        count,
      }));
    },
  });

  const { data: dau = [] } = useQuery({
    queryKey: ["admin", "overview", "dau"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const since = subDays(new Date(), 7).toISOString();
      const { data } = await supabase
        .from("posts")
        .select("user_id, created_at")
        .gte("created_at", since);
      const byDay: Record<string, Set<string>> = {};
      for (let i = 6; i >= 0; i--) {
        const k = format(subDays(new Date(), i), "yyyy-MM-dd");
        byDay[k] = new Set();
      }
      (data ?? []).forEach((p) => {
        const k = format(new Date(p.created_at), "yyyy-MM-dd");
        if (k in byDay) byDay[k].add(p.user_id);
      });
      return Object.entries(byDay).map(([d, set]) => ({
        d: format(new Date(d), "EEE", { locale: bn }),
        active: set.size,
      }));
    },
  });

  const usage = [
    { name: "বাজার দর", value: stats?.prices ?? 0 },
    { name: "বিনিময়", value: stats?.exchanges ?? 0 },
    { name: "রোগ শনাক্ত", value: stats?.disease ?? 0 },
    { name: "ফিড পোস্ট", value: stats?.posts ?? 0 },
  ];

  const { data: districts = [] } = useQuery({
    queryKey: ["admin", "overview", "districts"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("district")
        .not("district", "is", null)
        .limit(1000);
      const counts: Record<string, number> = {};
      (data ?? []).forEach((p) => {
        if (p.district) counts[p.district] = (counts[p.district] ?? 0) + 1;
      });
      return Object.entries(counts)
        .map(([district, count]) => ({ district, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15);
    },
  });

  const { data: activity = [] } = useQuery({
    queryKey: ["admin", "overview", "activity"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const [profs, posts, reports, dx] = await Promise.all([
        supabase.from("profiles").select("id, name, district, created_at").order("created_at", { ascending: false }).limit(8),
        supabase.from("posts").select("id, user_name, content, created_at").order("created_at", { ascending: false }).limit(8),
        supabase.from("user_reports").select("id, content_type, reason, created_at").order("created_at", { ascending: false }).limit(8),
        supabase.from("disease_history").select("id, disease_name, crop_type, created_at").order("created_at", { ascending: false }).limit(8),
      ]);
      type Item = { kind: string; icon: string; text: string; at: string };
      const out: Item[] = [];
      (profs.data ?? []).forEach((p) => out.push({
        kind: "user", icon: "🧑",
        text: `নতুন কৃষক: ${p.name || "—"}${p.district ? ", " + p.district : ""}`,
        at: p.created_at,
      }));
      (posts.data ?? []).forEach((p) => out.push({
        kind: "post", icon: "📝",
        text: `${p.user_name || "একজন"}: ${(p.content || "").slice(0, 40)}…`,
        at: p.created_at,
      }));
      (reports.data ?? []).forEach((r) => out.push({
        kind: "report", icon: "⚠️",
        text: `রিপোর্ট: ${r.content_type} — ${r.reason}`,
        at: r.created_at,
      }));
      (dx.data ?? []).forEach((d) => out.push({
        kind: "dx", icon: "🐛",
        text: `${d.crop_type}: ${d.disease_name}`,
        at: d.created_at,
      }));
      return out.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 20);
    },
  });

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={Users} label="মোট কৃষক" value={stats?.farmers ?? 0} accent="bg-emerald-50 text-emerald-700" />
        <Stat icon={UserPlus} label="আজকের নতুন" value={stats?.todayUsers ?? 0} accent="bg-sky-50 text-sky-700" />
        <Stat icon={FileText} label="মোট পোস্ট" value={stats?.posts ?? 0} sub={`আজ: ${toBn(stats?.todayPosts ?? 0)}`} accent="bg-amber-50 text-amber-700" />
        <Stat icon={Bug} label="AI বিশ্লেষণ" value={stats?.disease ?? 0} sub={`আজ: ${toBn(stats?.todayDisease ?? 0)}`} accent="bg-purple-50 text-purple-700" />
        <Stat icon={Repeat2} label="বিনিময়" value={stats?.exchanges ?? 0} accent="bg-rose-50 text-rose-700" />
        <Stat icon={TrendingUp} label="দাম আপডেট" value={stats?.prices ?? 0} accent="bg-cyan-50 text-cyan-700" />
        <Stat icon={Star} label="Pro User" value={0} sub="শীঘ্রই" accent="bg-yellow-50 text-yellow-700" />
        <Stat icon={DollarSign} label="Revenue" valueRaw={fmtBdt(0)} sub="শীঘ্রই" accent="bg-green-50 text-green-700" />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="ব্যবহারকারী বৃদ্ধি (৩০ দিন)" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={growth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="d" fontSize={10} interval={4} />
              <YAxis fontSize={10} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#16a34a" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="দৈনিক সক্রিয় (৭ দিন)">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={dau}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="d" fontSize={10} />
              <YAxis fontSize={10} />
              <Tooltip />
              <Bar dataKey="active" fill="#0284c7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="ফিচার ব্যবহার">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={usage} dataKey="value" nameKey="name" outerRadius={80} label>
                {usage.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="জেলা অনুযায়ী কৃষক" className="lg:col-span-2">
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-gray-500">
                <tr><th className="py-1.5 px-2">জেলা</th><th className="py-1.5 px-2 text-right">কৃষক</th></tr>
              </thead>
              <tbody>
                {districts.map((d) => (
                  <tr key={d.district} className="border-t border-gray-100">
                    <td className="py-1.5 px-2 font-medium">{d.district}</td>
                    <td className="py-1.5 px-2 text-right font-bold">{toBn(d.count)}</td>
                  </tr>
                ))}
                {districts.length === 0 && (
                  <tr><td colSpan={2} className="text-center text-gray-400 py-6">কোনো তথ্য নেই</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </section>

      <section>
        <ChartCard title="সাম্প্রতিক কার্যকলাপ" icon={<Activity className="h-4 w-4" />}>
          <ul className="divide-y divide-gray-100 max-h-[420px] overflow-y-auto">
            {activity.map((a, i) => (
              <li key={i} className="py-2.5 flex items-start gap-3">
                <span className="text-lg shrink-0">{a.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 truncate">{a.text}</p>
                  <p className="text-[11px] text-gray-400">
                    {formatDistanceToNow(new Date(a.at), { addSuffix: true, locale: bn })}
                  </p>
                </div>
              </li>
            ))}
            {activity.length === 0 && (
              <li className="text-center text-gray-400 py-8 text-sm">কোনো কার্যকলাপ নেই</li>
            )}
          </ul>
        </ChartCard>
      </section>
    </div>
  );
}

function Stat({
  icon: Icon, label, value, valueRaw, sub, accent,
}: {
  icon: typeof Users;
  label: string;
  value?: number;
  valueRaw?: string;
  sub?: string;
  accent: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500">{label}</p>
        <span className={`h-7 w-7 rounded-lg flex items-center justify-center ${accent}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold text-gray-900">
        {valueRaw ?? toBn(value ?? 0)}
      </p>
      {sub && <p className="text-[11px] text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function ChartCard({
  title, children, className = "", icon,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
      </div>
      {children}
    </div>
  );
}
