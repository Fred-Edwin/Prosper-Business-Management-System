import { z } from "zod";

/**
 * Shared Zod schemas for the Assets feature (the `lib/validation/example.ts`
 * pattern — one schema per resource, imported by both the API route handler
 * and the client form so the two can't drift). ADR-28.
 *
 * Money is validated as a decimal **string** (e.g. `"45000.00"`) — it never
 * becomes a JS float (ADR-30). The date is a `YYYY-MM-DD` calendar string
 * (`Asset.purchaseDate` is a `@db.Date`). The domain (`lib/domain/assets`)
 * enforces the business rules on top of this: cost `>= 0`, no future
 * purchase date, the referential guard on hard-delete.
 */

const decimalString = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Must be a number with up to 2 decimal places");

const isoDateString = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a YYYY-MM-DD date");

export const assetCondition = z.enum([
  "Good",
  "Needs Repair",
  "Decommissioned",
]);

export const createAssetSchema = z.object({
  name: z.string().trim().min(1, "Asset name is required"),
  // `Location.id` accepts readable seed ids (e.g. "seed-location-store"), so
  // validate as a non-empty id, not a uuid (ADR-38 §3).
  locationId: z.string().min(1, "Location is required"),
  purchaseDate: isoDateString,
  purchaseCost: decimalString,
  condition: assetCondition,
  // Whole units, >= 1. Optional — the domain defaults it to 1 (the column
  // default). `.coerce` so a form string ("6") is accepted.
  quantity: z.coerce
    .number()
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be 1 or more")
    .optional(),
  // Free-text Admin grouping. Blank string is allowed and normalised to
  // `null` by the domain; `.nullish()` so the field may be omitted entirely.
  category: z.string().trim().max(60, "Category is too long").nullish(),
});

export const updateAssetSchema = createAssetSchema;

export const transitionConditionSchema = z.object({
  condition: assetCondition,
});

export const hardDeleteAssetSchema = z.object({
  confirmName: z.string().min(1),
});

export const listAssetsQuerySchema = z.object({
  search: z.string().trim().optional(),
  locationId: z.string().min(1).optional(),
  condition: assetCondition.optional(),
  category: z.string().min(1).optional(),
  includeDeleted: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => v === "true"),
});

export type CreateAssetBody = z.infer<typeof createAssetSchema>;
export type UpdateAssetBody = z.infer<typeof updateAssetSchema>;
export type TransitionConditionBody = z.infer<typeof transitionConditionSchema>;
export type HardDeleteAssetBody = z.infer<typeof hardDeleteAssetSchema>;
export type ListAssetsQuery = z.infer<typeof listAssetsQuerySchema>;
