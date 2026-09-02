import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { toBusinessDate, businessDateOnly } from "@/lib/time";
import { recordNonSaleConsumption } from "./consumption";
import { recordProduction } from "./issue-production";
import { recordPurchaseReceipt } from "./purchases";
import { setOpeningStock } from "./opening-stock";
import { DomainError } from "./errors";
import {
  cleanupStockTestData,
  setupStockTestData,
  type StockTestCtx,
} from "./test-helpers";

const SCOPE = "guards";

describe("stock movement guards", () => {
  let ctx: StockTestCtx;

  beforeAll(async () => {
    ctx = await setupStockTestData(SCOPE);
  });

  afterAll(async () => {
    await cleanupStockTestData(SCOPE);
    await prisma.$disconnect();
  });

  it("non_sale_consumption reason=other with no reasonNote → VALIDATION_ERROR on reasonNote", async () => {
    await expect(
      recordNonSaleConsumption({
        productId: ctx.productId,
        locationId: ctx.locationIds.store,
        quantity: "2",
        reason: "other",
        recordedById: ctx.recorderId,
      }),
    ).rejects.toMatchObject({
      constructor: DomainError,
      code: "VALIDATION_ERROR",
      field: "reasonNote",
    });
  });

  it("non_sale_consumption reason=other WITH a note → succeeds and stores the note", async () => {
    const r = await recordNonSaleConsumption({
      productId: ctx.productId,
      locationId: ctx.locationIds.store,
      quantity: "2",
      reason: "other",
      reasonNote: "Dropped a sack",
      recordedById: ctx.recorderId,
    });
    expect(r.quantity).toBe("-2.0000");
    expect(r.reason).toBe("other");
    expect(r.reasonNote).toBe("Dropped a sack");
  });

  it("non_sale_consumption with a non-other reason does not require a note", async () => {
    const r = await recordNonSaleConsumption({
      productId: ctx.productId,
      locationId: ctx.locationIds.store,
      quantity: "1",
      reason: "staff_meal",
      recordedById: ctx.recorderId,
    });
    expect(r.reason).toBe("staff_meal");
    expect(r.reasonNote).toBeNull();
  });

  it("recordProduction on a non-dish product → VALIDATION_ERROR", async () => {
    await expect(
      recordProduction({
        productId: ctx.productId, // an ingredient
        locationId: ctx.locationIds.restaurant,
        quantity: "5",
        recordedById: ctx.recorderId,
      }),
    ).rejects.toMatchObject({
      constructor: DomainError,
      code: "VALIDATION_ERROR",
      field: "productId",
    });
  });

  it("recordProduction on a dish product → succeeds", async () => {
    const r = await recordProduction({
      productId: ctx.dishProductId,
      locationId: ctx.locationIds.restaurant,
      quantity: "5",
      recordedById: ctx.recorderId,
    });
    expect(r.quantity).toBe("5.0000");
    expect(r.movementType).toBe("production");
  });

  it("recordPurchaseReceipt with a bogus purchasePaymentId → NOT_FOUND", async () => {
    await expect(
      recordPurchaseReceipt({
        productId: ctx.productId,
        locationId: ctx.locationIds.store,
        quantity: "10",
        purchasePaymentId: "does-not-exist",
        recordedById: ctx.recorderId,
      }),
    ).rejects.toMatchObject({
      constructor: DomainError,
      code: "NOT_FOUND",
      field: "purchasePaymentId",
    });
  });

  it("setOpeningStock a second time for the same product/location/date writes a correction delta, not a second independent opening", async () => {
    const product = await prisma.product.create({
      data: {
        name: `${ctx.prefix} Sugar`,
        kind: "ingredient",
        unitLabel: "kg",
        buyingPrice: 150,
      },
    });
    const locationId = ctx.locationIds.canteen;

    const first = await setOpeningStock({
      productId: product.id,
      locationId,
      businessDate: "2026-08-05",
      quantity: "80",
      recordedById: ctx.recorderId,
    });
    expect(first.quantity).toBe("80.0000");
    expect(first.correctsMovementId).toBeNull();

    const second = await setOpeningStock({
      productId: product.id,
      locationId,
      businessDate: "2026-08-05",
      quantity: "95",
      recordedById: ctx.recorderId,
    });
    // delta to move summed opening 80 → 95
    expect(second.quantity).toBe("15.0000");
    expect(second.correctsMovementId).toBe(first.id);

    const openingRows = await prisma.stockMovement.findMany({
      where: { productId: product.id, locationId, movementType: "opening" },
    });
    expect(openingRows).toHaveLength(2);
    const sum = openingRows.reduce((s, r) => s + Number(r.quantity), 0);
    expect(sum).toBeCloseTo(95, 4);
  });

  it("day-close gate (ADR-52): a new movement on a sealed day → FORBIDDEN", async () => {
    // setOpeningStock takes a business date, so a fixed historical one can
    // be sealed without touching "today".
    const businessDate = "2019-05-20";
    await prisma.dayClose.create({
      data: { date: new Date(`${businessDate}T00:00:00Z`), closedBy: ctx.adminId },
    });
    try {
      await expect(
        setOpeningStock({
          productId: ctx.productId,
          locationId: ctx.locationIds.store,
          businessDate,
          quantity: "5",
          recordedById: ctx.recorderId,
        }),
      ).rejects.toMatchObject({ constructor: DomainError, code: "FORBIDDEN" });
    } finally {
      await prisma.dayClose.deleteMany({
        where: { date: new Date(`${businessDate}T00:00:00Z`) },
      });
    }

    // And a "today" write via the shared `writeMovementLine` chokepoint:
    // seal today (Africa/Nairobi), attempt a receipt, expect FORBIDDEN.
    const todayOnly = businessDateOnly(toBusinessDate(new Date()));
    await prisma.dayClose.create({
      data: { date: todayOnly, closedBy: ctx.adminId },
    });
    try {
      await expect(
        recordPurchaseReceipt({
          productId: ctx.productId,
          locationId: ctx.locationIds.store,
          quantity: "10",
          recordedById: ctx.recorderId,
        }),
      ).rejects.toMatchObject({ constructor: DomainError, code: "FORBIDDEN" });
    } finally {
      await prisma.dayClose.deleteMany({ where: { date: todayOnly } });
    }
  });

  it("rejects a zero / negative magnitude", async () => {
    await expect(
      recordPurchaseReceipt({
        productId: ctx.productId,
        locationId: ctx.locationIds.store,
        quantity: "0",
        recordedById: ctx.recorderId,
      }),
    ).rejects.toMatchObject({
      constructor: DomainError,
      code: "VALIDATION_ERROR",
    });
  });
});
