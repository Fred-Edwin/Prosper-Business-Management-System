import { prisma } from "@/lib/db";

/**
 * Shared fixtures for the assets domain tests. Same discipline as
 * `lib/domain/catalog/test-helpers.ts`: vitest runs test *files* in parallel
 * workers against the one local Postgres, so each suite namespaces its rows
 * by a unique `scope` prefix and only ever cleans up its own.
 */

export const TEST_PREFIX_BASE = "__assets_test__";

export type AssetsTestCtx = {
  prefix: string;
  locationIds: { restaurant: string; canteen: string; store: string };
  userId: string;
};

function prefixFor(scope: string): string {
  return `${TEST_PREFIX_BASE}${scope}__`;
}

export async function setupAssetsTestData(
  scope: string,
): Promise<AssetsTestCtx> {
  const prefix = prefixFor(scope);
  await cleanupAssetsTestData(scope);

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
    data: { name: `${prefix} Recorder`, pinHash: "x", role: "admin", active: true },
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

export async function cleanupAssetsTestData(scope: string): Promise<void> {
  const prefix = prefixFor(scope);

  const testAssets = await prisma.asset.findMany({
    where: { name: { startsWith: prefix } },
    select: { id: true },
  });
  const assetIds = testAssets.map((a) => a.id);

  if (assetIds.length > 0) {
    await prisma.auditLog.deleteMany({
      where: { entityType: "asset", entityId: { in: assetIds } },
    });
    await prisma.asset.deleteMany({ where: { id: { in: assetIds } } });
  }

  await prisma.asset.deleteMany({
    where: { location: { name: { startsWith: prefix } } },
  });
  await prisma.location.deleteMany({ where: { name: { startsWith: prefix } } });
  await prisma.user.deleteMany({ where: { name: { startsWith: prefix } } });
}
