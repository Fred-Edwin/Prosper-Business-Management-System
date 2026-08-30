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

export const listDerivedSalesQuerySchema = z.object({
  productId: z.string().trim().min(1).optional(),
  // A business date (YYYY-MM-DD) — windows on the count's occurredAt.
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
    .optional(),
});

export type RecordStockCountBody = z.infer<typeof recordStockCountSchema>;
export type ListDerivedSalesQuery = z.infer<typeof listDerivedSalesQuerySchema>;
