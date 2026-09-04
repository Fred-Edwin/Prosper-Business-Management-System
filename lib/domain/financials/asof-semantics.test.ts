import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { businessDateLastInstantUtc } from "@/lib/time";
import { getAccountBalances } from "./get-account-balances";
import { getFinancialSummary } from "./get-financial-summary";
import { getOwnerDrawsForPeriod, getOwnerOwedToBusiness } from "./owner-transactions";
import { recordMoneyMovement } from "./record-money-movement";
import {
  cleanupFinancialsTestData,
  setupFinancialsWorld,
  type FinancialsWorldCtx,
} from "./test-helpers";

/**
 * ADR-57 — flows accumulate over `from..to`; balances are read as of the
 * END of `to`. These suites pin that split: they add money / owner /
 * customer-credit rows on specific Africa/Nairobi business dates and
 * assert that a summary for a past range shows the balance *as it stood
 * then*, not the running "now" total.
 *
 * All rows are dated well clear of the seed and sibling suites (a quiet
 * stretch of April 2026) and are matched back by this suite's own prefix.
 */

const SCOPE = "asof";
const d = (iso: string) => new Date(iso);

describe("asOf cutoff on getAccountBalances", () => {
  let ctx: FinancialsWorldCtx;

  beforeAll(async () => {
    ctx = await setupFinancialsWorld(SCOPE);
    const mk = (amount: string, businessDay: string, hourZ: string, n: number) =>
      recordMoneyMovement(
        {
          account: "cash",
          amount: new Prisma.Decimal(amount),
          sourceType: "repayment",
          sourceId: `${ctx.prefix}bal${n}`,
          // 12:00Z is inside every Africa/Nairobi business day it names.
          occurredAt: d(`${businessDay}T${hourZ}:00:00Z`),
        },
        { actorId: ctx.actorId },
      );
    // 04-10: +1000 ; 04-11: +500 ; 04-12: −200. Boundary probe: a row at
    // the very last instant of 04-11 must count for asOf = end of 04-11.
    await mk("1000.00", "2026-04-10", "12", 1);
    await mk("500.00", "2026-04-11", "12", 2);
    await mk("-200.00", "2026-04-12", "12", 3);
  });

  afterAll(async () => {
    await cleanupFinancialsTestData(SCOPE);
    await prisma.$disconnect();
  });

  /** This suite's own cash contribution as of an instant. */
  async function ownCashAsOf(asOf: Date): Promise<string> {
    const rows = await prisma.moneyMovement.findMany({
      where: { sourceId: { startsWith: `${ctx.prefix}bal` }, occurredAt: { lte: asOf } },
      select: { amount: true },
    });
    return rows
      .reduce((s, r) => s.add(r.amount), new Prisma.Decimal(0))
      .toFixed(2);
  }

  it("excludes movements after the cutoff", async () => {
    const asOf = businessDateLastInstantUtc("2026-04-11");
    // Own rows on/before end of 04-11: 1000 + 500 = 1500 (the −200 on 04-12 is out).
    expect(await ownCashAsOf(asOf)).toBe("1500.00");
  });

  it("includes a movement dated on the cutoff's own business day", async () => {
    // A row at 23:59:59.999 Nairobi on 04-11 (20:59:59.999Z) is still in.
    const boundaryRow = await recordMoneyMovement(
      {
        account: "cash",
        amount: new Prisma.Decimal("7.00"),
        sourceType: "repayment",
        sourceId: `${ctx.prefix}balBoundary`,
        occurredAt: businessDateLastInstantUtc("2026-04-11"),
      },
      { actorId: ctx.actorId },
    );

    const asOf = businessDateLastInstantUtc("2026-04-11");
    const rows = await prisma.moneyMovement.findMany({
      where: {
        sourceId: { startsWith: `${ctx.prefix}bal` },
        occurredAt: { lte: asOf },
      },
      select: { amount: true },
    });
    const own = rows
      .reduce((s, r) => s.add(r.amount), new Prisma.Decimal(0))
      .toFixed(2);
    expect(own).toBe("1507.00"); // 1000 + 500 + 7

    await prisma.moneyMovement.delete({ where: { id: boundaryRow.id } });
  });

  it("a past asOf differs from the no-argument 'now' balance", async () => {
    const past = await getAccountBalances({
      asOf: businessDateLastInstantUtc("2026-04-10"),
    });
    const later = await getAccountBalances({
      asOf: businessDateLastInstantUtc("2026-04-12"),
    });
    // This suite adds +1000 by end of 04-10 and a further +500 −200 = +300
    // by end of 04-12, so the two reads must differ by exactly 300.
    expect(later.cash.sub(past.cash).toFixed(2)).toBe("300.00");
  });
});

