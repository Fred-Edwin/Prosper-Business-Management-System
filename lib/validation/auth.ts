import { z } from "zod";

const pin = z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits");

/** `PATCH /api/auth/pin` — self-service PIN change, any authenticated role. */
export const changeOwnPinSchema = z.object({
  currentPin: pin,
  newPin: pin,
});

export type ChangeOwnPinBody = z.infer<typeof changeOwnPinSchema>;

/**
 * `POST /api/auth/acting-as` — Admin role-switching. `role: null` is the
 * "Exit to Admin" action; a staff role additionally needs `locationId`
 * (further validated against real, active `Location` rows in the domain).
 *
 * `locationId` is a non-empty opaque identifier, not a strict UUID: seeded
 * / imported locations use readable ids ("seed-location-store"), and the
 * domain (`resolveActingAs`) already checks the id resolves to a real,
 * active `Location` of the role's type — a format regex adds nothing.
 * (S2: was `.uuid()`, which 400'd every switch against seeded data.)
 */
export const actingAsSchema = z.object({
  role: z
    .enum(["admin", "store_manager", "cashier", "canteen_attendant"])
    .nullable(),
  locationId: z.string().min(1).optional(),
});

export type ActingAsBody = z.infer<typeof actingAsSchema>;
