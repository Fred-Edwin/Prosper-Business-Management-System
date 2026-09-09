import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  businessDateEndUtc,
  businessDateOnly,
  businessDateStartUtc,
  toBusinessDate,
} from "@/lib/time";
import { ZERO, moneyString } from "./internal";
import type { ReconciliationRow, ReconciliationView } from "./types";

/**
 * The read the Admin reconciliation view consumes: declared vs received
 * vs variance for every handover in a business-date range, with
 * corrections already folded into the declared figures and the stored
 * variance from the receipt row read verbatim (PRD §4.5 — variance is
 * stored, never recomputed on read).
 *
 * Admin-only — enforced at the route. Accepts either a single business
 * date (`YYYY-MM-DD`) or an inclusive `{ from, to }` range — a single
 * date is exactly `{ from: date, to: date }`.
 *
 * Correction rows (`correctsHandoverId` set) are not their own rows here;
 * their deltas are summed into the original. A handover with no receipt
 * yet has `received: false` and `null` received / variance figures.
 * `totals` sum the derived declared across all rows and the stored
 * received / variance across rows that have a receipt, across the WHOLE
 * range. `closedDates` lists which business dates in the range are
 * sealed (ADR-79) — the screen uses it to decide, per row, whether
 * "Record receipt" can show (open day) or the row must say "Day closed".
 */
export async function getReconciliation(
  dateOrRange: string | { from: string; to: string },
): Promise<ReconciliationView> {
  const { from, to } =
    typeof dateOrRange === "string"
      ? { from: dateOrRange, to: dateOrRange }
      : dateOrRange;

  const [handovers, closedRows] = await Promise.all([
    prisma.handover.findMany({
      where: {
        correctsHandoverId: null,
        occurredAt: {
          gte: businessDateStartUtc(from),
          lt: businessDateEndUtc(to),
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
    }),
    prisma.dayClose.findMany({
      where: {
        date: { gte: businessDateOnly(from), lte: businessDateOnly(to) },
      },
      select: { date: true },
    }),
  ]);
  const closedDates = closedRows.map((r) => toBusinessDate(r.date));

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
    from,
    to,
    rows,
    closedDates,
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