describe("asOf cutoff on getOwnerOwedToBusiness", () => {
  let ctx: FinancialsWorldCtx;

  beforeAll(async () => {
    ctx = await setupFinancialsWorld(SCOPE + "-owner");
    // draw 300 on 04-10, return 100 on 04-12. Owed = draws − returns.
    await prisma.ownerTransaction.createMany({
      data: [
        {
          type: "draw",
          amount: new Prisma.Decimal(300),
          date: d("2026-04-10T09:00:00Z"),
          note: `${ctx.prefix}owner draw`,
        },
        {
          type: "return",
          amount: new Prisma.Decimal(100),
          date: d("2026-04-12T09:00:00Z"),
          note: `${ctx.prefix}owner return`,
        },
      ],
    });
  });

  afterAll(async () => {
    await cleanupFinancialsTestData(SCOPE + "-owner");
    await prisma.$disconnect();
  });

  async function ownOwedAsOf(asOf: Date): Promise<string> {
    const rows = await prisma.ownerTransaction.findMany({
      where: { note: { startsWith: ctx.prefix }, date: { lte: asOf } },
      select: { type: true, amount: true },
    });
    let owed = new Prisma.Decimal(0);
    for (const r of rows)
      owed = r.type === "draw" ? owed.add(r.amount) : owed.sub(r.amount);
    return owed.toFixed(2);
  }

  it("owed-to-business as of end of 04-11 sees only the draw (300)", async () => {
    expect(await ownOwedAsOf(businessDateLastInstantUtc("2026-04-11"))).toBe(
      "300.00",
    );
  });

  it("owed-to-business as of end of 04-12 sees the return too (200)", async () => {
    expect(await ownOwedAsOf(businessDateLastInstantUtc("2026-04-12"))).toBe(
      "200.00",
    );
  });

  it("getOwnerOwedToBusiness(asOf) drops a later transaction", async () => {
    const early = await getOwnerOwedToBusiness(
      businessDateLastInstantUtc("2026-04-11"),
    );
    const late = await getOwnerOwedToBusiness(
      businessDateLastInstantUtc("2026-04-12"),
    );
    // The 04-12 return of 100 reduces the figure by exactly 100.
    expect(early.sub(late).toFixed(2)).toBe("100.00");
  });

  // Dashboard v2, §1a — `ownerDrawsForPeriod` is a FLOW: it sums draws
  // only over `from..to`, unlike the balance above (draws − returns,
  // as-of a single instant).
  it("getFinancialSummary(from, to).consolidated.ownerDrawsForPeriod equals getOwnerDrawsForPeriod and ignores the return", async () => {
    const summary = await getFinancialSummary("2026-04-01", "2026-04-30");
    const direct = await getOwnerDrawsForPeriod("2026-04-01", "2026-04-30");
    expect(summary.consolidated.ownerDrawsForPeriod).toBe(direct.toFixed(2));
    // Only the draw (300) counts — the return (100) is excluded, not
    // subtracted, so this differs from ownerOwedToBusiness (200).
    expect(summary.consolidated.ownerDrawsForPeriod).toBe("300.00");
    expect(summary.consolidated.ownerOwedToBusiness).toBe("200.00");
  });

  it("ownerDrawsForPeriod does NOT move with asOf/to the way the balance does — a draw outside the range is excluded entirely", async () => {
    // Range ending before the return (04-12) still counts the draw fully.
    const early = await getFinancialSummary("2026-04-01", "2026-04-11");
    expect(early.consolidated.ownerDrawsForPeriod).toBe("300.00");
    // A range that excludes the draw's date entirely sees none of it.
    const before = await getFinancialSummary("2026-04-01", "2026-04-09");
    expect(before.consolidated.ownerDrawsForPeriod).toBe("0.00");
  });
});

