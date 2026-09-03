import { z } from "zod";

/**
 * Zod schemas for Locations CRUD (M4). One schema per verb, imported by
 * the API route handler and, later, the admin form so the two can't drift.
 *
 * `Location.type` is the `LocationType` enum (restaurant | canteen |
 * store). The domain (`lib/domain/catalog/locations.ts`) enforces the
 * rest: non-empty trimmed name, case-insensitive name uniqueness, and the
 * referential guard on deactivation.
 */

const locationType = z.enum(["restaurant", "canteen", "store"]);

export const createLocationSchema = z.object({
  name: z.string().trim().min(1, "Location name is required"),
  type: locationType,
});

export const updateLocationSchema = z
  .object({
    name: z.string().trim().min(1, "Location name is required").optional(),
    type: locationType.optional(),
    active: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "Nothing to update.",
  });

export type CreateLocationBody = z.infer<typeof createLocationSchema>;
export type UpdateLocationBody = z.infer<typeof updateLocationSchema>;
