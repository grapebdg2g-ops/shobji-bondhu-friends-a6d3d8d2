import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  ArrowLeft, Send, Loader2, Mic, Square, ThumbsUp, ThumbsDown,
  Menu, X, Plus, Save, CheckCircle2, MoreVertical, Pencil, Trash2, Search, Check,
} from "lucide-react";
import { chatWithAI, suggestFollowUps, recordCacheFeedback } from "@/lib/chat.functions";
import { transcribeAudio } from "@/lib/transcribe.functions";
import { useUser } from "@/contexts/user-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Msg = {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
  source?: "cache" | "gemini";
  cacheId?: string | null;
  feedback?: "up" | "down" | null;
};

type SessionRow = {
  id: string;
  title: string;
  category: string | null;
  crop_type: string | null;
  is_saved: boolean;
  updated_at: string;
  created_at: string;
};

const WELCOME: Msg = {
  role: "assistant",
  content: "আসসালামু আলাইকুম! 👋\nআমি আপনার কৃষি বন্ধু।\nআজ কী জানতে চান?",
};

const CATEGORY_ICON: Record<string, string> = {
  disease: "🔴",
  fertilizer: "💊",
  market: "💰",
  weather: "🌤️",
  planting: "🌱",
  general: "🌿",
};

function detectCategory(q: string): string {
  const s = q.toLowerCase();
  if (/রোগ|পোকা|ব্লাস্ট|ব্লাইট|পচা|হলুদ|দাগ|মরে/.test(s)) return "disease";
  if (/সার|ইউরিয়া|টিএসপি|এমওপি|সেচ|পানি/.test(s)) return "fertilizer";
  if (/দাম|বাজার|বিক্রি|দর|লাভ|কোথায়/.test(s)) return "market";
  if (/বৃষ্টি|ঝড়|আবহাওয়া|রোদ|খরা|বন্যা/.test(s)) return "weather";
  if (/কখন|লাগাবো|বপন|রোপণ|মৌসুম|চাষ/.test(s)) return "planting";
  return "general";
}

function groupByDate(items: SessionRow[]) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yStart = startOfDay - 86400000;
  const wStart = startOfDay - 6 * 86400000;
  const groups: Record<string, SessionRow[]> = { আজ: [], গতকাল: [], "এই সপ্তাহ": [], পুরনো: [] };
  for (const s of items) {
    const t = new Date(s.updated_at).getTime();
    if (t >= startOfDay) groups["আজ"].push(s);
    else if (t >= yStart) groups["গতকাল"].push(s);
    else if (t >= wStart) groups["এই সপ্তাহ"].push(s);
    else groups["পুরনো"].push(s);
  }
  return groups;
}

