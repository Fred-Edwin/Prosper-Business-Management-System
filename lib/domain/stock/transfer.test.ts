import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import {
  recordTransfer,
  recordTransferBatch,
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

  // Under the location↔kind model (ADR-67) a transfer is Restaurant↔Canteen
  // and moves dish/goods only — so the fixture stocks a `goods` product at
  // the Restaurant and every transfer below runs Restaurant → Canteen.
  async function freshProductWithOpening(
    qty: string,
    locationId: string = ctx.locationIds.restaurant,
  ) {
    const p = await prisma.product.create({
      data: {
        name: `${ctx.prefix} P-${Math.random().toString(36).slice(2)}`,
        kind: "goods",
        unitLabel: "pcs",
        buyingPrice: 45,
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
    const { restaurant, canteen } = ctx.locationIds;
    const productId = await freshProductWithOpening("100", restaurant);

    const dispatch = await recordTransfer({
      productId,
      fromLocationId: restaurant,
      toLocationId: canteen,
      quantity: "30",
      recordedById: ctx.recorderId,
    });

    expect(dispatch.quantity).toBe("-30.0000");
    expect(dispatch.transferCounterpartLocationId).toBe(canteen);
    expect(dispatch.correctsMovementId).toBeNull();

    const fromBal = await getDerivedStockBalance({ productId, locationId: restaurant });
    const toBal = await getDerivedStockBalance({ productId, locationId: canteen });
    expect(fromBal.quantity).toBe("70.0000"); // 100 − 30
    expect(toBal.quantity).toBe("0.0000"); // nothing yet
  });

  it("phase 2 writes the +q counterpart at `to`, linked to the dispatch; balance lands only now", async () => {
    const { restaurant, canteen } = ctx.locationIds;
    const productId = await freshProductWithOpening("100", restaurant);

    const dispatch = await recordTransfer({
      productId,
      fromLocationId: restaurant,
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
    expect(accepted.transferCounterpartLocationId).toBe(restaurant);
    expect(accepted.correctsMovementId).toBe(dispatch.id);

    const fromBal = await getDerivedStockBalance({ productId, locationId: restaurant });
    const toBal = await getDerivedStockBalance({ productId, locationId: canteen });
    expect(fromBal.quantity).toBe("60.0000");
    expect(toBal.quantity).toBe("40.0000");
  });

  it("accepting twice is a CONFLICT", async () => {
    const { restaurant, canteen } = ctx.locationIds;
    const productId = await freshProductWithOpening("50", restaurant);
    const dispatch = await recordTransfer({
      productId,
      fromLocationId: restaurant,
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
    const { restaurant, canteen } = ctx.locationIds;
    const productId = await freshProductWithOpening("50", restaurant);
    const dispatch = await recordTransfer({
      productId,
      fromLocationId: restaurant,
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

  it("accept with a lower receivedQuantity lands the +q at what arrived; neither balance is over/understated", async () => {
    const { restaurant, canteen } = ctx.locationIds;
    const productId = await freshProductWithOpening("100", restaurant);

    const dispatch = await recordTransfer({
      productId,
      fromLocationId: restaurant,
      toLocationId: canteen,
      quantity: "30",
      recordedById: ctx.recorderId,
    });

    const accepted = await acceptTransfer({
      movementId: dispatch.id,
      receivedQuantity: "28",
      recordedById: ctx.otherStaffId,
    });

    // F6 (owner decision 2026-09-02): a short accept is booked as a PAIR at
    // the destination — the receipt lands the full dispatched 30, and a
    // `variance` row writes the missing 2 off. Balances are unchanged from
    // the old single-row behaviour; the difference is that the loss is now
    // a row a total can sum, instead of free text on the accept note.
    expect(accepted.quantity).toBe("30.0000");
    expect(accepted.correctsMovementId).toBe(dispatch.id);
    expect(accepted.note).toContain("Received 28");
    expect(accepted.note).toContain("dispatched 30");

    const varianceRows = await prisma.stockMovement.findMany({
      where: { productId, movementType: "variance" },
    });
    expect(varianceRows).toHaveLength(1);
    expect(varianceRows[0].quantity.toFixed(4)).toBe("-2.0000");
    expect(varianceRows[0].locationId).toBe(canteen);
    // Traceable back to where it was sent from, without claiming the
    // `correctsMovementId` link that marks a dispatch accepted.
    expect(varianceRows[0].transferCounterpartLocationId).toBe(restaurant);
    expect(varianceRows[0].correctsMovementId).toBeNull();

    // Source dropped by the full 30 that physically left; destination nets
    // the 28 that physically arrived (+30 receipt, −2 written off).
    const fromBal = await getDerivedStockBalance({ productId, locationId: restaurant });
    const toBal = await getDerivedStockBalance({ productId, locationId: canteen });
    expect(fromBal.quantity).toBe("70.0000"); // 100 − 30
    expect(toBal.quantity).toBe("28.0000"); // 0 + 30 − 2

    // The variance +q still clears the pending banner (keys off the link).
    await expect(
      acceptTransfer({ movementId: dispatch.id, recordedById: ctx.otherStaffId }),
    ).rejects.toMatchObject({ constructor: DomainError, code: "CONFLICT" });
  });

  it("a short accept leaves system-wide stock explainable by summable rows (F6)", async () => {
    // The defect this replaces: dispatch 6, accept 4, and system-wide stock
    // fell 60 → 58 with the 2 missing units recorded only as free text on
    // the accept note. The Admin ledger's TOTAL closing dropped with no
    // column accounting for it. Now the drop is exactly the `variance` rows.
    const { restaurant, canteen } = ctx.locationIds;
    const productId = await freshProductWithOpening("60", restaurant);

    const before =
      Number((await getDerivedStockBalance({ productId, locationId: restaurant })).quantity) +
      Number((await getDerivedStockBalance({ productId, locationId: canteen })).quantity);

    const dispatch = await recordTransfer({
      productId,
      fromLocationId: restaurant,
      toLocationId: canteen,
      quantity: "6",
      recordedById: ctx.recorderId,
    });
    await acceptTransfer({
      movementId: dispatch.id,
      receivedQuantity: "4",
      recordedById: ctx.otherStaffId,
    });

    const after =
      Number((await getDerivedStockBalance({ productId, locationId: restaurant })).quantity) +
      Number((await getDerivedStockBalance({ productId, locationId: canteen })).quantity);

    // Stock really is 2 lower — that is the physical truth, not a bug.
    expect(before - after).toBeCloseTo(2, 4);

    // ...and the whole of that drop is accounted for by variance rows, so a
    // reconciliation can name where it went.
    const varianceTotal = (
      await prisma.stockMovement.findMany({
        where: { productId, movementType: "variance" },
      })
    ).reduce((n, r) => n + Number(r.quantity), 0);
    expect(varianceTotal).toBeCloseTo(-(before - after), 4);
  });

  it("plain accept (no receivedQuantity) is unchanged — +q equals the dispatched amount", async () => {
    const { restaurant, canteen } = ctx.locationIds;
    const productId = await freshProductWithOpening("50", restaurant);

    const dispatch = await recordTransfer({
      productId,
      fromLocationId: restaurant,
      toLocationId: canteen,
      quantity: "12",
      recordedById: ctx.recorderId,
    });
    const accepted = await acceptTransfer({
      movementId: dispatch.id,
      recordedById: ctx.otherStaffId,
    });

    expect(accepted.quantity).toBe("12.0000");
    expect(accepted.note).toBe("Transfer received");

    const toBal = await getDerivedStockBalance({ productId, locationId: canteen });
    expect(toBal.quantity).toBe("12.0000");
  });

  it("rejects a transfer with the same from/to location", async () => {
    const { restaurant } = ctx.locationIds;
    const productId = await freshProductWithOpening("10", restaurant);
    await expect(
      recordTransfer({
        productId,
        fromLocationId: restaurant,
        toLocationId: restaurant,
        quantity: "1",
        recordedById: ctx.recorderId,
      }),
    ).rejects.toMatchObject({
      constructor: DomainError,
      code: "VALIDATION_ERROR",
    });
  });

  // ── ADR-67: the location↔kind model, enforced ──────────────────────────

  async function countRows(productId: string): Promise<number> {
    return prisma.stockMovement.count({ where: { productId } });
  }

  it("R2 — a transfer FROM the Store is rejected, nothing written", async () => {
    const { store, canteen } = ctx.locationIds;
    // Stock the goods product at the Restaurant so only the from-location
    // is the rule being tested.
    const productId = await freshProductWithOpening("50", ctx.locationIds.restaurant);
    const before = await countRows(productId);
    await expect(
      recordTransfer({
        productId,
        fromLocationId: store,
        toLocationId: canteen,
        quantity: "5",
        recordedById: ctx.recorderId,
      }),
    ).rejects.toMatchObject({
      constructor: DomainError,
      code: "VALIDATION_ERROR",
      field: "fromLocationId",
    });
    expect(await countRows(productId)).toBe(before);
  });

  it("R2 — a transfer TO the Store is rejected", async () => {
    const { restaurant, store } = ctx.locationIds;
    const productId = await freshProductWithOpening("50", restaurant);
    await expect(
      recordTransfer({
        productId,
        fromLocationId: restaurant,
        toLocationId: store,
        quantity: "5",
        recordedById: ctx.recorderId,
      }),
    ).rejects.toMatchObject({
      constructor: DomainError,
      code: "VALIDATION_ERROR",
      field: "toLocationId",
    });
  });

  it("R3 — transferring an ingredient is rejected, nothing written", async () => {
    const { restaurant, canteen } = ctx.locationIds;
    // An ingredient can't legally have stock anywhere but the Store, so
    // there's no opening to set — the guard fires on kind alone.
    const ingredient = await prisma.product.create({
      data: {
        name: `${ctx.prefix} Flour-${Math.random().toString(36).slice(2)}`,
        kind: "ingredient",
        unitLabel: "kg",
        buyingPrice: 100,
      },
    });
    const before = await countRows(ingredient.id);
    await expect(
      recordTransfer({
        productId: ingredient.id,
        fromLocationId: restaurant,
        toLocationId: canteen,
        quantity: "1",
        recordedById: ctx.recorderId,
      }),
    ).rejects.toMatchObject({
      constructor: DomainError,
      code: "VALIDATION_ERROR",
      field: "productId",
    });
    expect(await countRows(ingredient.id)).toBe(before);
  });

  it("recordTransferBatch with one ingredient line rejects the whole batch, nothing written", async () => {
    const { restaurant, canteen } = ctx.locationIds;
    const ok = await freshProductWithOpening("100", restaurant);
    const ingredient = await prisma.product.create({
      data: {
        name: `${ctx.prefix} Salt-${Math.random().toString(36).slice(2)}`,
        kind: "ingredient",
        unitLabel: "kg",
        buyingPrice: 20,
      },
    });
    const before = (await countRows(ok)) + (await countRows(ingredient.id));
    await expect(
      recordTransferBatch({
        fromLocationId: restaurant,
        toLocationId: canteen,
        lines: [
          { productId: ok, quantity: "5" },
          { productId: ingredient.id, quantity: "1" },
        ],
        recordedById: ctx.recorderId,
      }),
    ).rejects.toMatchObject({
      constructor: DomainError,
      code: "VALIDATION_ERROR",
    });
    expect((await countRows(ok)) + (await countRows(ingredient.id))).toBe(before);
  });

  it("recordTransferBatch from the Store rejects the whole batch", async () => {
    const { store, canteen, restaurant } = ctx.locationIds;
    const p = await freshProductWithOpening("100", restaurant);
    const before = await countRows(p);
    await expect(
      recordTransferBatch({
        fromLocationId: store,
        toLocationId: canteen,
        lines: [{ productId: p, quantity: "5" }],
        recordedById: ctx.recorderId,
      }),
    ).rejects.toMatchObject({
      constructor: DomainError,
      code: "VALIDATION_ERROR",
      field: "fromLocationId",
    });
    expect(await countRows(p)).toBe(before);
  });
});
