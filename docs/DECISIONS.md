# Prosper — Decision Log

**Status:** Approved — Phase 2 (Technical Foundation) complete.
**Format:** ADR-style — one entry per major decision: context, decision, consequences.

---

## ADR-1: Frontend Framework

**Context:** Need a mobile-first, installable PWA serving four distinct role-scoped
UIs (Admin, Store Manager, Cashier, Canteen Attendant), plus a data-dense
laptop view for the Admin. Forms-and-tables business app, not real-time/highly
interactive.

**Decision:** Next.js (App Router) + React + TypeScript.

**Consequences:** Mature ecosystem for admin/dashboard UIs (component libraries,
form/table tooling). Built-in PWA path. TypeScript catches enum/shape errors
(`product_kind`, `movement_type`, roles) at compile time — valuable in a
financial-reconciliation app. Large hire pool, long-term support. Rejected
Vue/Nuxt and SvelteKit (smaller ecosystem for this app shape); rejected a
plain SPA (loses integrated PWA/routing tooling).

---

## ADR-2: Backend Framework/Runtime

**Context:** Single business, single tenant, no stated need for a
separately-scaled or third-party-facing API.

**Decision:** Node.js + TypeScript, using Next.js Route Handlers as the
backend — no standalone Express/Fastify/NestJS service.

**Consequences:** One deployable unit, simpler ops. Shared TypeScript types
between frontend and backend without duplication or codegen. Backend logic
still organized in an internal domain/service layer, independent of the HTTP
layer, so it could be extracted into a separate service later if ever needed.
Confirmed with user: no plans for a native mobile app or independent backend
scaling.

---

## ADR-3: Database Engine

**Context:** Data is inherently relational — referential integrity across
products/locations/movements/orders/handovers, multi-row atomic writes
(financial correctness), joins/aggregations for reporting, exact-decimal
money handling.

**Decision:** PostgreSQL.

**Consequences:** Foreign keys and constraints enforced at the DB layer,
directly supporting the project's core goal (trustworthy numbers). ACID
transactions for multi-row writes. Native `NUMERIC` type for exact decimal
money. Native enum types fit `product_kind`/`movement_type`. Best ORM/hosting
support in the chosen stack. Rejected MySQL (weaker constraint/enum support,
no compelling reason to prefer); rejected NoSQL (would fight the relational,
ledger-based domain); rejected SQLite (no real concurrent multi-user
production use case).

---

## ADR-4: ORM

**Decision:** Prisma.

**Consequences:** Type-safe queries generated from schema, pairs with the
shared-TypeScript-types approach (ADR-2). Native Postgres enum/decimal
support. Standard, well-documented migration workflow suited to a small team.

---

## ADR-5: Authentication

**Context:** Internal staff app, single business, no SSO/social login need.
Admin must be able to instantly revoke a staff member's access.

**Decision:** Auth.js (NextAuth), credentials-based login (email/username +
password), database-backed sessions (not JWT).

**Consequences:** Simple login flow for non-technical staff. Database
sessions allow immediate revocation — relevant for a small business managing
hourly/informal staff.

---

## ADR-6: Hosting

**Decision:** Vercel (application) + Neon or Supabase (managed PostgreSQL).

**Consequences:** Vercel is the native deployment target for Next.js
(zero-config, PWA-friendly). Managed Postgres removes database ops burden.
Both have tiers appropriate to a single small business's traffic. Tradeoff
acknowledged: trusts third-party managed infrastructure with financial data —
standard practice, accepted by user.

---

## ADR-7: PWA Scope

**Context:** PRD explicitly requires no offline mode for v1; only
installability and resilient form submission are required.

**Decision:** `next-pwa` (or native Next.js manifest + service worker) for
installability only. No offline data sync. Retry-on-dropped-submit handled
at the application layer (form state/retry logic), not the service worker.

**Consequences:** Simple, scoped PWA implementation matching actual
requirements — avoids building offline data sync that isn't needed.

---

## ADR-8: Architecture Style

