# Milestone 2 — Plan & Session Sequence

**Status:** DONE — Milestone 2 landed on `main` 2026-09-01 (M2 Submission 1
= M1 + M2). See `docs/PROGRESS.md` for the shipped detail and
`docs/sprints/m2-followups.md` for the recorded deferrals. This remains
the authoritative record of the M2 session sequence; the §7 table
reflects final reality and §10 is the history of how it got there — never
stacked `> UPDATED` blocks (see guardrail 4).

---

## 1. Milestone goal & scope

**Goal:** *Staff can sell, every day.* Cashiers record real Restaurant
orders (cash / M-Pesa / credit); the Canteen Attendant counts stock and
sales derive automatically; customers carry running credit balances. The
money ledger goes live.

**In scope (PRD):**

| Feature | PRD | Delivers |
|---|---|---|
| M2-F1 Restaurant Sales (Orders) | §4.3 | Cashier creates an order — lines, order type (Dine-in / Takeaway / Delivery), delivery fee, payment method (Cash / M-Pesa / Credit). Cashier edits own orders before day close; corrections are append-only entries, never deletes. Cashier cannot see other cashiers' orders, buying prices, or margins. |
| M2-F2 Customers & Credit | §4.6 | Customer records (name, phone); running credit balance **derived** from debts − repayments; Admin or Cashier records a repayment. A Credit order attaches to a Customer and creates a Debt. No supplier credit. |
| M2-F3 Canteen Derived Sales | §4.4 | Attendant performs a stock count at any time; the system derives units sold and revenue for the period since that product's last count and sets closing stock to the counted value. No credit at the canteen. Admin sees, per product, when it was last counted and what period a figure covers. |

**Out of scope for M2 (deferred):**

- Handover & Reconciliation (§4.5) — **M3**.
- Day Close as a hard lock (§4.5) — **M3**. M2 uses only a soft "is the
  day open" check (see §3).
- Expenses, Owner draw/return, profit reporting (§4.7) — **M3**.
- Staff & Pay (§4.8), Recipes (§4.9), Reporting & Audit view (§4.11).
- Supplier credit — never tracked (PRD §4.6).

---

## 2. Starting state (2026-08-29)

**Already in place:**

- **Schema** — every M2 *model* already exists in `prisma/schema.prisma`:
  `Order`, `OrderLine`, `StockCount`, `MoneyMovement`, `Customer`,
  `Debt`, `Repayment`, plus `OrderType` / `PaymentMethod` / `MoneyAccount`
  enums. `MovementType` already has `sale` and `stock_count`.
  **One migration IS needed:** the `MoneySourceType` enum currently has
  only M1/M3 sources (`handover_receipt`, `expense`, `purchase_payment`,
  `owner_draw`, `owner_return`, `account_transfer`) — Session 3 adds
  **`order`, `repayment`, `canteen_sale`** (a single `ALTER TYPE … ADD
  VALUE` migration; a plain additive DDL). No table changes.
- **Domain folders** — `lib/domain/{sales,customers,financials}` exist,
  empty (`.gitkeep` only).
- **Cashier role** — shell wired; `app/cashier/page.tsx` is a placeholder.
- **Kit** — proven and gated (ADR-42): Storybook story per state,
  visual-regression baselines, `axe` a11y, §9 `postVisit` assertions.
- **Money ledger principle** — ADR-17: money is a **derived** ledger
  (sum `MoneyMovement` rows), never a stored balance. M1 deferred the
  *implementation* (`TODO(mock)` in `lib/domain/stock/purchases.ts`);
  M2 builds it for real.

**Relevant ADRs to read before starting:** ADR-15 (corrections are new
rows), ADR-16 (orders & derived sales), ADR-17 (money as derived ledger),
ADR-19 (customers / debt / repayment), ADR-24 (day close — for the
boundary M2 must respect but not build), ADR-25 (audit trail — every
mutation writes `AuditLog`), ADR-29 (Africa/Nairobi day boundary),
ADR-30 (Decimal money).

---

## 3. Cross-cutting contracts — settle before building (guardrail 7)

These are decided now so no Development Sprint has to invent them:

1. **Money ledger is live in M2.** `MoneyMovement` is implemented.
   `Cash at hand` and `M-Pesa/Bank` balances are derived by summing rows
   (ADR-17) — no stored total anywhere.
2. **Order money effect.** A cash or M-Pesa order writes one
   `MoneyMovement` (the matching account, `sourceType = order`). A
   **credit** order writes **no** money movement — it writes a `Debt`
   and `customerId` is **required** (400 otherwise).
3. **Order correction = a new append-only `Order` row** linked via
   `correctsOrderId`, with offsetting `StockMovement` and `MoneyMovement`
   (or `Debt`) rows that reverse the original's effects. **No delete,
   ever** (ADR-15).
4. **Staff edit window.** A Cashier may edit their **own** order only
   **while the day is open**. M2 has no Day Close UI; it uses a soft
   check: **an order's business day (`Africa/Nairobi`, ADR-29) equals
   today ⇒ open.** After that, the change routes to the Admin correction
   path. A real `DayClose` gate lands in M3.
