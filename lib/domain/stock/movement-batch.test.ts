import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { setOpeningStock } from "./opening-stock";
import { getDerivedStockBalance } from "./derived-balance";
import {
  recordKitchenIssue,
  recordKitchenIssueBatch,
  recordProduction,
  recordProductionBatch,
} from "./issue-production";
import { recordPurchaseReceipt, recordPurchaseReceiptBatch } from "./purchases";
import { recordTransfer, recordTransferBatch } from "./transfer";
import {
  recordNonSaleConsumption,
  recordNonSaleConsumptionBatch,
} from "./consumption";
import { DomainError } from "./errors";
import {
  cleanupStockTestData,
  setupStockTestData,
  type StockTestCtx,
} from "./test-helpers";

const SCOPE = "movement-batch";

describe("batch movement endpoints", () => {
  let ctx: StockTestCtx;

  beforeAll(async () => {
    ctx = await setupStockTestData(SCOPE);
  });

  afterAll(async () => {
    await cleanupStockTestData(SCOPE);
    await prisma.$disconnect();
  });

  let seq = 0;
  async function freshProduct(
    kind: "ingredient" | "dish" | "goods" = "ingredient",
  ) {
    seq += 1;
    const p = await prisma.product.create({
      data: {
        name: `${ctx.prefix} P-${seq}-${Math.random().toString(36).slice(2)}`,
        kind,
        unitLabel: kind === "dish" ? "plate" : kind === "goods" ? "pcs" : "kg",
        buyingPrice: 100,
      },
    });
    return p.id;
  }

  async function withOpening(qty: string, locationId: string) {
    const id = await freshProduct();
    await setOpeningStock({
      productId: id,
      locationId,
      businessDate: "2026-08-01",
      quantity: qty,
      recordedById: ctx.recorderId,
    });
    return id;
  }

  // ADR-67: a transfer is Restaurant↔Canteen and moves dish/goods only, so
  // the transfer-batch cases stock a `goods` product at the Restaurant.
  async function goodsWithOpening(qty: string, locationId: string) {
    const id = await freshProduct("goods");
    await setOpeningStock({
      productId: id,
      locationId,
      businessDate: "2026-08-01",
      quantity: qty,
      recordedById: ctx.recorderId,
    });
    return id;
  }

  /** Count the ledger rows a batch could touch, for "nothing written" asserts. */
  async function counts(productIds: string[]) {
    const [sm, mm, al] = await Promise.all([
      prisma.stockMovement.count({ where: { productId: { in: productIds } } }),
      prisma.moneyMovement.count({
        where: { sourceType: "purchase_payment" },
      }),
      prisma.auditLog.count({ where: { userId: ctx.recorderId } }),
    ]);
    return { sm, mm, al };
  }

  // ── batch == N single calls (row-for-row) ─────────────────────────────

  it("issue batch writes exactly what N single recordKitchenIssue calls would", async () => {
    const { store } = ctx.locationIds;
    const a = await withOpening("100", store);
    const b = await withOpening("50", store);
    // Reference: two single calls on a parallel pair of products.
    const a1 = await withOpening("100", store);
    const b1 = await withOpening("50", store);
    await recordKitchenIssue({ productId: a1, locationId: store, quantity: "30", recordedById: ctx.recorderId });
    await recordKitchenIssue({ productId: b1, locationId: store, quantity: "12.5", recordedById: ctx.recorderId });

    const rows = await recordKitchenIssueBatch({
      locationId: store,
      lines: [
        { productId: a, quantity: "30" },
        { productId: b, quantity: "12.5" },
      ],
      recordedById: ctx.recorderId,
    });

    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.quantity).sort()).toEqual(["-12.5000", "-30.0000"]);
    expect(rows.every((r) => r.movementType === "issue")).toBe(true);
    expect(rows.every((r) => r.locationId === store)).toBe(true);

    expect((await getDerivedStockBalance({ productId: a, locationId: store })).quantity).toBe("70.0000");
    expect((await getDerivedStockBalance({ productId: b, locationId: store })).quantity).toBe("37.5000");
    // Matches the single-call reference exactly.
    expect((await getDerivedStockBalance({ productId: a1, locationId: store })).quantity).toBe("70.0000");
    expect((await getDerivedStockBalance({ productId: b1, locationId: store })).quantity).toBe("37.5000");
  });

  it("one AuditLog row per line on success, sharing a correlationId", async () => {
    const { store } = ctx.locationIds;
    const a = await withOpening("100", store);
    const b = await withOpening("100", store);

    const rows = await recordKitchenIssueBatch({
      locationId: store,
      lines: [
        { productId: a, quantity: "1" },
        { productId: b, quantity: "2" },
      ],
      recordedById: ctx.recorderId,
    });

    const audits = await prisma.auditLog.findMany({
      where: { entityType: "stock_movement", entityId: { in: rows.map((r) => r.id) } },
    });
    expect(audits).toHaveLength(2);
    const correlationIds = new Set(
      audits.map((a) => (a.newValue as { correlationId?: string }).correlationId),
    );
    expect(correlationIds.size).toBe(1);
    expect([...correlationIds][0]).toMatch(/^batch_/);
  });

  // ── BLOCK: one over-stock line ⇒ nothing written ─────────────────────

  it("issue batch with one over-stock line writes NOTHING and names every short line", async () => {
    const { store } = ctx.locationIds;
    const ok1 = await withOpening("100", store);
    const short1 = await withOpening("5", store);
    const short2 = await withOpening("2", store);

    const before = await counts([ok1, short1, short2]);

    await expect(
      recordKitchenIssueBatch({
        locationId: store,
        lines: [
          { productId: ok1, quantity: "10" },
          { productId: short1, quantity: "8" },
          { productId: short2, quantity: "9" },
        ],
        recordedById: ctx.recorderId,
      }),
    ).rejects.toMatchObject({ constructor: DomainError, code: "VALIDATION_ERROR", field: "lines" });

    const after = await counts([ok1, short1, short2]);
    expect(after).toEqual(before);
    // Balances untouched — never driven negative.
    expect((await getDerivedStockBalance({ productId: short1, locationId: store })).quantity).toBe("5.0000");
    expect((await getDerivedStockBalance({ productId: ok1, locationId: store })).quantity).toBe("100.0000");
  });

  it("the block error message names each short line and its available qty", async () => {
    const { store } = ctx.locationIds;
    const short = await withOpening("3", store);
    let err: DomainError | undefined;
    try {
      await recordKitchenIssueBatch({
        locationId: store,
        lines: [{ productId: short, quantity: "10" }],
        recordedById: ctx.recorderId,
      });
    } catch (e) {
      err = e as DomainError;
    }
    expect(err).toBeInstanceOf(DomainError);
    expect(err?.message).toMatch(/only 3\.0000 available/);
    expect(err?.message).toMatch(/cannot remove 10\.0000/);
  });

  // ── empty / duplicate ───────────────────────────────────────────────

  it("empty lines → VALIDATION_ERROR field 'lines'", async () => {
    const { store } = ctx.locationIds;
    await expect(
      recordKitchenIssueBatch({ locationId: store, lines: [], recordedById: ctx.recorderId }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "lines" });
  });

  it("duplicate productId → rejected, nothing written", async () => {
    const { store } = ctx.locationIds;
    const a = await withOpening("100", store);
    const before = await counts([a]);
    await expect(
      recordKitchenIssueBatch({
        locationId: store,
        lines: [
          { productId: a, quantity: "1" },
          { productId: a, quantity: "2" },
        ],
        recordedById: ctx.recorderId,
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "lines" });
    expect(await counts([a])).toEqual(before);
  });

  // ── receipt batch (additive) ────────────────────────────────────────

  it("receipt batch adds stock for every line; matches N single receipts", async () => {
    const { store } = ctx.locationIds;
    const a = await freshProduct();
    const b = await freshProduct();
    const rows = await recordPurchaseReceiptBatch({
      locationId: store,
      lines: [
        { productId: a, quantity: "40" },
        { productId: b, quantity: "15.25" },
      ],
      recordedById: ctx.recorderId,
    });
    expect(rows.map((r) => r.quantity).sort()).toEqual(["15.2500", "40.0000"]);
    expect((await getDerivedStockBalance({ productId: a, locationId: store })).quantity).toBe("40.0000");

    const c = await freshProduct();
    await recordPurchaseReceipt({ productId: c, locationId: store, quantity: "40", recordedById: ctx.recorderId });
    expect((await getDerivedStockBalance({ productId: c, locationId: store })).quantity).toBe("40.0000");
  });

  it("receipt batch writes no MoneyMovement (plain receipt path)", async () => {
    const { store } = ctx.locationIds;
    const a = await freshProduct();
    const rows = await recordPurchaseReceiptBatch({
      locationId: store,
      lines: [{ productId: a, quantity: "10" }],
      recordedById: ctx.recorderId,
    });
    const mm = await prisma.moneyMovement.findMany({
      where: { sourceId: { in: rows.map((r) => r.id) } },
    });
    expect(mm).toHaveLength(0);
  });

  // ── production batch (dish guard) ───────────────────────────────────

  it("production batch requires every line to be a dish; rejects a non-dish line, nothing written", async () => {
    const { restaurant } = ctx.locationIds;
    const dish = await freshProduct("dish");
    const notDish = await freshProduct("ingredient");
    const before = await counts([dish, notDish]);
    await expect(
      recordProductionBatch({
        locationId: restaurant,
        lines: [
          { productId: dish, quantity: "10" },
          { productId: notDish, quantity: "5" },
        ],
        recordedById: ctx.recorderId,
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(await counts([dish, notDish])).toEqual(before);
  });

  it("production batch adds dish stock at the restaurant; matches a single production", async () => {
    const { restaurant } = ctx.locationIds;
    const d1 = await freshProduct("dish");
    const d2 = await freshProduct("dish");
    await recordProductionBatch({
      locationId: restaurant,
      lines: [
        { productId: d1, quantity: "20" },
        { productId: d2, quantity: "8" },
      ],
      recordedById: ctx.recorderId,
    });
    expect((await getDerivedStockBalance({ productId: d1, locationId: restaurant })).quantity).toBe("20.0000");

    const d3 = await freshProduct("dish");
    await recordProduction({ productId: d3, locationId: restaurant, quantity: "20", recordedById: ctx.recorderId });
    expect((await getDerivedStockBalance({ productId: d3, locationId: restaurant })).quantity).toBe("20.0000");
  });

  // ── transfer batch (dispatch side, block) ───────────────────────────

  it("transfer batch writes N -q dispatch rows at `from`; stock leaves `from`, not yet at `to`", async () => {
    const { restaurant, canteen } = ctx.locationIds;
    const a = await goodsWithOpening("100", restaurant);
    const b = await goodsWithOpening("60", restaurant);
    const rows = await recordTransferBatch({
      fromLocationId: restaurant,
      toLocationId: canteen,
      lines: [
        { productId: a, quantity: "25" },
        { productId: b, quantity: "10" },
      ],
      recordedById: ctx.recorderId,
    });
    expect(rows.every((r) => r.locationId === restaurant)).toBe(true);
    expect(rows.every((r) => r.transferCounterpartLocationId === canteen)).toBe(true);
    expect(rows.every((r) => r.correctsMovementId === null)).toBe(true);
    expect((await getDerivedStockBalance({ productId: a, locationId: restaurant })).quantity).toBe("75.0000");
    expect((await getDerivedStockBalance({ productId: a, locationId: canteen })).quantity).toBe("0.0000");
  });

  it("transfer batch blocks the whole batch if any line exceeds `from` balance", async () => {
    const { restaurant, canteen } = ctx.locationIds;
    const a = await goodsWithOpening("100", restaurant);
    const short = await goodsWithOpening("5", restaurant);
    const before = await counts([a, short]);
    await expect(
      recordTransferBatch({
        fromLocationId: restaurant,
        toLocationId: canteen,
        lines: [
          { productId: a, quantity: "10" },
          { productId: short, quantity: "50" },
        ],
        recordedById: ctx.recorderId,
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "lines" });
    expect(await counts([a, short])).toEqual(before);
  });

  it("transfer batch rejects from === to", async () => {
    const { restaurant } = ctx.locationIds;
    const a = await goodsWithOpening("100", restaurant);
    await expect(
      recordTransferBatch({
        fromLocationId: restaurant,
        toLocationId: restaurant,
        lines: [{ productId: a, quantity: "1" }],
        recordedById: ctx.recorderId,
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "toLocationId" });
  });

  it("transfer batch rejects a Store endpoint (ADR-67 R2)", async () => {
    const { restaurant, store, canteen } = ctx.locationIds;
    const a = await goodsWithOpening("100", restaurant);
    const before = await counts([a]);
    await expect(
      recordTransferBatch({
        fromLocationId: store,
        toLocationId: canteen,
        lines: [{ productId: a, quantity: "1" }],
        recordedById: ctx.recorderId,
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "fromLocationId" });
    expect(await counts([a])).toEqual(before);
  });

  // ── non-sale batch (shared reason, block) ───────────────────────────

  it("non-sale batch applies one reason to every line and blocks over-stock", async () => {
    const { store } = ctx.locationIds;
    const a = await withOpening("100", store);
    const b = await withOpening("40", store);
    const rows = await recordNonSaleConsumptionBatch({
      locationId: store,
      reason: "spoiled",
      lines: [
        { productId: a, quantity: "5" },
        { productId: b, quantity: "3" },
      ],
      recordedById: ctx.recorderId,
    });
    expect(rows.every((r) => r.reason === "spoiled")).toBe(true);
    expect((await getDerivedStockBalance({ productId: a, locationId: store })).quantity).toBe("95.0000");

    const short = await withOpening("1", store);
    const before = await counts([a, b, short]);
    await expect(
      recordNonSaleConsumptionBatch({
        locationId: store,
        reason: "spoiled",
        lines: [
          { productId: a, quantity: "1" },
          { productId: short, quantity: "9" },
        ],
        recordedById: ctx.recorderId,
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "lines" });
    expect(await counts([a, b, short])).toEqual(before);
  });

  it("non-sale batch requires a note when reason is 'other'", async () => {
    const { store } = ctx.locationIds;
    const a = await withOpening("100", store);
    await expect(
      recordNonSaleConsumptionBatch({
        locationId: store,
        reason: "other",
        lines: [{ productId: a, quantity: "1" }],
        recordedById: ctx.recorderId,
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "note" });

    const rows = await recordNonSaleConsumptionBatch({
      locationId: store,
      reason: "other",
      note: "  taken for the staff party  ",
      lines: [{ productId: a, quantity: "1" }],
      recordedById: ctx.recorderId,
    });
    expect(rows[0].reasonNote).toBe("taken for the staff party");
  });
});
