import { createFileRoute, redirect } from "@tanstack/react-router";

// Merged into /crop-guide (one "আমার ফসল" list with tabs and safe delete).
export const Route = createFileRoute("/crop-planner/my-plans")({
  beforeLoad: () => {
    throw redirect({ to: "/crop-guide" });
  },
});
