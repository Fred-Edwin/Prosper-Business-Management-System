import { requireRole } from "@/lib/auth/session";
import { StaffShellClient } from "@/components/layout/staff-shell-client";

function initials(name: string): string {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

export default async function CashierLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("cashier");

  return (
    <StaffShellClient
      basePath="/cashier"
      roleLabel="Cashier"
      locationLabel="Restaurant"
      accountInitials={initials(session.user.name)}
    >
      {children}
    </StaffShellClient>
  );
}
