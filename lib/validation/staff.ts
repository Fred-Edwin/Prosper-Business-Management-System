import { z } from "zod";

/**
 * Zod schemas for Staff & Pay (M4, PRD §4.8). One schema per verb,
 * imported by the API route handler and, later, the admin form so the two
 * can't drift.
 *
 * The domain (`lib/domain/staff`) enforces the business rules on top:
 * name/location existence, `User.name` uniqueness, the day-close gate on
 * pay adjustments, default-present attendance.
 */

const decimalString = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Must be a number with up to 2 decimal places");

const staffRole = z.enum(["store_manager", "cashier", "canteen_attendant"]);
const pin = z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits");
const businessDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a YYYY-MM-DD date");
const month = z.string().regex(/^\d{4}-\d{2}$/, "Must be a YYYY-MM month");

export const createStaffSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  role: staffRole,
  locationId: z.string().min(1, "Location is required"),
  dailyRate: decimalString,
  pin,
});

export const updateStaffSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").optional(),
    role: staffRole.optional(),
    locationId: z.string().min(1).optional(),
    dailyRate: decimalString.optional(),
    pin: pin.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update." });

export const listStaffQuerySchema = z.object({
  search: z.string().trim().optional(),
  active: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  locationId: z.string().min(1).optional(),
});

export const setAttendanceSchema = z.object({
  staffId: z.string().min(1),
  date: businessDate,
  present: z.boolean(),
});

export const setAttendanceBulkSchema = z.object({
  date: businessDate,
  entries: z
    .array(z.object({ staffId: z.string().min(1), present: z.boolean() }))
    .min(1, "At least one staff member is required"),
});

export const listAttendanceQuerySchema = z.object({
  from: businessDate,
  to: businessDate,
  staffId: z.string().min(1).optional(),
});

export const recordPayAdjustmentSchema = z.object({
  staffId: z.string().min(1),
  type: z.enum(["advance", "deduction"]),
  amount: decimalString,
  date: businessDate,
  note: z.string().trim().max(500).optional(),
});

export const payQuerySchema = z.object({
  month,
  staffId: z.string().min(1).optional(),
});

const moneyAccount = z.enum(["cash", "mpesa_bank"]);

/**
 * `POST /api/pay/payout` — disburse one staff member's month (M4 S9A).
 * **No amount field** — the net is recomputed server-side from the ledger.
 */
export const payStaffSchema = z.object({
  staffId: z.string().min(1),
  month,
  paidFromAccount: moneyAccount,
  date: businessDate,
});

/** `POST /api/pay/payout?mode=all` — pay every unpaid active staff member. */
export const payAllUnpaidSchema = z.object({
  month,
  paidFromAccount: moneyAccount,
  date: businessDate,
});

export type CreateStaffBody = z.infer<typeof createStaffSchema>;
export type UpdateStaffBody = z.infer<typeof updateStaffSchema>;
export type SetAttendanceBody = z.infer<typeof setAttendanceSchema>;
export type SetAttendanceBulkBody = z.infer<typeof setAttendanceBulkSchema>;
export type RecordPayAdjustmentBody = z.infer<typeof recordPayAdjustmentSchema>;
export type PayStaffBody = z.infer<typeof payStaffSchema>;
export type PayAllUnpaidBody = z.infer<typeof payAllUnpaidSchema>;
