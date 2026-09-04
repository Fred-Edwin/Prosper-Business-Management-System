import { prisma } from "@/lib/db";

/**
 * Shared fixtures for the stock domain tests.
 *
 * Vitest runs test *files* in parallel workers against the one local
 * Postgres, so each suite namespaces its rows with a unique `scope`
 * prefix and only ever cleans up its own (the `lib/domain/catalog`
 * pattern). Pass e.g. `"derived"`, `"correct"`, `"transfer"`, `"guards"`.
 */

export const TEST_PREFIX_BASE = "__stock_test__";

export type StockTestCtx = {
  prefix: string;
  locationIds: { restaurant: string; canteen: string; store: string };
  /** An `admin` user. */
  adminId: string;
  /** A `store_manager` user (not admin) — the "original recorder" in tests. */
  recorderId: string;
  /** Another non-admin user — a "different staff member". */
  otherStaffId: string;
  /** An `ingredient` product — only ever legal at the Store (ADR-67). */
  productId: string;
  /** A `dish` product — only ever legal at the Restaurant/Canteen. */
  dishProductId: string;
  /** A `goods` product — only ever legal at the Restaurant/Canteen. */
  goodsProductId: string;
};

function prefixFor(scope: string): string {
  return `${TEST_PREFIX_BASE}${scope}__`;
}

export async function setupStockTestData(scope: string): Promise<StockTestCtx> {
  const prefix = prefixFor(scope);
  await cleanupStockTestData(scope);

  const restaurant = await prisma.location.create({
    data: { name: `${prefix} Restaurant`, type: "restaurant" },
  });
  const canteen = await prisma.location.create({
    data: { name: `${prefix} Canteen`, type: "canteen" },
  });
  const store = await prisma.location.create({
    data: { name: `${prefix} Store`, type: "store" },
  });

  const admin = await prisma.user.create({
    data: { name: `${prefix} Admin`, pinHash: "x", role: "admin", active: true },
  });
  const recorder = await prisma.user.create({
    data: {
      name: `${prefix} Recorder`,
      pinHash: "x",
      role: "store_manager",
      active: true,
    },
  });
  const otherStaff = await prisma.user.create({
    data: {
      name: `${prefix} Other`,
      pinHash: "x",
      role: "store_manager",
      active: true,
    },
  });

  const product = await prisma.product.create({
    data: {
      name: `${prefix} Rice`,
      kind: "ingredient",
      unitLabel: "kg",
      buyingPrice: 120,
    },
  });
  const dish = await prisma.product.create({
    data: {
      name: `${prefix} Pilau`,
      kind: "dish",
      unitLabel: "plate",
      buyingPrice: 0,
    },
  });
  const goods = await prisma.product.create({
    data: {
      name: `${prefix} Soda`,
      kind: "goods",
      unitLabel: "pcs",
      buyingPrice: 45,
    },
  });

  return {
    prefix,
    locationIds: {
      restaurant: restaurant.id,
      canteen: canteen.id,
      store: store.id,
    },
    adminId: admin.id,
    recorderId: recorder.id,
    otherStaffId: otherStaff.id,
    productId: product.id,
    dishProductId: dish.id,
    goodsProductId: goods.id,
  };
}

export async function cleanupStockTestData(scope: string): Promise<void> {
  const prefix = prefixFor(scope);

  const testUsers = await prisma.user.findMany({
    where: { name: { startsWith: prefix } },
    select: { id: true },
  });
  const userIds = testUsers.map((u) => u.id);

  const testProducts = await prisma.product.findMany({
    where: { name: { startsWith: prefix } },
    select: { id: true },
  });
  const productIds = testProducts.map((p) => p.id);

  if (productIds.length > 0) {
    const movements = await prisma.stockMovement.findMany({
      where: { productId: { in: productIds } },
      select: { id: true },
    });
    const movementIds = movements.map((m) => m.id);
    // `recordPurchasePayment` now writes a paired `MoneyMovement`
    // (`sourceType: "purchase_payment"`, `sourceId` = the movement id) and
    // that call writes its own `AuditLog` row — clear both before the
    // movements / users (`MoneyMovement.recordedById` and `AuditLog.userId`
    // both RESTRICT).
    if (movementIds.length > 0) {
      await prisma.moneyMovement.deleteMany({
        where: {
          sourceType: "purchase_payment",
          sourceId: { in: movementIds },
        },
      });
    }
    // Correction rows self-reference; clear the pointer before deleting.
    await prisma.stockMovement.updateMany({
      where: { productId: { in: productIds } },
      data: { correctsMovementId: null },
    });
    await prisma.stockMovement.deleteMany({
      where: { productId: { in: productIds } },
    });
    await prisma.productLocation.deleteMany({
      where: { productId: { in: productIds } },
    });
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
  }

  await prisma.dayClose.deleteMany({
    where: { closedBy: { startsWith: prefix } },
  });
  await prisma.location.deleteMany({ where: { name: { startsWith: prefix } } });
  if (userIds.length > 0) {
    await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
  }
  await prisma.user.deleteMany({ where: { name: { startsWith: prefix } } });
}