5. **Canteen derived sale.** On a stock count:
   `sold = opening + received(transfers + production) − non-sale consumption − counted remaining`
   over the period since that product's previous count. Write a `Sale`
   `StockMovement` for `sold`, set closing to the counted value, and
   write a revenue `MoneyMovement` (`sold × canteen selling price`,
   account = Cash — canteen takes no M-Pesa or credit in M2 unless
   Session 1 finds otherwise). No `Debt` path.
6. **Role scoping.** A Cashier sees only their own orders and never sees
   `buyingPrice`, unit cost, or margin (mirror the M1 `listProducts`
   non-admin strip). Admin sees everything.
7. **Audit.** Every domain mutation writes an `AuditLog` row (ADR-25).
8. **Insufficient Restaurant stock on an order line — RESOLVED (Session 1,
   2026-08-29): BLOCK.** An order cannot be saved while any line's
   quantity exceeds the current derived Restaurant balance for that
   product. `createOrder` (and `editOwnOrder`) reject with a validation
   error naming the short line(s) and the available quantity; no `Order`,
   `OrderLine`, `StockMovement`, or `MoneyMovement` row is written. The
   balance is never allowed to go negative. The C2 build screen surfaces
   the rejection inline per line. (PRD is silent; the owner chose block
   over allow-negative-and-flag for ledger integrity.)

---

## 4. Backend outline

Order of build (Sessions 3–5) follows dependency: money ledger first
(everything writes to it), then orders, then the canteen derivation.

### M2-F2 + money ledger — `lib/domain/financials` (money) + `lib/domain/customers`

- **`recordMoneyMovement`** (internal) — append one row (account, amount
  signed, sourceType, sourceId, occurredAt). No public route in M2; it
  is called by orders, repayments, and canteen sales.
- **`getAccountBalances`** — derive `{ cash, mpesaBank }` by summing rows
  (batched; ADR-17). Used by later milestones' financial screens; M2 may
  surface it read-only on an Admin screen.
- **`createCustomer`** / **`listCustomers`** — name, phone; each row
  carries a **derived** `balance` (Σ debts − Σ repayments).
- **`getCustomerLedger`** — debts and repayments for one customer,
  interleaved, with a running balance.
- **`recordRepayment`** — a `Repayment` row + a `MoneyMovement` (Cash or
  M-Pesa in). Admin or Cashier.
- **Routes:** `POST /api/customers`, `GET /api/customers`,
  `GET /api/customers/:id`, `POST /api/customers/:id/repayments`.
- **Tests:** balance derivation (no stored total), repayment → money
  movement, ledger ordering, role access.

### M2-F1 — `lib/domain/sales` (orders)

- **`createOrder`** — validate lines (product exists, sold at this
  location, price snapshot from `ProductLocation`, **quantity ≤ current
  derived Restaurant balance — §3.8 BLOCK; reject naming the short
  line(s), write nothing**), order type + delivery fee rule (fee allowed
  only when `Delivery`), payment method. Compute `total`. Write `Order` +
  `OrderLine[]` + a `Sale` `StockMovement` per line (Restaurant stock
  down, never below zero) + either a `MoneyMovement` **or** (credit) a
  `Debt` with required `customerId`.
- **`editOwnOrder`** — same-day, own-order only; re-validates and rewrites
  lines/movements. After the day rolls, returns a "closed" error.
- **`correctOrder`** — a new `Order` row (`correctsOrderId` set) plus
  offsetting stock + money/debt rows. Admin only.
- **`listOrders`** — role-scoped (Cashier ⇒ own only), margin fields
  stripped for non-admin.
- **Routes:** `POST /api/orders`, `GET /api/orders`,
  `PATCH /api/orders/:id` (own, same-day), `POST /api/orders/:id/correct`.
- **Tests:** cash order, M-Pesa order, credit order → debt + no money
  movement, credit-without-customer → 400, delivery-fee-without-delivery
  → 400, **insufficient-stock line → 400 and no rows written (§3.8);
  balance never negative**, correction reverses stock **and** money
  exactly, cross-cashier list isolation, no margin leak to a Cashier,
  edit-after-day-close rejected.

### M2-F3 — `lib/domain/sales` (canteen derived slice)

- **`recordStockCount`** — a `StockCount` row at `occurredAt`; then the
  derivation in §3.5. Writes the `Sale` `StockMovement`, the revenue
  `MoneyMovement`, and closing stock.
- **`getDerivedSalesForProduct`** / **`listDerivedSales`** — per product:
  last counted at, period covered, units sold, revenue.
- **Routes:** `POST /api/stock-counts`, `GET /api/stock-counts` (or a
  dedicated `GET /api/canteen/derived-sales`).
- **Tests:** derivation against a hand-worked ledger, two counts with a
  gap (period boundary), closing = counted value, revenue = sold ×
  canteen price, no credit path, count by non-attendant rejected.

---

## 5. Screens to design (Session 1, in Paper, from the approved kit)

### Cashier (mobile-first, one-handed)

| ID | Screen | Purpose |
|---|---|---|
| C1 | Cashier Hub / Today | today's own orders, running total, day-open status, "New order" CTA |
| C2 | New Order — build | searchable product picker, line list with qty steppers, live running total |
| C3 | New Order — checkout | order type segmented control, conditional delivery fee, payment method, Credit → customer attach |
| C4 | Order detail / edit | view own order; edit while day open; "Correct this" (Admin) after |
| C5 | Customer attach / quick-create | inline from C3 when payment = Credit |
| C6 | Customers list + balances (mobile) | Cashier views balances and records a repayment |

