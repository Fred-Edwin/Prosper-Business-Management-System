import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { DomainError } from "@/lib/domain/catalog/errors";
import { resolveActingAs, listActingAsLocations } from "./acting-as";

/**
 * `resolveActingAs` — the backend validator behind `POST /api/auth/acting-as`
 * and the JWT `update` trigger. See
 * `docs/sprints/role-switching-session-1-handoff.md`.
 */

const PREFIX = "__acting_as_test__";

describe("resolveActingAs", () => {
  let storeA: string;
  let storeB: string;
  let restaurant: string;
  let inactiveStore: string;

  beforeAll(async () => {
    const [a, b, r, inactive] = await Promise.all([
      prisma.location.create({
        data: { name: `${PREFIX} Store A`, type: "store" },
      }),
      prisma.location.create({
        data: { name: `${PREFIX} Store B`, type: "store" },
      }),
      prisma.location.create({
        data: { name: `${PREFIX} Restaurant`, type: "restaurant" },
      }),
      prisma.location.create({
        data: { name: `${PREFIX} Old Store`, type: "store", active: false },
      }),
    ]);
    storeA = a.id;
    storeB = b.id;
    restaurant = r.id;
    inactiveStore = inactive.id;
  });

  afterAll(async () => {
    await prisma.location.deleteMany({ where: { name: { startsWith: PREFIX } } });
    await prisma.$disconnect();
  });

  it("a non-admin real role → FORBIDDEN", async () => {
    await expect(
      resolveActingAs("store_manager", "cashier", restaurant),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("role: null → clears both fields", async () => {
    await expect(resolveActingAs("admin", null, undefined)).resolves.toEqual({
      actingAs: null,
      actingLocationId: null,
    });
  });

  it("role: admin → treated the same as clearing", async () => {
    await expect(resolveActingAs("admin", "admin", undefined)).resolves.toEqual({
      actingAs: null,
      actingLocationId: null,
    });
  });

  it("staff role without a locationId → VALIDATION_ERROR on locationId", async () => {
    await expect(
      resolveActingAs("admin", "store_manager", undefined),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "locationId" });
  });

  it("resolves a valid active location of the matching type", async () => {
    await expect(
      resolveActingAs("admin", "store_manager", storeA),
    ).resolves.toEqual({
      actingAs: "store_manager",
      actingLocationId: storeA,
      locationName: `${PREFIX} Store A`,
    });
  });

  it("rejects a location whose type does not match the role", async () => {
    await expect(
      resolveActingAs("admin", "store_manager", restaurant),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "locationId" });
  });

  it("rejects an inactive location", async () => {
    await expect(
      resolveActingAs("admin", "store_manager", inactiveStore),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("rejects a nonexistent location id", async () => {
    await expect(
      resolveActingAs(
        "admin",
        "store_manager",
        "00000000-0000-0000-0000-000000000000",
      ),
    ).rejects.toBeInstanceOf(DomainError);
  });

  it("listActingAsLocations returns every active location of the role's type", async () => {
    const stores = await listActingAsLocations("store_manager");
    const ours = stores.filter((l) => l.name.startsWith(PREFIX));
    expect(ours.map((l) => l.id).sort()).toEqual([storeA, storeB].sort());
    // the inactive one is not listed
    expect(ours.some((l) => l.id === inactiveStore)).toBe(false);
  });
});
