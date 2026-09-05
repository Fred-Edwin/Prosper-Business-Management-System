import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { nairobiToday } from "@/lib/time";
import { getAccountBalances } from "./get-account-balances";
import { getOpeningBalances, setOpeningBalance } from "./opening-balance";
import { recordMoneyMovement } from "./record-money-movement";
import {
  cleanupFinancialsTestData,
  setupFinancialsTestData,
  type FinancialsTestCtx,
} from "./test-helpers";

const SCOPE = "opening-balance";

/**
 * `resolveOpeningDay` and `getOpeningBalances` read the ledger GLOBALLY —
 * they are "the business's Day 1", not a per-suite figure — so unlike the
 * other financials suites these cannot namespace their way to isolation.
 * Each worker fork already has its own Postgres schema (see
 * `lib/db/index.ts`), so the interference to clear is rows this worker's
 * schema already holds.
 *
 * **Both ledgers matter.** `resolveOpeningDay` answers to the earliest
 * `opening` StockMovement *or* `opening_balance` MoneyMovement, and the
 * test schemas are SEEDED — the seed writes opening stock, so Day 1 is
 * the seed's date, not today, until those rows are gone too. (That is the
 * correct product behaviour: a money opening pins to the same day as
 * existing stock. It just means "today" is only the answer on a genuinely
 * virgin ledger.) The stock rows are restored by the next `test:setup`;
 * within a run, deleting them is what makes "today" assertable.
 */
async function clearOpeningRows(): Promise<void> {
  const money = await prisma.moneyMovement.findMany({
    where: { sourceType: "opening_balance" },
    select: { id: true },
  });
  if (money.length > 0) {
    const ids = money.map((r) => r.id);
    await prisma.moneyMovement.updateMany({
      where: { id: { in: ids } },
      data: { correctsMovementId: null },
    });
    await prisma.moneyMovement.deleteMany({ where: { id: { in: ids } } });
  }

  const stock = await prisma.stockMovement.findMany({
    where: { movementType: "opening" },
    select: { id: true },
  });
  if (stock.length > 0) {
    const ids = stock.map((r) => r.id);
    await prisma.stockMovement.updateMany({
      where: { id: { in: ids } },
      data: { correctsMovementId: null },
    });
    await prisma.stockMovement.deleteMany({ where: { id: { in: ids } } });
  }
}

