import { z } from "zod";

/**
 * Shared Zod schemas for Suppliers & Vendors (the `lib/validation/customers.ts`
 * pattern — one schema per resource, imported by the API route handler and
 * the client form so the two can't drift).
 */

export const createSupplierSchema = z.object({
  name: z.string().trim().min(1, "Supplier name is required"),
  phone: z.string().trim().optional(),
  note: z.string().trim().max(500).optional(),
});

export const listSuppliersQuerySchema = z.object({
  search: z.string().trim().optional(),
  includeArchived: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => v === "true"),
});

export type CreateSupplierBody = z.infer<typeof createSupplierSchema>;
export type ListSuppliersQuery = z.infer<typeof listSuppliersQuerySchema>;
