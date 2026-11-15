import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/public/jobs/krishok-barta")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        const { publishKrishokBarta } = await import("@/lib/krishok-barta-publisher.server");
        return publishKrishokBarta(request);
      },
    },
  },
});