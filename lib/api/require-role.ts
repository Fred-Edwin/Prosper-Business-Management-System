import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import type { Role } from "@prisma/client";
import { authOptions } from "@/lib/auth/config";
import { fail } from "@/lib/api/response";
import { effectiveRole } from "@/lib/auth/roles";
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

/**
 * Sibling of `requireApiRole` for the **four staff route-prefixes**
 * (`/api` handlers backing `/store-manager`, `/cashier`, `/canteen`
 * screens). Compares against `effectiveRole(session)` — the acting role —
 * so an Admin who has switched into that role reaches these handlers.
 *
 * **Never use this for `/api/admin/*`.** Admin-only routes must check the
 * real `session.user.role` via `requireApiRole("admin")`; an Admin acting
 * as Store Manager must still pass the Admin guard (otherwise she can't
 * reach the switcher to switch back). This function refuses `"admin"` as
 * `role` to make that mistake impossible.
 */
export async function requireActingRole(
  role: Exclude<Role, "admin">,
): Promise<Session | NextResponse> {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.active) {
    return fail("UNAUTHENTICATED", "Sign in to continue.");
  }

  if (effectiveRole(session) !== role) {
    return fail("FORBIDDEN", "You do not have access to this resource.");
  }

  return session;
}
