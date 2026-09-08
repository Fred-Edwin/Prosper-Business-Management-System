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
const payModel = z.enum(["fixed_daily_rate", "daily_entry"]);
const pin = z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits");
const businessDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a YYYY-MM-DD date");
const month = z.string().regex(/^\d{4}-\d{2}$/, "Must be a YYYY-MM month");

/**
 * Create a staff member. Discriminated on `appAccess`:
 *
 *   - `true`  → a login-holding team member: `role` + `pin` required
 *     (`createStaff` also creates the `User`).
 *   - `false` → a roster-only staff member (cook / casual): `jobTitle`
 *     required, no `role`, no `pin`, no `User`.
 */
export const createStaffSchema = z.discriminatedUnion("appAccess", [
  z.object({
    appAccess: z.literal(true),
    name: z.string().trim().min(1, "Name is required"),
    role: staffRole,
    locationId: z.string().min(1, "Location is required"),
    dailyRate: decimalString,
    pin,
    payModel: payModel.optional(),
  }),
  z.object({
    appAccess: z.literal(false),
    name: z.string().trim().min(1, "Name is required"),
    jobTitle: z.string().trim().min(1, "Job title is required"),
    locationId: z.string().min(1, "Location is required"),
    dailyRate: decimalString,
    payModel: payModel.optional(),
  }),
]);

export const updateStaffSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").optional(),
    role: staffRole.optional(),
    jobTitle: z.string().trim().min(1, "Job title is required").optional(),
    payModel: payModel.optional(),
    locationId: z.string().min(1).optional(),
    dailyRate: decimalString.optional(),
    pin: pin.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update." })
  .refine((v) => !(v.role !== undefined && v.jobTitle !== undefined), {
    message: "A staff member has a role or a job title, not both.",
    path: ["jobTitle"],
  });

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

/**
 * `POST /api/pay/adjustments/:id/correct` (ADR-72). Admin-only,
 * append-only: the domain writes ONE linked signed-delta
 * `StaffPayAdjustment` row (NO `MoneyMovement` — a pay adjustment is not
 * a cash-ledger event). `amount` is the corrected FINAL magnitude.
 */
export const correctPayAdjustmentSchema = z.object({
  amount: decimalString,
  note: z.string().trim().max(500).optional(),
});

/**
 * `POST /api/pay/daily-pay` (ADR-76). Admin-only, day-close gated. Records
 * one hand-typed daily pay amount for a `daily_entry` staff member. At
 * most one ORIGINAL entry per (staff, date).
 */
export const recordDailyPaySchema = z.object({
  staffId: z.string().min(1),
  amount: decimalString,
  date: businessDate,
  note: z.string().trim().max(500).optional(),
});

/**
 * `PATCH /api/pay/daily-pay/:id` (ADR-72). Admin-only, append-only: the
 * domain writes ONE linked signed-delta `StaffDailyPay` row (NO
 * `MoneyMovement`). `amount` is the corrected FINAL amount.
 */
export const correctDailyPaySchema = z.object({
  amount: decimalString,
  note: z.string().trim().max(500).optional(),
});

export const payQuerySchema = z.object({
  month,
  staffId: z.string().min(1).optional(),
});

const moneyAccount = z.enum(["cash", "mpesa_bank"]);

/**
 * `POST /api/pay/payout` — record one PARTIAL payout of a staff member's
 * month (staff-pay rework PR 3). `amount` is Admin-entered (decimal
 * string, `> 0`) but bounded server-side to the month's remaining net
 * (`getStaffPay.netRemaining`); over-payment → `VALIDATION_ERROR`
 * (`field: "amount"`).
 */
export const payStaffSchema = z.object({
  staffId: z.string().min(1),
  month,
  paidFromAccount: moneyAccount,
  date: businessDate,
  amount: decimalString,
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
export type CorrectPayAdjustmentBody = z.infer<
  typeof correctPayAdjustmentSchema
>;
export type RecordDailyPayBody = z.infer<typeof recordDailyPaySchema>;
export type CorrectDailyPayBody = z.infer<typeof correctDailyPaySchema>;
export type PayStaffBody = z.infer<typeof payStaffSchema>;
export type PayAllUnpaidBody = z.infer<typeof payAllUnpaidSchema>;
