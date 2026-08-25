import { requireRole } from "@/lib/auth/session";
import { StaffShellClient } from "@/components/layout/staff-shell-client";

function initials(name: string): string {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

export default async function StoreManagerLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("store_manager");

  return (
    <StaffShellClient
      basePath="/store-manager"
      roleLabel="Store Manager"
      locationLabel="Store"
      accountInitials={initials(session.user.name)}
    >
      {children}
    </StaffShellClient>
  );
}
