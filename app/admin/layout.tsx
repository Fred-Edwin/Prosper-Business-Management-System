import { Suspense } from "react";
import { requireRole } from "@/lib/auth/session";
import { AdminShellClient } from "./admin-shell-client";

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("admin");

  // <Suspense> is required because AdminShellClient reads useSearchParams()
  // (to keep the sidebar accordion's active sub-item in sync with `?tab=`).
  return (
    <Suspense fallback={null}>
      <AdminShellClient accountInitials={initials(session.user.name)}>
        {children}
      </AdminShellClient>
    </Suspense>
  );
}
