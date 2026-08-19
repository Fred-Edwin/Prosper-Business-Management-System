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
  const [restaurant, canteen, store] = await Promise.all([
    prisma.location.upsert({
      where: { id: "seed-location-restaurant" },
      update: {},
      create: { id: "seed-location-restaurant", name: "Restaurant", type: "restaurant" },
    }),
    prisma.location.upsert({
      where: { id: "seed-location-canteen" },
      update: {},
      create: { id: "seed-location-canteen", name: "Canteen", type: "canteen" },
    }),
    prisma.location.upsert({
      where: { id: "seed-location-store" },
      update: {},
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

  console.log("Seed complete.");
  console.log(`Admin: "Admin" / PIN 1234 (user id ${adminUser.id})`);
  for (const s of staffSeeds) {
    console.log(`${s.role}: "${s.name}" / PIN 1234`);
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
