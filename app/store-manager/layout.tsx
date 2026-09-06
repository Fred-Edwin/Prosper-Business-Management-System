import { requireActingRole } from "@/lib/auth/session";
import { StaffShellClient } from "@/components/layout/staff-shell-client";
import { actingLocationName } from "@/lib/auth/acting-location-name";

function initials(name: string): string {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

export default async function StoreManagerLayout({ children }: { children: React.ReactNode }) {
  // `requireActingRole` (not `requireRole`) so an Admin who has switched
  // into Store Manager renders this tree; a real user of another role is
  // redirected to their own home. See role-switching-session-2-handoff.md.
  const session = await requireActingRole("store_manager");

  return (
    <StaffShellClient
      basePath="/store-manager"
      roleLabel="Store Manager"
      locationLabel="Store"
      accountInitials={initials(session.user.name)}
      actingLocationName={await actingLocationName(session)}
    >
      {children}
    </StaffShellClient>
  );
}
