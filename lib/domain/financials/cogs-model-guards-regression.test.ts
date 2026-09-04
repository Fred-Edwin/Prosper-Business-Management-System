import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import {
  acceptTransfer,
  recordKitchenIssue,
  recordPurchaseReceipt,
  recordTransfer,
  setOpeningStock,
} from "@/lib/domain/stock";
import { getFinancialSummary } from "./get-financial-summary";
import {
  cleanupFinancialsTestData,
  setupFinancialsWorld,
  type FinancialsWorldCtx,
} from "./test-helpers";

/**
 * ADR-67 §2d — the location↔kind guards are a **pure gate**: they reject
 * illegal kind/location combinations but never change a row that IS
 * written, so COGS and every balance are byte-identical for
 * model-compliant data.
 *
 * This suite drives a small model-compliant world **through the guarded
 * domain functions** (`setOpeningStock`, `recordPurchaseReceipt`,
 * `recordKitchenIssue`, `recordTransfer` + `acceptTransfer`) — every one
 * now runs `assertKindAllowedAtLocation` / `assertTransferLocations` /
 * `assertTransferableKind`. It then checks:
 *
 *   1. every legal movement was accepted (no guard false-positive), and
 *   2. the COGS the sweep derives is exactly the hand-computed figure —
 *      measured as the *delta* the suite's own rows add, so concurrent
 *      suites writing elsewhere in the same DB can't perturb it.
 *
 * FIXTURE (all model-compliant)
 *
 *   Ingredient "Flour" @ Store, buyingPrice 100:
 *     opening (before window) +60      value 6,000
 *     purchase_receipt (today) +40     purchases term 4,000
 *     issue (today) −25
 *     closing 75                        value 7,500
 *     → Store COGS delta = 6,000 + 4,000 − 7,500 = 2,500
 *
 *   Goods "Soda" @ Restaurant, buyingPrice 40:
 *     opening (before window) +100     value 4,000
 *     purchase_receipt (today) +20     purchases term 800
 *     transfer −30 → Canteen (dispatched + accepted)
 *     closing 90                        value 3,600
 *     → Restaurant Goods COGS delta = 4,000 + 800 − 3,600 = 1,200
 *
 *   Goods "Soda" @ Canteen (same product):
 *     opening (before window) +10      value 400
 *     transfer +30 in (accepted)
 *     closing 40                        value 1,600
 *     → Canteen COGS delta = 400 + 0 − 1,600 = −1,200
 *       (a transfer between the business's own locations nets to zero
 *        across COGS — 1,200 out of Restaurant, 1,200 into Canteen — which
 *        is exactly the ADR-55 invariant the guards must not disturb.)
 *
 *   Total COGS delta = 2,500 + 1,200 − 1,200 = 2,500
 */

const SCOPE = "cogs-model-guards";

// A window that ENDS today (so "today" receipts/issues/transfers are in
// range) and starts well before the openings.
const today = new Date();
const iso = (d: Date) => d.toISOString().slice(0, 10);
// The window must START AFTER the openings (so their value counts as
// "opening stock", not a mid-window movement) and END today (so the
// "today" receipts / issue / transfer land in range).
const FROM = "2026-06-01";
const TO = iso(today);
const OPENING_DATE = "2026-05-01"; // strictly before FROM

describe("ADR-67 §2d — new guards do not move COGS for model-compliant data", () => {
  let ctx: FinancialsWorldCtx;
  let cogsBefore: number;

  beforeAll(async () => {
    ctx = await setupFinancialsWorld(SCOPE);
    const { locationIds, ingredientId, goodsId, actorId } = ctx;

    // Baseline COGS over the window BEFORE this suite writes anything.
    cogsBefore = Number((await getFinancialSummary(FROM, TO)).consolidated.cogs);

    // ── Flour @ Store — all legal (ingredient ⇒ Store) ─────────────────
    await setOpeningStock({
      productId: ingredientId,
      locationId: locationIds.store,
      businessDate: OPENING_DATE,
      quantity: "60",
      recordedById: actorId,
    });
    await recordPurchaseReceipt({
      productId: ingredientId,
      locationId: locationIds.store,
      quantity: "40",
      recordedById: actorId,
    });
    await recordKitchenIssue({
      productId: ingredientId,
      locationId: locationIds.store,
      quantity: "25",
      recordedById: actorId,
    });

    // ── Soda @ Restaurant + Canteen — all legal (goods ⇒ Rest./Canteen) ─
    await setOpeningStock({
      productId: goodsId,
      locationId: locationIds.restaurant,
      businessDate: OPENING_DATE,
      quantity: "100",
      recordedById: actorId,
    });
    await setOpeningStock({
      productId: goodsId,
      locationId: locationIds.canteen,
      businessDate: OPENING_DATE,
      quantity: "10",
      recordedById: actorId,
    });
    await recordPurchaseReceipt({
      productId: goodsId,
      locationId: locationIds.restaurant,
      quantity: "20",
      recordedById: actorId,
    });

    // Restaurant → Canteen transfer of a goods product (R2 + R3 satisfied).
    const dispatch = await recordTransfer({
      productId: goodsId,
      fromLocationId: locationIds.restaurant,
      toLocationId: locationIds.canteen,
      quantity: "30",
      recordedById: actorId,
    });
    await acceptTransfer({ movementId: dispatch.id, recordedById: actorId });
  });

  afterAll(async () => {
    await cleanupFinancialsTestData(SCOPE);
    await prisma.$disconnect();
  });

  it("accepts every model-compliant movement — no guard false-positive", async () => {
    const rows = await prisma.stockMovement.count({
      where: {
        productId: { in: [ctx.ingredientId, ctx.goodsId] },
        locationId: {
          in: [
            ctx.locationIds.store,
            ctx.locationIds.restaurant,
            ctx.locationIds.canteen,
          ],
        },
      },
    });
    // 3 openings + 2 receipts + 1 issue + 1 dispatch + 1 accept = 8.
    expect(rows).toBe(8);
  });

  it("COGS delta over the window is exactly the hand-computed 2,500", async () => {
    const s = await getFinancialSummary(FROM, TO);
    const cogsAfter = Number(s.consolidated.cogs);
    expect(cogsAfter - cogsBefore).toBeCloseTo(2500, 2);
  });

  it("the Restaurant→Canteen transfer nets to zero across COGS (ADR-55)", async () => {
    const s = await getFinancialSummary(FROM, TO);
    const byName = new Map(s.perLocation.map((l) => [l.locationName, l]));
    const rest = byName.get(`${ctx.prefix} Restaurant`);
    const cant = byName.get(`${ctx.prefix} Canteen`);
    expect(rest).toBeDefined();
    expect(cant).toBeDefined();
    // Restaurant Goods COGS delta +1,200; Canteen COGS delta −1,200.
    // (Both locations start at 0 COGS for this scope's products.)
    expect(Number(rest!.cogs)).toBeCloseTo(1200, 2);
    expect(Number(cant!.cogs)).toBeCloseTo(-1200, 2);
  });
});
