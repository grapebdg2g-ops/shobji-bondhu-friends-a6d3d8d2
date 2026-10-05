import { CropIcon } from "@/components/krishi/crop-icon";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { getCropsForMonth } from "@/data/master-crop-data";
import { toBn } from "@/lib/bn";

export const Route = createFileRoute("/ai-bondhu/calendar")({
  component: CalendarPage,
  head: () => ({ meta: [{ title: "চাষের ক্যালেন্ডার — কৃষক বন্ধু" },
      { property: "og:title", content: "চাষের ক্যালেন্ডার — কৃষক বন্ধু" },
      { property: "og:description", content: "ফসলের পরিচর্যা ও কৃষি পরিকল্পনা — কৃষক বন্ধু।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "description", content: "ফসলের পরিচর্যা ও কৃষি পরিকল্পনা — কৃষক বন্ধু।" },] }),
});

const MONTHS = [
  "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
  "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর",
];

function CalendarPage() {
  const navigate = useNavigate();
  const [month, setMonth] = useState(new Date().getMonth());
  // master uses 1-indexed months
  const crops = useMemo(() => getCropsForMonth(month + 1), [month]);

  return (
    <main className="min-h-screen bg-[#F0FFF4] md:max-w-[560px] md:mx-auto pb-8">
      <header className="px-5 pt-8 pb-8 rounded-b-3xl text-white" style={{ background: "var(--gradient-brand)" }}>
        <button onClick={() => navigate({ to: "/ai-bondhu" })} className="h-9 w-9 rounded-full bg-white/15 flex items-center justify-center">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="mt-4 text-2xl font-bold">চাষের ক্যালেন্ডার</h1>
        <p className="text-sm text-white/85 mt-1">মাস অনুযায়ী বপনের উপযুক্ত ফসল</p>
      </header>

      <div className="px-4 -mt-4">
        <div className="bg-white rounded-2xl p-3 shadow-sm flex gap-2 overflow-x-auto no-scrollbar">
          {MONTHS.map((m, i) => (
            <button
              key={i}
              onClick={() => setMonth(i)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition ${month === i ? "bg-[#2D6A4F] text-white" : "bg-gray-100 text-gray-700"}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <section className="px-4 mt-5 space-y-3">
        <h2 className="font-bold text-gray-900 px-1">{MONTHS[month]} মাসে যা লাগাবেন</h2>
        {crops.length === 0 ? (
          <p className="text-sm text-gray-500 px-1">এই মাসে কোনো সুপারিশ নেই।</p>
        ) : crops.map((c) => (
          <Link
            key={c.id}
            to="/crop-guide/new/$crop"
            params={{ crop: c.name }}
            className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-3 active:scale-[0.99] transition"
          >
            <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center text-2xl">
              <CropIcon crop={c.id} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900">{c.name}</h3>
              <p className="text-xs text-gray-500 mt-0.5 truncate">
                {c.seasons.join("/")} • {toBn(c.totalDays)} দিন • ফলন {toBn(c.yieldMin)}-{toBn(c.yieldMax)} মণ/বিঘা
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </Link>
        ))}
      </section>
    </main>
  );
}
