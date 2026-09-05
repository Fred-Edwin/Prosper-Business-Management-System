import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import type { Role } from "@prisma/client";
import { authOptions } from "@/lib/auth/config";
import { fail } from "@/lib/api/response";
import { effectiveRole } from "@/lib/auth/roles";
import { NextResponse } from "next/server";

/**
 * Multi-role sibling of `requireApiRole` (which takes a single role). F2
 * stock endpoints allow *different* roles per `movementType`, so a handler
 * needs "is the caller any of these roles?".
 *
 * Same contract as `requireApiRole`: returns a `Session` on success, or a
 * `401`/`403` `NextResponse` (CONVENTIONS.md 3 error shape) the handler
 * early-returns:
 *
 *   const auth = await requireApiRoleIn(["store_manager", "canteen_attendant"]);
 *   if (auth instanceof NextResponse) return auth;
 *
 * Mirrors `requireApiRole`'s `active === false` handling.
 */
export async function requireApiRoleIn(
  roles: readonly Role[],
): Promise<Session | NextResponse> {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.active) {
    return fail("UNAUTHENTICATED", "Sign in to continue.");
  }

  if (!roles.includes(session.user.role)) {
    return fail("FORBIDDEN", "You do not have access to this resource.");
  }

  return session;
}

/**
 * `effectiveRole`-aware sibling of `requireApiRoleIn`, for staff-prefix
 * `/api` handlers that allow several staff roles (e.g. the stock
 * endpoints). Compares the acting role, so an Admin who switched into one
 * of `roles` is admitted.
 *
 * As with `requireActingRole`: **not for `/api/admin/*`** — it refuses
 * `"admin"` in `roles` so admin-only routes can't accidentally opt into
 * `effectiveRole` checking.
 */
export async function requireActingRoleIn(
  roles: readonly Exclude<Role, "admin">[],
): Promise<Session | NextResponse> {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.active) {
    return fail("UNAUTHENTICATED", "Sign in to continue.");
  }

  if (!roles.includes(effectiveRole(session) as Exclude<Role, "admin">)) {
    return fail("FORBIDDEN", "You do not have access to this resource.");
  }

  return session;
}
