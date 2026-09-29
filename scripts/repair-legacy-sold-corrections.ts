import "dotenv/config";
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * One-time data repair for ADR-92.
 *
 * Before ADR-92, clicking a Sold cell on the Admin stock ledger ran the
 * generic `correctMovement`, which wrote a stock-only `sale` delta row
 * (`correctsMovementId` set, but NO `orderId` / `stockCountId` /
 * `customerId`, since `correctMovement` doesn't copy them). Stock moved,
 * revenue never did. This script gives each such orphan row the revenue
 * half it was missing: ONE Cash `sale_adjustment` MoneyMovement linked by
 * `stockMovementId`, the same shape `adjustSold` writes. The stock rows
 * are left exactly as they are; they already say what the owner meant.
 *
 * What is NOT touched: order-correction sale rows (`orderId` set, since
 * `correctOrder` already wrote their money) and canteen credit-sale
 * corrections (`customerId` set, since their value is in `Debt`).
 *
 * Price: the price of the sale being corrected, not today's.
 *   - corrected a stock-count sale → that count's `canteen_sale` revenue ÷
 *     units sold;
 *   - corrected an order sale → that order line's `unitPrice`;
 *   - otherwise → the product's current selling price at the location.
 *
 * Idempotent: a row that already has a linked `sale_adjustment` money row
 * is skipped, so re-running writes nothing new.
 *
 * Dry run (default, writes nothing):
 *   pnpm tsx scripts/repair-legacy-sold-corrections.ts
 * Apply:
 *   pnpm tsx scripts/repair-legacy-sold-corrections.ts --apply
 */

type Db = PrismaClient;

export type RepairPlanRow = {
  stockMovementId: string;
  businessDate: string;
  locationName: string;
  productName: string;
  /** Signed, as stored: negative = Sold was raised. */
  quantity: string;
  unitPrice: string | null;
  priceSource: "stock_count" | "order_line" | "current_price" | "none";
  /** Signed revenue to write (−quantity × unitPrice); null when unpriced. */
  revenue: string | null;
  occurredAt: Date;
  recordedById: string;
};

const NOTE = "Repair: revenue for a Sold correction made before ADR-92";

function nairobiDate(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export async function planLegacySoldRepair(db: Db): Promise<RepairPlanRow[]> {
  const orphans = await db.stockMovement.findMany({
    where: {
      movementType: "sale",
      correctsMovementId: { not: null },
      orderId: null,
      stockCountId: null,
      customerId: null,
    },
    orderBy: { occurredAt: "asc" },
    include: {
      product: { select: { name: true } },
      location: { select: { name: true } },
      correctsMovement: {
        select: { productId: true, quantity: true, stockCountId: true, orderId: true },
      },
    },
  });

  const alreadyLinked = new Set(
    (
      await db.moneyMovement.findMany({
        where: {
          sourceType: "sale_adjustment",
          stockMovementId: { in: orphans.map((o) => o.id) },
        },
        select: { stockMovementId: true },
      })
    ).map((m) => m.stockMovementId as string),
  );

  const plan: RepairPlanRow[] = [];
  for (const row of orphans) {
    if (alreadyLinked.has(row.id)) continue;
    const orig = row.correctsMovement;

    let unitPrice: Prisma.Decimal | null = null;
    let priceSource: RepairPlanRow["priceSource"] = "none";

    if (orig?.stockCountId) {
      const revenue = await db.moneyMovement.aggregate({
        _sum: { amount: true },
        where: { sourceType: "canteen_sale", sourceId: orig.stockCountId },
      });
      const units = orig.quantity.abs();
      if (revenue._sum.amount && !units.isZero()) {
        unitPrice = revenue._sum.amount.div(units).toDecimalPlaces(2);
        priceSource = "stock_count";
      }
    } else if (orig?.orderId) {
      const line = await db.orderLine.findFirst({
        where: { orderId: orig.orderId, productId: orig.productId },
        select: { unitPrice: true },
      });
      if (line) {
        unitPrice = line.unitPrice;
        priceSource = "order_line";
      }
    }
    if (!unitPrice) {
      const pl = await db.productLocation.findUnique({
        where: {
          productId_locationId: { productId: row.productId, locationId: row.locationId },
        },
        select: { sellingPrice: true },
      });
      if (pl?.sellingPrice != null) {
        unitPrice = pl.sellingPrice;
        priceSource = "current_price";
      }
    }

    plan.push({
      stockMovementId: row.id,
      businessDate: nairobiDate(row.occurredAt),
      locationName: row.location.name,
      productName: row.product.name,
      quantity: row.quantity.toFixed(4),
      unitPrice: unitPrice ? unitPrice.toFixed(2) : null,
      priceSource,
      revenue: unitPrice
        ? row.quantity.negated().mul(unitPrice).toDecimalPlaces(2).toFixed(2)
        : null,
      occurredAt: row.occurredAt,
      recordedById: row.recordedById,
    });
  }
  return plan;
}

/** Write the planned money rows (skips unpriced ones). Returns how many were written. */
export async function applyLegacySoldRepair(db: Db, plan: RepairPlanRow[]): Promise<number> {
  let written = 0;
  for (const p of plan) {
    if (p.revenue == null) continue;
    await db.$transaction(async (tx) => {
      // Re-check inside the transaction so a concurrent run can't double-write.
      const exists = await tx.moneyMovement.findFirst({
        where: { sourceType: "sale_adjustment", stockMovementId: p.stockMovementId },
        select: { id: true },
      });
      if (exists) return;
      const money = await tx.moneyMovement.create({
        data: {
          account: "cash",
          amount: new Prisma.Decimal(p.revenue as string),
          sourceType: "sale_adjustment",
          sourceId: p.stockMovementId,
          stockMovementId: p.stockMovementId,
          recordedById: p.recordedById,
          occurredAt: p.occurredAt,
          note: NOTE,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: p.recordedById,
          action: "create",
          entityType: "money_movement",
          entityId: money.id,
          newValue: {
            account: "cash",
            amount: money.amount.toFixed(2),
            sourceType: "sale_adjustment",
            sourceId: p.stockMovementId,
            repair: "ADR-92",
          },
          occurredAt: p.occurredAt,
        },
      });
      written += 1;
    });
  }
  return written;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const db = new PrismaClient({ adapter });
  try {
    const plan = await planLegacySoldRepair(db);
    console.log(apply ? "APPLY — writing revenue rows\n" : "DRY RUN — nothing will be written\n");
    const byLocation = new Map<string, Prisma.Decimal>();
    for (const p of plan) {
      console.log(
        [
          p.businessDate,
          p.locationName.padEnd(12),
          p.productName.padEnd(22),
          `qty ${p.quantity.padStart(10)}`,
          `@ ${(p.unitPrice ?? "—").padStart(8)} (${p.priceSource})`,
          `revenue ${(p.revenue ?? "UNPRICED — skipped").padStart(10)}`,
          p.stockMovementId,
        ].join("  "),
      );
      if (p.revenue != null) {
        byLocation.set(
          p.locationName,
          (byLocation.get(p.locationName) ?? new Prisma.Decimal(0)).add(p.revenue),
        );
      }
    }
    console.log(`\n${plan.length} row(s) need repair.`);
    for (const [loc, total] of byLocation) console.log(`  ${loc}: ${total.toFixed(2)}`);

    if (apply) {
      const written = await applyLegacySoldRepair(db, plan);
      console.log(`\nWrote ${written} sale_adjustment money row(s).`);
    } else {
      console.log("\nRe-run with --apply to write these rows.");
    }
  } finally {
    await db.$disconnect();
  }
}

// Only run when invoked directly, not when imported by a test.
if (process.argv[1] && process.argv[1].endsWith("repair-legacy-sold-corrections.ts")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
