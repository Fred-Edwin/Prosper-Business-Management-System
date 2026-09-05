import type { Role } from "@prisma/client";

/** Maps each role-scoped route group's URL prefix to the role allowed in it. */
export const ROLE_ROUTE_PREFIXES: Record<string, Role> = {
  "/admin": "admin",
  "/store-manager": "store_manager",
  "/cashier": "cashier",
  "/canteen": "canteen_attendant",
};

/**
 * The **one** place "which role is this session acting as right now?" is
 * computed (mirrors ADR-52's "one rule, one place" for day-close). For a
 * real staff user this is just their role; for an Admin who has switched
 * into a staff role's screens it is that staff role. The real identity
 * (`session.user.role`) is never overwritten.
 *
 * Admin-only guards (`requireApiRole("admin")` and friends) must keep
 * checking the *real* `session.user.role`, never this — otherwise an
 * Admin acting as Store Manager would be locked out of the switcher
 * itself. Only the four staff route-prefixes and role-scoped domain
 * guards compare against `effectiveRole`.
 */
export function effectiveRole(session: {
  user: { role: Role; actingAs: Role | null };
}): Role {
  return session.user.actingAs ?? session.user.role;
}

export function roleHomePath(role: Role): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "store_manager":
      return "/store-manager";
    case "cashier":
      return "/cashier";
    case "canteen_attendant":
      return "/canteen";
  }
}

export function routePrefixForPath(pathname: string): string | undefined {
  return Object.keys(ROLE_ROUTE_PREFIXES).find(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/** True when `role` is permitted to access `pathname`. Paths outside any
 * role-scoped prefix (e.g. `/login`) are always allowed. */
export function isRoleAllowed(role: Role, pathname: string): boolean {
  const prefix = routePrefixForPath(pathname);
  if (!prefix) return true;
  return ROLE_ROUTE_PREFIXES[prefix] === role;
}
