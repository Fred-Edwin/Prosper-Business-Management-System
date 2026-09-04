import type {
  ExpenseCategory,
  MoneyAccount,
  MoneyMovement,
  MoneySourceType,
  OwnerTransactionType,
  Prisma,
} from "@prisma/client";

export type {
  ExpenseCategory,
  MoneyAccount,
  MoneySourceType,
  OwnerTransactionType,
} from "@prisma/client";

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

/**
 * Optional read context. `asOf` is a point-in-time cutoff (inclusive
 * instant): the balance is summed over movements with `occurredAt <= asOf`
 * (ADR-57 — a balance is a level at a moment, never a range figure).
 * Omit it for the "as of now" running total.
 */
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

// ── Expenses (PRD §4.7) ────────────────────────────────────────────────

/**
 * Input to `recordExpense` — Admin-only (enforced at the route). Writes
 * one `Expense` row AND a paired **negative** `MoneyMovement` debiting
 * `paidFromAccount`, so account balances stay a pure `SUM(amount)` over
 * the one ledger (the pattern proven by `recordPurchasePayment`).
 */
export type RecordExpenseInput = {
  category: ExpenseCategory;
  /** Decimal string > 0. */
  amount: string;
  /** The business date the expense is dated to (`YYYY-MM-DD`, Africa/Nairobi). */
  date: string;
  paidFromAccount: MoneyAccount;
  note?: string;
};

/**
 * Input to `correctExpense` — append-only (ADR-15 / CONVENTIONS §4).
 * Admin-only. **Not** day-close gated (a correction must work on a sealed
 * day). `amount` is the corrected FINAL amount; the domain writes a new
 * `Expense` row linked via `correctsExpenseId` carrying the signed delta
 * on `amount`, plus the paired delta `MoneyMovement`.
 */
export type CorrectExpenseInput = {
  expenseId: string;
  /** The corrected final amount (decimal string > 0). */
  amount: string;
  /** Optional corrected note (carried from the original when omitted). */
  note?: string;
};

/** Actor context for expense / owner-transaction writes. */
export type FinancialsActor = {
  actorId: string;
  role: string;
};

/** One expense row, corrections folded into `amount` (wire shape). */
export type ExpenseView = {
  id: string;
  category: ExpenseCategory;
  /** Current derived amount (original + Σ correction deltas), 2dp string. */
  amount: string;
  date: string;
  paidFromAccount: MoneyAccount;
  note: string | null;
  recordedById: string;
  /** True when at least one correction row points at this one. */
  corrected: boolean;
  occurredAt: string;
};

export type ListExpensesFilter = {
  /** Inclusive business-date range (`YYYY-MM-DD`). */
  from?: string;
  to?: string;
  category?: ExpenseCategory;
};

// ── Owner transactions (PRD §4.7) ──────────────────────────────────────

/**
 * Input to `recordOwnerTransaction`. A `draw` reduces Cash at hand (money
 * out, `sourceType: "owner_draw"`); a `return` increases it (money in,
 * `sourceType: "owner_return"`). Both write a `MoneyMovement` on the
 * `cash` account. Day-close gated (create path).
 */
export type RecordOwnerTransactionInput = {
  type: OwnerTransactionType;
  /** Decimal string > 0. */
  amount: string;
  /** Business date (`YYYY-MM-DD`, Africa/Nairobi). */
  date: string;
  note?: string;
};

export type OwnerTransactionView = {
  id: string;
  type: OwnerTransactionType;
  amount: string;
  date: string;
  note: string | null;
  occurredAt: string;
};

export type ListOwnerTransactionsFilter = {
  from?: string;
  to?: string;
};

// ── Financial summary (PRD §4.7, SCHEMA §14, ADR-55) ───────────────────

/** One location's slice of the summary. */
export type LocationFinancials = {
  locationId: string;
  locationName: string;
  /** Σ (units sold × selling price) for `sale` movements in the period. */
  revenue: string;
  /**
   * COGS attributable to this location — the stock-value sweep
   * (opening + purchase receipts − closing) restricted to this location,
   * valued by kind (ingredient/goods → buyingPrice, dish → 0).
   */
  cogs: string;
  grossProfit: string;
};

/**
 * Non-sale consumption cost, broken out by reason. This is a **separate**
 * management-visibility figure (PRD §4.7 / SCHEMA §14 / ADR-55) — it is
 * NOT part of COGS and does not reduce Gross or Net Profit. The
 * ingredients that became a wasted Dish already left ingredient stock and
 * are already in the COGS sweep; adding this on top would double-count.
 *
 * Valuation per consumed unit:
 *   - ingredient / goods → `buyingPrice`
 *   - dish              → `dishWasteCostPercent × sellingPrice`
 *     (ADR-55, default 60%, env-configurable)
 */
export type NonSaleConsumptionCost = {
  /** Total across all reasons, whole period, whole business. */
  total: string;
  byReason: {
    staffMeal: string;
    complimentary: string;
    spoiled: string;
    damaged: string;
    other: string;
  };
  /** The `dishWasteCostPercent` in effect (decimal string, e.g. "0.60"). */
  dishWasteCostPercent: string;
};

/**
 * The full financial picture for a date range (PRD §4.7 / SCHEMA §14 /
 * ADR-55).
 *
 *   Sales    Σ (units sold × selling price) — Restaurant orders (live
 *            rows, corrections folded) + Canteen derived sales.
 *   COGS     opening stock value + purchase-RECEIPT value − closing stock
 *            value, over EVERY product and location. Valuation by kind:
 *            ingredient/goods → buyingPrice, dish → 0. "Added" counts
 *            purchase receipts ONLY (not production, not transfers, not
 *            opening); transfers between the business's own locations are
 *            never counted (nothing entered the business).
 *   Gross    Sales − COGS.
 *   Net      Gross − Total Expenses.
 *
 * Per-location carries revenue, COGS and gross profit (the stock sweep is
 * location-scoped). `Expense` rows carry no location, so expenses, net
 * profit and debts are **consolidated only**. Non-sale consumption cost is
 * a separate figure (see `NonSaleConsumptionCost`).
 */
export type FinancialSummary = {
  from: string;
  to: string;
  perLocation: LocationFinancials[];
  consolidated: {
    revenue: string;
    cogs: string;
    grossProfit: string;
    totalExpenses: string;
    netProfit: string;
    /**
     * Σ Debt − Σ Repayment across all customers, **as of the end of `to`**
     * (a balance, not a period figure — ADR-57).
     */
    debtsOwedToBusiness: string;
    /**
     * Draws − returns (summed `OwnerTransaction` rows), **as of the end of
     * `to`** — a balance, not a period figure (ADR-57).
     */
    ownerOwedToBusiness: string;
    /**
     * Σ owner draws (`type = "draw"` only, NOT netted against returns)
     * over the whole `from..to` range — a FLOW (ADR-57), distinct from
     * `ownerOwedToBusiness` above. Added for Dashboard v2's "Owner draws
     * this &lt;period&gt;" row (`dashboard-screen.md`) — "money the owner
     * has taken out", not the running owed-to-owner balance.
     */
    ownerDrawsForPeriod: string;
    /** Cash at hand as of the end of `to` (ADR-57). */
    cashBalance: string;
    /** M-Pesa / Bank as of the end of `to` (ADR-57). */
    mpesaBankBalance: string;
  };
  nonSaleConsumption: NonSaleConsumptionCost;
};
