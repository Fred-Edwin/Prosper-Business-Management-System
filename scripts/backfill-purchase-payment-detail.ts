import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * One-time data backfill for ADR-46 §3.
 *
 * The migration `20260829120000_add_purchase_payment_detail_fields` adds
 * four nullable columns to `stock_movement`
 * (`purchaseSupplier` / `purchaseOrderedQty` / `purchaseTotalCost` /
 * `purchasePaidFrom`). This script recovers those values for every
 * pre-existing `purchase_payment` row by re-parsing its `note`, then
 * writes what parses. Unparseable rows are left NULL. `note` is retained.
 *
 * Idempotent: re-parses and overwrites the four columns every run; safe to
 * run more than once. Rows that already have a non-null value are re-parsed
 * too (the parse is deterministic).
 *
 * The note format written by `recordPurchasePayment` (before this change)
 * is:  `Ordered <qty> from <supplier>; cost <cost> from <cash|mpesa_bank>`
 *
 * Note on the handoff regexes: the Session 16 handoff quoted
 * `/supplier[:=]\s*.../` for the supplier, but no note the code ever wrote
 * uses a `supplier:` prefix — the real format is `... from <supplier>;`.
 * This parser matches the notes that actually exist. `cost` / paid-from
 * match the handoff regexes directly.
 *
 * Run once:  pnpm tsx scripts/backfill-purchase-payment-detail.ts
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export type ParsedPaymentNote = {
  supplier: string | null;
  orderedQty: string | null;
  totalCost: string | null;
  paidFrom: "cash" | "mpesa_bank" | null;
};

/** Best-effort recovery of the four fields from a legacy `purchase_payment` note. */
export function parseLegacyPaymentNote(note: string | null): ParsedPaymentNote {
  const empty: ParsedPaymentNote = {
    supplier: null,
    orderedQty: null,
    totalCost: null,
    paidFrom: null,
  };
  if (!note) return empty;

  const orderedQty =
    note.match(/Ordered\s+([\d,]+(?:\.\d+)?)\s+from\s/i)?.[1]?.replace(/,/g, "") ?? null;

  const supplier =
    note.match(/Ordered\s+[\d,.]+\s+from\s+(.+?);\s*cost\s/i)?.[1]?.trim() ?? null;

  const totalCost =
    note
      .match(/cost[:=]?\s*([\d,]+(?:\.\d{1,2})?)/i)?.[1]
      ?.replace(/,/g, "") ?? null;

  const paidFromRaw = note.match(/\b(cash|mpesa_bank)\b/i)?.[1]?.toLowerCase() ?? null;
  const paidFrom =
    paidFromRaw === "cash" || paidFromRaw === "mpesa_bank" ? paidFromRaw : null;

  return {
    supplier: supplier && supplier.length > 0 ? supplier : null,
    orderedQty,
    totalCost,
    paidFrom,
  };
}

async function main() {
  const rows = await prisma.stockMovement.findMany({
    where: { movementType: "purchase_payment" },
    select: { id: true, note: true },
  });

  let written = 0;
  let skipped = 0;

  for (const row of rows) {
    const parsed = parseLegacyPaymentNote(row.note);
    const anything =
      parsed.supplier !== null ||
      parsed.orderedQty !== null ||
      parsed.totalCost !== null ||
      parsed.paidFrom !== null;

    if (!anything) {
      skipped += 1;
      console.log(`  skip  ${row.id} — note did not parse: ${JSON.stringify(row.note)}`);
      continue;
    }

    await prisma.stockMovement.update({
      where: { id: row.id },
      data: {
        purchaseSupplier: parsed.supplier,
        purchaseOrderedQty: parsed.orderedQty,
        purchaseTotalCost: parsed.totalCost,
        purchasePaidFrom: parsed.paidFrom,
      },
    });
    written += 1;
    console.log(
      `  wrote ${row.id} — supplier=${parsed.supplier} qty=${parsed.orderedQty} ` +
        `cost=${parsed.totalCost} paidFrom=${parsed.paidFrom}`,
    );
  }

  console.log(
    `\nBackfill done: ${rows.length} purchase_payment rows — ${written} written, ${skipped} left NULL.`,
  );
}

// Only run when invoked directly, not when imported by a test.
if (process.argv[1] && process.argv[1].endsWith("backfill-purchase-payment-detail.ts")) {
  main()
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
