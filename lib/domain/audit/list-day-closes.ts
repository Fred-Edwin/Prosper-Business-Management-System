import { prisma } from "@/lib/db";
import { toBusinessDate, businessDateOnly } from "@/lib/time";
import type { DayCloseView, DayStatusView } from "./types";
import { toDayCloseView } from "./internal";

/**
 * The most-recently-closed business dates, newest first. Feeds the Admin
 * Day Close card's "recent dates" list.
 */
export async function listDayCloses(limit = 14): Promise<DayCloseView[]> {
  const rows = await prisma.dayClose.findMany({
    orderBy: { date: "desc" },
    take: limit,
  });
  return rows.map(toDayCloseView);
}

/**
 * Closed/open status of one business date (default: today in
 * Africa/Nairobi). The card's headline and the toggle's current state
 * come from this.
 */
export async function getDayStatus(date?: string): Promise<DayStatusView> {
  const businessDate = date ?? toBusinessDate(new Date());
  const row = await prisma.dayClose.findUnique({
    where: { date: businessDateOnly(businessDate) },
  });
  return {
    date: businessDate,
    closed: row !== null,
    closedBy: row?.closedBy ?? null,
    closedAt: row?.closedAt.toISOString() ?? null,
  };
}
