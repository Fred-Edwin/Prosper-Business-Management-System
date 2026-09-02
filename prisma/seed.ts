import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// ═══════════════════════════════════════════════════════════════════════
// Prosper dev seed — WIPE + REBUILD (owner-approved 2026-09-02).
//
// Shape of this file:
//   §0 helpers            — Nairobi wall-clock dating, id builders
//   §1 wipe               — FK-safe delete of everything except AuditLog
//   §2 locations, users   — Admin + 4 staff logins
//   §3 catalogue          — CORRECTED product kinds (audit F10)
//   §4 stock ledger       — 7 days, every ledger column exercised
//   §5 restaurant sales   — ~18 orders, all methods/types, one corrected
//   §6 canteen counts     — 6 counts, each with its derived sale (audit F5)
//   §7 customers & assets
//   §8 handovers + financials — today's handovers, expenses, owner draws
//
// Principles the audit (docs/sprints/m2-quantity-audit.md) demands:
//   • Only seed what a built screen can display. Recipe, Attendance,
//     StaffPayAdjustment and DayClose have no UI (or no API route) —
//     seeding them creates invisible data. EXCLUDED on purpose (M4 owns
//     Recipe/Attendance/StaffPayAdjustment). Handover, ReceiptOfHandover,
//     HandoverShortfall, Expense and OwnerTransaction now have screens
//     (M3 S3/S4) and ARE seeded — §8.
//   • Ledgers, not stored totals. Every balance below is the sum of the
//     rows this file writes; nothing stores a total (ADR-11 / ADR-40).
//   • Corrections are new rows. The corrected order and the corrected
//     stock movement below both use the correction-entry pattern.
//   • Dates are relative to the run, recomputed every time — the seed
//     never goes stale.
//   • Idempotent: fixed `seed-*` ids, and the wipe means a re-run
//     reproduces byte-identical data (modulo the date shift).
// ═══════════════════════════════════════════════════════════════════════

// ── §0 helpers ─────────────────────────────────────────────────────────

// Africa/Nairobi is UTC+3, no DST. `hh` is a Nairobi wall-clock hour, so
// `at(2, 8, 0)` is 08:00 Nairobi two business days ago (ADR-29).
const SEED_NOW = new Date();
const at = (daysAgo: number, hh: number, mm: number) => {
  const d = new Date(SEED_NOW);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  d.setUTCHours(hh - 3, mm, 0, 0);
  return d;
};

/** Nairobi calendar date (YYYY-MM-DD) of a `daysAgo` offset — for Asset.purchaseDate. */
const dateOnly = (daysAgo: number) => {
  const d = at(daysAgo, 12, 0);
  return new Date(d.toISOString().slice(0, 10));
};

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const pid = (name: string) => `seed-product-${slug(name)}`;

// ═══════════════════════════════════════════════════════════════════════
// §1 WIPE
// ═══════════════════════════════════════════════════════════════════════

/**
 * Delete every row this seed owns, children before parents.
 *
 * AuditLog is deliberately spared: it is 80+ rows of real history from
 * owner walkthroughs, it references no row we delete by FK, and nothing
 * regenerates it. Everything else goes — the owner accepted losing the
 * hand-made Products (Matoke, Chicken Breast, Rice, Glucose), Customers,
 * Assets and the one hand-made Order, on the condition that this seed
 * re-creates the products they actually use (it does — §3).
 */
async function wipe() {
  // Self-referencing FKs (corrects_* ) are nullable, so a plain deleteMany
  // per table works as long as the *cross-table* order is children-first.
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
    prisma.expense.deleteMany(),
    prisma.ownerTransaction.deleteMany(),
    prisma.attendance.deleteMany(),
    prisma.staffPayAdjustment.deleteMany(),
    prisma.dayClose.deleteMany(),
    prisma.asset.deleteMany(),
  ]);

  // User / Staff / Location are NOT deleted. `AuditLog.userId` is a
  // RESTRICT foreign key onto `user`, and the audit log is 80+ rows of
  // real walkthrough history that nothing regenerates — deleting users
  // would either take that history with it or be refused outright. So
  // §2 instead *reuses* the existing rows (matched by the unique `name`)
  // and re-asserts their fields, which keeps every audit entry correctly
  // attributed. Locations are reused for the same reason: their ids are
  // already the fixed `seed-location-*` strings.
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════

