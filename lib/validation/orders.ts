import { z } from "zod";

/**
 * Shared Zod schemas for Restaurant Orders (the `lib/validation/catalog.ts`
 * pattern — shape only; the domain (`lib/domain/sales`) enforces the
 * business rules: line stock check, delivery-fee-only-on-delivery,
 * credit ⇒ customerId, price snapshot).
 *
 * Money and quantities are validated as decimal **strings** — never JS
 * floats. `deliveryFee` is a money string; a line `quantity` allows up to
 * 4 decimal places (matches `Decimal(14,4)` stock quantities).
 */

const moneyString = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Must be a number with up to 2 decimal places");

const quantityString = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,4})?$/, "Must be a number with up to 4 decimal places");

const orderType = z.enum(["dine_in", "takeaway", "delivery"]);
const paymentMethod = z.enum(["cash", "mpesa", "credit"]);
const moneyAccount = z.enum(["cash", "mpesa_bank"]);

const orderLine = z.object({
  productId: z.string().min(1, "productId is required"),
  quantity: quantityString,
});

/**
 * Body for `POST /api/orders`, `PATCH /api/orders/:id`, and
 * `POST /api/orders/:id/correct` — the same shape (an edit / correction
 * fully re-states the order).
 */
export const orderInputSchema = z.object({
  orderType,
  deliveryFee: moneyString.optional(),
  paymentMethod,
  customerId: z.string().min(1).optional(),
  account: moneyAccount.optional(),
  occurredAt: z.string().datetime().optional(),
  lines: z.array(orderLine).min(1, "An order must have at least one line"),
});

export const listOrdersQuerySchema = z.object({
  cashierId: z.string().min(1).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD")
    .optional(),
  paymentMethod: paymentMethod.optional(),
  orderType: orderType.optional(),
});

export type OrderInputBody = z.infer<typeof orderInputSchema>;
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
