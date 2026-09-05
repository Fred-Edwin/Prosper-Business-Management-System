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
function testWorkerSchema(): string | undefined {
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
