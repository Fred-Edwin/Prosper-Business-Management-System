import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Shared fixtures for the sales (Restaurant orders) domain tests.
 *
 * Vitest runs test files in parallel workers against the one local
 * Postgres, so each suite namespaces its rows with a unique `scope` prefix
 * (`__sales_test__<scope>__`) and only ever cleans up its own — the
 * `lib/domain/catalog` / `lib/domain/customers` pattern.
 *
 * Provides: one active Restaurant `Location`, two `cashier` users (for the
 * cross-cashier isolation test), one `admin`, N `Product`s each with an
 * active Restaurant `ProductLocation` carrying a `sellingPrice`, and an
 * opening `StockMovement` per product so a derived Restaurant balance
 * exists to test the §3.8 block against.
 *
 * `AuditLog.userId` RESTRICTs — cleanup deletes audit rows by `userId`
 * before the users (S3 finding).
 */

export const TEST_PREFIX_BASE = "__sales_test__";

export type SalesTestProduct = {
  id: string;
  name: string;
  sellingPrice: string;
  /** Opening Restaurant balance seeded for this product. */
  opening: string;
};

export type SalesTestCtx = {
  prefix: string;
  restaurantId: string;
  /** A second location (canteen) — used to prove the order never touches it. */
  canteenId: string;
  adminId: string;
  cashierId: string;
  cashier2Id: string;
  products: SalesTestProduct[];
};

function prefixFor(scope: string): string {
  return `${TEST_PREFIX_BASE}${scope}__`;
}

type ProductSpec = { name: string; sellingPrice: string; opening: string };

const DEFAULT_PRODUCTS: ProductSpec[] = [
  { name: "Chapati", sellingPrice: "20.00", opening: "100" },
  { name: "Samosa", sellingPrice: "50.00", opening: "40" },
  { name: "Soda 300ml", sellingPrice: "60.00", opening: "12" },
];

export async function setupSalesTestData(
  scope: string,
  productSpecs: ProductSpec[] = DEFAULT_PRODUCTS,
): Promise<SalesTestCtx> {
  const prefix = prefixFor(scope);
  await cleanupSalesTestData(scope);

  const restaurant = await prisma.location.create({
    data: { name: `${prefix} Restaurant`, type: "restaurant", active: true },
  });
  const canteen = await prisma.location.create({
    data: { name: `${prefix} Canteen`, type: "canteen", active: true },
  });
  const admin = await prisma.user.create({
    data: { name: `${prefix} Admin`, pinHash: "x", role: "admin", active: true },
  });
  const cashier = await prisma.user.create({
    data: { name: `${prefix} Cashier A`, pinHash: "x", role: "cashier", active: true },
  });
  const cashier2 = await prisma.user.create({
    data: { name: `${prefix} Cashier B`, pinHash: "x", role: "cashier", active: true },
  });

  const products: SalesTestProduct[] = [];
  for (const spec of productSpecs) {
    const product = await prisma.product.create({
      data: {
        name: `${prefix} ${spec.name}`,
        kind: "goods",
        unitLabel: "unit",
        productLocations: {
          create: {
            locationId: restaurant.id,
            sellingPrice: new Prisma.Decimal(spec.sellingPrice),
            active: true,
          },
        },
      },
    });
    if (new Prisma.Decimal(spec.opening).greaterThan(0)) {
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          locationId: restaurant.id,
          movementType: "opening",
          quantity: new Prisma.Decimal(spec.opening),
          recordedById: admin.id,
          occurredAt: new Date("2026-08-01T06:00:00Z"),
        },
      });
    }
    products.push({
      id: product.id,
      name: `${prefix} ${spec.name}`,
      sellingPrice: spec.sellingPrice,
      opening: spec.opening,
    });
  }

  return {
    prefix,
    restaurantId: restaurant.id,
    canteenId: canteen.id,
    adminId: admin.id,
    cashierId: cashier.id,
    cashier2Id: cashier2.id,
    products,
  };
}

/* ------------------------------------------------------------------ *
 * Canteen derived-sales fixtures (S5).
 *
 * A canteen `Location`; a `canteen_attendant` user linked to it via
 * `Staff` (so `resolveActorLocationId` resolves the canteen); an
 * `admin`; a `store_manager` (for the "count by a non-attendant"
 * negative test); N `Product`s each with an active canteen
 * `ProductLocation` carrying a `sellingPrice`. NO opening movement is
 * seeded — canteen derivation tests hand-build the ledger with
 * `seedMovement` at chosen `occurredAt`s.
 * ------------------------------------------------------------------ */

export type CanteenTestProduct = {
  id: string;
  name: string;
  sellingPrice: string;
};

export type CanteenTestCtx = {
  prefix: string;
  canteenId: string;
  adminId: string;
  attendantId: string;
  attendantStaffId: string;
  storeManagerId: string;
  products: CanteenTestProduct[];
};

type CanteenProductSpec = { name: string; sellingPrice: string };

const DEFAULT_CANTEEN_PRODUCTS: CanteenProductSpec[] = [
  { name: "Soda 300ml", sellingPrice: "60.00" },
  { name: "Mandazi", sellingPrice: "20.00" },
];

