import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard", replace: true });
  },
  head: () => ({
    meta: [
      { title: "কৃষক বন্ধু — কৃষকের বিশ্বস্ত সঙ্গী" },
      { name: "description", content: "আজকের বাজারদর, ফসল গাইড, কৃষি পরামর্শ ও কৃষক সম্প্রদায়—বাংলায়।" },
      { property: "og:title", content: "কৃষক বন্ধু — কৃষকের বিশ্বস্ত সঙ্গী" },
      { property: "og:description", content: "আজকের বাজারদর, ফসল গাইড, কৃষি পরামর্শ ও কৃষক সম্প্রদায়—বাংলায়।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