describe("setOpeningBalance / getOpeningBalances (ADR-70)", () => {
  let ctx: FinancialsTestCtx;
  const admin = () => ({ actorId: ctx.actorId, role: "admin" });

  beforeAll(async () => {
    ctx = await setupFinancialsTestData(SCOPE);
  });

  // Before, not just after: the schema arrives SEEDED with opening stock,
  // so a virgin ledger has to be established up front too.
  beforeEach(async () => {
    await clearOpeningRows();
  });

  afterEach(async () => {
    await clearOpeningRows();
  });

  afterAll(async () => {
    await clearOpeningRows();
    await cleanupFinancialsTestData(SCOPE);
    await prisma.$disconnect();
  });

  // ── The first save ──────────────────────────────────────────────────

  it("writes one row at the first instant of today, and pins that day", async () => {
    const today = nairobiToday();

    const view = await setOpeningBalance(
      { account: "cash", amount: "40000.00" },
      admin(),
    );

    expect(view.account).toBe("cash");
    expect(view.amount).toBe("40000.00");
    expect(view.delta).toBe("40000.00");
    expect(view.corrected).toBe(false);
    expect(view.businessDate).toBe(today);

    const rows = await prisma.moneyMovement.findMany({
      where: { sourceType: "opening_balance" },
    });
    expect(rows).toHaveLength(1);
    // Africa/Nairobi is UTC+3, so business-day midnight is 21:00 UTC the
    // day before — the same instant `businessDateStartUtc` produces.
    expect(rows[0].occurredAt.toISOString()).toBe(
      new Date(`${today}T00:00:00+03:00`).toISOString(),
    );
    expect(rows[0].correctsMovementId).toBeNull();
    expect(rows[0].sourceId).toBeNull();
  });

  it("accepts zero, and reports it as set (not 'never entered')", async () => {
    await setOpeningBalance({ account: "cash", amount: "0" }, admin());

    const state = await getOpeningBalances();
    const cash = state.accounts.find((a) => a.account === "cash")!;
    expect(cash.amount).toBe("0.00");
    expect(cash.set).toBe(true);
  });

  it("accepts a negative M-Pesa/Bank opening (an overdrawn account)", async () => {
    const view = await setOpeningBalance(
      { account: "mpesa_bank", amount: "-1500.50" },
      admin(),
    );
    expect(view.amount).toBe("-1500.50");

    const state = await getOpeningBalances();
    expect(
      state.accounts.find((a) => a.account === "mpesa_bank")!.amount,
    ).toBe("-1500.50");
  });

  it("keeps the two accounts independent", async () => {
    await setOpeningBalance({ account: "cash", amount: "40000" }, admin());
    await setOpeningBalance(
      { account: "mpesa_bank", amount: "12500" },
      admin(),
    );

    const state = await getOpeningBalances();
    expect(state.accounts.find((a) => a.account === "cash")!.amount).toBe(
      "40000.00",
    );
    expect(
      state.accounts.find((a) => a.account === "mpesa_bank")!.amount,
    ).toBe("12500.00");
  });

  // ── Restating: a correction, never a second opening ──────────────────

  it("restating writes a correction row carrying only the delta", async () => {
    const first = await setOpeningBalance(
      { account: "cash", amount: "40000.00" },
      admin(),
    );

    const second = await setOpeningBalance(
      { account: "cash", amount: "45000.00" },
      admin(),
    );

    expect(second.corrected).toBe(true);
    expect(second.amount).toBe("45000.00"); // the stated position
    expect(second.delta).toBe("5000.00"); // the row actually written
    expect(second.businessDate).toBe(first.businessDate);

    const rows = await prisma.moneyMovement.findMany({
      where: { sourceType: "opening_balance" },
      orderBy: { createdAt: "asc" },
    });
    expect(rows).toHaveLength(2);
    // The original is untouched — ADR-15, never an overwrite.
    expect(rows[0].amount.toFixed(2)).toBe("40000.00");
    expect(rows[0].correctsMovementId).toBeNull();
    expect(rows[1].amount.toFixed(2)).toBe("5000.00");
    expect(rows[1].correctsMovementId).toBe(rows[0].id);
    // Both sit on the SAME instant: a restatement never moves the day.
    expect(rows[1].occurredAt.toISOString()).toBe(
      rows[0].occurredAt.toISOString(),
    );
  });

  it("stacks corrections against original + prior deltas (double-submit is a no-op)", async () => {
    await setOpeningBalance({ account: "cash", amount: "40000" }, admin());
    await setOpeningBalance({ account: "cash", amount: "45000" }, admin());
    // Re-sending the SAME figure must append a zero delta, not another
    // +5000 — the M1 F-1 finding (CONVENTIONS §6).
    const third = await setOpeningBalance(
      { account: "cash", amount: "45000" },
      admin(),
    );
    expect(third.delta).toBe("0.00");

    const state = await getOpeningBalances();
    expect(state.accounts.find((a) => a.account === "cash")!.amount).toBe(
      "45000.00",
    );
  });

  it("restating downward writes a negative delta", async () => {
    await setOpeningBalance({ account: "cash", amount: "40000" }, admin());
    const down = await setOpeningBalance(
      { account: "cash", amount: "31000" },
      admin(),
    );
    expect(down.delta).toBe("-9000.00");

    const state = await getOpeningBalances();
    expect(state.accounts.find((a) => a.account === "cash")!.amount).toBe(
      "31000.00",
    );
  });

  // ── The bug this design exists to prevent ────────────────────────────

  it("a later restatement corrects Day 1 rather than opening a second day", async () => {
    // Day 1 opening, backdated so "today" is unambiguously later.
    const dayOne = "2026-08-01";
    await recordMoneyMovement(
      {
        account: "cash",
        amount: new Prisma.Decimal("40000"),
        sourceType: "opening_balance",
        occurredAt: new Date(`${dayOne}T00:00:00+03:00`),
      },
      { actorId: ctx.actorId },
    );

    // The Admin opens the screen today and restates the figure.
    const view = await setOpeningBalance(
      { account: "cash", amount: "62000" },
      admin(),
    );

    // It lands on Day 1 — NOT today. A second, mid-history opening is the
    // failure mode that invents money the business never received.
    expect(view.businessDate).toBe(dayOne);
    expect(view.corrected).toBe(true);
    expect(view.delta).toBe("22000.00");

    const rows = await prisma.moneyMovement.findMany({
      where: { sourceType: "opening_balance" },
    });
    expect(rows).toHaveLength(2);
    const instants = new Set(rows.map((r) => r.occurredAt.toISOString()));
    expect(instants.size).toBe(1); // both on Day 1's first instant
    expect(nairobiToday()).not.toBe(dayOne); // and today really is later
  });

  it("does not disturb movements recorded since Day 1", async () => {
    await setOpeningBalance({ account: "cash", amount: "40000" }, admin());

    // A sale after the opening.
    await recordMoneyMovement(
      {
        account: "cash",
        amount: new Prisma.Decimal("2500"),
        sourceType: "repayment",
        sourceId: `${ctx.prefix}sale1`,
        occurredAt: new Date(),
      },
      { actorId: ctx.actorId },
    );

    const before = await getAccountBalances();

    // Correcting the opening shifts the balance by exactly the delta and
    // leaves the sale row alone.
    await setOpeningBalance({ account: "cash", amount: "45000" }, admin());

    const after = await getAccountBalances();
    expect(after.cash.sub(before.cash).toFixed(2)).toBe("5000.00");

    const sale = await prisma.moneyMovement.findFirst({
      where: { sourceId: `${ctx.prefix}sale1` },
    });
    expect(sale!.amount.toFixed(2)).toBe("2500.00");
  });

  // ── It reaches the derived balance ───────────────────────────────────

  it("folds into getAccountBalances like any other row", async () => {
    const before = await getAccountBalances();
    await setOpeningBalance({ account: "cash", amount: "40000" }, admin());
    await setOpeningBalance(
      { account: "mpesa_bank", amount: "12500" },
      admin(),
    );
    const after = await getAccountBalances();

    expect(after.cash.sub(before.cash).toFixed(2)).toBe("40000.00");
    expect(after.mpesaBank.sub(before.mpesaBank).toFixed(2)).toBe("12500.00");
  });

  // ── Reads ────────────────────────────────────────────────────────────

  it("reports both accounts unset, dated today, on a virgin ledger", async () => {
    const state = await getOpeningBalances();
    expect(state.businessDate).toBe(nairobiToday());
    expect(state.accounts).toHaveLength(2);
    for (const a of state.accounts) {
      expect(a.set).toBe(false);
      expect(a.amount).toBe("0.00");
      expect(a.corrected).toBe(false);
    }
  });

  it("flags corrected only once a correction exists", async () => {
    await setOpeningBalance({ account: "cash", amount: "40000" }, admin());
    let state = await getOpeningBalances();
    expect(state.accounts.find((a) => a.account === "cash")!.corrected).toBe(
      false,
    );

    await setOpeningBalance({ account: "cash", amount: "41000" }, admin());
    state = await getOpeningBalances();
    expect(state.accounts.find((a) => a.account === "cash")!.corrected).toBe(
      true,
    );
  });

  // ── Guards ───────────────────────────────────────────────────────────

  it("rejects a non-admin actor", async () => {
    await expect(
      setOpeningBalance(
        { account: "cash", amount: "40000" },
        { actorId: ctx.otherActorId, role: "cashier" },
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects an unknown account", async () => {
    await expect(
      setOpeningBalance(
        { account: "petty_cash" as never, amount: "1" },
        admin(),
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "account" });
  });

  it("rejects a non-numeric amount", async () => {
    await expect(
      setOpeningBalance({ account: "cash", amount: "abc" }, admin()),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "amount" });
  });

  it("refuses to write once the opening day is closed", async () => {
    await setOpeningBalance({ account: "cash", amount: "40000" }, admin());
    const state = await getOpeningBalances();
    const dateOnly = new Date(`${state.businessDate}T00:00:00.000Z`);

    await prisma.dayClose.create({
      data: { date: dateOnly, closedBy: ctx.actorId },
    });

    try {
      await expect(
        setOpeningBalance({ account: "cash", amount: "45000" }, admin()),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    } finally {
      await prisma.dayClose.deleteMany({ where: { date: dateOnly } });
    }
  });
});
