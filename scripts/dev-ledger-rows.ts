import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { businessDateStartUtc, nairobiToday } from "../lib/time";

/**
 * DEV-ONLY throwaway data for eyeballing the /admin/stock ledger's sticky
 * header (client feedback 2026-09-09). Adds many products, each with a
 * ProductLocation and a few movements dated to TODAY (Nairobi), so the
 * single-day ledger renders a long, scrollable list of rows.
 *
 *   pnpm tsx scripts/dev-ledger-rows.ts          # add ~70 rows
 *   pnpm tsx scripts/dev-ledger-rows.ts --clean  # remove them again
 *
 * Everything is namespaced with the LEDGERTEST prefix so --clean only ever
 * touches its own rows. Runs against whatever DATABASE_URL points at — do
 * NOT run against production.
 */

const PREFIX = "LEDGERTEST";
const COUNT_STORE = 50; // ingredients at the Store
const COUNT_REST = 20; // goods at the Restaurant

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const pid = (name: string) => `seed-product-${slug(name)}`;

async function clean() {
  const products = await prisma.product.findMany({
    where: { name: { startsWith: PREFIX } },
    select: { id: true },
  });
  const ids = products.map((p) => p.id);
  if (ids.length === 0) {
    console.log("Nothing to clean — no LEDGERTEST products found.");
    return;
  }
  await prisma.stockMovement.deleteMany({ where: { productId: { in: ids } } });
  await prisma.productLocation.deleteMany({ where: { productId: { in: ids } } });
  await prisma.product.deleteMany({ where: { id: { in: ids } } });
  console.log(`Removed ${ids.length} LEDGERTEST products and their movements.`);
}

async function seed() {
  const [store, restaurant] = await Promise.all([
    prisma.location.findUniqueOrThrow({ where: { id: "seed-location-store" } }),
    prisma.location.findUniqueOrThrow({
      where: { id: "seed-location-restaurant" },
    }),
  ]);
  const admin = await prisma.user.findFirstOrThrow({ where: { role: "admin" } });

  const today = nairobiToday();
  const dayStart = businessDateStartUtc(today);
  // A few hours into the day for the non-opening movements.
  const midday = new Date(dayStart.getTime() + 6 * 60 * 60 * 1000);

  const specs = [
    ...Array.from({ length: COUNT_STORE }, (_, i) => ({
      name: `${PREFIX} Ingredient ${String(i + 1).padStart(2, "0")}`,
      kind: "ingredient" as const,
      unitLabel: "kg",
      buyingPrice: String(50 + i * 5),
      locationId: store.id,
    })),
    ...Array.from({ length: COUNT_REST }, (_, i) => ({
      name: `${PREFIX} Goods ${String(i + 1).padStart(2, "0")}`,
      kind: "goods" as const,
      unitLabel: "pcs",
      buyingPrice: String(20 + i * 3),
      locationId: restaurant.id,
    })),
  ];

  let made = 0;
  for (const s of specs) {
    if (await prisma.product.findUnique({ where: { id: pid(s.name) } })) continue;

    await prisma.product.create({
      data: {
        id: pid(s.name),
        name: s.name,
        kind: s.kind,
        unitLabel: s.unitLabel,
        buyingPrice: s.buyingPrice,
        deletedAt: null,
      },
    });
    await prisma.productLocation.create({
      data: {
        id: `seed-pl-${slug(s.name)}`,
        productId: pid(s.name),
        locationId: s.locationId,
        sellingPrice: s.kind === "goods" ? String(Number(s.buyingPrice) * 1.5) : null,
        active: true,
      },
    });

    const opening = 40 + (made % 7) * 10;
    const received = 10 + (made % 5) * 4;
    const issued = 3 + (made % 4) * 2;

    await prisma.stockMovement.createMany({
      data: [
        {
          productId: pid(s.name),
          locationId: s.locationId,
          movementType: "opening",
          quantity: opening,
          recordedById: admin.id,
          occurredAt: dayStart,
        },
        {
          productId: pid(s.name),
          locationId: s.locationId,
          movementType: "purchase_receipt",
          quantity: received,
          recordedById: admin.id,
          occurredAt: midday,
        },
        {
          productId: pid(s.name),
          locationId: s.locationId,
          // Store ingredients leave via `issue`; Restaurant goods via `non_sale_consumption`
          movementType: s.kind === "ingredient" ? "issue" : "non_sale_consumption",
          quantity: -issued,
          recordedById: admin.id,
          occurredAt: midday,
          ...(s.kind === "goods" ? { reason: "complimentary" as const } : {}),
        },
      ],
    });
    made += 1;
  }

  console.log(
    `Added ${made} LEDGERTEST products (${COUNT_STORE} Store ingredients + ${COUNT_REST} Restaurant goods),\n` +
      `each with opening + purchase_receipt + issue/non-sale movements dated ${today}.\n` +
      `Open /admin/stock (range: Today) as Admin to see a long, scrollable ledger.\n` +
      `Re-run with --clean to remove them.`,
  );
}

async function main() {
  const mode = process.argv.includes("--clean") ? "clean" : "seed";
  if (mode === "clean") await clean();
  else await seed();
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
