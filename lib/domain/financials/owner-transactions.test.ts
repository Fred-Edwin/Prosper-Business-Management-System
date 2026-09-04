import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { businessDateOnly } from "@/lib/time";
import {
  getOwnerDrawsForPeriod,
  getOwnerOwedToBusiness,
  listOwnerTransactions,
  recordOwnerTransaction,
} from "./owner-transactions";
import {
  cleanupFinancialsTestData,
  setupFinancialsTestData,
  type FinancialsTestCtx,
} from "./test-helpers";

const SCOPE = "owner_txn";

describe("recordOwnerTransaction", () => {
  let ctx: FinancialsTestCtx;
  let note: string;

  beforeAll(async () => {
    ctx = await setupFinancialsTestData(SCOPE);
    note = `${ctx.prefix} note`;
  });

  afterAll(async () => {
    await cleanupFinancialsTestData(SCOPE);
    await prisma.$disconnect();
  });

  // Cash-at-hand movement is asserted through the paired MoneyMovement
  // row, not a global `getAccountBalances()` delta — that sum is shared
  // dev-DB state and sibling suites move `cash` concurrently.

  it("a draw reduces Cash at hand (negative MoneyMovement, owner_draw)", async () => {
    const owedBefore = await getOwnerOwedToBusiness();
    const view = await recordOwnerTransaction(
      { type: "draw", amount: "5000.00", date: "2026-08-10", note },
      { actorId: ctx.actorId, role: "admin" },
    );
    expect(view.type).toBe("draw");

    const mm = await prisma.moneyMovement.findMany({
      where: { sourceType: "owner_draw", sourceId: view.id },
    });
    expect(mm).toHaveLength(1);
    expect(mm[0].account).toBe("cash");
    expect(mm[0].amount.toFixed(2)).toBe("-5000.00"); // money OUT of cash

    // Owed-to-business is derived (Σ draws − Σ returns) — a draw adds to it.
    const owedAfter = await getOwnerOwedToBusiness();
    expect(owedAfter.sub(owedBefore).toFixed(2)).toBe("5000.00");
  });

  it("a return increases Cash at hand (positive MoneyMovement, owner_return)", async () => {
    const view = await recordOwnerTransaction(
      { type: "return", amount: "2000.00", date: "2026-08-11", note },
      { actorId: ctx.actorId, role: "admin" },
    );
    const mm = await prisma.moneyMovement.findFirstOrThrow({
      where: { sourceType: "owner_return", sourceId: view.id },
    });
    expect(mm.account).toBe("cash");
    expect(mm.amount.toFixed(2)).toBe("2000.00"); // money INTO cash
  });

  it("owed-to-business is DERIVED by summing rows: a return reduces it, a draw raises it", async () => {
    const owed0 = await getOwnerOwedToBusiness();
    await recordOwnerTransaction(
      { type: "return", amount: "800.00", date: "2026-08-12", note },
      { actorId: ctx.actorId, role: "admin" },
    );
    const owed1 = await getOwnerOwedToBusiness();
    expect(owed1.sub(owed0).toFixed(2)).toBe("-800.00"); // return lowers it

    await recordOwnerTransaction(
      { type: "draw", amount: "1500.00", date: "2026-08-12", note },
      { actorId: ctx.actorId, role: "admin" },
    );
    const owed2 = await getOwnerOwedToBusiness();
    expect(owed2.sub(owed1).toFixed(2)).toBe("1500.00"); // draw raises it

    // Nothing stored — the figure is a live SUM over the rows this suite
    // created (draws add, returns subtract): +5000 −2000 −800 +1500 = 3700.
    const rows = await prisma.ownerTransaction.findMany({ where: { note } });
    const recomputed = rows.reduce(
      (acc, r) => acc + (r.type === "draw" ? 1 : -1) * Number(r.amount),
      0,
    );
    expect(recomputed).toBeCloseTo(3700, 2);
  });

  it("lists newest first and is Admin-only", async () => {
    const rows = await listOwnerTransactions();
    expect(rows.length).toBeGreaterThanOrEqual(3);
    // Descending by date.
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1].date >= rows[i].date).toBe(true);
    }

    await expect(
      recordOwnerTransaction(
        { type: "draw", amount: "10.00", date: "2026-08-12", note },
        { actorId: ctx.otherActorId, role: "cashier" },
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("is day-close gated", async () => {
    await prisma.dayClose.create({
      data: {
        date: businessDateOnly("2026-08-09"),
        closedBy: `${ctx.prefix} sealer`,
      },
    });
    await expect(
      recordOwnerTransaction(
        { type: "draw", amount: "100.00", date: "2026-08-09", note },
        { actorId: ctx.actorId, role: "admin" },
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  // ── getOwnerDrawsForPeriod (Dashboard v2, §1a) ────────────────────────

  it("getOwnerDrawsForPeriod sums draws only (not netted against returns) over [from, to]", async () => {
    const before = await getOwnerDrawsForPeriod("2026-08-20", "2026-08-22");
    expect(before.toFixed(2)).toBe("0.00"); // fresh range, this suite's note

    await recordOwnerTransaction(
      { type: "draw", amount: "3000.00", date: "2026-08-20", note },
      { actorId: ctx.actorId, role: "admin" },
    );
    await recordOwnerTransaction(
      { type: "return", amount: "500.00", date: "2026-08-21", note },
      { actorId: ctx.actorId, role: "admin" },
    );
    await recordOwnerTransaction(
      { type: "draw", amount: "1200.00", date: "2026-08-22", note },
      { actorId: ctx.actorId, role: "admin" },
    );
    // Outside the range — must not be included.
    await recordOwnerTransaction(
      { type: "draw", amount: "9999.00", date: "2026-08-23", note },
      { actorId: ctx.actorId, role: "admin" },
    );

    const sum = await getOwnerDrawsForPeriod("2026-08-20", "2026-08-22");
    // Only the two draws in range: 3000 + 1200 = 4200. The return is
    // excluded entirely (not subtracted) — this is a FLOW of draws, not
    // the draws-minus-returns balance `getOwnerOwedToBusiness` computes.
    expect(sum.sub(before).toFixed(2)).toBe("4200.00");
  });

  it("getOwnerDrawsForPeriod rejects a malformed date", async () => {
    await expect(
      getOwnerDrawsForPeriod("2026-8-20", "2026-08-22"),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "from" });
    await expect(
      getOwnerDrawsForPeriod("2026-08-20", "not-a-date"),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "to" });
  });
});