export function AiChatView({ sessionId: initialSessionId }: { sessionId?: string }) {
  const navigate = useNavigate();
  const { user } = useUser();
  const chat = useServerFn(chatWithAI);
  const suggest = useServerFn(suggestFollowUps);
  const feedback = useServerFn(recordCacheFeedback);
  const transcribe = useServerFn(transcribeAudio);

  const [sessionId, setSessionId] = useState<string | null>(initialSessionId ?? null);
  const [title, setTitle] = useState<string>("নতুন চ্যাট");
  const [isSaved, setIsSaved] = useState(false);
  const [dirtySinceSave, setDirtySinceSave] = useState(false);
  const [saving, setSaving] = useState(false);

  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [searchQ, setSearchQ] = useState("");
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const [warning, setWarning] = useState<null | { action: () => void }>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const previousMessageCountRef = useRef(messages.length);

  const handleViewportScroll = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    stickToBottomRef.current = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 120;
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    const messageCountChanged = messages.length !== previousMessageCountRef.current;
    const lastMessage = messages[messages.length - 1];
    const userAddedMessage = messageCountChanged && lastMessage?.role === "user";
    previousMessageCountRef.current = messages.length;
    if (!viewport || (!stickToBottomRef.current && !userAddedMessage)) return;

    const frame = requestAnimationFrame(() => {
      viewport.scrollTop = viewport.scrollHeight;
    });
    return () => cancelAnimationFrame(frame);
  }, [messages.length, loading]);

  useEffect(() => {
    const visualViewport = window.visualViewport;
    if (!visualViewport) return;
    let frame: number | null = null;
    const handleKeyboardResize = () => {
      if (!stickToBottomRef.current || frame !== null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        const viewport = viewportRef.current;
        if (viewport) viewport.scrollTop = viewport.scrollHeight;
      });
    };
    visualViewport.addEventListener("resize", handleKeyboardResize);
    return () => {
      visualViewport.removeEventListener("resize", handleKeyboardResize);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, []);

  // Load sidebar list
  const loadSessions = useCallback(async () => {
    if (!user) return;
    let q = supabase
      .from("chat_sessions" as never)
      .select("id, title, category, crop_type, is_saved, updated_at, created_at")
      .eq("is_saved", true)
      .order("updated_at", { ascending: false })
      .limit(50);
    if (searchQ.trim()) q = q.ilike("title", `%${searchQ.trim()}%`);
    const { data, error } = await q;
    if (!error && data) setSessions(data as unknown as SessionRow[]);
  }, [user, searchQ]);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  // Load a specific session
  useEffect(() => {
    if (!initialSessionId || !user) return;
    (async () => {
      const { data, error } = await supabase
        .from("chat_sessions" as never)
        .select("id, title, messages, is_saved")
        .eq("id", initialSessionId)
        .maybeSingle();
      if (error || !data) { toast.error("চ্যাট খুঁজে পাওয়া যায়নি"); return; }
      const row = data as unknown as { id: string; title: string; messages: Msg[]; is_saved: boolean };
      setSessionId(row.id);
      setTitle(row.title);
      setMessages(Array.isArray(row.messages) && row.messages.length ? row.messages : [WELCOME]);
      setIsSaved(row.is_saved);
      setDirtySinceSave(false);
    })();
  }, [initialSessionId, user]);

  const hasUnsaved = useMemo(() => {
    const hasUser = messages.some((m) => m.role === "user");
    return hasUser && (!isSaved || dirtySinceSave);
  }, [messages, isSaved, dirtySinceSave]);

  const sendText = async (text: string, opts: { skipCache?: boolean } = {}) => {
    if (!text || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: text, timestamp: new Date().toISOString() }];
    setMessages(next);
    setInput("");
    setSuggestions([]);
    setLoading(true);
    setDirtySinceSave(true);
    try {
      const userContext = user
        ? { name: user.name, district: user.district ?? undefined, upazila: user.upazila ?? undefined, crops: user.crops }
        : undefined;
      const res = await chat({
        data: {
          messages: next.slice(-10).map(({ role, content }) => ({ role, content })),
          userContext,
          skipCache: opts.skipCache,
        },
      });
      const updated: Msg[] = [
        ...next,
        {
          role: "assistant", content: res.reply, source: res.source,
          cacheId: res.cacheId, feedback: null, timestamp: new Date().toISOString(),
        },
      ];
      setMessages(updated);
      suggest({ data: { messages: updated.slice(-6).map(({ role, content }) => ({ role, content })) } })
        .then((s) => setSuggestions(s.suggestions ?? []))
        .catch(() => setSuggestions([]));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ত্রুটি ঘটেছে");
      setMessages((m) => m.slice(0, -1));
      setInput(text);
    } finally {
      setLoading(false);
    }
  };

  const send = () => sendText(input.trim());

  const submitFeedback = async (idx: number, helpful: boolean) => {
    const m = messages[idx];
    if (!m || m.role !== "assistant" || !m.cacheId || m.feedback) return;
    setMessages((prev) => prev.map((x, i) => (i === idx ? { ...x, feedback: helpful ? "up" : "down" } : x)));
    try {
      await feedback({ data: { cacheId: m.cacheId, helpful } });
      if (helpful) toast.success("ধন্যবাদ!");
      else {
        toast.info("নতুন উত্তর খুঁজছি...");
        const prevUser = [...messages.slice(0, idx)].reverse().find((x) => x.role === "user");
        if (prevUser) {
          setMessages((prev) => prev.slice(0, idx));
          await sendText(prevUser.content, { skipCache: true });
        }
      }
    } catch { toast.error("মতামত সংরক্ষণ ব্যর্থ"); }
  };

  const saveChat = async () => {
    if (!user || saving) return;
    const firstUser = messages.find((m) => m.role === "user");
    if (!firstUser) { toast.error("সেভ করার মতো কিছু নেই"); return; }
    setSaving(true);
    const newTitle = (firstUser.content.slice(0, 40) + (firstUser.content.length > 40 ? "..." : "")) || "নতুন চ্যাট";
    const category = detectCategory(firstUser.content);
    try {
      if (sessionId) {
        const { error } = await supabase
          .from("chat_sessions" as never)
          .update({ messages: messages as never, title: newTitle, is_saved: true, category } as never)
          .eq("id", sessionId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("chat_sessions" as never)
          .insert({
            user_id: user.id, title: newTitle, messages: messages as never,
            is_saved: true, category,
          } as never)
          .select("id")
          .single();
        if (error) throw error;
        const newId = (data as unknown as { id: string }).id;
        setSessionId(newId);
        window.history.replaceState({}, "", `/ai-bondhu/chat/${newId}`);
      }
      setTitle(newTitle);
      setIsSaved(true);
      setDirtySinceSave(false);
      toast.success("✅ চ্যাট সেভ হয়েছে। বাম মেনু থেকে দেখতে পারবেন।");
      loadSessions();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "সেভ ব্যর্থ");
    } finally {
      setSaving(false);
    }
  };

  const resetToNew = () => {
    setMessages([WELCOME]);
    setSessionId(null);
    setIsSaved(false);
    setDirtySinceSave(false);
    setTitle("নতুন চ্যাট");
    setSuggestions([]);
    setInput("");
    navigate({ to: "/ai-bondhu/chat" });
  };

  const startNewChat = () => {
    setSidebarOpen(false);
    if (hasUnsaved) { setWarning({ action: resetToNew }); return; }
    resetToNew();
  };

  const openSession = (id: string) => {
    setSidebarOpen(false);
    setMenuOpenFor(null);
    if (id === sessionId) return;
    const go = () => navigate({ to: "/ai-bondhu/chat/$sessionId", params: { sessionId: id } });
    if (hasUnsaved) { setWarning({ action: go }); return; }
    go();
  };

  const renameSession = async (id: string) => {
    const t = renameValue.trim();
    if (!t) { setRenamingId(null); return; }
    const { error } = await supabase.from("chat_sessions" as never).update({ title: t } as never).eq("id", id);
    if (error) toast.error("নাম পরিবর্তন ব্যর্থ");
    else {
      setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, title: t } : s)));
      if (id === sessionId) setTitle(t);
    }
    setRenamingId(null);
  };

  const deleteSession = async (id: string) => {
    if (!confirm("এই চ্যাট মুছে ফেলবেন?")) return;
    const { error } = await supabase.from("chat_sessions" as never).delete().eq("id", id);
    if (error) { toast.error("মুছে ফেলা ব্যর্থ"); return; }
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setMenuOpenFor(null);
    if (id === sessionId) resetToNew();
    toast.success("মুছে ফেলা হয়েছে");
  };

  // Voice
  const pickMime = () => {
    const opts = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/mpeg"];
    for (const t of opts) if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) return t;
    return "";
  };
  const startRecording = async () => {
    if (recording || transcribing || loading) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMime();
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        const type = rec.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (blob.size < 1000) { toast.error("রেকর্ডিং খুব ছোট"); return; }
        setTranscribing(true);
        try {
          const buf = await blob.arrayBuffer();
          let bin = "";
          const bytes = new Uint8Array(buf);
          for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
          const b64 = btoa(bin);
          const res = await transcribe({ data: { audioBase64: b64, mimeType: type } });
          const text = res.text?.trim();
          if (text) setInput((prev) => (prev ? prev + " " : "") + text);
          else toast.error("কিছু শোনা গেল না");
        } catch (e) { toast.error(e instanceof Error ? e.message : "ভয়েস রূপান্তর ব্যর্থ"); }
        finally { setTranscribing(false); }
      };
      rec.start();
      recorderRef.current = rec;
      setRecording(true);
    } catch { toast.error("মাইক্রোফোন অনুমতি প্রয়োজন"); }
  };
  const stopRecording = () => {
    if (!recording) return;
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  };
  useEffect(() => () => { streamRef.current?.getTracks().forEach((t) => t.stop()); }, []);

  const grouped = useMemo(() => groupByDate(sessions), [sessions]);

  const Sidebar = (
    <aside className="h-full w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-3 border-b border-gray-100 flex items-center gap-2">
        <span className="text-xl">🌿</span>
        <span className="font-bold text-sm flex-1">কৃষি বন্ধু</span>
        <button
          onClick={() => setSidebarOpen(false)}
          className="md:hidden h-8 w-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
          aria-label="বন্ধ"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-3">
        <button
          onClick={startNewChat}
          className="w-full h-10 rounded-lg bg-[#2D6A4F] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#245840] active:scale-[0.98] transition"
        >
          <Plus className="h-4 w-4" /> নতুন চ্যাট শুরু করুন
        </button>
      </div>
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="চ্যাট খুঁজুন..."
            className="w-full h-9 pl-8 pr-3 rounded-lg bg-gray-100 text-sm outline-none focus:ring-2 focus:ring-[#2D6A4F]/30"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {sessions.length === 0 && (
          <p className="text-xs text-gray-400 text-center mt-6 px-3">কোনো সেভ করা চ্যাট নেই। প্রথম প্রশ্ন করে সেভ করুন।</p>
        )}
        {(["আজ", "গতকাল", "এই সপ্তাহ", "পুরনো"] as const).map((label) =>
          grouped[label].length ? (
            <div key={label} className="mt-3">
              <div className="px-2 text-[10px] font-semibold text-gray-500 tracking-wider uppercase mb-1">{label}</div>
              {grouped[label].map((s) => {
                const active = s.id === sessionId;
                const icon = CATEGORY_ICON[s.category ?? "general"] ?? "🌿";
                return (
                  <div
                    key={s.id}
                    className={`group relative rounded-lg mb-0.5 ${active ? "bg-[#2D6A4F]/10 border-l-2 border-[#2D6A4F]" : "hover:bg-gray-100"}`}
                  >
                    {renamingId === s.id ? (
                      <div className="flex items-center gap-1 px-2 py-1.5">
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") renameSession(s.id); if (e.key === "Escape") setRenamingId(null); }}
                          className="flex-1 min-w-0 h-7 px-2 text-xs rounded border border-gray-300 outline-none"
                        />
                        <button onClick={() => renameSession(s.id)} className="h-7 w-7 rounded hover:bg-gray-200 flex items-center justify-center">
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => openSession(s.id)}
                        className="w-full text-left px-2 py-2 flex items-center gap-2 text-xs text-gray-700"
                      >
                        <span className="text-sm shrink-0">{icon}</span>
                        <span className="truncate flex-1">{s.title}</span>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => { e.stopPropagation(); setMenuOpenFor(menuOpenFor === s.id ? null : s.id); }}
                          className="h-6 w-6 rounded hover:bg-gray-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </span>
                      </button>
                    )}
                    {menuOpenFor === s.id && (
                      <div className="absolute right-2 top-9 z-10 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-40">
                        <button
                          onClick={() => { setRenamingId(s.id); setRenameValue(s.title); setMenuOpenFor(null); }}
                          className="w-full px-3 py-1.5 text-xs text-left flex items-center gap-2 hover:bg-gray-100"
                        >
                          <Pencil className="h-3.5 w-3.5" /> নাম পরিবর্তন
                        </button>
                        <button
                          onClick={() => deleteSession(s.id)}
                          className="w-full px-3 py-1.5 text-xs text-left flex items-center gap-2 hover:bg-gray-100 text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> মুছে ফেলুন
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : null,
        )}
      </div>
    </aside>
  );

  const savedBadge = isSaved && !dirtySinceSave;

  return (
    <div className={`flex min-h-0 overflow-hidden bg-[#F0FFF4] md:h-dvh ${user ? "h-[calc(100dvh-4rem-env(safe-area-inset-bottom))]" : "h-dvh"}`}>
      {/* Desktop sidebar */}
      <div className="hidden md:block shrink-0">{Sidebar}</div>

      {/* Mobile sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 md:hidden transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {Sidebar}
      </div>
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Chat area */}
      <main className="flex min-h-0 min-w-0 w-full flex-1 flex-col">
        <header className="z-10 flex shrink-0 items-center gap-2 border-b bg-white px-3 py-2.5 sm:px-4 sm:py-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden h-9 w-9 rounded-full hover:bg-gray-100 flex items-center justify-center"
            aria-label="মেনু"
          >
            <Menu className="h-5 w-5" />
          </button>
          <button
            onClick={() => navigate({ to: "/ai-bondhu" })}
            className="hidden md:flex h-9 w-9 rounded-full hover:bg-gray-100 items-center justify-center"
            aria-label="ফিরে যান"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="font-bold text-sm sm:text-base truncate">{title}</h1>
            <p className="text-[10px] sm:text-[11px] text-gray-500 truncate">আপনার AI কৃষি সহকারী</p>
          </div>
          {messages.some((m) => m.role === "user") && (
            savedBadge ? (
              <span className="inline-flex items-center gap-1 h-9 px-3 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold">
                <CheckCircle2 className="h-4 w-4 text-green-600" /> সেভ হয়েছে
              </span>
            ) : (
              <button
                onClick={saveChat}
                disabled={saving}
                className="inline-flex items-center gap-1.5 h-9 px-3 sm:px-4 rounded-full bg-[#2D6A4F] text-white text-xs sm:text-sm font-semibold hover:bg-[#245840] active:scale-95 transition disabled:opacity-60 animate-pulse"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                সেভ করুন
              </button>
            )
          )}
        </header>

        <div
          ref={viewportRef}
          onScroll={handleViewportScroll}
          className="min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain px-3 py-3 pb-4 sm:space-y-3 sm:px-4 sm:py-4"
        >
          {messages.map((m, i) => (
            <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
              <div
                className={`max-w-[85%] sm:max-w-[80%] rounded-2xl px-3.5 sm:px-4 py-2 sm:py-2.5 text-[13.5px] sm:text-sm leading-relaxed whitespace-pre-wrap break-words ${
                  m.role === "user" ? "bg-[#2D6A4F] text-white" : "bg-white border border-gray-100 text-gray-800"
                }`}
              >
                {m.content}
              </div>
              {m.role === "assistant" && (
                <div className="mt-1 ml-1 flex items-center gap-2 text-[11px] text-gray-500">
                  <span className="rounded-full bg-gray-100 px-2 py-0.5">
                    {m.source === "cache" ? "সংরক্ষিত উত্তর" : "AI উত্তর"}
                  </span>
                  {m.cacheId && (
                    <>
                      <span>সহায়ক ছিল?</span>
                      <button
                        onClick={() => submitFeedback(i, true)}
                        disabled={!!m.feedback}
                        className={`h-6 w-6 rounded-full flex items-center justify-center border transition ${
                          m.feedback === "up" ? "bg-green-100 border-green-300 text-green-700" : "border-gray-200 hover:bg-gray-100 disabled:opacity-50"
                        }`}
                      >
                        <ThumbsUp className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => submitFeedback(i, false)}
                        disabled={!!m.feedback}
                        className={`h-6 w-6 rounded-full flex items-center justify-center border transition ${
                          m.feedback === "down" ? "bg-red-100 border-red-300 text-red-700" : "border-gray-200 hover:bg-gray-100 disabled:opacity-50"
                        }`}
                      >
                        <ThumbsDown className="h-3 w-3" />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
              </div>
            </div>
          )}
        </div>

        <div
          className="z-20 shrink-0 border-t border-gray-200 bg-white"
        >
          {suggestions.length > 0 && !loading && (
            <div className="px-3 pt-2 pb-1 flex gap-2 overflow-x-auto scrollbar-hide">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendText(s)}
                  className="shrink-0 text-[11px] sm:text-xs px-3 py-1.5 rounded-full bg-[#2D6A4F]/10 text-[#2D6A4F] border border-[#2D6A4F]/20 hover:bg-[#2D6A4F]/20 active:scale-95 transition"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <div className="p-2.5 sm:p-3 flex gap-2 items-center max-w-[900px] mx-auto">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={recording ? "শুনছি..." : transcribing ? "রূপান্তর হচ্ছে..." : "আপনার প্রশ্ন লিখুন..."}
              enterKeyHint="send"
              disabled={recording || transcribing}
              className="flex-1 min-w-0 h-11 px-4 rounded-full bg-gray-100 text-sm outline-none focus:ring-2 focus:ring-[#2D6A4F]/30 disabled:opacity-70"
            />
            <button
              onClick={recording ? stopRecording : startRecording}
              disabled={loading || transcribing}
              className={`h-11 w-11 shrink-0 rounded-full flex items-center justify-center active:scale-95 transition disabled:opacity-50 ${
                recording ? "bg-red-500 text-white animate-pulse" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
              aria-label={recording ? "বন্ধ" : "ভয়েস"}
            >
              {transcribing ? <Loader2 className="h-5 w-5 animate-spin" /> : recording ? <Square className="h-4 w-4" /> : <Mic className="h-5 w-5" />}
            </button>
            <button
              onClick={send}
              disabled={loading || !input.trim() || recording || transcribing}
              className="h-11 w-11 shrink-0 rounded-full bg-[#2D6A4F] text-white flex items-center justify-center disabled:opacity-50 active:scale-95 transition"
              aria-label="পাঠান"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      </main>

      {warning && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setWarning(null)}>
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-base mb-2">⚠️ চ্যাট সেভ হয়নি</h3>
            <p className="text-sm text-gray-600 mb-4">এই কথোপকথন সেভ না করলে হারিয়ে যাবে।</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { const a = warning.action; setWarning(null); a(); }}
                className="h-10 px-4 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100"
              >
                বাদ দিন
              </button>
              <button
                onClick={async () => { setWarning(null); await saveChat(); }}
                className="h-10 px-4 rounded-lg text-sm font-semibold bg-[#2D6A4F] text-white hover:bg-[#245840] inline-flex items-center gap-1.5"
              >
                <Save className="h-4 w-4" /> সেভ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
