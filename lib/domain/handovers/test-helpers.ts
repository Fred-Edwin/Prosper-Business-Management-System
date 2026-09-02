import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Shared fixtures for the handovers domain tests (the
 * `lib/domain/customers` / `lib/domain/sales` pattern). Vitest runs test
 * files in parallel workers against one Postgres, so each suite
 * namespaces its rows with a unique `scope` prefix and cleans up only its
 * own.
 *
 * Provides: one active Restaurant `Location`; two `cashier` users each
 * linked to a `Staff` row at that location (for the cross-staff isolation
 * test); a `canteen_attendant` at a second `Canteen` location; one
 * `admin` (no `Staff` link).
 *
 * `DayClose.date` is `@unique` with no scope column — suites that seal a
 * date use fixed far-past dates (2019-…) and cleanup removes `dayClose`
 * rows by `closedBy IN (suite user ids)` (Session 1 test-hygiene note).
 * `AuditLog.userId` RESTRICTs — audit rows are deleted before users.
 */

export const TEST_PREFIX_BASE = "__handovers_test__";

export type HandoversTestCtx = {
  prefix: string;
  restaurantId: string;
  canteenId: string;
  adminId: string;
  /** Cashier A — user id + their `Staff` id. */
  cashierId: string;
  cashierStaffId: string;
  /** Cashier B — the "other staff member" for isolation tests. */
  cashier2Id: string;
  cashier2StaffId: string;
  attendantId: string;
  attendantStaffId: string;
};

function prefixFor(scope: string): string {
  return `${TEST_PREFIX_BASE}${scope}__`;
}

export async function setupHandoversTestData(
  scope: string,
): Promise<HandoversTestCtx> {
  const prefix = prefixFor(scope);
  await cleanupHandoversTestData(scope);

  const restaurant = await prisma.location.create({
    data: { name: `${prefix} Restaurant`, type: "restaurant", active: true },
  });
  const canteen = await prisma.location.create({
    data: { name: `${prefix} Canteen`, type: "canteen", active: true },
  });

  const admin = await prisma.user.create({
    data: { name: `${prefix} Admin`, pinHash: "x", role: "admin", active: true },
  });

  const mkStaffUser = async (
    name: string,
    role: "cashier" | "canteen_attendant",
    locationId: string,
  ) => {
    const staff = await prisma.staff.create({
      data: {
        name: `${prefix} ${name}`,
        role,
        locationId,
        dailyRate: new Prisma.Decimal("0"),
        active: true,
      },
    });
    const user = await prisma.user.create({
      data: {
        name: `${prefix} ${name}`,
        pinHash: "x",
        role,
        active: true,
        staffId: staff.id,
      },
    });
    return { userId: user.id, staffId: staff.id };
  };

  const cashier = await mkStaffUser("Cashier A", "cashier", restaurant.id);
  const cashier2 = await mkStaffUser("Cashier B", "cashier", restaurant.id);
  const attendant = await mkStaffUser(
    "Attendant",
    "canteen_attendant",
    canteen.id,
  );

  return {
    prefix,
    restaurantId: restaurant.id,
    canteenId: canteen.id,
    adminId: admin.id,
    cashierId: cashier.userId,
    cashierStaffId: cashier.staffId,
    cashier2Id: cashier2.userId,
    cashier2StaffId: cashier2.staffId,
    attendantId: attendant.userId,
    attendantStaffId: attendant.staffId,
  };
}

export async function cleanupHandoversTestData(scope: string): Promise<void> {
  const prefix = prefixFor(scope);

  const users = await prisma.user.findMany({
    where: { name: { startsWith: prefix } },
    select: { id: true },
  });
  const userIds = users.map((u) => u.id);

  const handovers = await prisma.handover.findMany({
    where: { location: { name: { startsWith: prefix } } },
    select: { id: true },
  });
  const handoverIds = handovers.map((h) => h.id);

  if (handoverIds.length > 0) {
    const receipts = await prisma.receiptOfHandover.findMany({
      where: { handoverId: { in: handoverIds } },
      select: { id: true },
    });
    const receiptIds = receipts.map((r) => r.id);
    if (receiptIds.length > 0) {
      await prisma.handoverShortfall.deleteMany({
        where: { receiptOfHandoverId: { in: receiptIds } },
      });
      await prisma.receiptOfHandover.deleteMany({
        where: { id: { in: receiptIds } },
      });
    }
    // Correction rows point at originals — clear the FK before deleting.
    await prisma.handover.updateMany({
      where: { id: { in: handoverIds } },
      data: { correctsHandoverId: null },
    });
    await prisma.handover.deleteMany({ where: { id: { in: handoverIds } } });
  }

  if (userIds.length > 0) {
    await prisma.dayClose.deleteMany({ where: { closedBy: { in: userIds } } });
    await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
  }
  await prisma.user.deleteMany({ where: { name: { startsWith: prefix } } });
  await prisma.staff.deleteMany({ where: { name: { startsWith: prefix } } });
  await prisma.location.deleteMany({ where: { name: { startsWith: prefix } } });
}
