# Milestone 2 — Plan & Session Sequence

**Status:** Active — planning approved 2026-08-29. This is the authoritative,
living plan for Milestone 2. It is **updated as the milestone progresses**:
when sequencing changes, the session table in §7 is rewritten to reflect
reality and a one-line entry is added to §10 — never stacked `> UPDATED`
blocks (see guardrail 4).

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

| Candidate | One-line spec |
|---|---|
| Order-line editor | repeatable row: product + qty stepper + unit price + subtotal, add / remove; empty state |
| Payment-method selector | segmented (Cash / M-Pesa / Credit) with the Credit → customer-attach branch surfaced |
| Running-total bar | sticky footer showing order total, updates as lines change |
| Customer picker + quick-create | searchable select over customers with an inline "add new" affordance |
| Derived-sales preview card | "since last count on {date}: sold {n}, revenue KES {y}" shown before the attendant confirms |

If Session 1 concludes **no new component is required**, Session 2 is
skipped and M2 is **6 sessions**.

---

## 7. Session sequence

One role per session (`CLAUDE.md`). Frontend model: **screenshot the
approved Paper artboard, assemble kit components into the real route to
match it, then wire to the already-built domain.** No `get_jsx` skeleton
export, no `/design-preview` route, no `fixtures.ts` mock layer — the
backend exists before the frontend session, so there is nothing to mock.

| # | Session | Role | Scope | Done when |
|---|---|---|---|---|
| 1 | Design Sprint | Product Designer | All M2 screens (C1–C6, A1–A4, K1–K2) in Paper from the approved kit; 3 flow docs; the confirmed new-component list with a one-line spec each. (§3.8 resolved 2026-08-29: BLOCK.) Split 1a/1b only if context runs out. | Screens approved in Paper; flow docs written; new-component list final; no real logic written. |
| 2 | Kit Sprint | Developer (kit) | Design each new component's states in Paper, then build in `components/kit/*`: §9 contract, Storybook story per state, visual-regression baselines, `axe` + `postVisit` gates. **No screens.** *(Skipped if Session 1 finds none.)* | New components merged; `test:visual` + `test:a11y` green; kit gallery updated. |
| 3 | Development Sprint | Developer | Money ledger (`recordMoneyMovement`, `getAccountBalances`) + `lib/domain/customers` + customer/repayment routes + tests. **DONE 2026-08-29** — `MoneySourceType` migration applied (`db push`); `recordDebt(tx)` helper added for S4; overpayment allowed (flagged); `pnpm test` 268/268. | Balances derive from rows; repayment writes a money movement; tests green; `tsc` + `build` clean. |
| 4 | Development Sprint | Developer | `lib/domain/sales` orders — create / edit-own / correct / list; order routes; tests (see §4). | All order paths + correction reversal + role isolation tested green. |
| 5 | Development Sprint | Developer | `lib/domain/sales` canteen slice — `recordStockCount` + derivation + revenue movement; routes; tests. | Derivation matches a hand-worked ledger across a period boundary; tests green. |
| 6 | Development Sprint | Developer | Assemble **all** M2 screens into their real routes from the Paper screenshots; wire to `lib/domain`; `use-orders.ts` / `use-customers.ts` hooks; per-screen jsdom+RTL specs. **No UI decisions** — flag and stop if one surfaces. Then the **owner walkthrough** of each feature (guardrail 3). Split Cashier / (Admin+Canteen) only if running hot. | Every screen live on real data; screen specs green; owner has walked each feature as every relevant role on `pnpm dev`. |
| 7 | QA Sprint | QA Engineer | Adversarial pass against every M2 acceptance criterion, the 3 flow docs, the approved screens. Report before fixing. | Findings report delivered; fixes applied with regression tests; full suite + `tsc` + `build` + kit gates green; PROGRESS + ROADMAP updated. |

**Count: 7 sessions** (6 if Session 2 is not needed).

### Allowed concurrency

The M2 domain contracts are fully settled by the PRD, the M1 ADRs, and
the existing Prisma schema (§2) — Session 1 shapes screens, not the API
surface — and §3.8 is resolved. So sessions may overlap:

- **Session 1 ‖ Session 3** — disjoint files (S1: `docs/design/**` +
  Paper; S3: `lib/domain/{financials,customers}` + `app/api/customers*`
  + tests + the `SCHEMA.md`/`API.md` sections it owns). No decision
  dependency.
- **Session 4 ‖ Session 5** — both start once S3 has landed.
- **Session 2** (only if S1 finds a new component) runs after S1 and may
  overlap S4/S5.

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
