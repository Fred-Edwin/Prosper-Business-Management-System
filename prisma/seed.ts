import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

// TEST_WORKER_SCHEMA is set only by scripts/setup-test-db.mjs, once per
// pool schema it seeds — see lib/db/index.ts for why a connection
// string's `?schema=` param can't carry this instead (it's inert against
// `@prisma/adapter-pg`; the adapter's second constructor arg is the only
// thing that actually routes generated queries to a non-public schema).
// Unset (dev seed, `pnpm prisma:seed`) behaves exactly as before.
const testWorkerSchema = process.env.TEST_WORKER_SCHEMA;
const adapter = new PrismaPg(
  { connectionString: process.env.DATABASE_URL },
  testWorkerSchema ? { schema: testWorkerSchema } : undefined,
);
const prisma = new PrismaClient({ adapter });

// ═══════════════════════════════════════════════════════════════════════
// Prosper dev seed — QA BASELINE (v3, owner-approved 2026-09-04, Session 16).
//
// This seed deliberately leaves the database exactly as a REAL ADMIN faces
// it on day one of using Prosper:
//
//   • the five logins exist                    (§2)
//   • a small catalogue exists                 (§3 — 8 products)
//   • NOTHING else. Zero stock movements, zero orders, zero canteen
//     counts, zero handovers, zero expenses, zero owner transactions,
//     zero customers, zero assets, zero day-closes.
//
// Cash at hand and M-Pesa/Bank both start at 0. The first act of the QA
// walkthrough (as Admin) is to seed opening stock THROUGH THE UI, exactly
// as the handover Admin will — and every shilling and every stock unit
// that ends up on the books after that came from a scripted, predicted
// action.
//
// Shape of this file:
//   §0 helpers            — Nairobi wall-clock dating, id builders
//   §1 wipe               — FK-safe delete of everything except AuditLog
//   §2 locations, users   — Admin + 4 staff logins
//   §3 catalogue          — 8 products, rounded buying prices
//
// The pre-Session-16 seed (18 products + 7 days of ledger history + ~19
// orders + handovers + financials) is in git history if a
// screen-population seed is ever needed again.
// ═══════════════════════════════════════════════════════════════════════

// ── §0 helpers ─────────────────────────────────────────────────────────

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const pid = (name: string) => `seed-product-${slug(name)}`;

// ═══════════════════════════════════════════════════════════════════════
// §1 WIPE
// ═══════════════════════════════════════════════════════════════════════

/**
 * Delete every row this seed owns, children before parents.
 *
 * AuditLog is deliberately spared: it is real history from owner
 * walkthroughs, it references no row we delete by FK, and nothing
 * regenerates it. `User` / `Staff` / `Location` are also spared —
 * `AuditLog.userId` is a RESTRICT foreign key onto `user`, so deleting a
 * user would either take the audit history with it or be refused. §2
 * instead reuses those rows (matched by their stable ids / unique names)
 * and re-asserts their fields.
 */
