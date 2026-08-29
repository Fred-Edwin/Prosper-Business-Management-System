# Prosper — Progress Log

Running status log, updated at the end of every sprint session.

**How this log is kept (so it doesn't inflate):**

- The **current milestone** gets a full entry per session: what shipped,
  what's blocked, what changed from plan, key ADRs, gate state.
- When a milestone closes, its detailed entries are **compressed to
  one-line ledger rows** in the "Shipped — earlier milestones" table
  below, and the full milestone plan (`docs/sprints/milestone-XX-plan.md`)
  plus the ADRs remain the durable record.
- Per-session handoff docs are **not** kept — once a session's PROGRESS
  entry is written, the handoff has done its job.

---

## Milestone 2 — Staff can sell, every day

**Plan:** `docs/sprints/milestone-2-plan.md` (living — 8 session-slots:
Session 1 split 1a done / 1b pending, Session 2 confirmed needed).
**Status:** Session 3 done (backend); Session 1a done (Cashier design);
1b, 2, 4, 5 pending.

### 2026-08-29 — M2 Session 1a: Cashier screens design (Product Designer) — DONE

Design Sprint, Phase A. Ran after Session 3 landed. Scoped **mid-session
by the owner** to the Cashier screens only (C1–C6); the Admin (A1–A4) and
Canteen (K1–K2) screens moved to a new **Session 1b**. The 3 flow docs
were written in full (all of M2), so the backend sessions are unblocked.

**Shipped — Paper ("Prosper Hotel", page "Shell+Component kit"):**
22 Cashier artboards + 1 component artboard, all named `… [M2-01]`.
- **C1 Cashier Today** (4): populated · empty · day-closed banner · loading.
- **C2 New Order — build** (3): populated · empty · line-blocked (§3.8).
  **Redesigned** from a search-only add flow to a **tap-to-add 2-column
  product grid** (POS-standard): search → category tab row → tappable
  tiles (name · price · unit · stock-available · qty badge) → a pinned
  order-line panel above the sticky total bar.
- **C3 Checkout** (5): Cash · M-Pesa · Credit-no-customer · Credit-attached
  · Delivery — all drawn as a **tall bottom-sheet over the dimmed C2**
  (mobile-POS convention; Square / Toast / Loyverse open tender as a
  modal sheet, not a route).
- **C4 Order detail** (3): day-open editable · day-closed read-only ·
  corrected.
- **C5 Customer attach** (3): search results · no-match quick-create ·
  phone error — bottom-sheet over the dimmed C3.
- **C6 Customers (mobile)** (4): populated · empty · repayment sheet open
  · repayment success.
- **`Component Kit — M2 Sales Patterns [M2-01]`** — canonical states for
  the order-line row, product tile, and sticky total bar. **`6CG-0`
  Form Controls** — `QuantityStepper` tap-to-type states added.

**Flow docs (all written, full M2 scope):**
`restaurant-sales-flow.md`, `customers-credit-flow.md`,
`canteen-derived-sales-flow.md` — match the
`financials-reconciliation-flow.md` format. The customers + canteen docs
carry a note that their Admin/Canteen artboards are owed by Session 1b.

**Decisions:**
- **§3.8 — BLOCK.** A Restaurant order line whose qty exceeds the
  product's derived stock-available count cannot be confirmed (line →
  §9.8 error pattern, sticky action disabled + danger caption; server
  enforces `400 insufficient_stock`). Recorded in `restaurant-sales-flow.md`.
- **New-component verdict: ONE kit change → Session 2 runs.**
  `QuantityStepper` gains a **tap-to-type numeric value** (`<span>` →
  `<input inputmode="decimal">`; − / + unchanged) for large order
  quantities — already flagged in `kit-audit.md` C10. Everything else on
  the plan §6 list composes from the proven kit.

**Changed from plan:**
- **Session 1 → 1a (done) / 1b (pending).** §7 re-baselined, §10 changelog
  appended. M2 is now 8 session-slots.
- **Session 2 confirmed needed** (was "skipped if none").
- **New product `category` field flagged** — the C2 / K1 category tab row
  needs an Admin-set `category` attribute on products (schema column +
  Catalog UI + `PRD.md` §4.1 line). Folded into Session 3's backend +
  a Catalog follow-up; `milestone-2-plan.md` §6/§10.