### Admin

| ID | Screen | Purpose |
|---|---|---|
| A1 | Customers & Credit register | list + derived balances + payment history; record-repayment drawer |
| A2 | Customer detail | debt / repayment ledger for one customer |
| A3 | Orders list (Admin) | all orders, all cashiers, filters; read-only + correction entry |
| A4 | Canteen Derived Sales view | per product: last count, period covered, units sold, revenue |

### Canteen Attendant

| ID | Screen | Purpose |
|---|---|---|
| K1 | Stock Count | pick product, enter counted remaining, preview "sold since last count" before save |
| K2 | Canteen Hub — derived sales in the log | today's derived sales feed the existing hub timeline |

**Flow docs produced in Session 1:**
`docs/design/flows/restaurant-sales-flow.md`,
`docs/design/flows/customers-credit-flow.md`,
`docs/design/flows/canteen-derived-sales-flow.md`.

---

## 6. New components (candidate list — Session 1 confirms, Session 2 builds)

Any screen that needs a component not in the kit ⇒ the component is
**added to the approved kit and gets the full treatment** (§9 interaction
contract, Storybook story per state, visual-regression baseline, `axe`
a11y, §9 `postVisit`) **before any screen composes it** (guardrail 1,
ADR-42). This is the ADR-48 model.

| Candidate | One-line spec | Session 1 (M2-01) verdict |
|---|---|---|
| Order-line editor | repeatable row: product + qty stepper + unit price + subtotal, add / remove; empty state | **compose** — per-screen row from `QuantityStepper` + flex + `IconButton`; states on the "M2 Sales Patterns" artboard |
| Payment-method selector | segmented (Cash / M-Pesa / Credit) with the Credit → customer-attach branch surfaced | **compose** — `SegmentedControl` + a screen-level branch |
| Running-total bar | sticky footer showing order total, updates as lines change | **compose** — `DenseSummaryStrip` + the shell's sticky action-bar slot |
| Customer picker + quick-create | searchable select over customers with an inline "add new" affordance | **compose** — `Select searchable` in a `BottomSheet` + an extra non-`role=option` "Add new" row + a 2-field inline form |
| Derived-sales preview card | "since last count on {date}: sold {n}, revenue KES {y}" shown before the attendant confirms | **compose** — `CalculatedImpactBanner` is an exact fit (`component-states.md` C23) |
| **`QuantityStepper` — tap-to-type value** | the stepper's value becomes a real numeric input: − / + unchanged, tap the number to type a large quantity (`inputmode="decimal"`) | **KIT CHANGE — Session 2 builds it.** Already flagged in `kit-audit.md` C10. States drawn in M2-01 on `6CG-0` (rest · value focused · at-bound · error). Full ADR-42 gate. |

**Session 1 (M2-01) verdict: one kit change is required** — the
`QuantityStepper` tap-to-type value. **Session 2 runs.** M2 stays a
**7-session** milestone. (See §7 for the 1a/1b split of Session 1.)

**New field flagged in M2-01 (not a component):** products gain a
**`category`** attribute (Admin-set, powers the C2 / K1 product-grid
category tab row — the existing kit `Tabs`). Needs a `prisma/schema.prisma`
column, Catalog UI to set it, and a `PRD.md` §4.1 line. Folded into the
Session 3 backend + a Catalog follow-up; see §10.

---

## 7. Session sequence

One role per session (`CLAUDE.md`). Frontend model: **screenshot the
approved Paper artboard, assemble kit components into the real route to
match it, then wire to the already-built domain.** No `get_jsx` skeleton
export, no `/design-preview` route, no `fixtures.ts` mock layer — the
backend exists before the frontend session, so there is nothing to mock.

