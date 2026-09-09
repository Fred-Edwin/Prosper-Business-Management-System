import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { getReconciliation } from "./get-reconciliation";
import { recordHandoverForDate } from "./record-handover-for-date";
import {
  cleanupHandoversTestData,
  setupHandoversTestData,
  type HandoversTestCtx,
} from "./test-helpers";

const SCOPE = "backdated";

/** A far-past date this suite seals; kept well away from other suites. */
const SEALED_DATE = "2019-05-05";
/** A far-past date this suite leaves open. */
const OPEN_DATE = "2019-05-06";

describe("recordHandoverForDate (ADR-79 — Admin back-entry)", () => {
  let ctx: HandoversTestCtx;
  let admin: { userId: string; role: string };
  let cashier: { userId: string; role: string };

  beforeEach(async () => {
    ctx = await setupHandoversTestData(SCOPE);
    admin = { userId: ctx.adminId, role: "admin" };
    cashier = { userId: ctx.cashierId, role: "cashier" };
  });
  afterEach(async () => {
    await prisma.dayClose.deleteMany({ where: { closedBy: ctx.adminId } });
    await cleanupHandoversTestData(SCOPE);
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("Admin creates a handover for a past OPEN day, pinned to noon Nairobi", async () => {
    const h = await recordHandoverForDate(
      {
        staffId: ctx.cashierStaffId,
        locationId: ctx.restaurantId,
        cashDeclared: "3428.00",
        mpesaDeclared: "8362.00",
        businessDate: OPEN_DATE,
      },
      admin,
    );
    expect(h.staffId).toBe(ctx.cashierStaffId);
    expect(h.locationId).toBe(ctx.restaurantId);
    expect(h.cashDeclared).toBe("3428.00");
    expect(h.mpesaDeclared).toBe("8362.00");
    expect(h.correctsHandoverId).toBeNull();
    // Noon Nairobi (UTC+3) on OPEN_DATE = 09:00 UTC.
    expect(h.occurredAt).toBe(`${OPEN_DATE}T09:00:00.000Z`);

    const recon = await getReconciliation(OPEN_DATE);
    expect(recon.rows.map((r) => r.handoverId)).toContain(h.id);
  });

  it("Admin creates a handover for a past CLOSED day", async () => {
    await prisma.dayClose.create({
      data: { date: new Date(`${SEALED_DATE}T00:00:00Z`), closedBy: ctx.adminId },
    });
    const h = await recordHandoverForDate(
      {
        staffId: ctx.attendantStaffId,
        locationId: ctx.canteenId,
        cashDeclared: "100.00",
        mpesaDeclared: "0.00",
        businessDate: SEALED_DATE,
      },
      admin,
    );
    expect(h.locationId).toBe(ctx.canteenId);
  });

  it("non-admin actor → FORBIDDEN", async () => {
    await expect(
      recordHandoverForDate(
        {
          staffId: ctx.cashierStaffId,
          locationId: ctx.restaurantId,
          cashDeclared: "10.00",
          mpesaDeclared: "0.00",
          businessDate: OPEN_DATE,
        },
        cashier,
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("locationId not matching the staff member's own location → VALIDATION_ERROR", async () => {
    await expect(
      recordHandoverForDate(
        {
          staffId: ctx.cashierStaffId, // belongs to restaurantId
          locationId: ctx.canteenId,
          cashDeclared: "10.00",
          mpesaDeclared: "0.00",
          businessDate: OPEN_DATE,
        },
        admin,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "locationId" });
  });

  it("unknown staffId → NOT_FOUND", async () => {
    await expect(
      recordHandoverForDate(
        {
          staffId: "00000000-0000-0000-0000-000000000000",
          locationId: ctx.restaurantId,
          cashDeclared: "10.00",
          mpesaDeclared: "0.00",
          businessDate: OPEN_DATE,
        },
        admin,
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND", field: "staffId" });
  });

  it("a second back-entry for the same staff + day → CONFLICT, first row untouched", async () => {
    const first = await recordHandoverForDate(
      {
        staffId: ctx.cashierStaffId,
        locationId: ctx.restaurantId,
        cashDeclared: "500.00",
        mpesaDeclared: "0.00",
        businessDate: OPEN_DATE,
      },
      admin,
    );

    await expect(
      recordHandoverForDate(
        {
          staffId: ctx.cashierStaffId,
          locationId: ctx.restaurantId,
          cashDeclared: "999.00",
          mpesaDeclared: "0.00",
          businessDate: OPEN_DATE,
        },
        admin,
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    const reread = await prisma.handover.findUniqueOrThrow({
      where: { id: first.id },
    });
    expect(reread.cashDeclared.toFixed(2)).toBe("500.00");
  });

  it("negative cashDeclared → VALIDATION_ERROR", async () => {
    await expect(
      recordHandoverForDate(
        {
          staffId: ctx.cashierStaffId,
          locationId: ctx.restaurantId,
          cashDeclared: "-1.00",
          mpesaDeclared: "0.00",
          businessDate: OPEN_DATE,
        },
        admin,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "cashDeclared" });
  });

  it("writes an AuditLog 'create' row marked as a back-entry", async () => {
    const h = await recordHandoverForDate(
      {
        staffId: ctx.cashierStaffId,
        locationId: ctx.restaurantId,
        cashDeclared: "10.00",
        mpesaDeclared: "5.00",
        businessDate: OPEN_DATE,
      },
      admin,
    );
    const log = await prisma.auditLog.findFirst({
      where: { entityType: "handover", entityId: h.id, action: "create" },
    });
    expect(log).not.toBeNull();
    expect((log?.newValue as { backEntry?: boolean })?.backEntry).toBe(true);
  });

  it("regression: writes no MoneyMovement (ADR-53) — no account balance moves", async () => {
    const before = await prisma.moneyMovement.count();
    await recordHandoverForDate(
      {
        staffId: ctx.cashierStaffId,
        locationId: ctx.restaurantId,
        cashDeclared: "1000.00",
        mpesaDeclared: "2000.00",
        businessDate: OPEN_DATE,
      },
      admin,
    );
    const after = await prisma.moneyMovement.count();
    expect(after).toBe(before);
  });
});
