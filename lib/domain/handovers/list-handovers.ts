import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { businessDateEndUtc, businessDateStartUtc } from "@/lib/time";
import { DomainError } from "./errors";
import { HANDOVER_INCLUDE, ZERO, toHandoverView } from "./internal";
import { resolveActingStaff } from "./resolve-staff";
import type {
  HandoverActor,
  HandoverView,
  ListHandoversFilter,
} from "./types";

/**
 * List handovers, role-scoped (the `lib/domain/stock/list-movements.ts`
 * pattern):
 *   - `admin` → every location (optionally narrowed by `filter.locationId`).
 *   - `cashier` / `canteen_attendant` → only their own `Staff`-linked
 *     rows (`staffId`). A foreign `locationId` filter short-circuits to
 *     `[]`. A staff user with no `Staff` link → `FORBIDDEN`.
 *   - any other role → `FORBIDDEN`.
 *
 * `filter.date` is an Africa/Nairobi business date → `occurredAt` within
 * `[businessDateStartUtc, businessDateEndUtc)`.
 *
 * Each row's declared figures are the **current derived** values
 * (original + Σ correction deltas). Correction rows themselves
 * (`correctsHandoverId` set) are excluded from the list — they are an
 * implementation detail folded into the original's figures; the audit
 * trail is where they surface.
 *
 * Newest first.
 */
export async function listHandovers(
  filter: ListHandoversFilter,
  actor: HandoverActor,
): Promise<HandoverView[]> {
  const where: Prisma.HandoverWhereInput = { correctsHandoverId: null };

  if (actor.role === "admin") {
    if (filter.locationId) where.locationId = filter.locationId;
  } else if (actor.role === "cashier" || actor.role === "canteen_attendant") {
    const { staffId, locationId } = await resolveActingStaff(actor.userId);
    if (filter.locationId && filter.locationId !== locationId) return [];
    where.staffId = staffId;
  } else {
    throw new DomainError(
      "FORBIDDEN",
      "You do not have access to handovers.",
    );
  }

  if (filter.date) {
    where.occurredAt = {
      gte: businessDateStartUtc(filter.date),
      lt: businessDateEndUtc(filter.date),
    };
  }

  const rows = await prisma.handover.findMany({
    where,
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    include: HANDOVER_INCLUDE,
  });
  if (rows.length === 0) return [];

  // One grouped sum of every correction delta for the listed handovers,
  // folded into each row's derived declared figures — never a per-row
  // query loop.
  const ids = rows.map((r) => r.id);
  const deltas = await prisma.handover.groupBy({
    by: ["correctsHandoverId"],
    where: { correctsHandoverId: { in: ids } },
    _sum: { cashDeclared: true, mpesaDeclared: true },
  });
  const deltaByOriginal = new Map(
    deltas.map((d) => [
      d.correctsHandoverId as string,
      {
        cash: d._sum.cashDeclared ?? ZERO,
        mpesa: d._sum.mpesaDeclared ?? ZERO,
      },
    ]),
  );

  return rows.map((row) => {
    const d = deltaByOriginal.get(row.id);
    return toHandoverView(
      row,
      d ? row.cashDeclared.add(d.cash) : row.cashDeclared,
      d ? row.mpesaDeclared.add(d.mpesa) : row.mpesaDeclared,
    );
  });
}
