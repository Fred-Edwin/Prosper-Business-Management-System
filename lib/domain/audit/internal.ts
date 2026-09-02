import type { DayClose } from "@prisma/client";
import { toBusinessDate } from "@/lib/time";
import type { DayCloseView } from "./types";

/**
 * `DayClose.date` is a `@db.Date` column — Prisma round-trips it as a
 * `Date` at `00:00:00Z`, so its calendar date read in UTC *is* the
 * business date. `toBusinessDate` would apply the +3h zone shift and land
 * a day early, so format the UTC parts directly here.
 */
export function dayCloseDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function toDayCloseView(row: DayClose): DayCloseView {
  return {
    date: dayCloseDateString(row.date),
    closedBy: row.closedBy,
    closedAt: row.closedAt.toISOString(),
  };
}

export { toBusinessDate };