**Decision:** Modular monolith. One Next.js application, internally organized
into domain modules (catalog, stock, sales, handovers, financials, staff,
assets, audit) with boundaries enforced by folder structure, not network
calls.

**Consequences:** Avoids microservices complexity unjustified for a
single-business, single-team project. Modules can be extracted into separate
services later if a real need arises (none identified currently).

---

## ADR-9: API Style

**Decision:** REST-ish JSON over Next.js Route Handlers, resource-oriented
endpoints. Not GraphQL.

**Consequences:** Screens are known and finite (four role-scoped UIs); no
need for client-driven flexible querying. REST is simpler to secure per-route
and to audit.

---

## ADR-10: Client-Server Communication

**Decision:** Standard request/response (fetch), no WebSockets/real-time.

**Consequences:** Nothing in the PRD requires live cross-device updates.
Simpler to build and reason about. Real-time can be added later if a specific
need emerges.

---

## ADR-11: Background Jobs

**Context:** Initially proposed a scheduled job (e.g., Vercel Cron) to
pre-write opening stock at midnight. User questioned whether this was a
genuine requirement or just a default habit.

**Decision:** No background jobs for v1. Opening stock, unattributed-balance
settlement, and similar "carry forward" values are computed on-demand (lazy),
derived from the prior day's closing stock/counts at read time, rather than
pre-written by a scheduled process.

**Consequences:** Removes an entire class of failure modes: missed cron
runs, timezone-boundary bugs in scheduled triggers, nothing to monitor.
Admin's manual adjustments apply as an override on top of the derived value.
Revisit only if a genuine need for pre-computed rollups emerges (none
identified for v1).

---

## ADR-12: Environments

**Decision:** Local development + production only. No staging environment
for v1.

**Consequences:** Simpler, cheaper setup. Changes are tested locally and
deployed carefully to production. Tradeoff acknowledged: no environment to
test changes against realistic data before they reach the Admin's live
books; accepted by user for v1 given project size.

---

## ADR-13: Core Catalog Entities — Location, Product, ProductLocation

**Context:** PRD requires locations modeled as data (future 4th location, no
schema change), and per-location selling prices for the same product.

**Decision:**
- `Location`: name, type (restaurant/canteen/store), active flag.
- `Product`: name, kind (Ingredient/Dish/Goods), buying price (Ingredient
  only), unit cost (Dish only), unit label, soft-delete flag.
- `ProductLocation`: product × location join — selling price (Dish/Goods
  only), active-at-location flag. Selling price lives here, not on Product,
  because it varies per location.

**Consequences:** Cleanly supports per-location pricing and future locations
without schema changes.

---

## ADR-14: Stock Ledger Design

**Context:** Ten distinct movement types (opening, purchase payment/receipt,
issue, production, transfer, sale, non-sale consumption, stock count,
closing) all share the same fundamental shape: product, location, signed
quantity, actor, timestamp.

**Decision:** Single unified `StockMovement` table with a `movement_type`
enum and nullable type-specific fields (reason, linked order, transfer
counterpart, etc.), rather than one table per movement type.

