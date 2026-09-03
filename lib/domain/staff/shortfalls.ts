import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  businessDateEndUtc,
  businessDateStartUtc,
  businessMonthRange,
  toBusinessDate,
} from "@/lib/time";
import { DomainError } from "./errors";

const MONTH_RE = /^\d{4}-\d{2}$/;
const ZERO = new Prisma.Decimal(0);

/**
 * Handover shortfalls for a calendar month, grouped by staff member
 * (M4 S9B — PRD §4.8). **Admin-only** — enforced at the route.
 *
 * READ-ONLY and **completely separate from pay**. A shortfall is money a
 * staff member's handover came up short — it is followed up with the
 * person directly and is NEVER netted off pay (PRD §4.8). This read exists
 * only so the Pay & advances screen can show a standing "settle these
 * separately" list well clear of the Net pay column.
 *
 * The amount is **derived**, not stored: a `HandoverShortfall` links to
 * the `ReceiptOfHandover` that raised it, and that receipt permanently
 * stores `cashVariance` / `mpesaVariance` (negative = short — PRD §4.5).
 * The shortfall amount is the sum of the negative parts of the two
 * variances on its receipt. No schema change (owner call, M4 S9B): the
 * figure the screen needs already lives on the receipt.
 */
export type MonthlyShortfallEntry = {
  id: string;
  staffId: string;
  staffName: string;
  /** Business date (`YYYY-MM-DD`) the receipt that raised it was recorded on. */
  date: string;
  /** Positive magnitude the handover came up short, decimal string. */
  amount: string;
  note: string;
};

export type MonthlyShortfalls = {
  month: string;
  entries: MonthlyShortfallEntry[];
  /** Σ of every entry's `amount`. */
  total: string;
  /** How many entries — "N open shortfalls" in the footer. */
  count: number;
};

/** The negative part of a variance, as a positive magnitude. */
function shortPart(variance: Prisma.Decimal): Prisma.Decimal {
  return variance.isNegative() ? variance.abs() : ZERO;
}

export async function getMonthlyShortfalls(
  month: string,
): Promise<MonthlyShortfalls> {
  if (!MONTH_RE.test(month)) {
    throw new DomainError("VALIDATION_ERROR", "Month must be YYYY-MM.", "month");
  }

  const { from, to } = businessMonthRange(`${month}-01`);

  const rows = await prisma.handoverShortfall.findMany({
    where: {
      receiptOfHandover: {
        occurredAt: {
          gte: businessDateStartUtc(from),
          lt: businessDateEndUtc(to),
        },
      },
    },
    select: {
      id: true,
      staffId: true,
      note: true,
      staff: { select: { name: true } },
      receiptOfHandover: {
        select: {
          occurredAt: true,
          cashVariance: true,
          mpesaVariance: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  let total = ZERO;
  const entries: MonthlyShortfallEntry[] = rows.map((r) => {
    const amount = shortPart(r.receiptOfHandover.cashVariance).plus(
      shortPart(r.receiptOfHandover.mpesaVariance),
    );
    total = total.plus(amount);
    return {
      id: r.id,
      staffId: r.staffId,
      staffName: r.staff.name,
      date: toBusinessDate(r.receiptOfHandover.occurredAt),
      amount: amount.toFixed(2),
      note: r.note,
    };
  });

  return {
    month,
    entries,
    total: total.toFixed(2),
    count: entries.length,
  };
}
