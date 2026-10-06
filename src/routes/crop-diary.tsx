import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardList,
  Leaf,
  Plus,
  Bell,
  NotebookPen,
  PenLine,
  Sprout,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/user-context";
import { NotificationToggle } from "@/components/krishi/notification-toggle";
import { MASTER_CROP_LABELS } from "@/lib/crop-options";
import { FARMING_STAGES, type FarmingTask } from "@/data/farming-guide";
import { daysSince } from "@/lib/bn-date";
import { toBn } from "@/lib/bn";
import { useCropCompletions } from "@/hooks/use-crop-completions";

export const Route = createFileRoute("/crop-diary")({
  component: CropDiaryPage,
  head: () => ({ meta: [{ title: "ফসল ডায়েরি — কৃষক বন্ধু" }] }),
});

type Tab = "today" | "diary" | "reminders";
type Plan = { id: string; crop_type: string; planting_date: string };
type DiaryStatus = "ভালো" | "সতর্কতা" | "সমস্যা";
type DiaryEntry = {
  id: string;
  plan_id: string | null;
  crop_type: string;
  entry_date: string;
  status: DiaryStatus;
  notes: string;
  created_at: string;
};
type Reminder = {
  id: string;
  plan_id: string | null;
  crop_type: string;
  title: string;
  note: string | null;
  reminder_date: string;
  is_done: boolean;
  is_active: boolean;
};
type TodayTask = {
  plan: Plan;
  stageName: string;
  task: FarmingTask;
  taskId: string;
  index: number;
};

const todayIso = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60_000).toISOString().slice(0, 10);
};

const dateLabel = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("bn-BD", { day: "numeric", month: "short" });

