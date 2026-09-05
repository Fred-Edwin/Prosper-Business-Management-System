import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { businessDateStartUtc } from "@/lib/time";
import { assertDayOpen, resolveOpeningDay } from "@/lib/domain/audit";
import { recordMoneyMovement } from "./record-money-movement";
import { DomainError } from "./errors";
import { moneyString, toAmount } from "./internal";
import type {
  FinancialsActor,
  MoneyAccount,
  OpeningBalanceState,
  OpeningBalanceView,
  SetOpeningBalanceInput,
} from "./types";

const ACCOUNTS: MoneyAccount[] = ["cash", "mpesa_bank"];

/**
 * Record the business's opening money position for one account — the money
 * mirror of `setOpeningStock` (ADR-11), and the only way to state a
 * starting balance in a ledger that stores no totals.
 *
 * **Why this has to be a row.** Cash at hand and M-Pesa/Bank are derived:
 * `SUM(MoneyMovement.amount)` grouped by `account` over every row (ADR-17,
 * `getAccountBalances`). There is no stored balance column to set, so
 * "the business starts with KES 40,000 in cash" can only be expressed as a
 * ledger row that moves the derived balance TO that figure.
 *
 * The row is an `opening_balance`-source `MoneyMovement` at the first
 * instant of the pinned opening date (`resolveOpeningDay` — the caller
 * does NOT choose it), with `amount` signed to reach the stated figure:
 *
 *   - No prior `opening_balance` row for the account → write
 *     `amount = stated` (a fresh opening; the derived balance starts here).
 *   - A prior row exists → this is a **correction** of it (ADR-15): write a
 *     second row with `correctsMovementId` set and `amount = stated −
 *     Σ(prior opening_balance rows)`, so the summed opening equals the
 *     newly stated figure. Never a `CONFLICT`, never a mutation of the
 *     original, and every intervening sale / expense / handover is
 *     untouched — they are independent rows that were never derived from
 *     this one.
 *
 * Computing the delta against `original + Σ existing deltas` (rather than
 * against the original alone) is what makes a double-submit a no-op — the
 * M1 F-1 finding, carried forward in CONVENTIONS §6.
 *
 * `amount` in is a **signed** decimal string. Cash can only realistically
 * be zero or positive, but M-Pesa/Bank can legitimately open negative (an
 * overdrawn account), so this does not use `toPositiveAmount` — the domain
 * takes the figure as stated. A zero opening is meaningful and allowed.
 *
 * **Day-close gated** (ADR-52): once the opening date is sealed, restating
 * it requires reopening that date. Admin-only — this is the one write that
 * can restate the business's whole money position.
 *
 * Accounts are independent: setting cash does not touch M-Pesa/Bank. The
 * screen posts one call per account it changed.
 */
export async function setOpeningBalance(
  input: SetOpeningBalanceInput,
  actor: FinancialsActor,
): Promise<OpeningBalanceView> {
  if (actor.role !== "admin") {
    throw new DomainError(
      "FORBIDDEN",
      "Only an administrator can set an opening balance.",
    );
  }
  if (input.account !== "cash" && input.account !== "mpesa_bank") {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Account must be cash or mpesa_bank.",
      "account",
    );
  }

  const stated = toAmount(input.amount, "amount");
  const note = input.note?.trim() ? input.note.trim() : undefined;

  return prisma.$transaction(async (tx) => {
    // Pinned inside the transaction so two concurrent first-saves (cash and
    // M-Pesa submitted together) cannot land on two different dates.
    const businessDate = await resolveOpeningDay(tx);
    const occurredAt = businessDateStartUtc(businessDate);

    await assertDayOpen(businessDate, tx);

    const priorOpenings = await tx.moneyMovement.findMany({
      where: {
        account: input.account,
        sourceType: "opening_balance",
      },
      orderBy: { createdAt: "asc" },
    });

    const current = priorOpenings.reduce(
      (sum, r) => sum.add(r.amount),
      new Prisma.Decimal(0),
    );
    const isCorrection = priorOpenings.length > 0;
    const delta = isCorrection ? stated.sub(current) : stated;

    const row = await recordMoneyMovement(
      {
        account: input.account,
        amount: delta,
        sourceType: "opening_balance",
        occurredAt,
        note: note ?? (isCorrection ? "Opening balance adjustment" : undefined),
        correctsMovementId: isCorrection ? priorOpenings[0].id : undefined,
      },
      { actorId: actor.actorId, tx },
    );

    return {
      id: row.id,
      account: row.account,
      businessDate,
      /** The stated position after this write — not the row's own delta. */
      amount: moneyString(stated),
      delta: moneyString(delta),
      corrected: isCorrection,
      occurredAt: row.occurredAt.toISOString(),
    };
  });
}

/**
 * The opening money position **as stated**, per account, plus the pinned
 * date it belongs to. This is what the setup screen loads.
 *
 * Per account, `amount` is `Σ opening_balance rows` (original + every
 * correction delta) — exactly the figure the Admin last entered.
 *
 * `set: false` means no opening balance has ever been recorded for that
 * account — the screen shows an empty field rather than a misleading
 * "0.00", so "never entered" and "deliberately zero" stay distinguishable.
 *
 * `businessDate` is the pinned opening day; when nothing has been recorded
 * yet it is today, which is the date a first save would claim.
 *
 * This is NOT the account balance: it reads only `opening_balance` rows,
 * ignoring every sale, expense and handover since. `getAccountBalances`
 * remains the one source of the live balance.
 */
export async function getOpeningBalances(): Promise<OpeningBalanceState> {
  const businessDate = await resolveOpeningDay();

  const grouped = await prisma.moneyMovement.groupBy({
    by: ["account"],
    _sum: { amount: true },
    _count: { _all: true },
    where: { sourceType: "opening_balance" },
  });

  const byAccount = new Map(grouped.map((g) => [g.account, g]));

  const accounts: OpeningBalanceView[] = ACCOUNTS.map((account) => {
    const g = byAccount.get(account);
    const count = g?._count._all ?? 0;
    return {
      account,
      businessDate,
      amount: moneyString(g?._sum.amount ?? new Prisma.Decimal(0)),
      set: count > 0,
      corrected: count > 1,
    };
  });

  return { businessDate, accounts };
}
