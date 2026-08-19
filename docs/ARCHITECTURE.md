# Prosper — Architecture

**Status:** Approved technical foundation. See `DECISIONS.md` for the
reasoning behind each choice below.

---

## 1. Shape

Prosper is a **modular monolith**: a single Next.js (App Router, TypeScript)
application, deployed as one unit, serving both the UI and the API.

```
┌─────────────────────────────────────────────────────────┐
│                     Next.js Application                  │
│                                                            │
│  ┌──────────────────┐        ┌───────────────────────┐   │
│  │   app/ (routes)   │        │   app/api/ (Route      │   │
│  │  Role-scoped UI   │◄──────►│   Handlers — REST)     │   │
│  │  screens          │  fetch │                        │   │
│  └──────────────────┘        └───────────┬───────────┘   │
│                                            │                │
│                               ┌────────────▼────────────┐  │
│                               │  lib/domain/<module>     │  │
│                               │  Business logic, one     │  │
│                               │  folder per module:       │  │
│                               │  catalog, stock, sales,   │  │
│                               │  handovers, financials,   │  │
│                               │  staff, assets, audit     │  │
│                               └────────────┬────────────┘  │
│                                            │                │
│                               ┌────────────▼────────────┐  │
│                               │   Prisma ORM              │  │
│                               └────────────┬────────────┘  │
└────────────────────────────────────────────┼───────────────┘
                                              │
                                   ┌──────────▼──────────┐
                                   │  PostgreSQL (Neon /   │
                                   │  Supabase, managed)   │
                                   └───────────────────────┘
```

There is no separate backend service and no background job runner in v1.
Values like opening stock and derived balances are computed on read, not
pre-written by scheduled jobs (see ADR-11).

---

## 2. Layers

**`app/` — UI routes.** Organized by role-scoped screens (Admin, Store
Manager, Cashier, Canteen Attendant). Server Components fetch data directly
where possible; client interactivity (forms, corrections) uses standard
fetch to the API layer.

**`app/api/` — Route Handlers.** Thin HTTP layer: parses the request,
validates input (Zod), checks authentication + role/ownership authorization,
calls into the domain layer, returns a consistent JSON response or error
shape. Contains no business logic itself.

**`lib/domain/<module>/` — business logic.** One folder per domain module,
matching the entity groups in `SCHEMA.md`: `catalog`, `stock`, `sales`
(orders + canteen counts), `handovers`, `financials` (expenses, owner
transactions, money ledger), `staff`, `assets`, `audit`. This is where rules
live — e.g., "hard-delete is blocked if linked history exists," "a
correction computes its own delta," "day-close locks records for that
date." Kept independent of the HTTP layer so it could be extracted into a
separate service later if ever needed (not currently justified).

**Prisma** — typed data access, migrations, schema source of truth
(`prisma/schema.prisma`).

**PostgreSQL** — single source of truth for all data. Enforces referential
integrity (foreign keys) and exact-decimal money (`NUMERIC`).

---

## 3. Cross-cutting design principles

These apply across every module, not just one:

1. **Ledgers, not stored totals.** Stock levels and money balances are
   never stored as a mutable number — they're computed by summing
   append-only movement/ledger entries. See ADR-14, ADR-17.
2. **Corrections are new entries, never overwrites.** No historical record
   is edited in place once written. A correction is an additional entry
   layered on top; the current value is the sum/derivation across all
   entries including corrections. See ADR-15.
3. **Corrections are Admin-only once a day is closed.** Staff may edit only
   their own same-day entries before close. The UX for a correction is
   "enter the correct final value" — the system computes the delta
   internally; the person entering it never does that math.
4. **Server-side authorization on every request.** Role and ownership
   (`recorded_by`) checks happen in the Route Handler / domain layer, never
   assumed from the frontend hiding a control.
5. **Day boundaries are business-timezone-based, not server-timezone-based.**
   All timestamps are stored in UTC; "day" for close/opening/closing-stock
   purposes is always calculated against a fixed Africa/Nairobi (EAT)
   constant, regardless of where the app is physically hosted. See ADR-29.
6. **Money is always `NUMERIC`/`Decimal`.** No floating-point arithmetic on
   money anywhere in the stack.

---

## 4. Deployment

- **Application:** Vercel (Next.js-native hosting).
- **Database:** managed PostgreSQL (Neon or Supabase).
- **Environments:** local development + production only (no staging in
  v1 — see ADR-12).
- **PWA:** installable via manifest + service worker (`next-pwa` or Next.js
  native support); no offline data sync — connectivity is assumed
  available at all locations per the PRD's non-functional requirements.

---

## 5. What's deliberately not here

- No microservices — unjustified for a single business, single team.
- No GraphQL — the app's screens are known and finite; REST is simpler to
  secure and audit.
- No WebSockets/real-time — nothing in the PRD requires live cross-device
  updates.
- No background job runner/queue — opening stock and settlement figures are
  computed on demand, not pre-written by scheduled jobs.
- No offline mode — explicitly out of scope for v1 (PRD §5).
