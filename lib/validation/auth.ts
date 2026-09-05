import { z } from "zod";

const pin = z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits");

/** `PATCH /api/auth/pin` — self-service PIN change, any authenticated role. */
export const changeOwnPinSchema = z.object({
  currentPin: pin,
  newPin: pin,
});

export type ChangeOwnPinBody = z.infer<typeof changeOwnPinSchema>;
