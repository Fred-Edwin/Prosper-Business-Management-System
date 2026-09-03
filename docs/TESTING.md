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
- **`scripts/setup-test-db.mjs`** is idempotent and does three things:
  1. Creates `prosper_hotel_tests` if it does not exist.
  2. `prisma migrate deploy` — the test DB has real `_prisma_migrations`
     history (unlike the dev DB, which was built with `db push`).
  3. Seeds it (`prisma/seed.ts` is WIPE + REBUILD, so re-runs are clean).

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

See the comments in `vitest.shared.ts`. Short version: `test` / `test:db`
are capped at 2 workers because each vitest worker fork opens its own
Prisma pool (~17 connections) and 8 forks would overrun Postgres'
100-connection ceiling. `test:unit` touches no DB and runs at full
parallelism.
