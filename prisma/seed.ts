import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Sample product names below are drawn from carry-forward/reference-data.json
// (a prior build's real catalogue) for realism, mapped onto this schema's
// product kinds — this is *not* a full catalogue import, which belongs to
// the Catalog & Locations sprint.
async function main() {
  // `update` re-asserts `active: true` so a row a prior test flipped
  // inactive is healed on re-seed (`resolveRestaurantId` needs an ACTIVE
  // restaurant, else `POST /api/orders` fails "No active Restaurant …").
  const [restaurant, canteen, store] = await Promise.all([
    prisma.location.upsert({
      where: { id: "seed-location-restaurant" },
      update: { active: true },
      create: { id: "seed-location-restaurant", name: "Restaurant", type: "restaurant" },
    }),
    prisma.location.upsert({
      where: { id: "seed-location-canteen" },
      update: { active: true },
      create: { id: "seed-location-canteen", name: "Canteen", type: "canteen" },
    }),
    prisma.location.upsert({
      where: { id: "seed-location-store" },
      update: { active: true },
      create: { id: "seed-location-store", name: "Store", type: "store" },
    }),
  ]);

  const pinHash = await bcrypt.hash("1234", 10);

  const adminUser = await prisma.user.upsert({
    where: { name: "Admin" },
    update: {},
    create: {
      name: "Admin",
      pinHash,
      role: "admin",
      active: true,
    },
  });

  const staffSeeds: Array<{
    role: "store_manager" | "cashier" | "canteen_attendant";
    name: string;
    locationId: string;
    dailyRate: string;
  }> = [
    {
      role: "store_manager",
      name: "Store Manager",
      locationId: store.id,
      dailyRate: "700.00",
    },
    {
      role: "cashier",
      name: "Cashier",
      locationId: restaurant.id,
      dailyRate: "550.00",
    },
    {
      role: "canteen_attendant",
      name: "Canteen Attendant",
      locationId: canteen.id,
      dailyRate: "600.00",
    },
  ];

  for (const s of staffSeeds) {
    const staff = await prisma.staff.upsert({
      where: { id: `seed-staff-${s.role}` },
      update: {},
      create: {
        id: `seed-staff-${s.role}`,
        name: s.name,
        role: s.role,
        locationId: s.locationId,
        dailyRate: s.dailyRate,
        active: true,
      },
    });

    await prisma.user.upsert({
      where: { name: s.name },
      update: {},
      create: {
        name: s.name,
        pinHash,
        role: s.role,
        staffId: staff.id,
        active: true,
      },
    });
  }

  const ingredients = [
    { name: "Cooking oil", unitLabel: "litre", buyingPrice: "253.33" },
    { name: "Carrots", unitLabel: "kg", buyingPrice: "50.00" },
    { name: "Beans", unitLabel: "cups", buyingPrice: "60.00" },
  ];

  for (const ing of ingredients) {
    await prisma.product.upsert({
      where: { id: `seed-product-${ing.name.toLowerCase().replace(/\s+/g, "-")}` },
      update: {},
      create: {
        id: `seed-product-${ing.name.toLowerCase().replace(/\s+/g, "-")}`,
        name: ing.name,
        kind: "ingredient",
        buyingPrice: ing.buyingPrice,
        unitLabel: ing.unitLabel,
      },
    });
  }

  const dishes = [
    { name: "Chicken Stew", price: "200.00", location: restaurant.id },
    { name: "Chips Full", price: "100.00", location: restaurant.id },
  ];

  for (const dish of dishes) {
    const product = await prisma.product.upsert({
      where: { id: `seed-product-${dish.name.toLowerCase().replace(/\s+/g, "-")}` },
      update: {},
      create: {
        id: `seed-product-${dish.name.toLowerCase().replace(/\s+/g, "-")}`,
        name: dish.name,
        kind: "dish",
        buyingPrice: "0",
        unitLabel: "plate",
      },
    });

    await prisma.productLocation.upsert({
      where: { productId_locationId: { productId: product.id, locationId: dish.location } },
      update: {},
      create: {
        productId: product.id,
        locationId: dish.location,
        sellingPrice: dish.price,
        active: true,
      },
    });
  }

  const goods = [
    { name: "Bar Soap Menengai", price: "170.00", location: canteen.id, unitLabel: "kg" },
  ];

  for (const good of goods) {
    const product = await prisma.product.upsert({
      where: { id: `seed-product-${good.name.toLowerCase().replace(/\s+/g, "-")}` },
      update: {},
      create: {
        id: `seed-product-${good.name.toLowerCase().replace(/\s+/g, "-")}`,
        name: good.name,
        kind: "goods",
        buyingPrice: good.price,
        unitLabel: good.unitLabel,
      },
    });

    await prisma.productLocation.upsert({
      where: { productId_locationId: { productId: product.id, locationId: good.location } },
      update: {},
      create: {
        productId: product.id,
        locationId: good.location,
        sellingPrice: good.price,
        active: true,
      },
    });
  }

  // ── M2 dev data (Restaurant sales · Customers & Credit) ──────────────
  // Minimal populated data so `pnpm dev` shows the M2 screens non-empty
  // for the Session 6b (Customers) + 6c (Cashier orders) owner
  // walkthroughs. The FULL M2 seed (canteen counts, more breadth) is a
  // Session 6d task. Idempotent via fixed `seed-*` ids.
  await seedM2Sales({
    restaurantId: restaurant.id,
    canteenId: canteen.id,
    adminUserId: adminUser.id,
  });

  console.log("Seed complete.");
  console.log(`Admin: "Admin" / PIN 1234 (user id ${adminUser.id})`);
  for (const s of staffSeeds) {
    console.log(`${s.role}: "${s.name}" / PIN 1234`);
  }
  console.log(`cashier (2nd): "Cashier Two" / PIN 1234`);
}

