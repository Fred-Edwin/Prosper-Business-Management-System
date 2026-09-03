import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { DomainError } from "./errors";
import {
  createLocation,
  deactivateLocation,
  listLocations,
  updateLocation,
} from "./locations";

/**
 * Locations CRUD (M4). Self-scoped: every row this suite writes is named
 * with `PREFIX` and cleaned up by name, mirroring the parallel-safe
 * pattern in `test-helpers.ts`. Stock movements and staff are FK'd to the
 * test locations, so they're cleared first.
 */
const PREFIX = "__locations_crud_test__ ";

async function cleanup(): Promise<void> {
  const locs = await prisma.location.findMany({
    where: { name: { startsWith: PREFIX } },
    select: { id: true },
  });
  const ids = locs.map((l) => l.id);
  const staff = await prisma.staff.findMany({
    where: { name: { startsWith: PREFIX } },
    select: { id: true },
  });
  const staffIds = staff.map((s) => s.id);
  if (staffIds.length > 0) {
    await prisma.user.deleteMany({ where: { staffId: { in: staffIds } } });
    await prisma.staff.deleteMany({ where: { id: { in: staffIds } } });
  }
  if (ids.length > 0) {
    await prisma.stockMovement.deleteMany({
      where: {
        OR: [
          { locationId: { in: ids } },
          { transferCounterpartLocationId: { in: ids } },
        ],
      },
    });
    const prods = await prisma.product.findMany({
      where: { name: { startsWith: PREFIX } },
      select: { id: true },
    });
    await prisma.productLocation.deleteMany({
      where: { locationId: { in: ids } },
    });
    await prisma.product.deleteMany({
      where: { id: { in: prods.map((p) => p.id) } },
    });
    await prisma.location.deleteMany({ where: { id: { in: ids } } });
  }
}

async function makeProduct(): Promise<string> {
  const p = await prisma.product.create({
    data: {
      name: `${PREFIX}Widget ${Math.random()}`,
      kind: "goods",
      unitLabel: "pcs",
      buyingPrice: new Prisma.Decimal("10.00"),
    },
  });
  return p.id;
}

