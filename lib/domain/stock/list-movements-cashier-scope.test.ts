import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { listMovements } from "./list-movements";
import { DomainError } from "./errors";
import {
  cleanupStockTestData,
  setupStockTestData,
  type StockTestCtx,
} from "./test-helpers";

const SCOPE = "listcashier";

/**
 * Session 16 / ADR-68 — `listMovements` scopes `cashier` to its own
 * location, exactly like `store_manager` / `canteen_attendant`.
 *
 * The prior rule was "a cashier sells, they don't manage stock" -> a
 * blanket `FORBIDDEN`. That predates the Restaurant non-sale flow
 * (/cashier/flows/non-sale): PRD §3 records non-sale consumption as
 * "recorded by: any staff" and ADR-67 makes `non_sale_consumption` a
 * legal outbound at the Restaurant, so the cashier who sees a dropped
 * plate must be able to log it — as the Canteen Attendant already can.
 *
 * These cases lock in that the widening is SCOPED, not a blanket grant:
 * the Restaurant yes, the Store/Canteen no, and no location = FORBIDDEN.
 */
describe("listMovements — cashier is location-scoped (ADR-68)", () => {
  let ctx: StockTestCtx;

  beforeAll(async () => {
    ctx = await setupStockTestData(SCOPE);
    const mk = (locationId: string, productId: string) =>
      prisma.stockMovement.create({
        data: {
          productId,
          locationId,
          movementType: "opening",
          quantity: new Prisma.Decimal(10),
          recordedById: ctx.recorderId,
          occurredAt: new Date("2026-07-10T09:00:00Z"),
        },
      });
    // One row at each location, so a leak across the scope is visible.
    await mk(ctx.locationIds.restaurant, ctx.goodsProductId);
    await mk(ctx.locationIds.canteen, ctx.goodsProductId);
    await mk(ctx.locationIds.store, ctx.productId);
  });

  afterAll(async () => {
    await cleanupStockTestData(SCOPE);
  });

  it("a cashier at the Restaurant sees the Restaurant's rows", async () => {
    const rows = await listMovements(
      {},
      {
        userId: ctx.recorderId,
        role: "cashier",
        locationId: ctx.locationIds.restaurant,
      },
    );
    expect(rows.length).toBeGreaterThan(0);
    expect(
      rows.every((r) => r.locationId === ctx.locationIds.restaurant),
    ).toBe(true);
  });

  it("a cashier never sees Store or Canteen rows", async () => {
    const rows = await listMovements(
      {},
      {
        userId: ctx.recorderId,
        role: "cashier",
        locationId: ctx.locationIds.restaurant,
      },
    );
    expect(rows.some((r) => r.locationId === ctx.locationIds.store)).toBe(false);
    expect(rows.some((r) => r.locationId === ctx.locationIds.canteen)).toBe(
      false,
    );
  });

  it("a cashier filtering to a FOREIGN location gets nothing (scope wins)", async () => {
    const rows = await listMovements(
      { locationId: ctx.locationIds.store },
      {
        userId: ctx.recorderId,
        role: "cashier",
        locationId: ctx.locationIds.restaurant,
      },
    );
    expect(rows).toEqual([]);
  });

  it("a cashier with no location link → FORBIDDEN", async () => {
    await expect(
      listMovements(
        {},
        { userId: ctx.recorderId, role: "cashier", locationId: null },
      ),
    ).rejects.toBeInstanceOf(DomainError);
  });
});