/**
 * Restaurant menu with categories + stock, a second cashier, four
 * customers (two owing, one in credit), and ~6 orders across the two
 * cashiers — cash / M-Pesa / credit / dine-in / takeaway / delivery, two
 * dated yesterday, one corrected. Written as rows (not via the domain,
 * which needs an auth context) — mirrors the rest of this seed.
 */
async function seedM2Sales({
  restaurantId,
  canteenId,
  adminUserId,
}: {
  restaurantId: string;
  canteenId: string;
  adminUserId: string;
}) {
  const pinHash = await bcrypt.hash("1234", 10);

  // Africa/Nairobi is UTC+3, no DST.
  const now = new Date();
  const at = (daysAgo: number, hh: number, mm: number) => {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - daysAgo);
    d.setUTCHours(hh - 3, mm, 0, 0); // hh is a Nairobi wall-clock hour
    return d;
  };

  // Second cashier (so A3 / cross-cashier isolation are walkable).
  const cashier1 = await prisma.user.findUniqueOrThrow({
    where: { name: "Cashier" },
  });
  const cashier2Staff = await prisma.staff.upsert({
    where: { id: "seed-staff-cashier-2" },
    update: {},
    create: {
      id: "seed-staff-cashier-2",
      name: "Cashier Two",
      role: "cashier",
      locationId: restaurantId,
      dailyRate: "550.00",
      active: true,
    },
  });
  const cashier2 = await prisma.user.upsert({
    where: { name: "Cashier Two" },
    update: {},
    create: {
      name: "Cashier Two",
      pinHash,
      role: "cashier",
      staffId: cashier2Staff.id,
      active: true,
    },
  });

  // Restaurant menu — categories power the C2 / K1 tab rows.
  const menu = [
    { key: "chicken-stew", name: "Chicken Stew", price: "200.00", category: "Mains", unit: "plate", stock: "40" },
    { key: "chips-full", name: "Chips Full", price: "100.00", category: "Mains", unit: "plate", stock: "50" },
    { key: "chapati", name: "Chapati", price: "20.00", category: "Sides", unit: "pcs", stock: "120" },
    { key: "soda-300ml", name: "Soda 300ml", price: "60.00", category: "Drinks", unit: "pcs", stock: "80" },
    { key: "samosa", name: "Samosa", price: "30.00", category: "Snacks", unit: "pcs", stock: "60" },
    // One left uncategorised on purpose (C2 "Uncategorised" tab).
    { key: "water-500ml", name: "Water 500ml", price: "50.00", category: null as string | null, unit: "pcs", stock: "70" },
  ];

  const menuProducts: Record<string, string> = {};
  for (const m of menu) {
    const p = await prisma.product.upsert({
      where: { id: `seed-product-${m.key}` },
      update: { category: m.category ?? null },
      create: {
        id: `seed-product-${m.key}`,
        name: m.name,
        kind: "dish",
        buyingPrice: "0",
        unitLabel: m.unit,
        category: m.category ?? null,
      },
    });
    menuProducts[m.key] = p.id;

    await prisma.productLocation.upsert({
      where: {
        productId_locationId: { productId: p.id, locationId: restaurantId },
      },
      update: { sellingPrice: m.price, active: true },
      create: {
        productId: p.id,
        locationId: restaurantId,
        sellingPrice: m.price,
        active: true,
      },
    });

    // A `production` movement so the C2 derived Restaurant balance is > 0
    // (otherwise every line is §3.8-blocked). Idempotent by fixed id.
    await prisma.stockMovement.upsert({
      where: { id: `seed-sm-open-${m.key}` },
      update: {},
      create: {
        id: `seed-sm-open-${m.key}`,
        productId: p.id,
        locationId: restaurantId,
        movementType: "production",
        quantity: m.stock,
        recordedById: adminUserId,
        occurredAt: at(3, 7, 0),
      },
    });
  }

  // Customers.
  const customers = [
    { key: "grace", name: "Grace Wanjiru", phone: "0722000111" },
    { key: "john", name: "John Otieno", phone: "0733222444" },
    { key: "mary", name: "Mary Achieng", phone: "0711888222" },
    { key: "peter", name: "Peter Kamau", phone: "0700123456" },
  ];
  const cust: Record<string, string> = {};
  for (const c of customers) {
    const row = await prisma.customer.upsert({
      where: { id: `seed-customer-${c.key}` },
      update: {},
      create: { id: `seed-customer-${c.key}`, name: c.name, phone: c.phone },
    });
    cust[c.key] = row.id;
  }

  // Helper: create an order + its lines + money/debt effect + sale
  // movements, all keyed by a stable id so re-seeding is a no-op.
  type LineSpec = { key: string; qty: number };
  async function makeOrder(opts: {
    id: string;
    cashierId: string;
    orderType: "dine_in" | "takeaway" | "delivery";
    paymentMethod: "cash" | "mpesa" | "credit";
    deliveryFee?: string;
    customerKey?: string;
    occurredAt: Date;
    lines: LineSpec[];
    correctsOrderId?: string;
  }) {
    const existing = await prisma.order.findUnique({ where: { id: opts.id } });
    if (existing) return existing;

    const lineData = opts.lines.map((l) => {
      const spec = menu.find((m) => m.key === l.key)!;
      const unit = Number(spec.price);
      return {
        productId: menuProducts[l.key],
        quantity: String(l.qty),
        unitPrice: spec.price,
        subtotal: (unit * l.qty).toFixed(2),
      };
    });
    const itemsTotal = lineData.reduce((s, l) => s + Number(l.subtotal), 0);
    const fee = opts.orderType === "delivery" ? Number(opts.deliveryFee ?? 0) : 0;
    const total = (itemsTotal + fee).toFixed(2);

    const order = await prisma.order.create({
      data: {
        id: opts.id,
        locationId: restaurantId,
        cashierId: opts.cashierId,
        orderType: opts.orderType,
        deliveryFee: opts.orderType === "delivery" ? (opts.deliveryFee ?? "0") : null,
        paymentMethod: opts.paymentMethod,
        customerId: opts.customerKey ? cust[opts.customerKey] : null,
        total,
        occurredAt: opts.occurredAt,
        correctsOrderId: opts.correctsOrderId ?? null,
        lines: { create: lineData },
      },
    });

    // Sale stock movements (Restaurant stock down).
    for (const l of lineData) {
      await prisma.stockMovement.create({
        data: {
          productId: l.productId,
          locationId: restaurantId,
          movementType: "sale",
          quantity: `-${l.quantity}`,
          recordedById: opts.cashierId,
          occurredAt: opts.occurredAt,
          orderId: order.id,
        },
      });
    }

    if (opts.paymentMethod === "credit" && opts.customerKey) {
      await prisma.debt.create({
        data: {
          customerId: cust[opts.customerKey],
          orderId: order.id,
          amount: total,
          occurredAt: opts.occurredAt,
        },
      });
    } else {
      await prisma.moneyMovement.create({
        data: {
          account: opts.paymentMethod === "mpesa" ? "mpesa_bank" : "cash",
          amount: total,
          sourceType: "order",
          sourceId: order.id,
          recordedById: opts.cashierId,
          occurredAt: opts.occurredAt,
        },
      });
    }
    return order;
  }

  // Today — cashier 1.
  await makeOrder({
    id: "seed-order-1",
    cashierId: cashier1.id,
    orderType: "dine_in",
    paymentMethod: "cash",
    occurredAt: at(0, 10, 22),
    lines: [{ key: "chapati", qty: 2 }, { key: "samosa", qty: 3 }],
  });
  await makeOrder({
    id: "seed-order-2",
    cashierId: cashier1.id,
    orderType: "delivery",
    paymentMethod: "mpesa",
    deliveryFee: "150.00",
    occurredAt: at(0, 12, 30),
    lines: [{ key: "chicken-stew", qty: 2 }],
  });
  await makeOrder({
    id: "seed-order-3",
    cashierId: cashier1.id,
    orderType: "takeaway",
    paymentMethod: "credit",
    customerKey: "grace",
    occurredAt: at(0, 13, 5),
    lines: [{ key: "chips-full", qty: 3 }, { key: "soda-300ml", qty: 2 }],
  });

  // Today — cashier 2 (cross-cashier isolation is visible on A3).
  await makeOrder({
    id: "seed-order-4",
    cashierId: cashier2.id,
    orderType: "dine_in",
    paymentMethod: "cash",
    occurredAt: at(0, 11, 45),
    lines: [{ key: "chicken-stew", qty: 1 }, { key: "chapati", qty: 2 }],
  });
  await makeOrder({
    id: "seed-order-5",
    cashierId: cashier2.id,
    orderType: "takeaway",
    paymentMethod: "credit",
    customerKey: "mary",
    occurredAt: at(0, 14, 10),
    lines: [{ key: "chicken-stew", qty: 2 }],
  });

  // Yesterday — cashier 1 (C4 past-day read-only path is walkable).
  await makeOrder({
    id: "seed-order-6",
    cashierId: cashier1.id,
    orderType: "dine_in",
    paymentMethod: "cash",
    occurredAt: at(1, 15, 20),
    lines: [{ key: "samosa", qty: 4 }],
  });
  // Yesterday — corrected (A3 linked row-group + C4 corrected state).
  const original = await makeOrder({
    id: "seed-order-7",
    cashierId: cashier1.id,
    orderType: "dine_in",
    paymentMethod: "cash",
    occurredAt: at(1, 16, 0),
    lines: [{ key: "chicken-stew", qty: 1 }, { key: "soda-300ml", qty: 1 }],
  });
  await makeOrder({
    id: "seed-order-7-correction",
    cashierId: adminUserId, // Admin records the correction
    orderType: "dine_in",
    paymentMethod: "cash",
    occurredAt: at(1, 16, 0),
    lines: [{ key: "chicken-stew", qty: 1 }], // soda removed by the correction
    correctsOrderId: original.id,
  });

  // Repayments — one with a note (A2 "Reference" cell), mix of accounts.
  const repayments = [
    { id: "seed-repayment-1", customerKey: "grace", amount: "200.00", account: "cash" as const, note: null as string | null, daysAgo: 0 },
    { id: "seed-repayment-2", customerKey: "john", amount: "500.00", account: "mpesa_bank" as const, note: "Cleared in full at the counter", daysAgo: 2 },
  ];
  // John needs a debt to repay against — give him a small past credit order.
  await makeOrder({
    id: "seed-order-john-credit",
    cashierId: cashier1.id,
    orderType: "takeaway",
    paymentMethod: "credit",
    customerKey: "john",
    occurredAt: at(3, 12, 0),
    lines: [{ key: "chicken-stew", qty: 3 }],
  });
  for (const r of repayments) {
    const exists = await prisma.repayment.findUnique({ where: { id: r.id } });
    if (exists) continue;
    await prisma.repayment.create({
      data: {
        id: r.id,
        customerId: cust[r.customerKey],
        amount: r.amount,
        account: r.account,
        note: r.note,
        recordedById: adminUserId,
        occurredAt: at(r.daysAgo, 9, 30),
      },
    });
    await prisma.moneyMovement.create({
      data: {
        account: r.account,
        amount: r.amount,
        sourceType: "repayment",
        sourceId: r.id,
        recordedById: adminUserId,
        occurredAt: at(r.daysAgo, 9, 30),
      },
    });
  }

  // ── M2 6d: Canteen products + Stock Counts (Derived Sales A4 / K1 / K2) ──
  const canteenAttendantUser = await prisma.user.findFirstOrThrow({
    where: { role: "canteen_attendant" },
  });
  const canteenAttendantId = canteenAttendantUser.id;

  // Additional canteen-only products
  const extraCanteenProducts = [
    { key: "mandazi", name: "Mandazi", price: "20.00", category: "Bakery", unit: "pcs", opening: "60", openingDaysAgo: 3 },
    { key: "groundnuts-50g", name: "Groundnuts 50g", price: "30.00", category: "Snacks", unit: "pcs", opening: "50", openingDaysAgo: 3 }, // Never counted
  ];

  for (const item of extraCanteenProducts) {
    const p = await prisma.product.upsert({
      where: { id: `seed-product-${item.key}` },
      update: { category: item.category },
      create: {
        id: `seed-product-${item.key}`,
        name: item.name,
        kind: "dish",
        buyingPrice: "0",
        unitLabel: item.unit,
        category: item.category,
      },
    });

    await prisma.productLocation.upsert({
      where: { productId_locationId: { productId: p.id, locationId: canteenId } },
      update: { sellingPrice: item.price, active: true },
      create: {
        productId: p.id,
        locationId: canteenId,
        sellingPrice: item.price,
        active: true,
      },
    });

    await prisma.stockMovement.upsert({
      where: { id: `seed-sm-canteen-open-${item.key}` },
      update: {},
      create: {
        id: `seed-sm-canteen-open-${item.key}`,
        productId: p.id,
        locationId: canteenId,
        movementType: "opening",
        quantity: item.opening,
        recordedById: adminUserId,
        occurredAt: at(item.openingDaysAgo, 8, 0),
      },
    });
  }

  // Ensure Soda and Water are also active at Canteen
  const canteenSharedProducts = [
    { key: "soda-300ml", price: "60.00", opening: "144", openingDaysAgo: 5 },
    { key: "water-500ml", price: "50.00", opening: "80", openingDaysAgo: 4 },
  ];

  for (const item of canteenSharedProducts) {
    const prodId = menuProducts[item.key];
    await prisma.productLocation.upsert({
      where: { productId_locationId: { productId: prodId, locationId: canteenId } },
      update: { sellingPrice: item.price, active: true },
      create: {
        productId: prodId,
        locationId: canteenId,
        sellingPrice: item.price,
        active: true,
      },
    });

    await prisma.stockMovement.upsert({
      where: { id: `seed-sm-canteen-open-${item.key}` },
      update: {},
      create: {
        id: `seed-sm-canteen-open-${item.key}`,
        productId: prodId,
        locationId: canteenId,
        movementType: "opening",
        quantity: item.opening,
        recordedById: adminUserId,
        occurredAt: at(item.openingDaysAgo, 8, 0),
      },
    });
  }

  // Receipt of 48 Soda at Canteen (2 days ago)
  await prisma.stockMovement.upsert({
    where: { id: "seed-sm-canteen-receipt-soda" },
    update: {},
    create: {
      id: "seed-sm-canteen-receipt-soda",
      productId: menuProducts["soda-300ml"],
      locationId: canteenId,
      movementType: "purchase_receipt",
      quantity: "48",
      recordedById: canteenAttendantId,
      occurredAt: at(2, 10, 0),
    },
  });

  // Helper to record a seeded stock count idempotently
  async function seedStockCount(opts: {
    id: string;
    productId: string;
    countedQuantity: string;
    soldQuantity: string;
    unitPrice: string;
    occurredAt: Date;
  }) {
    const exists = await prisma.stockCount.findUnique({ where: { id: opts.id } });
    if (exists) return;

    await prisma.stockCount.create({
      data: {
        id: opts.id,
        productId: opts.productId,
        locationId: canteenId,
        countedById: canteenAttendantId,
        countedQuantity: opts.countedQuantity,
        occurredAt: opts.occurredAt,
      },
    });

    const sold = Number(opts.soldQuantity);
    if (sold > 0) {
      await prisma.stockMovement.create({
        data: {
          id: `seed-sm-count-sale-${opts.id}`,
          productId: opts.productId,
          locationId: canteenId,
          movementType: "sale",
          quantity: `-${opts.soldQuantity}`,
          stockCountId: opts.id,
          recordedById: canteenAttendantId,
          occurredAt: opts.occurredAt,
        },
      });

      const revenue = (sold * Number(opts.unitPrice)).toFixed(2);
      await prisma.moneyMovement.create({
        data: {
          account: "cash",
          amount: revenue,
          sourceType: "canteen_sale",
          sourceId: opts.id,
          recordedById: canteenAttendantId,
          occurredAt: opts.occurredAt,
        },
      });
    }
  }

  // Stock Counts matching Paper GL2-0 / Walkthroughs:
  // 1. Soda (3 days ago: count 96, sold 48)
  await seedStockCount({
    id: "seed-count-soda-1",
    productId: menuProducts["soda-300ml"],
    countedQuantity: "96",
    soldQuantity: "48",
    unitPrice: "60.00",
    occurredAt: at(3, 17, 0),
  });

  // 2. Soda (1 day ago: count 96, sold 48; total period Mon-Thu sold 96, revenue 5,760.00)
  await seedStockCount({
    id: "seed-count-soda-2",
    productId: menuProducts["soda-300ml"],
    countedQuantity: "96",
    soldQuantity: "48",
    unitPrice: "60.00",
    occurredAt: at(1, 17, 0),
  });

  // 3. Water (1 day ago: count 40, sold 40, revenue 2,000.00)
  await seedStockCount({
    id: "seed-count-water-1",
    productId: menuProducts["water-500ml"],
    countedQuantity: "40",
    soldQuantity: "40",
    unitPrice: "50.00",
    occurredAt: at(1, 17, 0),
  });

  // 4. Mandazi (today: count 26, sold 34, revenue 680.00)
  const mandaziProduct = await prisma.product.findUnique({ where: { id: "seed-product-mandazi" } });
  if (mandaziProduct) {
    await seedStockCount({
      id: "seed-count-mandazi-1",
      productId: mandaziProduct.id,
      countedQuantity: "26",
      soldQuantity: "34",
      unitPrice: "20.00",
      occurredAt: at(0, 15, 0),
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
