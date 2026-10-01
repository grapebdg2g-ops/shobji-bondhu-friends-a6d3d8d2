import { createFileRoute } from "@tanstack/react-router";
import { AiChatView } from "@/components/krishi/ai-chat-view";

export const Route = createFileRoute("/ai-bondhu/chat/")({
  component: () => <AiChatView />,
  head: () => ({ meta: [
    { title: "নতুন AI চ্যাট — কৃষক বন্ধু" },
    { name: "description", content: "কৃষি বিষয়ক প্রশ্ন করুন এবং কৃষক বন্ধুর AI সহকারীর উত্তর পড়ুন।" },
    { property: "og:title", content: "নতুন AI চ্যাট — কৃষক বন্ধু" },
    { property: "og:description", content: "কৃষি বিষয়ক প্রশ্ন করুন এবং কৃষক বন্ধুর AI সহকারীর উত্তর পড়ুন।" },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});
