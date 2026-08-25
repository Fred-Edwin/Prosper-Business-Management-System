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

  return <AdminShellClient accountInitials={initials(session.user.name)}>{children}</AdminShellClient>;
}
