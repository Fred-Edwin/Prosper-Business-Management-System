import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { routePrefixForPath } from "@/lib/auth/roles";

const SESSION_COOKIE_NAME =
  process.env.NODE_ENV === "production"
    ? "__Secure-next-auth.session-token"
    : "next-auth.session-token";

/**
 * Fast-path only: bounces requests with no session cookie at all before
 * they render. This is a UX convenience, NOT the authoritative
 * authorization check — with database sessions (ADR-5) the cookie is an
 * opaque token that can only be verified against the DB. The real role
 * check happens server-side in each route group's layout via
 * `requireRole` (lib/auth/session.ts), per ARCHITECTURE.md's
 * "server-side authorization on every request" rule.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!routePrefixForPath(pathname)) {
    return NextResponse.next();
  }

  const hasSessionCookie = request.cookies.has(SESSION_COOKIE_NAME);

  if (!hasSessionCookie) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/store-manager/:path*", "/cashier/:path*", "/canteen/:path*"],
};