**Gate state:** design-only session — no code, no tests. Discipline held:
only `docs/**` and the Paper file were touched.

**Owed by Session 1b:** A1–A4, K1–K2 — desktop **and** mobile, every
structural state.

### 2026-08-29 — M2 planning + doc/codebase cleanup (Tech Lead) — DONE

Not a feature sprint — a planning + cleanup pass before M2 Session 1.

- **`docs/sprints/milestone-2-plan.md`** written — scope, out-of-scope,
  starting state, §3 cross-cutting contracts (money ledger goes live;
  order money effect; append-only correction; soft "open day" check;
  canteen derivation; role scoping; audit), backend + screen + new-component
  outlines, the 7-session sequence, the 7 guardrails, definition of done,
  a changelog section. It is a **living** doc — re-baselined as M2 runs.
- **`docs/sprints/milestone-2-session-1-handoff.md`** — the M2 Session 1
  (Design Sprint) handoff (renamed from an externally-authored
  `sprint-m2-01-…`; content kept, verified consistent with the plan).
- **PROGRESS.md compacted** 3,344 → ~90 lines. M1's 30 detailed session
  entries collapsed to a one-line ledger on M1 close. Rule added: full
  detail for the current milestone only.
- **`docs/sprints/` cleared** of all per-session handoffs, findings docs,
  and the old `sprint-0X-*` files. Kept: `milestone-1-plan.md` (rewritten
  to a short closed stub + pointers) and the two M2 files.
- **`app/design-preview/` + `docs/design/screens/` deleted** (23 preview
  routes, 21 screen skeletons + their `fixtures.ts`). From M2 the frontend
  model is screenshot-the-artboard-and-assemble — no skeleton export, no
  fixtures mock layer, no `/design-preview` route. The 5 `app/admin/**`
  page comment headers updated to drop the dangling references.
- **`docs/design/export-workflow.md`** — added the M2 model (Phases
  C1 backend / C2 frontend assembly; owner walkthrough as a gate step);
  removed the `fixtures.ts` / `/design-preview` machinery.
- **`docs/sdlc.md`** trimmed 614 → 277 lines (dropped the 7 verbose prompt
  templates + the stale monorepo codebase-structure block; added a
  "deviations from the generic structure" note). Phase 3.1 / 3.2 rewritten
  for the M2 backend-first model.
- **Headless-browser e2e dropped** (per owner). The M1 Playwright harness
  was never built; Session 17 already repurposed `test:e2e` to run Vitest
  integration suites. `TEST_PLAN.md §2` rewritten (Playwright → Vitest
  domain-integration + owner walkthrough); `DECISIONS.md` ADR-35 given an
  M2 superseding note. `@playwright/test` / `axe-playwright` **kept** —
  the Storybook test-runner (`test:visual` / `test:a11y`) uses them.
- **`docs/CONVENTIONS.md §6`** added — working practices carried forward
  from M1 (prove-before-use, never-eyeball-a-screenshot, named audit
  passes, owner walkthrough per feature, re-baseline don't annotate,
  ledgers-not-totals + correction-of-correction rejection).
- **`CLAUDE.md` / `ROADMAP.md` / `milestone-01-*.md`** updated for the
  new doc layout (one plan file per milestone; PROGRESS ledger; M1 marked
  done).
- Gates: `pnpm tsc --noEmit` 0, `pnpm build` clean, `pnpm test` **226/226**.

### 2026-08-29 — M2 Session 3: Money ledger + Customers & Credit (Developer) — DONE

Backend-only Development Sprint; ran in parallel with Session 1 (Design)
on disjoint files. Unblocks Sessions 4 (Orders) and 5 (Canteen sales).

**Shipped:**

- **Migration `20260829130000_add_m2_money_source_types`** — adds `order`,
  `repayment`, `canteen_sale` to the `MoneySourceType` enum (plain
  `ALTER TYPE … ADD VALUE`, no table change). **Applied to the dev DB via
  `prisma db push`** (the dev DB carries no `_prisma_migrations` history —
  carried convention from M1); the migration file is committed for a real
  deploy. S4/S5 consume `order` / `canteen_sale` and need no further
  migration.
