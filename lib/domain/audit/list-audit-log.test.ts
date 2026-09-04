import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { flattenAuditItems, listAuditLog } from "./list-audit-log";

/**
 * The audit-log READ side (M5 S11; batch grouping added M5 S15). This
 * suite writes `AuditLog` rows directly — the write side is proven by
 * every other module's tests; here we prove the filter / pagination /
 * resolution / grouping behaviour of the read.
 *
 * Rows are namespaced by this suite's users (cleanup deletes by
 * `userId`), and dated to a quiet stretch of 2024 nothing else touches.
 *
 * Since S15 `listAuditLog` returns `{ items, page }` where an item is a
 * `"single"` row or a `"batch"` (rows sharing a `correlationId` inside
 * `newValue`). `flattenAuditItems` recovers the flat per-row list for
 * the assertions that don't care about grouping. `page.total` is the
 * ITEM count (a batch counts once).
 */

const PREFIX = "__audit_read_test__";
const DAY = "2024-03-15";
const NEXT_DAY = "2024-03-16";

// A UTC instant safely inside the 2024-03-15 Africa/Nairobi business day.
const at = (h: number) => new Date(`2024-03-15T${String(h).padStart(2, "0")}:00:00+03:00`);

describe("listAuditLog", () => {
  let adminId: string;
  let cashierId: string;
  let orderId: string;
  let staffId: string;
  let productAId: string;
  let productBId: string;
  let locationId: string;

  beforeAll(async () => {
    const admin = await prisma.user.create({
      data: { name: `${PREFIX} Admin`, pinHash: "x", role: "admin", active: true },
    });
    const cashier = await prisma.user.create({
      data: { name: `${PREFIX} Cashier`, pinHash: "x", role: "cashier", active: true },
    });
    adminId = admin.id;
    cashierId = cashier.id;

    const location = await prisma.location.create({
      data: { name: `${PREFIX} R`, type: "restaurant" },
    });
    locationId = location.id;
    const order = await prisma.order.create({
      data: {
        locationId: location.id,
        cashierId: cashier.id,
        orderType: "takeaway",
        paymentMethod: "cash",
        total: "250.00",
        occurredAt: at(10),
      },
    });
    orderId = order.id;
    const staff = await prisma.staff.create({
      data: {
        name: `${PREFIX} Jane`,
        role: "cashier",
        dailyRate: "500.00",
        locationId: location.id,
      },
    });
    staffId = staff.id;

    const pA = await prisma.product.create({
      data: { name: `${PREFIX} Beef`, unitLabel: "kg", kind: "ingredient" },
    });
    const pB = await prisma.product.create({
      data: { name: `${PREFIX} Rice`, unitLabel: "kg", kind: "ingredient" },
    });
    productAId = pA.id;
    productBId = pB.id;

    // 1 routine create (order), 1 correction (order), 1 day_close,
    // 1 staff create (significant by entity type), 1 login (routine),
    // all on 2024-03-15; plus 1 order create on 2024-03-16.
    await prisma.auditLog.createMany({
      data: [
        {
          userId: cashierId,
          action: "create",
          entityType: "order",
          entityId: orderId,
          newValue: { total: "250.00" },
          occurredAt: at(10),
        },
        {
          userId: adminId,
          action: "correct",
          entityType: "order",
          entityId: orderId,
          oldValue: { total: "250.00" },
          newValue: { total: "300.00", correctsOrderId: orderId },
          occurredAt: at(11),
        },
        {
          userId: adminId,
          action: "day_close",
          entityType: "day_close",
          entityId: DAY,
          newValue: { date: DAY, closedBy: adminId },
          occurredAt: at(23),
        },
        {
          userId: adminId,
          action: "create",
          entityType: "staff",
          entityId: staffId,
          newValue: { name: `${PREFIX} Jane` },
          occurredAt: at(9),
        },
        {
          userId: cashierId,
          action: "login",
          entityType: "user",
          entityId: cashierId,
          occurredAt: at(8),
        },
        {
          userId: cashierId,
          action: "create",
          entityType: "order",
          entityId: orderId,
          newValue: { total: "250.00" },
          occurredAt: new Date(`${NEXT_DAY}T10:00:00+03:00`),
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { userId: { in: [adminId, cashierId] } } });
    await prisma.order.deleteMany({ where: { id: orderId } });
    await prisma.staff.deleteMany({ where: { id: staffId } });
    await prisma.product.deleteMany({ where: { name: { startsWith: PREFIX } } });
    await prisma.location.deleteMany({ where: { name: { startsWith: PREFIX } } });
    await prisma.user.deleteMany({ where: { name: { startsWith: PREFIX } } });
    await prisma.$disconnect();
  });

  it("returns newest-first, resolves the actor name, and paginates with a total", async () => {
    const page = await listAuditLog({ from: DAY, to: DAY, actorId: adminId });
    const entries = flattenAuditItems(page.items);
    // admin wrote: correct(11:00), day_close(23:00), staff create(09:00) → 3
    expect(page.page.total).toBe(3);
    expect(entries.map((e) => e.action)).toEqual([
      "day_close",
      "correct",
      "create",
    ]);
    expect(new Set(entries.map((e) => e.actorName))).toEqual(
      new Set([`${PREFIX} Admin`]),
    );
  });

  it("returns the actor option list — every User with ≥1 audit row, name-sorted, filter-independent", async () => {
    // Narrow the page hard (one entity type) — `actors` still lists both
    // this suite's users, because it ignores the filter.
    const page = await listAuditLog({ entityType: "staff", from: DAY, to: DAY });
    const names = page.actors.map((a) => a.name);
    expect(names).toContain(`${PREFIX} Admin`);
    expect(names).toContain(`${PREFIX} Cashier`);
    expect(names).toEqual([...names].sort()); // name-sorted
    expect(page.actors.every((a) => typeof a.id === "string")).toBe(true);
  });

  it("date filter excludes rows outside the business day", async () => {
    const onlyDay = await listAuditLog({ from: DAY, to: DAY });
    const spanning = await listAuditLog({ from: DAY, to: NEXT_DAY });
    expect(spanning.page.total).toBe(onlyDay.page.total + 1);
  });

  it("actor and action filters compose", async () => {
    const page = await listAuditLog({ actorId: cashierId, action: "create", from: DAY, to: DAY });
    const entries = flattenAuditItems(page.items);
    expect(page.page.total).toBe(1);
    expect(entries[0].entityType).toBe("order");
  });

  it("entityType filter narrows to one type", async () => {
    const page = await listAuditLog({ entityType: "staff", from: DAY, to: NEXT_DAY });
    const entries = flattenAuditItems(page.items);
    expect(page.page.total).toBe(1);
    expect(entries[0].action).toBe("create");
  });

  it("significant group excludes routine creates and logins, keeps corrections / day close / staff", async () => {
    const page = await listAuditLog({ group: "significant", from: DAY, to: NEXT_DAY });
    const kinds = flattenAuditItems(page.items).map((e) => `${e.action}:${e.entityType}`);
    expect(kinds).toContain("correct:order");
    expect(kinds).toContain("day_close:day_close");
    expect(kinds).toContain("create:staff"); // significant by entity type
    expect(kinds).not.toContain("create:order"); // routine
    expect(kinds).not.toContain("login:user"); // routine
  });

  it("resolves entity labels for order / staff / day_close", async () => {
    const page = await listAuditLog({ from: DAY, to: DAY });
    const byType = new Map(
      flattenAuditItems(page.items).map((e) => [e.entityType, e]),
    );
    expect(byType.get("day_close")?.entityLabel).toBe(DAY);
    expect(byType.get("order")?.entityLabel).toContain("KES 250.00");
    expect(byType.get("staff")?.entityLabel).toBe(`${PREFIX} Jane`);
  });

  it("pagination is stable across pages (no dup, no drop)", async () => {
    const all = await listAuditLog({ from: DAY, to: NEXT_DAY, limit: 100 });
    const p1 = await listAuditLog({ from: DAY, to: NEXT_DAY, limit: 2, offset: 0 });
    const p2 = await listAuditLog({ from: DAY, to: NEXT_DAY, limit: 2, offset: 2 });
    const p3 = await listAuditLog({ from: DAY, to: NEXT_DAY, limit: 2, offset: 4 });
    const id = (x: Awaited<ReturnType<typeof listAuditLog>>) =>
      flattenAuditItems(x.items).map((e) => e.id);
    const paged = [...id(p1), ...id(p2), ...id(p3)];
    expect(paged).toEqual(id(all));
    expect(new Set(paged).size).toBe(paged.length);
    expect(p1.page.hasMore).toBe(true);
    expect(p3.page.hasMore).toBe(false);
  });

  it("does not fire a query per row (N+1 sanity)", async () => {
    // Label resolution batches every id of one entity type into a single
    // query. Add 20 more order rows: the read still resolves them all
    // from ONE order query, so every label is identical and present.
    const extra = await prisma.auditLog.createManyAndReturn({
      data: Array.from({ length: 20 }, () => ({
        userId: cashierId,
        action: "create" as const,
        entityType: "order",
        entityId: orderId,
        occurredAt: at(12),
      })),
    });
    const page = await listAuditLog({ from: DAY, to: DAY, limit: 100 });
    const orderLabels = flattenAuditItems(page.items)
      .filter((e) => e.entityType === "order")
      .map((e) => e.entityLabel);
    expect(orderLabels.length).toBeGreaterThan(20);
    expect(new Set(orderLabels).size).toBe(1);
    expect(orderLabels.every((l) => l != null)).toBe(true);
    await prisma.auditLog.deleteMany({ where: { id: { in: extra.map((r) => r.id) } } });
  });

  // ── Batch grouping (M5 S15) ────────────────────────────────────────

  describe("batch grouping", () => {
    const BDAY = "2024-04-10";
    const bat = (h: number, m = 0) =>
      new Date(`2024-04-10T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+03:00`);
    let cid: string;

    beforeAll(async () => {
      cid = `batch_${crypto.randomUUID()}`;
      await prisma.auditLog.createMany({
        data: [
          // A 3-line purchase receipt — one correlationId, all `create`.
          {
            userId: adminId,
            action: "create",
            entityType: "stock_movement",
            entityId: `${PREFIX}-mv-1`,
            newValue: {
              action: "purchase_receipt",
              movementType: "receipt",
              productId: productAId,
              locationId,
              quantity: "5.0000",
              correlationId: cid,
            },
            occurredAt: bat(9, 14),
          },
          {
            userId: adminId,
            action: "create",
            entityType: "stock_movement",
            entityId: `${PREFIX}-mv-2`,
            newValue: {
              action: "purchase_receipt",
              movementType: "receipt",
              productId: productBId,
              locationId,
              quantity: "10.0000",
              correlationId: cid,
            },
            occurredAt: bat(9, 14),
          },
          {
            userId: adminId,
            action: "create",
            entityType: "stock_movement",
            entityId: `${PREFIX}-mv-3`,
            newValue: {
              action: "purchase_receipt",
              movementType: "receipt",
              productId: productAId,
              locationId,
              quantity: "2.0000",
              correlationId: cid,
            },
            occurredAt: bat(9, 14),
          },
          // A non-batched action the same day — stays a plain row.
          {
            userId: adminId,
            action: "correct",
            entityType: "order",
            entityId: orderId,
            oldValue: { total: "250.00" },
            newValue: { total: "260.00", correctsOrderId: orderId },
            occurredAt: bat(12),
          },
        ],
      });
    });

    afterAll(async () => {
      await prisma.auditLog.deleteMany({
        where: { entityId: { startsWith: `${PREFIX}-mv-` } },
      });
      await prisma.auditLog.deleteMany({
        where: { userId: adminId, occurredAt: { gte: bat(0), lt: bat(23, 59) } },
      });
    });

    it("folds rows sharing a correlationId into ONE batch item that expands to the rows", async () => {
      const page = await listAuditLog({ from: BDAY, to: BDAY });
      // 2 items: the batch + the plain correction.
      expect(page.page.total).toBe(2);
      const batch = page.items.find((i) => i.kind === "batch");
      expect(batch).toBeDefined();
      if (batch?.kind !== "batch") throw new Error("expected a batch");
      expect(batch.count).toBe(3);
      expect(batch.correlationId).toBe(cid);
      expect(batch.action).toBe("create");
      expect(batch.entityType).toBe("stock_movement");
      expect(batch.subAction).toBe("purchase_receipt");
      expect(batch.actorName).toBe(`${PREFIX} Admin`);
      expect(batch.entries).toHaveLength(3);
      expect(batch.entries.map((e) => e.entityId).sort()).toEqual([
        `${PREFIX}-mv-1`,
        `${PREFIX}-mv-2`,
        `${PREFIX}-mv-3`,
      ]);
    });

    it("a non-batched action on the same page stays a plain single row", async () => {
      const page = await listAuditLog({ from: BDAY, to: BDAY });
      const single = page.items.find((i) => i.kind === "single");
      expect(single).toBeDefined();
      if (single?.kind !== "single") throw new Error("expected a single");
      expect(single.entry.action).toBe("correct");
      expect(single.entry.entityType).toBe("order");
    });

    it("never splits a batch across a page boundary — paging by item", async () => {
      // Order newest-first: the correction (12:00) then the batch (09:14).
      // limit 1: page 0 = the correction (single); page 1 = the whole
      // batch as ONE item with all 3 rows — never sliced 1-of-3.
      const p0 = await listAuditLog({ from: BDAY, to: BDAY, limit: 1, offset: 0 });
      const p1 = await listAuditLog({ from: BDAY, to: BDAY, limit: 1, offset: 1 });
      expect(p0.items).toHaveLength(1);
      expect(p1.items).toHaveLength(1);
      expect(p0.page.total).toBe(2);
      expect(p0.page.hasMore).toBe(true);
      expect(p1.page.hasMore).toBe(false);

      expect(p0.items[0].kind).toBe("single");
      const batch = p1.items[0];
      expect(batch.kind).toBe("batch");
      if (batch.kind === "batch") expect(batch.entries).toHaveLength(3);

      // No row id appears on both pages.
      const ids = (x: Awaited<ReturnType<typeof listAuditLog>>) =>
        flattenAuditItems(x.items).map((e) => e.id);
      expect(ids(p0).some((i) => ids(p1).includes(i))).toBe(false);
    });

    it("a mixed batch (rows of one correlationId but differing entityType) reports entityType null and splits by action", async () => {
      const mcid = `batch_${crypto.randomUUID()}`;
      const md = "2024-04-11";
      const mat = new Date(`2024-04-11T09:00:00+03:00`);
      await prisma.auditLog.createMany({
        data: [
          {
            userId: adminId,
            action: "create",
            entityType: "stock_movement",
            entityId: `${PREFIX}-mx-1`,
            newValue: { action: "transfer", correlationId: mcid },
            occurredAt: mat,
          },
          {
            userId: adminId,
            action: "create",
            entityType: "stock_count",
            entityId: `${PREFIX}-mx-2`,
            newValue: { action: "count", correlationId: mcid },
            occurredAt: mat,
          },
        ],
      });
      const page = await listAuditLog({ from: md, to: md });
      // Same action ("create") + same correlationId → one batch, but the
      // entityType is not uniform, so it is reported null (subAction too).
      expect(page.page.total).toBe(1);
      const b = page.items[0];
      expect(b.kind).toBe("batch");
      if (b.kind === "batch") {
        expect(b.count).toBe(2);
        expect(b.entityType).toBeNull();
        expect(b.subAction).toBeNull();
      }
      await prisma.auditLog.deleteMany({
        where: { entityId: { startsWith: `${PREFIX}-mx-` } },
      });
    });
  });
});
