import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { recordNonSaleConsumption } from "./consumption";
import { listMovements } from "./list-movements";
import {
  cleanupStockTestData,
  setupStockTestData,
  type StockTestCtx,
} from "./test-helpers";

const SCOPE = "nsc_read_shape";

/**
 * M5 "Dashboard & Financials v2" Session A, §1b — a VERIFY, not a build.
 * `financials-screen.md`'s Non-Sale Consumption tab spec says
 * `listMovements({ movementType: "non_sale_consumption" })` already
 * returns every field the tab's columns need — Date · Product · Location
 * · Qty · Reason · Recorded by · Est. cost. This test asserts that is
 * actually true against a real write, so a future session doesn't have
 * to re-derive it from the source. `Recorded by` and `Est. cost` are NOT
 * present as a resolved name / computed cost on `StockMovementView` —
 * the row carries `recordedById` (a raw id, resolved to a name the same
 * way the other transaction tabs already resolve `recordedById` →
 * staff name — see `financials-client.tsx`'s existing tabs) and no cost
 * field at all (the tab computes cost the same way
 * `computeNonSaleCost`/`getFinancialSummary().nonSaleConsumption` already
 * do — a client-side per-row valuation, not a new persisted or returned
 * figure). Confirmed here rather than guessed.
 */
describe("listMovements({ movementType: 'non_sale_consumption' }) — v2 tab read shape", () => {
  let ctx: StockTestCtx;

  beforeAll(async () => {
    ctx = await setupStockTestData(SCOPE);
    // Give the product stock to consume from.
    await prisma.stockMovement.create({
      data: {
        productId: ctx.productId,
        locationId: ctx.locationIds.store,
        movementType: "opening",
        quantity: 50,
        recordedById: ctx.adminId,
        occurredAt: new Date("2026-01-01T05:00:00Z"),
      },
    });
  });

  afterAll(async () => {
    await cleanupStockTestData(SCOPE);
    await prisma.$disconnect();
  });

  it("returns productId, locationId, quantity, reason, recordedById, occurredAt, productName, unitLabel", async () => {
    const written = await recordNonSaleConsumption({
      productId: ctx.productId,
      locationId: ctx.locationIds.store,
      quantity: "3",
      reason: "spoiled",
      recordedById: ctx.recorderId,
    });

    const rows = await listMovements(
      { movementType: "non_sale_consumption" },
      { userId: ctx.adminId, role: "admin", locationId: null },
    );
    const row = rows.find((r) => r.id === written.id);
    expect(row).toBeDefined();
    expect(row).toMatchObject({
      productId: ctx.productId,
      locationId: ctx.locationIds.store,
      movementType: "non_sale_consumption",
      quantity: "-3.0000",
      reason: "spoiled",
      recordedById: ctx.recorderId,
      productName: expect.stringContaining("Rice"),
      unitLabel: "kg",
    });
    expect(row?.occurredAt).toEqual(expect.any(String));
  });

  it("the route already accepts ?movementType=non_sale_consumption (app/api/stock-movements/route.ts's Zod query schema)", async () => {
    const { listMovementsQuerySchema } = await import(
      "@/lib/validation/stock"
    );
    const parsed = listMovementsQuerySchema.safeParse({
      movementType: "non_sale_consumption",
    });
    expect(parsed.success).toBe(true);
  });
});
