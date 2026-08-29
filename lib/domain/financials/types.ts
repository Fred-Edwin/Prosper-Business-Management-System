import type { MoneyAccount, MoneyMovement, MoneySourceType, Prisma } from "@prisma/client";

export type { MoneyAccount, MoneySourceType } from "@prisma/client";

/**
 * Money-ledger domain shapes (ADR-17: money is a *derived* ledger — the
 * "balance" is always `SUM(MoneyMovement.amount)`, never a stored column).
 *
 * Money is `Prisma.Decimal` everywhere inside the domain (ADR-30). It
 * becomes a decimal *string* only at the route boundary, exactly as the
 * catalog module does for prices.
 */

/**
 * Input to `recordMoneyMovement` — the internal "append one ledger row"
 * primitive. Not routed in M2; called by repayments (this session) and,
 * from S4/S5, by orders and canteen sales.
 */
export type RecordMoneyMovementInput = {
  account: MoneyAccount;
  /** Signed: positive = money in, negative = money out. `Prisma.Decimal`. */
  amount: Prisma.Decimal;
  sourceType: MoneySourceType;
  /** The Repayment / Order / StockCount id this movement stems from. */
  sourceId: string;
  occurredAt: Date;
  note?: string;
};

/**
 * Context for a money-ledger write. `tx` lets a caller run the write
 * inside an already-open transaction so money and stock commit atomically
 * (S4 writes an Order + its StockMovements + this in one tx). `actorId`
 * is the acting user — recorded on the row and on the AuditLog entry.
 */
export type MoneyWriteContext = {
  actorId: string;
  tx?: Prisma.TransactionClient;
};

/** Optional read context — reserved for a future `asOf` cutoff. */
export type MoneyReadContext = {
  asOf?: Date;
};

/** Derived account balances, `Prisma.Decimal` (stringified at the route). */
export type AccountBalances = {
  cash: Prisma.Decimal;
  mpesaBank: Prisma.Decimal;
};

/** Wire shape for `GET /api/money/balances` — decimal strings. */
export type AccountBalancesView = {
  cash: string;
  mpesaBank: string;
};

export type MoneyMovementRow = MoneyMovement;
