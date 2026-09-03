import { z } from "zod";

/**
 * Zod shape for `GET /api/admin/dashboard` (M5 S13). Shape only — the
 * domain (`lib/domain/dashboard`) owns every rule and every figure.
 */

const businessDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a YYYY-MM-DD business date");

/**
 * `GET /api/admin/dashboard?date=YYYY-MM-DD`. `date` is optional — the
 * route defaults it to today (Africa/Nairobi). An explicit date is used
 * for a pre-close review of a past day and by tests.
 */
export const dashboardQuerySchema = z.object({
  date: businessDate.optional(),
});
