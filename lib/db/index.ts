import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// `pnpm test:db` / `pnpm test` run every suite's Postgres reads/writes
// through THIS singleton (no per-test client), so this is the one place
// that needs to route each vitest worker fork to its own schema.
//
// Vitest (pool: "forks", the default) sets VITEST_POOL_ID per fork — a
// dense, 1-based index (confirmed empirically: 4 forks produced
// VITEST_POOL_ID 1..4, stable for the fork's lifetime; VITEST_WORKER_ID
// is the same slot but 0-based). Outside a vitest fork it's undefined, so
// dev (`pnpm dev`) and prod are byte-for-byte identical to before this
// change — this branch only ever fires under `pnpm test`/`test:db`/`test:e2e`.
//
// IMPORTANT (found the hard way): a Postgres connection string's
// `?schema=` query param does nothing at runtime — `pg` (the driver
// `@prisma/adapter-pg` sits on) has no such connection option, and
// Postgres's `search_path` isn't set by it either, so a connection made
// this way silently reads/writes `public` regardless of the param. The
// only mechanism `@prisma/adapter-pg` actually honors is the adapter's
// own SECOND constructor argument, `{ schema }` — "the schema to use in
// generated queries" — which is what's used below. `prisma migrate
// deploy`'s OWN engine is unrelated: it parses `?schema=` from the URL
// itself (see scripts/setup-test-db.mjs), so the two tools need the
// schema communicated to them in two different ways.
//
// scripts/setup-test-db.mjs pre-creates and migrates a fixed pool of
// schemas named with this same `test_worker_<n>` pattern (see that file
// for why a fixed pool beats lazy per-worker provisioning). Keep the two
// naming schemes in sync if either changes.
//
// PRISMA_SCHEMA_OVERRIDE is the one escape hatch: the long-horizon
// simulation lane (vitest.sim.config.ts) runs single-fork against its
// OWN database (`prosper_hotel_sim`), which has no `test_worker_*`
// schemas — only `public`. It still runs under vitest, so
// VITEST_POOL_ID is set (to 1) and this function would otherwise route
// it to a schema that does not exist there. Setting the override to
// "public" opts that lane out explicitly, without weakening the
// per-worker isolation every other DB-touching lane depends on.
function testWorkerSchema(): string | undefined {
  const override = process.env.PRISMA_SCHEMA_OVERRIDE;
  if (override) return override;
  const poolId = process.env.VITEST_POOL_ID;
  return poolId ? `test_worker_${poolId}` : undefined;
}

function createPrismaClient() {
  const schema = testWorkerSchema();
  const adapter = new PrismaPg(
    { connectionString: process.env.DATABASE_URL },
    schema ? { schema } : undefined,
  );
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
