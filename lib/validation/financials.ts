import { z } from "zod";

/**
 * Zod shapes for `/api/expenses`, `/api/owner-transactions` and
 * `/api/financials/summary` (M3-S4, PRD §4.7). Shape only — the domain
 * (`lib/domain/financials`) owns every rule: amount > 0, Admin-only,
 * day-close gating, correction-stacking, the profit math.
 *
 * Money is a decimal **string** (`"1200.00"`) — never a JS float.
 */

const decimalString = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Must be a number with up to 2 decimal places");

const businessDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a YYYY-MM-DD business date");

const moneyAccount = z.enum(["cash", "mpesa_bank"]);

export const expenseCategory = z.enum([
  "rent",
  "utilities",
  "transport",
  "gas_fuel",
  "salaries",
  "repairs",
  "other",
]);

/** `POST /api/expenses` — the Admin records a business expense. */
export const recordExpenseSchema = z.object({
  category: expenseCategory,
  amount: decimalString,
  date: businessDate,
  paidFromAccount: moneyAccount,
  note: z.string().trim().max(500).optional(),
});

/** `POST /api/expenses/:id/correct` — append-only correction (Admin). */
export const correctExpenseSchema = z.object({
  amount: decimalString,
  note: z.string().trim().max(500).optional(),
});

/** `GET /api/expenses?from=&to=&category=` — Admin list. */
export const listExpensesQuerySchema = z.object({
  from: businessDate.optional(),
  to: businessDate.optional(),
  category: expenseCategory.optional(),
});

/** `POST /api/owner-transactions` — an owner draw or return. */
export const recordOwnerTransactionSchema = z.object({
  type: z.enum(["draw", "return"]),
  amount: decimalString,
  date: businessDate,
  note: z.string().trim().max(500).optional(),
});

/** `GET /api/owner-transactions?from=&to=` — Admin list. */
export const listOwnerTransactionsQuerySchema = z.object({
  from: businessDate.optional(),
  to: businessDate.optional(),
});

/** `GET /api/financials/summary?from=&to=` — the profit picture. */
export const financialSummaryQuerySchema = z.object({
  from: businessDate,
  to: businessDate,
});

export type RecordExpenseBody = z.infer<typeof recordExpenseSchema>;
export type CorrectExpenseBody = z.infer<typeof correctExpenseSchema>;
export type RecordOwnerTransactionBody = z.infer<
  typeof recordOwnerTransactionSchema
>;
