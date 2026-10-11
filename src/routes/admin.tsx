import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Shield } from "lucide-react";
import { useUser } from "@/contexts/user-context";
import { useRole } from "@/hooks/use-role";
import { AdminLayoutShell } from "@/components/admin/admin-sidebar";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
  head: () => ({
    meta: [{ title: "অ্যাডমিন প্যানেল — কৃষক বন্ধু" }, { name: "robots", content: "noindex" }],
  }),
});

function AdminLayout() {
  const navigate = useNavigate();
  const { user, loading: userLoading } = useUser();
  const { isAdmin, loading: roleLoading } = useRole();

  useEffect(() => {
    if (!userLoading && !user) navigate({ to: "/login" });
  }, [user, userLoading, navigate]);

  useEffect(() => {
    if (!userLoading && !roleLoading && user && !isAdmin) {
      navigate({ to: "/dashboard" });
    }
  }, [isAdmin, user, userLoading, roleLoading, navigate]);

  if (userLoading || roleLoading) {
    return (
      <main className="p-4 space-y-3">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <Shield className="h-12 w-12 mx-auto text-muted-foreground" />
          <p className="mt-3 font-bold">শুধু প্রশাসকদের জন্য</p>
        </div>
      </main>
    );
  }

  return (
    <AdminLayoutShell>
      <Outlet />
    </AdminLayoutShell>
  );
}
