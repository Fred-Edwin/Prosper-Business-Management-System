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
 */
export const actingAsSchema = z.object({
  role: z
    .enum(["admin", "store_manager", "cashier", "canteen_attendant"])
    .nullable(),
  locationId: z.string().uuid().optional(),
});

export type ActingAsBody = z.infer<typeof actingAsSchema>;
