import type { Role } from "@prisma/client";

/** Maps each role-scoped route group's URL prefix to the role allowed in it. */
export const ROLE_ROUTE_PREFIXES: Record<string, Role> = {
  "/admin": "admin",
  "/store-manager": "store_manager",
  "/cashier": "cashier",
  "/canteen": "canteen_attendant",
};

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