export async function setupCanteenTestData(
  scope: string,
  productSpecs: CanteenProductSpec[] = DEFAULT_CANTEEN_PRODUCTS,
): Promise<CanteenTestCtx> {
  const prefix = prefixFor(scope);
  await cleanupSalesTestData(scope);

  const canteen = await prisma.location.create({
    data: { name: `${prefix} Canteen`, type: "canteen", active: true },
  });
  const admin = await prisma.user.create({
    data: { name: `${prefix} Admin`, pinHash: "x", role: "admin", active: true },
  });
  const attendantStaff = await prisma.staff.create({
    data: {
      name: `${prefix} Attendant`,
      role: "canteen_attendant",
      locationId: canteen.id,
      dailyRate: new Prisma.Decimal("0"),
      active: true,
    },
  });
  const attendant = await prisma.user.create({
    data: {
      name: `${prefix} Attendant`,
      pinHash: "x",
      role: "canteen_attendant",
      active: true,
      staffId: attendantStaff.id,
    },
  });
  const storeManager = await prisma.user.create({
    data: {
      name: `${prefix} Store Mgr`,
      pinHash: "x",
      role: "store_manager",
      active: true,
    },
  });

  const products: CanteenTestProduct[] = [];
  for (const spec of productSpecs) {
    const product = await prisma.product.create({
      data: {
        name: `${prefix} ${spec.name}`,
        kind: "goods",
        unitLabel: "pcs",
        productLocations: {
          create: {
            locationId: canteen.id,
            sellingPrice: new Prisma.Decimal(spec.sellingPrice),
            active: true,
          },
        },
      },
    });
    products.push({
      id: product.id,
      name: `${prefix} ${spec.name}`,
      sellingPrice: spec.sellingPrice,
    });
  }

  return {
    prefix,
    canteenId: canteen.id,
    adminId: admin.id,
    attendantId: attendant.id,
    attendantStaffId: attendantStaff.id,
    storeManagerId: storeManager.id,
    products,
  };
}

/**
 * Seed one `StockMovement` at a chosen instant so a canteen derivation
 * can be hand-worked. `quantity` is signed as the ledger stores it —
 * `opening` / `transfer`-in / `production` positive, `non_sale_consumption`
 * negative.
 */
export async function seedMovement(
  ctx: CanteenTestCtx,
  args: {
    productId: string;
    movementType:
      | "opening"
      | "purchase_receipt"
      | "transfer"
      | "production"
      | "non_sale_consumption";
    quantity: string;
    occurredAt: Date;
  },
): Promise<void> {
  await prisma.stockMovement.create({
    data: {
      productId: args.productId,
      locationId: ctx.canteenId,
      movementType: args.movementType,
      quantity: new Prisma.Decimal(args.quantity),
      recordedById: ctx.attendantId,
      occurredAt: args.occurredAt,
    },
  });
}

/** Create a customer namespaced to this suite. */
export async function makeCustomer(
  ctx: SalesTestCtx,
  name = "Credit Cust",
  phone = "0700000000",
): Promise<string> {
  const c = await prisma.customer.create({
    data: { name: `${ctx.prefix} ${name}`, phone },
  });
  return c.id;
}

export async function cleanupSalesTestData(scope: string): Promise<void> {
  const prefix = prefixFor(scope);

  const users = await prisma.user.findMany({
    where: { name: { startsWith: prefix } },
    select: { id: true },
  });
  const userIds = users.map((u) => u.id);

  const products = await prisma.product.findMany({
    where: { name: { startsWith: prefix } },
    select: { id: true },
  });
  const productIds = products.map((p) => p.id);

  const customers = await prisma.customer.findMany({
    where: { name: { startsWith: prefix } },
    select: { id: true },
  });
  const customerIds = customers.map((c) => c.id);

  // Orders this suite created (by its Restaurant location) — and the ledger
  // rows hanging off them.
  const orders = await prisma.order.findMany({
    where: { location: { name: { startsWith: prefix } } },
    select: { id: true },
  });
  const orderIds = orders.map((o) => o.id);

  if (orderIds.length > 0) {
    await prisma.moneyMovement.deleteMany({
      where: { sourceType: "order", sourceId: { in: orderIds } },
    });
    await prisma.debt.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.stockMovement.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.orderLine.deleteMany({ where: { orderId: { in: orderIds } } });
    // Corrections point at originals — clear the FK before deleting rows.
    await prisma.order.updateMany({
      where: { id: { in: orderIds } },
      data: { correctsOrderId: null },
    });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  }

  if (productIds.length > 0) {
    // Canteen slice (S5): the `canteen_sale` money rows and the
    // `StockCount` rows this suite's products own, plus their movements.
    const counts = await prisma.stockCount.findMany({
      where: { productId: { in: productIds } },
      select: { id: true },
    });
    const countIds = counts.map((c) => c.id);
    if (countIds.length > 0) {
      await prisma.moneyMovement.deleteMany({
        where: { sourceType: "canteen_sale", sourceId: { in: countIds } },
      });
    }
    await prisma.stockMovement.deleteMany({ where: { productId: { in: productIds } } });
    await prisma.stockCount.deleteMany({ where: { productId: { in: productIds } } });
    await prisma.orderLine.deleteMany({ where: { productId: { in: productIds } } });
    await prisma.productLocation.deleteMany({ where: { productId: { in: productIds } } });
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
  }

  if (customerIds.length > 0) {
    await prisma.repayment.deleteMany({ where: { customerId: { in: customerIds } } });
    await prisma.debt.deleteMany({ where: { customerId: { in: customerIds } } });
    await prisma.customer.deleteMany({ where: { id: { in: customerIds } } });
  }

  if (userIds.length > 0) {
    await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
  }
  await prisma.user.deleteMany({ where: { name: { startsWith: prefix } } });

  // Canteen slice: the attendant's `Staff` row (a `User` FKs to it, so
  // this must follow the user delete). Then the locations.
  await prisma.staff.deleteMany({ where: { name: { startsWith: prefix } } });
  await prisma.location.deleteMany({ where: { name: { startsWith: prefix } } });
}
