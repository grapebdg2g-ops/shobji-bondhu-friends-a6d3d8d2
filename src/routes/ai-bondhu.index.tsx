import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Stethoscope, MessageSquareText, CalendarDays, FlaskConical, Sprout, ScanLine, ClipboardList, TrendingUp, ChartNoAxesCombined, BookOpen, NotebookPen, Leaf, CloudSun, Repeat2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/ai-bondhu/")({
  component: AiBondhuHub,
  head: () => ({
    meta: [
      { title: "AI কৃষি সমাধান ও সব টুল — কৃষক বন্ধু" },
      { name: "description", content: "মৃত্তিকা বিশ্লেষণ, ফসল পরিকল্পনা, বাজারদর, দামের পূর্বাভাস, রোগ শনাক্ত ও কৃষি গাইড এক জায়গায়।" },
      { property: "og:title", content: "AI কৃষি সমাধান ও সব টুল — কৃষক বন্ধু" },
      { property: "og:description", content: "মৃত্তিকা বিশ্লেষণ, ফসল পরিকল্পনা, বাজারদর, দামের পূর্বাভাস, রোগ শনাক্ত ও কৃষি গাইড এক জায়গায়।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const TOOL_GROUPS = [
  {
    title: "AI কৃষি সমাধান",
    tone: "bg-secondary text-primary",
    tools: [
      { to: "/ai-bondhu/disease", Icon: Stethoscope, title: "গাছের ডাক্তার" },
      { to: "/ai-bondhu/chat", Icon: MessageSquareText, title: "বলো বন্ধু" },
      { to: "/ai-bondhu/soil", Icon: ScanLine, title: "মৃত্তিকা বিশ্লেষণ" },
      { to: "/ai-bondhu/calculator", Icon: FlaskConical, title: "সার ক্যালকুলেটর" },
      { to: "/price-prediction", Icon: ChartNoAxesCombined, title: "দামের পূর্বাভাস" },
    ],
  },
  {
    title: "ফসল ও পরিকল্পনা",
    tone: "bg-chart-2/15 text-chart-2",
    tools: [
      { to: "/crop-planner", Icon: ClipboardList, title: "ফসল পরিকল্পনা" },
      { to: "/crop-guide", Icon: Sprout, title: "ফসল পরামর্শ" },
      { to: "/crop-diary", Icon: NotebookPen, title: "ফসল ডায়েরি" },
      { to: "/ai-bondhu/calendar", Icon: CalendarDays, title: "চাষের ক্যালেন্ডার" },
      { to: "/vegetable-guide", Icon: BookOpen, title: "সবজি চাষের গাইড" },
    ],
  },
  {
    title: "বাজার ও কৃষি সহায়তা",
    tone: "bg-chart-1/15 text-chart-1",
    tools: [
      { to: "/prices", Icon: TrendingUp, title: "বাজার দর" },
      { to: "/exchange", Icon: Repeat2, title: "বিনিময়" },
      { to: "/weather", Icon: CloudSun, title: "আবহাওয়া" },
      { to: "/ai-bondhu/pesticide", Icon: Sprout, title: "কীটনাশক গাইড" },
      { to: "/organic-fertilizer", Icon: Leaf, title: "জৈব সার গাইড" },
    ],
  },
] as const;

function AiBondhuHub() {
  return (
    <main className="min-h-screen bg-background pb-8 md:mx-auto md:max-w-[560px]">
      <header className="bg-primary px-5 pb-7 pt-8 text-primary-foreground">
        <Button asChild variant="ghost" size="icon" className="rounded-full bg-primary-foreground/15 hover:bg-primary-foreground/25 hover:text-primary-foreground">
          <Link to="/dashboard" aria-label="হোমে ফিরে যান"><ArrowLeft /></Link>
        </Button>
        <h1 className="mt-4 text-2xl font-bold">AI কৃষি সমাধান</h1>
      </header>

      <div className="space-y-6 px-4 pt-5">
        {TOOL_GROUPS.map((group) => (
          <section key={group.title} aria-label={group.title}>
            <h2 className="mb-3 text-base font-bold text-foreground">{group.title}</h2>
            <div className="grid grid-cols-2 gap-3">
              {group.tools.map((tool) => (
                <Button key={tool.to} asChild variant="outline" className="h-auto min-h-[112px] min-w-0 flex-col items-start justify-between gap-3 whitespace-normal rounded-lg border-border bg-card p-4 text-card-foreground shadow-sm hover:bg-muted">
                  <Link to={tool.to}>
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${group.tone}`}><tool.Icon className="!size-5" strokeWidth={2.2} /></span>
                    <span className="flex w-full min-w-0 items-center justify-between gap-1">
                      <span className="break-words text-sm font-bold leading-snug">{tool.title}</span>
                      <ChevronRight className="!size-4 shrink-0 text-muted-foreground" />
                    </span>
                  </Link>
                </Button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}