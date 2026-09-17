import { z } from "zod";

/**
 * Shared Zod schemas for the Catalog feature (the `lib/validation/example.ts`
 * pattern — one schema per resource, imported by both the API route handler
 * and the client form so the two can't drift).
 *
 * Money is validated as a decimal **string** (e.g. `"580.00"`) — it never
 * becomes a JS float. The domain (`lib/domain/catalog`) enforces the
 * business rules on top of this: "buying price required for non-dish",
 * the Dish `= 0` invariant, referential guards.
 */

const decimalString = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Must be a number with up to 2 decimal places");

// Quantity-shaped decimal (up to 4dp, matching `Decimal(14,4)` columns like
// StockMovement.quantity) — used for the low-stock threshold, which is a
// unit count, not money.
const quantityString = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,4})?$/, "Must be a number with up to 4 decimal places");

const productKind = z.enum(["ingredient", "dish", "goods"]);

const locationPrice = z.object({
  // `Location.id` is `String @default(uuid())` — the *default* is a uuid,
  // but the column accepts any string and the seed uses readable ids like
  // "seed-location-store". Validate as a non-empty id, not a uuid.
  locationId: z.string().min(1),
  // `null` = stocked but not sold at this location.
  sellingPrice: decimalString.nullable(),
  active: z.boolean(),
});

export const createProductSchema = z.object({
  name: z.string().trim().min(1, "Product name is required"),
  kind: productKind,
  unitLabel: z.string().trim().min(1, "Unit label is required"),
  // Optional here; the domain rejects a missing value for ingredient/goods
  // and ignores it for dish.
  buyingPrice: decimalString.nullable().optional(),
  // Admin-set menu category — free-text, optional, trimmed; "" → null.
  category: z
    .string()
    .trim()
    .max(40, "Category is too long")
    .optional()
    .nullable()
    .transform((v) => (v == null || v === "" ? null : v)),
  // Reorder point — optional; the domain forces it to `null` for a dish
  // (ADR-33: a dish's stock is never held directly).
  lowStockThreshold: quantityString.nullable().optional(),
  locations: z.array(locationPrice),
});

export const updateProductSchema = createProductSchema;

export const hardDeleteProductSchema = z.object({
  confirmName: z.string().min(1),
});

export const listProductsQuerySchema = z.object({
  kind: productKind.optional(),
  search: z.string().trim().optional(),
  category: z.string().trim().min(1).optional(),
  // Empty string (`?locationId=`) is treated as absent, not a 400.
  locationId: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  includeArchived: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => v === "true"),
  // Admin-only (checked at the route) — adds `stockQty` (total on-hand,
  // summed across every location) to each row for the Catalog screen.
  includeStock: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => v === "true"),
  // Requires includeStock=true — the domain rejects the combination
  // otherwise rather than silently ignoring the flag.
  lowStockOnly: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => v === "true"),
});

export type CreateProductBody = z.infer<typeof createProductSchema>;
export type UpdateProductBody = z.infer<typeof updateProductSchema>;
export type HardDeleteProductBody = z.infer<typeof hardDeleteProductSchema>;
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
