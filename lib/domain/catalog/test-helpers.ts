import { prisma } from "@/lib/db";

/**
 * Shared fixtures for the catalog domain tests.
 *
 * Vitest runs test *files* in parallel workers against the one local
 * Postgres, so each suite must namespace its rows and only ever clean up
 * its own — otherwise one suite's `cleanup` deletes locations another
 * suite is mid-use of. Pass a unique `scope` per test file (e.g.
 * `"create"`, `"update"`, `"delete"`); it becomes the row-name prefix.
 */

export const TEST_PREFIX_BASE = "__catalog_test__";

export type CatalogTestCtx = {
  prefix: string;
  locationIds: { restaurant: string; canteen: string; store: string };
  userId: string;
};

function prefixFor(scope: string): string {
  return `${TEST_PREFIX_BASE}${scope}__`;
}

export async function setupCatalogTestData(scope: string): Promise<CatalogTestCtx> {
  const prefix = prefixFor(scope);
  await cleanupCatalogTestData(scope);

  const restaurant = await prisma.location.create({
    data: { name: `${prefix} Restaurant`, type: "restaurant" },
  });
  const canteen = await prisma.location.create({
    data: { name: `${prefix} Canteen`, type: "canteen" },
  });
  const store = await prisma.location.create({
    data: { name: `${prefix} Store`, type: "store" },
  });
  const user = await prisma.user.create({
    data: {
      name: `${prefix} Recorder`,
      pinHash: "x",
      role: "admin",
      active: true,
    },
  });

  return {
    prefix,
    locationIds: {
      restaurant: restaurant.id,
      canteen: canteen.id,
      store: store.id,
    },
    userId: user.id,
  };
}

export async function cleanupCatalogTestData(scope: string): Promise<void> {
  const prefix = prefixFor(scope);

  const testProducts = await prisma.product.findMany({
    where: { name: { startsWith: prefix } },
    select: { id: true },
  });
  const productIds = testProducts.map((p) => p.id);

  if (productIds.length > 0) {
    await prisma.stockMovement.deleteMany({ where: { productId: { in: productIds } } });
    await prisma.orderLine.deleteMany({ where: { productId: { in: productIds } } });
    await prisma.stockCount.deleteMany({ where: { productId: { in: productIds } } });
    await prisma.productLocation.deleteMany({ where: { productId: { in: productIds } } });
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
  }

  await prisma.order.deleteMany({
    where: { location: { name: { startsWith: prefix } } },
  });
  await prisma.location.deleteMany({ where: { name: { startsWith: prefix } } });
  await prisma.user.deleteMany({ where: { name: { startsWith: prefix } } });
}
