import { z } from "zod";

/**
 * Zod shapes for `/api/handovers` (M3-S2, ADR-53/54). Shape only — the
 * domain (`lib/domain/handovers`) owns every rule (variance math, the
 * shortfall-note requirement, day-close + today gates, role/ownership,
 * correction-stacking).
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

/** `POST /api/handovers` — a staff member declares the day's takings. */
export const declareHandoverSchema = z.object({
  cashDeclared: decimalString,
  mpesaDeclared: decimalString,
  occurredAt: z.string().datetime().optional(),
});

/** `PATCH /api/handovers/:id` — staff edits their own declaration. */
export const editOwnHandoverSchema = z.object({
  cashDeclared: decimalString,
  mpesaDeclared: decimalString,
});

/** `POST /api/handovers/:id/receive` — Admin records receipt. */
export const recordReceiptSchema = z.object({
  cashReceived: decimalString,
  mpesaReceived: decimalString,
  shortfallNote: z.string().trim().max(500).optional(),
  occurredAt: z.string().datetime().optional(),
});

/**
 * `POST /api/handovers/:id/correct` — Admin correction. `target` picks
 * which fact is being corrected: the declaration (`handover`) or the
 * recorded receipt (`receipt`, which then needs `receiptId`).
 */
export const correctHandoverSchema = z.discriminatedUnion("target", [
  z.object({
    target: z.literal("handover"),
    cashDeclared: decimalString,
    mpesaDeclared: decimalString,
  }),
  z.object({
    target: z.literal("receipt"),
    receiptId: z.string().min(1),
    cashReceived: decimalString,
    mpesaReceived: decimalString,
    shortfallNote: z.string().trim().max(500).optional(),
  }),
]);

/** `GET /api/handovers?date=&locationId=` — role-scoped list. */
export const listHandoversQuerySchema = z.object({
  date: businessDate.optional(),
  locationId: z.string().min(1).optional(),
});

/** `GET /api/handovers/reconciliation?date=` — Admin reconciliation read. */
export const reconciliationQuerySchema = z.object({
  date: businessDate,
});

export type DeclareHandoverBody = z.infer<typeof declareHandoverSchema>;
export type EditOwnHandoverBody = z.infer<typeof editOwnHandoverSchema>;
export type RecordReceiptBody = z.infer<typeof recordReceiptSchema>;
export type CorrectHandoverBody = z.infer<typeof correctHandoverSchema>;
