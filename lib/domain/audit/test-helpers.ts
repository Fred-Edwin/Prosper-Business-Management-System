import { prisma } from "@/lib/db";

/**
 * Fixtures for the audit domain tests. Vitest runs test files in parallel
 * against one Postgres, so each suite namespaces its rows with a unique
 * `scope` prefix and cleans up only its own (the `lib/domain/catalog`
 * pattern).
 *
 * `DayClose.date` is `@unique` with no scope column, so every audit test
 * uses **fixed historical dates well outside any range another suite
 * touches** (2019-…) and this cleanup removes exactly those rows plus the
 * `AuditLog` rows the suite's users wrote.
 */

export const TEST_PREFIX_BASE = "__audit_test__";

export type AuditTestCtx = {
  prefix: string;
  adminId: string;
  staffId: string;
};

function prefixFor(scope: string): string {
  return `${TEST_PREFIX_BASE}${scope}__`;
}

export async function setupAuditTestData(scope: string): Promise<AuditTestCtx> {
  const prefix = prefixFor(scope);
  await cleanupAuditTestData(scope);

  const admin = await prisma.user.create({
    data: { name: `${prefix} Admin`, pinHash: "x", role: "admin", active: true },
  });
  const staff = await prisma.user.create({
    data: {
      name: `${prefix} Staff`,
      pinHash: "x",
      role: "store_manager",
      active: true,
    },
  });

  return { prefix, adminId: admin.id, staffId: staff.id };
}

export async function cleanupAuditTestData(scope: string): Promise<void> {
  const prefix = prefixFor(scope);

  const users = await prisma.user.findMany({
    where: { name: { startsWith: prefix } },
    select: { id: true },
  });
  const userIds = users.map((u) => u.id);

  if (userIds.length > 0) {
    await prisma.dayClose.deleteMany({ where: { closedBy: { in: userIds } } });
    await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
  }
  await prisma.user.deleteMany({ where: { name: { startsWith: prefix } } });
}
