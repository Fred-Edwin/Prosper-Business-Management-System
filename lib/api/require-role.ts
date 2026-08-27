import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import type { Role } from "@prisma/client";
import { authOptions } from "@/lib/auth/config";
import { fail } from "@/lib/api/response";
import type { NextResponse } from "next/server";

/**
 * API-route equivalent of `lib/auth/session.ts`'s `requireRole`.
 *
 * Where the page-level guard *redirects*, this returns a `401`/`403`
 * `NextResponse` in the CONVENTIONS.md §3 error shape. Handlers call it
 * first and early-return the response when it isn't a `Session`:
 *
 *   const auth = await requireApiRole("admin");
 *   if (auth instanceof NextResponse) return auth;
 *   // ...auth is a Session from here on
 *
 * Mirrors `requireRole`'s `active === false` handling — a user deactivated
 * mid-token-lifetime is treated exactly like no session.
 */
export async function requireApiRole(
  role: Role,
): Promise<Session | NextResponse> {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.active) {
    return fail("UNAUTHENTICATED", "Sign in to continue.");
  }

  if (session.user.role !== role) {
    return fail("FORBIDDEN", "You do not have access to this resource.");
  }

  return session;
}
