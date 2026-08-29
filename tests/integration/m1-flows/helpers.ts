// Shared scaffolding for the M1 end-to-end flow tests (TEST_PLAN.md §2,
// flows 4–8). These drive the real Next.js route handlers against the real
// dev Postgres — no browser, no dev server. Auth is the same seam every
// `app/api/**/route.test.ts` file already uses: `vi.mock("next-auth")` with
// a mutable session.
//
// Each flow file owns a unique row prefix and cleans up only its own rows.
import { vi } from "vitest";
import { NextRequest } from "next/server";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * The seed users, resolved by their stable `name` (prisma/seed.ts). Never
 * `findFirst({ where: { role } })` in a flow test — a domain suite running
 * in a parallel file may have created its own same-role user with no staff
 * link and may delete it mid-run. These four are the seed's and are stable.
 */
export const SEED_LOCATIONS = {
  restaurant: "seed-location-restaurant",
  canteen: "seed-location-canteen",
  store: "seed-location-store",
} as const;

export async function seedUsers(): Promise<{
  admin: string;
  storeManager: string;
  cashier: string;
  canteenAttendant: string;
}> {
  const [admin, sm, cashier, canteen] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { name: "Admin" } }),
    prisma.user.findUniqueOrThrow({ where: { name: "Store Manager" } }),
    prisma.user.findUniqueOrThrow({ where: { name: "Cashier" } }),
    prisma.user.findUniqueOrThrow({ where: { name: "Canteen Attendant" } }),
  ]);
  return {
    admin: admin.id,
    storeManager: sm.id,
    cashier: cashier.id,
    canteenAttendant: canteen.id,
  };
}

/** Mutable session the mocked `getServerSession` returns. Set via `actAs`. */
const mockSession = vi.hoisted(() => ({ current: null as unknown }));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(async () => mockSession.current),
}));

export function actAs(user: {
  id: string;
  role: Role;
  name?: string;
  active?: boolean;
}): void {
  mockSession.current = {
    user: {
      id: user.id,
      name: user.name ?? user.role,
      role: user.role,
      active: user.active ?? true,
    },
    expires: "2999-01-01T00:00:00.000Z",
  };
}

export function actAsNobody(): void {
  mockSession.current = null;
}

type RouteResult = { status: number; body: any };

async function run(
  mod: Promise<{ [k: string]: any }>,
  method: string,
  url: string,
  body?: unknown,
  ctx?: unknown,
): Promise<RouteResult> {
  const handlers = await mod;
  const fn = handlers[method];
  if (!fn) throw new Error(`route has no ${method} handler`);
  const req = new NextRequest(`http://test${url}`, {
    method,
    ...(body === undefined
      ? {}
      : { body: JSON.stringify(body), headers: { "content-type": "application/json" } }),
  });
  const res = ctx === undefined ? await fn(req) : await fn(req, ctx);
  let parsed: any = null;
  try {
    parsed = await res.json();
  } catch {
    /* no body */
  }
  return { status: res.status, body: parsed };
}

// ── the M1 routes these flows touch ──────────────────────────────────────

export const api = {
  listProducts: (query = "") =>
    run(import("@/app/api/products/route"), "GET", `/api/products${query}`),

  createMovement: (body: unknown) =>
    run(import("@/app/api/stock-movements/route"), "POST", "/api/stock-movements", body),

  listMovements: (query = "") =>
    run(import("@/app/api/stock-movements/route"), "GET", `/api/stock-movements${query}`),

  balances: (query: string) =>
    run(
      import("@/app/api/stock-movements/balances/route"),
      "GET",
      `/api/stock-movements/balances${query}`,
    ),

  outstanding: () =>
    run(
      import("@/app/api/stock-movements/outstanding/route"),
      "GET",
      "/api/stock-movements/outstanding",
    ),

  correctMovement: (id: string, body: unknown) =>
    run(
      import("@/app/api/stock-movements/[id]/correct/route"),
      "POST",
      `/api/stock-movements/${id}/correct`,
      body,
      { params: Promise.resolve({ id }) },
    ),

  unarchiveProduct: (id: string, mode = "unarchive") =>
    run(
      import("@/app/api/products/[id]/route"),
      "POST",
      `/api/products/${id}?mode=${mode}`,
      undefined,
      { params: Promise.resolve({ id }) },
    ),

  archiveProduct: (id: string) =>
    run(
      import("@/app/api/products/[id]/route"),
      "DELETE",
      `/api/products/${id}?mode=archive`,
      {},
      { params: Promise.resolve({ id }) },
    ),

  hardDeleteProduct: (id: string, confirmName: string) =>
    run(
      import("@/app/api/products/[id]/route"),
      "DELETE",
      `/api/products/${id}`,
      { confirmName },
      { params: Promise.resolve({ id }) },
    ),

  restoreAsset: (id: string) =>
    run(
      import("@/app/api/assets/[id]/restore/route"),
      "POST",
      `/api/assets/${id}/restore`,
      undefined,
      { params: Promise.resolve({ id }) },
    ),

  hardDeleteAsset: (id: string, confirmName: string) =>
    run(
      import("@/app/api/assets/[id]/hard-delete/route"),
      "POST",
      `/api/assets/${id}/hard-delete`,
      { confirmName },
      { params: Promise.resolve({ id }) },
    ),
};
