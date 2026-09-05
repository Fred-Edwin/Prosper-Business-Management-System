# Running the test suite

The strategy (what to test, where) is `docs/TEST_PLAN.md`. This file is
the operational bit: how to get `pnpm test` green on your machine.

## TL;DR

```bash
pnpm test          # full suite — creates/migrates/seeds the test DB first
pnpm test:unit     # DB-free lane (jsdom screen specs + pure logic) — fast inner loop
pnpm test:db       # everything that talks to Postgres
```

`pnpm test` and `pnpm test:db` run `pnpm test:setup` first (a `pretest`
script), so there are **no manual steps** — as long as a Postgres server
is reachable at the host/port in `.env.test`.

## The test database (ADR-61)

The suite runs against its **own** database, `prosper_hotel_tests`, never
the dev database (`prosper_hotel`). This keeps `pnpm dev`, a stray
`pnpm prisma:seed`, or a killed test run from shifting the totals the
financial-summary suites assert.

- **`.env.test`** (committed) holds the test `DATABASE_URL`.
  `vitest.shared.ts` loads it with `override: true` so it wins over any
  `DATABASE_URL` already in your shell or `.env`.
- **`scripts/setup-test-db.mjs`** is idempotent and does four things:
  1. Creates `prosper_hotel_tests` if it does not exist.
  2. Creates a **fixed pool of 8 Postgres schemas** inside it
     (`test_worker_1` .. `test_worker_8`) — see "Per-worker schema
     isolation" below.
  3. `prisma migrate deploy` against each schema — the test DB has real
     `_prisma_migrations` history per schema (unlike the dev DB, which
     was built with `db push`).
  4. Seeds each schema (`prisma/seed.ts` is WIPE + REBUILD per schema,
     so re-runs are clean).

## Per-worker schema isolation

`pnpm test:db` runs 8 vitest worker forks against the SAME Postgres
database. Early on, all 8 shared one schema (`public`) — each suite
wrote with its own unique id prefixes, but many reads were unscoped
(an aggregate/count/findFirst/groupBy with no prefix filter), so a
worker running suite A could see rows suite B had just written on
another worker. That's a genuine race, not a bug in any one test:
looping the same code at high parallelism produced different failure
counts and different failing test names on different runs.

The fix is **schema-per-worker**, not just lower parallelism:
`lib/db/index.ts` reads `VITEST_POOL_ID` (vitest's stable, dense,
1-based per-fork-process id — confirmed empirically for vitest 4's
default `pool: "forks"`; unset outside a vitest fork, so `pnpm dev`
and prod are unaffected) and routes the Prisma client to
`test_worker_<id>` instead of `public`. Two workers can now write
whatever they want, however unscoped their reads are — they are in
different schemas, not just different rows of the same one.

**The non-obvious part**: a Postgres connection string's `?schema=`
query param does **nothing** at runtime through `@prisma/adapter-pg` —
`pg` (the driver underneath) has no such connection option and doesn't
set `search_path` from it either, so a client connected that way
silently reads/writes `public` regardless of the param. The only thing
that actually routes the adapter's generated queries to another schema
is `PrismaPg`'s own second constructor argument, `{ schema }`. That's
what `lib/db/index.ts` and `prisma/seed.ts` use. `prisma migrate
deploy` is the one exception — its own engine (unrelated to
`@prisma/adapter-pg`) really does read `?schema=` off the URL, which is
why `scripts/setup-test-db.mjs` uses the URL param for migration and
the `TEST_WORKER_SCHEMA` env var (which `prisma/seed.ts` turns into the
adapter's `{ schema }` option) for seeding.

Migration across the 8 schemas runs **sequentially** — `prisma migrate
deploy`'s advisory lock (`pg_advisory_lock`) is scoped to the whole
database, not the schema, so parallel migrate runs just contend on the
same lock and start timing out (confirmed empirically). Seeding has no
such lock and runs in parallel across all 8 schemas.

`SCHEMA_POOL_SIZE` in `scripts/setup-test-db.mjs` (currently 8) must
stay `>=` the largest `maxWorkers` of any DB-touching vitest config. If
`maxWorkers` is ever raised past 8, raise the pool size too — a worker
whose `VITEST_POOL_ID` exceeds the pool hits a schema that was never
migrated/seeded and fails loudly, rather than quietly falling back to
`public` and reintroducing the race.

### Fresh clone / from scratch

1. Start Postgres. Any Postgres 16+ works; the project uses
   `postgres:18-alpine` on `localhost:5432` with role `prosper` /
   password `prosper` (same server as the dev DB). For example:
   ```bash
   docker run -d --name prosper-postgres \
     -e POSTGRES_USER=prosper -e POSTGRES_PASSWORD=prosper \
     -e POSTGRES_DB=prosper_hotel -p 5432:5432 postgres:18-alpine
   ```
2. Run the suite. The first run creates + migrates + seeds the test DB:
   ```bash
   pnpm install
   pnpm test
   ```

If your Postgres is somewhere else, edit `DATABASE_URL` in `.env.test`
(host, port, user, password) before step 2. The database name at the end
of the URL (`prosper_hotel_tests`) is what the setup script creates — it
does not have to exist yet.

### Re-seeding / resetting the test DB

`pnpm test:setup` on its own re-applies migrations and re-seeds. To wipe
it entirely:

```bash
psql "$DATABASE_URL_ADMIN" -c 'DROP DATABASE IF EXISTS prosper_hotel_tests;'
# or: docker exec <postgres-container> psql -U prosper -d postgres \
#       -c 'DROP DATABASE IF EXISTS prosper_hotel_tests;'
pnpm test:setup
```

## Why a suite might depend on seed data

`tests/integration/m1-flows/*` look up the seed users by their stable
`name` (`Admin`, `Store Manager`, `Cashier`, `Canteen Attendant`) and the
fixed `seed-location-*` ids. That is why the test DB is **seeded**, not
just migrated. Renaming a seed user or changing those location ids is a
test-breaking change — update the flow helpers in the same commit.

## Lanes and the worker cap

See the comments in `vitest.shared.ts`. Short version: `.env.test`'s
`DATABASE_URL` pins each worker's Prisma pool to `connection_limit=5`
(Prisma's default without it is `num_cpus * 2 + 1`, ~17 per fork, which
would overrun Postgres' 100-connection ceiling well before 8 forks).
`test:db` runs at `maxWorkers: 8`; `test` (the full, single-invocation
lane CI/pre-push use) stays at `maxWorkers: 2`. Both are safe from the
cross-worker read race described above regardless of worker count, since
each worker gets its own schema — the worker cap here is purely about
Postgres connection budget, not correctness. `test:unit` touches no DB
and runs at full parallelism.