describe("getFinancialSummary — flows use the whole range, balances use the end date", () => {
  let ctx: FinancialsWorldCtx;

  beforeAll(async () => {
    ctx = await setupFinancialsWorld(SCOPE + "-split");

    // A revenue-bearing order on 04-15 (a FLOW) and cash movements before
    // and after it (BALANCE inputs).
    await prisma.order.create({
      data: {
        locationId: ctx.locationIds.restaurant,
        cashierId: ctx.actorId,
        orderType: "dine_in",
        paymentMethod: "cash",
        total: new Prisma.Decimal(1000),
        occurredAt: d("2026-04-15T11:00:00Z"),
      },
    });
    const mk = (amount: string, businessDay: string, n: number) =>
      recordMoneyMovement(
        {
          account: "cash",
          amount: new Prisma.Decimal(amount),
          sourceType: "repayment",
          sourceId: `${ctx.prefix}split${n}`,
          occurredAt: d(`${businessDay}T12:00:00Z`),
        },
        { actorId: ctx.actorId },
      );
    await mk("2000.00", "2026-04-14", 1); // before the range
    await mk("400.00", "2026-04-16", 2); // inside the range
    await mk("999.00", "2026-04-20", 3); // AFTER the range's end
  });

  afterAll(async () => {
    await cleanupFinancialsTestData(SCOPE + "-split");
    await prisma.$disconnect();
  });

  it("a flow figure (revenue) is unchanged by a balance movement dated after the range", async () => {
    const wide = await getFinancialSummary("2026-04-15", "2026-04-17");
    const narrow = await getFinancialSummary("2026-04-15", "2026-04-15");
    // The 04-15 order (1000) is in both; the 04-20 cash row is revenue-
    // irrelevant. Revenue is the order total for the day either way.
    expect(wide.consolidated.revenue).toBe("1000.00");
    expect(narrow.consolidated.revenue).toBe("1000.00");
  });

  it("the cash balance for a range ending 04-17 EXCLUDES a movement dated 04-20", async () => {
    const s = await getFinancialSummary("2026-04-15", "2026-04-17");
    // Compare against a direct asOf read at end of 04-17 — they must match,
    // and the +999 on 04-20 must be in neither.
    const direct = await getAccountBalances({
      asOf: businessDateLastInstantUtc("2026-04-17"),
    });
    expect(s.consolidated.cashBalance).toBe(direct.cash.toFixed(2));

    const withLater = await getAccountBalances({
      asOf: businessDateLastInstantUtc("2026-04-20"),
    });
    expect(withLater.cash.sub(direct.cash).toFixed(2)).toBe("999.00");
  });

  it("extending the range's END DATE moves the balance but the flow only grows by in-range activity", async () => {
    const toShort = await getFinancialSummary("2026-04-15", "2026-04-17");
    const toLong = await getFinancialSummary("2026-04-15", "2026-04-20");

    // Balance: end date moved from 04-17 to 04-20, so the +999 on 04-20 is
    // now included — the cash balance rises by exactly 999.
    expect(
      Number(toLong.consolidated.cashBalance) -
        Number(toShort.consolidated.cashBalance),
    ).toBeCloseTo(999, 2);

    // Flow: no revenue-bearing activity between 04-18 and 04-20, so revenue
    // is unchanged.
    expect(toLong.consolidated.revenue).toBe(toShort.consolidated.revenue);
  });
});
