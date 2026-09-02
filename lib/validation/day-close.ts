import { z } from "zod";

/**
 * Zod shapes for `/api/day-close` (M3-S1 / ADR-52). Shape only — the
 * domain (`lib/domain/audit`) owns the rules (already-closed → CONFLICT,
 * not-closed → NOT_FOUND, Admin-only enforced at the route).
 *
 * A business date is a bare `YYYY-MM-DD` (Africa/Nairobi calendar date),
 * never a timestamp — `DayClose.date` is a date-only column.
 */
export const businessDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a YYYY-MM-DD business date");

/** `POST /api/day-close` — seal a date. */
export const closeDayBodySchema = z.object({
  date: businessDateSchema,
});

/** `DELETE /api/day-close` — reopen a date. */
export const reopenDayBodySchema = z.object({
  date: businessDateSchema,
});

/** `GET /api/day-close?date=YYYY-MM-DD` — optional single-date status. */
export const dayStatusQuerySchema = z.object({
  date: businessDateSchema.optional(),
});
