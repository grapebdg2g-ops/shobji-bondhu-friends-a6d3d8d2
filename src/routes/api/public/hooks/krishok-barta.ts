import { createFileRoute } from "@tanstack/react-router";
import { isAuthorizedCronRequest, unauthorizedCronResponse } from "@/lib/cron-auth.server";

// Preserve authentication for the existing unmanaged callback during migration.
export const Route = createFileRoute("/api/public/hooks/krishok-barta")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isAuthorizedCronRequest(request)) return unauthorizedCronResponse();
        const { publishKrishokBarta } = await import("@/lib/krishok-barta-publisher.server");
        return publishKrishokBarta(request);
      },
    },
  },
});
