# Sprint 01 — Foundation

**Type:** Single sprint (infrastructure — does not follow the
Design/Development/QA pattern; no user-facing flow to design or test
adversarially at this stage).
**Milestone:** 0 — Foundation
**Status:** not started

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
