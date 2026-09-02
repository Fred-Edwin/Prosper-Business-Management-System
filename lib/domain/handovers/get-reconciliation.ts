import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { businessDateEndUtc, businessDateStartUtc } from "@/lib/time";
import { ZERO, moneyString } from "./internal";
import type { ReconciliationRow, ReconciliationView } from "./types";

/**
 * The read the Admin reconciliation view consumes: declared vs received
 * vs variance for every handover on a business date, with corrections
 * already folded into the declared figures and the stored variance from
 * the receipt row read verbatim (PRD §4.5 — variance is stored, never
 * recomputed on read).
 *
 * Admin-only — enforced at the route. One business date per call
 * (`YYYY-MM-DD`, Africa/Nairobi).
 *
 * Correction rows (`correctsHandoverId` set) are not their own rows here;
 * their deltas are summed into the original. A handover with no receipt
 * yet has `received: false` and `null` received / variance figures.
 * `totals` sum the derived declared across all rows and the stored
 * received / variance across rows that have a receipt.
 */
export async function getReconciliation(
  date: string,
): Promise<ReconciliationView> {
  const handovers = await prisma.handover.findMany({
    where: {
      correctsHandoverId: null,
      occurredAt: {
        gte: businessDateStartUtc(date),
        lt: businessDateEndUtc(date),
      },
    },
    orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }],
    include: {
      staff: { select: { name: true } },
      location: { select: { name: true } },
      receipts: {
        orderBy: { createdAt: "desc" },
        include: { shortfalls: { orderBy: { createdAt: "asc" } } },
      },
    },
  });

  const ids = handovers.map((h) => h.id);
  const deltaByOriginal = new Map<
    string,
    { cash: Prisma.Decimal; mpesa: Prisma.Decimal }
  >();
  if (ids.length > 0) {
    const deltas = await prisma.handover.groupBy({
      by: ["correctsHandoverId"],
      where: { correctsHandoverId: { in: ids } },
      _sum: { cashDeclared: true, mpesaDeclared: true },
    });
    for (const d of deltas) {
      deltaByOriginal.set(d.correctsHandoverId as string, {
        cash: d._sum.cashDeclared ?? ZERO,
        mpesa: d._sum.mpesaDeclared ?? ZERO,
      });
    }
  }

  const totals = {
    cashDeclared: ZERO,
    mpesaDeclared: ZERO,
    cashReceived: ZERO,
    mpesaReceived: ZERO,
    cashVariance: ZERO,
    mpesaVariance: ZERO,
  };

  const rows: ReconciliationRow[] = handovers.map((h) => {
    const delta = deltaByOriginal.get(h.id);
    const cashDeclared = delta
      ? h.cashDeclared.add(delta.cash)
      : h.cashDeclared;
    const mpesaDeclared = delta
      ? h.mpesaDeclared.add(delta.mpesa)
      : h.mpesaDeclared;

    // Latest receipt wins (ordered desc). `correctReceipt` writes a fresh
    // receipt row with the recomputed stored variance.
    const receipt = h.receipts[0] ?? null;

    totals.cashDeclared = totals.cashDeclared.add(cashDeclared);
    totals.mpesaDeclared = totals.mpesaDeclared.add(mpesaDeclared);
    if (receipt) {
      totals.cashReceived = totals.cashReceived.add(receipt.cashReceived);
      totals.mpesaReceived = totals.mpesaReceived.add(receipt.mpesaReceived);
      totals.cashVariance = totals.cashVariance.add(receipt.cashVariance);
      totals.mpesaVariance = totals.mpesaVariance.add(receipt.mpesaVariance);
    }

    return {
      handoverId: h.id,
      staffId: h.staffId,
      staffName: h.staff.name,
      locationId: h.locationId,
      locationName: h.location.name,
      occurredAt: h.occurredAt.toISOString(),
      cashDeclared: moneyString(cashDeclared),
      mpesaDeclared: moneyString(mpesaDeclared),
      cashReceived: receipt ? moneyString(receipt.cashReceived) : null,
      mpesaReceived: receipt ? moneyString(receipt.mpesaReceived) : null,
      cashVariance: receipt ? moneyString(receipt.cashVariance) : null,
      mpesaVariance: receipt ? moneyString(receipt.mpesaVariance) : null,
      received: receipt !== null,
      shortfallNotes: receipt ? receipt.shortfalls.map((s) => s.note) : [],
      receiptId: receipt?.id ?? null,
    };
  });

  return {
    date,
    rows,
    totals: {
      cashDeclared: moneyString(totals.cashDeclared),
      mpesaDeclared: moneyString(totals.mpesaDeclared),
      cashReceived: moneyString(totals.cashReceived),
      mpesaReceived: moneyString(totals.mpesaReceived),
      cashVariance: moneyString(totals.cashVariance),
      mpesaVariance: moneyString(totals.mpesaVariance),
    },
  };
}
