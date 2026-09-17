import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { closeDay, reopenDay } from "@/lib/domain/audit";
import { toBusinessDate } from "@/lib/time";
import { recordKitchenIssue, recordProduction } from "./issue-production";
import { recordNonSaleConsumption } from "./consumption";
import { recordPurchaseReceipt } from "./purchases";
import { setOpeningStock } from "./opening-stock";
import { getDerivedStockBalance } from "./derived-balance";
import { DomainError } from "./errors";
import {
  cleanupStockTestData,
  setupStockTestData,
  type StockTestCtx,
} from "./test-helpers";

/**
 * Admin Stock Ledger blank-cell backfill (client request, 2026-09-17): an
 * Admin may write a brand-new movement dated to a past business day —
 * including an already-CLOSED day, the one deliberate exception to the
 * shared `assertDayOpen` rule (`assertDayOpenOrAdminBackfill`). Every
 * other role is unaffected: omitting `businessDate`/`allowAdminBackfill`
 * (the default) behaves exactly as before, and even with them set, a
 * non-admin `actorRole` still hits the plain closed-day block.
 */
describe("Admin Stock Ledger blank-cell backfill", () => {
  const SCOPE = "admin-backfill";
  let ctx: StockTestCtx;
  const OPEN_DATE = "2026-08-10";
  const CLOSED_DATE = "2026-08-11";

  beforeAll(async () => {
    ctx = await setupStockTestData(SCOPE);
    await setOpeningStock({
      productId: ctx.productId,
      locationId: ctx.locationIds.store,
      businessDate: "2026-08-01",
      quantity: "200",
      recordedById: ctx.recorderId,
    });
    await setOpeningStock({
      productId: ctx.dishProductId,
      locationId: ctx.locationIds.restaurant,
      businessDate: "2026-08-01",
      quantity: "50",
      recordedById: ctx.recorderId,
    });
    await closeDay(CLOSED_DATE, ctx.adminId);
  });

  afterAll(async () => {
    await reopenDay(CLOSED_DATE, ctx.adminId);
    await cleanupStockTestData(SCOPE);
    await prisma.$disconnect();
  });

  it("recordKitchenIssue: Admin backfills a past OPEN day at the given date", async () => {
    const row = await recordKitchenIssue({
      productId: ctx.productId,
      locationId: ctx.locationIds.store,
      quantity: "3",
      recordedById: ctx.adminId,
      businessDate: OPEN_DATE,
      actorRole: "admin",
      allowAdminBackfill: true,
    });
    expect(toBusinessDate(new Date(row.occurredAt))).toBe(OPEN_DATE);
    expect(row.quantity).toBe("-3.0000");
  });

  it("recordKitchenIssue: Admin backfills an already-CLOSED day", async () => {
    const row = await recordKitchenIssue({
      productId: ctx.productId,
      locationId: ctx.locationIds.store,
      quantity: "2",
      recordedById: ctx.adminId,
      businessDate: CLOSED_DATE,
      actorRole: "admin",
      allowAdminBackfill: true,
    });
    expect(toBusinessDate(new Date(row.occurredAt))).toBe(CLOSED_DATE);
  });

  it("recordKitchenIssue: a non-admin role is still blocked on the closed day, even with allowAdminBackfill set", async () => {
    await expect(
      recordKitchenIssue({
        productId: ctx.productId,
        locationId: ctx.locationIds.store,
        quantity: "1",
        recordedById: ctx.recorderId,
        businessDate: CLOSED_DATE,
        actorRole: "store_manager",
        allowAdminBackfill: true,
      }),
    ).rejects.toMatchObject({ constructor: DomainError, code: "FORBIDDEN" });
  });

  it("recordKitchenIssue: without businessDate/allowAdminBackfill, behaves exactly as before (writes to now)", async () => {
    const row = await recordKitchenIssue({
      productId: ctx.productId,
      locationId: ctx.locationIds.store,
      quantity: "1",
      recordedById: ctx.recorderId,
    });
    expect(toBusinessDate(new Date(row.occurredAt))).toBe(toBusinessDate(new Date()));
  });

  it("recordProduction: Admin backfills a closed day", async () => {
    const row = await recordProduction({
      productId: ctx.dishProductId,
      locationId: ctx.locationIds.restaurant,
      quantity: "4",
      recordedById: ctx.adminId,
      businessDate: CLOSED_DATE,
      actorRole: "admin",
      allowAdminBackfill: true,
    });
    expect(toBusinessDate(new Date(row.occurredAt))).toBe(CLOSED_DATE);
    expect(row.quantity).toBe("4.0000");
  });

  it("recordNonSaleConsumption: Admin backfills a closed day, reason carried through", async () => {
    const row = await recordNonSaleConsumption({
      productId: ctx.productId,
      locationId: ctx.locationIds.store,
      quantity: "1",
      reason: "spoiled",
      recordedById: ctx.adminId,
      businessDate: CLOSED_DATE,
      actorRole: "admin",
      allowAdminBackfill: true,
    });
    expect(toBusinessDate(new Date(row.occurredAt))).toBe(CLOSED_DATE);
    expect(row.reason).toBe("spoiled");
  });

  it("recordPurchaseReceipt: Admin backfills a closed day", async () => {
    const row = await recordPurchaseReceipt({
      productId: ctx.productId,
      locationId: ctx.locationIds.store,
      quantity: "10",
      recordedById: ctx.adminId,
      businessDate: CLOSED_DATE,
      actorRole: "admin",
      allowAdminBackfill: true,
    });
    expect(toBusinessDate(new Date(row.occurredAt))).toBe(CLOSED_DATE);
    expect(row.quantity).toBe("10.0000");
  });

  it("balances reflect every backfilled row (ledger math still holds)", async () => {
    const balance = await getDerivedStockBalance({
      productId: ctx.productId,
      locationId: ctx.locationIds.store,
    });
    // 200 opening − 3 − 2 − 1 (plain issue) − 1 (non-sale) + 10 (receipt) = 203
    expect(balance.quantity).toBe("203.0000");
  });
});
