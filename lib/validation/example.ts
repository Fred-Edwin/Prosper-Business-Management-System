import { z } from "zod";

/**
 * Example only (ADR-28) — demonstrates the shared-schema pattern real
 * domain modules should follow: one Zod schema per resource, imported by
 * both the API route handler (server-side validation) and any client form
 * (client-side validation), so the two can never drift apart.
 *
 * Real schemas live alongside their domain module, e.g.
 * `lib/validation/catalog.ts` for Product/Location input, and are written
 * as each feature's sprint implements it — not here.
 */
export const exampleLocationInput = z.object({
  name: z.string().min(1),
  type: z.enum(["restaurant", "canteen", "store"]),
});

export type ExampleLocationInput = z.infer<typeof exampleLocationInput>;