beforeEach(cleanup);
afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("createLocation", () => {
  it("creates an active location, trimming the name", async () => {
    const loc = await createLocation({
      name: `  ${PREFIX}Kiosk  `,
      type: "canteen",
    });
    expect(loc.name).toBe(`${PREFIX}Kiosk`);
    expect(loc.type).toBe("canteen");
    expect(loc.active).toBe(true);
  });

  it("rejects an empty name with VALIDATION_ERROR", async () => {
    await expect(createLocation({ name: "   ", type: "store" })).rejects.toThrow(
      DomainError,
    );
  });

  it("rejects a case-insensitive duplicate name with CONFLICT", async () => {
    await createLocation({ name: `${PREFIX}Depot`, type: "store" });
    await expect(
      createLocation({ name: `${PREFIX}DEPOT`, type: "store" }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("rejects a bad type", async () => {
    await expect(
      // @ts-expect-error — exercising the runtime guard
      createLocation({ name: `${PREFIX}Bad`, type: "warehouse" }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "type" });
  });
});

describe("updateLocation", () => {
  it("renames and retypes in place", async () => {
    const loc = await createLocation({ name: `${PREFIX}A`, type: "store" });
    const out = await updateLocation(loc.id, {
      name: `${PREFIX}A renamed`,
      type: "canteen",
    });
    expect(out.name).toBe(`${PREFIX}A renamed`);
    expect(out.type).toBe("canteen");
  });

  it("NOT_FOUND for a missing id", async () => {
    await expect(
      updateLocation("nope-does-not-exist", { name: `${PREFIX}x` }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects renaming onto another location's name (CONFLICT)", async () => {
    await createLocation({ name: `${PREFIX}One`, type: "store" });
    const two = await createLocation({ name: `${PREFIX}Two`, type: "store" });
    await expect(
      updateLocation(two.id, { name: `${PREFIX}one` }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("allows a location to keep its own name on an unrelated edit", async () => {
    const loc = await createLocation({ name: `${PREFIX}Keep`, type: "store" });
    const out = await updateLocation(loc.id, {
      name: `${PREFIX}Keep`,
      type: "canteen",
    });
    expect(out.type).toBe("canteen");
  });
});

describe("deactivateLocation", () => {
  it("deactivates a clean location and drops it from the active list", async () => {
    const loc = await createLocation({ name: `${PREFIX}Clean`, type: "store" });
    const out = await deactivateLocation(loc.id);
    expect(out.active).toBe(false);

    const active = await listLocations({ activeOnly: true });
    expect(active.find((l) => l.id === loc.id)).toBeUndefined();
    const all = await listLocations({ activeOnly: false });
    expect(all.find((l) => l.id === loc.id)?.active).toBe(false);
  });

  it("is idempotent — deactivating an inactive location is a no-op success", async () => {
    const loc = await createLocation({ name: `${PREFIX}Idem`, type: "store" });
    await deactivateLocation(loc.id);
    const again = await deactivateLocation(loc.id);
    expect(again.active).toBe(false);
  });

  it("BLOCKS on active staff assigned to the location (CONFLICT)", async () => {
    const loc = await createLocation({ name: `${PREFIX}Staffed`, type: "store" });
    await prisma.staff.create({
      data: {
        name: `${PREFIX}Worker`,
        role: "store_manager",
        locationId: loc.id,
        dailyRate: new Prisma.Decimal("500.00"),
        active: true,
      },
    });
    await expect(deactivateLocation(loc.id)).rejects.toMatchObject({
      code: "CONFLICT",
    });
    const still = await prisma.location.findUniqueOrThrow({ where: { id: loc.id } });
    expect(still.active).toBe(true);
  });

  it("does NOT block on an inactive staff member", async () => {
    const loc = await createLocation({ name: `${PREFIX}ExStaff`, type: "store" });
    await prisma.staff.create({
      data: {
        name: `${PREFIX}Gone`,
        role: "cashier",
        locationId: loc.id,
        dailyRate: new Prisma.Decimal("500.00"),
        active: false,
      },
    });
    const out = await deactivateLocation(loc.id);
    expect(out.active).toBe(false);
  });

  it("BLOCKS on non-zero stock on hand (CONFLICT)", async () => {
    const loc = await createLocation({ name: `${PREFIX}Stocked`, type: "store" });
    const recorder = await prisma.user.findFirstOrThrow({
      where: { role: "admin" },
    });
    const productId = await makeProduct();
    await prisma.stockMovement.create({
      data: {
        productId,
        locationId: loc.id,
        movementType: "opening",
        quantity: new Prisma.Decimal("5.0000"),
        recordedById: recorder.id,
        occurredAt: new Date(),
      },
    });
    await expect(deactivateLocation(loc.id)).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("does NOT block when stock nets to zero", async () => {
    const loc = await createLocation({ name: `${PREFIX}Zeroed`, type: "store" });
    const recorder = await prisma.user.findFirstOrThrow({
      where: { role: "admin" },
    });
    const productId = await makeProduct();
    await prisma.stockMovement.createMany({
      data: [
        {
          productId,
          locationId: loc.id,
          movementType: "opening",
          quantity: new Prisma.Decimal("5.0000"),
          recordedById: recorder.id,
          occurredAt: new Date(),
        },
        {
          productId,
          locationId: loc.id,
          movementType: "issue",
          quantity: new Prisma.Decimal("-5.0000"),
          recordedById: recorder.id,
          occurredAt: new Date(),
        },
      ],
    });
    const out = await deactivateLocation(loc.id);
    expect(out.active).toBe(false);
  });

  it("BLOCKS on a pending inbound transfer (CONFLICT)", async () => {
    const from = await createLocation({ name: `${PREFIX}From`, type: "store" });
    const to = await createLocation({ name: `${PREFIX}To`, type: "canteen" });
    const recorder = await prisma.user.findFirstOrThrow({
      where: { role: "admin" },
    });
    const productId = await makeProduct();
    // dispatched from `from`, awaiting receipt at `to` — a `-q` transfer
    // row with no `+q` sibling, counterpart = `to`.
    await prisma.stockMovement.create({
      data: {
        productId,
        locationId: from.id,
        movementType: "transfer",
        quantity: new Prisma.Decimal("-3.0000"),
        recordedById: recorder.id,
        occurredAt: new Date(),
        transferCounterpartLocationId: to.id,
      },
    });
    await expect(deactivateLocation(to.id)).rejects.toMatchObject({
      code: "CONFLICT",
    });
    // `from` also blocks (it dispatched an unresolved transfer) — but only
    // after we clear `from`'s own stock, which the dispatch row left at -3.
    await prisma.stockMovement.create({
      data: {
        productId,
        locationId: from.id,
        movementType: "opening",
        quantity: new Prisma.Decimal("3.0000"),
        recordedById: recorder.id,
        occurredAt: new Date(),
      },
    });
    await expect(deactivateLocation(from.id)).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });
});