async function wipe() {
  await prisma.$transaction([
    prisma.orderLine.deleteMany(),
    prisma.moneyMovement.deleteMany(),
    prisma.repayment.deleteMany(),
    prisma.debt.deleteMany(),
    prisma.stockMovement.deleteMany(),
    prisma.stockCount.deleteMany(),
    prisma.order.deleteMany(),
    prisma.handoverShortfall.deleteMany(),
    prisma.receiptOfHandover.deleteMany(),
    prisma.handover.deleteMany(),
    prisma.recipeIngredient.deleteMany(),
    prisma.recipe.deleteMany(),
    prisma.productLocation.deleteMany(),
    prisma.product.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.staffPayout.deleteMany(),
    prisma.expense.deleteMany(),
    prisma.ownerTransaction.deleteMany(),
    prisma.attendance.deleteMany(),
    prisma.staffPayAdjustment.deleteMany(),
    prisma.dayClose.deleteMany(),
    prisma.asset.deleteMany(),
  ]);
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════

async function main() {
  await wipe();

  // ── §2 Locations, Admin, staff ───────────────────────────────────────
  // Upserted, not created — see the note in `wipe()`. `update` re-asserts
  // `name` and `active: true` so a row an earlier test flipped inactive
  // is healed on every run.
  const [restaurant, canteen, store] = await Promise.all([
    prisma.location.upsert({
      where: { id: "seed-location-restaurant" },
      update: { name: "Restaurant", type: "restaurant", active: true },
      create: { id: "seed-location-restaurant", name: "Restaurant", type: "restaurant" },
    }),
    prisma.location.upsert({
      where: { id: "seed-location-canteen" },
      update: { name: "Canteen", type: "canteen", active: true },
      create: { id: "seed-location-canteen", name: "Canteen", type: "canteen" },
    }),
    prisma.location.upsert({
      where: { id: "seed-location-store" },
      update: { name: "Store", type: "store", active: true },
      create: { id: "seed-location-store", name: "Store", type: "store" },
    }),
  ]);

  const pinHash = await bcrypt.hash("1234", 10);

  const admin = await prisma.user.upsert({
    where: { name: "Admin" },
    update: { pinHash, role: "admin", active: true },
    create: { name: "Admin", pinHash, role: "admin", active: true },
  });

  const staffSeeds = [
    { key: "store-manager", role: "store_manager" as const, name: "Store Manager", locationId: store.id, dailyRate: "700.00" },
    { key: "cashier", role: "cashier" as const, name: "Cashier", locationId: restaurant.id, dailyRate: "550.00" },
    { key: "cashier-2", role: "cashier" as const, name: "Cashier Two", locationId: restaurant.id, dailyRate: "550.00" },
    { key: "canteen-attendant", role: "canteen_attendant" as const, name: "Canteen Attendant", locationId: canteen.id, dailyRate: "600.00" },
  ];

  for (const s of staffSeeds) {
    const staffFields = {
      name: s.name,
      role: s.role,
      locationId: s.locationId,
      dailyRate: s.dailyRate,
      active: true,
    };
    const staff = await prisma.staff.upsert({
      where: { id: `seed-staff-${s.key}` },
      update: staffFields,
      create: { id: `seed-staff-${s.key}`, ...staffFields },
    });
    await prisma.user.upsert({
      where: { name: s.name },
      update: { pinHash, role: s.role, staffId: staff.id, active: true },
      create: { name: s.name, pinHash, role: s.role, staffId: staff.id, active: true },
    });
  }

  // Any other login left over from an earlier seed or a manual test is
  // deactivated rather than deleted (AuditLog RESTRICT), so the PIN
  // screen only offers the five accounts above.
  await prisma.user.updateMany({
    where: { name: { notIn: ["Admin", ...staffSeeds.map((s) => s.name)] } },
    data: { active: false },
  });

  // Staff rows carry no AuditLog FK, so orphans from earlier seeds CAN be
  // deleted — and must be, or they surface as phantom staff.
  await prisma.staff.deleteMany({
    where: { id: { notIn: staffSeeds.map((s) => `seed-staff-${s.key}`) } },
  });

  // ── §3 Catalogue ─────────────────────────────────────────────────────
  //
  //   ingredient — raw inputs. Stocked at the Store ONLY, never sold, so
  //                every ProductLocation row has `sellingPrice: null`.
  //   dish       — produced at the Restaurant kitchen and sold there. The
  //                ONLY kind a `production` movement may name. buyingPrice
  //                is always 0 (ADR-33) — its true cost is captured at the
  //                ingredient level.
  //   goods      — bought-in finished items. They reach the Restaurant or
  //                Canteen by `purchase_receipt` or `transfer`, never by
  //                production. Priced per location (Soda + Water sell at
  //                both).
  //
  // Buying prices are ROUNDED (owner decision, Session 16) so every COGS
  // line in the QA walkthrough is a clean multiple.

  type Priced = { locationId: string; sellingPrice: string | null };

  type ProductSeed = {
    name: string;
    kind: "ingredient" | "dish" | "goods";
    unitLabel: string;
    buyingPrice: string | null;
    category?: string | null;
    at: Priced[];
  };

  const catalogue: ProductSeed[] = [
    // ingredients — Store only, never priced
    { name: "Rice", kind: "ingredient", unitLabel: "kg", buyingPrice: "150.00", at: [{ locationId: store.id, sellingPrice: null }] },
    { name: "Cooking oil", kind: "ingredient", unitLabel: "litre", buyingPrice: "250.00", at: [{ locationId: store.id, sellingPrice: null }] },
    { name: "Chicken Breast", kind: "ingredient", unitLabel: "kg", buyingPrice: "500.00", at: [{ locationId: store.id, sellingPrice: null }] },

    // dishes — produced and sold at the Restaurant
    { name: "Chapati", kind: "dish", unitLabel: "pcs", buyingPrice: "0", category: "Sides", at: [{ locationId: restaurant.id, sellingPrice: "20.00" }] },
    { name: "Chicken Stew", kind: "dish", unitLabel: "plate", buyingPrice: "0", category: "Mains", at: [{ locationId: restaurant.id, sellingPrice: "200.00" }] },

    // goods — bought in; Soda + Water sell at the Restaurant AND the Canteen
    {
      name: "Soda 300ml", kind: "goods", unitLabel: "pcs", buyingPrice: "45.00", category: "Drinks",
      at: [{ locationId: restaurant.id, sellingPrice: "60.00" }, { locationId: canteen.id, sellingPrice: "60.00" }],
    },
    {
      name: "Water 500ml", kind: "goods", unitLabel: "pcs", buyingPrice: "35.00", category: "Drinks",
      at: [{ locationId: restaurant.id, sellingPrice: "50.00" }, { locationId: canteen.id, sellingPrice: "50.00" }],
    },
    { name: "Mandazi", kind: "goods", unitLabel: "pcs", buyingPrice: "12.00", category: "Bakery", at: [{ locationId: canteen.id, sellingPrice: "20.00" }] },
  ];

  for (const p of catalogue) {
    await prisma.product.create({
      data: {
        id: pid(p.name),
        name: p.name,
        kind: p.kind,
        unitLabel: p.unitLabel,
        buyingPrice: p.buyingPrice,
        category: p.category ?? null,
        deletedAt: null,
      },
    });
    for (const loc of p.at) {
      await prisma.productLocation.create({
        data: {
          id: `seed-pl-${slug(p.name)}-${loc.locationId.replace("seed-location-", "")}`,
          productId: pid(p.name),
          locationId: loc.locationId,
          sellingPrice: loc.sellingPrice,
          active: true,
        },
      });
    }
  }

  console.log("Seed complete — QA baseline (logins + 8 products, no ledger data).");
  console.log('Admin:  "Admin" / PIN 1234');
  for (const s of staffSeeds) console.log(`${s.role}: "${s.name}" / PIN 1234`);
  console.log("Cash at hand: 0.00 · M-Pesa/Bank: 0.00 · no stock, no orders, no history.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
