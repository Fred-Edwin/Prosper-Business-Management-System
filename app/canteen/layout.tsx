import { requireActingRole } from "@/lib/auth/session";
import { StaffShellClient } from "@/components/layout/staff-shell-client";
import { actingLocationName } from "@/lib/auth/acting-location-name";

function initials(name: string): string {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

export default async function CanteenLayout({ children }: { children: React.ReactNode }) {
  // `requireActingRole` — an Admin acting as Canteen Attendant renders this
  // tree. See role-switching-session-2-handoff.md.
  const session = await requireActingRole("canteen_attendant");

  return (
    <StaffShellClient
      basePath="/canteen"
      roleLabel="Canteen Attendant"
      locationLabel="Canteen"
      accountInitials={initials(session.user.name)}
      actingLocationName={await actingLocationName(session)}
    >
      {children}
    </StaffShellClient>
  );
}