function CropDiaryPage() {
  const { user } = useUser();
  const [tab, setTab] = useState<Tab>("today");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const { keys: completions, complete } = useCropCompletions(user?.id ?? null);
  const [loading, setLoading] = useState(true);
  const [diaryOpen, setDiaryOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [diaryCrop, setDiaryCrop] = useState("all");

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [{ data: planRows }, { data: diaryRows }, { data: reminderRows }] = await Promise.all([
        supabase
          .from("user_crop_plans" as never)
          .select("id, crop_type, planting_date")
          .eq("user_id", user.id)
          .eq("is_active", true),
        supabase
          .from("crop_diary_entries" as never)
          .select("id, plan_id, crop_type, entry_date, status, notes, created_at")
          .eq("user_id", user.id)
          .order("entry_date", { ascending: false })
          .limit(50),
        supabase
          .from("crop_reminders" as never)
          .select("id, plan_id, crop_type, title, note, reminder_date, is_done, is_active")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .order("reminder_date", { ascending: true })
          .limit(50),
      ]);
      const nextPlans = (planRows as Plan[] | null) ?? [];
      setPlans(nextPlans);
      setEntries((diaryRows as DiaryEntry[] | null) ?? []);
      setReminders((reminderRows as Reminder[] | null) ?? []);
      setLoading(false);
    })();
  }, [user]);

  const todayTasks = useMemo<TodayTask[]>(() => {
    const result: TodayTask[] = [];
    for (const plan of plans) {
      const guide = FARMING_STAGES[plan.crop_type];
      if (!guide) continue;
      const days = Math.max(0, daysSince(plan.planting_date));
      const stage =
        guide.stages.find((s) => days >= s.startDay && days < s.endDay) ??
        guide.stages[guide.stages.length - 1];
      if (!stage) continue;
      stage.tasks.slice(0, 2).forEach((task, index) => {
        result.push({ plan, stageName: stage.name, task, index, taskId: `${stage.id}::${index}` });
      });
    }
    return result.slice(0, 6);
  }, [plans]);

  const completedTodayTasks = todayTasks.filter((item) =>
    completions.has(`${item.plan.id}::${item.taskId}`),
  ).length;
  // Only today's pending reminders count as "due"; past-date ones are shown as overdue in the list.
  const dueReminders = reminders.filter((r) => !r.is_done && r.reminder_date === todayIso());
  const latestEntry = entries[0] ?? null;

  async function toggleTask(item: TodayTask) {
    if (!user || completions.has(`${item.plan.id}::${item.taskId}`)) return;
    const key = `${item.plan.id}::${item.taskId}`;
    try {
      await complete.mutateAsync({ planId: item.plan.id, taskId: item.taskId });
    } catch {
      toast.error("কাজ সম্পন্ন করা যায়নি");
      return;
    }
    toast.success("আজকের কাজ সম্পন্ন হয়েছে");
  }

  async function addDiaryEntry(form: HTMLFormElement) {
    if (!user) return;
    const data = new FormData(form);
    const notes = String(data.get("notes") ?? "").trim();
    const crop = String(data.get("crop_type") ?? "");
    if (!notes || !crop) {
      toast.error("ফসল ও নোট লিখুন");
      return;
    }
    setSaving(true);
    const payload = {
      user_id: user.id,
      plan_id: String(data.get("plan_id") ?? "") || null,
      crop_type: crop,
      entry_date: String(data.get("entry_date") || todayIso()),
      status: String(data.get("status") || "ভালো") as DiaryStatus,
      notes,
    };
    const { data: row, error } = await supabase
      .from("crop_diary_entries" as never)
      .insert(payload as never)
      .select("*")
      .single();
    setSaving(false);
    if (error || !row) {
      toast.error("ডায়েরি সংরক্ষণ করা যায়নি");
      return;
    }
    setEntries((current) => [row as DiaryEntry, ...current]);
    setDiaryOpen(false);
    form.reset();
    toast.success("ডায়েরিতে সংরক্ষণ হয়েছে");
  }

  async function addReminder(form: HTMLFormElement) {
    if (!user) return;
    const data = new FormData(form);
    const title = String(data.get("title") ?? "").trim();
    const crop = String(data.get("crop_type") ?? "");
    const reminderDate = String(data.get("reminder_date") ?? "");
    if (!title || !crop || !reminderDate) {
      toast.error("রিমাইন্ডারের তথ্য পূরণ করুন");
      return;
    }
    setSaving(true);
    const payload = {
      user_id: user.id,
      plan_id: String(data.get("plan_id") ?? "") || null,
      crop_type: crop,
      title,
      note: String(data.get("note") ?? "").trim() || null,
      reminder_date: reminderDate,
    };
    const { data: row, error } = await supabase
      .from("crop_reminders" as never)
      .insert(payload as never)
      .select("*")
      .single();
    setSaving(false);
    if (error || !row) {
      toast.error("রিমাইন্ডার সংরক্ষণ করা যায়নি");
      return;
    }
    setReminders((current) =>
      [...current, row as Reminder].sort((a, b) => a.reminder_date.localeCompare(b.reminder_date)),
    );
    setReminderOpen(false);
    form.reset();
    toast.success("রিমাইন্ডার সেট হয়েছে");
  }

  async function completeReminder(reminder: Reminder) {
    const next = !reminder.is_done;
    const { error } = await supabase
      .from("crop_reminders" as never)
      .update({ is_done: next } as never)
      .eq("id", reminder.id);
    if (error) {
      toast.error("রিমাইন্ডার আপডেট করা যায়নি");
      return;
    }
    setReminders((current) =>
      current.map((r) => (r.id === reminder.id ? { ...r, is_done: next } : r)),
    );
    toast.success(next ? "রিমাইন্ডার সম্পন্ন হয়েছে" : "রিমাইন্ডার আবার চালু হয়েছে");
  }

  async function removeReminder(reminder: Reminder) {
    const { error } = await supabase
      .from("crop_reminders" as never)
      .update({ is_active: false } as never)
      .eq("id", reminder.id);
    if (error) {
      toast.error("রিমাইন্ডার বাদ দেওয়া যায়নি");
      return;
    }
    setReminders((current) => current.filter((r) => r.id !== reminder.id));
    toast.success("রিমাইন্ডার থেকে বাদ দেওয়া হয়েছে");
  }

  async function deleteDiaryEntry(id: string) {
    const { error } = await supabase
      .from("crop_diary_entries" as never)
      .delete()
      .eq("id", id);
    if (error) {
      toast.error("ডায়েরি মুছে ফেলা যায়নি");
      return;
    }
    setEntries((current) => current.filter((entry) => entry.id !== id));
    toast.success("ডায়েরি মুছে ফেলা হয়েছে");
  }

  if (!user) return <main className="min-h-screen bg-background" />;

  return (
    <main className="min-h-screen bg-[#F6FBF7] pb-24">
      <header
        className="rounded-b-[32px] px-4 pb-7 pt-6 text-white"
        style={{ background: "var(--gradient-brand)" }}
      >
        <div className="mx-auto max-w-3xl">
          <Link
            to="/dashboard"
            className="home-pressable inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/20"
            aria-label="হোমে ফিরে যান"
          >
            ←
          </Link>
          <div className="mt-5 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-white/70">
                আপনার খামারের নোটবুক
              </p>
              <h1 className="mt-1 text-2xl font-black">ফসল ডায়েরি</h1>
              <p className="mt-1 text-sm text-white/75">
                আজকের কাজ, রিমাইন্ডার ও গাছের অবস্থা এক জায়গায় রাখুন।
              </p>
            </div>
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
              <NotebookPen className="h-7 w-7" />
            </span>
          </div>
        </div>
      </header>

      <nav className="relative z-10 mx-auto -mt-4 max-w-3xl px-4" aria-label="ফসল ডায়েরি ট্যাব">
        <div className="grid grid-cols-3 gap-1 rounded-2xl border border-border bg-card p-1 shadow-[var(--shadow-card)]">
          {(
            [
              ["today", "আজকের প্ল্যান", ClipboardList],
              ["diary", "ডায়েরি", NotebookPen],
              ["reminders", "রিমাইন্ডার", Bell],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={`home-pressable flex min-h-11 items-center justify-center gap-1 rounded-xl px-1 text-xs font-bold ${tab === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              <Icon className="h-4 w-4" /> <span>{label}</span>
            </button>
          ))}
        </div>
      </nav>
      <div className="mx-auto max-w-3xl px-4">
        <NotificationToggle />
      </div>
      <div className="mx-auto grid max-w-3xl grid-cols-2 gap-2 px-4 pt-4 sm:grid-cols-4">
        <button
          type="button"
          onClick={() => setTab("today")}
          className="home-pressable rounded-2xl border border-[#D8F0DF] bg-white p-3 text-left shadow-[0_8px_24px_-20px_rgba(27,67,50,0.9)]"
        >
          <p className="text-[10px] font-bold text-[#6B7280]">চলমান প্ল্যান</p>
          <p className="mt-1 text-lg font-black text-[#2D6A4F]">{toBn(plans.length)}</p>
        </button>
        <button
          type="button"
          onClick={() => setTab("today")}
          className="home-pressable rounded-2xl border border-[#DDECF8] bg-white p-3 text-left shadow-[0_8px_24px_-20px_rgba(27,67,50,0.9)]"
        >
          <p className="text-[10px] font-bold text-[#6B7280]">আজকের কাজ</p>
          <p className="mt-1 text-lg font-black text-sky-700">
            {toBn(completedTodayTasks)}/{toBn(todayTasks.length)}
          </p>
        </button>
        <button
          type="button"
          onClick={() => setTab("reminders")}
          className="home-pressable rounded-2xl border border-[#F6E4B9] bg-white p-3 text-left shadow-[0_8px_24px_-20px_rgba(27,67,50,0.9)]"
        >
          <p className="text-[10px] font-bold text-[#6B7280]">বকেয়া রিমাইন্ডার</p>
          <p className="mt-1 text-lg font-black text-amber-700">{toBn(dueReminders.length)}</p>
        </button>
        <button
          type="button"
          onClick={() => setTab("diary")}
          className="home-pressable rounded-2xl border border-[#E7DDF6] bg-white p-3 text-left shadow-[0_8px_24px_-20px_rgba(27,67,50,0.9)]"
        >
          <p className="text-[10px] font-bold text-[#6B7280]">ডায়েরি নোট</p>
          <p className="mt-1 text-lg font-black text-violet-700">{toBn(entries.length)}</p>
        </button>
      </div>

      <section className="mx-auto max-w-3xl space-y-4 px-4 pt-5">
        {tab === "today" && (
          <TodayPlan
            tasks={todayTasks}
            completions={completions}
            completed={completedTodayTasks}
            dueReminders={dueReminders}
            latestEntry={latestEntry}
            onToggle={toggleTask}
            onOpenReminder={() => {
              setTab("reminders");
              setReminderOpen(true);
            }}
          />
        )}
        {tab === "diary" && (
          <DiaryTab
            entries={entries}
            loading={loading}
            selectedCrop={diaryCrop}
            onCropChange={setDiaryCrop}
            onAdd={() => setDiaryOpen(true)}
            onDelete={deleteDiaryEntry}
          />
        )}
        {tab === "reminders" && (
          <ReminderTab
            reminders={reminders}
            loading={loading}
            onAdd={() => setReminderOpen(true)}
            onComplete={completeReminder}
            onRemove={removeReminder}
          />
        )}
      </section>

      {diaryOpen && (
        <DiaryForm
          plans={plans}
          saving={saving}
          onClose={() => setDiaryOpen(false)}
          onSubmit={addDiaryEntry}
        />
      )}
      {reminderOpen && (
        <ReminderForm
          plans={plans}
          saving={saving}
          onClose={() => setReminderOpen(false)}
          onSubmit={addReminder}
        />
      )}
    </main>
  );
}

function TodayPlan({
  tasks,
  completions,
  completed,
  dueReminders,
  latestEntry,
  onToggle,
  onOpenReminder,
}: {
  tasks: TodayTask[];
  completions: Set<string>;
  completed: number;
  dueReminders: Reminder[];
  latestEntry: DiaryEntry | null;
  onToggle: (task: TodayTask) => void;
  onOpenReminder: () => void;
}) {
  const total = tasks.length;
  return (
    <>
      <section className="rounded-[28px] border border-white/80 bg-white p-4 shadow-[0_18px_42px_-24px_rgba(27,67,50,0.55)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-[#52B788]">
              ব্যক্তিগত পরিকল্পনা
            </p>
            <h2 className="mt-1 text-xl font-black text-gray-900">আজকের কাজ</h2>
            <p className="mt-1 text-xs text-gray-500">
              আপনার active crop plan ও growth stage অনুযায়ী সাজানো।
            </p>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#EAF6FF] text-sm font-black text-sky-700">
            {toBn(completed)}/{toBn(total)}
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${total ? Math.round((completed / total) * 100) : 0}%` }}
          />
        </div>
        <div className="mt-4 space-y-2">
          {tasks.length === 0 ? (
            <div className="rounded-2xl bg-[#F6FBF7] p-4 text-center">
              <Sprout className="mx-auto h-8 w-8 text-primary" />
              <p className="mt-2 text-sm font-bold text-gray-900">
                আগে একটি ফসল পরিকল্পনা তৈরি করুন
              </p>
              <Link
                to="/crop-guide"
                className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-primary"
              >
                ফসল পরিকল্পনা খুলুন <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            tasks.map((item) => {
              const done = completions.has(`${item.plan.id}::${item.taskId}`);
              return (
                <button
                  key={`${item.plan.id}-${item.taskId}`}
                  type="button"
                  onClick={() => onToggle(item)}
                  className={`home-pressable flex w-full items-center gap-3 rounded-2xl border p-3 text-left ${done ? "border-emerald-200 bg-emerald-50" : "border-border bg-card"}`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${done ? "bg-primary text-primary-foreground" : "bg-[#EAF6FF] text-sky-700"}`}
                  >
                    {done ? <Check className="h-4 w-4" /> : <Leaf className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-sm font-bold ${done ? "text-emerald-800 line-through" : "text-gray-900"}`}
                    >
                      {item.task.title}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-gray-500">
                      {item.plan.crop_type} · {item.stageName}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
                </button>
              );
            })
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-amber-700">স্মার্ট রিমাইন্ডার</p>
            <p className="mt-1 text-sm font-bold text-amber-950">
              {dueReminders.length
                ? `${toBn(dueReminders.length)}টি কাজের সময় হয়েছে`
                : "আজকের জন্য কোনো বকেয়া রিমাইন্ডার নেই"}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenReminder}
            className="home-pressable flex h-10 w-10 items-center justify-center rounded-full bg-white text-amber-700 shadow-sm"
            aria-label="রিমাইন্ডার যোগ করুন"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
        {dueReminders.slice(0, 2).map((r) => (
          <p
            key={r.id}
            className="mt-2 rounded-xl bg-white/70 px-3 py-2 text-xs font-semibold text-amber-900"
          >
            {r.crop_type} · {r.title}
          </p>
        ))}
      </section>

      {latestEntry && (
        <section className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            সর্বশেষ ডায়েরি
          </p>
          <div className="mt-2 flex items-start gap-3">
            <span className="rounded-xl bg-[#E8F7EC] p-2 text-primary">
              <NotebookPen className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground">
                {latestEntry.crop_type} · {latestEntry.status}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                {latestEntry.notes}
              </p>
            </div>
          </div>
        </section>
      )}
    </>
  );
}

function DiaryTab({
  entries,
  loading,
  selectedCrop,
  onCropChange,
  onAdd,
  onDelete,
}: {
  entries: DiaryEntry[];
  loading: boolean;
  selectedCrop: string;
  onCropChange: (crop: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
}) {
  const crops = Array.from(new Set(entries.map((entry) => entry.crop_type)));
  const visibleEntries =
    selectedCrop === "all" ? entries : entries.filter((entry) => entry.crop_type === selectedCrop);

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#52B788]">
            মাঠের ডায়েরি
          </p>
          <h2 className="mt-1 text-xl font-black text-gray-900">আপনার নোট</h2>
          <p className="mt-1 text-xs text-gray-500">মাঠের প্রতিদিনের অভিজ্ঞতা এক জায়গায় রাখুন।</p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="home-pressable inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-bold text-primary-foreground shadow-sm"
        >
          <Plus className="h-4 w-4" /> নতুন নোট
        </button>
      </div>

      {!loading && entries.length > 0 && (
        <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <button
            type="button"
            onClick={() => onCropChange("all")}
            className={`home-pressable shrink-0 rounded-full px-3 py-2 text-xs font-bold ${selectedCrop === "all" ? "bg-primary text-primary-foreground" : "bg-white text-gray-600 ring-1 ring-border"}`}
          >
            সব নোট <span className="ml-1 opacity-75">{toBn(entries.length)}</span>
          </button>
          {crops.map((crop) => (
            <button
              key={crop}
              type="button"
              onClick={() => onCropChange(crop)}
              className={`home-pressable shrink-0 rounded-full px-3 py-2 text-xs font-bold ${selectedCrop === crop ? "bg-[#E8F7EC] text-primary ring-1 ring-primary/30" : "bg-white text-gray-600 ring-1 ring-border"}`}
            >
              {crop}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <LoadingCard />
      ) : visibleEntries.length === 0 ? (
        <EmptyCard
          icon={<NotebookPen className="h-8 w-8" />}
          title={selectedCrop === "all" ? "এখনও কোনো নোট নেই" : "এই ফসলের কোনো নোট নেই"}
          text="গাছের অবস্থা, সেচ, সার বা মাঠের অভিজ্ঞতা লিখে রাখুন।"
        />
      ) : (
        <div className="relative space-y-3 pl-3 before:absolute before:bottom-4 before:left-[1.125rem] before:top-4 before:w-px before:bg-[#B7E4C7]">
          {visibleEntries.map((entry) => (
            <article
              key={entry.id}
              className="relative rounded-2xl border border-border bg-card p-4 shadow-[0_10px_26px_-22px_rgba(27,67,50,0.9)] transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="absolute -left-[0.15rem] top-5 h-3 w-3 rounded-full border-2 border-white bg-primary shadow-sm" />
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="rounded-xl bg-[#E8F7EC] p-2 text-primary">
                    <Leaf className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-foreground">{entry.crop_type}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {dateLabel(entry.entry_date)}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-bold ${entry.status === "ভালো" ? "bg-emerald-100 text-emerald-700" : entry.status === "সতর্কতা" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}
                  >
                    {entry.status}
                  </span>
                  <button
                    type="button"
                    onClick={() => onDelete(entry.id)}
                    aria-label="ডায়েরি মুছুন"
                    className="home-pressable flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {entry.notes}
              </p>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

function ReminderTab({
  reminders,
  loading,
  onAdd,
  onComplete,
  onRemove,
}: {
  reminders: Reminder[];
  loading: boolean;
  onAdd: () => void;
  onComplete: (reminder: Reminder) => void;
  onRemove: (reminder: Reminder) => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#52B788]">
            কোনো কাজ ভুলবেন না
          </p>
          <h2 className="mt-1 text-xl font-black text-gray-900">স্মার্ট রিমাইন্ডার</h2>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="home-pressable inline-flex min-h-10 items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-bold text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> রিমাইন্ডার
        </button>
      </div>
      {loading ? (
        <LoadingCard />
      ) : reminders.length === 0 ? (
        <EmptyCard
          icon={<Bell className="h-8 w-8" />}
          title="কোনো রিমাইন্ডার নেই"
          text="সার, সেচ, কীটনাশক বা ফসল তোলার তারিখ সেট করুন।"
        />
      ) : (
        <div className="space-y-3">
          {[...reminders]
            .sort((a, b) => Number(a.is_done) - Number(b.is_done) || a.reminder_date.localeCompare(b.reminder_date))
            .map((reminder) => {
            const today = todayIso();
            const isToday = !reminder.is_done && reminder.reminder_date === today;
            const overdue = !reminder.is_done && reminder.reminder_date < today;
            return (
              <div
                key={reminder.id}
                className={`flex items-center gap-3 rounded-2xl border p-4 ${reminder.is_done ? "border-emerald-200 bg-emerald-50/70" : overdue ? "border-destructive/30 bg-destructive/5" : isToday ? "border-amber-200 bg-amber-50" : "border-border bg-card"}`}
              >
                <button
                  type="button"
                  onClick={() => onComplete(reminder)}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 ${reminder.is_done ? "border-primary bg-primary text-primary-foreground" : "border-amber-400 text-amber-600"}`}
                  aria-label={reminder.is_done ? "আবার চালু করুন" : "সম্পন্ন হিসেবে টিক দিন"}
                >
                  {reminder.is_done ? <Check className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                </button>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-bold ${reminder.is_done ? "text-emerald-800 line-through" : "text-gray-900"}`}
                  >
                    {reminder.title}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {reminder.crop_type} · {dateLabel(reminder.reminder_date)}
                    {isToday ? " · আজ" : ""}
                    {overdue ? " · তারিখ পেরিয়ে গেছে" : ""}
                    {reminder.is_done ? " · সম্পন্ন" : ""}
                  </p>
                  {reminder.note && <p className="mt-1 text-xs text-gray-600">{reminder.note}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(reminder)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label="রিমাইন্ডার বাদ দিন"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function DiaryForm({
  plans,
  saving,
  onClose,
  onSubmit,
}: {
  plans: Plan[];
  saving: boolean;
  onClose: () => void;
  onSubmit: (form: HTMLFormElement) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0A1F13]/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(e.currentTarget);
        }}
        className="flex max-h-[min(92vh,760px)] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] border border-white/70 bg-[#FBFEFC] shadow-[0_-12px_42px_-20px_rgba(27,67,50,0.45)] sm:rounded-[28px] sm:shadow-[0_24px_70px_-28px_rgba(27,67,50,0.55)]"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#E5EFE7] px-5 pb-4 pt-5">
          <div>
            <p className="text-xs font-bold text-primary">ফসল ডায়েরি</p>
            <h2 className="mt-1 text-xl font-black">আজকের নোট লিখুন</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-2 text-xs font-extrabold text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            বন্ধ করুন
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-5 pt-5">
          <Field label="ফসল">
            <select
              name="crop_type"
              defaultValue={plans[0]?.crop_type ?? MASTER_CROP_LABELS[0]}
              className="field h-12 rounded-xl border border-[#D8E5DB] bg-white px-4 text-sm font-semibold text-foreground shadow-sm outline-none transition placeholder:text-[#9AA7A0] focus:border-primary focus:ring-4 focus:ring-primary/10"
            >
              <option value="">ফসল বাছাই করুন</option>
              {MASTER_CROP_LABELS.map((crop) => (
                <option key={crop} value={crop}>
                  {crop}
                </option>
              ))}
            </select>
          </Field>
          <Field label="কোন crop plan-এর সঙ্গে যুক্ত? (ঐচ্ছিক)">
            <select
              name="plan_id"
              className="field h-12 rounded-xl border border-[#D8E5DB] bg-white px-4 text-sm font-semibold text-foreground shadow-sm outline-none transition placeholder:text-[#9AA7A0] focus:border-primary focus:ring-4 focus:ring-primary/10"
            >
              <option value="">শুধু ডায়েরি নোট</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.crop_type}
                </option>
              ))}
            </select>
          </Field>
          <Field label="তারিখ">
            <input
              name="entry_date"
              type="date"
              defaultValue={todayIso()}
              className="field h-12 rounded-xl border border-[#D8E5DB] bg-white px-4 text-sm font-semibold text-foreground shadow-sm outline-none transition placeholder:text-[#9AA7A0] focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
          </Field>
          <Field label="গাছের অবস্থা">
            <select
              name="status"
              defaultValue="ভালো"
              className="field h-12 rounded-xl border border-[#D8E5DB] bg-white px-4 text-sm font-semibold text-foreground shadow-sm outline-none transition placeholder:text-[#9AA7A0] focus:border-primary focus:ring-4 focus:ring-primary/10"
            >
              <option>ভালো</option>
              <option>সতর্কতা</option>
              <option>সমস্যা</option>
            </select>
          </Field>
          <label className="block w-full">
            <span className="mb-2 flex items-center gap-1.5 text-[13px] font-extrabold tracking-[-0.01em] text-foreground">
              <PenLine className="h-4 w-4 text-primary" aria-hidden />
              নোট
            </span>
            <div className="relative w-full">
              {/* paper stack effect */}
              <div
                aria-hidden
                className="absolute inset-0 translate-x-1 translate-y-1 rounded-xl border border-[#E8E2CF] bg-white shadow-sm"
              />
              <div className="relative w-full overflow-hidden rounded-xl border border-[#EFDFAF] bg-[#FFFDF0] shadow-[0_6px_18px_-12px_rgba(27,67,50,0.35)]">
                {/* binder rings */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute bottom-0 left-2.5 top-0 z-10 flex flex-col justify-around py-4 opacity-30"
                >
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span
                      key={i}
                      className="h-3 w-3 rounded-full border border-slate-500 bg-slate-400 shadow-inner"
                    />
                  ))}
                </div>
                {/* red margin line */}
                <div aria-hidden className="absolute bottom-0 left-10 top-0 w-px bg-red-200" />
                {/* top-right corner fold */}
                <div aria-hidden className="pointer-events-none absolute right-0 top-0 h-8 w-8">
                  <div className="absolute right-0 top-0 border-[16px] border-transparent border-l-[#F1F4EE] border-t-[#F1F4EE]" />
                  <div className="absolute right-0 top-0 border-[16px] border-transparent border-b-[#EFE2B8]/50 border-r-[#EFE2B8]/50" />
                </div>
                <textarea
                  name="notes"
                  required
                  maxLength={1000}
                  rows={6}
                  placeholder="আজ কী দেখলেন? কী কাজ করলেন?"
                  className="diary-textarea w-full resize-none bg-transparent pb-5 pl-14 pr-6 pt-8 text-base text-[#3E4A42] outline-none selection:bg-[#DFF3E7] placeholder:text-[#B4A98C]"
                  style={{
                    lineHeight: "40px",
                    backgroundImage:
                      "linear-gradient(transparent, transparent 39px, #E5E7EB 39px)",
                    backgroundSize: "100% 40px",
                    backgroundAttachment: "local",
                  }}
                />
                <div className="flex items-center justify-between border-t border-[#F0E6C8] bg-[#F7FBEF] px-4 py-2">
                  <span className="text-[10px] font-bold tracking-widest text-[#B08B3E]">
                    আজকের ডায়েরি
                  </span>
                  <div className="flex gap-1" aria-hidden>
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span className="h-2 w-2 rounded-full bg-emerald-200" />
                  </div>
                </div>
              </div>
            </div>
          </label>
        </div>
        <button
          disabled={saving}
          className="mx-5 mb-5 mt-1 flex h-12 shrink-0 items-center justify-center rounded-xl bg-primary font-bold text-primary-foreground shadow-[0_10px_22px_-12px_rgba(45,106,79,0.9)] transition hover:bg-[#245C43] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "সংরক্ষণ হচ্ছে..." : "ডায়েরিতে সংরক্ষণ করুন"}
        </button>
      </form>
    </div>
  );
}

function ReminderForm({
  plans,
  saving,
  onClose,
  onSubmit,
}: {
  plans: Plan[];
  saving: boolean;
  onClose: () => void;
  onSubmit: (form: HTMLFormElement) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0A1F13]/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(e.currentTarget);
        }}
        className="flex max-h-[min(92vh,760px)] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] border border-white/70 bg-[#FBFEFC] shadow-[0_-12px_42px_-20px_rgba(27,67,50,0.45)] sm:rounded-[28px] sm:shadow-[0_24px_70px_-28px_rgba(27,67,50,0.55)]"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#E5EFE7] px-5 pb-4 pt-5">
          <div>
            <p className="text-xs font-bold text-primary">স্মার্ট রিমাইন্ডার</p>
            <h2 className="mt-1 text-xl font-black">কাজের তারিখ সেট করুন</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-2 text-xs font-extrabold text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            বন্ধ করুন
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-5 pt-5">
          <Field label="রিমাইন্ডারের নাম">
            <input
              name="title"
              required
              maxLength={120}
              placeholder="যেমন: ইউরিয়ার ২য় কিস্তি"
              className="field h-12 rounded-xl border border-[#D8E5DB] bg-white px-4 text-sm font-semibold text-foreground shadow-sm outline-none transition placeholder:text-[#9AA7A0] focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
          </Field>
          <Field label="ফসল">
            <select
              name="crop_type"
              defaultValue={plans[0]?.crop_type ?? MASTER_CROP_LABELS[0]}
              className="field h-12 rounded-xl border border-[#D8E5DB] bg-white px-4 text-sm font-semibold text-foreground shadow-sm outline-none transition placeholder:text-[#9AA7A0] focus:border-primary focus:ring-4 focus:ring-primary/10"
            >
              {MASTER_CROP_LABELS.map((crop) => (
                <option key={crop} value={crop}>
                  {crop}
                </option>
              ))}
            </select>
          </Field>
          <Field label="কোন crop plan-এর সঙ্গে যুক্ত? (ঐচ্ছিক)">
            <select
              name="plan_id"
              className="field h-12 rounded-xl border border-[#D8E5DB] bg-white px-4 text-sm font-semibold text-foreground shadow-sm outline-none transition placeholder:text-[#9AA7A0] focus:border-primary focus:ring-4 focus:ring-primary/10"
            >
              <option value="">শুধু রিমাইন্ডার</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.crop_type}
                </option>
              ))}
            </select>
          </Field>
          <Field label="কবে মনে করাবে">
            <input
              name="reminder_date"
              type="date"
              required
              defaultValue={todayIso()}
              className="field h-12 rounded-xl border border-[#D8E5DB] bg-white px-4 text-sm font-semibold text-foreground shadow-sm outline-none transition placeholder:text-[#9AA7A0] focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
          </Field>
          <Field label="ছোট নোট (ঐচ্ছিক)">
            <textarea
              name="note"
              maxLength={300}
              rows={3}
              placeholder="কাজটির বিস্তারিত লিখুন"
              className="field min-h-28 rounded-xl border border-[#D8E5DB] bg-white px-4 py-3 text-sm font-semibold leading-relaxed text-foreground shadow-sm outline-none transition placeholder:text-[#9AA7A0] focus:border-primary focus:ring-4 focus:ring-primary/10 resize-none"
            />
          </Field>
        </div>
        <button
          disabled={saving}
          className="mx-5 mb-5 mt-1 flex h-12 shrink-0 items-center justify-center rounded-xl bg-primary font-bold text-primary-foreground shadow-[0_10px_22px_-12px_rgba(45,106,79,0.9)] transition hover:bg-[#245C43] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "সংরক্ষণ হচ্ছে..." : "রিমাইন্ডার সেট করুন"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-bold text-foreground">
      <span className="mb-2 block text-[13px] font-extrabold tracking-[-0.01em]">{label}</span>
      {children}
    </label>
  );
}
function LoadingCard() {
  return <div className="h-32 animate-pulse rounded-2xl bg-white" />;
}
function EmptyCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-8 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E8F7EC] text-primary">
        {icon}
      </span>
      <h3 className="mt-3 text-sm font-black text-foreground">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}
