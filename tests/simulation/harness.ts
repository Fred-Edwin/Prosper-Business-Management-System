// ═══════════════════════════════════════════════════════════════════════
// Simulation harness — the plumbing the long-horizon suites sit on.
//
// Three jobs:
//   1. AUTH   — a mutable mocked session, so the simulator can act as any
//               role (the same seam tests/integration/m1-flows uses).
//   2. API    — thin wrappers around the REAL Next.js route handlers, so
//               every write goes through Zod validation, the role guard,
//               the day-close gate and the domain, exactly as it does in
//               production. Nothing here talks to Prisma to WRITE.
//   3. CLOCK  — `setBusinessDay` moves vitest's fake clock to a chosen
//               Africa/Nairobi business day. The domain stamps almost
//               every row with `new Date()`, and staff writes are pinned
//               to "today" by `assertStaffDateIsToday`, so moving the
//               clock is the only way to build a multi-day history
//               through the real API without weakening a single guard.
// ═══════════════════════════════════════════════════════════════════════
import { vi } from "vitest";
import { NextRequest } from "next/server";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";

// ── auth ───────────────────────────────────────────────────────────────

const mockSession = vi.hoisted(() => ({ current: null as unknown }));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(async () => mockSession.current),
}));

export type Actor = { id: string; role: Role; name: string };

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

// ── clock ──────────────────────────────────────────────────────────────

/**
 * Move the simulated clock to `HH:mm` on a business date (Africa/Nairobi,
 * fixed UTC+3). Every subsequent domain write stamps `new Date()` at that
 * instant, so it lands on that business day for real — the day-close gate
 * and the staff "today only" rule both evaluate honestly against it.
 *
 * Hours matter: a handover declared at 18:00 must sort after the orders it
 * covers, and `movement-core` filters `occurredAt <= new Date()`, so
 * writes within a day must advance monotonically.
 */
export function setBusinessMoment(businessDate: string, hhmm: string): void {
  vi.setSystemTime(new Date(`${businessDate}T${hhmm}:00+03:00`));
}

// ── route runner ───────────────────────────────────────────────────────

export type RouteResult<T = any> = { status: number; body: T };

