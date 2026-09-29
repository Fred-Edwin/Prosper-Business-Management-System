import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { recordTransfer, acceptTransfer } from "./transfer";
import { setOpeningStock } from "./opening-stock";
import { getDerivedStockBalance } from "./derived-balance";
import { correctMovement } from "./correct-movement";
import { DomainError } from "./errors";
import {
  cleanupStockTestData,
  setupStockTestData,
  type StockTestCtx,
} from "./test-helpers";

// ADR-94 (client report 2026-09-29, mandazi 24 Sep): correcting a transfer
// moves BOTH legs, measures "current value" at the target's own location,
// never makes a dispatch look accepted, and keeps the leg's sign.

const SCOPE = "correct-transfer";

describe("correctMovement on a transfer", () => {
  let ctx: StockTestCtx;
  const admin = () => ({ userId: ctx.adminId, role: "admin" as const, locationId: null });

  beforeAll(async () => {
    ctx = await setupStockTestData(SCOPE);
  });

  afterAll(async () => {
    await cleanupStockTestData(SCOPE);
    await prisma.$disconnect();
  });

  async function freshProduct(opening = "120") {
    const p = await prisma.product.create({
      data: {
        name: `${ctx.prefix} P-${Math.random().toString(36).slice(2)}`,
        kind: "goods",
        unitLabel: "pcs",
        buyingPrice: 10,
      },
    });
    await setOpeningStock({
      productId: p.id,
      locationId: ctx.locationIds.restaurant,
      businessDate: "2026-08-01",
      quantity: opening,
      recordedById: ctx.recorderId,
    });
    return p.id;
  }

  async function balances(productId: string) {
    const { restaurant, canteen } = ctx.locationIds;
    const [r, c] = await Promise.all([
      getDerivedStockBalance({ productId, locationId: restaurant }),
      getDerivedStockBalance({ productId, locationId: canteen }),
    ]);
    return { restaurant: r.quantity, canteen: c.quantity };
  }

  async function sendAndAccept(productId: string, qty: string) {
    const { restaurant, canteen } = ctx.locationIds;
    const dispatch = await recordTransfer({
      productId,
      fromLocationId: restaurant,
      toLocationId: canteen,
      quantity: qty,
      recordedById: ctx.recorderId,
    });
    const receipt = await acceptTransfer({
      movementId: dispatch.id,
      recordedById: ctx.adminId,
    });
    return { dispatch, receipt };
  }

  it("accepted -95 corrected to -67 on the dispatch: +28 at sender, -28 at receiver", async () => {
    const productId = await freshProduct();
    const { dispatch, receipt } = await sendAndAccept(productId, "95");

    const delta = await correctMovement(
      { movementId: dispatch.id, correctedQuantity: "-67", recordedById: ctx.adminId },
      admin(),
    );

    // Before the fix this was -67: the receiver's +95 was counted as a
    // delta, so "current value" read 0 instead of -95.
    expect(delta.quantity).toBe("28.0000");
    expect(await balances(productId)).toEqual({
      restaurant: "53.0000", // 120 − 67
      canteen: "67.0000",
    });

    const mirror = await prisma.stockMovement.findFirstOrThrow({
      where: { correctsMovementId: receipt.id, locationId: ctx.locationIds.canteen },
    });
    expect(mirror.quantity.toFixed(4)).toBe("-28.0000");
    expect(mirror.movementType).toBe("transfer");

    // Re-submitting the same figure is a no-op, not a second delta.
    await expect(
      correctMovement(
        { movementId: dispatch.id, correctedQuantity: "-67", recordedById: ctx.adminId },
        admin(),
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("the receiver leg can be corrected too, and moves the sender with it", async () => {
    const productId = await freshProduct();
    const { dispatch, receipt } = await sendAndAccept(productId, "95");

    const delta = await correctMovement(
      { movementId: receipt.id, correctedQuantity: "67", recordedById: ctx.adminId },
      admin(),
    );

    expect(delta.quantity).toBe("-28.0000");
    expect(delta.locationId).toBe(ctx.locationIds.canteen);
    expect(await balances(productId)).toEqual({
      restaurant: "53.0000",
      canteen: "67.0000",
    });

    // The sender side now reads -67 when corrected from there.
    await expect(
      correctMovement(
        { movementId: dispatch.id, correctedQuantity: "-67", recordedById: ctx.adminId },
        admin(),
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("a pending dispatch: correcting it moves only the sender, and it can still be accepted at the corrected amount", async () => {
    const productId = await freshProduct();
    const dispatch = await recordTransfer({
      productId,
      fromLocationId: ctx.locationIds.restaurant,
      toLocationId: ctx.locationIds.canteen,
      quantity: "95",
      recordedById: ctx.recorderId,
    });

    await correctMovement(
      { movementId: dispatch.id, correctedQuantity: "-67", recordedById: ctx.adminId },
      admin(),
    );
    expect(await balances(productId)).toEqual({
      restaurant: "53.0000",
      canteen: "0.0000",
    });

    // Before the fix the correction row counted as an acceptance: CONFLICT.
    const receipt = await acceptTransfer({
      movementId: dispatch.id,
      recordedById: ctx.adminId,
    });
    expect(receipt.quantity).toBe("67.0000");
    expect(await balances(productId)).toEqual({
      restaurant: "53.0000",
      canteen: "67.0000",
    });
  });

  it("keeps the leg's sign: 67 on a Transfer Out is rejected, nothing written", async () => {
    const productId = await freshProduct();
    const { dispatch } = await sendAndAccept(productId, "95");

    const err = await correctMovement(
      { movementId: dispatch.id, correctedQuantity: "67", recordedById: ctx.adminId },
      admin(),
    ).catch((e) => e);
    expect(err).toBeInstanceOf(DomainError);
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(await balances(productId)).toEqual({
      restaurant: "25.0000",
      canteen: "95.0000",
    });
  });

  it("zero voids the transfer on both sides", async () => {
    const productId = await freshProduct();
    const { dispatch } = await sendAndAccept(productId, "95");

    await correctMovement(
      { movementId: dispatch.id, correctedQuantity: "0", recordedById: ctx.adminId },
      admin(),
    );
    expect(await balances(productId)).toEqual({
      restaurant: "120.0000",
      canteen: "0.0000",
    });
  });

  it("a correction delta still can't itself be corrected", async () => {
    const productId = await freshProduct();
    const { dispatch } = await sendAndAccept(productId, "95");
    const delta = await correctMovement(
      { movementId: dispatch.id, correctedQuantity: "-67", recordedById: ctx.adminId },
      admin(),
    );

    await expect(
      correctMovement(
        { movementId: delta.id, correctedQuantity: "-60", recordedById: ctx.adminId },
        admin(),
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});
