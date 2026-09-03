import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { listMovements } from "./list-movements";
import {
  cleanupStockTestData,
  setupStockTestData,
  type StockTestCtx,
} from "./test-helpers";

const SCOPE = "listrange";
const d = (iso: string) => new Date(iso);

/**
 * M3 S7 — `listMovements` gained an inclusive `from`/`to` business-date
 * range (the /admin/financials range control needs the Purchases /
 * Deliveries flow lists to span the whole range, not one day). `date`
 * still wins if both are given. Boundaries: a row on `to`'s own business
 * day is IN; one on the next day is OUT.
 */
describe("listMovements — from/to business-date range", () => {
  let ctx: StockTestCtx;

  beforeAll(async () => {
    ctx = await setupStockTestData(SCOPE);
    const mk = (movementType: string, businessDay: string) =>
      prisma.stockMovement.create({
        data: {
          productId: ctx.productId,
          locationId: ctx.locationIds.store,
          movementType: movementType as never,
          quantity: new Prisma.Decimal(1),
          recordedById: ctx.recorderId,
          occurredAt: d(`${businessDay}T12:00:00Z`), // inside that Nairobi day
        },
      });
    await mk("purchase_receipt", "2026-07-09");
    await mk("purchase_receipt", "2026-07-10");
    await mk("purchase_receipt", "2026-07-11");
    // A row at the very last instant of 2026-07-10 Nairobi (20:59:59.999Z).
    await prisma.stockMovement.create({
      data: {
        productId: ctx.productId,
        locationId: ctx.locationIds.store,
        movementType: "purchase_receipt",
        quantity: new Prisma.Decimal(1),
        recordedById: ctx.recorderId,
        occurredAt: d("2026-07-10T20:59:59.999Z"),
      },
    });
  });

  afterAll(async () => {
    await cleanupStockTestData(SCOPE);
    await prisma.$disconnect();
  });

  const actor = () => ({ userId: "", role: "admin" as const, locationId: null });

  it("includes rows across the whole range and excludes rows after it", async () => {
    const rows = await listMovements(
      { productId: ctx.productId, from: "2026-07-09", to: "2026-07-10" },
      actor(),
    );
    const days = rows
      .map((r) => r.occurredAt.slice(0, 10))
      .sort();
    // 07-09 (1) + 07-10 (2 — noon + last-instant); the 07-11 row is out.
    expect(rows).toHaveLength(3);
    expect(days).toEqual(["2026-07-09", "2026-07-10", "2026-07-10"]);
  });

  it("a single-day range (from === to) matches the `date` filter", async () => {
    const viaRange = await listMovements(
      { productId: ctx.productId, from: "2026-07-11", to: "2026-07-11" },
      actor(),
    );
    const viaDate = await listMovements(
      { productId: ctx.productId, date: "2026-07-11" },
      actor(),
    );
    expect(viaRange).toHaveLength(1);
    expect(viaRange.map((r) => r.id)).toEqual(viaDate.map((r) => r.id));
  });

  it("`date` wins when both `date` and a range are supplied", async () => {
    const rows = await listMovements(
      {
        productId: ctx.productId,
        date: "2026-07-09",
        from: "2026-07-09",
        to: "2026-07-11",
      },
      actor(),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].occurredAt.slice(0, 10)).toBe("2026-07-09");
  });
});