| # | Session | Role | Scope | Done when |
|---|---|---|---|---|
| 1a | Design Sprint | Product Designer | **DONE 2026-08-29 (M2-01).** All **Cashier** screens (C1–C6) in Paper from the approved kit — 22 artboards incl. every structural state; 3 flow docs written (`restaurant-sales-flow.md`, `customers-credit-flow.md`, `canteen-derived-sales-flow.md`); §3.8 resolved (**BLOCK**); new-component verdict (**one kit change** — `QuantityStepper` tap-to-type); C2 redesigned to a tap-to-add product grid + category tabs; C3/C5 drawn as bottom-sheet overlays; "M2 Sales Patterns" component artboard + `6CG-0` stepper states. | Cashier screens approved in Paper; flow docs written; new-component list final; no real logic written. |
| 1b | Design Sprint | Product Designer | **DONE 2026-08-29 (M2-01b); Canteen re-spun 2026-08-30.** Admin (A1–A4) + Canteen (K1–K2) screens in Paper against the 1a flow docs — desktop **and** mobile per screen, every structural state (rail-drawer open, empty, filtered-empty, error, loading, read-only vs correction-form drawer, linked row-group, first-count preview). K1 reuses the C2 category tab row over the new `category` field; K2 is a new entry type in the existing Canteen hub timeline (no new screen). "M2 Sales Patterns" artboard extended (chip filter bar, derived-sale timeline row, correction linked row-group, stock-count delete confirm). **2026-08-30 re-spin:** K1 reworked to `voidStockCount` (6 → 9 states — "counted more than expected (blocked)", delete-count confirm/success, count-locked-previous-day); A4 negative-revenue treatment removed; `canteen-derived-sales-flow.md` rewritten. Both flow docs' Artboards lists + status notes updated. No kit change; nothing flagged. | Admin + Canteen screens approved in Paper; every state artboarded; flow docs updated. |
| 2 | Kit Sprint | Developer (kit) | **VERIFY-AND-GATE (re-scoped) — DONE 2026-08-30.** The `QuantityStepper` tap-to-type value (`<input inputmode="decimal" role="spinbutton">`, − / + unchanged, §9 contract) **already shipped in M1 Session 10** (`kit-audit.md` §1) — Session 2 verified it against the M2 bar, not a fresh build. Verified: ADR-42 gate green (`tsc` clean; `test:visual` + `test:a11y` 7/7, 0 axe, 0 console); §9 contract per state (rest byte-identical, §9.2 focus border, §9.7 at-bound, §9.8 typed-error, `↑`/`↓` step, commit-on-blur/Enter, out-of-range raw does not fire `onChange`); M2 screen needs (C2/C3/C4 order line, A3 correction editor, K1 larger presentation reachable via screen `className` — no new size variant). Added the **`TypeALargeQuantity`** inline-entry `play` story (focus → clear → type "24" → blur → asserts committed `24` + `onChange(24)` + `onValueString("24")`) + its baseline. Behaviour signed off as the ratified ADR-48 pattern — no owner escalation. `component-states.md` §9 C10 → **"implemented + gated (M2-02)"**; story title de-suffixed `Kit/QuantityStepper`; 7 baselines re-keyed. **No screens, no `app/**`, no `lib/**`.** | Component verified against M2 bar; `test:visual` + `test:a11y` green (7 stories); C10 gate closed; kit gallery de-flagged. |
| 3 | Development Sprint | Developer | Money ledger (`recordMoneyMovement`, `getAccountBalances`) + `lib/domain/customers` + customer/repayment routes + tests. **DONE 2026-08-29** — `MoneySourceType` migration applied (`db push`); `recordDebt(tx)` helper added for S4; overpayment allowed (flagged); `pnpm test` 268/268. | Balances derive from rows; repayment writes a money movement; tests green; `tsc` + `build` clean. |
| 4 | Development Sprint | Developer | `lib/domain/sales` orders — create / edit-own / correct / list; order routes; tests (see §4). **DONE 2026-08-30** — all four paths + §3.8 BLOCK + append-only correction (F-1 idempotent) + cross-cashier isolation + no-margin-leak tested; **`Order.occurred_at` column added** (owner-approved; migration `20260829140000_add_order_occurred_at`); `correctDebt(tx)` helper added to `lib/domain/customers`; **M1 `purchases.ts` `TODO(mock)` resolved** (a `purchase_payment` now writes a `−cost` `MoneyMovement`); `vitest.config.ts` `maxWorkers: 4` (Postgres connection ceiling); account derived from `paymentMethod` (flow doc has no picker); correction rows listed separately (not folded); `pnpm test` 350/350. | All order paths + correction reversal + role isolation tested green. |
| 5 | Development Sprint | Developer | `lib/domain/sales` canteen slice — `recordStockCount` + derivation + revenue movement; routes; tests. **DONE 2026-08-30** — derivation exact across a period boundary; counted-more-than-expected **rejected** (owner override of the flow doc's allow-negative narrative) with a same-day **`voidStockCount`** hard-delete undo (`DELETE /api/canteen/stock-counts/:id`); `pnpm test` 350/350. Shared `lib/domain/sales` files edited additively (S4 rebases them before its own commit). | Derivation matches a hand-worked ledger across a period boundary; tests green. |
| 6a | Development Sprint | Developer | **DONE 2026-08-30.** Backend gap-fills the M2 screen designs need but the plan never scoped (owner-approved scope exceptions): **`Order.number`** (human order number for A2/A3/C1/C4), **`Product.category`** (+ `cashier` in the products / stock-balances read roles) for the C2/K1 category tab rows, **`Repayment.account` + `.note`** for the A2 ledger Reference cell. One deploy migration. Plus the **Customers & Credit** screens (C6, A1, A2) composed from the proven kit + `use-customers.ts` + 18 screen specs. `pnpm test` 368/368; `tsc` 0; `build` clean. Paper-verified: A1/A2/C6 populated states. | Backend fills merged; Customers screens live on real data; specs green; A2 reconciled with the new fields. |
| 6b | Development Sprint | Developer | **DONE 2026-08-30** (owner walkthrough still owed). Responsive Admin shell — the `6BD-0` mobile header + `1ZP-0` `MobileNavDrawer` merged into `components/shells/admin-shell.tsx` (sidebar `hidden md:flex`; hamburger < `--bp-md`; `children` renders once). Admin nav wired: **Sales** → `/admin/orders`, new **Derived sales** → `/admin/canteen/derived-sales` (both nav lists); active-key by longest href-prefix. Cashier bottom nav → **Today · New Order · Customers**. `SimpleTable` gained opt-in `rowChevron` (off = byte-identical; new story + one new baseline; `kit-audit.md` / `component-states.md` updated) — set on A1. Catalog product drawer gained a free-text **Category** field. All remaining Customers state artboards verified vs Paper — structural match, minor copy deltas logged for QA. `tsc` 0; kit `test:visual`/`test:a11y` green (1 new snapshot); full `pnpm test` deferred to 6d. | Admin shell responsive; every M2 nav link routes; `rowChevron` shipped + gated; Catalog sets `category`; Customers artboards verified. **Owner walkthrough pending.** |
| 6c | Development Sprint | Developer | **DONE 2026-08-30** (owner walkthrough owed). `app/cashier/use-orders.ts` (`useOrders` + `useOrder`) + `app/cashier/use-restaurant-products.ts` + C1 (`app/cashier/page.tsx`) · C2 (`app/cashier/orders/new/`) · C3 (checkout `BottomSheet` over C2) · C4 (`app/cashier/orders/[id]/`, edit-vs-read-only) · C5 (attach `BottomSheet`, reuses `useCustomers`). §3.8 line block + credit-needs-customer + C4 own+same-day gate all wired; `account` omitted (domain-derived). `cashier-orders.screen.test.tsx` — 28 tests, every structural state + the §3 contracts + no-margin. Minimal `seedM2Sales()` block (menu categories + stock, 2nd cashier, 4 customers, ~8 orders incl. yesterday + a corrected pair). One hook change: `useCustomers.createCustomer` now returns the created row. `tsc` 0, `build` clean, `pnpm test` 396/396. | Every Cashier order screen live on real data; specs green; walked + signed off. |
| 6d | Development Sprint | Developer | **DONE 2026-08-30.** A3 (Admin orders list + read-only detail drawer + correction form drawer + linked row-group; `use-orders` shared; no delete affordance; no margin column). `app/canteen/use-stock-count.ts` hook + A4 (Derived Sales) + K1 (Stock Count) + K2 (derived-sale row type in the existing Canteen hub `ActivityTimeline`). Screen specs `admin-orders` / `canteen-derived-sales` / `canteen-stock-count` / `canteen-hub` (17 suites, 127 screen tests). Full M2 seed in `prisma/seed.ts`. Gates clean: `tsc` 0, `build` 40 routes, `pnpm test` 411/411. Agreed with owner to run 6e (backend `cashierName` / `productName` hydration on `OrderView`) before S7. | All 12 M2 screens live; `grep TODO(mock)` in M2 `app/**` clean; full suite + `tsc` + `build` + kit gates green. Hand to QA (S7). |
| 6e | Development Sprint | Developer | **DONE 2026-08-31.** `OrderView` gains `cashierName` / `productName` from the domain read (G1/G2) so A3 / C4 render names, not ids. `pnpm test` green. | `OrderView` carries display names; specs green. |
| 7 | QA Sprint | QA Engineer | **DONE 2026-08-31.** Adversarial pass against every M2 acceptance criterion, the 3 flow docs, the approved screens — `docs/sprints/milestone-2-session-7-qa-report.md`. **0 High.** F7-1/3/5/6/10 + the C4 banner fixed. **F7-2** preview built for real (`lib/domain/sales/derive-stock-count.ts` — shared calc, `GET /api/canteen/stock-counts/preview`). Regression tests added (`qa-m2-session-7.test.ts`, `preview-stock-count.test.ts` + route tests). | Findings report delivered; fixes applied with regression tests; full suite + `tsc` + `build` + kit gates green. |

### Submission-1 fidelity pass — 2026-08-31 → 2026-09-01

M2's 12 screens were live and gated after S7, but not all matched Paper
on mobile and the filter rows were bespoke. A concurrent fidelity pass
(one branch per session, all merged onto `integration/m2-submission-1`
and gated 556/0/clean, then landed on `main` as one merge on 2026-09-01)
closed that gap.

| Session | Branch | Delivered |
|---|---|---|
| 3-DOMAIN / batch | `feat/m2-batch-movements` | 5 `POST …/batch` stock endpoints (receipts / issues / production / transfers / non-sale), one atomic txn each, §3.8 BLOCK parity, 1 `AuditLog`/line + a `batch_*` `correlationId`. `lastMovementAt` on the balances payload. `GET …/outstanding` widened to `store_manager` (location-scoped). `derivedRevenue` on `StockMovementView` (F7-7). Shared `lib/domain/stock/movement-core.ts`. Side effect: the single-line movement fns now write 1 `AuditLog` row each (ADR-25 gap closed — see ADR-49). |
| 3-KIT | `feat/m2-3kit-selectable-row` | `SelectableProductRow` kit component — ADR-42-gated (9 stories/baselines). Embedded compact stepper authored inline (reuses the ADR-43/48 contract verbatim). KIT GAP deferred: no additive / `neverBlocks` mode. |
| 3-KIT-FILTER | `feat/m2-3kit-filter-toolbar` | `FilterToolbar` kit component — ADR-42-gated (8 stories/baselines). Kit touch: `Select` + `DatePicker` gained an additive a11y-only `aria-label` prop (ADR-49). |
| 3a | `feat/m2-3a-sales` | `/admin/sales` = one nav item, tabs Restaurant Orders / Canteen Derived, `?tab=` deep-link, 308 redirects (`/admin/orders` + `/admin/canteen/derived-sales` → `/admin/sales`), nav collapsed in both shells. F7-4 full corrected-order form. F7-8 Payment + Cashier pickers. Mobile card layouts. `correction-form.tsx` rebuilt (lost in the concurrent-session incident). |
| 3b | `feat/m2-3b-admin-mobile` | Financials + Assets + Ledger `flex`/`md:hidden` mobile branches. Assets "category" field dropped (ADR-44 stands). |
| opening-stock-mobile | `feat/opening-stock-mobile` | `/admin/stock/opening` `< --bp-md` stacked-card branch. `component-states.md` C26 note. |
| 3c | `feat/m2-3c-sm-flows` | 5 SM movement screens rebuilt on the Option-A multi-row picker via one shared `MovementPickerFlow` + `FLOW_CONFIG` (ADR-49 §1). Fixed `FlowScaffold` scroll / sticky-footer. Interim: additive flows pass `max(onHand, lineQty, 1)`. |
| 3d | `feat/m2-3d-canteen` | Canteen Dispatch via a dispatch mode in the shared picker. Stock Levels pill-set-as-prop. F7-7 hub +KES revenue row (branch-guarded; SM hub byte-identical + guard test). |
| 3e | `feat/m2-3e-filter-retrofit-v2` | Sales / Customers / Ledger / Assets filter rows → `<FilterToolbar>` (kit unchanged). `app/admin/sales/filter-toolbar.tsx` deleted. Deferred: 3a's date quick-rows didn't survive; "Corrected only" renders as a toggle not a checkbox. |
| 3-DESIGN / 3-DESIGN-FILTERS | (flow-doc edits, landed `76c4d8f`) | `restaurant-sales-flow.md` / `canteen-derived-sales-flow.md` / `customers-credit-flow.md` + `kit-audit.md` + `design-principles.md` reconciled to the built screens. |
| FINAL | `main` merge | Landed `integration/m2-submission-1` on `main` (one `--no-ff` merge). Removed the dead staff hamburger. Seed re-dates orders relative to `now` + heals `Location.name`. ADR-49. Docs reconciled. |

**Count: 13 session-slots** (Session 1 → 1a + 1b; Session 6 → 6a–6e).
1a, 1b, 2, 3, 4, 5, 6a–6e, 7 done, plus the Submission-1 fidelity pass
(3-DOMAIN, 3-KIT, 3-KIT-FILTER, 3-DESIGN, 3-DESIGN-FILTERS, 3a, 3b, 3c,
3d, 3e, opening-stock-mobile) and FINAL. **Milestone 2 is DONE
(2026-09-01).**

### Allowed concurrency

The M2 domain contracts are fully settled by the PRD, the M1 ADRs, and
the existing Prisma schema (§2) — Session 1 shapes screens, not the API
surface — and §3.8 is resolved. So sessions may overlap:

- **Session 1 ‖ Session 3** — disjoint files (S1: `docs/design/**` +
  Paper; S3: `lib/domain/{financials,customers}` + `app/api/customers*`
  + tests + the `SCHEMA.md`/`API.md` sections it owns). No decision
  dependency.
- **Session 4 ‖ Session 5** — both start once S3 has landed.
- **Session 1b** ‖ Session 4 ‖ Session 5 — 1b is `docs/design/**` +
  Paper only, disjoint from the domain sessions.
- **Session 2** (confirmed: the `QuantityStepper` tap-to-type change)
  runs after 1a and may overlap 1b / S4 / S5. It must land before S6
  assembles the Cashier screens.

**Hard ordering that still holds:** S3 → {S4, S5} — S4's `createOrder`
writes a `MoneyMovement` or a `Debt`, and a credit order needs a
`Customer`, both from S3. And **S6 is the join point** — it needs S1's
artboards, S2's proven component (if any), and S3–S5's domain. S7 last.

**Concurrency hygiene:** each parallel session is its own branch. The
only shared files are `docs/PROGRESS.md` and this plan — whichever
session merges second rebases and appends its entry rather than both
editing in parallel.

**Highest-stakes QA targets:** money-ledger integrity (Cash + M-Pesa
balances reconcile against Σ `MoneyMovement`), order corrections neither
double-count nor lose stock/money, credit balances derive correctly,
canteen derived-sales math exact across period boundaries, cross-cashier
isolation, no buying-price/margin leak to a Cashier.

---

## 8. The 7 guardrails (standing — execute against these every session)

1. **Prove a component before a screen uses it.** New component →
   Storybook story per state + visual-regression + a11y check first.
   Screens only ever compose already-proven kit.
2. **No headless-browser e2e.** Fast jsdom + RTL screen specs are the
   automated interaction gate; the real end-to-end check is the owner
   walkthrough. (App-level Playwright e2e was removed after M1; the
   Storybook kit gates still use Playwright under the hood and stay.)
3. **Owner walkthrough per feature, not per milestone.** After each
   feature's Development Sprint, the owner drives it on `pnpm dev` as
   every role that touches it, before it is called done.
4. **Re-baseline the plan, don't annotate it.** When sequencing changes,
   rewrite §7's table to show current reality; add one line to §10.
   Never stack `> UPDATED` blocks.
5. **Run the audit passes as named steps.** Before a feature is done,
   explicitly check: no raw hex (tokens only), no pattern built 3× and
   left out of the kit, table/layout parity, nothing bespoke that should
   be kit.
6. **Settle recurring late-decisions up front.** Before design starts:
   searchable selects for long lists, void/correct semantics, role
   access on every endpoint, empty/error states for every screen.
7. **Lock cross-cutting contracts before building** (§3): how order
   money is recorded, how derived canteen sales reconcile against stock
   counts, orders open across midnight, the correction pattern for a
   posted order.

---

## 9. Definition of done for Milestone 2

- All M2 acceptance criteria (PRD §4.3, §4.4, §4.6) met.
- Money ledger live; balances derived, never stored; verified in QA.
- Per-feature owner walkthroughs complete.
- `pnpm test` + `pnpm tsc --noEmit` + `pnpm build` green; kit
  `test:visual` + `test:a11y` green.
- Any new kit component fully gated (ADR-42) and in the kit gallery.
- `docs/PROGRESS.md` has the M2 sprint entries; `docs/ROADMAP.md` M2
  table marked done.

---

## 10. Changelog

*(One line per sequencing change. The §7 table above always reflects
current reality; this is the history of how it got there.)*

- 2026-08-29 — Plan created and approved. 7-session sequence (6 if no
  new component is needed). Frontend model set to screenshot-and-assemble
  (no skeleton export / `/design-preview` / `fixtures.ts`).
- 2026-08-29 — §3.8 resolved by the owner during Session 1 planning:
  **BLOCK** an order with an insufficient-Restaurant-stock line (no
  negative balance). §3, §4, and the Session 1 row updated.
- 2026-08-29 — Added §7 "Allowed concurrency": Session 1 ‖ Session 3 and
  Session 4 ‖ Session 5 may run in parallel; S3 → {S4, S5} and S6-as-join
  still hard. No change to the 7-session count.
- 2026-08-29 — Corrected §2: a migration **is** needed after all — the
  `MoneySourceType` enum lacks `order` / `repayment` / `canteen_sale`;
  Session 3 owns that `ALTER TYPE … ADD VALUE` migration.
- 2026-08-29 — **Session 1 split into 1a (done) / 1b (pending).** M2-01
  delivered the Cashier screens (C1–C6, 22 artboards), the 3 flow docs,
  and the §6 verdict; the Admin + Canteen screens (A1–A4, K1–K2) move to
  Session 1b. §7 table re-baselined.
- 2026-08-29 — **Session 2 confirmed needed.** M2-01's new-component
  verdict is **one kit change**: `QuantityStepper` gains a tap-to-type
  numeric value (already flagged in `kit-audit.md` C10) for large order
  quantities. States drawn on `6CG-0`. Everything else on the §6
  candidate list composes from the proven kit.
- 2026-08-29 — **New product field `category` flagged** (M2-01). C2's
  order screen was redesigned to a tap-to-add 2-column product grid with
  a category tab row (POS-standard; owner direction) — the tabs need a
  new Admin-set `category` attribute on products. Adds: a
  `prisma/schema.prisma` column + Catalog UI + a `PRD.md` §4.1 line —
  folded into Session 3's backend scope and a Catalog follow-up. C3 and
  C5 were also redrawn as bottom-sheet overlays (mobile-POS convention).
- 2026-08-30 — **Session 5 done.** Canteen "counted more than expected"
  resolved by the owner: **REJECT** (`VALIDATION_ERROR`, nothing
  written) — overriding the `canteen-derived-sales-flow.md` walkthrough C
  narrative, which had leaned toward allowing a negative-sold
  reconciliation. Recovery is a same-day **`voidStockCount`** hard-delete
  undo (`DELETE /api/canteen/stock-counts/:id`, attendant + same-day
  only; after the day rolls it's an Admin correction path — a later
  session, needs a `corrects_stock_count_id` migration). §3.5 stands as
  the derivation; the flow doc's negative-sold section is superseded and
  should be reconciled in a Design touch-up or noted by QA. No change to
  the session count.
- 2026-08-30 — **Session 4 done.** One **schema addition** (owner-approved
  mid-session): `Order.occurred_at` — the edit-vs-correct gate and the
  "correction lands in the original's business day" rule need a business
  instant on the order, which the model lacked (every other ledger table
  has one). Additive column, `db push` + migration file
  `20260829140000_add_order_occurred_at`. Also: the M1 `purchases.ts`
  `TODO(mock)` (plan §11) was resolved here — a `purchase_payment` now
  writes a paired `−cost` `MoneyMovement`. Test infra: `vitest.config.ts`
  `maxWorkers: 4` (S4 + S5 DB-heavy suites vs the local Postgres
  100-connection ceiling). No change to the session count or sequence.
- 2026-08-30 — **Canteen design re-spin (Product Designer).** The Session
  5 `voidStockCount` override (above) was reconciled into design: K1
  re-spun 6 → 9 artboards (the "correcting re-count, negative sold"
  frame → "counted more than expected (blocked)"; added delete-count
  confirm, delete-count success, count-locked-previous-day), A4's
  negative-revenue treatment removed, "M2 Sales Patterns" updated
  (zero-sold timeline variant + a delete-confirm section),
  `canteen-derived-sales-flow.md` rewritten (rule 5, §period-boundary,
  walkthroughs C/C2/C3/D/F, data notes). `docs/**` + Paper only. No
  change to the session count or sequence. Session 6's Canteen blocker
  is cleared. See `PROGRESS.md`.
- 2026-08-30 — **Session 2 re-scoped — verify-and-gate, not build.** The
  `QuantityStepper` tap-to-type input already shipped in M1 Session 10
  (`kit-audit.md` §1, ratified ADR-43/ADR-48) before M2 planning assumed
  it was still owed. Session 2 verified it against the M2 acceptance bar,
  added the inline-entry `TypeALargeQuantity` `play` story + baseline,
  signed off the commit-on-blur/Enter behaviour as the ratified ADR-48
  pattern (no owner escalation), and closed the ADR-42 gate —
  `component-states.md` §9 C10 is now "implemented + gated (M2-02)". Kit
  only (`components/kit/quantity-stepper.*` + baselines + `docs/design/*`
  + this plan + `PROGRESS.md`). No change to the session count. Session 6
  now has its `QuantityStepper` hard dependency (C2/C3/C4 + A3) satisfied.
- 2026-08-30 — **Session 6 split into 6a / 6b / 6c / 6d** (count 8 → 11).
  Session 6 started as "assemble all 12 M2 screens + owner walkthrough".
  On discovery, three backend gaps blocked the screen designs — the menu
  `category` field (planned M2-01 §6/§10, folded into "Session 3 + a
  Catalog follow-up", **never built**), the absence of a human-readable
  `Order.number` (every screen design assumes one; the model had only a
  UUID), and the A2 ledger needing the repayment `account` on the entry.
  **The owner approved filling all three** (schema + domain — which the
  Session 6 handoff §9 had forbidden) rather than defer C2/K1 and ship a
  half-usable feature. Given the volume, Session 6 was re-baselined:
  **6a** (backend fills + the Customers screens, DONE), **6b** (responsive
  `AdminShellClient` + nav wiring + `SimpleTable` chevron + finish
  Customers verification/walkthrough), **6c** (Restaurant Orders: C1–C5),
  **6d** (Admin Orders A3 + Canteen A4/K1/K2 + seed + final gates + docs
  → hand to QA). Owner also lifted the "no schema/domain" boundary for
  any further gap 6b–6d hit **that a fresh feature genuinely needs** —
  raise it, get the go-ahead, fill it properly. The `category` blocker
  from the 2026-08-30 canteen re-spin entry is now cleared (6a built it).
- 2026-08-30 — **Session 6c done.** Restaurant Orders C1–C5 assembled
  from the proven kit + `use-orders` / `use-restaurant-products` hooks;
  28-test screen spec; a minimal `seedM2Sales()` block (pulled forward
  from 6d so the owed 6b Customers walkthrough and the 6c Cashier
  walkthrough are both possible now). One hook return-type change
  (`useCustomers.createCustomer` → returns the created customer). No
  schema, no `lib/domain`, no kit change. `pnpm test` 396/396. Owner
  walkthroughs (6b Customers + 6c Cashier) still owed. No change to the
  session count.
- 2026-08-30 — **Session 6d done.** Admin Orders A3 + Canteen Derived
  Sales A4 + Canteen Mobile Stock Count K1 + Canteen Hub K2 built from kit.
  Full M2 database seed in `prisma/seed.ts` (canteen products, movements,
  counts, derived sales matching Paper walkthroughs). Screen specs added:
  `admin-orders.screen.test.tsx`, `canteen-derived-sales.screen.test.tsx`,
  `canteen-stock-count.screen.test.tsx`, `canteen-hub.screen.test.tsx` (17
  suites, 127 screen tests). Full gates clean: `pnpm tsc --noEmit` (0 errors),
  `pnpm build` (all 40 routes), `pnpm test` (411/411 passed). Plan agreed
  with owner to run Session 6e for backend domain field hydration (G1/G2
  cashierName/productName in OrderView) before Session 7 QA.
- 2026-08-31 — **Sessions 6e + 7 done.** 6e: `OrderView` carries
  `cashierName` / `productName` from the domain read. S7: adversarial QA
  pass — 0 High; F7-1/3/5/6/10 + the C4 banner fixed; F7-2 preview built
  for real (`derive-stock-count.ts` + `GET /api/canteen/stock-counts/preview`).
  See `milestone-2-session-7-qa-report.md`.
- 2026-09-01 — **Submission-1 fidelity pass + M2 S7 QA landed as one
  integration merge.** 11 fidelity-pass branches (3-DOMAIN batch endpoints,
  3-KIT `SelectableProductRow`, 3-KIT-FILTER `FilterToolbar`, 3a merged
  `/admin/sales`, 3b + opening-stock-mobile responsive branches, 3c/3d
  staff + canteen picker flows, 3e filter retrofit, 3-DESIGN flow-doc
  reconciliation) + S7 were merged onto `integration/m2-submission-1`,
  gated 556/0/clean, and landed on `main` as one `--no-ff` merge. FINAL
  session: dead staff hamburger removed, seed re-dates orders relative to
  `now` + heals `Location.name`, ADR-49 recorded, milestone docs
  reconciled. **Milestone 2 is DONE.** §7 table re-baselined (13
  session-slots + the fidelity pass).