async function main() {
  await wipe();

  // ── §2 Locations, Admin, staff ───────────────────────────────────────
  // Upserted, not created — see the note at the end of `wipe()`. `update`
  // re-asserts `name` and `active: true` so a row an earlier test flipped
  // inactive (or one an early seed created with the id string as its
  // name) is healed on every run.
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

  const users: Record<string, string> = { admin: admin.id };
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
    const user = await prisma.user.upsert({
      where: { name: s.name },
      update: { pinHash, role: s.role, staffId: staff.id, active: true },
      create: { name: s.name, pinHash, role: s.role, staffId: staff.id, active: true },
    });
    users[s.key] = user.id;
  }

  // Any other login left over from an earlier seed or a manual test is
  // deactivated rather than deleted (AuditLog RESTRICT again), so the PIN
  // screen only offers the five accounts above.
  await prisma.user.updateMany({
    where: { name: { notIn: ["Admin", ...staffSeeds.map((s) => s.name)] } },
    data: { active: false },
  });

  // Staff rows carry no AuditLog FK, so orphans CAN be deleted — and must
  // be. An earlier seed keyed them `seed-staff-store_manager` (underscore)
  // where this one uses `seed-staff-store-manager` (hyphen), which left
  // duplicate-named Staff rows with no User attached showing up as phantom
  // staff. Delete every Staff row this seed does not own.
  await prisma.staff.deleteMany({
    where: { id: { notIn: staffSeeds.map((s) => `seed-staff-${s.key}`) } },
  });

  const storeManagerId = users["store-manager"];
  const cashier1 = users["cashier"];
  const cashier2 = users["cashier-2"];
  const attendantId = users["canteen-attendant"];

  // ── §3 Catalogue ─────────────────────────────────────────────────────
  //
  // Audit F10: the old seed typed sodas, water, mandazi and groundnuts as
  // `kind: "dish"`, so Record Batch Production offered "Soda 300ml" as a
  // thing to cook. Corrected classification, and the rules that go with it:
  //
  //   ingredient — raw inputs. Stocked at the Store ONLY, never sold, so
  //                every ProductLocation row has `sellingPrice: null`.
  //   dish       — produced at the Restaurant kitchen and sold there. The
  //                ONLY kind a `production` movement may name.
  //   goods      — bought-in finished items. They reach the Restaurant or
  //                Canteen by `purchase_receipt` or `transfer`, never by
  //                production. Priced per location (Soda sells at both).
  //
  // Deliberate edge cases, so the owner can see each state on a screen:
  //   • Bar Soap        — archived (soft-deleted) product
  //   • Groundnuts 50g  — stocked, then sold down to exactly zero
  //   • Glucose         — never stocked at all (no movement rows)

  type Priced = { locationId: string; sellingPrice: string | null };

  type ProductSeed = {
    name: string;
    kind: "ingredient" | "dish" | "goods";
    unitLabel: string;
    buyingPrice: string | null;
    category?: string | null;
    at: Priced[];
    archived?: boolean;
  };

  const catalogue: ProductSeed[] = [
    // ingredients — Store only, never priced
    { name: "Cooking oil", kind: "ingredient", unitLabel: "litre", buyingPrice: "253.33", at: [{ locationId: store.id, sellingPrice: null }] },
    { name: "Carrots", kind: "ingredient", unitLabel: "kg", buyingPrice: "50.00", at: [{ locationId: store.id, sellingPrice: null }] },
    { name: "Beans", kind: "ingredient", unitLabel: "cups", buyingPrice: "60.00", at: [{ locationId: store.id, sellingPrice: null }] },
    { name: "Rice", kind: "ingredient", unitLabel: "kg", buyingPrice: "150.00", at: [{ locationId: store.id, sellingPrice: null }] },
    { name: "Chicken Breast", kind: "ingredient", unitLabel: "kg", buyingPrice: "520.00", at: [{ locationId: store.id, sellingPrice: null }] },
    { name: "Wheat flour", kind: "ingredient", unitLabel: "kg", buyingPrice: "95.00", at: [{ locationId: store.id, sellingPrice: null }] },

    // dishes — produced and sold at the Restaurant
    { name: "Chapati", kind: "dish", unitLabel: "pcs", buyingPrice: "0", category: "Sides", at: [{ locationId: restaurant.id, sellingPrice: "20.00" }] },
    { name: "Chicken Stew", kind: "dish", unitLabel: "plate", buyingPrice: "0", category: "Mains", at: [{ locationId: restaurant.id, sellingPrice: "200.00" }] },
    { name: "Chips Full", kind: "dish", unitLabel: "plate", buyingPrice: "0", category: "Mains", at: [{ locationId: restaurant.id, sellingPrice: "100.00" }] },
    { name: "Samosa", kind: "dish", unitLabel: "pcs", buyingPrice: "0", category: "Snacks", at: [{ locationId: restaurant.id, sellingPrice: "30.00" }] },
    { name: "Matoke", kind: "dish", unitLabel: "plate", buyingPrice: "0", category: "Mains", at: [{ locationId: restaurant.id, sellingPrice: "120.00" }] },
    // Uncategorised on purpose — exercises the C2 "Uncategorised" tab.
    { name: "Rice & Beans", kind: "dish", unitLabel: "plate", buyingPrice: "0", category: null, at: [{ locationId: restaurant.id, sellingPrice: "150.00" }] },

    // goods — bought in; sold at the Restaurant AND the Canteen
    {
      name: "Soda 300ml", kind: "goods", unitLabel: "pcs", buyingPrice: "45.00", category: "Drinks",
      at: [{ locationId: restaurant.id, sellingPrice: "60.00" }, { locationId: canteen.id, sellingPrice: "60.00" }],
    },
    {
      name: "Water 500ml", kind: "goods", unitLabel: "pcs", buyingPrice: "35.00", category: "Drinks",
      at: [{ locationId: restaurant.id, sellingPrice: "50.00" }, { locationId: canteen.id, sellingPrice: "50.00" }],
    },
    { name: "Mandazi", kind: "goods", unitLabel: "pcs", buyingPrice: "12.00", category: "Bakery", at: [{ locationId: canteen.id, sellingPrice: "20.00" }] },
    { name: "Groundnuts 50g", kind: "goods", unitLabel: "pcs", buyingPrice: "18.00", category: "Snacks", at: [{ locationId: canteen.id, sellingPrice: "30.00" }] },
    // Edge case: never stocked — no movement rows anywhere.
    { name: "Glucose", kind: "goods", unitLabel: "pcs", buyingPrice: "40.00", category: "Snacks", at: [{ locationId: canteen.id, sellingPrice: "60.00" }] },
    // Edge case: archived. Its ProductLocation rows stay, its history stays.
    { name: "Bar Soap", kind: "goods", unitLabel: "bar", buyingPrice: "140.00", category: null, at: [{ locationId: canteen.id, sellingPrice: "170.00" }], archived: true },
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
        deletedAt: p.archived ? at(2, 9, 0) : null,
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

  // ── §4 Stock ledger — 7 days ─────────────────────────────────────────
  //
  // Every column the Admin ledger renders (COLUMN_FOR_TYPE in
  // app/admin/stock/derive-ledger.ts) is non-empty on at least one day:
  // purchases, issues, production, transferIn, transferOut, sold. There
  // is at least one resting product per day (a product with an opening
  // balance and no movement — exercises the resting-rows fix), and one
  // product ends the week negative.

  let smSeq = 0;
  type MoveInput = {
    id?: string;
    product: string;
    locationId: string;
    type:
      | "opening" | "purchase_payment" | "purchase_receipt" | "issue"
      | "production" | "transfer" | "sale" | "non_sale_consumption"
      | "stock_count" | "closing";
    qty: string;
    by: string;
    at: Date;
    reason?: "staff_meal" | "complimentary" | "spoiled" | "damaged" | "other";
    reasonNote?: string;
    note?: string;
    counterpartLocationId?: string;
    correctsMovementId?: string;
    purchasePaymentId?: string;
    purchase?: { supplier: string; orderedQty: string; totalCost: string; paidFrom: "cash" | "mpesa_bank" };
  };

  async function move(m: MoveInput) {
    const id = m.id ?? `seed-sm-${String(++smSeq).padStart(3, "0")}`;
    const row = await prisma.stockMovement.create({
      data: {
        id,
        productId: pid(m.product),
        locationId: m.locationId,
        movementType: m.type,
        quantity: m.qty,
        recordedById: m.by,
        occurredAt: m.at,
        reason: m.reason ?? null,
        reasonNote: m.reasonNote ?? null,
        note: m.note ?? null,
        transferCounterpartLocationId: m.counterpartLocationId ?? null,
        correctsMovementId: m.correctsMovementId ?? null,
        purchasePaymentId: m.purchasePaymentId ?? null,
        purchaseSupplier: m.purchase?.supplier ?? null,
        purchaseOrderedQty: m.purchase?.orderedQty ?? null,
        purchaseTotalCost: m.purchase?.totalCost ?? null,
        purchasePaidFrom: m.purchase?.paidFrom ?? null,
      },
    });
    return row.id;
  }

  // ── Day −7 · opening balances at all three locations ────────────────
  const openings: Array<[string, string, string]> = [
    // [product, locationId, quantity]
    ["Cooking oil", store.id, "40"],
    ["Carrots", store.id, "25"],
    ["Beans", store.id, "30"],
    ["Rice", store.id, "80"],
    ["Chicken Breast", store.id, "12"],
    ["Wheat flour", store.id, "50"],
    ["Chapati", restaurant.id, "60"],
    ["Chicken Stew", restaurant.id, "20"],
    ["Chips Full", restaurant.id, "25"],
    ["Samosa", restaurant.id, "40"],
    ["Matoke", restaurant.id, "15"],
    ["Rice & Beans", restaurant.id, "18"],
    ["Soda 300ml", restaurant.id, "72"],
    ["Water 500ml", restaurant.id, "48"],
    ["Soda 300ml", canteen.id, "144"],
    ["Water 500ml", canteen.id, "96"],
    ["Mandazi", canteen.id, "60"],
    ["Groundnuts 50g", canteen.id, "30"],
    ["Bar Soap", canteen.id, "12"],
  ];
  for (const [product, locationId, qty] of openings) {
    await move({
      id: `seed-sm-open-${slug(product)}-${locationId.replace("seed-location-", "")}`,
      product,
      locationId,
      type: "opening",
      qty,
      by: admin.id,
      at: at(7, 8, 0),
    });
  }

  // ── Day −6 · purchase payment → receipt (Store); production (Restaurant)
  const oilPayment = await move({
    product: "Cooking oil",
    locationId: store.id,
    type: "purchase_payment",
    qty: "0", // money-only marker, no stock effect (ADR-39)
    by: admin.id,
    at: at(6, 9, 15),
    note: "Paid Bidii Suppliers for 20 litre Cooking oil — KES 5,066.60 from M-Pesa",
    purchase: { supplier: "Bidii Suppliers", orderedQty: "20", totalCost: "5066.60", paidFrom: "mpesa_bank" },
  });
  await prisma.moneyMovement.create({
    data: {
      id: "seed-mm-purchase-oil",
      account: "mpesa_bank",
      amount: "5066.60",
      sourceType: "purchase_payment",
      sourceId: oilPayment,
      stockMovementId: oilPayment,
      recordedById: admin.id,
      occurredAt: at(6, 9, 15),
    },
  });
  // The receipt links back to the payment it settles (ADR-46 §3).
  await move({ product: "Cooking oil", locationId: store.id, type: "purchase_receipt", qty: "20", by: storeManagerId, at: at(6, 11, 0), purchasePaymentId: oilPayment });
  await move({ product: "Wheat flour", locationId: store.id, type: "purchase_receipt", qty: "25", by: storeManagerId, at: at(6, 11, 10) });
  // Production at the Restaurant — dishes only.
  await move({ product: "Chapati", locationId: restaurant.id, type: "production", qty: "80", by: storeManagerId, at: at(6, 7, 30) });
  await move({ product: "Chicken Stew", locationId: restaurant.id, type: "production", qty: "30", by: storeManagerId, at: at(6, 7, 45) });

  // ── Day −5 · issue Store→Kitchen; production; canteen count ─────────
  await move({ product: "Cooking oil", locationId: store.id, type: "issue", qty: "-3", by: storeManagerId, at: at(5, 7, 0), note: "Issued to kitchen" });
  await move({ product: "Wheat flour", locationId: store.id, type: "issue", qty: "-8", by: storeManagerId, at: at(5, 7, 5), note: "Issued to kitchen" });
  await move({ product: "Chicken Breast", locationId: store.id, type: "issue", qty: "-4", by: storeManagerId, at: at(5, 7, 10), note: "Issued to kitchen" });
  await move({ product: "Chips Full", locationId: restaurant.id, type: "production", qty: "40", by: storeManagerId, at: at(5, 8, 0) });
  await move({ product: "Samosa", locationId: restaurant.id, type: "production", qty: "50", by: storeManagerId, at: at(5, 8, 15) });

  // ── Day −4 · transfer Store→Canteen, accepted same day; more production
  // Goods reach the Canteen by transfer, never production. Two phases
  // (lib/domain/stock/transfer.ts): a `-q` dispatch at the source, then a
  // `+q` accept at the destination carrying `correctsMovementId`.
  const sodaDispatch = await move({
    product: "Soda 300ml",
    locationId: restaurant.id,
    type: "transfer",
    qty: "-24",
    by: storeManagerId,
    at: at(4, 9, 0),
    counterpartLocationId: canteen.id,
    note: "Transfer dispatched — awaiting receipt",
  });
  await move({
    product: "Soda 300ml",
    locationId: canteen.id,
    type: "transfer",
    qty: "24",
    by: attendantId,
    at: at(4, 10, 30),
    counterpartLocationId: restaurant.id,
    correctsMovementId: sodaDispatch,
    note: "Transfer received",
  });
  await move({ product: "Chapati", locationId: restaurant.id, type: "production", qty: "60", by: storeManagerId, at: at(4, 7, 30) });
  await move({ product: "Matoke", locationId: restaurant.id, type: "production", qty: "25", by: storeManagerId, at: at(4, 7, 40) });

  // ── Day −3 · non-sale consumption (spoiled + staff meal); production ──
  await move({
    product: "Carrots", locationId: store.id, type: "non_sale_consumption", qty: "-2",
    by: storeManagerId, at: at(3, 16, 0), reason: "spoiled", reasonNote: "Went soft in the crate",
  });
  await move({
    product: "Chicken Stew", locationId: restaurant.id, type: "non_sale_consumption", qty: "-3",
    by: storeManagerId, at: at(3, 14, 30), reason: "staff_meal", reasonNote: "Lunch for the kitchen team",
  });
  await move({ product: "Rice & Beans", locationId: restaurant.id, type: "production", qty: "35", by: storeManagerId, at: at(3, 8, 0) });
  await move({ product: "Chicken Stew", locationId: restaurant.id, type: "production", qty: "25", by: storeManagerId, at: at(3, 8, 10) });

  // ── Day −2 · a transfer left PENDING (K/SM incoming banner) ──────────
  await move({
    id: "seed-sm-transfer-pending-water",
    product: "Water 500ml",
    locationId: restaurant.id,
    type: "transfer",
    qty: "-12",
    by: storeManagerId,
    at: at(2, 15, 0),
    counterpartLocationId: canteen.id,
    note: "Transfer dispatched — awaiting receipt",
  });
  await move({ product: "Chapati", locationId: restaurant.id, type: "production", qty: "70", by: storeManagerId, at: at(2, 7, 30) });
  await move({ product: "Samosa", locationId: restaurant.id, type: "production", qty: "40", by: storeManagerId, at: at(2, 8, 0) });
  // Restaurant receives bought-in goods directly (goods are never produced).
  await move({ product: "Soda 300ml", locationId: restaurant.id, type: "purchase_receipt", qty: "48", by: storeManagerId, at: at(2, 10, 0) });

  // ── Day −1 · a CORRECTED movement (correction-entry pattern) ─────────
  // Original: 6 kg Carrots received. It was really 9 — the correction is a
  // new `+3` delta row pointing at the original (ADR-39), never an edit.
  const carrotReceipt = await move({
    id: "seed-sm-carrot-receipt",
    product: "Carrots",
    locationId: store.id,
    type: "purchase_receipt",
    qty: "6",
    by: storeManagerId,
    at: at(1, 9, 30),
  });
  await move({
    id: "seed-sm-carrot-receipt-correction",
    product: "Carrots",
    locationId: store.id,
    type: "purchase_receipt",
    qty: "3",
    by: admin.id,
    at: at(1, 17, 45),
    correctsMovementId: carrotReceipt,
    note: "Corrected: delivery note said 9 kg, 6 was keyed",
  });
  await move({ product: "Chicken Stew", locationId: restaurant.id, type: "production", qty: "30", by: storeManagerId, at: at(1, 7, 45) });
  await move({ product: "Chapati", locationId: restaurant.id, type: "production", qty: "50", by: storeManagerId, at: at(1, 8, 0) });
  await move({ product: "Rice", locationId: store.id, type: "issue", qty: "-15", by: storeManagerId, at: at(1, 7, 0), note: "Issued to kitchen" });

  // ── Today · fresh movements + one pending inbound transfer ───────────
  await move({ product: "Chapati", locationId: restaurant.id, type: "production", qty: "45", by: storeManagerId, at: at(0, 7, 30) });
  await move({ product: "Chips Full", locationId: restaurant.id, type: "production", qty: "30", by: storeManagerId, at: at(0, 7, 50) });
  await move({ product: "Beans", locationId: store.id, type: "issue", qty: "-6", by: storeManagerId, at: at(0, 8, 0), note: "Issued to kitchen" });
  // A second pending dispatch, today — so the Canteen's incoming-transfer
  // banner has something to show on the current business day. Soda is
  // stocked at BOTH the Restaurant and the Canteen (it is `goods`), which
  // is what makes it transferable between them.
  await move({
    id: "seed-sm-transfer-pending-soda",
    product: "Soda 300ml",
    locationId: restaurant.id,
    type: "transfer",
    qty: "-12",
    by: storeManagerId,
    at: at(0, 9, 20),
    counterpartLocationId: canteen.id,
    note: "Transfer dispatched — awaiting receipt",
  });

  // One product ends the week NEGATIVE — Chicken Breast was issued past
  // what the Store actually held, which is exactly the state the Admin
  // needs to be able to see rather than have silently clamped to zero.
  await move({ product: "Chicken Breast", locationId: store.id, type: "issue", qty: "-10", by: storeManagerId, at: at(0, 8, 15), note: "Issued to kitchen" });

  // ── §5 Restaurant sales ──────────────────────────────────────────────
  await seedSales({ restaurantId: restaurant.id, cashier1, cashier2, adminId: admin.id });

  // ── §6 Canteen stock counts ──────────────────────────────────────────
  await seedCanteenCounts({ canteenId: canteen.id, attendantId });

  // ── §7 Assets ────────────────────────────────────────────────────────
  const assets = [
    { key: "deep-frier", name: "Deep Frier", locationId: restaurant.id, daysAgo: 400, cost: "38000.00", condition: "Good" },
    { key: "fridge", name: "Chest Fridge", locationId: canteen.id, daysAgo: 700, cost: "52000.00", condition: "Fair" },
    { key: "gas-cooker", name: "Gas Cooker (6 burner)", locationId: restaurant.id, daysAgo: 200, cost: "74500.00", condition: "Good" },
    { key: "shelving", name: "Store Shelving Unit", locationId: store.id, daysAgo: 900, cost: "12000.00", condition: "Needs repair", archived: true },
  ];
  for (const a of assets) {
    await prisma.asset.create({
      data: {
        id: `seed-asset-${a.key}`,
        name: a.name,
        locationId: a.locationId,
        purchaseDate: dateOnly(a.daysAgo),
        purchaseCost: a.cost,
        conditionStatus: a.condition,
        deletedAt: a.archived ? at(30, 10, 0) : null,
      },
    });
  }

  // ── §8 Handovers + financials ────────────────────────────────────────
  await seedHandovers({
    restaurantId: restaurant.id,
    canteenId: canteen.id,
    cashier1,
    cashier2,
    attendantId,
    adminId: admin.id,
  });
  await seedFinancials({ adminId: admin.id });

  console.log("Seed complete (wipe + rebuild).");
  console.log('Admin:  "Admin" / PIN 1234');
  for (const s of staffSeeds) console.log(`${s.role}: "${s.name}" / PIN 1234`);
}

