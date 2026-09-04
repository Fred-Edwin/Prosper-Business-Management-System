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

**Addendum (Sprint 01 — session strategy):** next-auth v4's Credentials
provider only supports JWT session strategy; it cannot be paired with
database sessions (confirmed against the library during implementation).
Switched to `session.strategy = "jwt"`. Instant revocation — the original
reason for wanting database sessions — is preserved differently instead:
the `session` callback (`lib/auth/config.ts`) re-checks `User.active`
against the database on every session read, so deactivating a user takes
effect on their very next request without waiting for the JWT to expire.

**Addendum (Sprint 01 — login credential):** Changed from email + password
to **unique display name + 4-digit PIN**. This is a staff app used on
shared devices at the till (Restaurant/Canteen/Store), not a general web
login — staff don't have or want email addresses for this, and a short PIN
matches how they already think about till access. `User.name` is unique
(enforced at the DB level); `User.pin_hash` stores a bcrypt hash of the
4-digit PIN, same as the password before it. Because a 4-digit PIN is a
small keyspace (10,000 combinations), brute-force protection is
non-negotiable: `User.failed_pin_attempts` and `locked_until` implement a
lockout after repeated failures, checked in the `authorize` callback
before comparing the PIN. See `SCHEMA.md` §1 for the updated `User` table.

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

**Note (M2 QA S7, F7-10) — `editOwnOrder` prunes the audit rows of the
movements it replaces.** A Cashier's *same-day true edit* of their own
order (`lib/domain/sales/edit-own-order.ts`) deletes the order's prior
`MoneyMovement` / `Debt` / `sale` `StockMovement` rows and rewrites them
(a true edit, not an append-only correction — ADR-15 kicks in only after
the day rolls). It first deletes the `AuditLog` rows of type
`money_movement` for those now-gone movements, then writes one fresh
`action: "correct"` `AuditLog` row on the **order** carrying the pre/post
summary. This is the single place in the system where `AuditLog` rows are
deleted rather than appended, and it is deliberate: the deleted rows
describe ledger movements that no longer exist, and the edit event itself
stays audited on the order row. A hard `DayClose` lock (M3) removes the
"true edit" window entirely — after it, every change is an append-only
correction and nothing is pruned.

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

**Superseded in part (Milestone 2, 2026-08-29):** the **headless-browser
app-level e2e layer is dropped** — too slow for the value it added over
DB-backed domain-integration tests, and the M1 e2e harness was never
actually built. Replacement: the "critical multi-step flows" of
`TEST_PLAN.md §2` are covered by **Vitest domain-integration suites**
(`tests/integration/**`, the `test:e2e` script now runs Vitest) that call
`lib/domain` + route handlers directly, **plus the per-feature owner
walkthrough** on `pnpm dev` (`milestone-2-plan.md §8` guardrail 3).
Playwright itself **stays as a dependency** because the Storybook
test-runner (`test:visual` / `test:a11y`, ADR-42) uses it under the hood
to gate the kit — that is unaffected. Vitest's role is unchanged.

---

## ADR-36: Open design decisions carried out of the Sprint 05/06 design-export effort

**Status: 36a / 36c / 36d RESOLVED (Design Sprint Session 2, 2026-08-27).
36b RESOLVED (Development Sprint Session 7, 2026-08-27) — persists app-wide
via `localStorage`.**

Four UI questions surfaced during the Sprint 05 screen reassembly and the
Sprint 06 export (both scrapped and being redone). Each was flagged rather
than decided. They are recorded here (and, for the UI-rule ones, in
`docs/design/design-principles.md` §8 "Open design decisions") so a future
session finds them instead of re-deriving an answer ad hoc.

**Resolutions (Session 2 — Product Designer, with the owner):**

- **36a — RESOLVED: no chip. Corrected ledger cells render as the value
  in the semantic color (`--color-danger` for a negative movement,
  `--color-success` for a positive one) with a 1px underline in the same
  color.** The cell is the click target for the correction drawer
  (original vs corrected + who/when). Rationale: this is what all three
  approved ledger screen artboards (`798-0` / `7G9-0` / `7LJ-0`) already
  show, and it fits the ledger's "one row = one product/day/location,
  one column per movement type" shape — a correction lands in a specific
  *column*, not on the row as a whole, so there is no single
  movement-type cell to hang a chip on. `design-principles.md` §4.3's
  chip bullet is rewritten to describe the underlined cell;
  `design-principles.md` §8 item 1 is closed; the kit ledger artboard
  (`6ET-0`) is updated to match the screens (it previously showed the
  corrected value as plain, non-underlined color — see D1). Session 3
  builds `dense-ledger.tsx` with the underlined-cell treatment and drops
  the amber "Corrected" pill.