**Consequences:** Current stock for any product/location is a simple sum
over one table. Single point of integration for the audit trail. Tradeoff:
the database cannot enforce type-specific rules (e.g., "reason required for
non-sale consumption") as strictly as dedicated tables could — enforced in
the application layer instead, plus `CHECK` constraints where feasible.
Accepted as the right tradeoff for this project's size.

---

## ADR-15: Corrections Are New Entries, Never Overwrites (System-Wide Principle)

**Context:** User requires the Admin to be able to correct any figure,
including historical ones, even where corrections cascade into later
figures — while the PRD requires immutability of closed records and a full
audit trail (§4.3, §4.5, §5).

**Decision:** No record is ever overwritten in place, system-wide (not just
orders, as the PRD states explicitly for orders — this is generalized to
stock, sales, handovers, expenses, pay, and every other ledger). A correction
is always a new entry layered on top of the original. Current values are
always the sum/derivation over all entries including corrections. Only the
Admin may enter a correction to an already-closed (historical) record; staff
may edit their own same-day entries only, before close (per PRD §4.5).

**UX principle:** The Admin never manually computes a delta. She enters the
*correct final value* in a "Correct this" flow; the system computes the
difference internally and writes it as the correction entry. The record then
*displays* as corrected in normal views; the original-vs-corrected detail is
available in the audit trail view, not surfaced by default.

**Consequences:** Every correction is traceable — what it originally was,
what it became, who changed it, when. Cascading effects (e.g., a corrected
stock count changing downstream sold/variance figures) resolve automatically
because those figures are derived, not stored (see ADR-14, ADR-17). No risk
of concurrent-edit clobbering, since corrections are additive inserts, not
updates.

---

## ADR-16: Restaurant Orders & Canteen Derived Sales

**Decision:**
- `Order` + `OrderLine`: order type, payment method, delivery fee (if
  Delivery), customer (if Credit), line items with price captured at time of
  sale (not looked up later). Each completed order writes a matching `sale`
  entry to `StockMovement`.
- `StockCount` (Canteen): counted quantity per product, per count event.
  Sold quantity is derived as `opening + received − non-sale consumption −
  counted remaining`, computed since the product's last count, and also
  written to `StockMovement` as a `sale` entry — so downstream reporting
  treats Restaurant and Canteen sales uniformly.

**Consequences:** Single reporting model across both sales mechanisms.
Historical corrections to either follow ADR-15.

---

## ADR-17: Money Is a Derived Ledger, Not a Stored Balance

**Context:** User asked why balances (Cash at hand, M-Pesa, customer running
balance, monthly pay, "owed to business") aren't simply stored and updated
in place.

**Decision:** No money balance is stored directly. Every event that affects
money (handover receipt, expense, purchase payment, owner draw/return,
account transfer) writes a signed entry to a `MoneyMovement`-style ledger
(and monthly pay is computed from Attendance + Advance/Deduction entries).
The "current balance" is always the sum of entries to date, computed on
read.

**Consequences:** Every balance is always explainable by listing its
underlying entries (directly serves the project's core "trust and
visibility" goal). Corrections follow ADR-15 uniformly — no special-casing
money vs. stock. No race conditions from concurrent read-modify-write on a
single stored number. Computational cost of summing is trivial at this
business's scale; would need revisiting (e.g., periodic snapshotting) only
at far larger transaction volumes.

---

## ADR-18: Handover & Receipt of Handover

**Decision:** Two linked records — `Handover` (staff declares cash amount
and M-Pesa amount given) and `ReceiptOfHandover` (Admin records cash and
M-Pesa amount actually received, linked to the Handover). Variance
(declared vs. received) is calculated once and stored permanently as a
historical fact, not recalculated retroactively; corrections to either side
follow ADR-15.

**Open item carried from PRD §7, Q2:** M-Pesa routing (whether M-Pesa lands
directly in the Admin's account or passes through a staff-held number) is
still unconfirmed. This schema assumes the "physical handover" model
(declared vs. received) as the PRD's stated default. If M-Pesa is confirmed
to bypass staff entirely, the M-Pesa side of this entity should be revisited
as a reconciliation-against-expected-sales model instead.

---

## ADR-19: Customers, Debt, Repayment

**Decision:** `Customer` (name, phone, derived running balance), `Debt`
(created automatically on a Credit order, linked to the Order), `Repayment`
(recorded by Admin or Cashier, reduces running balance; not required to
match a specific Debt). No supplier credit tracked (per PRD).

---

## ADR-20: Expenses, Owner Draw/Return

**Decision:** `Expense` (category, amount, date, paid-from account, note) —
writes a `MoneyMovement` entry. `OwnerTransaction` (type: Draw or Return;
amount, date, note) — writes a `MoneyMovement` entry and feeds a derived
"owed to business" balance (ADR-17).

---

## ADR-21: Staff, Attendance, Pay

**Decision:** `Staff` (name, role, daily rate, location) separate from
`User` (login credentials), linked 1:1. `Attendance` (present by default,
Admin flags absences). `Advance`/`Deduction` records, netted off monthly
pay. `HandoverShortfall` links to a Handover's variance, requires a note,
does not auto-deduct pay or block day-close (per PRD). Monthly pay is
derived: daily rate × days present, minus advances/deductions, computed on
demand — not stored.

**Note:** User initially proposed dropping Advance/Deduction from scope;
reconfirmed keeping it per the PRD requirement (§4.8) after clarification.

---

## ADR-22: Assets

**Decision:** `Asset` register (name, location, purchase date, purchase
cost, condition/status), soft-delete flag, hard-delete with confirmation
friction — same pattern as Product (ADR-23).

---

## ADR-23: Soft-Delete / Hard-Delete Mechanics

**Decision:** Soft-delete via a `deleted_at` timestamp (hides from UI,
preserves all linked history). Hard-delete permanently removes the row, but
is **blocked at the application layer if any linked history exists**
(stock movements, sales, etc.) — hard-delete is only permitted for records
with zero linked activity. UI-level confirmation friction (retyping the
name) is required for hard-delete regardless.

**Consequences:** Prevents hard-delete from silently breaking the audit
trail it would otherwise undermine. Confirmed with user over the alternative
(allow hard-delete regardless, relying only on UI friction).

---

## ADR-24: Day Close

**Decision:** A `DayClose` row per date (date, closed-by, closed-at). Its
presence is the single source of truth for whether a date is locked;
checked consistently wherever the "closed day → Admin-only correction"
rule (ADR-15) applies, rather than a per-table lock flag.

---

## ADR-25: Audit Trail

**Decision:** A single `AuditLog` table (who, action, entity/record
reference, timestamp, old/new value or reference to the original and
correction entries). Since most of the system already preserves history via
ledger entries (ADR-14, ADR-15, ADR-17), `AuditLog` primarily captures
things not otherwise self-evident from the ledgers: logins, non-ledger edits
(e.g., product name changes), and deletes.

---

## ADR-26: User & Role

**Decision:** `User` (credentials, hashed password, role enum: Admin/Store
Manager/Cashier/Canteen Attendant), linked to `Staff` where applicable.
Role checked server-side on every request. "Own entries only" scoping for
staff is enforced by matching the acting user (`recorded_by`), not by
location alone — necessary because two Cashiers share the Restaurant
location and must not see each other's orders.

---

## ADR-27: API Design

**Decision:** Resource-oriented REST endpoints grouped by domain module
(`/api/products`, `/api/stock-movements`, `/api/orders`, `/api/handovers`,
etc.). No PUT/DELETE on historical records — corrections are POSTs to
dedicated action endpoints (e.g., `POST /api/expenses/:id/correct`) that
accept the corrected final value and compute the delta internally (ADR-15's
UX principle enforced at the API layer, not trusted to the frontend).
Authorization (role + ownership) checked server-side on every request.
Consistent error shape: `{ error: { code, message, field? } }`.

---

## ADR-28: Validation

**Decision:** Zod schemas shared between frontend and backend (both
TypeScript in one Next.js project).

**Consequences:** One schema validates both the form and the API request —
no duplicated or drifting validation logic.

---

## ADR-29: Timezone & Day Boundaries

**Context:** User asked whether this decision protects against hosting the
application in a server region other than Kenya (e.g., Frankfurt).

**Decision:** All timestamps stored in UTC. "Business day" boundaries (for
day-close, opening/closing stock) are calculated against a fixed business
timezone constant (Africa/Nairobi, EAT, UTC+3) — never inferred from the
server's own clock or region.

**Consequences:** Day-close and daily figures behave identically regardless
of which region the application is physically hosted in. Avoids a common
class of bug where "day" silently means server-local midnight instead of
the business's actual day boundary.

---

## ADR-30: Money/Decimal Handling

**Decision:** PostgreSQL `NUMERIC` for all price/amount columns; Prisma's
`Decimal` type in application code. No floating-point arithmetic for money
anywhere.

**Consequences:** Eliminates floating-point rounding-error risk in
financial figures.

---

## ADR-31: Testing Strategy (high-level)

**Decision:** Ledger/reconciliation math (stock sums, variance, derived
balances) gets thorough unit-test coverage. End-to-end tests cover critical
multi-step flows (order → stock deduction, handover → variance, day close →
lock). UI polish is not a primary test focus. Full detail in
`TEST_PLAN.md`.

---

## ADR-32: Folder Structure & Naming Conventions

**Decision:** Standard Next.js App Router layout; business logic organized
under `lib/domain/<module>` mirroring entity groups, separate from
`app/` (routes/UI). snake_case for DB, camelCase for TypeScript, kebab-case
for API routes. Full detail in `CONVENTIONS.md`.

---

## ADR-33: Dish Cost of Goods Sold — Ingredient Consumption, Not Per-Dish Cost; Recipes Are Informational Only

**Context:** The original design (ADR-13, ADR-16) gave each Dish an
Admin-entered `unit_cost`, used directly as its COGS per unit sold. The
Admin's actual practice, surfaced by the user mid-design, is different:
she sets Dish `buying_price` to `0` and instead derives food cost from
ingredient stock movement — `opening ingredient stock + purchases −
closing ingredient stock` — to avoid costing the same food twice (once via
a per-dish figure, once via ingredient purchases). This also revealed a
need for an optional recipe feature, kept strictly separate from anything
financial.

**Decision:**
1. `Product.unit_cost` is removed. `Dish` products always have
   `buying_price = 0`.
2. **Dish COGS is derived, blended across the whole business**, not
   per-dish and not per-location:
   `Dish COGS (period) = opening Ingredient stock + Ingredient purchase
   receipts − closing Ingredient stock`, computed once for the period,
   covering all cooking everywhere (confirmed with user — blended over a
   per-location breakdown, since a per-location split would need
   attributing shared ingredient purchases across locations with no clean
   basis to do so).
3. **Recipes are a new, separate, optional feature** (`Recipe`,
   `RecipeIngredient` — see `SCHEMA.md` §2a): the Admin may define expected
   ingredient quantities per Dish, at her own leisure, purely for (a) an
   estimated per-dish cost for her own reference (e.g. pricing decisions)
   and (b) flagging when actual recorded production diverges meaningfully
   from what the recipe and ingredients issued would predict — a signal
   for her to investigate, visible to the Admin only, never blocking the
   Store Manager's ability to record production.
4. **Recipes never feed into COGS, Gross Profit, or Net Profit.** Those
   figures are always computed from actual ingredient consumption (point
   2), never from a recipe's expected quantities. This is deliberate and
   explicit, to prevent recipes drifting out of sync with reality from
   silently corrupting the Admin's real financial numbers.

**Consequences:** Preserves the original "no recipes/BOM drives cost or
stock" principle (PRD §3) for financial purposes, while adding a genuinely
useful operational tool (yield-anomaly detection — a signal for potential
waste, error, or loss) without coupling it to money. `SCHEMA.md` §14 (COGS
formula) and `API.md` (Recipe endpoints) updated accordingly.

---

## ADR-34: API Documentation Format — Markdown, Not OpenAPI

**Context:** User asked whether `API.md` should be a formal OpenAPI spec
instead of plain Markdown.

**Decision:** Keep `API.md` as plain Markdown. No `openapi.yaml`.

**Consequences:** OpenAPI's main benefit — generating client types from a
formal spec — is largely redundant here, since frontend and backend already
share TypeScript types directly by being one Next.js codebase (ADR-2).
Markdown is faster to write/review and sufficient for a single-team,
single-codebase project with no external API consumers. Revisit only if
Prosper ever needs to expose this API formally to other tools or teams.

---

## ADR-35: Test Tooling — Vitest + Playwright

**Decision:** Vitest for unit tests (ledger/reconciliation math, per
`TEST_PLAN.md` §1). Playwright for end-to-end tests (critical multi-step
flows, per `TEST_PLAN.md` §2).

**Consequences:** Vitest is fast, ESM-native, near-identical API to Jest —
no unusual learning curve, fits the TypeScript/Next.js stack. Playwright is
the current standard for full-flow browser/API testing in Next.js
projects, with good support for testing API routes directly as well as
real browser flows.
