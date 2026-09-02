import type { MoneyAccount, Prisma } from "@prisma/client";

export type { MoneyAccount } from "@prisma/client";

/**
 * Customers & Credit domain shapes (ADR-19). The running balance is
 * **derived** — `Σ Debt.amount − Σ Repayment.amount` for the customer —
 * never a stored column (ADR-17). Money is `Prisma.Decimal` inside the
 * domain, decimal string at the route boundary.
 */

export type CreateCustomerInput = {
  name: string;
  phone: string;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
};

export type ListCustomersFilter = {
  /** Case-insensitive contains, matched against name OR phone. */
  search?: string;
  /** When true, only customers whose derived balance ≠ 0. */
  hasBalance?: boolean;
};

export type CustomerListRow = {
  id: string;
  name: string;
  phone: string;
  /** Derived: `Σ debts − Σ repayments`, as a decimal string. */
  balance: string;
  /** Max of the customer's debt/repayment `occurredAt` (ISO), or null. */
  lastActivityAt: string | null;
};

export type CustomerLedgerEntry = {
  kind: "debt" | "repayment";
  /** Positive magnitude, decimal string. */
  amount: string;
  occurredAt: string;
  /** Present only for `kind: "debt"` — the order that created it. */
  orderId?: string;
  /** Present only for `kind: "debt"` — that order's human number ("#1043"). */
  orderNumber?: number;
  /** Present only for `kind: "repayment"` — the account it landed in. */
  account?: MoneyAccount;
  /** Present only for `kind: "repayment"` — the optional free-text note. */
  note?: string;
  /** Balance after applying this entry (+debt, −repayment), decimal string. */
  runningBalance: string;
};

export type CustomerLedger = {
  customer: Customer;
  entries: CustomerLedgerEntry[];
  /** Final derived balance, decimal string. */
  balance: string;
};

export type RecordRepaymentInput = {
  customerId: string;
  /** Decimal string; must be > 0. */
  amount: string;
  account: MoneyAccount;
  /** Defaults to now. Stamped but not day-gated in M2 (no Day Close). */
  occurredAt?: Date;
  note?: string;
};

export type Repayment = {
  id: string;
  customerId: string;
  amount: string;
  account: MoneyAccount;
  occurredAt: string;
  createdAt: string;
};

/**
 * Internal helper input — a `Debt` row is written by `createOrder` (S4)
 * for a credit order, inside its transaction. This module only provides
 * the write helper + the reads; it never originates a debt itself.
 */
export type RecordDebtInput = {
  customerId: string;
  orderId: string;
  amount: Prisma.Decimal;
  occurredAt: Date;
};

/** Acting-user context for customer mutations. */
export type CustomerContext = {
  actorId: string;
  /**
   * The acting user's role. Required by `recordRepayment` to enforce the
   * staff "today only" rule (ADR-53) — a non-admin may not record a
   * repayment dated to any day but today. `createCustomer` ignores it.
   */
  role?: string;
};
