# Prosper — Progress Log

Running status log, updated at the end of every sprint session: what
shipped, what's blocked, what changed from plan.

---

## 2026-08-19 — Planning & repo setup

- Phase 0 (Discovery) and Phase 1 (Planning: PRD, Architecture, Roadmap)
  complete — see `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/API.md`,
  `docs/SCHEMA.md`, `docs/DECISIONS.md`, `docs/CONVENTIONS.md`,
  `docs/TEST_PLAN.md`, `docs/ROADMAP.md`.
- Milestone 1 fully broken into sprints (Sprints 01–11: Foundation,
  Catalog & Locations, Store & Stock Movements, Assets) — see
  `docs/sprints/`.
- Milestone 2 in progress: Restaurant Sales Design Sprint (12) and
  Development Part 1 (13) drafted, not yet written to file. Credit-order
  slice deferred until Customers & Credit lands (sequencing: Restaurant
  Sales → Customers & Credit → Canteen Derived Sales).
- Session 3.5 (Repository & Git Setup) completed: git initialized on
  `main`, single-Next.js-app folder structure established per
  `ARCHITECTURE.md`/`CONVENTIONS.md` (no separate `server/` — deviates
  from sdlc.md's generic template deliberately, since Prosper's approved
  architecture (ADR-2, ADR-6, ADR-8) is a single Vercel-deployed
  modular monolith, not a Vercel+Droplet split).
- **Next:** Sprint 01 (Foundation) — Next.js scaffold, Prisma schema,
  Auth.js, role-scoped shells, PWA manifest, seed data.

---

## 2026-08-19 — Sprint 01 (Foundation) shipped

Full scope built and verified: Next.js (App Router, TS) scaffold on
pnpm; full `prisma/schema.prisma` for every `SCHEMA.md` entity, migrated
clean against local Postgres (Docker); Auth.js credentials login with
server-side role checks on all four role-scoped route shells
(`/admin`, `/store-manager`, `/cashier`, `/canteen`); PWA manifest +
installability-only service worker; seed script (Admin + one user per
role, three locations, sample products); `lib/time` Africa/Nairobi
business-day helper; `lib/validation` Zod pattern example. Zero
non-auth `app/api/*` routes, zero `TODO(mock)` markers (none of this
sprint's scope needed one).

**Test run (`pnpm test`):**
```
 Test Files  3 passed (3)
      Tests  24 passed (24)
```
Covers `lib/time` business-day conversion (incl. the Frankfurt-hosting
guard), the route-role-matching logic behind both the proxy fast-path
and the authoritative server-side check, and the real `authorize()` PIN
flow against Postgres (correct PIN, wrong PIN, unknown user, lockout
after repeated failures, deactivated-user rejection). Role-gating was
also verified manually end-to-end via curl (unauthenticated → redirect
to `/login`; cashier → 200 on `/cashier`, 307 away from `/admin`) and a
full `next build` passed.

**Two decisions made mid-session, diverging from how the sprint scope
was originally written** (both confirmed with the user; full reasoning
in `DECISIONS.md` ADR-5 addenda and `docs/sprints/sprint-01-foundation.md`
session notes):

1. Login is **unique display name + 4-digit PIN**, not email/password —
   user's call, this is a shared-device till app. `SCHEMA.md`'s `User`
   table updated; brute-force lockout added given the small PIN
   keyspace.
2. Sessions are **JWT, not database-backed** — next-auth v4's
   Credentials provider doesn't support database sessions at all
   (discovered during implementation, not a preference). Instant
   revocation is preserved via a live `active` re-check on every
   session read instead.

**Also fixed, not scope changes:** `CONVENTIONS.md`'s literal
`app/(admin)/` route-group syntax would have collided all four role
shells on `/` — corrected to plain `app/admin/` etc., doc updated to
match. Picked up two library-version realities along the way: Next.js
16 renamed `middleware.ts` to `proxy.ts`; Prisma 7 requires a driver
adapter + `prisma.config.ts` instead of `datasource.url`.

PWA icons carried forward from `carry-forward/brand/` (a prior failed
build's assets, now committed to the repo) as a functional placeholder;
real branding is a Design Sprint decision.

**Next:** Sprint 02 (Catalog & Locations — Design).
