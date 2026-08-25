import { requireRole } from "@/lib/auth/session";
import { StaffShellClient } from "@/components/layout/staff-shell-client";

function initials(name: string): string {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

export default async function CanteenLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("canteen_attendant");

  return (
    <StaffShellClient
      basePath="/canteen"
      roleLabel="Canteen Attendant"
      locationLabel="Canteen"
      accountInitials={initials(session.user.name)}
    >
      {children}
    </StaffShellClient>
  );
}
