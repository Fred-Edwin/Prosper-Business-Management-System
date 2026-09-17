import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { getLowOrNegativeStock } from "./needs-attention";

// Self-contained — no shared dashboard test-helpers exist yet. Namespaces
// rows with a unique prefix (the `lib/domain/catalog` pattern) and only
// cleans up its own.
const PREFIX = "__dashboard_low_stock_test__";

async function cleanup(): Promise<void> {
  const products = await prisma.product.findMany({
    where: { name: { startsWith: PREFIX } },
    select: { id: true },
  });
  const productIds = products.map((p) => p.id);
  if (productIds.length > 0) {
    await prisma.stockMovement.deleteMany({ where: { productId: { in: productIds } } });
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
  }
  await prisma.location.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.user.deleteMany({ where: { name: { startsWith: PREFIX } } });
}

describe("getLowOrNegativeStock — per-item threshold", () => {
  let locationId: string;
  let userId: string;

  beforeAll(async () => {
    await cleanup();
    const location = await prisma.location.create({
      data: { name: `${PREFIX} Store`, type: "store" },
    });
    const user = await prisma.user.create({
      data: { name: `${PREFIX} Admin`, pinHash: "x", role: "admin", active: true },
    });
    locationId = location.id;
    userId = user.id;
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  it("flags a product at or below its own threshold, not just at/below zero", async () => {
    const product = await prisma.product.create({
      data: {
        name: `${PREFIX} Rice`,
        kind: "ingredient",
        unitLabel: "kg",
        buyingPrice: "100",
        lowStockThreshold: "10",
      },
    });
    await prisma.stockMovement.create({
      data: {
        productId: product.id,
        locationId,
        movementType: "opening",
        quantity: "8",
        recordedById: userId,
        occurredAt: new Date(),
      },
    });

    const { view } = await getLowOrNegativeStock();
    expect(view.top.some((r) => r.productName === product.name)).toBe(true);
  });

  it("does not flag a product above its threshold, even though it would fail the old qty <= 0 rule's opposite", async () => {
    const product = await prisma.product.create({
      data: {
        name: `${PREFIX} Sugar`,
        kind: "ingredient",
        unitLabel: "kg",
        buyingPrice: "100",
        lowStockThreshold: "10",
      },
    });
    await prisma.stockMovement.create({
      data: {
        productId: product.id,
        locationId,
        movementType: "opening",
        quantity: "50",
        recordedById: userId,
        occurredAt: new Date(),
      },
    });

    const { view } = await getLowOrNegativeStock();
    expect(view.top.some((r) => r.productName === product.name)).toBe(false);
  });

  it("keeps the qty <= 0 default when no threshold is set", async () => {
    const product = await prisma.product.create({
      data: {
        name: `${PREFIX} Salt`,
        kind: "ingredient",
        unitLabel: "kg",
        buyingPrice: "100",
      },
    });
    await prisma.stockMovement.create({
      data: {
        productId: product.id,
        locationId,
        movementType: "opening",
        quantity: "-1",
        recordedById: userId,
        occurredAt: new Date(),
      },
    });

    const { view, countByLocationId } = await getLowOrNegativeStock();
    expect(view.top.some((r) => r.productName === product.name)).toBe(true);
    expect(countByLocationId.get(locationId) ?? 0).toBeGreaterThan(0);
  });
});
