import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Bot, Save, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  listAiModelSettings,
  updateAiModelSetting,
  type AiSettingRow,
} from "@/lib/ai-settings.functions";

export const Route = createFileRoute("/admin/ai-models")({
  head: () => ({
    meta: [
      { title: "AI সেটিংস — কৃষক বন্ধু অ্যাডমিন" },
      { name: "description", content: "অ্যাপের সব AI ফিচারের মডেল ও API নিয়ন্ত্রণ" },
      { property: "og:title", content: "AI সেটিংস — কৃষক বন্ধু অ্যাডমিন" },
      { property: "og:description", content: "অ্যাপের সব AI ফিচারের মডেল ও API নিয়ন্ত্রণ" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AiModelsPage,
});

const FEATURE_LABELS: Record<string, string> = {
  disease_detection: "রোগ শনাক্তকরণ (ছবি)",
  ai_chat: "AI বন্ধু চ্যাট",
  chat_suggestions: "চ্যাট ফলো-আপ প্রশ্ন",
  price_extraction: "পোস্ট থেকে দাম বের করা",
  price_prediction: "দাম পূর্বাভাস",
  soil_analysis: "মাটি বিশ্লেষণ",
  transcribe: "ভয়েস → লেখা",
  krishok_barta: "কৃষক বার্তা (দৈনিক সংবাদ)",
};

const PROVIDERS = [
  { value: "torveai", label: "TorveAI" },
  { value: "gemini", label: "Google Gemini" },
  { value: "lovable_gateway", label: "Lovable AI (বিল্ট-ইন)" },
] as const;

function SettingCard({ row }: { row: AiSettingRow }) {
  const qc = useQueryClient();
  const [provider, setProvider] = useState(row.provider);
  const [model, setModel] = useState(row.model);
  const [secret, setSecret] = useState(row.api_key_secret);
  const [active, setActive] = useState(row.is_active);

  useEffect(() => {
    setProvider(row.provider);
    setModel(row.model);
    setSecret(row.api_key_secret);
    setActive(row.is_active);
  }, [row]);

  const save = useMutation({
    mutationFn: () =>
      updateAiModelSetting({
        data: {
          feature_key: row.feature_key,
          provider,
          model: model.trim(),
          api_key_secret: secret.trim(),
          is_active: active,
        },
      }),
    onSuccess: () => {
      toast.success("সংরক্ষিত হয়েছে");
      qc.invalidateQueries({ queryKey: ["admin", "ai-settings"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "সংরক্ষণ ব্যর্থ"),
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-bold text-sm text-gray-900">
          {FEATURE_LABELS[row.feature_key] ?? row.feature_key}
        </p>
        <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="h-4 w-4 accent-purple-600"
          />
          চালু
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div>
          <label className="text-[11px] font-semibold text-gray-500">প্রোভাইডার</label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as AiSettingRow["provider"])}
            className="mt-0.5 w-full text-sm border border-gray-200 rounded-lg px-2 py-2"
          >
            {PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-semibold text-gray-500">মডেল</label>
          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="যেমন: claude-opus-5-5"
            className="mt-0.5 w-full text-sm border border-gray-200 rounded-lg px-2 py-2 font-mono"
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-gray-500">সিক্রেটের নাম</label>
          <input
            value={secret}
            onChange={(e) => setSecret(e.target.value.toUpperCase())}
            placeholder="TORVEAI_API_KEY"
            className="mt-0.5 w-full text-sm border border-gray-200 rounded-lg px-2 py-2 font-mono"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-[11px] text-gray-400">
          API key-এর আসল মান Project Settings → Secrets-এ সংরক্ষিত; এখানে শুধু নাম।
        </p>
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending || !model.trim() || !secret.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" /> সেভ
        </button>
      </div>
    </div>
  );
}

function AiModelsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "ai-settings"],
    queryFn: () => listAiModelSettings(),
  });
  const settings = data?.settings ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Bot className="h-5 w-5 text-purple-600" /> AI সেটিংস
        </h1>
        <p className="text-xs text-gray-500">
          প্রতিটি AI ফিচারের জন্য প্রোভাইডার, মডেল ও API key (সিক্রেট) বাছাই করুন — পরিবর্তন সাথে
          সাথেই কার্যকর হয়
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-start gap-2">
        <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
        <p>
          নিরাপত্তা: API key কখনো ডাটাবেসে বা ব্রাউজারে রাখা হয় না। নতুন key যোগ করতে Project
          Settings → Secrets-এ গিয়ে key যোগ করুন, তারপর এখানে সেই নামটি লিখুন।
        </p>
      </div>

      {isLoading && <p className="text-sm text-gray-400 py-8 text-center">লোড হচ্ছে…</p>}
      {!isLoading && settings.length === 0 && (
        <p className="text-sm text-gray-400 py-8 text-center">কোনো সেটিং পাওয়া যায়নি</p>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {settings.map((row) => (
          <SettingCard key={row.feature_key} row={row} />
        ))}
      </div>
    </div>
  );
}
