import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { nairobiToday, businessDateStartUtc } from "@/lib/time";
import { declareHandover } from "@/lib/domain/handovers/declare-handover";
import { recordReceipt } from "@/lib/domain/handovers/record-receipt";
import { getReconciliation } from "@/lib/domain/handovers/get-reconciliation";
import { getStockActivityByLocation } from "./stock-activity";

const PREFIX = "__dashboard_stock_activity__";

/**
 * "Stock & activity by location" (v2) — always "now", never period-scoped
 * (`dashboard-screen.md`). Two concerns:
 *
 *  1. `movementCount` / `lowStockCount` are correct per location.
 *  2. **`handoverStatus` agrees, exactly, with what `GET
 *     /api/handovers/reconciliation` (`getReconciliation`) returns for
 *     today** — the handoff's explicit reconciliation-agreement
 *     discipline (S11's `day-detail-reconciliation.test.ts` precedent):
 *     two reads of the same underlying `Handover`/`ReceiptOfHandover`
 *     rows must never silently drift.
 */
describe("getStockActivityByLocation", () => {
  let restaurantId: string;
  let canteenId: string;
  let storeId: string;
  let adminId: string;
  let cashierId: string;
  let productId: string;

  const today = nairobiToday();

  beforeEach(async () => {
    const [restaurant, canteen, store] = await Promise.all([
      prisma.location.create({
        data: { name: `${PREFIX} Restaurant`, type: "restaurant" },
      }),
      prisma.location.create({
        data: { name: `${PREFIX} Canteen`, type: "canteen" },
      }),
      prisma.location.create({ data: { name: `${PREFIX} Store`, type: "store" } }),
    ]);
    restaurantId = restaurant.id;
    canteenId = canteen.id;
    storeId = store.id;

    const admin = await prisma.user.create({
      data: { name: `${PREFIX} Admin`, pinHash: "x", role: "admin", active: true },
    });
    adminId = admin.id;

    const staff = await prisma.staff.create({
      data: {
        name: `${PREFIX} Cashier`,
        role: "cashier",
        locationId: restaurantId,
        dailyRate: new Prisma.Decimal("0"),
        active: true,
      },
    });
    const cashierUser = await prisma.user.create({
      data: {
        name: `${PREFIX} Cashier`,
        pinHash: "x",
        role: "cashier",
        active: true,
        staffId: staff.id,
      },
    });
    cashierId = cashierUser.id;

    const product = await prisma.product.create({
      data: {
        name: `${PREFIX} Rice`,
        kind: "ingredient",
        unitLabel: "kg",
        buyingPrice: 100,
      },
    });
    productId = product.id;
  });

  afterEach(async () => {
    const users = await prisma.user.findMany({
      where: { name: { startsWith: PREFIX } },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);
    const locs = await prisma.location.findMany({
      where: { name: { startsWith: PREFIX } },
      select: { id: true },
    });
    const locIds = locs.map((l) => l.id);

    const handovers = await prisma.handover.findMany({
      where: { locationId: { in: locIds } },
      select: { id: true },
    });
    const handoverIds = handovers.map((h) => h.id);
    if (handoverIds.length > 0) {
      const receipts = await prisma.receiptOfHandover.findMany({
        where: { handoverId: { in: handoverIds } },
        select: { id: true },
      });
      await prisma.handoverShortfall.deleteMany({
        where: { receiptOfHandoverId: { in: receipts.map((r) => r.id) } },
      });
      await prisma.receiptOfHandover.deleteMany({
        where: { id: { in: receipts.map((r) => r.id) } },
      });
      await prisma.handover.updateMany({
        where: { id: { in: handoverIds } },
        data: { correctsHandoverId: null },
      });
      await prisma.handover.deleteMany({ where: { id: { in: handoverIds } } });
    }

    await prisma.stockMovement.deleteMany({ where: { locationId: { in: locIds } } });
    await prisma.product.deleteMany({ where: { name: { startsWith: PREFIX } } });
    await prisma.dayClose.deleteMany({ where: { closedBy: { in: userIds } } });
    await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.staff.deleteMany({ where: { name: { startsWith: PREFIX } } });
    await prisma.location.deleteMany({ where: { id: { in: locIds } } });
  });

  it("is ordered Store → Restaurant → Canteen and includes every location", async () => {
    const rows = await getStockActivityByLocation(today);
    const ids = rows.map((r) => r.locationId);
    // Our three fixture locations, in that relative order (other rows from
    // the seed / other suites may also be present — assert relative order
    // only for the ones we own).
    const ourRows = rows.filter((r) =>
      [storeId, restaurantId, canteenId].includes(r.locationId),
    );
    expect(ourRows.map((r) => r.locationId)).toEqual([
      storeId,
      restaurantId,
      canteenId,
    ]);
    expect(ids).toContain(storeId);
  });

  it("movementCount counts only today's StockMovement rows at that location", async () => {
    await prisma.stockMovement.create({
      data: {
        productId,
        locationId: storeId,
        movementType: "opening",
        quantity: 10,
        recordedById: adminId,
        occurredAt: businessDateStartUtc(today),
      },
    });
    // A movement dated yesterday must NOT count.
    const yesterday = new Date(businessDateStartUtc(today));
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    await prisma.stockMovement.create({
      data: {
        productId,
        locationId: storeId,
        movementType: "opening",
        quantity: 5,
        recordedById: adminId,
        occurredAt: yesterday,
      },
    });

    const rows = await getStockActivityByLocation(today);
    const store = rows.find((r) => r.locationId === storeId)!;
    expect(store.movementCount).toBe(1);
  });

  it("lowStockCount reflects a product at ≤ 0 on hand, right now", async () => {
    // Net to -3 at the Store: opening 10, issue 13.
    await prisma.stockMovement.createMany({
      data: [
        {
          productId,
          locationId: storeId,
          movementType: "opening",
          quantity: 10,
          recordedById: adminId,
          occurredAt: businessDateStartUtc(today),
        },
        {
          productId,
          locationId: storeId,
          movementType: "issue",
          quantity: -13,
          recordedById: adminId,
          occurredAt: businessDateStartUtc(today),
        },
      ],
    });

    const rows = await getStockActivityByLocation(today);
    const store = rows.find((r) => r.locationId === storeId)!;
    expect(store.lowStockCount).toBeGreaterThanOrEqual(1);
  });

  it("Store's handoverStatus is null — no handover flow", async () => {
    const rows = await getStockActivityByLocation(today);
    const store = rows.find((r) => r.locationId === storeId)!;
    expect(store.handoverStatus).toBeNull();
  });

  it("handoverStatus AGREES with getReconciliation(today) — awaiting, then received", async () => {
    const h = await declareHandover(
      { cashDeclared: "1000.00", mpesaDeclared: "500.00" },
      { userId: cashierId, role: "cashier" },
    );

    // ── Awaiting ──
    let rows = await getStockActivityByLocation(today);
    let restaurant = rows.find((r) => r.locationId === restaurantId)!;
    let recon = await getReconciliation(today);
    let reconRow = recon.rows.find((r) => r.locationId === restaurantId);
    expect(reconRow?.received).toBe(false);
    expect(restaurant.handoverStatus).toBe("awaiting");

    // ── Received ──
    await recordReceipt(
      { handoverId: h.id, cashReceived: "1000.00", mpesaReceived: "500.00" },
      { userId: adminId, role: "admin" },
    );
    rows = await getStockActivityByLocation(today);
    restaurant = rows.find((r) => r.locationId === restaurantId)!;
    recon = await getReconciliation(today);
    reconRow = recon.rows.find((r) => r.locationId === restaurantId);
    expect(reconRow?.received).toBe(true);
    expect(restaurant.handoverStatus).toBe("received");
  });

  it("a location with any row still awaiting is 'awaiting', even if another row at the same location is received", async () => {
    const staff2 = await prisma.staff.create({
      data: {
        name: `${PREFIX} Cashier Two`,
        role: "cashier",
        locationId: restaurantId,
        dailyRate: new Prisma.Decimal("0"),
        active: true,
      },
    });
    const cashier2 = await prisma.user.create({
      data: {
        name: `${PREFIX} Cashier Two`,
        pinHash: "x",
        role: "cashier",
        active: true,
        staffId: staff2.id,
      },
    });

    const h1 = await declareHandover(
      { cashDeclared: "300.00", mpesaDeclared: "0.00" },
      { userId: cashierId, role: "cashier" },
    );
    await recordReceipt(
      { handoverId: h1.id, cashReceived: "300.00", mpesaReceived: "0.00" },
      { userId: adminId, role: "admin" },
    );
    // Second handover, same location, no receipt yet.
    await declareHandover(
      { cashDeclared: "200.00", mpesaDeclared: "0.00" },
      { userId: cashier2.id, role: "cashier" },
    );

    const rows = await getStockActivityByLocation(today);
    const restaurant = rows.find((r) => r.locationId === restaurantId)!;
    const recon = await getReconciliation(today);
    const reconRows = recon.rows.filter((r) => r.locationId === restaurantId);
    expect(reconRows.some((r) => !r.received)).toBe(true);
    expect(restaurant.handoverStatus).toBe("awaiting");
  });
});