- **`lib/domain/financials/`** — the money ledger (ADR-17):
  - `recordMoneyMovement(input, { actorId, tx? })` — internal, no route.
    Appends one signed `MoneyMovement` row + an `AuditLog` row. Takes an
    **optional Prisma tx client** so S4/S5 can write it inside the same
    transaction as the `Order` / `StockCount` and its `StockMovement`s —
    money and stock commit together or not at all. With no `tx` it opens
    its own transaction. Shaped for a future `correctMoneyMovement`
    (offsetting row via `correctsMovementId`, ADR-15) — not built.
  - `getAccountBalances()` → `{ cash, mpesaBank }` as `Prisma.Decimal`,
    one grouped `SUM(amount)` by account over the whole ledger. No stored
    total. `serialiseAccountBalances` stringifies at the route boundary.
- **`lib/domain/customers/`** — Customers & Credit (ADR-19):
  - `createCustomer` (trim + non-empty name/phone; no phone format /
    uniqueness — SCHEMA sets none; `AuditLog` on create).
  - `listCustomers({ search?, hasBalance? })` — derived `balance`
    computed **set-wise** (two grouped sums, `Σdebts − Σrepayments`),
    `lastActivityAt`, case-insensitive name-or-phone search.
  - `getCustomerLedger` — debts + repayments interleaved by `occurredAt`
    then `createdAt`, running balance, `NOT_FOUND` for an unknown id.
  - `recordRepayment` — one transaction: `Repayment` + a `+amount`
    `MoneyMovement` (`sourceType: "repayment"`) + two `AuditLog` rows.
    `amount > 0`. **Overpayment allowed → negative balance** (see flag).
    `occurredAt` stamped, not day-gated (no Day Close in M2).
  - `recordDebt({ customerId, orderId, amount, occurredAt }, { tx })` —
    **tx-only helper for S4** to call from `createOrder` on a `credit`
    order. S3 only reads `Debt`; it never originates one.
- **Routes** (each mirrors `app/api/products/route.ts` in shape; no logic
  in the handler): `GET`/`POST /api/customers`, `GET /api/customers/:id`,
  `POST /api/customers/:id/repayments` — all **Admin or Cashier**;
  `GET /api/money/balances` — **Admin only**. Zod in
  `lib/validation/customers.ts`.

**Changed from plan:** none — scope as handoff. `recordDebt` helper built
this session (handoff left it to my discretion; building it keeps S4 out
of Prisma for `Debt` writes).

**Flag for Session 1 flow doc + QA:** a repayment greater than the
outstanding balance is **accepted** and drives the derived balance
negative (credit in hand). Deliberate per the handoff; not silently
blocked. If the owner wants it blocked that is a follow-up, not a code
change made here.

**One existing test adjusted (not weakened):**
`tests/integration/m1-flows/flow-4-purchase-reconciliation.test.ts` —
its "purchase_payment writes NO MoneyMovement" check used a global
`prisma.moneyMovement.count()` before/after, which is now flaky because
the money ledger is live and other suites hold `MoneyMovement` rows
concurrently. Rescoped to "no `MoneyMovement` linked to *this* payment"
(by `stockMovementId` / `sourceId`) — a stricter assertion of the same
intent.

- Gates: `pnpm tsc --noEmit` **0**; `pnpm build` **clean**; `pnpm test`
  **268/268** (226 existing + 42 new: financials 7, customers domain 17,
  routes 18), stable across repeated runs.
  `grep TODO(mock)` in the new modules → none.

*(Full per-session entries for M2 Sessions 1–7 go here as they run.)*

---

## Shipped — earlier milestones (ledger)

### Milestone 1 — The business exists in the system — COMPLETE 2026-08-29

Catalog & Locations, the full append-only StockMovement ledger across
Restaurant / Canteen / Store, the `/admin/financials` stock-purchase +
reconciliation slice, and the Assets register. No revenue.
Plan: `docs/sprints/milestone-1-plan.md`. ADRs: 13–48.

