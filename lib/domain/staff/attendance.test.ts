import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { businessDateOnly, nairobiToday } from "@/lib/time";
import { closeDay, reopenDay } from "@/lib/domain/audit";
import {
  listAttendance,
  setAttendance,
  setAttendanceBulk,
} from "./attendance";
import {
  cleanupStaffTestData,
  makeBareStaff,
  setupStaffWorld,
  type StaffTestCtx,
} from "./test-helpers";

const SCOPE = "attendance";

describe("attendance", () => {
  let ctx: StaffTestCtx;
  let staffA: string;
  let staffB: string;
  const admin = () => ({ actorId: ctx.adminId, role: "admin" });

  beforeAll(async () => {
    ctx = await setupStaffWorld(SCOPE);
    staffA = await makeBareStaff(ctx, { name: `${ctx.prefix} AttA` });
    staffB = await makeBareStaff(ctx, { name: `${ctx.prefix} AttB` });
  });
  afterAll(async () => {
    await cleanupStaffTestData(SCOPE);
    await prisma.$disconnect();
  });

  it("setAttendance upserts on [staffId, date] — a second call corrects, not duplicates", async () => {
    await setAttendance(staffA, "2026-05-10", false, admin());
    await setAttendance(staffA, "2026-05-10", true, admin());

    const rows = await prisma.attendance.findMany({
      where: { staffId: staffA, date: businessDateOnly("2026-05-10") },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].present).toBe(true);
  });

  it("is NOT day-close gated — the Admin can correct attendance on a CLOSED past day", async () => {
    // This is the S8A decision: pay depends on attendance, so a closed day
    // must still be correctable. Gating it would make a wrong mark permanent.
    const day = "2026-04-02";
    await setAttendance(staffA, day, false, admin());
    await closeDay(day, ctx.adminId);
    try {
      // still allowed after close — no FORBIDDEN
      const out = await setAttendance(staffA, day, true, admin());
      expect(out.present).toBe(true);
    } finally {
      await reopenDay(day, ctx.adminId);
    }
  });

  it("rejects a non-admin actor (FORBIDDEN)", async () => {
    await expect(
      setAttendance(staffA, "2026-05-11", false, {
        actorId: ctx.adminId,
        role: "cashier",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects an unknown staff id and a malformed date", async () => {
    await expect(
      setAttendance("nope", "2026-05-11", true, admin()),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      setAttendance(staffA, "May 11", true, admin()),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("setAttendanceBulk marks one date for many staff in one call; rejects dup + unknown", async () => {
    const out = await setAttendanceBulk(
      "2026-05-12",
      [
        { staffId: staffA, present: true },
        { staffId: staffB, present: false },
      ],
      admin(),
    );
    expect(out).toHaveLength(2);

    const rows = await listAttendance("2026-05-12", "2026-05-12");
    const mine = rows.filter((r) => [staffA, staffB].includes(r.staffId));
    expect(mine).toHaveLength(2);
    expect(mine.find((r) => r.staffId === staffB)?.present).toBe(false);

    await expect(
      setAttendanceBulk(
        "2026-05-13",
        [
          { staffId: staffA, present: true },
          { staffId: staffA, present: false },
        ],
        admin(),
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

    await expect(
      setAttendanceBulk(
        "2026-05-13",
        [{ staffId: "ghost", present: true }],
        admin(),
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("listAttendance returns only the rows that exist (default-present: a missing row is not listed)", async () => {
    // staffB has no row for 2026-05-20 → it simply isn't in the result;
    // the caller treats missing as present.
    await setAttendance(staffA, "2026-05-20", false, admin());
    const rows = await listAttendance("2026-05-20", "2026-05-20", {
      staffId: staffB,
    });
    expect(rows).toHaveLength(0);

    const forA = await listAttendance("2026-05-20", "2026-05-20", {
      staffId: staffA,
    });
    expect(forA).toEqual([
      { staffId: staffA, date: "2026-05-20", present: false },
    ]);
  });

  it("listAttendance rejects an inverted range", async () => {
    await expect(
      listAttendance("2026-05-10", "2026-05-01"),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("accepts a backdated mark for today too (sanity)", async () => {
    const today = nairobiToday();
    const out = await setAttendance(staffB, today, true, admin());
    expect(out.date).toBe(today);
  });
});
