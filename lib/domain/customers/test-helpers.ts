import { prisma } from "@/lib/db";

/**
 * Shared fixtures for the customers domain tests.
 *
 * Vitest runs test files in parallel workers against the one local
 * Postgres, so each suite namespaces its rows with a unique `scope` prefix
 * and only ever cleans up its own (the `lib/domain/catalog` pattern).
 *
 * A `Debt` needs an `Order` (FK), which needs a `Location` and a cashier
 * `User` — so the fixture builds a restaurant location plus admin/cashier
 * users. `makeDebt` / `makeRepayment` helpers write ledger rows directly
 * (S4 owns real `createOrder`; here we only need `Debt` rows to derive
 * balances from).
 */

import { Prisma } from "@prisma/client";

export const TEST_PREFIX_BASE = "__customers_test__";

export type CustomersTestCtx = {
  prefix: string;
  restaurantId: string;
  adminId: string;
  cashierId: string;
};

function prefixFor(scope: string): string {
  return `${TEST_PREFIX_BASE}${scope}__`;
}

export async function setupCustomersTestData(
  scope: string,
): Promise<CustomersTestCtx> {
  const prefix = prefixFor(scope);
  await cleanupCustomersTestData(scope);

  const restaurant = await prisma.location.create({
    data: { name: `${prefix} Restaurant`, type: "restaurant" },
  });
  const admin = await prisma.user.create({
    data: { name: `${prefix} Admin`, pinHash: "x", role: "admin", active: true },
  });
  const cashier = await prisma.user.create({
    data: {
      name: `${prefix} Cashier`,
      pinHash: "x",
      role: "cashier",
      active: true,
    },
  });

  return {
    prefix,
    restaurantId: restaurant.id,
    adminId: admin.id,
    cashierId: cashier.id,
  };
}

/**
 * Create a placeholder `Order` (no lines) so a `Debt` can FK to it. S4
 * builds real orders; these tests only need a debt to sum.
 */
export async function makeOrder(
  ctx: CustomersTestCtx,
  customerId: string,
  total: string,
): Promise<string> {
  const order = await prisma.order.create({
    data: {
      locationId: ctx.restaurantId,
      cashierId: ctx.cashierId,
      orderType: "takeaway",
      paymentMethod: "credit",
      customerId,
      total: new Prisma.Decimal(total),
    },
  });
  return order.id;
}

export async function makeDebt(
  ctx: CustomersTestCtx,
  customerId: string,
  amount: string,
  occurredAt: Date,
): Promise<{ debtId: string; orderId: string }> {
  const orderId = await makeOrder(ctx, customerId, amount);
  const debt = await prisma.debt.create({
    data: {
      customerId,
      orderId,
      amount: new Prisma.Decimal(amount),
      occurredAt,
    },
  });
  return { debtId: debt.id, orderId };
}

export async function cleanupCustomersTestData(scope: string): Promise<void> {
  const prefix = prefixFor(scope);

  const users = await prisma.user.findMany({
    where: { name: { startsWith: prefix } },
    select: { id: true },
  });
  const userIds = users.map((u) => u.id);

  const customers = await prisma.customer.findMany({
    where: { name: { startsWith: prefix } },
    select: { id: true },
  });
  const customerIds = customers.map((c) => c.id);

  if (customerIds.length > 0) {
    const repayments = await prisma.repayment.findMany({
      where: { customerId: { in: customerIds } },
      select: { id: true },
    });
    const repaymentIds = repayments.map((r) => r.id);

    await prisma.moneyMovement.deleteMany({
      where: { sourceType: "repayment", sourceId: { in: repaymentIds } },
    });
    await prisma.repayment.deleteMany({
      where: { customerId: { in: customerIds } },
    });
    await prisma.debt.deleteMany({
      where: { customerId: { in: customerIds } },
    });
    await prisma.order.deleteMany({
      where: { customerId: { in: customerIds } },
    });
    await prisma.customer.deleteMany({ where: { id: { in: customerIds } } });
  }

  await prisma.order.deleteMany({
    where: { location: { name: { startsWith: prefix } } },
  });
  await prisma.location.deleteMany({ where: { name: { startsWith: prefix } } });

  // AuditLog RESTRICTs on `user_id`; every audit row this suite wrote
  // (customer / repayment / money_movement) belongs to one of its users,
  // so clearing by `userId` is both complete and self-scoped.
  if (userIds.length > 0) {
    await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
  }
  await prisma.user.deleteMany({ where: { name: { startsWith: prefix } } });
}
