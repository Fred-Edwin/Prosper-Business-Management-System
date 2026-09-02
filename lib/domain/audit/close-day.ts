import { prisma } from "@/lib/db";
import { businessDateOnly } from "@/lib/time";
import { DomainError } from "./errors";
import type { DayCloseView } from "./types";
import { toDayCloseView } from "./internal";

/**
 * Seal a business date (ADR-52). Admin-only — enforced at the route; the
 * domain trusts the caller has already checked the role.
 *
 * Writes the `DayClose` row **and** an `AuditLog` row
 * (`action: "day_close"`, `entityType: "day_close"`, `entityId` = the
 * date string) in one transaction. The audit row is the non-negotiable
 * part: reopening is deliberately low-friction (`reopenDay`), so the
 * trail is what preserves the history of who sealed what and when.
 *
 *   - `date` is a `YYYY-MM-DD` Africa/Nairobi business date.
 *   - `CONFLICT` if the date is already closed (double-close is a no-op
 *     to protect, not silently succeed — the caller shows "already
 *     closed").
 */
export async function closeDay(
  date: string,
  adminUserId: string,
): Promise<DayCloseView> {
  const dateOnly = businessDateOnly(date);

  const row = await prisma.$transaction(async (tx) => {
    const existing = await tx.dayClose.findUnique({
      where: { date: dateOnly },
      select: { id: true },
    });
    if (existing) {
      throw new DomainError("CONFLICT", "This day is already closed.");
    }

    const created = await tx.dayClose.create({
      data: { date: dateOnly, closedBy: adminUserId },
    });

    await tx.auditLog.create({
      data: {
        userId: adminUserId,
        action: "day_close",
        entityType: "day_close",
        entityId: date,
        newValue: { date, closedBy: adminUserId },
        occurredAt: new Date(),
      },
    });

    return created;
  });

  return toDayCloseView(row);
}

/**
 * Reopen a previously closed business date (ADR-52). Admin-only. **Low
 * friction by owner decision** — a plain toggle, no type-to-confirm, no
 * multi-step dialog. Works on any closed date, including historical ones.
 *
 * Deletes the `DayClose` row and writes an `AuditLog` row
 * (`action: "day_reopen"`). The audit trail is the safety mechanism that
 * makes the permissive model sound — every reopen is recorded.
 *
 *   - `NOT_FOUND` if the date is not currently closed.
 */
export async function reopenDay(
  date: string,
  adminUserId: string,
): Promise<{ date: string; reopened: true }> {
  const dateOnly = businessDateOnly(date);

  await prisma.$transaction(async (tx) => {
    const existing = await tx.dayClose.findUnique({
      where: { date: dateOnly },
      select: { id: true },
    });
    if (!existing) {
      throw new DomainError("NOT_FOUND", "This day is not closed.");
    }

    await tx.dayClose.delete({ where: { date: dateOnly } });

    await tx.auditLog.create({
      data: {
        userId: adminUserId,
        action: "day_reopen",
        entityType: "day_close",
        entityId: date,
        oldValue: { date, closedBy: existing.id },
        occurredAt: new Date(),
      },
    });
  });

  return { date, reopened: true };
}
