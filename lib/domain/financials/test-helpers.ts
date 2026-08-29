import { prisma } from "@/lib/db";

/**
 * Shared fixtures for the financials domain tests.
 *
 * Vitest runs test *files* in parallel workers against the one local
 * Postgres, so each suite namespaces its rows with a unique `scope` prefix
 * and only ever cleans up its own (the `lib/domain/catalog` pattern). Pass
 * e.g. `"record"`, `"balances"`.
 *
 * The money ledger has no product/location dependency — a `MoneyMovement`
 * only needs a `recordedBy` user — so the fixture is just a couple of
 * users. Rows are matched for cleanup by `sourceId` prefix, which every
 * financials test sets to `${prefix}...`.
 */

export const TEST_PREFIX_BASE = "__financials_test__";

export type FinancialsTestCtx = {
  prefix: string;
  /** An `admin` user — the actor on ledger writes in tests. */
  actorId: string;
  /** A second user — a "different actor". */
  otherActorId: string;
};

function prefixFor(scope: string): string {
  return `${TEST_PREFIX_BASE}${scope}__`;
}

export async function setupFinancialsTestData(
  scope: string,
): Promise<FinancialsTestCtx> {
  const prefix = prefixFor(scope);
  await cleanupFinancialsTestData(scope);

  const actor = await prisma.user.create({
    data: { name: `${prefix} Actor`, pinHash: "x", role: "admin", active: true },
  });
  const otherActor = await prisma.user.create({
    data: {
      name: `${prefix} Other`,
      pinHash: "x",
      role: "cashier",
      active: true,
    },
  });

  return { prefix, actorId: actor.id, otherActorId: otherActor.id };
}

export async function cleanupFinancialsTestData(scope: string): Promise<void> {
  const prefix = prefixFor(scope);

  const users = await prisma.user.findMany({
    where: { name: { startsWith: prefix } },
    select: { id: true },
  });
  const userIds = users.map((u) => u.id);

  const rows = await prisma.moneyMovement.findMany({
    where: { sourceId: { startsWith: prefix } },
    select: { id: true },
  });
  const ids = rows.map((r) => r.id);

  if (ids.length > 0) {
    await prisma.moneyMovement.updateMany({
      where: { id: { in: ids } },
      data: { correctsMovementId: null },
    });
    await prisma.moneyMovement.deleteMany({ where: { id: { in: ids } } });
  }

  // AuditLog RESTRICTs on `user_id`; clear by this suite's users.
  if (userIds.length > 0) {
    await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
  }
  await prisma.user.deleteMany({ where: { name: { startsWith: prefix } } });
}
