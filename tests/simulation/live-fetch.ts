// ═══════════════════════════════════════════════════════════════════════
// A `fetch` that goes to the REAL route handlers instead of the network.
//
// This is what closes the gap the ordinary screen specs leave open. Those
// specs mock the per-feature hooks and hand the screen made-up numbers,
// so they prove the screen renders what it is given — never that what it
// is given is correct. Here, nothing between the database and the pixel
// is mocked:
//
//   real DB → real route handler → real hook → real screen component
//
// Only `globalThis.fetch` is replaced, and only to route a same-origin
// `/api/...` URL into the handler module that serves it. A screen that
// sums a column wrong, re-derives a figure in floating point, or applies
// a filter nobody asked for now shows up as a wrong number ON SCREEN.
// ═══════════════════════════════════════════════════════════════════════
import { NextRequest } from "next/server";

type Handler = (req: NextRequest, ctx?: unknown) => Promise<Response>;

/**
 * `/api/...` path → the route module. Add a route here when a screen
 * under test starts calling it; an unmapped path throws loudly rather
 * than silently returning nothing.
 */
const ROUTES: Array<{
  test: RegExp;
  load: () => Promise<Record<string, any>>;
  /** Pull dynamic params out of the path, when the route takes them. */
  params?: (m: RegExpMatchArray) => Record<string, string>;
}> = [
  { test: /^\/api\/financials\/summary/, load: () => import("@/app/api/financials/summary/route") },
  { test: /^\/api\/expenses\/([^/]+)\/correct/, load: () => import("@/app/api/expenses/[id]/correct/route"), params: (m) => ({ id: m[1] }) },
  { test: /^\/api\/expenses/, load: () => import("@/app/api/expenses/route") },
  { test: /^\/api\/owner-transactions/, load: () => import("@/app/api/owner-transactions/route") },
  { test: /^\/api\/handovers\/reconciliation/, load: () => import("@/app/api/handovers/reconciliation/route") },
  { test: /^\/api\/handovers/, load: () => import("@/app/api/handovers/route") },
  { test: /^\/api\/customers/, load: () => import("@/app/api/customers/route") },
  { test: /^\/api\/stock-movements\/outstanding/, load: () => import("@/app/api/stock-movements/outstanding/route") },
  { test: /^\/api\/stock-movements\/balances/, load: () => import("@/app/api/stock-movements/balances/route") },
  { test: /^\/api\/stock-movements/, load: () => import("@/app/api/stock-movements/route") },
  { test: /^\/api\/products/, load: () => import("@/app/api/products/route") },
  { test: /^\/api\/locations/, load: () => import("@/app/api/locations/route") },
  { test: /^\/api\/staff/, load: () => import("@/app/api/staff/route") },
  { test: /^\/api\/orders/, load: () => import("@/app/api/orders/route") },
  { test: /^\/api\/admin\/dashboard\/trend/, load: () => import("@/app/api/admin/dashboard/trend/route") },
  { test: /^\/api\/admin\/dashboard/, load: () => import("@/app/api/admin/dashboard/route") },
  { test: /^\/api\/day-close/, load: () => import("@/app/api/day-close/route") },
  { test: /^\/api\/audit/, load: () => import("@/app/api/audit/route") },
];

/** Paths requested during a run — useful when a screen reads more than expected. */
export const seenPaths: string[] = [];

export function installLiveFetch(): () => void {
  const original = globalThis.fetch;

  globalThis.fetch = (async (input: any, init?: RequestInit) => {
    const raw = typeof input === "string" ? input : input?.url ?? String(input);
    const url = new URL(raw, "http://sim");
    const path = url.pathname + url.search;
    seenPaths.push(path);

    const match = ROUTES.find((r) => r.test.test(url.pathname));
    if (!match) {
      throw new Error(
        `live-fetch: no route mapped for ${url.pathname}. Add it to ROUTES.`,
      );
    }
    const m = url.pathname.match(match.test)!;
    const mod = await match.load();
    const method = (init?.method ?? "GET").toUpperCase();
    const handler = mod[method] as Handler | undefined;
    if (!handler) {
      throw new Error(`live-fetch: ${url.pathname} has no ${method} handler`);
    }

    const req = new NextRequest(`http://sim${path}`, {
      method,
      ...(init?.body === undefined
        ? {}
        : {
            body: init.body as any,
            headers: { "content-type": "application/json" },
          }),
    });
    const ctx = match.params
      ? { params: Promise.resolve(match.params(m)) }
      : undefined;
    return ctx === undefined ? handler(req) : handler(req, ctx);
  }) as typeof fetch;

  return () => {
    globalThis.fetch = original;
  };
}
