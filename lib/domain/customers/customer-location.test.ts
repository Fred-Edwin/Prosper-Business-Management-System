import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { createCustomer } from "./create-customer";
import { listCustomers } from "./list-customers";
import { setCustomerLocation } from "./set-customer-location";
import {
  cleanupCustomersTestData,
  setupCustomersTestData,
  type CustomersTestCtx,
} from "./test-helpers";

// ADR-93 — a customer's location label: set from the creator's role,
// filterable, and relabelled by the Admin only.
const SCOPE = "location";

describe("customer location (ADR-93)", () => {
  let ctx: CustomersTestCtx;
  let P: string;

  beforeAll(async () => {
    ctx = await setupCustomersTestData(SCOPE);
    P = ctx.prefix;
  });
  afterAll(async () => {
    await cleanupCustomersTestData(SCOPE);
    await prisma.$disconnect();
  });

  describe("createCustomer picks the location from the actor's role", () => {
    it("cashier → restaurant, even if another location is requested", async () => {
      const c = await createCustomer(
        { name: `${P}ByCashier`, phone: "1", location: "canteen" },
        { actorId: ctx.cashierId, role: "cashier" },
      );
      expect(c.location).toBe("restaurant");
    });

    it("canteen attendant → canteen", async () => {
      const c = await createCustomer(
        { name: `${P}ByAttendant`, phone: "1" },
        { actorId: ctx.adminId, role: "canteen_attendant" },
      );
      expect(c.location).toBe("canteen");
    });

    it("admin → the chosen location, or unassigned when none is chosen", async () => {
      const chosen = await createCustomer(
        { name: `${P}AdminBoth`, phone: "1", location: "both" },
        { actorId: ctx.adminId, role: "admin" },
      );
      expect(chosen.location).toBe("both");
      const unchosen = await createCustomer(
        { name: `${P}AdminNone`, phone: "1" },
        { actorId: ctx.adminId, role: "admin" },
      );
      expect(unchosen.location).toBe("unassigned");

      const audit = await prisma.auditLog.findFirstOrThrow({
        where: { entityType: "customer", entityId: chosen.id, action: "create" },
      });
      expect(audit.newValue).toMatchObject({ location: "both" });
    });
  });

  it("listCustomers filters by location and returns it on each row", async () => {
    const r = await createCustomer(
      { name: `${P}ListRest`, phone: "1" },
      { actorId: ctx.cashierId, role: "cashier" },
    );
    const c = await createCustomer(
      { name: `${P}ListCant`, phone: "1" },
      { actorId: ctx.adminId, role: "canteen_attendant" },
    );

    const canteenOnly = await listCustomers({ search: `${P}List`, location: "canteen" });
    expect(canteenOnly.map((x) => x.id)).toEqual([c.id]);
    expect(canteenOnly[0].location).toBe("canteen");

    const all = await listCustomers({ search: `${P}List` });
    expect(all.map((x) => x.id).sort()).toEqual([c.id, r.id].sort());
  });

  describe("setCustomerLocation", () => {
    it("admin relabels a customer and the change is audited was → now", async () => {
      const c = await createCustomer(
        { name: `${P}Relabel`, phone: "1" },
        { actorId: ctx.adminId, role: "admin" },
      );
      const updated = await setCustomerLocation(c.id, "canteen", {
        actorId: ctx.adminId,
        role: "admin",
      });
      expect(updated.location).toBe("canteen");

      const audit = await prisma.auditLog.findFirstOrThrow({
        where: { entityType: "customer", entityId: c.id, action: "correct" },
      });
      expect(audit.oldValue).toMatchObject({ location: "unassigned" });
      expect(audit.newValue).toMatchObject({ location: "canteen" });

      // Same value again: no-op, no second audit row.
      await setCustomerLocation(c.id, "canteen", { actorId: ctx.adminId, role: "admin" });
      expect(
        await prisma.auditLog.count({
          where: { entityType: "customer", entityId: c.id, action: "correct" },
        }),
      ).toBe(1);
    });

    it("non-admin: FORBIDDEN; unknown customer: NOT_FOUND", async () => {
      const c = await createCustomer(
        { name: `${P}NoRelabel`, phone: "1" },
        { actorId: ctx.cashierId, role: "cashier" },
      );
      await expect(
        setCustomerLocation(c.id, "canteen", { actorId: ctx.cashierId, role: "cashier" }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        setCustomerLocation("00000000-0000-0000-0000-000000000000", "canteen", {
          actorId: ctx.adminId,
          role: "admin",
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });
});