| Date | Session | Shipped |
|---|---|---|
| 2026-08-19 | Planning & repo setup | PRD / ARCHITECTURE / API / SCHEMA / DECISIONS / CONVENTIONS / TEST_PLAN / ROADMAP; git init; first commit. |
| 2026-08-19 | Sprint 01 — Foundation | Next.js App Router + TS on pnpm; full Prisma schema migrated; Auth.js name + 4-digit-PIN login, server-side role checks on 4 shells; PWA manifest + SW; seed; `lib/time` (Africa/Nairobi); Zod validation example. |
| 2026-08-20 | Phase 2B — Design system | Paper.design component library (16-artboard kit) + `design-principles.md`. |
| 2026-08-20 | Component export (Paper → code) | First kit export pass (later superseded by the Session 3/9–10 rebuild). |
| 2026-08-20 | Login screen + role shells | `app/login/*` + 4 role shell routes wired to `usePathname` / `router` / `signOut`. |
| 2026-08-24 | Sprint 02 — Catalog design & Next.js assembly | Catalog screens assembled on mock data (later superseded). |
| 2026-08-25 | Sprint 06 — Design export | 21 screens exported by `get_computed_styles` reconstruction — **all wrong, all scrapped**. Triggered the `milestone-1-plan.md` re-plan and `export-workflow.md`. |
| 2026-08-27 | Tech Lead — M1 re-plan | `export-workflow.md` written; stale docs cleaned; M1 scope pinned in `milestone-1-plan.md`. |
| 2026-08-27 | Design Sprint 2 — component states | `component-states.md`; consistency audit (5 token/structure divergences fixed in Paper); `design-principles.md §9` interaction contract. ADR-36. |
| 2026-08-27 | Design Sprint 3 (pt 1 + 2) | Kit + 4 shells re-exported by verbatim `get_jsx`; route clients rewired; `tsc` green. |
| 2026-08-27 | Design Sprint 4a / 4b / 4c | All 21 M1 screens re-exported from Paper + screenshot-verified (F1/F3/Financials, then 5 Admin Stock, then 7 Store Manager/Canteen). `globals.css` type-scale fix; ADR-37c FlowHeader. |
| 2026-08-27 | Dev Sprint 5 — M1-F1 Catalog & Locations | `lib/domain/catalog` (Dish `buyingPrice=0` invariant, soft/hard delete + referential guard → 409), `app/api/products*`, `/api/locations`. F1 screens wired. 35 tests. ADR-38. |
| 2026-08-27 | Dev Sprint 6 — M1-F2 Stock backend | `lib/domain/stock` — all 8 movement fns + 2-phase transfer + `correctMovement` (day-close gate) + sum-the-ledger balances + `listMovements` (role/location scoped). Routes. ADR-39. 56 tests. |
| 2026-08-27 | Dev Sprint 7 — M1-F2 Admin stock frontend | Ledger + correction drawer + mobile + bulk opening grid + financials stock-purchase/reconciliation slice. `GET /api/stock-movements/balances` (ADR-40). Collapse persists (ADR-36b). 76 tests. |
| 2026-08-27 | Dev Sprint 9 — Kit remediation pt 1 | `app/design-system/tokens.{css,ts}` (foundations + interaction contract + drift-guard test); §9 as shared CSS. ADR-41 (opaque `--surface-raised`, `--surface-panel-tint` retired), ADR-42 (Storybook adopted). |
| 2026-08-27 | Dev Sprint 10 — Kit remediation pt 2 | All 32 `components/kit/*` audited + fixed to implement every §9 state + keyboard + ARIA; 4 primitives added (`Spinner` / `Toast` / `PageShell` / `FormField`). `lib/tokens.css` deleted. ADR-43. 80 tests. |
| 2026-08-28 | Dev Sprint 10b–10d — Kit proof harness | Storybook stood up: one story per state, visual-regression baselines, `axe` a11y, §9 `postVisit` assertions. `test:visual` / `test:a11y` gates. |
| 2026-08-28 | Dev Sprint 11 — Admin screens recomposed | `/admin/catalog`, `/admin/stock` + `/opening` + `/financials` rebuilt as compositions of the proven kit (`PageShell` / `FormField` / `Toast` / `EmptyState` / `ErrorState`). `export-workflow.md` rewritten (compose, don't transcribe). Per-screen `*.screen.test.tsx` gate (18 specs). |
| 2026-08-28 | Dev Sprint 12 — Store Manager + Canteen frontend | 7 staff screens composed from the proven kit + wired to F2 API; incoming-transfer banner + 2-phase accept. ADR-44. 28 screen specs. |
| 2026-08-28 | Dev Sprint 13 — M1-F3 Assets | `lib/domain/assets` (CRUD + `transitionCondition` + friction-guarded `hardDeleteAsset` → 409 on linked AuditLog), routes, Register + Drawer + Delete Dialog from the kit. ADR-45. Suite 127 → 154. |
| 2026-08-29 | Dev Sprint 14 — M1 manual-walkthrough fixes | D1 staff-FORBIDDEN fixed (`GET /api/products` + `/api/locations` widened to staff stock roles; POST stays admin; `buyingPrice` still stripped). Copy sweep: B1 "Stock"→"Ledger", B4 "Shop Goods"→"Goods", C2 "Cash at Hand"→"Cash". A3 Catalog drawer → `variant="rail"`. |
| 2026-08-29 | Design Sprint 15 — M1 design-change pass | ADR-46 (Financials Reconciliation section → table; purchase-payment detail → real fields; delete-in-drawer; A4 kind hint; B3 typography) + ADR-47 (Archive model: table tab + friction-free Unarchive + stock-flow picker exclusion). Paper + ADRs only. |
| 2026-08-29 | Kit Sprint — `<Select>` searchable mode | Opt-in `searchable` + `noMatchesLabel` props on `components/kit/select.tsx` (APG editable-combobox filter, 288px cap + scroll); 5 stories + 5 visual baselines. `<Select>` without the prop byte-unchanged. ADR-48. |
| 2026-08-29 | Dev Sprint 16 — build S15 designs + A5 Archive | Migration: 4 nullable `purchase_*` columns + backfill. `recordPurchasePayment` writes them; `parsePaymentNote` deleted. Reconciliation table (Awaiting delivery / Delivered / Received-no-payment / Flagged). Delete-in-drawer + Edit-only rows (Catalog + Assets). A4 kind hint. A5 Archive: `?mode=unarchive` + `/assets/:id/restore` endpoints, Archived tabs, archived-record guard, stock-flow picker-exclusion audit + one test per flow. Suite 154 → 200/201. |
| 2026-08-29 | QA Sprint 17 — adversarial M1 pass — **M1 COMPLETE** | **F-1 (High, ledger integrity) fixed:** `correctMovement` stacked a second delta on a double-submitted correction and allowed correcting a correction — now rejects a target with `correctsMovementId` set and computes `delta = corrected − (original + Σ existing deltas)` so a repeat is delta-0. B2 (bulk opening post-save) + B5 (correction cell) reproduced + resolved. M1-flow Vitest integration tests added. Suite **226/226**, `tsc` 0, `build` clean. Merged to `main` (PR #1). |

**M1 known follow-ups (not blocking M2):**

- **2-phase transfer receiver visibility** — a `transfer` dispatch row is
  stored with `locationId = source`; `listMovements` scopes a
  location-bound role to their own location, so the receiver never sees
  the pending inbound dispatch and the Accept banner never appears for a
  real cross-location transfer. `POST …/accept` works given a valid id.
  Needs a Design call (match on
  `transferCounterpartLocationId = actor.locationId`, or a dedicated
  inbound-transfers endpoint).
- `prisma/seed.ts` upserts the staff `User` with `update: {}` — a staff
  row created before `staffId` existed would never be backfilled. One-line
  hardening, deferred.
- Dev DB has no `_prisma_migrations` history (built by `db push` every
  session); the committed migration files are for a real deploy — confirm
  `migrate deploy` applies them cleanly on a tracked DB.

---

## Changelog of this log's structure

- 2026-08-29 — Compacted. M1's 30 detailed session entries (was ~3,340
  lines) collapsed to the ledger table above on M1 close. Going forward:
  full detail for the current milestone only.
