import { z } from "zod";

/**
 * Shared Zod schemas for Customers & Credit (the `lib/validation/catalog.ts`
 * pattern — one schema per resource, imported by the API route handler and,
 * later, the client form so the two can't drift).
 *
 * Money is validated as a decimal **string** (e.g. `"300.00"`) — it never
 * becomes a JS float. The domain (`lib/domain/customers`) enforces the
 * business rules on top: amount > 0, customer exists, account membership.
 */

const decimalString = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Must be a number with up to 2 decimal places");

const moneyAccount = z.enum(["cash", "mpesa_bank"]);

export const createCustomerSchema = z.object({
  name: z.string().trim().min(1, "Customer name is required"),
  // Lenient — Kenyan numbers vary; no format regex (SCHEMA.md sets none).
  phone: z.string().trim().min(1, "Phone number is required"),
});

export const listCustomersQuerySchema = z.object({
  search: z.string().trim().optional(),
  hasBalance: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => v === "true"),
  // Financials v2 Debts card: only customers who owe the business
  // (derived balance strictly positive) — see `list-customers.ts`.
  owingOnly: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => v === "true"),
});

export const recordRepaymentSchema = z.object({
  amount: decimalString,
  account: moneyAccount,
  // ISO datetime; optional — the domain defaults it to now.
  occurredAt: z.string().datetime().optional(),
  note: z.string().trim().max(500).optional(),
});

export type CreateCustomerBody = z.infer<typeof createCustomerSchema>;
export type ListCustomersQuery = z.infer<typeof listCustomersQuerySchema>;
export type RecordRepaymentBody = z.infer<typeof recordRepaymentSchema>;
