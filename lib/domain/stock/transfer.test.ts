import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import {
  recordTransfer,
  acceptTransfer,
  flagTransfer,
} from "./transfer";
import { setOpeningStock } from "./opening-stock";
import { getDerivedStockBalance } from "./derived-balance";
import { DomainError } from "./errors";
import {
  cleanupStockTestData,
  setupStockTestData,
  type StockTestCtx,
} from "./test-helpers";

const SCOPE = "transfer";

describe("recordTransfer (2-phase)", () => {
  let ctx: StockTestCtx;

  beforeAll(async () => {
    ctx = await setupStockTestData(SCOPE);
  });

  afterAll(async () => {
    await cleanupStockTestData(SCOPE);
    await prisma.$disconnect();
  });

  async function freshProductWithOpening(qty: string, locationId: string) {
    const p = await prisma.product.create({
      data: {
        name: `${ctx.prefix} P-${Math.random().toString(36).slice(2)}`,
        kind: "ingredient",
        unitLabel: "kg",
        buyingPrice: 100,
      },
    });
    await setOpeningStock({
      productId: p.id,
      locationId,
      businessDate: "2026-08-01",
      quantity: qty,
      recordedById: ctx.recorderId,
    });
    return p.id;
  }

  it("phase 1 writes one −q row at `from`; balance leaves `from` and does NOT yet land at `to`", async () => {
    const { store, canteen } = ctx.locationIds;
    const productId = await freshProductWithOpening("100", store);

    const dispatch = await recordTransfer({
      productId,
      fromLocationId: store,
      toLocationId: canteen,
      quantity: "30",
      recordedById: ctx.recorderId,
    });

    expect(dispatch.quantity).toBe("-30.0000");
    expect(dispatch.transferCounterpartLocationId).toBe(canteen);
    expect(dispatch.correctsMovementId).toBeNull();

    const fromBal = await getDerivedStockBalance({ productId, locationId: store });
    const toBal = await getDerivedStockBalance({ productId, locationId: canteen });
    expect(fromBal.quantity).toBe("70.0000"); // 100 − 30
    expect(toBal.quantity).toBe("0.0000"); // nothing yet
  });

  it("phase 2 writes the +q counterpart at `to`, linked to the dispatch; balance lands only now", async () => {
    const { store, canteen } = ctx.locationIds;
    const productId = await freshProductWithOpening("100", store);

    const dispatch = await recordTransfer({
      productId,
      fromLocationId: store,
      toLocationId: canteen,
      quantity: "40",
      recordedById: ctx.recorderId,
    });
    const accepted = await acceptTransfer({
      movementId: dispatch.id,
      recordedById: ctx.otherStaffId,
    });

    expect(accepted.quantity).toBe("40.0000");
    expect(accepted.locationId).toBe(canteen);
    expect(accepted.transferCounterpartLocationId).toBe(store);
    expect(accepted.correctsMovementId).toBe(dispatch.id);

    const fromBal = await getDerivedStockBalance({ productId, locationId: store });
    const toBal = await getDerivedStockBalance({ productId, locationId: canteen });
    expect(fromBal.quantity).toBe("60.0000");
    expect(toBal.quantity).toBe("40.0000");
  });

  it("accepting twice is a CONFLICT", async () => {
    const { store, canteen } = ctx.locationIds;
    const productId = await freshProductWithOpening("50", store);
    const dispatch = await recordTransfer({
      productId,
      fromLocationId: store,
      toLocationId: canteen,
      quantity: "10",
      recordedById: ctx.recorderId,
    });
    await acceptTransfer({ movementId: dispatch.id, recordedById: ctx.otherStaffId });
    await expect(
      acceptTransfer({ movementId: dispatch.id, recordedById: ctx.otherStaffId }),
    ).rejects.toMatchObject({ constructor: DomainError, code: "CONFLICT" });
  });

  it("flagging records a note on the pending row and releases no stock", async () => {
    const { store, canteen } = ctx.locationIds;
    const productId = await freshProductWithOpening("50", store);
    const dispatch = await recordTransfer({
      productId,
      fromLocationId: store,
      toLocationId: canteen,
      quantity: "10",
      recordedById: ctx.recorderId,
    });

    const flagged = await flagTransfer({
      movementId: dispatch.id,
      note: "Only 8 arrived",
      recordedById: ctx.otherStaffId,
    });
    expect(flagged.note).toContain("Only 8 arrived");

    const toBal = await getDerivedStockBalance({ productId, locationId: canteen });
    expect(toBal.quantity).toBe("0.0000");
  });

  it("rejects a transfer with the same from/to location", async () => {
    const { store } = ctx.locationIds;
    const productId = await freshProductWithOpening("10", store);
    await expect(
      recordTransfer({
        productId,
        fromLocationId: store,
        toLocationId: store,
        quantity: "1",
        recordedById: ctx.recorderId,
      }),
    ).rejects.toMatchObject({
      constructor: DomainError,
      code: "VALIDATION_ERROR",
    });
  });
});
