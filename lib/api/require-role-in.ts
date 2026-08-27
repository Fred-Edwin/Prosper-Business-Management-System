import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import type { Role } from "@prisma/client";
import { authOptions } from "@/lib/auth/config";
import { fail } from "@/lib/api/response";
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
