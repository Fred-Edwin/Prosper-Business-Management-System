import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { nairobiToday, toBusinessDate } from "@/lib/time";

type Db = Prisma.TransactionClient | typeof prisma;

/**
 * The business's **Day 1** — the single business date every opening row,
 * stock and money alike, is pinned to (ADR-70).
 *
 * ## Why this is derived and never chosen
 *
 * An "opening" row does not record an event; it **restates a position**
 * ("the business had this much when tracking began"). There is exactly one
 * such position per product/location and per money account, for the life
 * of the business — not one per day.
 *
 * Let a caller name the date and a second opening can be written into the
 * middle of the history. For stock that is the bug dissected at length in
 * `get-financial-summary.ts`: an `opening` row counts toward the opening
 * term of every period that can see it, so a mid-history opening makes
 * stock appear from nowhere and drags COGS negative — tens of thousands of
 * phantom profit on an innocuous date range. For money the equivalent row
 * simply invents cash the business never received. Neither is detectable
 * after the fact: the row looks exactly like a legitimate Day 1.
 *
 * The screens made this reachable rather than hypothetical — both passed
 * `today` as the business date on every save, so entering counts on Sept 20
 * created Sept 20 openings, not corrections of Day 1.
 *
 * ## How it resolves
 *
 *   - Any opening row exists (`opening` StockMovement or `opening_balance`
 *     MoneyMovement) → the **earliest** one's business date. Both ledgers
 *     answer to the same Day 1, so stock and money can never drift onto
 *     different opening days.
 *   - Nothing recorded yet → today (Africa/Nairobi). The first save
 *     defines Day 1 and pins it for good.
 *
 * Pass `db` to resolve inside an open transaction, so two concurrent
 * first-saves cannot land on two different dates.
 */
export async function resolveOpeningDay(db: Db = prisma): Promise<string> {
  const [firstStock, firstMoney] = await Promise.all([
    db.stockMovement.findFirst({
      where: { movementType: "opening" },
      orderBy: { occurredAt: "asc" },
      select: { occurredAt: true },
    }),
    db.moneyMovement.findFirst({
      where: { sourceType: "opening_balance" },
      orderBy: { occurredAt: "asc" },
      select: { occurredAt: true },
    }),
  ]);

  const candidates = [firstStock?.occurredAt, firstMoney?.occurredAt].filter(
    (d): d is Date => d != null,
  );
  if (candidates.length === 0) return nairobiToday();

  const earliest = candidates.reduce((a, b) => (a <= b ? a : b));
  return toBusinessDate(earliest);
}

/**
 * True once **any** opening row exists — i.e. the business has been
 * initialised and `resolveOpeningDay` is returning a pinned historical
 * date rather than today.
 */
export async function isOpeningDayPinned(db: Db = prisma): Promise<boolean> {
  const [stock, money] = await Promise.all([
    db.stockMovement.findFirst({
      where: { movementType: "opening" },
      select: { id: true },
    }),
    db.moneyMovement.findFirst({
      where: { sourceType: "opening_balance" },
      select: { id: true },
    }),
  ]);
  return stock != null || money != null;
}
