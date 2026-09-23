import { z } from "zod";

/**
 * Zod schemas for the Canteen derived-sales routes (S5) — shape only,
 * the `lib/validation/catalog.ts` pattern. The domain
 * (`lib/domain/sales` canteen slice) enforces the business rules:
 * product is sold at the canteen, count moves forward in time, counted
 * quantity does not exceed expected stock.
 *
 * Quantities are decimal **strings** (e.g. `"96"`, `"12.5"`) — never a
 * JS float.
 */

const quantityString = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,4})?$/, "Must be a number with up to 4 decimal places");

export const recordStockCountSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  countedQuantity: quantityString,
  // ISO datetime; optional — the domain defaults it to now.
  occurredAt: z.string().datetime().optional(),
});

/**
 * `POST /api/canteen/stock-counts/batch` — the K1 multi-row count.
 * `lines` must be present; emptiness / duplicate `productId` is a domain
 * `VALIDATION_ERROR` (field `"lines"`), same as the stock-movement batches.
 */
export const recordStockCountBatchSchema = z.object({
  lines: z.array(recordStockCountSchema),
});

/**
 * Query for `GET /api/canteen/stock-counts/preview` — a dry-run of the
 * derived sale for a counted-remaining value. Same fields as
 * `recordStockCountSchema` minus the persistence.
 */
export const previewStockCountQuerySchema = z.object({
  productId: z.string().trim().min(1, "Product is required"),
  countedRemaining: quantityString,
  occurredAt: z.string().datetime().optional(),
});

const derivedSalesBusinessDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

export const listDerivedSalesQuerySchema = z.object({
  productId: z.string().trim().min(1).optional(),
  // A business date (YYYY-MM-DD) — windows on the count's occurredAt.
  date: derivedSalesBusinessDate.optional(),
  // Inclusive business-date range — windows on occurredAt the same way,
  // and takes precedence over `date` when either is given.
  from: derivedSalesBusinessDate.optional(),
  to: derivedSalesBusinessDate.optional(),
});

export type RecordStockCountBody = z.infer<typeof recordStockCountSchema>;
export type RecordStockCountBatchBody = z.infer<
  typeof recordStockCountBatchSchema
>;
export type PreviewStockCountQuery = z.infer<typeof previewStockCountQuerySchema>;
export type ListDerivedSalesQuery = z.infer<typeof listDerivedSalesQuerySchema>;

/**
 * Zod schemas for the canteen credit-sale routes (ADR-91) — same "shape
 * only" split as above; the domain enforces product-sold-at-canteen,
 * stock-availability, day-open/staff-today, and the correction rules.
 */
const positiveQuantityString = quantityString.refine(
  (v) => Number(v) > 0,
  "Quantity must be greater than zero",
);

export const recordCanteenCreditSaleSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  customerId: z.string().min(1, "Customer is required"),
  quantity: positiveQuantityString,
  occurredAt: z.string().datetime().optional(),
});

export const correctCanteenCreditSaleSchema = z.object({
  quantity: positiveQuantityString,
});

export const listCanteenCreditSalesQuerySchema = z.object({
  date: derivedSalesBusinessDate.optional(),
});

export type RecordCanteenCreditSaleBody = z.infer<
  typeof recordCanteenCreditSaleSchema
>;
export type CorrectCanteenCreditSaleBody = z.infer<
  typeof correctCanteenCreditSaleSchema
>;
export type ListCanteenCreditSalesQuery = z.infer<
  typeof listCanteenCreditSalesQuerySchema
>;
