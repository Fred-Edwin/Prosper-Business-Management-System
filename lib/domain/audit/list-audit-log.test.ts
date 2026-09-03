import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { listAuditLog } from "./list-audit-log";

/**
 * The audit-log READ side (M5 S11). This suite writes `AuditLog` rows
 * directly — the write side is proven by every other module's tests; here
 * we prove the filter / pagination / resolution behaviour of the read.
 *
 * Rows are namespaced by this suite's users (cleanup deletes by
 * `userId`), and dated to a quiet stretch of 2024 nothing else touches.
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
    await prisma.location.deleteMany({ where: { name: { startsWith: PREFIX } } });
    await prisma.user.deleteMany({ where: { name: { startsWith: PREFIX } } });
    await prisma.$disconnect();
  });

  it("returns newest-first, resolves the actor name, and paginates with a total", async () => {
    const page = await listAuditLog({ from: DAY, to: DAY, actorId: adminId });
    // admin wrote: correct(11:00), day_close(23:00), staff create(09:00) → 3
    expect(page.page.total).toBe(3);
    expect(page.entries.map((e) => e.action)).toEqual([
      "day_close",
      "correct",
      "create",
    ]);
    expect(new Set(page.entries.map((e) => e.actorName))).toEqual(
      new Set([`${PREFIX} Admin`]),
    );
  });

  it("date filter excludes rows outside the business day", async () => {
    const onlyDay = await listAuditLog({ from: DAY, to: DAY });
    const spanning = await listAuditLog({ from: DAY, to: NEXT_DAY });
    expect(spanning.page.total).toBe(onlyDay.page.total + 1);
  });

  it("actor and action filters compose", async () => {
    const page = await listAuditLog({ actorId: cashierId, action: "create", from: DAY, to: DAY });
    expect(page.page.total).toBe(1);
    expect(page.entries[0].entityType).toBe("order");
  });

  it("entityType filter narrows to one type", async () => {
    const page = await listAuditLog({ entityType: "staff", from: DAY, to: NEXT_DAY });
    expect(page.page.total).toBe(1);
    expect(page.entries[0].action).toBe("create");
  });

  it("significant group excludes routine creates and logins, keeps corrections / day close / staff", async () => {
    const page = await listAuditLog({ group: "significant", from: DAY, to: NEXT_DAY });
    const kinds = page.entries.map((e) => `${e.action}:${e.entityType}`);
    expect(kinds).toContain("correct:order");
    expect(kinds).toContain("day_close:day_close");
    expect(kinds).toContain("create:staff"); // significant by entity type
    expect(kinds).not.toContain("create:order"); // routine
    expect(kinds).not.toContain("login:user"); // routine
  });

  it("resolves entity labels for order / staff / day_close", async () => {
    const page = await listAuditLog({ from: DAY, to: DAY });
    const byType = new Map(page.entries.map((e) => [e.entityType, e]));
    expect(byType.get("day_close")?.entityLabel).toBe(DAY);
    expect(byType.get("order")?.entityLabel).toContain("KES 250.00");
    expect(byType.get("staff")?.entityLabel).toBe(`${PREFIX} Jane`);
  });

  it("pagination is stable across pages (no dup, no drop)", async () => {
    const all = await listAuditLog({ from: DAY, to: NEXT_DAY, limit: 100 });
    const p1 = await listAuditLog({ from: DAY, to: NEXT_DAY, limit: 2, offset: 0 });
    const p2 = await listAuditLog({ from: DAY, to: NEXT_DAY, limit: 2, offset: 2 });
    const p3 = await listAuditLog({ from: DAY, to: NEXT_DAY, limit: 2, offset: 4 });
    const paged = [...p1.entries, ...p2.entries, ...p3.entries].map((e) => e.id);
    expect(paged).toEqual(all.entries.map((e) => e.id));
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
    const orderLabels = page.entries
      .filter((e) => e.entityType === "order")
      .map((e) => e.entityLabel);
    expect(orderLabels.length).toBeGreaterThan(20);
    expect(new Set(orderLabels).size).toBe(1);
    expect(orderLabels.every((l) => l != null)).toBe(true);
    await prisma.auditLog.deleteMany({ where: { id: { in: extra.map((r) => r.id) } } });
  });
});
