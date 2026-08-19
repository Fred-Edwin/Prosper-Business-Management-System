import { requireRole } from "@/lib/auth/session";
import { SignOutButton } from "@/app/sign-out-button";

// Proof-of-routing shell only — no screens designed yet for this role
// group (see CLAUDE.md's Design/Development/QA process).
export default async function CanteenLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("canteen_attendant");

  return (
    <div>
      <nav>
        <span>Canteen Attendant — {session.user.name}</span>
        <SignOutButton />
      </nav>
      {children}
    </div>
  );
}
