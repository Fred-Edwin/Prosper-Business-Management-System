import { requireActingRole } from "@/lib/auth/session";
import { StaffShellClient } from "@/components/layout/staff-shell-client";
import { actingLocationName } from "@/lib/auth/acting-location-name";

function initials(name: string): string {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

export default async function CashierLayout({ children }: { children: React.ReactNode }) {
  // `requireActingRole` — an Admin acting as Cashier renders this tree.
  // See role-switching-session-2-handoff.md.
  const session = await requireActingRole("cashier");

  return (
    <StaffShellClient
      basePath="/cashier"
      roleLabel="Cashier"
      locationLabel="Restaurant"
      accountInitials={initials(session.user.name)}
      actingLocationName={await actingLocationName(session)}
    >
      {children}
    </StaffShellClient>
  );
}
