import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/require-role";
import { ok, fail } from "@/lib/api/response";
import { DomainError } from "@/lib/domain/stock";
import { isOpeningDayPinned, resolveOpeningDay } from "@/lib/domain/audit";

/**
 * `GET /api/stock-movements/opening-day` (ADR-70) — the business date every
 * opening row is pinned to, and whether it has been pinned yet.
 *
 * The opening-stock screen used to label itself "Day 1 Opening Stock —
 * <today>" on every visit, which is false on any day but the first and is
 * exactly the misreading that invites a mid-history restatement. It reads
 * this instead, so the heading names the real Day 1.
 *
 * `{ data: { businessDate, pinned } }` — `pinned: false` means nothing has
 * been recorded yet and `businessDate` is today, the date a first save
 * would claim.
 */
export async function GET() {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;

  try {
    const [businessDate, pinned] = await Promise.all([
      resolveOpeningDay(),
      isOpeningDayPinned(),
    ]);
    return ok({ businessDate, pinned });
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
