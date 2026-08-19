# Sprint 01 — Foundation

**Type:** Single sprint (infrastructure — does not follow the
Design/Development/QA pattern; no user-facing flow to design or test
adversarially at this stage).
**Milestone:** 0 — Foundation
**Status:** done

---

## Scope

- Next.js (App Router, TypeScript) project scaffold per `ARCHITECTURE.md`
  / `CONVENTIONS.md` folder structure (`app/`, `lib/domain/*`,
  `lib/validation/`, `lib/auth/`, `lib/db/`, `prisma/`).
- Full `prisma/schema.prisma` covering every entity in `SCHEMA.md` (all
  tables, enums, relations) and an initial migration.
- Auth.js (NextAuth) credentials-based login, database-backed sessions,
  four roles (`admin`, `store_manager`, `cashier`, `canteen_attendant`),
  server-side role checks wired at the middleware/route level.
- Empty role-scoped route groups (`(admin)`, `(store-manager)`,
  `(cashier)`, `(canteen)`) with a basic authenticated shell/nav per
  role — no real screens yet, just proof that routing + role-gating
  works.
- PWA manifest + service worker for installability only (no offline
  sync, per ADR-7).
- Seed script: one user per role, the three locations
  (Restaurant/Canteen/Store), a handful of sample products.
- `lib/time` helper for the fixed `Africa/Nairobi` business-day constant
  (ADR-29), used by nothing yet but established here since every later
  ledger feature depends on it.
- Zod validation setup convention (shared schema pattern, ADR-28) — no
  real schemas yet, just the pattern/example.

## Acceptance Criteria

- `npx prisma migrate dev` runs clean against a local Postgres instance
  and produces every table in `SCHEMA.md`.
- A seeded user of each role can log in and lands on their own
  role-scoped shell; an unauthenticated request to any role route
  redirects to login.
- A `store_manager` cannot access `(admin)` routes (server-side check,
  not just hidden nav).
- App is installable as a PWA (manifest + service worker present,
  Lighthouse installability check passes).
- `lib/time` correctly converts a UTC timestamp to its Africa/Nairobi
  business date.
- No business logic in `app/api/*` — enforced by having zero non-auth
  API routes yet (they arrive with each feature).
- **Tests:** unit tests for the `lib/time` business-day conversion; a
  basic auth/session test confirming role-gating redirects correctly.

---

## Session notes (2026-08-19 — implementation)

All scope items built; all acceptance criteria verified (migration
clean, seeded users of each role log in and land on their own shell,
`store_manager` blocked from `/admin` server-side, manifest/service
worker serve correctly, `lib/time` unit-tested, zero non-auth API
routes, full test suite passing — see `docs/PROGRESS.md` for the run).

Two deviations from the scope as originally written, both decided with
the user mid-session and recorded in `DECISIONS.md` ADR-5 addenda:

1. **Login is unique display name + 4-digit PIN, not email + password.**
   User-requested change: this is a shared-device till app, not a
   general web login. `SCHEMA.md`'s `User` table updated accordingly
   (`name`, `pin_hash`, `failed_pin_attempts`, `locked_until` for
   brute-force lockout on the small PIN keyspace).
2. **Sessions are JWT, not database-backed.** next-auth v4's Credentials
   provider only supports JWT strategy — incompatible with ADR-5's
   original "database sessions" decision, discovered during
   implementation. Instant revocation (the reason for wanting database
   sessions) is preserved via a DB re-check of `User.active` on every
   session read instead.

Also discovered and fixed during the session (not scope changes, just
corrections to how the existing scope was expressed):

- `app/(admin)/` etc. as literally specified in `CONVENTIONS.md` used
  Next.js route-group syntax, which produces no URL segment — all four
  role folders would have collided on `/`. Fixed to plain
  `app/admin/`, `app/store-manager/`, `app/cashier/`, `app/canteen/`;
  `CONVENTIONS.md` updated to match and explains why.
- Next.js 16 deprecated the `middleware.ts` convention in favor of
  `proxy.ts` (same role: unauthenticated fast-path redirect before the
  authoritative server-side check in each layout).
- Prisma 7 requires a driver adapter (`@prisma/adapter-pg`) and
  `prisma.config.ts` — `datasource.url` in `schema.prisma` is no longer
  supported.

Icons for the PWA manifest were carried forward from `carry-forward/brand/`
(a prior failed build's assets) as a functional placeholder — real
branding is a Design Sprint decision, not made here.
