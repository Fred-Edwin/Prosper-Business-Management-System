import { prisma } from "@/lib/db";
import { businessDateEndUtc, businessDateStartUtc } from "@/lib/time";
import { getReconciliation } from "@/lib/domain/handovers";
import { getLowOrNegativeStock } from "./needs-attention";
import type { HandoverStatus, StockActivityByLocation } from "./types";

/**
 * v2 zone — "Stock & activity by location" (`dashboard-screen.md`). Unlike
 * every other figure on this endpoint's request, this is **always "now"**,
 * never period-scoped — same rule as the Right Now zone. Per location
 * (ordered Store → Restaurant → Canteen):
 *
 *   - `movementCount` — today's `StockMovement` rows at that location.
 *   - `lowStockCount` — products at that location currently ≤ 0 on hand.
 *     Reuses `getLowOrNegativeStock`'s per-location fold (needs-attention's
 *     existing groupBy) rather than re-running the sweep.
 *   - `handoverStatus` — folded from `getReconciliation(today).rows`
 *     (the SAME read `GET /api/handovers/reconciliation` uses) by
 *     `locationId`: any row `received === false` → `"awaiting"`; rows
 *     present and every one `received === true` → `"received"`; no rows
 *     for today → `null` (Store has no handover flow at all — PRD).
 *     Never re-derived from the raw `Handover` table directly.
 */
export async function getStockActivityByLocation(
  today: string,
): Promise<StockActivityByLocation[]> {
  const start = businessDateStartUtc(today);
  const end = businessDateEndUtc(today);

  const [locations, movementRows, { countByLocationId }, reconciliation] =
    await Promise.all([
      prisma.location.findMany({
        select: { id: true, name: true, type: true },
      }),
      prisma.stockMovement.groupBy({
        by: ["locationId"],
        _count: { _all: true },
        where: { occurredAt: { gte: start, lt: end } },
      }),
      getLowOrNegativeStock(),
      getReconciliation(today),
    ]);

  const movementCountByLocation = new Map(
    movementRows.map((r) => [r.locationId, r._count._all]),
  );

  const handoverStatusByLocation = new Map<string, HandoverStatus>();
  for (const row of reconciliation.rows) {
    const prev = handoverStatusByLocation.get(row.locationId);
    if (!row.received) {
      handoverStatusByLocation.set(row.locationId, "awaiting");
    } else if (prev !== "awaiting") {
      handoverStatusByLocation.set(row.locationId, "received");
    }
  }

  // Store → Restaurant → Canteen (the dashboard-screen.md table order),
  // via `Location.type` — not a name-string match.
  const order: Record<string, number> = { store: 0, restaurant: 1, canteen: 2 };
  const sorted = [...locations].sort((a, b) => {
    const ai = order[a.type] ?? 99;
    const bi = order[b.type] ?? 99;
    if (ai !== bi) return ai - bi;
    return a.name.localeCompare(b.name);
  });

  return sorted.map((loc) => ({
    locationId: loc.id,
    locationName: loc.name,
    movementCount: movementCountByLocation.get(loc.id) ?? 0,
    lowStockCount: countByLocationId.get(loc.id) ?? 0,
    handoverStatus: handoverStatusByLocation.get(loc.id) ?? null,
  }));
}