async function run(
  mod: Promise<Record<string, any>>,
  method: string,
  url: string,
  body?: unknown,
  ctx?: unknown,
): Promise<RouteResult> {
  const handlers = await mod;
  const fn = handlers[method];
  if (!fn) throw new Error(`route has no ${method} handler`);
  const req = new NextRequest(`http://sim${url}`, {
    method,
    ...(body === undefined
      ? {}
      : {
          body: JSON.stringify(body),
          headers: { "content-type": "application/json" },
        }),
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

/** Throw with the API's own error text unless the call succeeded. */
export function expectOk<T>(label: string, res: RouteResult<T>): T {
  if (res.status >= 200 && res.status < 300) return (res.body as any)?.data ?? res.body;
  throw new Error(
    `${label} failed: ${res.status} ${JSON.stringify(res.body)}`,
  );
}

const params = (p: Record<string, string>) => ({ params: Promise.resolve(p) });

// ── the API surface the simulation drives ──────────────────────────────

export const api = {
  // stock
  createMovement: (b: unknown) =>
    run(import("@/app/api/stock-movements/route"), "POST", "/api/stock-movements", b),
  listMovements: (q = "") =>
    run(import("@/app/api/stock-movements/route"), "GET", `/api/stock-movements${q}`),
  balances: (q = "") =>
    run(import("@/app/api/stock-movements/balances/route"), "GET", `/api/stock-movements/balances${q}`),
  correctMovement: (id: string, b: unknown) =>
    run(import("@/app/api/stock-movements/[id]/correct/route"), "POST", `/api/stock-movements/${id}/correct`, b, params({ id })),
  acceptMovement: (id: string, b: unknown = {}) =>
    run(import("@/app/api/stock-movements/[id]/accept/route"), "POST", `/api/stock-movements/${id}/accept`, b, params({ id })),

  // sales
  createOrder: (b: unknown) =>
    run(import("@/app/api/orders/route"), "POST", "/api/orders", b),
  listOrders: (q = "") =>
    run(import("@/app/api/orders/route"), "GET", `/api/orders${q}`),
  correctOrder: (id: string, b: unknown) =>
    run(import("@/app/api/orders/[id]/correct/route"), "POST", `/api/orders/${id}/correct`, b, params({ id })),

  // canteen
  recordStockCount: (b: unknown) =>
    run(import("@/app/api/canteen/stock-counts/route"), "POST", "/api/canteen/stock-counts", b),
  listStockCounts: (q = "") =>
    run(import("@/app/api/canteen/stock-counts/route"), "GET", `/api/canteen/stock-counts${q}`),

  // money
  recordExpense: (b: unknown) =>
    run(import("@/app/api/expenses/route"), "POST", "/api/expenses", b),
  listExpenses: (q = "") =>
    run(import("@/app/api/expenses/route"), "GET", `/api/expenses${q}`),
  correctExpense: (id: string, b: unknown) =>
    run(import("@/app/api/expenses/[id]/correct/route"), "POST", `/api/expenses/${id}/correct`, b, params({ id })),
  ownerTransaction: (b: unknown) =>
    run(import("@/app/api/owner-transactions/route"), "POST", "/api/owner-transactions", b),
  moneyBalances: (q = "") =>
    run(import("@/app/api/money/balances/route"), "GET", `/api/money/balances${q}`),
  financialSummary: (q: string) =>
    run(import("@/app/api/financials/summary/route"), "GET", `/api/financials/summary${q}`),

  // handovers
  declareHandover: (b: unknown) =>
    run(import("@/app/api/handovers/route"), "POST", "/api/handovers", b),
  listHandovers: (q = "") =>
    run(import("@/app/api/handovers/route"), "GET", `/api/handovers${q}`),
  receiveHandover: (id: string, b: unknown) =>
    run(import("@/app/api/handovers/[id]/receive/route"), "POST", `/api/handovers/${id}/receive`, b, params({ id })),

  // customers / debt
  createCustomer: (b: unknown) =>
    run(import("@/app/api/customers/route"), "POST", "/api/customers", b),
  listCustomers: (q = "") =>
    run(import("@/app/api/customers/route"), "GET", `/api/customers${q}`),
  recordRepayment: (id: string, b: unknown) =>
    run(import("@/app/api/customers/[id]/repayments/route"), "POST", `/api/customers/${id}/repayments`, b, params({ id })),

  // day close
  closeDay: (b: unknown) =>
    run(import("@/app/api/day-close/route"), "POST", "/api/day-close", b),
  listDayCloses: (q = "") =>
    run(import("@/app/api/day-close/route"), "GET", `/api/day-close${q}`),

  // dashboard
  dashboard: (q = "") =>
    run(import("@/app/api/admin/dashboard/route"), "GET", `/api/admin/dashboard${q}`),
  trend: (q = "") =>
    run(import("@/app/api/admin/dashboard/trend/route"), "GET", `/api/admin/dashboard/trend${q}`),
};

// ── cast + fixtures ────────────────────────────────────────────────────

export const LOC = {
  restaurant: "seed-location-restaurant",
  canteen: "seed-location-canteen",
  store: "seed-location-store",
} as const;

export const PRODUCT = {
  rice: "seed-product-rice",
  oil: "seed-product-cooking-oil",
  chicken: "seed-product-chicken-breast",
  chapati: "seed-product-chapati",
  stew: "seed-product-chicken-stew",
  soda: "seed-product-soda-300ml",
  water: "seed-product-water-500ml",
  mandazi: "seed-product-mandazi",
} as const;

export type Cast = {
  admin: Actor;
  storeManager: Actor;
  cashier: Actor;
  cashierTwo: Actor;
  canteen: Actor;
};

export async function loadCast(): Promise<Cast> {
  const byName = async (name: string, role: Role): Promise<Actor> => {
    const u = await prisma.user.findUniqueOrThrow({ where: { name } });
    return { id: u.id, role, name };
  };
  return {
    admin: await byName("Admin", "admin"),
    storeManager: await byName("Store Manager", "store_manager"),
    cashier: await byName("Cashier", "cashier"),
    cashierTwo: await byName("Cashier Two", "cashier"),
    canteen: await byName("Canteen Attendant", "canteen_attendant"),
  };
}

/**
 * Wipe every ledger row, leaving the seed's users / locations / catalogue.
 * Runs before a simulation so a re-run starts from an identical, empty
 * book — the same FK-safe order prisma/seed.ts uses.
 */
export async function resetLedger(): Promise<void> {
  await prisma.$transaction([
    prisma.orderLine.deleteMany(),
    prisma.moneyMovement.deleteMany(),
    prisma.repayment.deleteMany(),
    prisma.debt.deleteMany(),
    prisma.stockMovement.deleteMany(),
    prisma.stockCount.deleteMany(),
    prisma.order.deleteMany(),
    prisma.handoverShortfall.deleteMany(),
    prisma.receiptOfHandover.deleteMany(),
    prisma.handover.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.staffPayout.deleteMany(),
    prisma.expense.deleteMany(),
    prisma.ownerTransaction.deleteMany(),
    prisma.attendance.deleteMany(),
    prisma.staffPayAdjustment.deleteMany(),
    prisma.dayClose.deleteMany(),
    prisma.asset.deleteMany(),
  ]);
  await prisma.auditLog.deleteMany();
}
