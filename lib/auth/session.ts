import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { authOptions } from "@/lib/auth/config";
import { roleHomePath } from "@/lib/auth/roles";

/**
 * Authoritative server-side role check for a role-scoped layout/page.
 * Redirects unauthenticated requests to /login, and redirects an
 * authenticated user of the wrong role to their own role's home — never
 * trusts the client/middleware alone (ARCHITECTURE.md principle 4).
 */
export async function requireRole(allowedRole: Role) {
  const session = await getServerSession(authOptions);

  // `active === false` covers a user deactivated mid-token-lifetime — the
  // JWT itself is still technically valid, but the session callback's
  // DB re-check (lib/auth/config.ts) marks it inactive; treat exactly
  // like no session.
  if (!session || !session.user.active) {
    redirect("/login");
  }

  if (session.user.role !== allowedRole) {
    redirect(roleHomePath(session.user.role));
  }

  return session;
}
