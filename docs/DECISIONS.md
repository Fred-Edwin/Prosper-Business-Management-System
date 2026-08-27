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

**Decision — adopt Storybook v8** (`@storybook/nextjs` + Vite builder),
config in `.storybook/`, loading `app/design-system/tokens.css` +
`app/globals.css` so components render exactly as in the app.

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

**Status:** DRAFT — the `Toast` / `PageShell` layout choices and the
`DatePicker` / `QuantityStepper` API shapes are pending the Session 10b
owner review in Storybook. `Spinner` / `FormField` / the two hover tokens are
mechanical and considered accepted.

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
