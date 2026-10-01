import { createFileRoute } from "@tanstack/react-router";
import { AiChatView } from "@/components/krishi/ai-chat-view";

export const Route = createFileRoute("/ai-bondhu/chat/$sessionId")({
  component: RouteComp,
  head: () => ({ meta: [
    { title: "সংরক্ষিত AI চ্যাট — কৃষক বন্ধু" },
    { name: "description", content: "কৃষক বন্ধুর সংরক্ষিত কৃষি পরামর্শের কথোপকথন পড়ুন।" },
    { property: "og:title", content: "সংরক্ষিত AI চ্যাট — কৃষক বন্ধু" },
    { property: "og:description", content: "কৃষক বন্ধুর সংরক্ষিত কৃষি পরামর্শের কথোপকথন পড়ুন।" },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

function RouteComp() {
  const { sessionId } = Route.useParams();
  return <AiChatView sessionId={sessionId} />;
}
