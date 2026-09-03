import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Shared fixtures for the staff domain tests.
 *
 * Vitest runs test files in parallel workers against the one local
 * Postgres, so each suite namespaces its rows with a unique `scope` prefix
 * and only ever cleans up its own (the `lib/domain/customers` pattern).
 *
 * The world is: one active Admin `User` (the actor), two active locations,
 * and nothing else — each test creates the staff it needs via `createStaff`
 * or directly.
 */

export const TEST_PREFIX_BASE = "__staff_test__";

export type StaffTestCtx = {
  prefix: string;
  adminId: string;
  locationAId: string;
  locationBId: string;
  inactiveLocationId: string;
};

function prefixFor(scope: string): string {
  return `${TEST_PREFIX_BASE}${scope}__`;
}

export async function setupStaffWorld(scope: string): Promise<StaffTestCtx> {
  const prefix = prefixFor(scope);
  await cleanupStaffTestData(scope);

  const admin = await prisma.user.create({
    data: {
      name: `${prefix} Admin`,
      pinHash: "x",
      role: "admin",
      active: true,
    },
  });
  const locA = await prisma.location.create({
    data: { name: `${prefix} Loc A`, type: "restaurant" },
  });
  const locB = await prisma.location.create({
    data: { name: `${prefix} Loc B`, type: "canteen" },
  });
  const locInactive = await prisma.location.create({
    data: { name: `${prefix} Loc Inactive`, type: "store", active: false },
  });

  return {
    prefix,
    adminId: admin.id,
    locationAId: locA.id,
    locationBId: locB.id,
    inactiveLocationId: locInactive.id,
  };
}

/** Create a bare `Staff` row (no login) directly, for read/attendance/pay tests. */
export async function makeBareStaff(
  ctx: StaffTestCtx,
  overrides: Partial<{
    name: string;
    role: "store_manager" | "cashier" | "canteen_attendant";
    locationId: string;
    dailyRate: string;
    active: boolean;
  }> = {},
): Promise<string> {
  const staff = await prisma.staff.create({
    data: {
      name: overrides.name ?? `${ctx.prefix} Worker ${Math.random()}`,
      role: overrides.role ?? "cashier",
      locationId: overrides.locationId ?? ctx.locationAId,
      dailyRate: new Prisma.Decimal(overrides.dailyRate ?? "500.00"),
      active: overrides.active ?? true,
    },
  });
  return staff.id;
}

export async function cleanupStaffTestData(scope: string): Promise<void> {
  const prefix = prefixFor(scope);

  const staff = await prisma.staff.findMany({
    where: {
      OR: [
        { name: { startsWith: prefix } },
        { location: { name: { startsWith: prefix } } },
      ],
    },
    select: { id: true },
  });
  const staffIds = staff.map((s) => s.id);

  if (staffIds.length > 0) {
    await prisma.attendance.deleteMany({ where: { staffId: { in: staffIds } } });
    await prisma.staffPayAdjustment.deleteMany({
      where: { staffId: { in: staffIds } },
    });
  }

  // Audit rows written by this suite belong to its users (the Admin actor,
  // and any staff-linked User created via `createStaff`). Clear by userId.
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { name: { startsWith: prefix } },
        { staffId: { in: staffIds } },
      ],
    },
    select: { id: true },
  });
  const userIds = users.map((u) => u.id);
  if (userIds.length > 0) {
    await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
  }

  if (staffIds.length > 0) {
    await prisma.user.deleteMany({ where: { staffId: { in: staffIds } } });
    await prisma.staff.deleteMany({ where: { id: { in: staffIds } } });
  }
  await prisma.user.deleteMany({ where: { name: { startsWith: prefix } } });
  await prisma.location.deleteMany({ where: { name: { startsWith: prefix } } });
}
