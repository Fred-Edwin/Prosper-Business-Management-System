import { prisma } from "@/lib/db";

/**
 * Shared fixtures for the financials domain tests.
 *
 * Vitest runs test *files* in parallel workers against the one local
 * Postgres, so each suite namespaces its rows with a unique `scope` prefix
 * and only ever cleans up its own (the `lib/domain/catalog` pattern). Pass
 * e.g. `"record"`, `"balances"`, `"expenses"`, `"summary"`.
 *
 * The base fixture is a couple of users. `setupFinancialsWorld` layers on
 * three locations + an ingredient / goods / dish product for the tests
 * that exercise the profit chain (expense pairing, COGS, the summary).
 * Cleanup covers everything either helper can create.
 */

export const TEST_PREFIX_BASE = "__financials_test__";

export type FinancialsTestCtx = {
  prefix: string;
  /** An `admin` user — the actor on ledger writes in tests. */
  actorId: string;
  /** A second user — a "different actor" / non-admin (role `cashier`). */
  otherActorId: string;
};

export type FinancialsWorldCtx = FinancialsTestCtx & {
  locationIds: { restaurant: string; canteen: string; store: string };
  /** `ingredient`, buyingPrice 100 — for Dish COGS. */
  ingredientId: string;
  /** `goods`, buyingPrice 40, sells for 60 — for Goods COGS + revenue. */
  goodsId: string;
  /** `dish`, buyingPrice 0, sells for 200 — for restaurant revenue. */
  dishId: string;
};

function prefixFor(scope: string): string {
  return `${TEST_PREFIX_BASE}${scope}__`;
}

export async function setupFinancialsTestData(
  scope: string,
): Promise<FinancialsTestCtx> {
  const prefix = prefixFor(scope);
  await cleanupFinancialsTestData(scope);

  const actor = await prisma.user.create({
    data: { name: `${prefix} Actor`, pinHash: "x", role: "admin", active: true },
  });
  const otherActor = await prisma.user.create({
    data: {
      name: `${prefix} Other`,
      pinHash: "x",
      role: "cashier",
      active: true,
    },
  });

  return { prefix, actorId: actor.id, otherActorId: otherActor.id };
}

/**
 * `setupFinancialsTestData` + three locations and one product of each kind.
 * Used by the expense-pairing, owner-transaction and full-profit-chain
 * suites.
 */
export async function setupFinancialsWorld(
  scope: string,
): Promise<FinancialsWorldCtx> {
  const base = await setupFinancialsTestData(scope);
  const { prefix } = base;

  const restaurant = await prisma.location.create({
    data: { name: `${prefix} Restaurant`, type: "restaurant" },
  });
  const canteen = await prisma.location.create({
    data: { name: `${prefix} Canteen`, type: "canteen" },
  });
  const store = await prisma.location.create({
    data: { name: `${prefix} Store`, type: "store" },
  });

  const ingredient = await prisma.product.create({
    data: {
      name: `${prefix} Flour`,
      kind: "ingredient",
      unitLabel: "kg",
      buyingPrice: 100,
    },
  });
  const goods = await prisma.product.create({
    data: {
      name: `${prefix} Soda`,
      kind: "goods",
      unitLabel: "pcs",
      buyingPrice: 40,
    },
  });
  const dish = await prisma.product.create({
    data: {
      name: `${prefix} Chapati`,
      kind: "dish",
      unitLabel: "pcs",
      buyingPrice: 0,
    },
  });

  return {
    ...base,
    locationIds: {
      restaurant: restaurant.id,
      canteen: canteen.id,
      store: store.id,
    },
    ingredientId: ingredient.id,
    goodsId: goods.id,
    dishId: dish.id,
  };
}

export async function cleanupFinancialsTestData(scope: string): Promise<void> {
  const prefix = prefixFor(scope);

  const users = await prisma.user.findMany({
    where: { name: { startsWith: prefix } },
    select: { id: true },
  });
  const userIds = users.map((u) => u.id);

  const products = await prisma.product.findMany({
    where: { name: { startsWith: prefix } },
    select: { id: true },
  });
  const productIds = products.map((p) => p.id);

  const locations = await prisma.location.findMany({
    where: { name: { startsWith: prefix } },
    select: { id: true },
  });
  const locationIds = locations.map((l) => l.id);

  // Money movements this suite created: by `sourceId` prefix (record/
  // balances suites) OR by `recordedById` (world suites — expense / owner
  // paired rows carry a uuid sourceId).
  const mmBySource = await prisma.moneyMovement.findMany({
    where: { sourceId: { startsWith: prefix } },
    select: { id: true },
  });
  const mmByUser =
    userIds.length > 0
      ? await prisma.moneyMovement.findMany({
          where: { recordedById: { in: userIds } },
          select: { id: true },
        })
      : [];
  const mmIds = [...new Set([...mmBySource, ...mmByUser].map((r) => r.id))];
  if (mmIds.length > 0) {
    await prisma.moneyMovement.updateMany({
      where: { id: { in: mmIds } },
      data: { correctsMovementId: null },
    });
    await prisma.moneyMovement.deleteMany({ where: { id: { in: mmIds } } });
  }

  if (productIds.length > 0 || locationIds.length > 0) {
    const orders = await prisma.order.findMany({
      where: {
        OR: [
          productIds.length > 0
            ? { lines: { some: { productId: { in: productIds } } } }
            : {},
          locationIds.length > 0 ? { locationId: { in: locationIds } } : {},
        ],
      },
      select: { id: true },
    });
    const orderIds = orders.map((o) => o.id);
    if (orderIds.length > 0) {
      await prisma.order.updateMany({
        where: { id: { in: orderIds } },
        data: { correctsOrderId: null },
      });
      await prisma.orderLine.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.debt.deleteMany({ where: { orderId: { in: orderIds } } });
    }
    if (productIds.length > 0) {
      await prisma.stockMovement.updateMany({
        where: { productId: { in: productIds } },
        data: { correctsMovementId: null },
      });
      await prisma.stockMovement.deleteMany({
        where: { productId: { in: productIds } },
      });
    }
    if (locationIds.length > 0) {
      await prisma.stockMovement.deleteMany({
        where: { locationId: { in: locationIds } },
      });
      await prisma.stockCount.deleteMany({
        where: { locationId: { in: locationIds } },
      });
    }
    if (orderIds.length > 0) {
      await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    }
    if (productIds.length > 0) {
      await prisma.productLocation.deleteMany({
        where: { productId: { in: productIds } },
      });
      await prisma.product.deleteMany({ where: { id: { in: productIds } } });
    }
  }

  // Expenses / owner transactions created by this suite's users.
  if (userIds.length > 0) {
    const expenses = await prisma.expense.findMany({
      where: { recordedById: { in: userIds } },
      select: { id: true },
    });
    const expenseIds = expenses.map((e) => e.id);
    if (expenseIds.length > 0) {
      await prisma.expense.updateMany({
        where: { id: { in: expenseIds } },
        data: { correctsExpenseId: null },
      });
      await prisma.expense.deleteMany({ where: { id: { in: expenseIds } } });
    }
  }
  await prisma.ownerTransaction.deleteMany({
    where: { note: { startsWith: prefix } },
  });

  await prisma.dayClose.deleteMany({
    where: { closedBy: { startsWith: prefix } },
  });
  if (locationIds.length > 0) {
    await prisma.location.deleteMany({ where: { id: { in: locationIds } } });
  }

  // AuditLog RESTRICTs on `user_id`; clear by this suite's users.
  if (userIds.length > 0) {
    await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
  }
  await prisma.user.deleteMany({ where: { name: { startsWith: prefix } } });
}
