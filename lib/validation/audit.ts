import { z } from "zod";

/**
 * Zod shapes for `/api/audit` and `/api/audit/day-detail` (M5 S11).
 * Shape only — `lib/domain/audit` owns every rule (the significant-set
 * definition, entity-label resolution, the offset clamps). Admin-only is
 * enforced at the route.
 *
 * A business date is a bare `YYYY-MM-DD` (Africa/Nairobi), never a
 * timestamp.
 */

const businessDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a YYYY-MM-DD business date");

/** Mirrors the Prisma `AuditAction` enum. */
export const auditAction = z.enum([
  "create",
  "correct",
  "soft_delete",
  "hard_delete",
  "login",
  "day_close",
  "day_reopen",
]);

/**
 * `GET /api/audit?from=&to=&actorId=&action=&entityType=&group=&limit=&offset=`
 *
 * `group=significant` returns only the investigable subset (corrections,
 * deletions, day close/reopen, staff/location/payout writes). `limit`
 * 1..200 (default 50 in the domain); `offset` ≥ 0.
 */
export const listAuditLogQuerySchema = z.object({
  from: businessDate.optional(),
  to: businessDate.optional(),
  actorId: z.string().trim().min(1).optional(),
  action: auditAction.optional(),
  entityType: z.string().trim().min(1).max(64).optional(),
  group: z.literal("significant").optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

/** `GET /api/audit/day-detail?date=YYYY-MM-DD` — one business day, in full. */
export const dayDetailQuerySchema = z.object({
  date: businessDate,
});

export type ListAuditLogQuery = z.infer<typeof listAuditLogQuerySchema>;
export type DayDetailQuery = z.infer<typeof dayDetailQuerySchema>;