- **36c — RESOLVED: `FrictionDeleteDialog` takes optional
  `cancelLabel` / `confirmLabel` / `title` / `bodyCopy` /
  `showArchiveLink` props.** Each entity passes its own text
  ("Keep Product" / "Keep Asset", "Delete Product" / "Delete Asset
  Record", etc.). The retype-gate mechanic is identical across entities
  — only the copy varies. This matches how Paper's Asset Delete Dialog
  (`8IV-0`) was actually drawn vs the Product Delete Dialog (`797-0`).
  The `showArchiveLink` prop exists because the Asset dialog omits the
  "Archive instead" link the Product dialog has. Defaults keep the
  generic "Cancel" / "Permanently Delete" so callers that pass nothing
  are unchanged. Session 3 builds this when rebuilding the component.

- **36d — RESOLVED: Prosper gets a real `EmptyState` kit component AND
  an `ErrorState` variant.** Both are designed in Paper this session
  with their states. `EmptyState`: icon + title + one-line guidance +
  optional single action button; two artboards — `EmptyState — default`
  and `EmptyState — filtered / no results` ("Clear filters" action,
  different copy). `ErrorState`: same layout, `--color-danger` icon,
  "Retry" action. Rationale: five M1 surfaces (Assets Register with no
  assets, Product Catalog with no products / no search results, Dense
  Ledger with no movements for the active filter, mobile Activity
  timeline with nothing logged today, Financials reconciliation with
  nothing to match) all want one consistent treatment; inlining five
  different empties is exactly the divergence this session exists to
  prevent. `design-principles.md` §7 inventory gains a 17th kit area
  ("Component Kit — Empty & Error States"); §8 item 4 is closed. The
  four role home-page inline placeholders are replaced by `EmptyState`
  in a later session (their `TODO(mock)` markers become plain `TODO`).

- **36b — RESOLVED (Session 7, with the owner): the collapsed state
  persists app-wide.** See the 36b section below for the full decision.

### 36a. "CORRECTED" chip on ledger correction rows — RESOLVED (see above): no chip, underlined semantic-color cell

- `design-principles.md` §4.3 describes an amber "CORRECTED" chip next to
  the movement-type cell as **approved**.
- `sprint-05-screen-reassembly-handover.md` §3 said **no such chip
  exists** — "removed pending a future, more subtle design decision,"
  corrected values shown as plain colored text.
- The Sprint 06 completion session pulled the live Paper Ledger artboards
  (`798-0` / `7G9-0` / `7LJ-0`) via `get_node_info` and confirmed **none
  of the example rows carry a chip child** — matching the older handover,
  not §4.3.
- `components/kit/dense-ledger.tsx` currently **implements the chip**
  (amber "Corrected" pill), left in place because no exported screen
  needed it removed to match Paper.

**What needs deciding:** whether correction rows get a chip, plain colored
text, or some third treatment — and then `design-principles.md` §4.3,
`dense-ledger.tsx`, and the Paper artboards all get reconciled to that one
answer. This must be settled **before Session 3 rebuilds the kit** (that
session touches `dense-ledger.tsx`) and before any Stock development
sprint wires correction rows. Owner: Admin/user call.

### 36b. Ledger "Maximize" / sidebar-collapse persistence — RESOLVED (Session 7, 2026-08-27)

The Ledger's Maximize button triggers the general Admin-shell Icon Rail
collapse (`components/shells/admin-shell.tsx` `collapsed` prop), not a
bespoke "maximized" component — **that part was always settled** (ADR
context: `sprint-05` §5.6).

**Decision (with the owner): the collapsed state persists app-wide.**
Once the user collapses the sidebar (from the Ledger's Maximize button or
the shell's own collapse toggle), every Admin screen stays collapsed until
they expand it again — and it survives a full page reload.

**Where the state lives:** `app/admin/admin-shell-client.tsx` (the client
wrapper that renders `<AdminShell>` for every `/admin/*` route). It holds
`collapsed` in `useState`, hydrates it from
`localStorage["prosper.admin.sidebarCollapsed"]` on mount, and writes back
on every toggle. Reads/writes are wrapped in `try/catch` so a private
window or blocked site-data degrades to "expanded" rather than throwing.
`components/shells/admin-shell.tsx` is **unchanged** — it already exposed
`collapsed` + `onToggleCollapsed` props; only the wiring moved. No
per-screen `collapsed` state anywhere; the Ledger's Maximize button just
calls the shell's `onToggleCollapsed`.

### 36c. `FrictionDeleteDialog` button labels — hardcoded vs. per-entity

`components/kit/friction-delete-dialog.tsx` hardcodes "Cancel" /
"Permanently Delete". Paper's **Asset Delete Dialog** (`8IV-0`) shows
"Keep Asset" / "Permanently Delete Asset". The kit component was used
as-is per the "don't invent one-offs" rule.

**What needs deciding:** whether the dialog takes optional
`cancelLabel` / `confirmLabel` props (so each entity reads "Keep
Product" / "Keep Asset" / …), or the generic labels are accepted
everywhere. Kit note for **Session 3** (kit rebuild) — decide when
rebuilding this component from Paper; check what every delete-dialog
artboard actually shows before choosing.

### 36d. EmptyState — inline placeholder vs. kit component

"Empty State" is **not** in the approved 16-artboard kit inventory
(`design-principles.md` §7). The four role home pages
(`app/{admin,cashier,store-manager,canteen}/page.tsx`) currently inline a
placeholder `<div>` each (carrying a `TODO(mock)` marker that is
technically misapplied — it's deferred UI, not mock data).

**What needs deciding:** does Prosper get a real `EmptyState` /
`ErrorState` kit component (designed in Paper first, with its states), or
do screens keep inlining empties case-by-case? Several real screens
(reports, history, filtered tables with no results) will want a
consistent empty treatment. Decide during **Session 2** (Product Designer
Paper pass) — if yes, it gets an artboard with states there and is built
in Session 3.

---

## ADR-37: Kit component extensions for the Admin Stock ledger screens (Session 4b)

**Status:** Accepted (owner-authorised in-session, 2026-08-27).
**Context:** Session 4b (Developer, Design-Sprint — screen export) found
two places where an Admin Stock screen (`798-0` / `7G9-0` / `7LJ-0`)
structurally diverges from the kit component it should use. Normally a
kit-structure change goes back to a Design Sprint (Paper artboard first,
then code). The owner explicitly authorised making the code changes in
Session 4b instead, backward-compatible and opt-in, with the Paper
artboards to be reconciled by a later Design Sprint.

### 37a. `DenseLedger` gains an opt-in Location column + horizontal-scroll mode

**Divergence.** The base kit `DenseLedger` artboard (`6ET-0`) starts with
the Product column and lays rows out `[width:100%]`. The three Admin
Stock ledger screens draw a **leading Location column** (`w-[100px]`,
`[color:var(--text-secondary)] text-sm/sm`; header "Location" in
`text-info`) before Product, and lay rows/header/footer out
`w-max min-w-full` so the wide table scrolls horizontally inside its own
`overflow-x-auto` wrapper.

**Decision.** `components/kit/dense-ledger.tsx` gains two optional props:
- `showLocation?: boolean` — renders the leading Location cell from a new
  optional `LedgerRow.location`. The dark totals footer renders a blank
  `w-[100px]` spacer in that slot.
- `horizontalScroll?: boolean` — switches header/row/footer width from
  `[width:100%]` to `w-max min-w-full`.

Both default to off; omitted, the component is byte-identical to the
`6ET-0` transcription (verified in the kit gallery — the base
`DenseLedger` case is unchanged). The catalog/reconciliation usages don't
set them; the Admin Stock ledger screens set both.

**Follow-up (Design Sprint):** add the Location-column + horizontal-scroll
state to the Paper `6ET-0` artboard so Paper and code agree. Until then
the `6ET-0` artboard is knowingly stale w.r.t. these props (noted in the
component header).

### 37b. `Drawer` gains a docked right-edge `rail` variant

**Divergence.** The kit `Drawer` artboard (`6OE-0`) is a **floating card**
(`w-[380px]`, `rounded-md`, `h-[560px]`, `bg-(--surface-panel-tint)`,
padding-block header). Two M1 screen-states — the Admin Stock
ledger-correction drawer (`7LJ-0`) and the Financials payment drawer
(`85W-0`) — draw the panel as a **docked rail attached to the right edge**
of the content area: `w-[420px]`, `h-full`, `border-l` (no radius, no
full border), a `--surface-subtle` footer with left-aligned actions (a
full-width primary via `<Button className="grow">`).

**Decision.** `components/kit/drawer.tsx` gains
`variant?: "panel" | "rail"` (default `"panel"`). `"rail"` switches the
container to `w-[420px] h-full border-l` (no radius), the body to the
tighter `py-(--sp-6) px-(--sp-8) gap-(--sp-5) overflow-clip` rhythm, and
the footer to `[background-color:var(--surface-subtle)]` with actions
left-aligned. The header (incl. the `subtitle` context-subtitle variant),
close button, Esc/focus-trap behaviour and the `footer` slot are shared
across both variants. `"panel"` is unchanged.

`docs/design/screens/admin-stock-ledger-drawer-open/page.tsx` uses
`<Drawer variant="rail">`. The Financials payment drawer
(`admin-financials-payment-drawer-open`) still transcribes its rail
inline (Session 4a) — a follow-up may migrate it to `variant="rail"` for
consistency; not done in 4b to keep the change scoped.

**Follow-up (Design Sprint):** add the `rail` variant state to the Paper
`6OE-0` artboard. Until then `6OE-0` is knowingly stale w.r.t. this
variant (noted in the component header).

### 37c. `FlowHeader` gains a `directionTone` prop (Session 4c follow-up)

**Divergence.** The kit `FlowHeader` artboard (`9KI-0`) draws the
"Origin → Destination" badge in `text-info` and the component hardcoded
that colour. The Store Manager / Canteen flow screens colour the badge
per flow: `text-danger` (Issue Ingredients), `text-success` (Record
Production), `text-info` (Transfer Stock), `text-warning` (Log Non-Sale)
— matching the semantic direction of each movement.

**Decision.** `components/kit/flow-header.tsx` gains
`directionTone?: "info" | "success" | "danger" | "warning"` (default
`"info"`). Omitted, the component is byte-identical to the `9KI-0`
transcription. The four flow skeletons
(`store-manager-flows-issues-production`,
`store-manager-flows-transfers-consumption`, `canteen-transfer-dispatch`)
now use `<FlowHeader ... directionTone=… className="w-full" />` instead
of an inline header — the `w-full` override drops the kit header's
fixed `w-[390px]` for the mobile frame. This *removes* the inline
transcriptions the 4c export flagged.

**Follow-up (Design Sprint):** add the four toned badge states to the
Paper `9KI-0` artboard so Paper and code agree. Until then `9KI-0` is
knowingly stale w.r.t. `directionTone` (noted in the component header).

### Process note

37a / 37b (Session 4b) and 37c (Session 4c) are the **only**
`components/kit/*` edits made outside a Session-3 kit-rebuild pass. Each
was authorised explicitly, is additive + backward-compatible, and
carries a Paper-reconciliation follow-up. Future kit-structure changes
still go back to a Design Sprint by default.

---

## ADR-38: Catalog — location prices submitted with the product; dropped `ProductLocation` rows are deactivated, not deleted (Session 5)

**Status:** Accepted. **Context:** Development Sprint Session 5, wiring
M1-F1 Catalog & Locations.

### 1. Per-location pricing travels with the product

`docs/API.md` originally specified a standalone
`POST /api/products/:id/locations` for setting a `ProductLocation`'s
selling price / active flag, alongside `POST /api/products` for the
product core.

The approved `product-drawer` design has a **single Save button** covering
the product fields *and* every per-location row. A separate location
endpoint would have no screen calling it — dead surface — and would make
the drawer's one atomic "Save" into two requests that can half-fail.

**Decision.** `POST /api/products` and `PATCH /api/products/:id` carry a
`locations: [{ locationId, sellingPrice, active }]` array. The product and
all its `ProductLocation` rows are written in one `prisma.$transaction`.
The standalone `POST /api/products/:id/locations` route is **not built**.
`docs/API.md`'s Catalog section is updated to match.

Delete likewise collapses to `DELETE /api/products/:id` — `?mode=archive`
for the soft path, a `{ confirmName }` body for the hard path — replacing
the spec's `POST .../soft-delete` + `POST .../hard-delete` sub-routes.
One resource, one HTTP verb per action.

### 2. Dropped locations are deactivated, not deleted

On `updateProduct`, a location that was previously active but is no longer
in the submitted `locations[]` set must be reconciled somehow. Two
options: delete the `ProductLocation` row, or set `active = false` and
keep it (with its last `sellingPrice`).

**Decision.** **Deactivate.** Keeping the row:
- preserves the last-known selling price, so re-enabling a location in a
  later edit restores it rather than forcing re-entry;
- leaves a trace for any future audit need (a `ProductLocation` is close
  to ledger-adjacent — historical orders priced off it);
- is cheap — one `active` flag, filtered out of the read path already.

`listProducts` / the catalog table only surface `active` rows, so a
deactivated location is invisible in the UI exactly as a deleted one
would be. `hardDeleteProduct` still hard-deletes the `ProductLocation`
rows (the whole product is going).

### 3. `locationId` is validated as a non-empty string, not a UUID

`Location.id` / `Product.id` are `String @default(uuid())` — the *default*
generator is a UUID, but the column accepts any string and the seed uses
readable ids (`seed-location-store`). The Zod schema validates
`locationId` as `z.string().min(1)`, not `z.string().uuid()`. (A stricter
UUID check 400'd every request against seeded data during this session.)

---

## ADR-39: Stock ledger — signed-quantity convention, 2-phase transfer representation, `correctMovement` for open days, and the `MoneyMovement` boundary (Session 6)

**Context.** Session 6 built `lib/domain/stock` + `app/api/stock-movements*`
(M1-F2 backend). `SCHEMA.md` §3 says `StockMovement.quantity` is "signed"
but leaves the sign convention, the 2-phase transfer state model, and the
`MoneyMovement` ownership boundary undefined. The handoff flagged all
three as decide-and-document (ADR-39) or STOP-and-flag points. Resolved
with the owner before implementation.

### 1. Signed-quantity convention

**Every `StockMovement.quantity` is signed from the perspective of _its
own_ `locationId`.** A positive row adds stock at that location, a
negative row removes it. `getDerivedStockBalance(productId, locationId)`
is a plain signed `SUM(quantity)` over all rows for the pair — **no
movement-type filter, no stored total** (ADR-14).

Consequences:
- Operation *inputs* take an **unsigned magnitude** (`quantity: "10"`);
  the domain applies the sign per movement type (`issue` / consumption /
  transfer-out → negate; receipt / production / transfer-in → positive).
  `correctMovement` is the exception — its input is the *signed corrected
  final value*, and the stored delta may be either sign.
- `purchase_payment` has **no stock effect**, so its row is stored with
  `quantity = 0` (ordered magnitude + cost kept in `note`). This keeps
  the hot balance sum honest without special-casing the type in the read
  path.
- `opening` rows are computed-on-read ledger entries (ADR-11), signed the
  same way; a re-stated opening for the same product/location/business
  date is an ADR-15 correction row (`correctsMovementId` → the first
  opening, `quantity` = the delta to the newly stated figure), never a
  `CONFLICT`, never a mutation.

### 2. 2-phase transfer = two `transfer` rows, `+q` linked to `−q` via `correctsMovementId`

API.md's transfer `POST` body is `{ productId, fromLocationId,
toLocationId, quantity }` with no accept endpoint; the F2 design shows a
persistent "incoming transfer" banner the receiver **accepts** or **flags**.
The schema has no `status` column and adding one is a migration.

**Decision — no schema change. A transfer is two rows:**
- **Phase 1** (`recordTransfer`, sender-location-scoped): write the `−q`
  **dispatch** row at `fromLocationId` immediately. `toLocationId` goes in
  `transferCounterpartLocationId`; `correctsMovementId` is `null`. Stock
  leaves `from` now. **A pending transfer is exactly: a `transfer` row
  with `quantity < 0` and `correctsMovementId = null` and no sibling
  `transfer` row pointing back at it.**
- **Phase 2** (`acceptTransfer`, receiver-location-scoped, via `POST
  /api/stock-movements/:id/accept`): write the `+q` **counterpart** row at
  the destination, with `correctsMovementId = <dispatch row id>` and the
  counterpart location pointing back at `from`. Stock lands at `to` now.
  Double-accept → `409`.
- **Flag** (`flagTransfer`, same endpoint with `{ flag: true, note }`):
  record the discrepancy `note` on the pending dispatch row; release no
  stock; transfer stays pending for an Admin to resolve (accept, or
  `correctMovement` the dispatch row).

`correctsMovementId` is **reused as a generic "this row completes /
supersedes that row" pointer** for the accept link. Justification: the
pair is the same `movementType`, same `productId`, and nets to zero
across the two locations — the same invariant a correction delta
satisfies. `flagTransfer` mutates the pending row's `note` in place
(not an append): it is open pending-state metadata, not a closed ledger
fact — analogous to a staff member editing their own same-day entry
before close (CONVENTIONS §4.6).

Derived balance at `from` moves on Phase 1; at `to`, only on Phase 2.
Nothing is double-counted; nothing is lost while in transit.

### 3. `correctMovement` writes a delta row even for open-day corrections by the original recorder

CONVENTIONS §4.6 says staff "edit their own same-day entries **directly**
(true edit, not a correction row)". The Session 6 handoff overrides this
**for stock**: `correctMovement` **always** writes an additive delta row
(`correctsMovementId` set, original never mutated) — the gate only
controls *who* may call it:
- `DayClose` exists for `toBusinessDate(original.occurredAt)` → **`admin`
  only** (`FORBIDDEN` otherwise).
- Day still open → **`admin` or the original recorder** (`FORBIDDEN` for
  any other actor).

Rationale: a uniform append-only correction path is simpler, keeps the
ledger's "one row = one fact, corrections layered on top" invariant
(ADR-15) with no branch for "was this an edit or a correction", and the
audit trail is identical in both cases. `occurredAt` on the delta row =
the original's, so the correction lands in the same business day as what
it corrects. A `delta` of zero → `VALIDATION_ERROR` (nothing to correct).

### 4. `MoneyMovement` for `purchase_payment` is deferred to F3 Financials

API.md says `purchase_payment` "Writes a `MoneyMovement` too"; the handoff
says F3 owns all `MoneyMovement` write logic. **These conflict; resolved
in favour of F3 ownership.** Session 6's `recordPurchasePayment` writes
only the `purchase_payment` `StockMovement` row and leaves a single
`TODO(mock)` for the paired cash / M-Pesa-Bank debit. `paidFromAccount`
is captured on the request and recorded in the row's `note` now, so F3
can write the `MoneyMovement` without a schema or API change. This is the
only surviving `TODO(mock)` in `lib/domain/stock` / `app/api/stock-movements`.

---

## ADR-40: `GET /api/stock-movements/balances` — a batched derived-balance route for the ledger's Opening column (Session 7)

**Context.** The Admin Stock ledger's **Opening** column is derived, not
stored (ADR-11): a product's opening balance for a business day = that
product's *closing* balance on the prior business day = the signed sum of
every `StockMovement` for the (product, location) pair up to the end of
the prior day. Session 6 built exactly this read —
`getDerivedStockBalances(productIds[], locationId, asOf?)`, a single
grouped query — in `lib/domain/stock`, but exposed **no HTTP route** for
it (the domain is server-only). The client (`app/admin/stock`) can only
call HTTP routes.

Without a batched route the ledger client would either (a) N+1 a
single-balance call per product on the day, or (b) re-fetch and re-sum
the entire movement history in the browser — both rejected (the second
also puts ledger math in the client, violating "no business logic in the
client").

**Decision — add `GET /api/stock-movements/balances`.**

- Query: `?productIds=a,b,c&locationId=<id>&asOf=YYYY-MM-DD`. `productIds`
  is comma-separated. `asOf` is a **business date**; the balance sums
  every movement whose `occurredAt` is before the **end** of that
  Africa/Nairobi day (`businessDateEndUtc`), i.e. that day's closing
  figure. Omit `asOf` for "as of now".
- Response: `{ data: [{ productId, locationId, quantity }] }` — one entry
  per requested id, `quantity` a decimal string, `"0.0000"` when the
  product has no rows.
- Roles: identical to `GET /api/stock-movements` — Admin (any location),
  Store Manager / Canteen Attendant (their own location only; a foreign
  `locationId` short-circuits to `[]`, mirroring `listMovements`).
- Thin handler: parse → validate (Zod) → role/location check → call
  `getDerivedStockBalances` → standard envelope. No new domain code — the
  route is a wrapper over the Session-6 function.

`docs/API.md` "Stock Movements" gains this endpoint. The ledger client
derives Opening from this call for `asOf = previousBusinessDate(date)`,
and Closing as `opening + Σ(the day's movements from GET
/api/stock-movements)` — never a stored column.

---

## ADR-41: Drawer / dialog / bottom-sheet panels use an opaque `--surface-raised` fill; `--surface-panel-tint` is retired (Session 9)

**Context.** The business owner reported "transparent modals". A
real-browser probe plus `get_computed_styles` on the Paper file
(2026-08-27) confirmed the cause: **every** overlay panel —
`6Q6-0` (kit Edit Drawer), `6OH-0` (kit Friction Delete Dialog),
`7S9-0` (the screen correction rail on `7LJ-0`) — sets
`background-color: var(--surface-panel-tint)` as its **only** fill.
`--surface-panel-tint` is `#A690B838` — a **38%-alpha** lavender. There
is no opaque layer behind the panel, so page content (ledger rows, form
fields) reads straight through it. `--surface-panel-tint` was originally
added (§6) as a "floating drawer/dialog veil" and documented as an
approved raw-hex exception, but in practice it was applied directly as
the panel surface.

Separately, `components/kit/drawer.tsx` and every screen that mounts a
drawer hand-roll their own `bg-black/30` backdrop — no blur, no shared
`z-index`, no scroll-lock, no `inert` on the background. Two overlays can
end up both interactive (a stale drawer was observed intercepting
clicks).

**Decision.**

1. **The panel fill becomes opaque.** New token
   **`--surface-raised`** — the intended subtle purple, kept, but as a
   **single flat opaque colour**: the retired veil (`#A690B8` at 38%)
   flattened over `--surface-page` (white) → `#EBE7EF`, expressed in
   `app/design-system/tokens.css` as OKLCH. It is visibly distinct from
   the white body (that differentiation was the veil's original intent)
   but is never see-through. `Drawer` (both `panel` and `rail`
   variants), `FrictionDeleteDialog`, and `BottomSheet` use
   `--surface-raised` as their panel background.
   - Considered and rejected: **(a)** a pure-white panel
     (`--surface-page`) — loses the owner's wanted purple tint;
     **(b-as-composite)** an opaque white base with a translucent
     `--surface-panel-tint` layer composited on top — same visual as the
     chosen flat token but more markup, more fragile (the alpha maths has
     to stay correct over every possible panel content), no benefit.
     The chosen form is (b)'s *intent* — subtle purple, opaque — via one
     token.
2. **`--surface-panel-tint` is retired.** Removed from the token set. The
   §6 "approved raw-hex exception" list drops from two entries to one
   (`--color-gold-brand`, masthead-only, remains).
3. **The backdrop becomes a shared primitive.** New `.kit-scrim` utility
   in `globals.css`: `position: fixed; inset: 0;`
   `background: rgb(0 0 0 / var(--opacity-scrim))` (`--opacity-scrim: 0.3`),
   `backdrop-filter: blur(3px)` (+ `-webkit-` prefix),
   `z-index: var(--z-overlay)` (1200). The panel it wraps sits above it
   at `--z-drawer` (1300) / `--z-dialog` (1400). Every overlay component
   renders its own `.kit-scrim` — screens stop hand-rolling one.
4. **Overlay behaviour contract** (implemented on the components, not new
   tokens): on open, focus moves into the panel and is trapped; the
   background is `inert` (or `aria-hidden` + `pointer-events: none`);
   `<html>` gets `overflow: hidden` (restored on close). On close (Esc /
   scrim click / ×) focus returns to the opener. Opening one overlay
   closes/blocks any other.

**Consequences.** The reported bug is fixed at the token level — no panel
can be transparent again without overriding `--surface-raised`. Overlay
stacking is deterministic (the `--z-*` scale, ADR-tokens). Feature
screens that currently hand-roll `bg-black/30` around a kit `Drawer` will
have a redundant backdrop until Session 10 rebuilds them as kit
compositions; per the Session 9 constraints those screen files are **not**
touched this session — the redundancy is cosmetic (two dim layers) and
noted for Session 10.

---

## ADR-42: Storybook is adopted as the kit's isolation / visual-regression / a11y harness (Session 9)

> **SUPERSEDED (2026-09).** The kit is now frozen and feature work
> composes from it against sibling-screen patterns rather than extending
> it, so a per-component isolation + visual-regression + a11y gate no
> longer pays for its upkeep. The Storybook harness was deleted:
> `.storybook/`, every `*.stories.tsx`, `tests/visual/__screenshots__/`
> (168 baselines), the `test:visual` / `test:a11y` scripts, and the
> `@storybook/*` + `axe-playwright` + `jest-image-snapshot` dependencies.
> `design-principles.md §9` remains the written interaction contract; it
> is now upheld by the kit components themselves + the per-screen jsdom
> specs, not a CDP pseudo-state probe. See `docs/sdlc.md` Phase 3 and
> `docs/design/export-workflow.md`. The rest of this ADR is kept for
> history.

**Context.** Sessions 3–4 built `components/kit/*` by `get_jsx`
transcription of static Paper artboards, which have no hover / focus /
pressed / loading state to capture. The result was pixel-faithful
*pictures* of controls, and the interaction-state contract
(`design-principles.md §9`) was never provably implemented. Session 9
completes that contract and needs a way to **prove each component in
isolation, one scenario per state**, and to **gate regressions** (visual
diff + accessibility) going forward. The Session 9 handoff (Deliverable
4, decision D3) asks whether to use Storybook or build a bespoke
`/kit-workbench` route.

**Decision — adopt Storybook** (`@storybook/nextjs-vite`, Vite builder),
config in `.storybook/`, loading `app/design-system/tokens.css` +
`app/globals.css` so components render exactly as in the app.

**Version note (Session 10b, owner-approved).** This ADR originally said
"Storybook v8". SB8's Next adapter
(`@storybook/experimental-nextjs-vite@8.6.x`) declares `next: ^14 || ^15`
only; `@storybook/nextjs-vite@9` is the first release declaring Next 16 +
React 19 support. **Storybook 9.1.x was used instead of v8**, owner-approved
in Session 10b. Everything else in this ADR stands.

- One `*.stories.tsx` per kit component (all 32) and per new primitive
  (`Toast`, `PageShell`, `FormField`, `Spinner`), with a named story for
  each applicable state: `Rest`, `Hover`, `FocusVisible`, `Active`,
  `Disabled`, `Loading`, `Error`/`Invalid`, `Selected`, `Empty`, plus
  every `variant` × `size`. `Drawer` / `FrictionDeleteDialog` /
  `BottomSheet` stories show the `.kit-scrim` + blur.
- **Visual regression:** `@storybook/test-runner` (Playwright) screenshots
  every story; baselines committed under
  `tests/visual/__screenshots__/`; `pnpm test:visual` in `package.json`.
- **Accessibility:** `@storybook/addon-a11y` (axe) on every story;
  `pnpm test:a11y` fails CI on any serious/critical violation.

**Alternatives considered.** A bespoke `/kit-workbench` Next route +
hand-written Playwright specs: fewer dependencies (~40 dev-deps avoided)
but every state-matrix page, the a11y harness, and the diff runner become
custom code to write and maintain, and there is no equivalent of the a11y
addon. Rejected — Storybook is the industry standard for exactly this and
the addons are the point.

**Consequences.** ~40 dev-dependencies added (all `devDependencies`, not
shipped). `package.json` gains `storybook`, `build-storybook`,
`test:visual`, `test:a11y`. `docs/TEST_PLAN.md` updated: the kit is gated
by Storybook + visual-diff + a11y; from Session 10 onward, screens are
gated by composed-screen visual-diff + a Playwright interaction pass. The
existing 76 Vitest unit tests are unaffected and stay green.

---

## ADR-43: Session 10 kit-remediation — 4 new primitives, 2 hover tokens, and 3 spec-driven behaviour additions (Session 10)

**Status:** RATIFIED (owner review, Session 10b/10d, in Storybook). All
seven review items below were reviewed by the owner in the running
Storybook and approved as-is:

1. **`Button` `size` prop** — `sm` 32 / `md` 36 / `lg` 44; `md` is
   byte-identical to the sole artboard. Approved.
2. **`Toast` / `ToastProvider` / `useToast()`** — `top-right` (admin) /
   `bottom-center` (staff) placement via a provider prop, 4-visible stack
   cap, 4000 ms auto-dismiss, pause-on-hover/focus, tone + hairline left
   border. Approved.
3. **`PageShell` / `ContentRegion`** — `--content-max` 1200, `--sp-7` block
   / `--sp-8` inline padding, sticky toolbar row, `wide` / `flush` escape
   hatches. Approved; Session 11 adopts it in the screen rebuild.
4. **`PillFilter` as `role="radiogroup"`** + arrow-key select (was N×
   `aria-pressed` toggle buttons). Approved. Reverts to a toggle toolbar
   only if pills ever become multi-select.
5. **`DatePicker` real-calendar `selected` / `onSelect` API** + keyboard
   nav; legacy `weeks` prop kept as an escape hatch. REST visual is
   byte-identical to `9S1-0`. Approved — Session 11 screens use
   `selected`/`onSelect`.
6. **`QuantityStepper` typed `<input role="spinbutton">`** + `↑`/`↓` step,
   `aria-valuenow`/`-min`/`-max`/`-valuetext`. REST visual unchanged.
   Approved.
7. **`--color-success-hover` / `--color-info-hover` tokens** —
   `oklch(46% 0.121 155)` / `oklch(46.5% 0.146 252.3)`, one lightness step
   below the base, mirroring `--color-accent-hover` / `--color-danger-hover`.
   In both `tokens.css` and `tokens.ts`; drift-guard passes. Approved for
   the Banner Accept / Match-button hover.

`Spinner` / `FormField` were mechanical and accepted without review.

**Context.** Session 10 (Deliverable 3 of the Session 9 remediation sprint)
audited all 32 `components/kit/*` + the shell nav against
`design-principles.md §9` and `component-states.md §1/§2`, and wired each to
the shared §9 utilities from Session 9. Four things needed a decision because
they are not a straight "wire it to the existing utility":

**1. Four new primitives (no Paper artboard).**

- **`Spinner`** — a React wrapper over the existing `.kit-spinner` CSS +
  `role="status"` + a visually-hidden label. Mechanical. `Button[data-loading]`
  renders it.
- **`FormField`** — label + control slot + the §9.8 helper/error row +
  `aria-describedby` / `aria-invalid` wiring, authored **once**.
  `TextInput` / `Textarea` / `Select` / `QuantityStepper` compose it; their
  public API (`error?: boolean` + `helperText?: string`) is unchanged so no
  screen breaks.
- **`Toast` / `ToastProvider` / `useToast()`** — the missing success/feedback
  primitive. `role="status"`, `--z-toast`, portal to `<body>`, auto-dismiss
  (~4 s, paused on hover/focus per WCAG 2.2.1), `transform` slide, stacks
  (max 4 visible). **Placement is a provider prop** — `top-right` (admin,
  desktop) or `bottom-center` (staff, mobile). No `prefers-reduced-motion`
  special-casing (owner D4). Layout/timing choices flagged for owner review.
- **`PageShell` / `ContentRegion`** — owns `--content-max` (1200 px), the page
  padding (`--sp-7` block / `--sp-8` inline), and a sticky toolbar slot, so
  screens stop hand-rolling their `max-w` / padding (the "stock body doesn't
  fill the viewport like catalog" divergence). `wide` / `flush` escape
  hatches. Real layout decisions — flagged for owner review; Session 11
  adopts it in the screen rebuild.

**2. Two new tokens — `--color-success-hover` / `--color-info-hover`.**
`§9.5` only defines a hover colour for primary / secondary / tertiary /
destructive. `Banner`'s "Accept" (filled `--color-success`) and
`PurchaseDeliveryBanner`'s "Match" (filled `--color-info`) had no §9.5 hover
target and were falling back to `--surface-hover` (a green button going
grey-ish). Added `oklch(46% 0.121 155)` / `oklch(46.5% 0.146 252.3)` — one
lightness step below the base, exactly mirroring how `--color-accent-hover` /
`--color-danger-hover` were derived (ADR-41 era). Written to **both**
`tokens.css` and `tokens.ts`; the drift-guard test passes.

**3. `DatePicker` becomes a real calendar.** Was a trigger + a
caller-supplied `weeks` array with no month navigation. Now has internal
visible-month state, a `selected: Date` / `onSelect` API, `role="grid"` /
`role="gridcell"` semantics, and full keyboard nav (`←→` day, `↑↓` week,
`Home`/`End`, `PageUp`/`PageDown` month, `Shift+PageUp/Down` year, focus on
the selected/today cell on open). The `9S1-0` **visual is byte-identical**;
the behaviour is new. The legacy `weeks` prop is kept as an escape hatch so
`app/design-preview/kit/page.tsx` and any pre-wired screen still work.

**4. `QuantityStepper`'s value becomes a real `<input role="spinbutton">`.**
Was a `<span>`, which made `component-states.md §2 C10`'s "focus (value
field)" and "error (out-of-range typed value)" states permanently
unimplementable. Now typeable, `↑`/`↓` step, `aria-valuenow` / `-min` /
`-max` / `-valuetext` (with unit). REST visual unchanged.

**Also decided (smaller, in the audit):** `Button` gains a `size` prop
(`sm` 32 / `md` 36 / `lg` 44; `md` byte-identical to the sole artboard);
`PillFilter` moves from N× `aria-pressed` toggle buttons to a
`role="radiogroup"` with arrow-key selection (matches `SegmentedControl` and
the single-select-filter reality); `EmptyState` / `ErrorState` / `Banner` /
`MatchCard` / `FrictionDeleteDialog` footer compose `<Button>` instead of
hand-rolling markup, so §9.5/§9.7/§9.10 have one implementation.

**Alternatives considered.**
- *Keep the field components' `error` as `boolean` and NOT introduce
  `FormField`* — rejected: the §9.8 helper row was re-authored in ~6 places
  with no `aria-describedby` anywhere.
- *`QuantityStepper` / `DatePicker` — leave them as-is and mark the spec'd
  states `n/a`* — rejected: the owner picked "make them real" in the
  session kickoff; the spec explicitly lists those states.
- *No new hover tokens — use `filter: brightness(0.92)`* — rejected:
  Session 9 deliberately replaced that fallback for `--color-danger-hover`
  with a real token; success/info should match.

**Consequences.** `components/kit/` gains `spinner.tsx`, `form-field.tsx`,
`toast.tsx`, `page-shell.tsx`, and `internal/overlay.ts` +
`internal/roving.ts`. `app/globals.css §9` gains the `.kit-drawer-panel` /
`.kit-sheet-panel` / `.kit-dialog-panel` slide utilities and the `.kit-scrim`
enter/exit fade. `tokens.css` + `tokens.ts` gain two colours. No screen file
changed. The four review items are settled in Session 10b (Storybook), which
also finalises this ADR.

---

## ADR-44: The Session-4b staff screen artboards are superseded by the proven kit; the kit is the visual acceptance target for the 7 Store Manager + Canteen screens (Session 12)

**Status:** DECIDED (owner, Session 12 kickoff — the developer flagged the
conflict, the owner ruled "kit is the target; artboards superseded" for the
two hubs, then extended the same ruling to all 7 staff screens).

**Context.** Session 12's job was to *compose* the 7 approved Store Manager
+ Canteen mobile screens (`store-manager-mobile-hub`,
`canteen-mobile-operations-hub`, `store-manager-flows-issues-production`,
`store-manager-flows-transfers-consumption`, `canteen-transfer-dispatch`,
`store-manager-stock-levels`, `canteen-stock-levels`) from the proven kit
and wire them to the F2 stock API — the same move Session 11 made for the
Admin screens.

The premise broke on contact. Session 11 worked because the **Admin**
artboards had been re-drawn against the kit in a Design Sprint first. The
**staff** artboards never were — they are the Session 3–4 exports,
transcribed inline by Session 4b *before the kit existed in its current
(Session 9–10d) form*, each carrying an explicit "NO kit swap" flag note:

- The hub banners draw a leading warning/info icon in a `justify-start`
  row and paint the Purchase Delivery banner amber; the kit `<Banner>` /
  `<PurchaseDeliveryBanner>` has no icon slot, a `justify-between` header,
  and a blue delivery variant.
- "Quick Operations" is `flex-wrap basis-[calc(50%-8px)]` cards with the
  icon top-right and an `h2` title; `<ActionTileGrid>` is a fixed
  `w-[300px]` grid of `w-[142px]` tiles, icon on top, `sm` title.
- The Canteen hub's "Workflows" is a bespoke row list with trailing
  chevrons, not a tile grid at all.
- The flow screens use bespoke value boxes / ±32 px steppers / `bg-accent`
  pill tabs — not `<QuantityStepper>` / `<Select>` / `<PillFilter>`.
- The stock-levels screens are a bespoke `h-[52px]` list with a
  `bg-info-bg` `text-[10px]` header — no `<DenseSummaryStrip>`, no
  `<PillFilter>` (the handoff's "compose from" column even says so: *"the
  artboard has no PillFilter, contrary to the handoff's guess"*).

There is also no `docs/design/flows/*.md` for these screens (the directory
is empty). So "compose from the kit" and "match the artboard" could not
both be satisfied.

**Decision.** For all 7 Store Manager + Canteen screens, **the current kit
is the visual acceptance target and the Session-4b artboards are
superseded**. Session 12 (a Development Sprint) composes each screen from
kit primitives per the handoff's Scope table — `<ActionTileGrid>`,
`<TransferBanner>` / `<PurchaseDeliveryBanner>`, `<ActivityTimeline>`,
`<MatchCard>`, `<FlowHeader>`, `<Select>`, `<QuantityStepper>`,
`<BulkEntryGrid>`, `<CalculatedImpactBanner>`, `<DenseSummaryStrip>`,
`<PillFilter>`, `<EmptyState>` / `<ErrorState>`, `<Toast>`, `<PageShell>`,
`<FormField>` — wires them to the F2 API, and runs the per-screen visual
gate against the kit's **Storybook stories** (the primitives are already
Paper-verified — Session 10d parity audit) instead of the stale artboards.
No kit change, no Paper change.

**Alternatives considered.**
- *Pause Session 12; run a Design Sprint to re-draw the 7 staff artboards
  against the kit (as Admin got before Session 11)* — rejected by the
  owner as unnecessary ceremony: the kit primitives are proven and the
  screen compositions are mechanical once the artboards are treated as
  non-binding. Re-drawing 7 artboards to match components that already
  exist adds a sprint and produces nothing the Storybook stories don't
  already show.
- *Compose the hubs from the kit but keep the flow / stock-levels
  artboards as the target* — rejected: the same "transcribed before the
  kit" problem applies to every screen, not just the hubs; a split ruling
  would leave five screens in the same limbo next session.
- *Extend the kit (`Banner` icon slot + delivery-tone variant,
  `ActionTileGrid` row variant, `ActivityTimeline` sizing) so the
  artboards compose verbatim* — rejected: that is a Design Sprint's call,
  not a Development Sprint's, and the divergences are cosmetic, not
  functional.

**Consequences.**
- Session 12 composes and wires all 7 screens into `app/store-manager/**`
  + `app/canteen/**`; `components/kit/*` and `components/shells/*` are
  untouched.
- The `/design-preview/<slug>` skeletons + `docs/design/screens/<slug>/`
  dirs stay as the frozen Session 3–4 visual-regression reference (they
  are *not* the acceptance target — ADR-44 — but they still pin the
  export-workflow's before-state).
- A future Design Sprint may still re-draw the staff artboards against the
  kit for design-system completeness; until then the Storybook stories +
  `component-states.md` are the canonical visual reference for these
  screens.
- The per-screen visual gate for Session 12's screens is "diff the
  composition's structure against the kit Storybook stories", recorded in
  `PROGRESS.md` per screen.

---

## ADR-45: The 3 asset screen artboards are pre-kit and superseded — ADR-44 extends to F3; the register carries no "category" field (Session 13)

**Status:** DECIDED (Session 13 kickoff — the handoff explicitly asked the
developer to check whether the 3 asset artboards have the ADR-44 problem
and decide early).

**Context.** Session 13's job was to build M1-F3 Assets end-to-end,
including composing the Assets Register (`8DL-0`), Asset Drawer (`8JO-0`),
and Asset Delete Dialog (`8IV-0`) from the proven kit. The handoff flagged
that all three are Session 3–4 exports — drawn/transcribed before the kit
existed in its current (Session 9–10d) form — and asked whether ADR-44's
ruling ("kit is the target; diff against Storybook, not the stale
artboard") applies.

On inspection:

- **`8DL-0` (Register)** is a full pre-kit transcription: a bespoke
  240 px sidenav, a bespoke table (not `<SimpleTable>`), bespoke
  underline tabs, inline condition dots (not `<ConditionChip>`), an
  inline `bg-gray-900` summary strip. It also invents a **"Category"**
  field and a category-tab filter — but the `Asset` schema
  (`SCHEMA.md §11`) has **no category column**: an asset is
  `name / location / purchaseDate / purchaseCost / conditionStatus /
  deletedAt`. Adding one is a schema + design decision, out of a
  Development Sprint's scope.
- **`8JO-0` (Drawer)** is pre-kit: a `--surface-panel-tint` panel (the
  retired veil — ADR-41), a bespoke segmented "condition" control, a
  "+ Add Category" affordance for the non-existent field.
- **`8IV-0` (Delete Dialog)** is the exception — Session 2 already
  rebuilt it as a clean `<FrictionDeleteDialog>` composition with the
  ADR-36c per-entity props. It composes cleanly.

**Decision.**

1. **ADR-44 extends to `8DL-0` and `8JO-0`.** The proven kit is the
   visual acceptance target for the Assets Register and Asset Drawer; the
   per-screen visual gate diffs the composition's structure against the
   kit Storybook stories (`PageShell`, `SimpleTable`, `SearchInput`,
   `EmptyState`/`ErrorState`, `Drawer`, `FormField`, `Select`,
   `DatePicker`, `ConditionChip`), recorded in `PROGRESS.md`. No kit
   change, no Paper change.
2. **`8IV-0` is diffed against the artboard directly** — it is already
   kit-shaped (ADR-36c).
3. **No "category" field in M1.** The register has Name / Location /
   Purchase Date / Cost Basis / Condition columns and a condition filter
   — no category column, no category tab filter. If the Admin later wants
   asset categories, that is a Design Sprint + a `Asset.category`
   migration, not a Development Sprint's call.
4. **The 409-blocked delete path** reuses the `<FrictionDeleteDialog>`
   `showArchiveLink` / `onArchive` slot: on a `409 CONFLICT` the dialog
   switches to its can't-delete body copy and the archive-link slot
   becomes the **soft-delete** action (ADR-36c said
   `showArchiveLink={false}` for the *normal* asset path — a used asset
   has no archive-instead affordance; the blocked path is where the
   soft-delete fallback belongs). The kit's link label text
   ("Archive instead — hides it without data loss") is a hardcoded
   non-prop string — a known FLAG carried from the `8IV-0` skeleton, not
   fixed here (no kit change), noted in `PROGRESS.md`.

**Alternatives considered.**
- *Re-draw the 3 asset artboards against the kit first (a Design Sprint)*
  — rejected for the same reason as ADR-44: re-drawing artboards to match
  components that already exist adds a sprint and produces nothing the
  Storybook stories don't already show. The Delete Dialog is already
  done; the other two are mechanical compositions.
- *Add `Asset.category` now so `8DL-0` composes verbatim* — rejected: a
  schema + design decision inside a Development Sprint, for a field with
  no stated requirement (PRD / ADR-22 describe the register as
  name/location/date/cost/condition).

**Consequences.**
- Session 13 composes and wires all 3 screens into `app/admin/assets/**`;
  `components/kit/*` + `components/shells/*` untouched, so the kit
  `test:visual` / `test:a11y` gates are unaffected by definition.
- `/design-preview/{admin-assets-register,asset-drawer,asset-delete-dialog}`
  + their `docs/design/screens/<slug>/` dirs stay as the frozen Session
  3–4 visual-regression reference (not the acceptance target).
- `docs/API.md` + `docs/SCHEMA.md` Assets sections rewritten to what
  shipped; no Prisma migration.

---

## ADR-46: Financials `/admin/financials` (M1 cut) — the **Reconciliation section becomes a table** (rest of the screen unchanged); one status vocabulary for that table; purchase-payment detail promoted to real fields; plus the M1 row-action pattern (delete-in-drawer), the payment-drawer product picker, the A4 kind explainer, and B3 typography (Design Sprint Session 15)

**Status:** Accepted (owner-authorised in-session, 2026-08-29). Design
Sprint — Product Designer. Builds in **Session 16** (Development Sprint).

> **Scope correction (2026-08-29, after the owner reviewed the first
> draft).** The first version of this ADR proposed a full
> "reconciliation-first" restructure: drop the transaction tabs, drop the
> KPI strip, put a `MatchCard` attention region at the top. **The owner
> rejected that** — the tabs are a wanted feature (they let the user
> filter transaction types) and the KPI strip + transactions table are to
> stay exactly as they are. **The only thing that changes is the
> Reconciliation section**, and it changes from a thin
> vendor/amount/status list into a **fuller table** (Date · Supplier /
> Item · Product · Destination · Amount · Status · Action) so the user
> can (a) see whether each payment has been delivered and (b) click a
> "Record payment" action on a delivery that has no payment. §1 and §4
> below are rewritten to this smaller scope; §2–3 and §5–9 are unchanged
> and still apply.

**Context.** The owner's M1 manual walkthrough
(`m1-manual-verification-observations.md` §C) plus a follow-up: *"the
Financials reconciliation UI for purchases and receipts does not really
make sense — it's confusing."* The confusion is in the **Reconciliation
section specifically**:

- It shows only "what's outstanding" in a shape (vendor / amount /
  status / a "Match" link) that doesn't tell the user what state a
  purchase is in at a glance, and it doesn't show **delivered** items at
  all — so the user can't confirm "yes, that payment arrived".
- For a **received item with no payment**, the affordance to go record
  the payment is unclear.
- Supplier / cost / paid-from are **not first-class data** anywhere on
  the screen — they're regex-scraped from a free-text `note`
  (`parsePaymentNote`, ADR-39 §4); misses render as `—`. A proper
  reconciliation table needs real Supplier / Amount columns (§3).
- The three status vocabularies across the screen ("Received / Pending
  Delivery" in the transactions table, "Matched / Unmatched", "awaiting /
  flagged" in reconciliation) don't read as one relationship — the
  reconciliation table adopts **one** set of terms (§2).

M1 constraint respected throughout: **no `MoneyMovement`, no KPI
wiring** — that is F3 / Milestone 3 (ADR-36 D-FIN, `milestone-1-plan §2`).

---

### 1. Structure — everything above the Reconciliation heading is UNCHANGED; only the Reconciliation section changes, from a thin list to a table

**Decision.** `/admin/financials` (M1) keeps its current top-to-bottom
structure **exactly as the approved `7ZJ-0` artboard and the shipped
screen have it**:

1. **Toolbar** — title + **Record Payment** button. *Unchanged.*
2. **KPI stat strip** — the 4 tiles. **Unchanged** (they render `—` /
   "M3" per the M1 cut, ADR-36 D-FIN — not wired, not removed).
3. **Transaction tabs** — All Transactions / Stock Purchases / Operating
   Expenses / Owner Draws. **Unchanged** — these are the user's filter
   for transaction *type* and the owner explicitly wants them kept. In M1
   only "Stock Purchases" has data; the other three are populated in M3.
4. **Transactions table** — the `<SimpleTable>` under the tabs.
   **Unchanged** in structure. (Session 16 *may* align its "Delivery
   Status" column labels to the §2 vocabulary for consistency — low
   priority, owner's call; not required by this ADR.)
5. **Reconciled Outflows footer** — the dark summary strip. *Unchanged.*
6. **Reconciliation section** — **THIS is the only thing that changes.**

**The Reconciliation section — before → after:**

- **Before:** a thin 4-column table (Vendor / Description · Amount ·
  Status · Action) that lists only *outstanding* items — payments
  awaiting a receipt, and receipts with no payment — with a "Match"
  link. It never shows what has already been delivered, and the "Match"
  affordance is unclear.
- **After:** a **fuller table** with these columns:
  **Date · Supplier / Item · Product · Destination · Amount · Status ·
  Action.** It shows **one row per open or recently-resolved purchase**,
  so the user can both *confirm* deliveries and *act on* gaps:
  - **Awaiting delivery** (`warning` dot) — a `purchase_payment` with no
    `purchase_receipt` linking back. Action column: `—`.
  - **Delivered** (`success` dot) — a `purchase_payment` matched to a
    `purchase_receipt`. Action column: `—`. Shown so the user can
    confirm the payment arrived — this is new; the old list hid these.
  - **Received, no payment** (`info` dot, the row gets a
    `--surface-subtle` tint to draw the eye) — a `purchase_receipt` with
    a null `purchasePaymentId`. Action column: a **"Record payment"**
    text affordance (accent) that opens the payment drawer (§6),
    pre-scoped to that product.
  - (**Flagged** (`danger` dot) — a variance was raised on a match;
    Action column: `—`. Only appears when such a row exists.)
- The section keeps its heading; the subtitle becomes *"Has each payment
  been delivered? And which deliveries still need a payment recorded?"*
- When nothing is outstanding **and** nothing was recently resolved, the
  table area collapses to a single all-clear line ("Every payment is
  matched to a delivery, and every delivery has a payment. Nothing to
  reconcile.").

**Data source.** The rows come from
`GET /api/stock-movements/outstanding` (`awaitingReceipt` +
`unmatchedReceipts`) **plus** the recently-`Delivered` `purchase_payment`
rows (a payment that has a `purchase_receipt` linking back). Session 16
decides the "recently" window (e.g. same business day, or last N) — a
Development-Sprint detail, not a design decision. No new endpoint is
required; `outstanding` already returns the open items and
`GET /api/stock-movements?movementType=purchase_payment` the delivered
ones.

**Kit impact: none.** This is a `<SimpleTable>` with a per-screen
`columns` mapper and a `<StatusChip>` (or a dot+text status cell at table
density, per `design-principles.md §4.4`) — all existing kit. The
"Record payment" affordance is a text button in the Action cell, same as
"Edit" elsewhere. **`MatchCard` is no longer used on this screen** — the
first draft's plan to build the reconciliation region out of `MatchCard`s
is dropped; `MatchCard` stays a kit component for the staff mobile hubs
where it is already used.

**Rejected (first-draft proposals the owner turned down):** removing the
transaction tabs; removing / shrinking the KPI strip; a
"reconciliation-first" layout with an attention region at the top of the
screen; building the reconciliation region out of `MatchCard`s.

---

### 2. One status vocabulary — used on every card and every table row

| Term | Meaning | Old terms it replaces |
|---|---|---|
| **Awaiting delivery** | `purchase_payment` row with no `purchase_receipt` linking back | "Pending Delivery", "awaiting", "Payment made, no receipt" |
| **Delivered** | `purchase_payment` matched to a `purchase_receipt` | "Received", "Received (50kg)", "Matched", "Paid (Direct Exp.)" |
| **Delivery, no payment** | `purchase_receipt` with null `purchasePaymentId` | "Unmatched", "flagged", "Receipt, no payment" |
| **Flagged** | a quantity/price variance was raised on a match (`flagTransfer`-style note on the row) | "flagged" (reconciliation), "VARIANCE" |

Chip variants (kit `StatusChip`, `component-states.md §2 C13`):
**Awaiting delivery** → `warning`; **Delivered** → `success`;
**Delivery, no payment** → `info`; **Flagged** → `danger`. These are the
only four status strings the screen renders. `financials-client.tsx`
drops the three ad-hoc vocabularies.

---

### 3. Data-shape — promote supplier / ordered-qty / cost / paid-from to real fields (option (b))

**The choice.** The redesign can either (a) keep reading the parsed
`note` and design around missing values, or (b) make the fields real.
**The owner chose (b).** Recorded consequences:

- **Schema (Session 16 — Prisma migration).** Add nullable columns to
  `StockMovement`, populated only for `movementType = "purchase_payment"`:
  - `purchaseSupplier   String?`
  - `purchaseOrderedQty  Decimal?  @db.Decimal(14, 4)`
  - `purchaseTotalCost   Decimal?  @db.Decimal(14, 2)`
  - `purchasePaidFrom    String?`  // "cash" | "mpesa_bank"
  Chosen over a separate `PurchasePaymentDetail` table: it is one
  migration with no new relation, the read path (`GET
  /api/stock-movements`) already returns the whole row, and
  `purchase_payment` is the only movement type that ever sets them
  (`quantity` stays `0`, ADR-39 §4 unchanged). `SCHEMA.md §3` gains these
  four fields with the "purchase_payment only" note.
- **API (Session 16).** `POST /api/stock-movements` `purchase_payment`
  body is unchanged (`supplier`, `quantity`, `cost`, `paidFromAccount`
  are already sent) — `recordPurchasePayment` now writes them to the new
  columns **and** still composes a human `note` sentence for display
  ("Ordered 20 crate from Nairobi Grains Millers; KES 18,000 from
  M-Pesa / Bank Till"). The row shape in `API.md` "Stock Movements" gains
  `purchaseSupplier` / `purchaseOrderedQty` / `purchaseTotalCost` /
  `purchasePaidFrom`. `GET /api/stock-movements/outstanding` returns the
  same enriched rows.
- **Backfill (Session 16 — one-time, in the migration).** Re-parse every
  existing `purchase_payment` `note` with the old `parsePaymentNote`
  regex; write what parses to the new columns; leave unparseable ones
  `null`. Irreversible-safe (the `note` is retained).
- **Client (Session 16).** `parsePaymentNote` is **deleted**. The
  reconciliation-table mapper and the transactions-table mapper in
  `financials-client.tsx` read the real fields. A `null` renders as
  **"Supplier not recorded"** / **"Cost not recorded"** (muted
  `--text-tertiary`), never a bare `—`.
- **Not in scope.** No `MoneyMovement`, no cash-balance debit — still F3
  (ADR-39 §4). Promoting these four display fields does **not** change
  that boundary.

---

### 4. KPI stat strip — KEPT exactly as it is (scope correction)

**Decision.** The 4-tile KPI stat strip **stays on the M1 screen and the
`7ZJ-0` artboard, unchanged.** The first draft of this ADR proposed
removing it and replacing it with a one-line note; **the owner turned
that down** — it stays. In M1 the four tiles continue to render `—` /
"M3" (correct per the M1 cut, ADR-36 D-FIN); they are **not wired** and
**not removed**. `component-states.md §2 C20` stays "deferred to M3"
(unchanged). The existing `TODO(mock)` comment in `financials-client.tsx`
noting the strip is intentionally unwired stays as-is.

---

### 5. Row-action pattern for M1 tables — one "Edit" affordance per row; delete lives in the drawer (A1 + A2)

**Context.** `m1-manual-verification-observations.md` A1 (cramped
Edit/Delete columns) + A2 (owner wants delete initiated from *inside* the
Edit drawer, no standalone row Delete button). Note: the approved
artboards `6ZO-0` (Product Catalog) and `8DL-0` (Assets Register) **each
already draw a single "Edit" column** — the shipped
`catalog-client.tsx` diverged by adding a second Delete button. So this
is mostly bringing the code back to the artboards plus a new drawer
section.

**Decision — one pattern for every M1 `SimpleTable` (Catalog + Assets):**

- **Table row:** a single **"Edit"** text affordance in the last column
  (accent, `--text-sm`). No Delete column. Row click is **not** wired to
  open Edit in M1 — an explicit "Edit" target is unambiguous at table
  density and leaves row-click free for a future multi-select. (This is
  a documented choice, not a new decision requiring its own ADR.)
- **Edit drawer (rail — see ADR-37b; Catalog's move to `rail` is
  Session 14 / A3):** after the last form section, a full-width
  `--border-subtle` divider, then a **delete section** at the bottom:
  - a `--text-caption` / `--weight-semibold` / `--text-tertiary` uppercase
    label **"Delete this record"** (Catalog: "Delete this product";
    Assets: "Delete this asset");
  - one line of `--text-sm` / `--text-secondary` copy: *"Removes it from
    the catalog. Blocked if it has transaction history — archive it
    instead."* (Assets: *"Removes it from the register. Blocked if it has
    audit history."*);
  - a **destructive tertiary** button (danger label, no fill, per
    `component-states.md §2 C1` — text-only destructive) reading
    **"Delete this product…"** that opens the **unchanged**
    `FrictionDeleteDialog` (ADR-36c retype-gate mechanic — only the
    *entry point* moves, not the friction).
  - The delete section is **not rendered in create mode** (`product ===
    null`) — there is nothing to delete.
- **Kit impact:** none. `Drawer` already supports arbitrary children and
  a footer; the delete section is screen markup composed from an existing
  destructive `<Button variant="tertiary">` + the existing dialog. The
  `Drawer` "footer primary disabled" state is unaffected.
- **Artboards redrawn:** `6ZO-0` (confirm single Edit column — remove the
  divergent Delete if the artboard ever gained one), `796-0` (Product
  Drawer — add the bottom delete section, in the `rail` shape from A3),
  and the Assets equivalents `8DL-0` + `8JO-0` (Asset Drawer — same
  bottom delete section). The `FrictionDeleteDialog` artboards `797-0` /
  `8IV-0` are **unchanged**.

---

### 6. Payment-drawer product picker — scoped to ingredient + goods, and a searchable Select (C1)

**Context.** `m1-manual-verification-observations.md` C1: the product
`<Select>` in Record Payment will hold many products in production; a
plain dropdown is unusable at length. Owner asked about type-to-filter,
max-height, and limiting which kinds appear.

**Decision.**

- **Kind scope — ingredient + goods only.** A `dish` is never purchased
  from a supplier (its cost is derived from ingredients — ADR-33). The
  payment drawer filters its product list to `kind !== "dish"`.
  `API.md` "Stock Movements" `purchase_payment` gains a note: *the
  payment-drawer product picker shows only `ingredient` and `goods`; the
  API does not reject a `dish` productId but the UI never offers one.*
  (A server-side `400` for a `dish` productId on `purchase_payment` is a
  reasonable Session 16 add but is **not required** by this ADR.)
- **Control — the kit `Select` gets a searchable / combobox mode.**
  This **is a kit component change**, so it goes through the kit
  pipeline, **not** Session 16. Full handoff:
  **`docs/sprints/kit-searchable-select-handoff.md`** — two sessions:
  - **Phase A (kit Design Sprint):** 3 new artboard rows on `6CG-0` —
    **Select — Searchable (closed)** (identical to Default),
    **Select — Searchable (open, query typed, list filtered)**,
    **Select — Searchable (open, no matches)**. States otherwise inherit
    §9. `component-states.md §2 C5` promoted from FLAGGED → ARTBOARD; §9
    gains a "searchable" line.
  - **Phase B (kit Developer Sprint):** an **opt-in `searchable` mode**
    added to `components/kit/select.tsx` — a text input in the trigger
    filters the option list (`label` contains, case-insensitive),
    `max-height` ≈ 8 rows then scroll, a "No matches" row, keyboard =
    the existing APG combobox extended to the input. `searchable` off =
    byte-unchanged behaviour, so no existing call site moves. +3
    Storybook stories, `test:visual` + `test:a11y` + §9 `postVisit`.
    This is an **edit** of the Session-10 APG-listbox `Select`, **not a
    rebuild**.
  - Until Phase B ships, **Session 16's interim** is acceptable: the
    plain `Select` popover with `max-height: ~280px` + scroll, the list
    already cut down by the `ingredient + goods` filter. The interim,
    not the target.
- **Artboard redrawn:** `85W-0` (Payment Drawer) — product row shows the
  searchable control; a caption notes "Ingredients & Goods only".

---

### 7. Artboards this ADR produces / redraws

| Artboard | Change |
|---|---|
| `Admin Financials — Full Table (Recon = table) [S15]` (a copy of `7ZJ-0`) | KPI strip, tabs, transactions table, reconciled-outflows footer — **all unchanged**. **Only the Reconciliation section is redrawn** as the fuller table (Date · Supplier/Item · Product · Destination · Amount · Status · Action) with the three status rows (Awaiting delivery / Delivered / Received-no-payment + a "Record payment" action). Session 16 folds this back onto `7ZJ-0`. |
| `Financials Reconciliation — section states [S15]` (standalone artboard) | **All reconciled** (single all-clear line) + **Loading** (3 skeleton rows). Both are *just the reconciliation section*, not whole-screen states. |
| `Admin Financials — Payment Drawer (searchable picker) [S15]` (a copy of `85W-0`) | Searchable, `ingredient`/`goods`-scoped product Select; Destination restored as its own field; "Ingredients & Goods only" caption. Rail shape unchanged. The two `Body` frames are renamed `Body — screen (no drawer)` / `Body — screen + drawer open` (that split is `85W-0`'s own pre-existing construction, not new). |
| `Product Drawer — rail + kind hint + delete section [S15]` (a copy of `796-0`) | Rail shape (A3-intended); A4 kind-explainer hint under the `SegmentedControl`; the `dish`-only info-banner removed; the bottom "Delete this product" section (A2). |
| `Admin Catalog — Archived tab [S15]` (a copy of `6ZO-0`) | ADR-47 — the "Archived" tab active: neutral "Archived" chip, "Unarchive" row action, "N archived" count. Confirms the single-Edit-column row pattern (the base `6ZO-0` already draws one). |
| `6CG-0` Form Controls | **New rows to draw in a kit Design Sprint** (not this session): Select searchable (closed / open-filtered / open-no-match). The kind hint is a **screen** composition, not a kit row. |
| Not drawn — spec'd for Session 16 | Assets Register "Archived" tab; Asset Drawer bottom delete section; the `6OE-0` "Edit Drawer — archived record" caption. Direct repeats of the patterns above. |

### 8. A4 — Ingredient / Dish / Goods explainer (folded in here)

The kind selector gets a **selection-driven hint line** directly under
the `SegmentedControl` (the `FormField` `hint` slot pattern — no new kit
component; `SegmentedControl` gains no description slot). The line
changes with the selected segment:

- **Ingredient** — "A raw item you buy and cook with. Has a buying price;
  used up by production."
- **Dish** — "A finished item you sell from the menu. It has no buying
  price — its cost comes from the ingredients it uses."
- **Goods** — "An item you buy and resell as-is. Has a buying price and a
  selling price."

This replaces the current static `DISH_NOTE` info-banner that only shows
for `dish`. The `dish` hint carries the same fact in the same place as
the other two, so the standalone amber banner is removed.
`component-states.md` records the hint as a screen-level composition of
`FormField` `hint`, not a kit change.

### 9. B3 — ledger digit typography (folded in here → `design-principles.md §4`)

Confirm + document, no redesign. The ledger's numeric cells use
`--font-mono` (JetBrains Mono). Monospace is inherently tabular, which is
the finance-table convention — digits align in their columns for
scan-and-compare down a reconciliation sheet. Weights, now pinned as a
stated rule:

- **movement value cells** (Opening, Purchases, Issues, …) —
  `--weight-regular`;
- **derived-total columns** (Closing, Closing Value) and the **sticky
  footer totals** — `--weight-semibold`;
- any **proportional-font numeric column** in a `SimpleTable` (e.g.
  Financials amounts) carries `font-variant-numeric: tabular-nums`
  (house rule §1, now cross-referenced from §4).

No artboard changes. Written into `design-principles.md §4` as a numbered
item.

---

### Consequences

- Session 16 build list is in `PROGRESS.md` (Session 15 entry) and
  `session-16-handoff.md`.
- One Prisma migration (four nullable `StockMovement` columns + a
  data-only backfill step). `SCHEMA.md §3` + `API.md` "Stock Movements" /
  "Catalog" updated by Session 16.
- One kit item flagged for a future kit Design Sprint: **searchable
  `Select`** (the `6CG-0` rows are *spec'd* this session, drawn by that
  kit session — see §7).
- `financials-client.tsx` loses `parsePaymentNote` and rebuilds **only
  the Reconciliation section** as the fuller table with the §2
  vocabulary. The tabs, the KPI strip markup, the transactions table, and
  the reconciled-outflows footer are **untouched** (scope correction —
  see the box at the top of this ADR).
- `product-delete-dialog.tsx` / `asset-delete-dialog.tsx` are unchanged;
  only their **caller** moves (from a table-row button to a drawer
  button).
- No `MatchCard` change and no `MatchCard` use on this screen.

---

## ADR-47: Archive model — the Archived list is a table tab, Unarchive is a friction-free reverse, and M1 enforces the stock-flow picker exclusion (Design Sprint Session 15)

**Status:** Accepted (owner-authorised in-session, 2026-08-29). Design
Sprint — Product Designer. Design + API spec only; **built in Session
16** (Development Sprint). Extends ADR-23 (soft/hard-delete mechanics);
adjacent to but distinct from ADR-38 (dropped *locations* deactivated).

**Context.** `m1-manual-verification-observations.md` A5. The owner's
expectation for Archive (products / ingredients / goods, and by extension
assets):

1. An archived item is **removed from the main list entirely** and
   appears **only** in a dedicated **Archived** list.
2. While archived it is **blocked from every action** an active item has
   (no edit, no price change, no use in any flow).
3. **Reversible** via an **Unarchive** action from the Archived list.

**Current reality.** Soft-delete stamps `deletedAt` and hides the row
from the default list unless `?includeArchived=true` (products) /
`?includeDeleted=true` (assets). But: there is **no Archived-list UI**
for assets (Catalog *does* already have an "Archived" tab —
`catalog-client.tsx`), **no Unarchive endpoint** for either, and
"blocked from all actions" is **not enforced or tested**.

---

### 1. The Archived list — a tab on the existing table

**Decision.** The Archived list is **a tab on the existing record
table**, not a separate route or view:

- **Catalog:** the **"Archived" tab already exists** in
  `catalog-client.tsx` (`{ key: "archived", ... archived: true }`). Keep
  it. It sits last, after All / Ingredients / Dishes / Goods.
- **Assets:** **add an "Archived" tab** to the Assets Register
  (`8DL-0` currently draws All Categories / Kitchen Equipment / …). It
  sits last, after the category tabs.
- **Columns:** the **same columns as the active list**, with the
  last-column action changed from **"Edit"** to **"Unarchive"** (accent
  text affordance, same slot). No other column differs. The active
  list's row count chip ("47 products") reflects the active tab's count,
  as today.
- An archived row shows a **neutral "Archived" `StatusChip`** in its
  name cell (Catalog mobile already does this — extend to the desktop
  table and to Assets) so the tab's contents are unmistakably a
  different class of record.

**Rejected:** a separate `/admin/catalog/archived` route (more
navigation for a rarely-visited list; the tab is already there); a
modal/drawer "Archived items" panel (loses the table columns the user
needs to identify the right row).

---

### 2. Unarchive — no friction

**Decision.** Unarchive is a **single-click action from the Archived
tab** — a plain confirm-free button. Rationale: unarchiving is **safe and
fully reversible** (it only clears `deletedAt`); it creates no data loss
risk and needs no retype gate (contrast hard-delete, ADR-23). On success:
a `<Toast>` ("Product restored" / "Asset restored") and the row leaves
the Archived tab (it now appears in the active tabs).

No "Unarchive" confirmation dialog. No `FrictionDeleteDialog` variant.

---

### 3. M1 enforcement scope — the stock-flow picker exclusion is the line that matters

"Blocked from every action" is broad. M1 enforces the subset that
protects **trustworthy numbers**, and defers the rest:

**Enforced in M1:**

1. **Excluded from every product/asset picker in every stock flow** —
   this is the integrity-critical one. Archived products must not be
   selectable in: `issue`, `production`, `transfer` (both ends),
   `non_sale_consumption`, `purchase_payment` (the Record Payment
   drawer), the bulk opening-stock grid, and the mobile stock-levels
   views. Archived assets must not be selectable in the asset
   condition-transition surface. Mechanism: every one of these already
   calls `listProducts` / `listAssets`, which **already** exclude
   `deletedAt != null` by default — Session 16's job is a **call-site
   audit** confirming **none** of them pass `includeArchived` /
   `includeDeleted`, plus a test per flow that an archived product does
   not appear in its picker.
2. **Edit is unavailable while archived.** The Archived tab offers only
   **Unarchive**, no **Edit** — so the Edit drawer never opens for an
   archived row, and therefore **price change, kind change, and
   per-location edits are all impossible** while archived, with no
   per-field lockout UI needed. If a deep link / stale state does open
   the drawer on an archived row, the drawer renders its fields
   **disabled** and shows a single info line ("This record is archived.
   Unarchive it to make changes.") with only a **Close** button — cheap
   to add, no new component.
3. **`GET /api/products/:id` / `GET /api/assets/:id` already `404`** a
   soft-deleted row (API.md, unchanged) — so any direct-fetch path is
   already blocked.

**Deferred past M1 (documented, not built):**

- A dedicated read-only "view archived record" drawer (M1 has no
  read-only drawer pattern; Unarchive-then-view is the M1 path).
- Blocking an archived product from appearing in **historical**
  read surfaces (the ledger, reports) — archived records **must** still
  show in history (that is the point of soft-delete, ADR-23); "blocked
  from actions" never meant "erased from the past".
- Recipe editing referencing an archived ingredient — recipes are
  informational only (ADR-33) and out of the M1 cut.

---

### 4. API delta for Session 16

Aligned with ADR-23 and the existing `?mode=archive` / `soft-delete`
shapes:

- **Products — Unarchive.** `POST /api/products/:id?mode=unarchive`
  (mirror of the existing `DELETE /api/products/:id?mode=archive`).
  Roles: Admin. Clears `deletedAt`. Does **not** reactivate
  `ProductLocation` rows automatically (they were deactivated on archive
  per ADR-38; the Admin re-enables the ones they want via the Edit
  drawer — matches ADR-38's "re-enabling a location restores its last
  price"). Idempotent. Returns `{ data: { archived: false } }`.
  - *Alternative spelling if the team prefers verb symmetry:* a
    `PATCH /api/products/:id` with `{ "unarchive": true }` as a
    third body shape. ADR recommends the `?mode=unarchive` query form —
    it mirrors the archive path exactly and keeps `PATCH` meaning "edit
    the fields".
- **Assets — Restore.** `POST /api/assets/:id/restore` (mirror of the
  existing `POST /api/assets/:id/soft-delete`). Roles: Admin. Clears
  `deletedAt`. Idempotent. Returns `{ data: { softDeleted: false } }`.
- **List filters — unchanged behaviour, audited call sites.**
  `listProducts` / `listAssets` already default to excluding
  `deletedAt != null`; `?includeArchived=true` / `?includeDeleted=true`
  are the Archived-tab's own reads. Session 16 audits that **only** the
  Archived tab passes them.
- **`GET /api/products` / `GET /api/assets`** gain no new params.
- **`SCHEMA.md`** unchanged (no new columns — `deletedAt` already
  exists).

---

### 5. Artboards this ADR produces

| Artboard | Change |
|---|---|
| `6ZO-0` Product Catalog | **New state artboard** — "Archived" tab active: rows show the neutral "Archived" chip, last column reads **"Unarchive"**, no "Edit". |
| `8DL-0` Assets Register | **Redrawn** — an "Archived" tab added after the category tabs; **new state artboard** for that tab active (same treatment as Catalog). |
| `8L7-0` Admin Catalog — Mobile | **Touched** — the mobile card's row action on the Archived tab is "Unarchive", not "Edit". |
| Flow pickers (`85W-0`, `8XH-0`, `92M-0`, `9FE-0`, bulk grid `7UD-0`) | **No visual change** — archived products simply do not appear. One **caption** added to the `Select` / picker artboard note: "archived products are excluded". |
| Edit drawer archived-guard state | **New row on `6OE-0`** — "Edit Drawer — archived record (fields disabled, Close only)" — the cheap fallback from §3.2. Flagged as a small kit-caption addition, not a new component. |

---

### Consequences

- Session 16 builds: two endpoints (`?mode=unarchive`, `/assets/:id/restore`),
  the Assets "Archived" tab, the desktop "Archived" chip on both tables,
  the Unarchive button + toast, the drawer archived-guard fallback, the
  call-site audit + one picker-exclusion test per stock flow.
- No schema migration.
- `ADR-23` is unchanged; this ADR is the "how the reverse works + how far
  M1 enforces it" that ADR-23 left open.
- `component-states.md §2` gains: `SimpleTable` — "Archived tab" row
  treatment; `Drawer` — archived-guard caption.

---

## ADR-48: `Select` `searchable` mode — three provisional implementation calls (kit Developer Sprint, `kit-searchable-select-handoff.md` Phase B, 2026-08-29)

**Status:** REVIEW ITEMS — pending owner ratification in the running
Storybook (ADR-43 pattern). Built + gated (`select.stories` slice 14/14:
`test:visual` + `test:a11y` + §9 `postVisit`; `tsc` 0; `pnpm test` no new
failures). `searchable` off = byte-unchanged, so nothing regresses if a
call is later reversed.

**Context.** ADR-46 §6 authorised an opt-in `searchable` mode on the kit
`Select` (a filter input over the option list) for the Financials
payment-drawer product picker. The handoff (Phase B) left three points
"decide + document":

1. **Chevron is decorative; the whole open field toggles.** In the open
   searchable state the trigger is the APG "Editable Combobox With List
   Autocomplete (none)" shape — `<input role="combobox">` inside a
   `<div class="kit-field">`. The chevron is a plain `aria-hidden` SVG
   (no `<button>`), and clicking anywhere on the wrapper focuses the
   input. Rationale: a second focusable "Toggle options" button adds a
   tab stop and an extra ARIA element for no user gain when the field is
   already open and the list is already visible; ArrowUp/Down and Esc
   cover keyboard toggling. *Reversible* — add
   `<button tabindex="-1" aria-label="Toggle options">` around the
   chevron if review wants an explicit affordance.

2. **First Esc clears a non-empty query; a second Esc (or Esc on an
   empty query) closes.** Matches the APG editable-combobox note. On the
   non-searchable path Esc still closes immediately (unchanged).

3. **Popover height cap = `calc(var(--control-md) * 8)` = 288px.** The
   `6CG-0` "Select — Searchable (open…)" artboard was drawn at
   `max-height: 288px`; the handoff text says "≈ 8 × --control-sm (≈ 8 ×
   36px = 288px)" but `--control-sm` is 32px, so its own arithmetic uses
   36px = `--control-md`. `--control-md` is the token that yields the
   drawn value, so the code uses `max-h-[calc(var(--control-md)*8)]`.
   Option rows themselves stay `h-(--control-sm)` (32px), unchanged.

**Also settled in Phase A (not a Phase-B call, recorded here for
completeness):** the matched substring in a filtered option label is
**not** highlighted; the empty-result copy is the generic `"No matches"`,
overridable per call via `noMatchesLabel`.

**Not in scope** (unchanged from the handoff): no autocomplete-inline, no
multi-select, no async/remote options; no change to the non-searchable
`Select` beyond making the new paths inert; no screen file — the
payment-drawer swap to `<Select searchable>` is a later Development-Sprint
edit.

---

## ADR-49: M2 Submission-1 fidelity pass — three carried decisions (Tech Lead Session FINAL, 2026-09-01)

**Status:** ACCEPTED. Recorded at the M2 Submission-1 landing; each item
was ratified in-session by the owner during the fidelity-pass sprints
(3-DOMAIN, 3a, 3c/3d, 3-KIT-FILTER). No new behaviour is introduced
here — this ADR just gives the three a permanent home.

### 1. ADR-44 reversal (partial) — the one-line movement-form body is superseded; the multi-row picker is restored

ADR-44 accepted the Session-4b Store Manager / Canteen artboards being
replaced by the proven kit, and in doing so the 6 staff movement flows
(SM receive / issue / production / transfer / non-sale, + Canteen
dispatch) shipped with a **single-line** form body. The owner chose
**Option A** on 2026-08-31: restore the **multi-row
`SelectableProductRow` picker** (select many products, per-row quantity)
as the flow body. Sessions 3c / 3d rebuilt all 6 flows on one shared
`MovementPickerFlow` + `FLOW_CONFIG`.

**What still stands from ADR-44:** the `FlowScaffold` chrome —
`FlowHeader` + a scroll body + a sticky submit bar — is unchanged; only
the body between them changed from one line to N rows. The kit is the
visual acceptance target (ADR-44's core claim) — `SelectableProductRow`
went through the full ADR-42 gate (9 stories/baselines) before the flows
composed it.

**Interim residual (tracked as a follow-up, not fixed here):** additive
flows pass `max(onHand, lineQty, 1)` as the row's "available" figure
because `SelectableProductRow` has no additive / `neverBlocks` mode yet —
so a 0-stock product reads `In Rest.: 1` on an additive flow. The KIT
follow-up (`neverBlocks` mode) removes it.

### 2. `editOwnOrder` audit prune (F7-10) — the one place M2 deletes an audit row instead of appending

A same-day Cashier edit of their own order (`editOwnOrder`) **deletes**
the `AuditLog` rows for the `MoneyMovement`s it is about to replace, then
writes the fresh movements. This is the only path in M2 that removes an
`AuditLog` row rather than appending a correction row.

**Why it's acceptable:** the movements those audit rows described no
longer exist after the edit (a same-day edit is a true rewrite, not a
correction — CONVENTIONS §4.6), and the edit itself is audited by a fresh
`action: "correct"` `AuditLog` row naming the order. No history of a
*posted* (day-closed) record is ever mutated — that path is still the
append-only Admin correction.

**Inverse, recorded for completeness:** the single-line stock-movement
domain fns (`receiveStock` / `issueStock` / … ) **gained** a per-call
`AuditLog` row in `feat/m2-batch-movements`. They previously wrote **none**
— a latent ADR-25 (every mutation writes `AuditLog`) gap, now closed. The
new batch endpoints write 1 `AuditLog` row per line plus a `batch_*`
`correlationId`.

### 3. `Select` / `DatePicker` `aria-label` prop — additive, a11y-only

`feat/m2-3kit-filter-toolbar` added an optional `aria-label` prop to the
kit `Select` and `DatePicker`. It is **a11y-only** (names the label-less
trigger for screen readers) and **ignored when `label` is set**. It was
needed so `<FilterToolbar>` can render its compact label-less filter
triggers without an accessibility violation. **No behaviour or visual
change at any existing call site** — every current `Select` / `DatePicker`
passes `label`, so the prop is inert for them.

---

---

## ADR-50: A superseded order is excluded from `listOrders`; the ledger's Opening is derived backwards from the day's closing (Developer, 2026-09-02)

**Context.** The 2026-09-02 quantity audit (`docs/sprints/m2-quantity-audit.md`)
found two defects whose fixes are contract changes, not local patches.

### 50a — corrections: exclude the superseded original (F1)

`correctOrder` writes the correction's `total` as the **full recomputed
total**, not a delta. `listOrders` returned both the superseded original
and the correction as ordinary rows, so any consumer that summed the rows
counted the sale twice: live on 2026-09-01 the Cashier's Today header read
"KES 380 · 2 orders" against KES 120 truly collected on 1 order, and the
Admin sales list double-counted identically (naive 1380 vs true 1120).

**Decision.** `listOrders` does not return an order once a correction
supersedes it. Considered and rejected: returning both rows with a
`superseded` flag for consumers to honour — it leaves every present and
future consumer one forgotten check away from re-introducing the bug.

**Consequences.** Revenue totals are correct with the naive sum screens
already do. The superseded original is no longer visible in a list; the
audit trail lives in `AuditLog` and on the correction's `correctsOrderId`.
The artboard's "Corrected" chip on the original has nothing left to mark
and was removed from C1 — the "Correction" chip on the surviving row
remains. This also repairs a second defect: a cashier-scoped query never
returned the Admin's correction, so a cashier's screen could not tell that
an order had been superseded at all. The superseding lookup therefore
deliberately runs **outside** the caller's role/date scope.

### 50b — the ledger's Opening is derived backwards (F4)

`COLUMN_FOR_TYPE` routes `opening` and `stock_count` to **no column** —
correctly, since neither is a movement that happened during the day. But
Opening was read forward as the prior day's closing, so on the very day a
product's opening stock was established the grid rendered
`Opening 0.0 · all columns — · Closing 0.0` for a Store that really held
40kg. The ledger's own Closing contradicted
`GET /api/stock-movements/balances` for the same date.

**Decision.** Closing is the day's derived balance (`balances asOf date`),
and **Opening is computed backwards** from it:
`opening = closing − Σ(the day's columned movements)`. Considered and
rejected: giving `opening` its own column — it fixes only that one type,
and `stock_count` has the identical shape.

**Consequences.** Any movement type that feeds no column keeps its effect
inside the Opening figure, so the rule self-heals for types added later.
Closing can never again disagree with the balances API, because it *is*
that read. Verified against the seed: 19 wrong rows on the opening day → 0,
the other six days unchanged.

---

## ADR-51: Transfer shortfalls are booked as a `variance` movement paired at the destination (Developer, 2026-09-02)

**Context.** Accepting a transfer short (dispatched 6, accepted 4) left the
2 missing units as **free text on the accept row** ("Received 4, dispatched
6"). Each location's balance was right — the source dropped by the full
dispatched magnitude at phase 1, the destination rose by what arrived — but
system-wide stock fell 60 → 58 with no column able to explain it, so a
daily reconciliation could not see where the stock went without reading
every note. This is a missing accounting concept, not an arithmetic bug.

**Decision.** A new `variance` `MovementType`. Accepting short books a
**pair at the destination**: the `transfer` receipt lands the **full
dispatched** magnitude, and a `variance` row immediately writes the
difference off (negative for a shortfall, positive for an overage).

**Why paired, and why at the destination.** A balance is a plain signed sum
of the rows *at* a location (ADR-14) — so any row written anywhere moves
that location's balance. Both balances were already correct, which leaves
nowhere to simply "add" a loss row without corrupting one of them. Booking
the variance at the source was tried first and understated the source by
the shortfall (70 → 68 for stock it never held). The write-off must
therefore be paired with the receipt it offsets: goods are treated as
having arrived and then been written off on receipt.

**Consequences.** Balances are byte-identical to the previous behaviour;
what changes is that the loss is an ordinary signed movement anything can
sum. The variance row carries `transferCounterpartLocationId` for
traceability and does **not** take `correctsMovementId` — that link is what
marks a dispatch accepted, and only the `+q` row may claim it.

**Open.** `variance` currently routes into the ledger's **Issues** column
so the TOTAL reconciles. A column of its own is the better home but
requires editing the frozen `<DenseLedger>`; raised with the owner rather
than forked (CLAUDE.md: never change the kit unprompted).

---

## ADR-52: Day Close is a reversible seal — low-friction reopen, `AuditLog` is the history; one shared guard in `lib/domain/audit` (Developer, Milestone 3 Session 1, 2026-09-02)

**Context.** M2 shipped with day-close as a *soft* check — "is this row's
business date today?" — sprinkled inline in the few write paths that
cared (`editOwnOrder`, `voidStockCount`, `correctMovement`). M3 needs a
real seal: the Admin freezes a business date so its cash, variance and
profit figures stop moving and daily reconciliation (and later
reporting) is trustworthy. The `DayClose` model already existed
(`date @unique @db.Date`, `closedBy`, `closedAt`); nothing enforced it
except `correctMovement`'s inline `tx.dayClose.findUnique`.

**Decision — reopening is permitted and deliberately low-friction.** The
Admin can reopen *any* previously closed date, including historical ones,
with a single toggle. No type-to-confirm, no multi-step dialog. The owner
wants full control over their own data and does not want friction they
did not ask for.

**Decision — the audit trail is the safety mechanism.** Because reopening
is permissive, history is preserved by `AuditLog`, not by making the seal
hard to undo. Every close writes an `AuditLog` row (`action: "day_close"`)
and every reopen writes one (`action: "day_reopen"`) — who, when, which
date. Two new `AuditAction` enum values; additive migration
(`20260903120000_add_day_close_audit_actions`). This is non-negotiable:
it is what makes the full-control model sound.

**Decision — one shared guard, in `lib/domain/audit`.** `CONVENTIONS.md`
§1 already names `lib/domain/audit` as the home of "AuditLog, DayClose",
and §5 already points day-boundary logic there. So the guard lives there,
not in `lib/time` (which stays pure date math). `lib/domain/audit` is now
a real module (was an empty dir). It exports:

- `isDayClosed(dateOrBusinessDate, tx?)` — boolean.
- `assertDayOpen(dateOrBusinessDate, tx?)` — throws `FORBIDDEN` if sealed.
  Used by every **create** path: `createOrder`, `recordStockCount`,
  `recordRepayment`, `setOpeningStock`, `recordPurchasePayment`, and the
  `writeMovementLine` chokepoint (all 8 stock movement fns + their
  batches). No actor argument — **nobody** writes a fresh primary row on
  a sealed date, Admin included; the Admin's route in is a correction.
- `assertActorMayCorrectOnDate(dateOrBusinessDate, actor, originalRecordedById, tx?)`
  — the **correction** gate (`CONVENTIONS.md` §4.6): closed day → admin
  only; open day → admin or the original recorder. Replaces the inline
  block in `correctMovement`; `editOwnOrder` / `voidStockCount` use the
  simpler `isDayClosed` (they are staff same-day actions, never Admin
  corrections).
- `closeDay` / `reopenDay` / `listDayCloses` / `getDayStatus` domain fns.

**Consequences / notes.**

- **`correctOrder` and `acceptTransfer` are deliberately NOT gated.**
  `correctOrder` *is* the sanctioned append-only correction path and must
  work on closed days (that is the point). `acceptTransfer` /
  `flagTransfer` stamp `occurredAt = now` and complete an *in-flight*
  operation — gating them would strand a dispatched transfer the moment a
  day closes. Both write via `tx.stockMovement.create` directly, not
  `writeMovementLine`, so the chokepoint gate does not catch them either
  — that is by design, not an oversight.
- **Behaviour change vs M2:** the old "is the business date today?"
  heuristic rejected *any* backdated edit even when that day was never
  closed. The real gate only rejects on an actual `DayClose` row. Three
  domain tests that asserted the heuristic were rewritten to seal the
  date first (`edit-own-order`, `record-stock-count`, `qa-m2-session-7`).
- **`DayClose.date` has no scope column.** It is `@unique`, so test
  suites that seal a date must clean it up; `cleanupSalesTestData` and
  the new `lib/domain/audit` test-helper delete `dayClose` rows by
  `closedBy IN (suite user ids)`. Audit-domain tests use fixed 2019-…
  dates well outside any other suite's range.
- **API:** `app/api/day-close` — `GET` (today's status + recent closes),
  `POST` (close → 201, `CONFLICT` if already closed), `DELETE` (reopen →
  `NOT_FOUND` if not closed). Admin-only, all verbs.
- **UI:** one card on the existing `/admin` dashboard page (was an
  `EmptyState` placeholder) — today's status, a close/reopen
  `ToggleSwitch`, and a `SimpleTable` of recent closed dates each with a
  one-tap **Reopen**. Composed from the frozen kit; no new route, no kit
  changes.

---

## ADR-53: Staff may only create or edit records dated TODAY — a second gate alongside day-close (Developer, Milestone 3 Session 2, 2026-09-03)

**Context.** ADR-52 replaced the old M2 "is the business date today?"
heuristic with a real `DayClose` lookup. That left a gap the owner
flagged after Session 1 shipped: with only `assertDayOpen` in force, a
staff member could create or edit a record dated to **any** past or
future day that nobody had closed yet. The owner's rule: staff work is
always "today's" work — a Cashier or attendant has no business
backdating an order, a count, a repayment, or a handover.

**Decision.** A single shared guard, `assertStaffDateIsToday(value,
actor)`, in `lib/domain/audit/day-close-guard.ts` (exported from the
module barrel):

- `actor.role === "admin"` → **not restricted.** The Admin still records
  and corrects on past dates, subject only to the day-close rules
  (`assertDayOpen` for a fresh row on an open past day; the correction
  paths for a sealed one).
- Any other role, `value`'s Africa/Nairobi business date ≠ today →
  `FORBIDDEN` ("You can only record or edit entries dated today.").

This is **in addition to** `assertDayOpen`, never a replacement. A staff
create path calls **both** — blocked on a closed day *and* on any
non-today date. `value` accepts a `Date` instant or a `YYYY-MM-DD`
string (same signature style as the other guards).

**Call sites (the gate is implemented once; these just delegate):**

- `createOrder`, `editOwnOrder` — `ctx` already carries `role`.
- `recordStockCount`, `voidStockCount` — `ctx` already carries `role`.
- `recordRepayment` — `CustomerContext` gained an optional `role`; the
  repayments route passes `auth.user.role`. Guard is skipped only if
  `role` is absent (no production caller omits it).
- `declareHandover`, `editOwnHandover` — built on the corrected rule
  from the start (this session), not retrofitted.
- `writeMovementLine` (the stock chokepoint) — `LineAuditMeta` gained an
  optional `actorRole`; when set, the gate runs on the row's
  `occurredAt`. **Every stock create path lands at `new Date()` today**,
  so there is no live backdating vector through stock — this is a
  chokepoint guard for any future backdated stock path. Existing callers
  do not pass `actorRole` yet; nothing regresses.

**Not gated:** the Admin correction paths (`correctOrder`,
`correctMovement`, `correctHandover`, `correctReceipt`) — a correction
must work on any date and already enforces admin-only. `acceptTransfer`
/ `flagTransfer` — in-flight completions stamped `now` (ADR-52 rationale
unchanged).

**Tests.** One test per rule (`lib/domain/audit/staff-today-guard.test.ts`),
not one per call site: non-admin + non-today → `FORBIDDEN`; non-admin +
today → allowed; admin + past date → allowed. The handovers domain suite
adds an integration check (`declareHandover` staff-backdate → `FORBIDDEN`).
Existing sales/stock suites that backdated staff writes now either seal
the date (already do, post-ADR-52) or use an admin actor for the
backdated setup.

---

## ADR-54: Recording a handover receipt writes NO `MoneyMovement` — a handover is a custody transfer, not new revenue (Developer, Milestone 3 Session 2, 2026-09-03)

**Context.** `POST /api/handovers/:id/receive` records what the Admin
actually received against what a staff member declared, and API.md's
sketch said it "Writes `MoneyMovement` rows." `MoneySourceType` even
carries a `handover_receipt` value. The `/admin/financials` KPIs (Cash
at hand, M-Pesa/Bank) that Session 4 builds derive from
`SUM(MoneyMovement.amount)` grouped by account (`getAccountBalances`).
The question: does a receipt write a money row, and if so — received?
declared? the variance? — into which account?

**Decision — a receipt writes no `MoneyMovement`.** Reasoning:

1. **Double-count.** Orders (`sourceType: "order"`) and canteen sales
   (`sourceType: "canteen_sale"`) already append `+amount`
   `MoneyMovement` rows to `cash` / `mpesa_bank` **at the moment the
   sale is recorded**. A handover moves *those same physical takings*
   from staff custody to the Admin. If a receipt also wrote `+received`,
   the day's revenue would land in Cash-at-hand twice.
2. **No account to move between.** `MoneyAccount` is `cash | mpesa_bank`
   only — there is no `cash_in_till` vs `cash_at_hand` split. A custody
   transfer within "cash" has no ledger effect to record; a
   `MoneyMovement` would either double-count (positive) or be a no-op
   pair we don't model.
3. **Variance is not a ledger movement.** A shortfall means physical
   cash went missing between the till and the Admin — it does not reduce
   the business's *recorded* revenue. PRD §4.8: shortfalls don't block
   day-close and don't auto-deduct pay. It is captured as a
   `HandoverShortfall` row (required note, against the responsible staff
   member) for the Admin to pursue — not a debit.
4. **Precedent.** ADR-39 §4 established that money-write decisions defer
   to Financials rather than being scattered across modules. The
   conservative, non-double-counting choice is to write nothing now.

**Stored, permanent variance stands.** `ReceiptOfHandover.cashVariance`
/ `mpesaVariance` = `received − (current derived declared)` are computed
once at receipt time and stored (PRD §4.5 — never recomputed on read).
"Current derived declared" folds in any `correctHandover` deltas.

**Hook for Session 4.** If Financials introduces a till-vs-hand account
split (so "Cash at hand" means *the Admin's* cash, distinct from cash in
a cashier's drawer), then a handover receipt becomes the transfer event
between those two accounts and SHOULD write a paired movement
(`−received` from till, `+received` to hand) with `sourceType:
"handover_receipt"` — the enum value is reserved for exactly this. That
is a deliberate Session-4 decision, not something to bolt on here.
Until then: no money row.

**No `TODO(mock)`** — this is a decision, not a deferral. There is
nothing stubbed.

> **Context added Milestone 3 Session 4 (2026-09-02) — the split is NOT
> happening (owner decision).** Session 4 (Financials) considered the
> till-vs-hand account split described in the hook above and the owner
> decided **against it for now**. The `MoneyAccount` model stays
> `cash | mpesa_bank`; "Cash at hand" continues to count takings from the
> moment of sale. No `handover_receipt` `MoneyMovement` is written; no
> account dimension is added. The reserved `handover_receipt` enum value
> remains reserved for a future session if the owner ever wants the
> split. Session 4 verified from inside the code that the no-split model
> holds together: a handover receipt still writes nothing, so the day's
> revenue is counted exactly once and the profit figures in ADR-55 are
> unaffected by handovers.

---

## ADR-55: Cost of Goods Sold — one all-stock valuation sweep, dishes valued at zero; non-sale consumption is a separate report with a configurable dish cost proxy (Developer, Milestone 3 Session 4, 2026-09-02)

**Context:** PRD §3 (as originally written) and ADR-33 scoped Dish COGS to
an **ingredients-only** sweep: `opening ingredient stock + ingredient
purchase receipts − closing ingredient stock`, blended business-wide, with
a separate per-unit `buying_price` sweep for Goods. Session 4, building
`getFinancialSummary`, surfaced the client's actual method with the owner.
It is simpler and it is not what those docs said. This ADR supersedes the
COGS formula in PRD §3 and the Dish-COGS mechanics in ADR-33 §2 (ADR-33's
core principle — *recipes never touch a financial figure* — still stands).

**Decision.**

### 1. Cost value by product kind

Every product has a **cost value** used for all stock valuation:

| Kind | Cost value |
|---|---|
| `ingredient` | `buyingPrice` |
| `goods` | `buyingPrice` |
| `dish` | **0** (already enforced — `create-product.ts` fixes Dish `buyingPrice` to 0, ADR-33) |

Double-counting is prevented **by dishes being valued at zero**, not by
excluding them from the sweep. The ingredients that became a dish were
already counted as ingredients when they were bought and when they left
stock.

### 2. COGS — one sweep, all products, all locations

```
COGS (period) = opening stock value + purchases value − closing stock value
```

- Each valuation is `Σ quantity × costValue(product)` over every
  `StockMovement` for that product/location.
- **Opening value** = movements with `occurredAt <` period start.
  **Closing value** = movements with `occurredAt <` period end.
- **Purchases value = purchase RECEIPTS only** (`movementType =
  "purchase_receipt"` in the period). NOT production, NOT transfers, NOT
  opening adjustments. Only stock the business actually bought in counts
  as "added".
- **Transfers between the business's own locations are excluded** by
  construction: a transfer is not in the purchases term, and its two
  signed legs (`−q` at source, `+q` at destination) net to zero across
  the opening/closing deltas. Counting a transfer would inflate COGS
  because nothing entered the business.
- Production only ever adds a `dish` (cost value 0), so it contributes
  nothing — but the scoping to `purchase_receipt` is explicit, not
  reliant on that.

Because dishes value at 0, COGS reduces to *the cost of the ingredients
and goods that left the business in the period* — the intent.

Per-location COGS is the same sweep restricted to one location. Revenue
and COGS (and therefore gross profit) are location-attributable; `Expense`
rows carry no location, so **total expenses, net profit and debts are
consolidated only**.

### 3. Non-sale consumption cost — a SEPARATE report, a view INTO COGS

The Admin wants to see what waste, staff meals and complimentary items
cost her, broken out by reason (`staff_meal` / `complimentary` /
`spoiled` / `damaged` / `other` — already on every `non_sale_consumption`
row).

**This figure is NOT added to COGS and does NOT reduce Gross or Net
Profit.** When stock is consumed without a sale it leaves the ledger, so
it is *already inside the COGS sweep* (it lowered closing stock). The
separate report is an estimate of a cost that is already counted — a view
into COGS, shown for management visibility. Adding it on top would
double-count the same food. This sentence is load-bearing: it is what
stops a future session from "fixing" the profit calc by subtracting waste
a second time.

Valuation per consumed unit:

| Kind | Non-sale consumption cost |
|---|---|
| `ingredient` / `goods` | `buyingPrice` |
| `dish` | `dishWasteCostPercent × sellingPrice` |

A Dish has no `buyingPrice`, so its waste cost uses a **percentage of
selling price as a cost proxy** — a dish selling at KES 100 is assumed to
have cost ~KES 60 to make. This proxy is used **only** in this report.

### 4. `dishWasteCostPercent` is configurable

Default **0.60**. Single source of truth: `lib/domain/financials/config.ts`
(`getDishWasteCostPercent()`), overridable via the
`DISH_WASTE_COST_PERCENT` environment variable (a decimal fraction in
`(0, 1]`; invalid/out-of-range falls back to the default). It is never
hard-coded elsewhere. Changing it changes the non-sale consumption report
and nothing else — COGS, Gross Profit and Net Profit are untouched.

**Consequences.**

- PRD §3 rewritten to this model; SCHEMA §14 to be reconciled next time it
  is touched (the formulas there still describe the ingredients-only
  split). ADR-33 §2 is superseded on mechanics; its recipe-isolation
  principle stands.
- `getFinancialSummary(from, to)` returns `perLocation` (revenue / cogs /
  grossProfit), `consolidated` (revenue / cogs / grossProfit /
  totalExpenses / netProfit / debtsOwedToBusiness / ownerOwedToBusiness /
  cash + mpesaBank balances) and `nonSaleConsumption` (total + byReason +
  the percentage in effect) — the last as a clearly separate block.
- Frontend (`profit-summary.tsx`) renders the non-sale figure well clear
  of the Revenue → COGS → Net stack, captioned "already inside the COGS
  figure above", leading with the reason breakdown — so no reader totals
  the two.
- No `TODO(mock)` — this is the real implementation.

---

## ADR-56: One header row per admin screen — the page publishes its title + actions up to the shell via React context (Developer, Milestone 3 Session 6 [header unify], 2026-09-03)

**Context:** Every admin screen rendered TWO stacked header rows: the
shell's toolbar row (hardcoded "Prosper" + the account avatar) sitting
above the page's own `<PageShell toolbar>` (the real page title, date
picker, primary action). The top row said nothing the sidebar didn't
already say. The owner approved collapsing to one row (M3 S5 Paper
design): **desktop** = page title · page actions · account avatar;
**mobile** = hamburger · page title · (primary action) · account avatar.

The design problem: the shell (`app/admin/layout.tsx` →
`AdminShellClient` → `AdminShell` / `MobileShellAdmin`) is a layout
wrapper and does not know which page renders inside it. The title and
actions live in the page.

**Decision.** A small React context, `AdminToolbarProvider`, wraps both
shells and `children` in `AdminShellClient`. A screen renders one
`<AdminPageHeader title=… actions=… />` at the top of its JSX **instead
of** passing a `toolbar` prop to `<PageShell>`. Inside the provider it
publishes its content (via effect) into the shell's single header row and
renders nothing itself; outside a provider (a screen spec that renders
the client directly) it renders the title + actions inline in a
`<header>` so assertions still resolve. `<PageShell>` stays in use for
content width / padding — it is just no longer given `toolbar`.

Rejected alternative (b) — *drop the shell's row, keep `<PageShell
toolbar>` as the only header*: the account avatar, the mobile hamburger,
and the collapsed-sidebar expand toggle all live in the shell and need
shell state/callbacks. Making nine pages render that chrome themselves —
and `<PageShell>` is frozen kit with no avatar slot — is worse than a
15-line context.

**Consequences.**

- `AdminShell` / `MobileShellAdmin` lose their `toolbarTitle` /
  `toolbarSubtitle` / `toolbarActions` props; they read
  `useAdminToolbarValue()` instead. `admin-shell-client.tsx` no longer
  passes `toolbarTitle="Prosper"`. The brand name now lives ONLY in the
  sidebar nav and the mobile nav drawer (`brandLabel`).
- All nine admin screens changed: `<PageShell toolbar={…}>` →
  `<PageShell>` + `<AdminPageHeader …>`. The Assets and Catalog titles
  moved from `text-display/display` to `text-h1/h1` to match the shell's
  header type (every other screen already used `text-h1/h1`).
- The single-item non-link `<Breadcrumb>` on `/admin/customers` and the
  tab-echo `<Breadcrumb>` on `/admin/sales` were dropped — both only
  repeated the page title or the tab strip below. The real back-link
  breadcrumbs on `/admin/customers/[id]` and `/admin/stock/opening` are
  kept, passed as the `title` node.
- Mobile: a screen's primary action renders between the title and the
  avatar in the mobile shell header, so nothing reachable on mobile
  before is lost. `/admin/stock/opening` keeps its actions desktop-only
  (`hidden md:flex`) — its mobile Save lives in the sticky bottom bar.
- Not applied to the staff shells this session (out of scope). They share
  the same two-row shape; the same change can follow.

---

## ADR-57: `/admin/financials` figures split into FLOWS (whole date range) and BALANCES (as of the range's end date) (Developer, Milestone 3 Session 7 [financials redesign + date ranges], 2026-09-03)

**Context.** S7 replaced the single business-date picker on
`/admin/financials` with a range control (Today / This week / This month
/ Custom → an inclusive `{ from, to }` pair of Africa/Nairobi business
dates). The screen carries two kinds of number and they must answer to a
range *differently*:

- **Flows** accumulate over a span — revenue, COGS, gross/net profit,
  total expenses, non-sale consumption, and the transaction tables
  (Stock Purchases / Deliveries / Expenses / Owner Draws).
- **Balances** are a level at one instant — cash at hand, M-Pesa/bank,
  debts owed to the business, owed back by the owner. A balance "for a
  week" is meaningless.

Before S7, `getFinancialSummary(from, to)` already summed the flow terms
over the range, but it called `getAccountBalances()` /
`getOwnerOwedToBusiness()` with **no argument** and aggregated `Debt` /
`Repayment` with **no date filter** — so every balance tile silently
showed the *live "now"* total no matter what date was picked. Picking a
past week still showed today's cash. That is the bug this ADR fixes.

**Decision.**

1. **Flows take `from..to`.** Unchanged — the existing behaviour is
   correct.
2. **Balances take `asOf = end of `to``.** `getFinancialSummary` computes
   `asOf = businessDateLastInstantUtc(to)` (the last representable UTC
   instant still on that Nairobi business day — 1 ms before the exclusive
   end) and passes it to `getAccountBalances({ asOf })`,
   `getOwnerOwedToBusiness(asOf)`, and the `Debt` / `Repayment`
   aggregates (`occurredAt <= asOf`). Every balance is still **derived by
   summing append-only rows** — nothing stored; `asOf` only moves the
   upper bound of the sum.
3. **`asOf` is an inclusive instant.** `MoneyReadContext.asOf` and
   `getOwnerOwedToBusiness(asOf)` keep their existing `lte` semantics; a
   movement dated anywhere on the `to` business day is IN, one on `to`+1
   is OUT. The no-argument form still means "as of now" (no cutoff).
4. **New `lib/time` helpers:** `businessDateLastInstantUtc`,
   `nairobiToday`, `businessWeekRange` (Monday–Sunday — ISO 8601 and the
   local trading-week convention; the same Monday-first boundary the kit
   `<DatePicker>` grid already uses), `businessMonthRange` (1st → last of
   the calendar month). Weeks/months are Africa/Nairobi business dates,
   never server-local.
5. **The UI must label a balance as point-in-time.** The KPI strip is
   captioned "Position & balances as of <date>"; the Owner Draws
   owed-to-business card carries "· as of <date>". This is the same
   class of guard as ADR-55's non-sale-consumption caption — a correct
   number shown so it invites a wrong reading is still a bug.

**Non-sale consumption is unaffected** — it is a flow (a view INTO the
range's COGS per ADR-55), summed over `from..to` like the other flows,
never a balance.

**`listMovements` gained an additive `from`/`to` range** (business-date
range on `occurredAt`; `date` still wins if both are passed) so the
Stock Purchases / Deliveries flow lists span the whole range. Backward
compatible — every existing `date`-only call is unchanged.

**Handover reconciliation stays a single-DAY worksheet.** `getReconciliation`
computes declared-vs-received-vs-variance with per-day totals; a
multi-day span has no meaning for it. When the range spans more than one
day the Handovers tab reconciles the range's **end day** and captions
that it is doing so.

**Consequences.**

- `getFinancialSummary` is the only production call site that passes
  `asOf`; the no-arg "now" behaviour of `getAccountBalances` /
  `getOwnerOwedToBusiness` is retained for any other caller and its
  existing tests.
- `API.md` "Financials" updated: the summary's `consolidated` balance
  fields are documented as "as of the end of `to`".
- No schema change. No `TODO(mock)`.

---

## ADR-58: Attendance is NOT day-close gated — a record about a day, not a ledger entry (Developer, Milestone 4 Session 8A [Staff & Pay backend], 2026-09-03)

**Context.** M4 adds attendance (`Attendance`: `staffId`, `date`,
`present`, unique `[staffId, date]`). Every M3 *create* path calls
`assertDayOpen` (ADR-52). The question for S8A: does attendance?

**Decision.** **No.** `setAttendance` / `setAttendanceBulk` do **not**
call `assertDayOpen`. They are Admin-only; that is the guard.

**Why.**

- Attendance is a *record about* a day (was this person here?), not a
  stock or money ledger entry that a day-close is meant to seal. ADR-52's
  rule protects append-only financial rows from after-the-fact edits;
  attendance has no such row to protect.
- The owner's decision is that the Admin **can backdate** attendance
  (ADR-53's today-only rule is also not applied here) — and the reason to
  backdate is precisely to correct a past day.
- **Pay depends on it.** `getStaffPay` / `getPayrollSummary` compute
  `daysPresent` directly from `Attendance`. If attendance were
  day-close gated, a wrong `present` flag on a closed day could never be
  fixed, and the payroll for that month would be permanently and silently
  wrong. Reopening the whole day just to fix one attendance mark is
  disproportionate.
- The write is an **upsert on `[staffId, date]`** — idempotent by
  construction. "Correcting" attendance is re-setting the boolean; there
  is no new row, no double-count risk, nothing the correction-entry
  pattern (CONVENTIONS §4) is needed for.

**Contrast — pay adjustments ARE gated.** `recordPayAdjustment` writes an
append-only `StaffPayAdjustment` row with a money `amount` and no
correction self-relation. That is a classic create path → it calls
`assertDayOpen(date)` inside its transaction, exactly like an expense or
owner draw. A mistaken adjustment on a closed day is undone by recording
the opposite type for the same amount (nets out in every sum).

**Consequences.**

- `Attendance` writes have one guard: `role === "admin"`.
- No schema change. No `TODO(mock)`.

---

## ADR-59: Deactivating a staff member also deactivates their login `User` — in the same transaction (Developer, Milestone 4 Session 8A [Staff & Pay backend], 2026-09-03)

**Context.** M4's `createStaff` writes a `Staff` row and its 1:1 login
`User` together (owner decision: the Admin sets the PIN; no first-login
self-service). `deactivateStaff` is the soft-delete — `Staff.active =
false` (there is no `Staff.deletedAt`). The brief requires that a
deactivated staff member "must not be able to log in", and to verify that
against the auth path.

**Decision.** `deactivateStaff` sets **both** `Staff.active = false` and
`User.active = false` on the linked login, in one transaction. `createStaff`
sets both to `true`. There is no path that leaves the two out of sync.

**Why.** `lib/auth/config.ts` `authorize()` rejects a sign-in when
`!user.active` — it checks the **`User`** row only, never `Staff.active`
(the Staff relation isn't even loaded there). The session callback
re-checks `User.active` on every request (ADR-5 addendum: instant
revocation under a JWT strategy). So:

- Setting only `Staff.active = false` would leave the login fully
  functional — the "deactivated" staff member keeps signing in and any
  live session keeps working. The guarantee the brief asks for would not
  hold.
- Setting `User.active = false` makes the next sign-in attempt fail and
  drops any existing session on its very next request — no token-expiry
  wait.

**Consequences.**

- Re-activation is a `updateStaff` concern if it's ever needed; S8A ships
  only deactivate (soft). A future re-activate must flip both flags too.
- `deactivateStaff` is idempotent — an already-inactive staff member is a
  no-op success (no second audit row).
- No schema change. No `TODO(mock)`.

---

## ADR-60: A staff payout is recorded in-system and posts one Salaries `Expense` — SUPERSEDES the PRD §4.8 "payroll happens outside the system" rule (Developer, Milestone 4 Session 9A [Staff payout backend], 2026-09-03)

**Context.** Through S8A, staff pay was a **pure calculation**:
`getStaffPay` / `getPayrollSummary` derive gross = dailyRate × daysPresent
and net = gross − advances − deductions, but nothing is recorded when a
staff member is actually paid. PRD §4.7 / §4.8 stated explicitly that
calculated pay does **not** count as an expense — "only an Expense the
Admin actually logs (e.g. category Salaries) reduces Net Profit, since
payroll disbursement happens outside the system" — and PRD §6 listed
"payroll disbursement" as out of scope.

**Owner decision (M4 S9A): payroll now happens INSIDE the system.** The
Admin records a payout for a staff-month; that payout **must** reduce
Cash and Net Profit, through a real Salaries `Expense`.

**Decision.**

1. **A payout creates exactly ONE Salaries `Expense`, via the existing
   `recordExpense` path.** That expense writes its own paired negative
   `MoneyMovement` (`sourceType: "expense"`). Cash drops once, Net Profit
   drops once, through the already-tested path. There is **no** bespoke
   `MoneyMovement` written alongside a payout, and **no** new
   `MoneySourceType` — routing everything through `recordExpense` is what
   keeps `getAccountBalances` a plain `SUM(amount)` and `getFinancialSummary`
   a plain `SUM(Expense.amount)`.
2. **New table `StaffPayout`** (`staffId`, `month` `@db.Date`, `netPaid`,
   `date`, `paidFromAccount`, `recordedById`, `expenseId` 1:1 → `Expense`).
   `@@unique([staffId, month])` makes double-paying a staff-month
   impossible **at the database level**, not just in code. Additive
   migration; no existing table altered.
3. **The amount is recomputed from the ledger at payout time** — there is
   no client-supplied amount on the input at all. `payStaff` calls
   `getStaffPay` inside the flow and uses that `netPay`.
4. **`recordExpense` gained an optional `{ tx }` third argument** (the
   same pattern `recordMoneyMovement` already uses) so the Salaries
   `Expense`, its paired `MoneyMovement`, and the `StaffPayout` row commit
   in ONE transaction — all or nothing.
5. **Guards** (each tested):
   - already paid for that month → `CONFLICT` (in code, and the DB unique
     is the backstop — a race surfaces as `P2002` → `CONFLICT`).
   - a **future** month → `VALIDATION_ERROR` (nothing worked yet).
   - net pay **≤ 0** → `VALIDATION_ERROR` (see below).
   - the disbursement date's day is closed → `FORBIDDEN` (`assertDayOpen`,
     a create path).
6. **`payAllUnpaid`** pays every unpaid **active** staff member for the
   month — each staff member's `Expense` + `StaffPayout` is its **own**
   transaction, so one failure (a race, a zero net) is *skipped* with a
   reason, never a rollback of the whole batch. One `Expense` per staff
   member paid.

**Net-pay floor / carry-forward.** `getStaffPay.netPay` is **not floored**
— if advances + deductions exceed gross it is negative, and this is
surfaced as-is (9B renders it). A payout is **refused** while `netPay ≤ 0`.
The excess over-advance is **neither written off nor auto-carried** to
another month: it remains exactly the `StaffPayAdjustment` rows already
recorded in that month, and the Admin clears it by posting a correcting
entry (record the opposite type for the difference). Auto-carrying to the
next month was rejected — it would break the month-scoping of `getStaffPay`
and surprise every downstream reader.

**Zero-or-negative-net payout.** Rejected with `VALIDATION_ERROR`
(`field: "net"`), message explaining that recorded advances/deductions
exceed earnings and the excess stays on the books. Nothing is written; no
negative expense, no negative `MoneyMovement`, ever.

**Payout reversal — out of scope for S9A, deliberately.** A payout's
entire financial effect lives in the `Expense` it created, and the house
correction path for that already exists: `correctExpense(payout.expenseId,
"0.00")` writes the offsetting delta row and its paired `MoneyMovement`,
restoring Cash and Net Profit. What a first-class "void payout" would add
on top is releasing the `@@unique([staffId, month])` slot so the month can
be re-paid — deferred to a later session. A `reversesPayoutId`
self-relation was considered and rejected as scope creep for 9A. Until
then: correct the linked expense to zero, and (if the month must be
re-paid) an Admin deletes the `StaffPayout` row out of band.

**This SUPERSEDES** the PRD §4.7 / §4.8 statement that "payroll
disbursement happens outside the system" and calculated pay never counts
as an expense. PRD §4.7, §4.8 and §6 are updated in this session. A future
session reading an older copy of that rule must treat **this ADR** as
current — do not "restore" the old behaviour.

**What does NOT change.** Handover shortfalls still never auto-deduct pay
and never reduce a payout (PRD §4.8, ADR-58 context) — asserted by a test
in `lib/domain/staff/payout.test.ts`. Attendance is still not day-close
gated (ADR-58). `recordPayAdjustment` is still day-close gated (ADR-58
contrast).

**Consequences.**

- `StaffPay` / `PayrollSummary` reads carry `paid`, `payout`
  (id/month/netPaid/date/account/expenseId); summary totals gain
  `netPaid`, `netUnpaid`, `paidCount`, `unpaidCount` so 9B renders a
  paid/unpaid column with no second call.
- `POST /api/pay/payout` (single) and `POST /api/pay/payout?mode=all`,
  both Admin-only. No `amount` on either payload.
- Migration `20260903130000_m4_s9a_add_staff_payout`. No `TODO(mock)`.
- The seed records one paid staff-month (the seed Cashier, previous
  month) and leaves every other staff member unpaid.

---

## ADR-61: The test suite runs against its own database, isolated from dev (Developer, Milestone 4 Session 9C, 2026-09-03)

**Context.** Until now `pnpm test` ran against the **dev** database.
`vitest.shared.ts` did `import "dotenv/config"` and every suite read the
same `DATABASE_URL` as `next dev` and the seed. This cost real sessions:

- Running `pnpm dev` (or a stray `prisma:seed`) mid-test-run shifted the
  totals the financials-summary suites assert — one run lost four tests at
  once.
- Stale rows from a killed run broke exact-count assertions on the next
  run.
- A red run no longer told you whether anything was actually broken.

Test files namespace their own rows and clean up only their own, but the
cross-cutting summaries (financial summary, account balances) sum across
**all** stock/money movements, so they are exposed to anything else
touching the same DB.

**Decision.** The suite gets a dedicated database, `prosper_hotel_tests`,
on the same local Postgres container as dev. It is **migration-built**,
not `db push` — it has real `_prisma_migrations` history (the dev DB does
not; do not carry that habit over).

- **`.env.test`** (committed — local connection string only, no secrets)
  holds the test `DATABASE_URL`. `vitest.shared.ts` loads it with
  `dotenv`'s `override: true`, so it wins even when the shell already
  exported the dev URL.
- **`scripts/setup-test-db.mjs`** (idempotent): creates the database if
  absent (connecting to `postgres` to issue `CREATE DATABASE`), runs
  `prisma migrate deploy`, then seeds it (the seed is WIPE + REBUILD, so
  re-runs are clean). Wired as `pretest` / `pretest:db` / `pretest:e2e`,
  so `pnpm test` works with **no extra manual steps** and a fresh clone
  needs nothing but a running Postgres on the host/port in `.env.test`.
- Documented in **`docs/TESTING.md`**.

**Alternatives rejected.**

- *Per-run schema isolation / a schema per worker* — heavier plumbing
  (every worker needs its own migrate), and the M1 flow suites look up
  seed users by stable name, so every schema would still need seeding.
- *Transaction-rollback per test* — the domain code opens its own Prisma
  transactions; nesting is fragile and several suites assert across
  multiple committed writes.
- *Reusing an existing `*_test` database on the container* — those are
  stale (old schema, different migration history) from earlier work;
  named a fresh one to avoid ambiguity.

**Consequences.**

- The seed is now also the **test fixture of record** for anything that
  reads seed users/locations by name (`tests/integration/m1-flows`).
  Changing seed user names or the `seed-location-*` ids is a
  test-breaking change.
- `test:unit` (the DB-free lane) has no `pretest` — its specs never touch
  Postgres.
- CI / a fresh clone must run `pnpm test` (which triggers the setup) or
  `pnpm test:setup` once before `pnpm test:db`.
- No test was weakened or deleted for this. The full suite passed
  815/815 on the first run against the new DB — nothing turned out to
  depend on dev-DB-specific data.

---

## ADR-62: There is no separate reports page — period reporting IS `/admin/financials`; the audit trail + day-detail read cover the rest (Owner + Developer, Milestone 5 Session 11 [audit-trail + day-detail backend], 2026-09-03)

**Context.** M5 ("History, at a glance") was originally scoped as
"weekly/monthly summaries + the full audit log view + historical record
lookup". By the time S11 (this session) ran, `/admin/financials` had
already shipped (M3 S7 / ADR-57): Today / this week / this month / custom
date ranges, full profit (revenue, COGS, gross, expenses, net),
per-location breakdown, handovers, owner transactions — every figure
summed on read from the ledger, with the flows-vs-balances split of
ADR-57.

Building a second "Reports" page would mean a second aggregation layer
computing the same revenue / COGS / profit numbers a second way. Two
implementations of the same figure drift — a live bug we have already
been bitten by (the 2026-09-01 double-count, ADR-50 / F1).

**Decision (owner's call).**

1. **No separate reports page, no `GET /api/reports/*`.** Period
   reporting for any date range is `/admin/financials` +
   `GET /api/financials/summary?from=&to=`. `getFinancialSummary` is the
   single source of truth for revenue / COGS / gross / expenses / net /
   balances. A future session must not build a parallel one.

2. M5's remaining backend is only the two things financials does **not**
   cover, both **Admin-only, read-only**:
   - **The audit-trail read** — `listAuditLog(filter)` in
     `lib/domain/audit` (`GET /api/audit`). The write side has existed
     since M1 (ADR-25); this is the paginated, filterable, newest-first
     read. Returns everything, with a `group: "significant"` filter for
     the investigable subset (corrections, deletions, day close/reopen,
     staff/location/payout writes) that the screen defaults to.
   - **Day detail** — `getDayDetail(businessDate)` (`GET
     /api/audit/day-detail`): one Africa/Nairobi business date's orders,
     stock movements, handovers (+ receipts), expenses, owner
     transactions, stock counts, payouts, and close status —
     **composed from the existing per-module reads**, not fresh queries.

3. **Reconciliation is enforced by a test.** `getDayDetail`'s revenue /
   expense / handover figures must equal `getFinancialSummary(date,
   date)` for the same date
   (`lib/domain/audit/day-detail-reconciliation.test.ts`). If they
   diverge, the day detail is the bug — the summary is authoritative.

**Consequences.**

- `docs/API.md` "Day Close & Audit" now documents `GET /api/audit` and
  `GET /api/audit/day-detail` as the real contract; the old
  `GET /api/audit-log` / `GET /api/reports/*` stubs are marked "not
  built". The M5 screen session builds against that doc.
- Pagination on `/api/audit` is OFFSET/limit (total count + "page N" +
  stable page sizes matter more than cursor deep-scroll for an
  investigator's table that grows at human speed).
- Entity resolution in the audit read is best-effort and batched (one
  query per entity type per page). `money_movement`,
  `receipt_of_handover`, `staff_pay_adjustment` and `user` rows get no
  label — the screen renders `entityType #id`.
- SCHEMA §14's old ingredients-only COGS split (superseded by ADR-55 in
  M3 S4 but never edited) was corrected in this session — it was the
  last doc still describing the pre-ADR-55 formula.

---

## ADR-63: Foundation type-rendering tokens — Inter is pinned to antialiased, no synthesis, no optical sizing; `--weight-semibold` softened 600 → 550 (Owner + Developer, Milestone 3 Session 7 follow-up, 2026-09-04)

**Context.** The shipped `/admin/financials` screens read visibly heavier
and slightly fuzzier than the approved Paper mockups even where the font,
size and weight matched one-to-one. A typography audit — every text
node in the Paper artboards (M3 S5 Financials redesign, M3 S7 Handovers
table) against the live markup — found two foundation-level gaps:

1. **No font smoothing / synthesis control on `body`.** Paper renders
   every text node `antialiased` with `font-synthesis: none`. The app's
   `body` set only `font-family` / `font-size` / `line-height`, so the
   browser default (`-webkit-font-smoothing: auto`) applied — Inter
   rendered heavier and blurrier than the design preview. Individual kit
   components carried `antialiased` inconsistently; most screen markup
   did not.
2. **Inter's `opsz` (optical size) axis was left on auto.** `next/font`
   loads the variable Inter; with `font-optical-sizing` unset the browser
   auto-applies opsz, thickening strokes at the 11–13px sizes that make
   up most of the admin UI. Paper renders at a fixed optical size.

Separately, the owner found the plain `--weight-semibold: 600` too heavy
**everywhere it appeared** (page titles, section headings, table
headers, KPI figures) and asked for it softened at the token, not
screen by screen.

**Decision.**

1. **`body` (`app/globals.css`) gains a foundation type-rendering
   block**, set once and inherited everywhere:
   ```css
   -webkit-font-smoothing: antialiased;
   -moz-osx-font-smoothing: grayscale;
   font-synthesis: none;
   font-optical-sizing: none;
   text-rendering: optimizeLegibility;
   ```
   No component should re-declare these; the scattered per-component
   `antialiased` classes are now redundant (left in place, not swept, to
   keep the diff small — a later cleanup may remove them).

2. **`--weight-semibold: 600 → 550`** in **both** `app/design-system/
   tokens.css` and `app/design-system/tokens.ts` (the drift-guard test
   `tokens.test.ts` enforces they match). Inter is variable, so 550
   renders as a true intermediate weight; the three-step regular / medium
   / semibold scale is kept, just gentler at the top. Every
   `font-(--weight-semibold)` in the app softens at once — this is a
   deliberate global visual change, not a bug fix.

**Consequences.**

- These are the "make the app match the mockup" tokens. Any future
  screen work inherits the correct rendering; a session that reintroduces
  `-webkit-font-smoothing: auto` behaviour (e.g. by overriding on a
  wrapper) is regressing this ADR.
- `--weight-semibold` is now 550, not 600 — do not "restore" it to 600.
  If a specific element genuinely needs 600, that is a new token
  (`--weight-bold`) with owner sign-off, not an edit to this one.
- `design-principles.md` §2 (type scale) updated to state the semibold
  weight is 550 and the `body` rendering block is the foundation.

---

## ADR-64: The dashboard's daily net-profit series is a span-wide bucketed re-derivation, not N `getFinancialSummary` calls — exact agreement via the telescoping-COGS identity (Developer, Milestone 5 Session 13 [Dashboard backend], 2026-09-04)

**Context.** The `/admin` dashboard (design: `docs/design/flows/dashboard-screen.md`)
has two bar strips — "net profit per day this week" (7 bars) and "net
profit — last 30 days" (30 bars). Together with the prior-week comparison
range the aggregator needs net profit for ~37 separate business days.

The obvious implementation calls `getFinancialSummary(day, day)` once per
day. Each of those runs a **full stock-valuation sweep**: `groupBy` over
`StockMovement` for opening (`occurredAt < dayStart`), closing
(`occurredAt < dayEnd`) and purchases, for every product at every
location, valued by kind. Measured on the *seeded* DB: **~625 ms for 37
calls** (~17 ms/day). That cost scales with product count × location
count × history depth — on real data (hundreds of products) it is
seconds, on the screen the owner opens every morning.

**Decision.** `lib/domain/dashboard/trend-series.ts` computes the whole
series from a **fixed handful of span-wide queries bucketed by business
date in memory** — the query count does not grow with the number of days.
The full aggregator (`getDashboard`) now runs in **~21 ms on the seeded
DB** (vs. ~625 ms for the trend series alone the naive way).

The identity that makes it exact — a single day's COGS in
`getFinancialSummary` is

    openingValue(occurredAt < dayStart)
      + purchaseReceiptValue(occurredAt ∈ [dayStart, dayEnd))
      − closingValue(occurredAt < dayEnd)

The opening and closing terms **telescope**: `closingValue(< dayEnd) −
openingValue(< dayStart)` is exactly the summed value (quantity ×
costValue; costValue = `buyingPrice` for ingredient/goods, 0 for dish) of
**every `StockMovement` whose `occurredAt` falls in `[dayStart, dayEnd)`**.
So

    cogsDay = purchaseReceiptValueDay − Σ (allMovementValue in the day)

and **no opening sweep is needed**. Revenue (live restaurant orders +
resolved `canteen_sale` money movements) and expenses are already
per-day-additive; they are computed here with the *same* live-only rules
`getFinancialSummary` uses (superseded orders dropped, correction rows
kept; canteen sales only when the `StockCount` resolves to a location).

**This is NOT a proxy.** `netDay` equals
`getFinancialSummary(day, day).consolidated.netProfit` **to the cent** —
proven day by day, including across a month boundary
(2024-08-29 … 2024-09-02), in `lib/domain/dashboard/trend-series.test.ts`.
The design spec (§"Assumptions") floated a cheaper proxy (revenue −
expenses, no COGS sweep) and said to flag it with the owner; that route
was **not taken** — the exact path is fast enough.

**Consequences.**

- `dailyNetSeries(from, to)` is the one place the dashboard's per-day
  net/revenue/expenses come from. The week band and the 30-day trend are
  both slices of one continuous series computed once over the union span
  (trend start … this week's Sunday, reaching back a further 7 days for
  the prior-week deltas).
- The telescoping identity depends on `getFinancialSummary`'s COGS
  formula. If that formula changes (e.g. a different valuation basis, or
  "purchases" widened beyond `purchase_receipt`), `trend-series.ts` must
  change in lockstep and the agreement test will catch a divergence.
- Position (band 1) is NOT re-derived — it calls `getAccountBalances` /
  `getOwnerOwedToBusiness` with `asOf` = end of the dashboard date, the
  same derivations `getFinancialSummary` uses for its balance figures
  (one source of truth; asserted in `get-dashboard.test.ts`).
- The dashboard module (`lib/domain/dashboard/`) owns no entity and
  writes nothing — it is a read-only composition layer over financials +
  audit + handovers + stock.

## ADR-65: The audit trail groups a transaction's rows into one expandable "batch" item and paginates BY ITEM, not by raw row (Developer, Milestone 5 Session 15 [Audit-trail screen], 2026-09-04)

**Context.** A single business action can write several `AuditLog` rows in
one transaction — a 6-line purchase receipt is 6 `create` rows (ADR-25).
The write side stamps each with a shared `correlationId` (`batch_<uuid>`)
**inside the row's `newValue` JSON** — it is not a column. The M5 S11 read
(`listAuditLog`) returned a flat, offset-paginated row list and ignored
`correlationId` entirely. The audit-trail screen (M5 S15,
`docs/design/flows/audit-screen.md`) needs those 6 rows to read as **one**
line ("6 items received · Store · 9:14am") that expands to the individual
rows — the owner's explicit decision (session prompt, "OWNER DECISIONS"
§2). A single, non-batched action stays its own plain row.

**Decision.**

1. **Grouping lives in `listAuditLog`** (not a new module, not the route,
   not the client). The route stays a thin pass-through; the client
   renders whatever the domain hands it.

2. **The response shape changes.** `listAuditLog` now returns
   `{ items, actors, page }` where an `item` is
   `{ kind: "single", entry }` or
   `{ kind: "batch", correlationId, action, actorId, actorName, count,
   entityType, subAction, occurredAt, entries }`. The pre-S15 flat
   `entries: AuditLogEntryView[]` is **gone** — `docs/API.md` was updated
   rather than left describing two shapes. `flattenAuditItems(items)` is
   exported for any caller that wants the raw rows back.

3. **Pagination is BY ITEM.** A batch must never straddle a page, so the
   read cannot `skip`/`take` raw rows at the DB. Instead it: applies every
   filter at the DB → fetches the whole matching set newest-first, bounded
   by `SCAN_CEILING = 5000` → folds rows sharing a `correlationId` **and**
   the same `action` into one bucket, anchored at the batch's newest row
   so newest-first order is preserved → slices `limit` **items** from
   `offset`. `page.total` is the item count. Entity-label resolution then
   runs over only the sliced page's rows (still one batched query per
   entity type — the S11 N+1 guarantee holds).

   **Why fetch-all-then-slice is acceptable here** (the same argument
   ADR-25/S11 already relied on for offset pagination): the `AuditLog`
   table grows at *human* speed — tens of rows/day. A filtered window (a
   date range, one actor, one entity type, or the significant subset —
   the screen always sends at least a date range) sits far under 5000
   rows. If a query ever exceeds the ceiling the oldest rows past it are
   simply not paged; an unreachable case for the screen's own filters,
   documented rather than engineered around. A cursor scheme keyed on
   `(occurredAt, id)` that skips whole `correlationId` groups was
   considered and rejected as complexity with no payoff at this scale.

4. **Mixed batches.** A `correlationId` set is grouped **per `action`** —
   a rare set spanning two `action` values becomes one batch per action.
   Within a batch, `entityType` / `subAction` (`newValue.action` — the
   real verb; the enum column is always `create` for stock batches) are
   reported only when **uniform** across the batch's rows, else `null`;
   the screen shows "Mixed" for the entity and a generic "N items
   changed" summary.

5. **A one-row bucket is always rendered as a `"single"`** — whether it
   never had a `correlationId`, or a filter pared a batch down to one
   visible row (a corner case; the screen's current filters are all
   batch-uniform so it does not arise, but the shape stays honest).

**Also shipped alongside (not a separate ADR):** the response carries
`actors: { id, name }[]` — every `User` with ≥1 audit row, name-sorted,
one grouped query, filter- and page-independent — so the screen's Actor
filter dropdown is stable as the investigator pages. The design doc had
floated a separate `GET /api/audit/actors`; a field on the main response
is simpler and the query is cheap.

**Consequences.**

- One extra `groupBy` per audit request (the actor list). Negligible.
- `SCAN_CEILING` is a real (if distant) limit — noted in the code and
  here. Revisit only if `AuditLog` volume ever changes character.
- The screen's Date filter is **presets only** (Today / Last 7 days /
  Last 30 days / This month) — the kit `<FilterToolbar>`'s `kind:"date"`
  bridges a single day, not a range, so a preset `<Select>` is the honest
  kit fit. A fully custom range picker is deferred; flagged in the S15
  report. The Dashboard's `?from=&to=` deep link is still honoured (it
  passes an explicit range straight through).

## ADR-66: `<FilterToolbar>` mobile is one all-visible horizontal-scroll row of real controls — the "3 chips + More → BottomSheet" overflow is removed (Owner + Developer, Milestone 5 Session 15 [Audit-trail screen], 2026-09-04)

**Context.** `components/kit/filter-toolbar.tsx` (ADR-42) rendered, below
`--bp-md`, the first 3 controls as inert "chips" that opened a
`BottomSheet` containing every control as a full-width row; any 4th+
control was reachable only via a trailing **"More"** chip. Building
`/admin/audit-trail` (4 filter controls + a "Show everything" toggle)
exposed the problem: on a phone the **Entity** filter was hidden behind
"More", and the toggle — a primary control — lived inside the overflow
sheet where its on/off state is not visible at a glance. The approved
mobile artboard (`OEA-0`) had drawn a different pattern (all four filters
in one scroll row) without regard to what the kit actually did.

**Best-practice finding.** The `3 + More → sheet` pattern is the
*prioritise + overflow* idiom (Material overflow menu, iOS "More" tab) —
correct when there are **many** filters (6+) of unequal importance. For a
**small, fixed** set (3–5, which is every real screen in this app) the
right pattern is an **all-visible horizontal-scroll chip row**: no hidden
affordance, nothing to discover. Airbnb, Linear, Gmail and the iOS App
Store all do this for small filter sets.

**Decision.**

1. **Mobile `<FilterToolbar>` is a single `overflow-x:auto` row of the
   real controls** — the same `DesktopControl` (`<Select>` / `<DatePicker>`
   / `<ToggleSwitch>`) rendered on desktop, each `flex-shrink:0`. Every
   filter is always a visible, operable chip; each opens its own popover
   in place (the `<Select>` popover is `absolute` + width-capped — see the
   S15 Select popover fix — so it renders correctly inside the scroll
   container).
2. **The "More" chip, the `BottomSheet` overflow, and the `MobileChip`
   proxy-button are deleted.** The `bottom-sheet` import is dropped from
   the file. `BottomSheet` itself is unchanged and still used elsewhere.
3. **Off-default controls sort to the front** of the row so an active
   filter is never scrolled out of the initial viewport.
4. **The result count + `Reset`** stay on their own row directly below
   (unchanged).

**Toggle placement.** Owner decision: a `kind:"toggle"` control stays an
inline item in the same scroll row (rendered by `DesktopControl` — label
+ `<ToggleSwitch>`), **not** lifted to its own labelled row. This
diverges from `OEA-0`, which drew the audit "Show everything" toggle on a
separate row; the owner chose kit consistency (one rule for every control
kind) over matching that one artboard detail. Flagged in the S15 report.

**Consequences.**

- Affects **every** screen using `<FilterToolbar>` on mobile — Assets,
  Customers, Stock Ledger, Sales (Restaurant + Canteen), and the new
  Audit trail. All their screen specs (`tests/screens/*`) pass unchanged
  (73 green) — the specs drive the controls, not the removed chrome.
- No Storybook test-runner exists in this repo (only a stale
  `storybook-static/`), so the kit is gated by `pnpm test` + `typecheck`
  + `build`, all green.
- `docs/design/filter-toolbar.md` §4 and `docs/design/kit-audit.md`
  updated; the old `IKW-0` "More" description is marked superseded.
- If a screen ever genuinely needs 6+ filters, revisit — a grouped or
  collapsible affordance may be worth reintroducing behind a prop, but
  not on spec.

---

## ADR-67: Stock movements enforce a location ↔ product-kind model — ingredients only at the Store; dishes and goods only at the Restaurant/Canteen; transfers are Restaurant↔Canteen, dish/goods only (Owner + Developer, Milestone 5 — location-stock-model-enforcement session, 2026-09-04)

**Context.** Session 16 (manual QA walkthrough). While scripting the QA
day the owner clarified the intended location model, and it was not
actually enforced anywhere — only *implied* by the seed and by each SM/
Canteen flow's product-kind filter. The domain would happily record an
`opening` for a dish at the Store, an `issue` of a soda, a `transfer` of
an ingredient, or a `transfer` with the Store on either end. PRD §3's
movement table ("Issue = stock taken from the Store to be cooked",
"Transfer = stock moved between locations") described the intent without
the kind/location constraints. This ADR makes the model a real, enforced
domain rule and tightens PRD §3 to match.

**Decision — the model.**

| Location `type` | May hold (`Product.kind`) | Inbound | Outbound |
|---|---|---|---|
| `store` | **`ingredient` only** | `opening`, `purchase_receipt` | `issue` (→ kitchen), `non_sale_consumption`, `opening` adj. |
| `restaurant` | **`dish` + `goods`** (never `ingredient`) | `opening`, `production` (dishes), `purchase_receipt` (goods), `transfer` in | `sale`, `transfer` out (→ Canteen), `non_sale_consumption` |
| `canteen` | **`dish` + `goods`** (never `ingredient`) | `opening`, `purchase_receipt` (goods), `transfer` in | `sale` (from `stock_count`), `transfer` out (→ Restaurant), `non_sale_consumption` |

Three rules, enforced in `lib/domain/stock/guards.ts`:

- **R1 — kind ↔ location** (`assertKindAllowedAtLocation`): an
  `ingredient` movement may only target a `store`; a `dish`/`goods`
  movement may only target a `restaurant`/`canteen`. Wired into
  `setOpeningStock`, `recordPurchaseReceipt` (+batch, via the shared
  `receiptLineCore`), `recordKitchenIssue` (+batch, via `issueLineCore` —
  which now also pins the product to `ingredient`), and
  `recordNonSaleConsumption` (+batch, via `nonSaleLineCore`).
  `recordProduction` already satisfied R1 via
  `assertProductIsDish` + `assertLocationOfType(..., "restaurant")`.
- **R2 — transfer endpoints** (`assertTransferLocations`): both
  `fromLocationId` and `toLocationId` must be `restaurant`/`canteen`. Any
  transfer touching a `store` on either side is rejected. Wired into
  `recordTransfer` and `recordTransferBatch` (once per call, before any
  write). `from !== to` is unchanged.
- **R3 — transferable kind** (`assertTransferableKind`): the transferred
  product must be `dish`/`goods`. An `ingredient` transfer is rejected —
  ingredients are issued from the Store, never moved location-to-location.
  Wired into `transferDispatchLineCore` (covers single + batch).

Error shape: `DomainError("VALIDATION_ERROR", <message>, <field>)`, matching
the existing guards. `acceptTransfer` / `flagTransfer` / `correctMovement`
are **not** guarded — they derive their location/product from an
already-validated row and cannot change either, so a guard there would only
reject rows that could never have been written.

**Not a DB CHECK.** The constraint spans three tables
(`stock_movement` → `product.kind`, `stock_movement` → `location.type`)
and a cross-table CHECK is not expressible in Postgres without a trigger.
`ProductLocation` already models "sold here", not "stocked here", so it
can't carry it either. Domain-layer enforcement is consistent with every
other invariant in this codebase (ledgers-not-totals, corrections-as-rows,
the 2-phase transfer of ADR-39).

**Sales domain (`sale` / `stock_count`).** These rows are written by
`lib/domain/sales`, not the stock domain. Both `createOrder` (Restaurant)
and `recordStockCount` (Canteen) already require an **active
`ProductLocation` with a non-null `sellingPrice`**, and `selling_price` is
Dish/Goods-only per SCHEMA §2 — so an `ingredient` has no selling price
anywhere and already cannot be sold or counted. **No new guard was added
in sales**; `lib/domain/sales/ingredient-not-sellable.test.ts` locks that
in (if a future change lets an ingredient carry a selling price, it goes
red and `assertKindAllowedAtLocation` should be wired into the sales
path).

**Goods deliveries now land at the Restaurant, not the Store (3c —
resolved with the owner in-session, "option 2").** Under R1 a goods
delivery can no longer be received into the Store, and there is **no
legal movement that gets goods out of the Store afterwards** (transfer is
Restaurant↔Canteen; issue is ingredients only) — so goods must land at a
selling location on receipt, with no intermediate hop. The SM "Receive
Goods" flow stays a single screen listing every delivered item; on submit
the batch **splits by kind** — `ingredient` lines → one
`receiptBatch` at the Store, `goods` lines → one `receiptBatch` at the
Restaurant. `POST /api/stock-movements/receipts/batch` gains the same
"SM → Restaurant" carve-out the `production` / `transfer` batch routes
already have (a `store_manager` may post a receipt batch at a
`restaurant`); R1 in the domain is the backstop. Goods still reach the
**Canteen** by `transfer` from the Restaurant, unchanged. (Options
considered and rejected: a second dedicated goods-receipt screen — most
new UI; honouring the `purchase_payment`'s "Destination" column — leaves
unmatched manual goods lines with no target.)

**Store Manager UI, other changes.**

- **SM Transfer is single-source from the Restaurant.** It used to be
  per-product multi-source (dishes from the Restaurant, goods from the
  Store) via `useTransferSourceLevels` + a per-source batch split. With
  goods now at the Restaurant, everything the SM transfers leaves the
  Restaurant — one `transferBatch` `{ fromLocationId: restaurant, ... }`.
  `useTransferSourceLevels` and the split are deleted.
- **The transfer destination is auto-resolved, not chosen.** With exactly
  one Restaurant and one Canteen, a transfer's destination is whichever of
  the two the source isn't — nothing to pick. The Destination `<Select>`
  is dropped for both the SM Transfer and the Canteen Dispatch; the
  direction badge ("Restaurant → Canteen" / "Canteen → Restaurant") shows
  where it's going. The `<Select>` is kept only for the (currently
  impossible) case of 2+ valid destinations; an `EmptyState` shows if none
  exists.

**Regression budget — COGS and balances unchanged (ADR-55).** The guards
are a pure gate: they reject illegal kind/location combinations but never
alter, reorder, or add columns to a row that IS written. COGS sums every
`StockMovement`, so for model-compliant data every figure is
byte-identical. `prisma/seed.ts` (the Session-16 QA baseline — 8 products,
zero ledger data, already model-compliant) is unchanged and still seeds.
`lib/domain/financials/cogs-model-guards-regression.test.ts` drives a
small model-compliant world **through the guarded domain functions** and
asserts (a) every legal movement is accepted and (b) the COGS the sweep
derives is exactly the hand-computed figure, including a Restaurant→Canteen
transfer netting to zero across COGS.

**Consequences.**

- `docs/PRD.md` §3 movement-type table + §4.2 tightened.
- `docs/SCHEMA.md` §3 gains a note under `StockMovement` that
  `movement_type` + `product.kind` + `location.type` are constrained in
  the domain layer.
- `docs/design/flows/staff-stock-movements-flow.md` updated: no transfer
  destination picker; the receive flow's ingredient/goods split.
- Stock-domain tests rewrote their transfer fixtures from
  `store → canteen` ingredient transfers to `restaurant → canteen` goods
  transfers; `setupStockTestData` gains a `goodsProductId`. R1/R2/R3 cases
  added to `transfer.test.ts` and `movement-guards.test.ts`. Screen specs
  for the SM/Canteen flows updated (no Destination `<Select>`;
  single-source transfer; the receive split). `pnpm test` /
  `pnpm typecheck` / `pnpm build` green.
- No schema migration (no schema change).

---

## ADR-68: Non-sale consumption is recordable by the staff who witness it — the Canteen Attendant and the Cashier get their own screens, and `cashier` becomes a location-scoped stock reader (Owner + Developer, Milestone 5 — Session 16 QA walkthrough, 2026-09-04)

**Context.** Session 16 (the manual QA walkthrough) reached scripted step
14 — *Canteen Attendant logs Mandazi ×5 as spoiled* — and there was no
way to do it. PRD §3's movement table records non-sale consumption as
**"Recorded by: Any staff"**, and ADR-67's location table lists
`non_sale_consumption` as a legal **outbound** at `store`, `restaurant`
*and* `canteen`. But the only screen was
`/store-manager/flows/non-sale` — Store-scoped and behind the
`store_manager` route gate. The backend was already complete: `POST
/api/stock-movements/non-sale/batch` accepted `canteen_attendant`, and
`recordNonSaleConsumptionBatch` passed ADR-67's R1 guard for dish/goods
at a canteen. A pure UI gap; the owner asked for the Cashier side too
("in the same way the canteen attendant can do this, they should also be
able to do this").

**Decision.**

### 1. One shared flow, three sourced modes

`MovementPickerFlow` (`app/store-manager/flows/movement-picker-flow.tsx`)
gains two modes alongside the existing `non-sale`:

| Mode | Source | Product scope | Route | Redirect |
|---|---|---|---|---|
| `non-sale` | Store | `all` | `/store-manager/flows/non-sale` | `/store-manager` |
| `canteen-non-sale` | Canteen | `canteen` (GET /api/canteen/products) | `/canteen/flows/non-sale` | `/canteen` |
| `restaurant-non-sale` | Restaurant | `dish-or-goods` | `/cashier/flows/non-sale` | `/cashier` |

All three share the reason `<Select>` + note `<Textarea>` (note required
iff reason `other`) and the same `…/non-sale/batch` endpoint. The
Store-hard-coding in the shared body (`storeLocationId`, the literal
"Store" in the impact copy, `mode === "non-sale"` branches) was replaced
by `sourceLocationId` / `sourceLabel` / an `isNonSale` helper, so the SM
flow is behaviourally unchanged. **No kit change** — the modes are
`FLOW_CONFIG` entries, per CONVENTIONS §6.

Entry points: a **"Non-sale"** tile on the Canteen hub (`Trash2`, warning
tone) and a full-width secondary **`<Button>`** on the Cashier "Today"
hub. The Cashier entry was first built as a text link and the owner
rejected it as too easy to miss.

### 2. `cashier` becomes a location-scoped stock reader — reversing an explicit rule

`listMovements` documented and enforced **`cashier` → no stock-movement
access → `FORBIDDEN`** ("a cashier sells, they don't manage stock"). The
non-sale picker loads via `useStaffStock`, which reads `GET
/api/stock-movements` and `GET /api/locations` — so the Cashier screen
403'd before rendering.

**The old rule predates this feature and is now wrong.** A cashier who
sees a dropped plate is exactly the right person to log it — PRD §3 says
so. So `cashier` is added to the location-bound branch of
`listMovements`, receiving **the same treatment `store_manager` /
`canteen_attendant` already have**: own-location rows only, a foreign
`locationId` filter returns `[]`, no `locationId` link → `FORBIDDEN`.

**Why this is a narrow widening, not a hole:** `GET /api/products` and
`GET /api/stock-movements/balances` **already** permitted `cashier`. The
role could already see every Restaurant product and its live derived
balance. This adds only the *movement history* for those same products at
the one location the cashier works at. `GET /api/locations` (widened
too) is the non-sensitive active-only list; its mutations stay admin-only.

Write paths widened in lockstep, both location-bound: the
`non_sale_consumption` entry of the `POST /api/stock-movements` per-type
role map, and `POST …/non-sale/batch` (`cashier` added to `ROLES`, and to
`isLocationBound` in `lib/api/stock-batch-auth.ts` so it is pinned to the
Restaurant). Every **other** batch route rejects `cashier` on its own
`ROLES` list before location binding matters — unchanged.

**Not widened:** issue / production / transfer / purchase-receipt remain
closed to the Cashier. The role gains non-sale only.

**Consequences.**

- `docs/PRD.md` §3's "Any staff" is now true in the product, not just on
  paper.
- Tests: `lib/domain/stock/list-movements-cashier-scope.test.ts` (new — 4
  cases pinning the scope: Restaurant yes, Store/Canteen no, foreign
  filter → `[]`, no location → `FORBIDDEN`);
  `tests/screens/canteen-non-sale.screen.test.tsx` (new, 8);
  `tests/screens/cashier-non-sale.screen.test.tsx` (new, 5); hub-link
  cases in `canteen-hub` / `cashier-orders`; two cashier cases in
  `batch.route.test.ts`. `app/api/locations/route.test.ts`'s "cashier is
  still 403" was **inverted** — it encoded the rule this ADR reverses.
- No schema change. No migration. No `TODO(mock)`.

---

## ADR-69: Deliveries are received by DESTINATION, not by the receiver's home location — the Store Manager receives at the Store *and* the Restaurant, the Canteen Attendant at the Canteen, and a purchase payment's destination is constrained to the legal ones for the product's kind (Owner + Developer, Milestone 5 — Session 16 QA walkthrough, 2026-09-04)

**Context — the bug, found live.** Mid-walkthrough the owner recorded a
purchase payment for *Soda 300ml ×12* from "Coast Bottlers", destined for
the **Restaurant**. `/admin/financials` → Stock Purchases showed it as
**"Awaiting delivery"** — and no staff role had any way to receive it.
The Store Manager hub showed no banner; the SM Receive flow's "Deliveries
awaiting receipt" list was empty. The row was a dead end.

**Root cause — ADR-67 fallout, a half-applied change.**
`listOutstandingPurchasesForLocation(locationId)` filtered
`purchase_payment` rows on the caller's **single assigned location**. The
Store Manager is assigned to the Store, so a Restaurant-destined delivery
was invisible to them.

ADR-67 had moved goods deliveries to land at the **Restaurant** (goods
may not sit at the Store) and updated the **write** path for it — the
Receive flow kind-splits the batch and sends goods lines to the
Restaurant, and `POST …/receipts/batch` gained an "SM may post at a
restaurant" carve-out. **It never updated this read.** So the SM could
write a Restaurant receipt but could not see that one was pending. A
Restaurant- **or** Canteen-destined purchase was unreceivable.

Worse for the Canteen: `GET /api/stock-movements/outstanding` was
`["admin", "store_manager"]`, so the Canteen Attendant was `403`'d
outright and had no receive screen at all. Under ADR-67 the only way
goods reached the Canteen was a transfer from the Restaurant — fine when
a supplier delivers to the Restaurant, useless when they deliver to the
Canteen, which is what the owner was actually recording.

**Decision.**

### 1. Receiving is scoped by destination

| Role | May see / receive deliveries destined for |
|---|---|
| `admin` | every location (unchanged — unfiltered read) |
| `store_manager` | **Store + Restaurant** |
| `canteen_attendant` | **Canteen** |

ADR-67 lands ingredients at the Store and goods at the Restaurant, and
**both are the Store Manager's operational responsibility** — the split
is a property of the goods, not of who handles them. The Canteen is the
attendant's. Every other role receives nothing.

The map is **one function**, `resolveReceivingDestinationIds(role)` in
`lib/domain/stock/receiving-scope.ts`, resolving by `Location.type`
(`active: true` only) — never by name, never by assuming
`resolveActorLocationId` is the Store. Both the read and the write go
through it, so **what a role can SEE and what it can RECEIVE cannot
drift apart** — which is exactly the failure this ADR is fixing.

Goods still reach the Canteen by **transfer from the Restaurant**
(ADR-67), unchanged. Direct Canteen deliveries are an **addition** to
that path, not a replacement.

### 2. `listOutstandingPurchasesForLocation` takes a LIST

`(locationIds: string | readonly string[])`, normalised to an array;
`locationFilter` becomes `{ locationId: { in: [...] } }`. `undefined`
still means "no filter" (the Admin's `listOutstandingPurchases`, byte
-identical behaviour). A bare `string` is still accepted, so no call site
had to change to keep compiling. The role → locations map lives at the
route, not in the domain read — the read just filters.

### 3. The write guard learns the same notion, instead of a second bypass

`lib/api/stock-batch-auth.ts` `guardLocation` is a single-location
equality check, so it would reject an SM posting at the Restaurant. ADR-67
had worked around that with an inline "is the target a `restaurant`?"
`prisma.location` lookup inside the receipts route. That one-off is
**deleted**; `resolveBatchActor` now also returns
**`guardReceivingDestination(target)`**, which checks `target` against
`resolveReceivingDestinationIds(role)`. The receipts batch route calls it
instead. `guardLocation` is untouched for every other batch route (issues
/ transfers / non-sale), whose semantics really are "your own location".

The single-movement `POST /api/stock-movements` `purchase_receipt` case
had the identical hole — the UI posts batches, but leaving the two
endpoints disagreeing meant the same dead end via a different door — so
it resolves through the same map.

ADR-67's **R1 domain guard (`assertKindAllowedAtLocation`) stays the
backstop** and still rejects goods → Store and ingredient → Restaurant.
The destination guard is about *authorisation*; R1 is about *the model*.

### 4. A Canteen "Receive Goods" flow

New route `/canteen/flows/receive` — a thin `mode` wrapper over the shared
`MovementPickerFlow`, exactly like this session's two non-sale wrappers.
New mode **`canteen-receive`**: a `FLOW_CONFIG` entry plus
`CANTEEN_SOURCED` membership and an `isReceive` helper (the mirror of
`isNonSale`), which replaced the `mode === "receive"` literals guarding
the "Deliveries awaiting receipt" `<MatchCard>` list and the additive
`+` total. Scoped to the canteen-sellable set (`GET
/api/canteen/products`), additive (`spend: false`), redirects to
`/canteen`.

**No kind split** — the SM `receive` mode splits its batch because ADR-67
sends ingredients and goods to different places; the Canteen only ever
holds dish/goods, so the whole batch posts as **one** `receiptBatch` at
the Canteen. **No kit change** (CONVENTIONS §6).

Entry points on the Canteen hub, mirroring the SM hub exactly: a
**"Receive Goods"** tile (`PackagePlus`, accent stroke, "N deliveries
pending" + badge when any are outstanding) and a pinned
**`<PurchaseDeliveryBanner>`** per awaiting delivery. The banner's primary
is **"Review & receive"** routing into the flow — never a one-tap
receipt, because **a delivery can arrive short** and the flow is where
what *actually* turned up is confirmed. **No `onFlag`**: that is the
two-phase TRANSFER variance path (`flagTransfer`, ADR-39) and would
reject a `purchase_payment` row.

### 5. The Admin's purchase destination is constrained to ADR-67's model

| Product kind | Selectable destinations |
|---|---|
| `ingredient` | Store only |
| `dish` | not purchasable — already excluded from the picker (ADR-46 §6) |
| `goods` | Restaurant, Canteen |

Before this, the Admin could record a payment whose receipt R1 would
later reject (goods → Store): an **unreceivable dead-end row** no staff
screen could ever clear — the same class of defect as the bug above,
created at the other end. The `Destination` `<Select>` now derives its
options from the selected product's kind, and an effect **clears a stale
destination** when the product changes to an incompatible kind so an
illegal value can't survive into a submit. With no product picked the
list is empty and the field's `required` blocks submission. This is a
**UX narrowing**; the domain guard on the receipt stays the enforcement
point.

Dishes needed no decision: `buyingPrice` is fixed at 0 and a dish is
produced, not bought, so the payment drawer's product picker already
excluded `kind === "dish"` (ADR-46 §6).

**Consequences.**

- `docs/PRD.md` §3 (movement table) + §4.2 — who receives what, and the
  destination constraint on a purchase payment.
- `docs/API.md` — `GET …/outstanding` roles + destination scoping and its
  history; `purchase_receipt` (single + batch) role columns.
- Files: `lib/domain/stock/receiving-scope.ts` (new),
  `lib/domain/stock/list-movements.ts`,
  `app/api/stock-movements/outstanding/route.ts`,
  `app/api/stock-movements/receipts/batch/route.ts`,
  `app/api/stock-movements/route.ts`, `lib/api/stock-batch-auth.ts`,
  `app/store-manager/flows/movement-picker-flow.tsx`,
  `app/canteen/flows/receive/page.tsx` (new),
  `app/canteen/hub-client.tsx`, `app/admin/financials/payment-drawer.tsx`.
- Tests: `lib/domain/stock/list-outstanding-destination-scope.test.ts`
  (new, 5 — multi-location returns both, Canteen-only excludes the
  others, a bare string still works, the Admin read is unchanged, a
  received payment stays excluded);
  `tests/screens/canteen-receive-goods.screen.test.tsx` (new, 10);
  6 banner/tile cases in `tests/screens/canteen-hub.screen.test.tsx`;
  3 destination cases in `tests/screens/financials.screen.test.tsx`;
  and in `app/api/stock-movements/batch.route.test.ts` — the SM sees the
  Restaurant-destined payment (the exact bug), SM→Canteen receipt `403`,
  attendant→Store receipt `403`.
- **Test inverted:** `batch.route.test.ts`'s *"canteen attendant → 403
  (route not widened to them)"* encoded the rule this ADR reverses —
  under it a Canteen-destined delivery could be paid for by the Admin and
  received by nobody. It is now *"canteen attendant sees the Canteen's
  payments, and only those"*. (Same shape as ADR-68 inverting the
  locations-route cashier case.) Nothing else was inverted or deleted;
  the SM's own-location case was **widened**, not reversed — it still
  asserts the Canteen is not in scope.
- No schema change. No migration. No `TODO(mock)`.
