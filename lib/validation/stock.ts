import { z } from "zod";

/**
 * Shared Zod schemas for the F2 Stock feature — one per operation, mirroring
 * the `lib/domain/stock` input types. Imported by the API route handlers
 * and (Sessions 7-8) the client forms so the two can't drift.
 *
 * Quantities and money are validated as decimal **strings** so they never
 * become JS floats. The domain (`lib/domain/stock`) enforces the business
 * rules on top: unsigned-magnitude vs signed, the dish guard, the
 * reason/reasonNote rule, day-close gating.
 *
 * Ids: `String @default(uuid())` columns accept any non-empty string (the
 * seed uses readable ids like `seed-location-store`) - validate
 * `.min(1)`, never `.uuid()`.
 */

// Unsigned magnitude: digits, optional up-to-4dp fraction, no sign.
const magnitudeString = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,4})?$/, "Must be a number with up to 4 decimal places");

// Signed quantity: an optional leading `-`. Used only where a raw signed
// value is legitimate (the corrected final quantity of a movement).
const signedQuantityString = z
  .string()
  .trim()
  .regex(
    /^-?\d+(\.\d{1,4})?$/,
    "Must be a number with up to 4 decimal places",
  );

// Money: up to 2dp, non-negative (Decimal(12,2)).
const moneyString = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Must be an amount with up to 2 decimal places");

const id = z.string().min(1);
const businessDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a YYYY-MM-DD date");

export const movementType = z.enum([
  "opening",
  "purchase_payment",
  "purchase_receipt",
  "issue",
  "production",
  "transfer",
  "non_sale_consumption",
]);

const nonSaleReason = z.enum([
  "staff_meal",
  "complimentary",
  "spoiled",
  "damaged",
  "other",
]);

// ── POST /api/stock-movements bodies (discriminated on movementType) ──────

export const setOpeningStockSchema = z.object({
  movementType: z.literal("opening"),
  productId: id,
  locationId: id,
  businessDate,
  quantity: magnitudeString,
});

export const recordPurchasePaymentSchema = z.object({
  movementType: z.literal("purchase_payment"),
  productId: id,
  locationId: id,
  supplier: z.string().trim().min(1, "Supplier is required"),
  quantity: magnitudeString,
  cost: moneyString,
  paidFromAccount: z.enum(["cash", "mpesa_bank"]),
});

export const recordPurchaseReceiptSchema = z.object({
  movementType: z.literal("purchase_receipt"),
  productId: id,
  locationId: id,
  quantity: magnitudeString,
  purchasePaymentId: id.nullable().optional(),
});

export const recordKitchenIssueSchema = z.object({
  movementType: z.literal("issue"),
  productId: id,
  locationId: id,
  quantity: magnitudeString,
});

export const recordProductionSchema = z.object({
  movementType: z.literal("production"),
  productId: id,
  locationId: id,
  quantity: magnitudeString,
});

export const recordTransferSchema = z.object({
  movementType: z.literal("transfer"),
  productId: id,
  fromLocationId: id,
  toLocationId: id,
  quantity: magnitudeString,
});

export const recordNonSaleConsumptionSchema = z.object({
  movementType: z.literal("non_sale_consumption"),
  productId: id,
  locationId: id,
  quantity: magnitudeString,
  reason: nonSaleReason,
  reasonNote: z.string().trim().min(1).nullable().optional(),
});

/** The `POST /api/stock-movements` body — dispatched on `movementType`. */
export const createStockMovementSchema = z.discriminatedUnion("movementType", [
  setOpeningStockSchema,
  recordPurchasePaymentSchema,
  recordPurchaseReceiptSchema,
  recordKitchenIssueSchema,
  recordProductionSchema,
  recordTransferSchema,
  recordNonSaleConsumptionSchema,
]);

// ── Other endpoints ─────────────────────────────────────────────────────

export const correctMovementSchema = z.object({
  correctedQuantity: signedQuantityString,
  note: z.string().trim().min(1).nullable().optional(),
});

export const acceptTransferSchema = z.object({}).optional();

export const flagTransferSchema = z.object({
  note: z.string().trim().min(1, "Describe the discrepancy"),
});

export const listMovementsQuerySchema = z.object({
  productId: id.optional(),
  locationId: id.optional(),
  movementType: movementType.optional(),
  date: businessDate.optional(),
});

export type CreateStockMovementBody = z.infer<typeof createStockMovementSchema>;
export type SetOpeningStockBody = z.infer<typeof setOpeningStockSchema>;
export type RecordPurchasePaymentBody = z.infer<
  typeof recordPurchasePaymentSchema
>;
export type RecordPurchaseReceiptBody = z.infer<
  typeof recordPurchaseReceiptSchema
>;
export type RecordKitchenIssueBody = z.infer<typeof recordKitchenIssueSchema>;
export type RecordProductionBody = z.infer<typeof recordProductionSchema>;
export type RecordTransferBody = z.infer<typeof recordTransferSchema>;
export type RecordNonSaleConsumptionBody = z.infer<
  typeof recordNonSaleConsumptionSchema
>;
export type CorrectMovementBody = z.infer<typeof correctMovementSchema>;
export type FlagTransferBody = z.infer<typeof flagTransferSchema>;
export type ListMovementsQuery = z.infer<typeof listMovementsQuerySchema>;