// ═══════════════════════════════════════════════════════════════════════
// §5 Restaurant sales
// ═══════════════════════════════════════════════════════════════════════

/**
 * ~18 orders over 7 days across both cashiers: all three payment methods
 * × all three order types, one delivery with a fee, one corrected order,
 * and credit orders that create Debt with a mix of Repayment states.
 *
 * Audit F3: EVERY order writes its `sale` StockMovement rows here. The
 * old seed early-returned when the order id already existed, so a re-seed
 * left 10 orders with zero sale movements — the ledger's SOLD column was
 * empty and Restaurant stock read high. The wipe + unconditional create
 * below makes that impossible.
 */
async function seedSales({
  restaurantId,
  cashier1,
  cashier2,
  adminId,
}: {
  restaurantId: string;
  cashier1: string;
  cashier2: string;
  adminId: string;
}) {
  // Restaurant selling prices, mirrored from the §3 catalogue.
  const PRICE: Record<string, string> = {
    "Chapati": "20.00",
    "Chicken Stew": "200.00",
    "Chips Full": "100.00",
    "Samosa": "30.00",
    "Matoke": "120.00",
    "Rice & Beans": "150.00",
    "Soda 300ml": "60.00",
    "Water 500ml": "50.00",
  };

  // 6 customers: 2 owing, 1 in credit, 1 settled, 1 with no history, 1 archived.
  // (Customer has no `deletedAt` column — "archived" here means a customer
  // row that carries no orders and no debts, kept for the A2 empty state.)
  const customers = [
    { key: "grace", name: "Grace Wanjiru", phone: "0722000111" },
    { key: "john", name: "John Otieno", phone: "0733222444" },
    { key: "mary", name: "Mary Achieng", phone: "0711888222" },
    { key: "peter", name: "Peter Kamau", phone: "0700123456" },
    { key: "esther", name: "Esther Njeri", phone: "0798445221" },
    { key: "daniel", name: "Daniel Mwangi", phone: "0755334100" },
  ];
  for (const c of customers) {
    await prisma.customer.create({
      data: { id: `seed-customer-${c.key}`, name: c.name, phone: c.phone },
    });
  }

  let saleSeq = 0;

  type OrderSpec = {
    id: string;
    cashierId: string;
    orderType: "dine_in" | "takeaway" | "delivery";
    paymentMethod: "cash" | "mpesa" | "credit";
    deliveryFee?: string;
    customerKey?: string;
    occurredAt: Date;
    lines: Array<{ product: string; qty: number }>;
    correctsOrderId?: string;
  };

  async function makeOrder(o: OrderSpec) {
    const lineData = o.lines.map((l) => {
      const unit = Number(PRICE[l.product]);
      return {
        productId: pid(l.product),
        quantity: String(l.qty),
        unitPrice: PRICE[l.product],
        subtotal: (unit * l.qty).toFixed(2),
      };
    });
    const itemsTotal = lineData.reduce((s, l) => s + Number(l.subtotal), 0);
    const fee = o.orderType === "delivery" ? Number(o.deliveryFee ?? 0) : 0;
    const total = (itemsTotal + fee).toFixed(2);

    const order = await prisma.order.create({
      data: {
        id: o.id,
        locationId: restaurantId,
        cashierId: o.cashierId,
        orderType: o.orderType,
        deliveryFee: o.orderType === "delivery" ? (o.deliveryFee ?? "0") : null,
        paymentMethod: o.paymentMethod,
        customerId: o.customerKey ? `seed-customer-${o.customerKey}` : null,
        total,
        occurredAt: o.occurredAt,
        correctsOrderId: o.correctsOrderId ?? null,
        lines: { create: lineData },
      },
    });

    // The sale ledger rows (audit F3 — never skipped).
    for (const l of lineData) {
      await prisma.stockMovement.create({
        data: {
          id: `seed-sm-sale-${String(++saleSeq).padStart(3, "0")}`,
          productId: l.productId,
          locationId: restaurantId,
          movementType: "sale",
          quantity: `-${l.quantity}`,
          recordedById: o.cashierId,
          occurredAt: o.occurredAt,
          orderId: order.id,
        },
      });
    }

    if (o.paymentMethod === "credit" && o.customerKey) {
      await prisma.debt.create({
        data: {
          id: `seed-debt-${o.id}`,
          customerId: `seed-customer-${o.customerKey}`,
          orderId: order.id,
          amount: total,
          occurredAt: o.occurredAt,
        },
      });
    } else {
      await prisma.moneyMovement.create({
        data: {
          id: `seed-mm-${o.id}`,
          account: o.paymentMethod === "mpesa" ? "mpesa_bank" : "cash",
          amount: total,
          sourceType: "order",
          sourceId: order.id,
          recordedById: o.cashierId,
          occurredAt: o.occurredAt,
        },
      });
    }
    return order;
  }

  const orders: OrderSpec[] = [
    // ── Day −6 …
    { id: "seed-order-01", cashierId: cashier1, orderType: "dine_in", paymentMethod: "cash", occurredAt: at(6, 12, 10), lines: [{ product: "Chicken Stew", qty: 2 }, { product: "Chapati", qty: 4 }] },
    { id: "seed-order-02", cashierId: cashier2, orderType: "takeaway", paymentMethod: "mpesa", occurredAt: at(6, 13, 40), lines: [{ product: "Chips Full", qty: 3 }, { product: "Soda 300ml", qty: 3 }] },
    // ── Day −5 …
    { id: "seed-order-03", cashierId: cashier1, orderType: "dine_in", paymentMethod: "cash", occurredAt: at(5, 12, 30), lines: [{ product: "Samosa", qty: 6 }, { product: "Water 500ml", qty: 2 }] },
    { id: "seed-order-04", cashierId: cashier2, orderType: "delivery", paymentMethod: "mpesa", deliveryFee: "150.00", occurredAt: at(5, 18, 5), lines: [{ product: "Chicken Stew", qty: 3 }] },
    // Grace runs a tab — two credit orders, partially repaid (§ repayments).
    { id: "seed-order-05", cashierId: cashier1, orderType: "takeaway", paymentMethod: "credit", customerKey: "grace", occurredAt: at(5, 14, 0), lines: [{ product: "Chips Full", qty: 4 }, { product: "Soda 300ml", qty: 2 }] },
    // ── Day −4 …
    { id: "seed-order-06", cashierId: cashier1, orderType: "dine_in", paymentMethod: "cash", occurredAt: at(4, 12, 15), lines: [{ product: "Matoke", qty: 2 }, { product: "Chapati", qty: 2 }] },
    { id: "seed-order-07", cashierId: cashier2, orderType: "dine_in", paymentMethod: "mpesa", occurredAt: at(4, 13, 20), lines: [{ product: "Rice & Beans", qty: 3 }] },
    // John — credit, later settled in full.
    { id: "seed-order-08", cashierId: cashier1, orderType: "takeaway", paymentMethod: "credit", customerKey: "john", occurredAt: at(4, 15, 45), lines: [{ product: "Chicken Stew", qty: 3 }] },
    // ── Day −3 …
    { id: "seed-order-09", cashierId: cashier1, orderType: "dine_in", paymentMethod: "cash", occurredAt: at(3, 12, 0), lines: [{ product: "Chapati", qty: 8 }, { product: "Chicken Stew", qty: 1 }] },
    { id: "seed-order-10", cashierId: cashier2, orderType: "takeaway", paymentMethod: "cash", occurredAt: at(3, 16, 30), lines: [{ product: "Samosa", qty: 5 }] },
    // Mary — credit, never repaid (still owing).
    { id: "seed-order-11", cashierId: cashier2, orderType: "takeaway", paymentMethod: "credit", customerKey: "mary", occurredAt: at(3, 17, 10), lines: [{ product: "Chicken Stew", qty: 2 }, { product: "Water 500ml", qty: 2 }] },
    // ── Day −2 …
    { id: "seed-order-12", cashierId: cashier1, orderType: "dine_in", paymentMethod: "mpesa", occurredAt: at(2, 12, 25), lines: [{ product: "Chips Full", qty: 2 }, { product: "Soda 300ml", qty: 2 }] },
    { id: "seed-order-13", cashierId: cashier2, orderType: "delivery", paymentMethod: "cash", deliveryFee: "100.00", occurredAt: at(2, 19, 0), lines: [{ product: "Matoke", qty: 2 }, { product: "Soda 300ml", qty: 1 }] },
    // Peter — credit, then OVER-repaid, so he sits in credit.
    { id: "seed-order-14", cashierId: cashier1, orderType: "takeaway", paymentMethod: "credit", customerKey: "peter", occurredAt: at(2, 14, 50), lines: [{ product: "Rice & Beans", qty: 2 }] },
    // ── Day −1 …
    { id: "seed-order-15", cashierId: cashier1, orderType: "dine_in", paymentMethod: "cash", occurredAt: at(1, 12, 40), lines: [{ product: "Chicken Stew", qty: 1 }, { product: "Chapati", qty: 3 }] },
    { id: "seed-order-16", cashierId: cashier2, orderType: "takeaway", paymentMethod: "mpesa", occurredAt: at(1, 13, 55), lines: [{ product: "Samosa", qty: 4 }, { product: "Water 500ml", qty: 1 }] },
    // ── Today …
    { id: "seed-order-17", cashierId: cashier1, orderType: "dine_in", paymentMethod: "cash", occurredAt: at(0, 10, 22), lines: [{ product: "Chapati", qty: 2 }, { product: "Samosa", qty: 3 }] },
    { id: "seed-order-18", cashierId: cashier2, orderType: "dine_in", paymentMethod: "cash", occurredAt: at(0, 11, 45), lines: [{ product: "Chicken Stew", qty: 1 }, { product: "Chapati", qty: 2 }] },
    { id: "seed-order-19", cashierId: cashier1, orderType: "delivery", paymentMethod: "mpesa", deliveryFee: "120.00", occurredAt: at(0, 12, 30), lines: [{ product: "Chips Full", qty: 2 }] },
  ];

  for (const o of orders) await makeOrder(o);

  // One corrected order — the correction is its own Order row linked by
  // `correctsOrderId` (never an edit). Dated into the same business day
  // as the original, and recorded by the Admin.
  //
  // NOTE for the F1 fix: `listOrders` currently returns BOTH rows and a
  // naive sum double-counts them. That is a read-path bug, not a seed
  // bug — this pair is exactly the data needed to see it and to verify
  // the fix. See docs/sprints/m2-quantity-audit.md §3.1.
  await makeOrder({
    id: "seed-order-15-correction",
    cashierId: adminId,
    orderType: "dine_in",
    paymentMethod: "cash",
    occurredAt: at(1, 16, 0),
    lines: [{ product: "Chicken Stew", qty: 1 }, { product: "Chapati", qty: 1 }],
    correctsOrderId: "seed-order-15",
  });

  // ── Repayments ───────────────────────────────────────────────────────
  // Grace: owes 520 (order 05), repaid 200  → still owing 320
  // John:  owes 600 (order 08), repaid 600  → settled
  // Mary:  owes 500 (order 11), no repayment → owing
  // Peter: owes 300 (order 14), repaid 400  → in credit by 100
  // Esther / Daniel: no history at all.
  const repayments = [
    { id: "seed-repayment-1", customerKey: "grace", amount: "200.00", account: "cash" as const, note: null as string | null, daysAgo: 3 },
    { id: "seed-repayment-2", customerKey: "john", amount: "600.00", account: "mpesa_bank" as const, note: "Cleared in full at the counter", daysAgo: 2 },
    { id: "seed-repayment-3", customerKey: "peter", amount: "400.00", account: "cash" as const, note: "Paid ahead for the week", daysAgo: 1 },
  ];
  for (const r of repayments) {
    await prisma.repayment.create({
      data: {
        id: r.id,
        customerId: `seed-customer-${r.customerKey}`,
        amount: r.amount,
        account: r.account,
        note: r.note,
        recordedById: adminId,
        occurredAt: at(r.daysAgo, 9, 30),
      },
    });
    await prisma.moneyMovement.create({
      data: {
        id: `seed-mm-${r.id}`,
        account: r.account,
        amount: r.amount,
        sourceType: "repayment",
        sourceId: r.id,
        recordedById: adminId,
        occurredAt: at(r.daysAgo, 9, 30),
      },
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════
// §6 Canteen stock counts
// ═══════════════════════════════════════════════════════════════════════

/**
 * The Canteen sells by counting what is left, not by ringing up orders:
 * a StockCount records the counted quantity, and the units sold are
 * DERIVED (prior balance − counted). StockCount therefore has no
 * `soldQuantity` column — per the ledger rule, units sold is never
 * stored — so each count here also writes the `sale` StockMovement and
 * the cash `MoneyMovement` the domain would write.
 *
 * Audit F5: because the old seed's orders never wrote sale movements,
 * GET /api/canteen/stock-counts reported `unitsSold: "0.0000"` against
 * real revenue. The paired rows below are what makes the derived figure
 * agree with the money.
 *
 * The quantities are chained: each count's `counted` equals the running
 * Canteen balance minus that day's sold units, so the ledger reconciles.
 */
async function seedCanteenCounts({
  canteenId,
  attendantId,
}: {
  canteenId: string;
  attendantId: string;
}) {
  type CountSpec = {
    id: string;
    product: string;
    counted: string;
    sold: string;
    unitPrice: string;
    at: Date;
  };

  // Canteen running balances from §4:
  //   Soda 300ml      144 opening, +24 transfer in on day −4  = 168
  //   Water 500ml      96 opening                             =  96
  //   Mandazi          60 opening                             =  60
  //   Groundnuts 50g   30 opening                             =  30
  const counts: CountSpec[] = [
    // Day −5 · first-ever count for Soda (no prior period to compare).
    { id: "seed-count-soda-1", product: "Soda 300ml", counted: "108", sold: "36", unitPrice: "60.00", at: at(5, 17, 0) },
    // Day −4 · Water, a plain count.
    { id: "seed-count-water-1", product: "Water 500ml", counted: "72", sold: "24", unitPrice: "50.00", at: at(4, 17, 0) },
    // Day −3 · Soda again (108 + 24 transfer in = 132, sold 30 → 102).
    { id: "seed-count-soda-2", product: "Soda 300ml", counted: "102", sold: "30", unitPrice: "60.00", at: at(3, 17, 0) },
    // Day −3 · Mandazi.
    { id: "seed-count-mandazi-1", product: "Mandazi", counted: "26", sold: "34", unitPrice: "20.00", at: at(3, 17, 5) },
    // Day −2 · Groundnuts sold out exactly — the zero-balance edge case.
    { id: "seed-count-groundnuts-1", product: "Groundnuts 50g", counted: "0", sold: "30", unitPrice: "30.00", at: at(2, 17, 0) },
    // Day −1 · a ZERO-SOLD count (nothing moved) — writes no sale row and
    // no money row, which is the state the K1 preview must handle.
    { id: "seed-count-water-2", product: "Water 500ml", counted: "72", sold: "0", unitPrice: "50.00", at: at(1, 17, 0) },
    // Today · Soda, dated to the MORNING on purpose. `deriveStockCount`
    // refuses a count at or before an existing one ("counts must move
    // forward in time"), so an evening-dated count today would block the
    // attendant from recording any count during the walkthrough. An
    // early count leaves the rest of the day open for a live one.
    { id: "seed-count-soda-3", product: "Soda 300ml", counted: "80", sold: "22", unitPrice: "60.00", at: at(0, 6, 30) },
  ];

  for (const c of counts) {
    await prisma.stockCount.create({
      data: {
        id: c.id,
        productId: pid(c.product),
        locationId: canteenId,
        countedById: attendantId,
        countedQuantity: c.counted,
        occurredAt: c.at,
      },
    });

    const sold = Number(c.sold);
    if (sold === 0) continue;

    await prisma.stockMovement.create({
      data: {
        id: `seed-sm-count-${c.id}`,
        productId: pid(c.product),
        locationId: canteenId,
        movementType: "sale",
        quantity: `-${c.sold}`,
        stockCountId: c.id,
        recordedById: attendantId,
        occurredAt: c.at,
      },
    });

    await prisma.moneyMovement.create({
      data: {
        id: `seed-mm-count-${c.id}`,
        account: "cash",
        amount: (sold * Number(c.unitPrice)).toFixed(2),
        sourceType: "canteen_sale",
        sourceId: c.id,
        recordedById: attendantId,
        occurredAt: c.at,
      },
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════
// §8 Handovers + financials
// ═══════════════════════════════════════════════════════════════════════

/**
 * Today's end-of-day handovers, so the M3 S3 Handovers tab renders real
 * rows (the wipe deletes handover tables but the old seed never re-made
 * any). Three states, matching what the reconciliation screen must show:
 *
 *   1. EXACT match — declared === received, zero variance.
 *   2. SHORTFALL   — received < declared on cash, with the required
 *      `HandoverShortfall` note.
 *   3. DECLARED, NOT YET RECEIVED — no `ReceiptOfHandover` row, so the
 *      Admin's "Record receipt" action has a live target.
 *
 * A handover is a custody transfer, not new revenue (ADR-53/54) — no
 * `MoneyMovement` is written here. `cash_variance` / `mpesa_variance` are
 * stored on the receipt row exactly as `recordReceipt` would compute them
 * (`received − declared`), never recomputed on read.
 */
async function seedHandovers({
  restaurantId,
  canteenId,
  cashier1,
  cashier2,
  attendantId,
  adminId,
}: {
  restaurantId: string;
  canteenId: string;
  cashier1: string;
  cashier2: string;
  attendantId: string;
  adminId: string;
}) {
  type HandoverSpec = {
    id: string;
    staffId: string;
    /** The login that declared it — kept for traceability in the seed. */
    userId: string;
    locationId: string;
    cashDeclared: string;
    mpesaDeclared: string;
    at: Date;
    receipt?: {
      cashReceived: string;
      mpesaReceived: string;
      shortfallNote?: string;
    };
  };

  const specs: HandoverSpec[] = [
    // 1 · Cashier One — exact match, received.
    {
      id: "seed-handover-cashier1",
      staffId: "seed-staff-cashier",
      userId: cashier1,
      locationId: restaurantId,
      cashDeclared: "4200.00",
      mpesaDeclared: "1800.00",
      at: at(0, 20, 15),
      receipt: { cashReceived: "4200.00", mpesaReceived: "1800.00" },
    },
    // 2 · Canteen Attendant — cash short by 300, with the required note.
    {
      id: "seed-handover-attendant",
      staffId: "seed-staff-canteen-attendant",
      userId: attendantId,
      locationId: canteenId,
      cashDeclared: "3300.00",
      mpesaDeclared: "0.00",
      at: at(0, 19, 40),
      receipt: {
        cashReceived: "3000.00",
        mpesaReceived: "0.00",
        shortfallNote: "KES 300 short — attendant says a customer underpaid; following up.",
      },
    },
    // 3 · Cashier Two — declared, NOT yet received (live "Record receipt").
    {
      id: "seed-handover-cashier2",
      staffId: "seed-staff-cashier-2",
      userId: cashier2,
      locationId: restaurantId,
      cashDeclared: "2650.00",
      mpesaDeclared: "900.00",
      at: at(0, 20, 30),
    },
  ];

  for (const s of specs) {
    await prisma.handover.create({
      data: {
        id: s.id,
        staffId: s.staffId,
        locationId: s.locationId,
        cashDeclared: s.cashDeclared,
        mpesaDeclared: s.mpesaDeclared,
        occurredAt: s.at,
      },
    });

    if (!s.receipt) continue;

    const cashVariance = (
      Number(s.receipt.cashReceived) - Number(s.cashDeclared)
    ).toFixed(2);
    const mpesaVariance = (
      Number(s.receipt.mpesaReceived) - Number(s.mpesaDeclared)
    ).toFixed(2);

    const receipt = await prisma.receiptOfHandover.create({
      data: {
        id: `seed-receipt-${s.id}`,
        handoverId: s.id,
        cashReceived: s.receipt.cashReceived,
        mpesaReceived: s.receipt.mpesaReceived,
        cashVariance,
        mpesaVariance,
        recordedById: adminId,
        occurredAt: new Date(s.at.getTime() + 30 * 60_000),
      },
    });

    if (s.receipt.shortfallNote) {
      await prisma.handoverShortfall.create({
        data: {
          id: `seed-shortfall-${s.id}`,
          receiptOfHandoverId: receipt.id,
          staffId: s.staffId,
          note: s.receipt.shortfallNote,
        },
      });
    }
  }
}

/**
 * A handful of expenses and owner transactions across the week, so the M3
 * S4 Expenses and Owner Draws tabs aren't empty. Each `Expense` /
 * `OwnerTransaction` is paired with the `MoneyMovement` its domain
 * function writes (`recordExpense` debits `paidFromAccount`;
 * `recordOwnerTransaction` moves Cash at hand), so the derived account
 * balances and the profit summary reconcile with these rows.
 *
 * `date` / `occurredAt` are noon of the Nairobi business day — the same
 * instant `businessDateNoonUtc` produces in the domain.
 */
async function seedFinancials({ adminId }: { adminId: string }) {
  const noon = (daysAgo: number) => at(daysAgo, 12, 0);

  type ExpenseSpec = {
    id: string;
    category:
      | "rent"
      | "utilities"
      | "transport"
      | "gas_fuel"
      | "salaries"
      | "repairs"
      | "other";
    amount: string;
    daysAgo: number;
    paidFrom: "cash" | "mpesa_bank";
    note?: string;
  };

  const expenses: ExpenseSpec[] = [
    { id: "seed-expense-rent", category: "rent", amount: "18000.00", daysAgo: 6, paidFrom: "mpesa_bank", note: "September rent — Kariobangi premises" },
    { id: "seed-expense-gas", category: "gas_fuel", amount: "2400.00", daysAgo: 4, paidFrom: "cash", note: "13kg gas refill ×2" },
    { id: "seed-expense-utilities", category: "utilities", amount: "1650.00", daysAgo: 3, paidFrom: "cash", note: "KPLC token" },
    { id: "seed-expense-transport", category: "transport", amount: "800.00", daysAgo: 2, paidFrom: "cash", note: "Market run — pickup fare" },
    { id: "seed-expense-repairs", category: "repairs", amount: "3500.00", daysAgo: 1, paidFrom: "mpesa_bank", note: "Deep frier thermostat" },
    { id: "seed-expense-today", category: "other", amount: "450.00", daysAgo: 0, paidFrom: "cash", note: "Cleaning supplies" },
  ];

  for (const e of expenses) {
    await prisma.expense.create({
      data: {
        id: e.id,
        category: e.category,
        amount: e.amount,
        date: noon(e.daysAgo),
        paidFromAccount: e.paidFrom,
        note: e.note ?? null,
        recordedById: adminId,
      },
    });
    await prisma.moneyMovement.create({
      data: {
        id: `seed-mm-${e.id}`,
        account: e.paidFrom,
        amount: `-${e.amount}`, // money out
        sourceType: "expense",
        sourceId: e.id,
        recordedById: adminId,
        occurredAt: noon(e.daysAgo),
        note: e.note ?? null,
      },
    });
  }

  // Owner transactions: two draws and one return → owed-to-business =
  // 5000 + 2000 − 3000 = KES 4,000.
  type OwnerSpec = {
    id: string;
    type: "draw" | "return";
    amount: string;
    daysAgo: number;
    note?: string;
  };
  const ownerTxns: OwnerSpec[] = [
    { id: "seed-owner-draw-1", type: "draw", amount: "5000.00", daysAgo: 5, note: "School fees" },
    { id: "seed-owner-return-1", type: "return", amount: "3000.00", daysAgo: 3, note: "Put back — sold personal item" },
    { id: "seed-owner-draw-2", type: "draw", amount: "2000.00", daysAgo: 1, note: "Household shopping" },
  ];
  for (const o of ownerTxns) {
    await prisma.ownerTransaction.create({
      data: {
        id: o.id,
        type: o.type,
        amount: o.amount,
        date: noon(o.daysAgo),
        note: o.note ?? null,
      },
    });
    await prisma.moneyMovement.create({
      data: {
        id: `seed-mm-${o.id}`,
        account: "cash",
        amount: o.type === "draw" ? `-${o.amount}` : o.amount,
        sourceType: o.type === "draw" ? "owner_draw" : "owner_return",
        sourceId: o.id,
        recordedById: adminId,
        occurredAt: noon(o.daysAgo),
        note: o.note ?? null,
      },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
