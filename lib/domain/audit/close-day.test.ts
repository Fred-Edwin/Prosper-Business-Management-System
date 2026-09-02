import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { businessDateOnly } from "@/lib/time";
import { DomainError } from "./errors";
import {
  closeDay,
  reopenDay,
  getDayStatus,
  listDayCloses,
} from ".";
import {
  isDayClosed,
  assertDayOpen,
  assertActorMayCorrectOnDate,
} from "./day-close-guard";
import {
  cleanupAuditTestData,
  setupAuditTestData,
  type AuditTestCtx,
} from "./test-helpers";

const SCOPE = "close";
// Fixed dates far outside any range another suite touches.
const D1 = "2019-03-11";
const D2 = "2019-03-12";

describe("Day Close domain (ADR-52)", () => {
  let ctx: AuditTestCtx;

  beforeEach(async () => {
    ctx = await setupAuditTestData(SCOPE);
  });
  afterEach(async () => {
    await cleanupAuditTestData(SCOPE);
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("closeDay seals the date and writes a day_close AuditLog row", async () => {
    const view = await closeDay(D1, ctx.adminId);
    expect(view.date).toBe(D1);
    expect(view.closedBy).toBe(ctx.adminId);

    expect(
      await prisma.dayClose.findUnique({
        where: { date: businessDateOnly(D1) },
      }),
    ).not.toBeNull();

    const audit = await prisma.auditLog.findMany({
      where: { userId: ctx.adminId, action: "day_close" },
    });
    expect(audit).toHaveLength(1);
    expect(audit[0].entityType).toBe("day_close");
    expect(audit[0].entityId).toBe(D1);
  });

  it("double-close is a CONFLICT, no second row, no second audit entry", async () => {
    await closeDay(D1, ctx.adminId);
    await expect(closeDay(D1, ctx.adminId)).rejects.toMatchObject({
      constructor: DomainError,
      code: "CONFLICT",
    });
    expect(
      await prisma.dayClose.count({ where: { date: businessDateOnly(D1) } }),
    ).toBe(1);
    expect(
      await prisma.auditLog.count({
        where: { userId: ctx.adminId, action: "day_close" },
      }),
    ).toBe(1);
  });

  it("reopenDay clears the seal and writes a day_reopen AuditLog row", async () => {
    await closeDay(D1, ctx.adminId);
    const result = await reopenDay(D1, ctx.adminId);
    expect(result).toEqual({ date: D1, reopened: true });

    expect(
      await prisma.dayClose.findUnique({
        where: { date: businessDateOnly(D1) },
      }),
    ).toBeNull();

    const audit = await prisma.auditLog.findMany({
      where: { userId: ctx.adminId, action: "day_reopen" },
    });
    expect(audit).toHaveLength(1);
    expect(audit[0].entityId).toBe(D1);
  });

  it("close → reopen → close again leaves 2 day_close + 1 day_reopen audit rows", async () => {
    await closeDay(D1, ctx.adminId);
    await reopenDay(D1, ctx.adminId);
    await closeDay(D1, ctx.adminId);

    expect(
      await prisma.auditLog.count({
        where: { userId: ctx.adminId, action: "day_close" },
      }),
    ).toBe(2);
    expect(
      await prisma.auditLog.count({
        where: { userId: ctx.adminId, action: "day_reopen" },
      }),
    ).toBe(1);
    expect(await isDayClosed(D1)).toBe(true);
  });

  it("reopenDay on a date that is not closed → NOT_FOUND", async () => {
    await expect(reopenDay(D2, ctx.adminId)).rejects.toMatchObject({
      constructor: DomainError,
      code: "NOT_FOUND",
    });
  });

  it("getDayStatus / listDayCloses reflect the seal", async () => {
    expect((await getDayStatus(D1)).closed).toBe(false);
    await closeDay(D1, ctx.adminId);
    const status = await getDayStatus(D1);
    expect(status).toMatchObject({ date: D1, closed: true, closedBy: ctx.adminId });
    expect((await listDayCloses()).some((r) => r.date === D1)).toBe(true);
  });

  describe("shared guard", () => {
    it("assertDayOpen throws FORBIDDEN once the date is sealed", async () => {
      await assertDayOpen(D1); // open — no throw
      await closeDay(D1, ctx.adminId);
      await expect(assertDayOpen(D1)).rejects.toMatchObject({
        constructor: DomainError,
        code: "FORBIDDEN",
      });
    });

    it("assertActorMayCorrectOnDate: closed day is admin-only; open day allows the recorder", async () => {
      // Open day — the original recorder may correct.
      await assertActorMayCorrectOnDate(
        D2,
        { userId: ctx.staffId, role: "store_manager" },
        ctx.staffId,
      );
      // Open day — an unrelated staffer may not.
      await expect(
        assertActorMayCorrectOnDate(
          D2,
          { userId: "someone-else", role: "store_manager" },
          ctx.staffId,
        ),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });

      await closeDay(D1, ctx.adminId);
      // Closed day — even the original recorder is blocked.
      await expect(
        assertActorMayCorrectOnDate(
          D1,
          { userId: ctx.staffId, role: "store_manager" },
          ctx.staffId,
        ),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      // Closed day — admin proceeds.
      await assertActorMayCorrectOnDate(
        D1,
        { userId: ctx.adminId, role: "admin" },
        ctx.staffId,
      );
    });
  });
});
