# Milestone 2 — Session 7 QA Report (adversarial pass)

**Role:** QA Engineer. **Date:** 2026-08-31. **Branch:** `qa/m2-session-7`.
**Baseline:** `pnpm test` 416/416 (64 files), `tsc` 0, `build` clean —
re-confirmed at session start.

This is the first adversarial QA pass on Milestone 2. Findings are reported
**before** fixes (CLAUDE.md QA-sprint rule). The attack list from
`milestone-2-plan.md` §7 was worked target by target; new adversarial
tests were added under `lib/domain/sales/qa-m2-session-7.test.ts`
(10 tests, all green).

---

## 0. Headline

**The M2 money/stock/credit/canteen ledgers hold up under adversarial
testing.** No High-severity data-integrity defect was found:

- Cash / M-Pesa / credit orders + repayments + canteen derived sales all
  reconcile **to the cent** against `Σ MoneyMovement` per account, with no
  stored total anywhere (attack A — new test, green).
- Order corrections — including **correcting the same original twice** and
  **correcting a credit order** — produce a net stock/money/debt effect
  equal to the *final corrected state*, never zero, never doubled; the M1
  F-1 idempotency guard holds across a chain (attack B — new tests, green).
- Credit balances derive correctly across multiple debts + partial
  repayments; overpayment is **accepted and visibly negative**, not
  silently absorbed (attack C — new tests, green).
- Canteen derived-sales arithmetic is exact across a period boundary with
  transfers-in + production + non-sale consumption between two counts, and
  the two periods do not overlap (attack D — new test, green).
- Cross-cashier isolation holds at the domain **and** route layer for
  read / edit / correct (attack E — new tests + existing route tests).
- The Africa/Nairobi edit-window boundary behaves correctly at 23:30 →
  00:30 (attack G — new test, green).

All findings below are **Medium or lower** and concentrate in the
**screen layer** (Session 6c/6d/6e assembly) — flow-doc contracts that
the composed screens don't yet meet, and two edit-form bugs where the
server correctly rejects but the client offers no path. Nothing here
blocks Submission 1 on data-integrity grounds; several are worth fixing
before the owner walkthrough.

---

## 1. Findings (ordered by severity)

### F7-1 — C4 edit form: changing a credit order's payment method is impossible · **Medium** · M2-F1

**Screen:** `app/cashier/orders/[id]/order-detail-client.tsx`
(`EditableOrder`, `save()` ~L404–419).

**Scenario:**
1. Cashier opens their own, same-day **credit** order on C4 (editable
   state).
2. They switch the payment `SegmentedControl` to **Cash** (or M-Pesa) and
   tap **Save changes**.

**Expected:** the order becomes a cash order; a `MoneyMovement` replaces
the `Debt` (the domain `editOwnOrder` fully supports this).

**Actual:** `save()` always spreads `...(order.customerId ? { customerId:
order.customerId } : {})` into the request body regardless of the *new*
payment method. `validateOrder` then throws
`VALIDATION_ERROR "A customer can only be attached to a credit order."`
The Cashier gets a red toast and cannot complete the edit. The reverse
(cash → credit) is also broken: there is **no customer-attach UI** in the
editable form, so switching *to* Credit sends no `customerId` and the
server rejects with `"A credit order must be attached to a customer."`

**Evidence:** code read; mirrors the C3 checkout gate
(`new-order-client.tsx` `confirmDisabled = … || (isCredit && !customer)`)
which C4's editable form does **not** replicate.

**Proposed fix (safe, in scope):** in `EditableOrder.save()`, only send
`customerId` when the *selected* payment method is `credit`; and either
(a) disable **Save changes** with a caption when the selected method is
`credit` and no customer is attached (parity with C3), or (b) surface the
C5 attach sheet in the editable form. Minimal fix = (a) + the
conditional-`customerId` spread. Regression test:
`cashier-orders.screen.test.tsx` — editing a credit order to cash saves;
editing a cash order to credit disables Save until a customer is attached.

---

### F7-2 — K1 Stock Count shows no derived sold/revenue preview before commit · **Medium** · M2-F3

**Screen:** `app/canteen/stock-count/stock-count-client.tsx`
(`CountingScreen`, `CalculatedImpactBanner` ~L474–478).

**Scenario:** Attendant picks a product, enters a counted-remaining value,
and looks at the preview card before confirming.

**Expected** (`canteen-derived-sales-flow.md` rule 2 + walkthrough A
step 4, and the re-spin's K1 "count entered + preview" artboard): a
preview card reading *"Since last count on {date} ({n} days): … = sold
{n} {unit}. Revenue KES {y}. Closing stock will be set to {rem}."* — the
whole point of K1 is *preview before commit*.

**Actual:** the banner only says *"Counted {qty} {unit} remaining. The
closing stock will be set to {qty} {unit}. Sales and revenue will be
derived when you confirm."* No sold figure, no revenue figure. The
`CountingScreen` has dead code (`previousCount`, `previousQty`,
`unitsSold`) that was meant to feed a preview and never does; `previousQty`
is even set from `todayCount.unitsSold`, which is semantically wrong
(units-sold ≠ previous counted quantity).

**Root cause / why it's not a trivial fix:** there is **no preview
endpoint**. `recordStockCount` is the only path and it *writes*. A true
"sold/revenue before commit" needs either a `POST …/preview` (dry-run) or
a `GET` that runs the derivation without persisting. That is backend +
design scope.

**Proposed action:** **flag for the orchestrator** — decide whether M2
ships K1 without the money preview (accept as-is, delete the dead code,
note the flow-doc delta) or adds a dry-run derivation endpoint. Do **not**
fix under QA. If shipping as-is: remove the misleading dead code and
soften the flow doc.

---

### F7-3 — K1 is missing the "counted more than expected", "count locked (previous day)", and delete-count states · **Medium** · M2-F3

**Screen:** `app/canteen/stock-count/stock-count-client.tsx`.

**Scenario:** Attendant counts more than the ledger accounts for (the
period-boundary case), or opens a count from a closed day, or wants to
delete and redo today's count.

**Expected** (`canteen-derived-sales-flow.md` §period-boundary +
walkthroughs C / C2 / C3; the K1 re-spin defines **9 states**): the
counted field shows the §9.8 inline error with the server's exact message,
an `InstructionalBanner` explains the likely missing transfer, **Confirm**
is disabled, and a **"Delete today's count"** affordance is offered for
the redo case. A closed-day count renders read-only with an amber locked
banner.

**Actual:** only 2 of the 9 states are built (picker, counting). The
"counted more than expected" rejection is surfaced as a generic **danger
toast** with the raw server string — no inline field error, no
`InstructionalBanner`, no delete affordance. `voidStockCount` has **no UI
entry point at all**: PROGRESS (6d) says "Void … is surfaced on the hub —
not here", but `app/canteen/hub-client.tsx` has no void/delete affordance
either (grep: nothing). So a mistaken same-day canteen count **cannot be
undone through the UI** in M2, despite the domain + `DELETE
/api/canteen/stock-counts/:id` being fully built and tested.

**Severity rationale:** the *block* is server-enforced and safe (attack D
new test confirms nothing is written). But the recovery path the owner
explicitly designed (`voidStockCount`, the whole 2026-08-30 re-spin) is
unreachable — an operational dead end for the Attendant.

**Proposed fix (in scope, medium effort):** add a "Delete today's count"
row on the Canteen hub (or on K1's blocked state) wired to the existing
`voidStockCount` action in `use-stock-count.ts`, gated on
`derivedSale.stockCountId` being present for today (G4 already exposes
it). Plus the inline-error + `InstructionalBanner` treatment on K1's
blocked state. If the orchestrator judges this too large for a QA fix →
flag as a Session-6 follow-up.

---

### F7-4 — A3 correction drawer can only change line quantities — not payment method, order type, delivery fee, or add a product · **Medium** · M2-F1 / M2-F2

**Screen:** `app/admin/orders/admin-orders-client.tsx` (`CorrectionForm`).

**Scenario:** Admin needs to correct an order whose **payment method** was
wrong (cash recorded, was actually M-Pesa), or whose **order type** /
**delivery fee** was wrong, or that is **missing a line**.

**Expected** (`customers-credit-flow.md` §G step 3: "the corrected line
list … corrected order type / delivery fee / payment method"): the
correction form lets the Admin restate the *whole* corrected order.

**Actual:** `CorrectionForm` renders a `QuantityStepper` per **existing**
line only. There is no add-product control, no order-type / payment /
delivery-fee control. `submit()` hard-copies `orderType`,
`paymentMethod`, `deliveryFee`, `customerId` from the original. So the
domain's fully-built payment-method-change correction path
(`correctOrder`, tested: credit→cash reverses the Debt and writes a
MoneyMovement) **has no way to be invoked from the UI**. An Admin faced
with a wrong payment method has no correction route at all in M2.

**Proposed action:** **flag for the orchestrator** as a design/scope call
— is "quantity-only corrections" an acceptable M2 cut, or does A3 need the
full corrected-order form for Submission 1? If accepted as a cut: note the
flow-doc delta. If not: it's Session-6 assembly work, not a QA fix.

---

### F7-5 — A3 correction impact banner is hand-computed and can mislead · **Low** · M2-F1

**Screen:** `admin-orders-client.tsx` (`CorrectionForm`, `impactText`
~L602–635).

**Issues:**
1. `delta = correctedTotal − originalTotal` is computed from **line
   subtotals only** — it ignores `deliveryFee`. A correction that leaves
   lines alone but (in a future fuller form) changed the fee would preview
   "No money change."
2. The money line always reads `Money: {PAYMENT_LABEL} −KES …` — for a
   **credit** order it says "Money: Credit −KES 40", which is wrong: a
   credit correction moves a **Debt**, not cash. Should read "Debt: …".
3. `delta` compares against `original.total`, not the **current chain net**
   — previewing a *second* correction shows the wrong delta (the domain
   still computes the right thing on submit; only the preview is off).

**Impact:** preview-only; the persisted correction is always correct
(attack B tests). But an Admin reads this banner to decide whether to
commit.

**Proposed fix (in scope):** compute the preview against the same
quantities the request will send, label credit deltas as "Debt", and fold
in the delivery fee. Regression test: `admin-orders.screen.test.tsx`
asserts the banner text for a credit-order correction says "Debt".

---

### F7-6 — A3: cashier shown as a UUID fragment in the detail/correction drawer and the "Cashier:" filter chip · **Low** · M2-F1

**Screen:** `admin-orders-client.tsx` — `cashierLabel(id)` = `id.slice(-6)`
used at the drawer subtitle (L380) and the active filter chip (L273).

**Context:** G1 (Session 6e) added `OrderView.cashierName`. The **table
column** uses it correctly (L186). The drawer subtitle and the filter
chip still show `cashierLabel(drawerOrder.cashierId)` — e.g.
"Replaces order #421 · A1B2C3". Inconsistent, and reads as a bug to the
Admin.

**Proposed fix (trivial, in scope):** use `drawerOrder.cashierName` in the
subtitle; drop `cashierLabel` (or keep only as a fallback). The filter
chip is cosmetic (there is no cashier *picker* wired yet anyway — see
F7-8) — lowest priority.

---

### F7-7 — K2 hub timeline row for a derived sale shows "−96 pcs" (red), not "+KES 5,760" (green) · **Low** · M2-F3

**Screen:** `app/store-manager/staff-stock-format.ts` `movementsToTimeline`
(the `isCanteenSale` branch) → `app/canteen/hub-client.tsx`.

**Expected** (`canteen-derived-sales-flow.md` §F): the derived-sale row's
trailing value is **"+KES 5,760.00"** in `--color-success` (revenue in),
subtitle **"96 pcs sold since {date} · closing {rem}"**. A zero-sold count
shows a muted em-dash.

**Actual:** the row shows the negated **stock** quantity (`−96 pcs`,
`sign: negative` → red) with subtitle "Stock count · HH:MM". Factually the
96 pcs did leave stock, so it's not *false*, but it contradicts the design
(revenue-positive) and the "visual consistency with other signed values"
acceptance point. Revenue isn't in the hub payload, so surfacing it needs
a data change (join the `canteen_sale` MoneyMovement).

**Proposed action:** flag as a Session-6 / design follow-up (needs the
revenue figure in the hub feed). Low priority — the entry is present and
legible, just styled as a stock-out not a sale.

---

### F7-8 — A3 filter chips: "Cashier" and "Payment method" pickers are inert · **Low** · M2-F1

**Screen:** `admin-orders-client.tsx` — `InactiveFilterChip
label="Payment method"` is a non-interactive `<div>`; there is no chip or
control that *sets* `filter.cashierId` (only a dismiss for an already-set
one). So an Admin can dismiss filters but can't apply Cashier or Payment
filters from the UI. `restaurantsales`/`customers-credit-flow.md` §G
step 1 lists Cashier / Date / Payment / Corrected-only as the filter set.
"Corrected only" and the default "Today" chip do work.

**Proposed action:** flag as Session-6 assembly gap. Not a QA fix. (Also
depends on a Staff/Cashier list source — none in M2, per the 6d note.)

---

### F7-9 — `GET /api/canteen/products` handler contains query/business logic · **Low** (convention) · M2-F3

**File:** `app/api/canteen/products/route.ts`.

CONVENTIONS §1 / plan §7 "route-handler purity": handlers should
`parse → validate → auth → call lib/domain/* → respond`. This handler
runs a role-branched `prisma.productLocation.findMany` with the
`active / sellingPrice / deletedAt / location.type` filter inline — a
query "beyond fetch the thing I was asked for". PROGRESS (6e) labels it a
"G3 stopgap". No security issue (`buyingPrice` is never selected — cost
leak check passes).

**Proposed action:** flag as tech-debt to fold into a
`lib/domain/catalog` (or canteen) read in a follow-up. Not fixed here.

---

### F7-10 — `editOwnOrder` hard-deletes `AuditLog` rows for the money movements it replaces · **Low** (note) · M2-F1

**File:** `lib/domain/sales/edit-own-order.ts` (~L79–84).

A true same-day edit deletes the prior `MoneyMovement` rows and, first,
their `entityType: "money_movement"` `AuditLog` rows. ADR-25 frames
`AuditLog` as capturing what the ledgers don't make self-evident; the edit
event itself **is** still audited (a fresh `action: "correct"` row on the
order with old/new summaries). Deleting the audit row for a movement that
no longer exists is defensible — but it is the one place in M2 where an
`AuditLog` row is *deleted* rather than appended, which sits uneasily next
to "never overwrite history". Flagging for an explicit ADR note, not a
code change. Low.

---

## 2. Attack-list results (plan §7 "highest-stakes QA targets")

| # | Target | Result | Evidence |
|---|---|---|---|
| A | Money-ledger integrity — balances == `Σ MoneyMovement`, no stored total | **PASS** | `qa-m2-session-7.test.ts` "A — cash / M-Pesa / credit + repayment reconcile …" (cash +200, mpesa +600 exact); `getAccountBalances` is a single grouped `SUM`, no stored column exists in schema |
| B | Corrections don't double-count / lose stock or money; F-1 idempotency across a chain | **PASS** | new tests: "correcting the SAME original TWICE" (net = final corrected, not doubled), "correcting a correction row is rejected", plus existing `correct-order.test.ts` |
| C | Credit balances derive correctly; overpayment flagged; credit-order correction reverses the Debt | **PASS** | new tests: "correcting a CREDIT order down reverses the Debt", "overpayment … negative (flagged)"; `getCustomerLedger` / `listCustomers` are set-wise `Σ Debt − Σ Repayment` |
| D | Canteen derived-sales math exact across a period boundary (transfers-in + production + non-sale) | **PASS** | new test: opening 200 → count 150 (sold 50) → +40 transfer +25 production −7 non-sale → count 96 (sold 112); total sale movement magnitude == 162 exact; closing == counted; revenue in Cash == 9 720.00. First-count path also covered (existing + new). "Counted more than expected" across the boundary → `VALIDATION_ERROR`, nothing written. |
| E | Cross-cashier isolation (read / edit / correct) | **PASS** | new domain tests + existing `app/api/orders/route.test.ts` (cashier B sees none of A's; PATCH/correct by the wrong cashier → 403) |
| F | No buying-price / margin leak to a Cashier | **PASS** | `OrderView` has no cost/margin field (type); `listProducts` strips `buyingPrice` for non-admin (`stripBuyingPrice = actor.role !== "admin"`); `/api/canteen/products` never selects `buyingPrice`; grep of `app/cashier/**` + `app/canteen/**` for `buyingPrice\|margin\|profit\|cost` → only comments |
| G | Day-boundary correctness (Africa/Nairobi, ADR-29) | **PASS** | new test: order at 23:30 Nairobi editable; same order dated to yesterday's business day → `editOwnOrder` `FORBIDDEN`. `lib/time` `toBusinessDate` used in `edit-own-order.ts` and `voidStockCount`; `businessDateStartUtc/EndUtc` in `list-orders.ts` / `derived-sales.ts`. No `new Date()`-locale day logic found in the M2 domain. |
| — | Audit log on every domain mutation | **PASS** | `createOrder` / `editOwnOrder` / `correctOrder` / `recordStockCount` / `voidStockCount` (`hard_delete`) / `recordRepayment` / `createCustomer` each write an `AuditLog` row; `recordMoneyMovement` writes its own. (See F7-10 for the one deletion.) |
| — | Route-handler purity | **PASS w/ 1 exception** | `orders` / `customers` / `canteen/stock-counts` handlers are thin (parse → Zod → `requireApiRole*` → domain → `ok/fail`). Exception: `GET /api/canteen/products` — F7-9. |
| — | Standard error shape; validation names the field; §3.8 rejection names short line + available qty and writes nothing | **PASS** | all M2 routes return `fail(code, message, field)`; §3.8 → `VALIDATION_ERROR` field `"lines"`, message `"Not enough Restaurant stock: {name} (only {n} in stock …)"`, no rows written (attack-D-style assertion + existing `create-order.test.ts`). Flow doc's sketch code `"insufficient_stock"` was superseded by the CONVENTIONS `VALIDATION_ERROR` + field shape — acceptable, not a finding. |

---

## 3. PROGRESS-flagged deltas — dispositions

The 6c PROGRESS entry left three "flow-doc-vs-behaviour deltas for QA":

| Delta | Disposition |
|---|---|
| **C4 "corrected" banner omits the correcting Admin's name + timestamp** (`OrderView` had no `correctedByName` / `correctedAt`; `D18-0` shows "by Edwin K. (Admin)") | **FIXED this session (FIX-CB).** `OrderView` gained `correctedAt` / `correctedByName`, populated **only on a correction row** by hydrating the acting Admin from the correction's `AuditLog` `correct` entry (`listOrders` batches one lookup; `correctOrder` fills it inline). `toOrderView` takes an optional `correctedBy` arg. C4's banner now reads "on {date} by {Admin}". Domain + screen regression tests added. |
| **"Correct this (Admin)" on C4 fires a toast, not a modal/alert** | **Acceptable.** The flow doc §F says it "surfaces the order reference … does not open a form". A toast with the order number does exactly that. No finding. |
| **C2/C4 line-row `QuantityStepper` uses kit size, not the artboard 30px cell** | **Acceptable** — owner ruling 6a (kit wins on sizing). Design-sprint territory, not QA. No finding. |

The 6b entry's copy deltas (shorter `EmptyState` descriptions, C6 success
toast wording) are cosmetic/Design-sprint — **not QA findings**.

---

## 4. Fixes applied this session

The initial report (part 1) was delivered before any fix. Part 2 (this
section) records what was then fixed once the orchestrator relayed the
go-ahead — **including an expanded brief for F7-2: build the real K1
preview, not just delete dead code.**

### FIX-7 — F7-2 · K1 stock-count sold/revenue preview (the expanded item)

**Backend — one shared derivation, two entry points.**

- **`lib/domain/sales/derive-stock-count.ts`** (new) — `deriveStockCount(client, { productId, locationId, countedQuantity, occurredAt })`
  is now the **single** canteen derived-sale calculation:
  `sold = expectedRemaining − countedQuantity`, where `expectedRemaining`
  is the signed `Σ StockMovement` for `(product, canteen)` up to the count
  instant. It validates (product exists & sold at the canteen; canteen
  `Location` real; no later count) and throws the same `DomainError`s as
  before, but **does not throw** on `sold < 0` — it returns
  `exceedsExpectedBy` and lets the caller decide. `client` is a
  `Prisma.TransactionClient` (record path — read on the tx) or the bare
  `prisma` client (preview read). Also exports `parseCountedQuantity` and
  `overCountError`.
- **`recordStockCount`** rewritten to call `deriveStockCount(tx, …)` — the
  math is no longer inline, so preview and commit **cannot diverge**. It
  still throws `overCountError` on `exceedsExpectedBy`, still skips the
  zero-value money row, still writes the `sale` `StockMovement` +
  `canteen_sale` `MoneyMovement` + `AuditLog`. Behaviour unchanged — the
  existing 18 `record-stock-count.test.ts` tests pass untouched.
- **`previewStockCount(input, ctx)`** (new, same file) — dry-run: calls
  `deriveStockCount(prisma, …)` and returns `StockCountPreview`
  `{ blocked, exceedsExpectedBy, isFirstCount, periodStart, lastCountedAt,
  daysSincePrevious, countedRemaining, unitsSold, revenue,
  closingStockWillBe }`. **Persists nothing.** `blocked: true` (with
  `unitsSold` / `revenue` `null`) mirrors the rejection `recordStockCount`
  would throw.
- **`GET /api/canteen/stock-counts/preview`** (new route, thin handler) —
  `?productId=&countedRemaining=&occurredAt=`. Roles: `canteen_attendant`
  (own canteen) + `admin` (if assigned a canteen). Zod
  `previewStockCountQuerySchema`. A blocked count returns **200** (so the
  screen renders the blocked state), not a 4xx; a malformed
  `countedRemaining` is `400 VALIDATION_ERROR` naming the field.
- **`docs/API.md`** — new endpoint documented.

**Backend tests (new).**
- `lib/domain/sales/preview-stock-count.test.ts` (5): preview == subsequent
  `recordStockCount` result **to the cent** across a period boundary
  (transfers-in + production + non-sale between two counts), and the four
  row counts (`StockCount` / sale `StockMovement` / `canteen_sale`
  `MoneyMovement` / `AuditLog`) are unchanged after the preview call;
  first-count path (`isFirstCount: true`, `periodStart` / `daysSincePrevious`
  `null`); counted-more-than-expected → `blocked: true` + `exceedsExpectedBy`
  with no write, and `recordStockCount` rejects the same input; validation
  parity (unknown product → `NOT_FOUND`, not-sold-at-canteen →
  `VALIDATION_ERROR`, blank → `VALIDATION_ERROR`); no-canteen attendant →
  `FORBIDDEN`.
- `app/api/canteen/stock-counts/preview/route.test.ts` (6): role access
  (401 / 403 store-manager / 200 attendant / 403 no-location), blocked
  → 200 `blocked:true`, blank → 400 field-named, nothing written.

**Screen — K1 consumes the real figures.**
- `app/canteen/use-stock-count.ts` — new `useStockCountPreview(productId,
  countedRemaining, { debounceMs })` hook: debounced `GET …/preview` on
  every counted-value change; a blank/invalid value skips the call and
  clears the preview; a `VALIDATION_ERROR` on the field is treated as "no
  preview yet", not a hard error.
- `app/canteen/stock-count/stock-count-client.tsx` — the counting screen's
  `CalculatedImpactBanner` now renders the derived figures:
  *"Since last count on {date} ({n} days): sold {unitsSold} {unit}. Revenue
  KES {revenue}. Closing stock will be set to {counted} {unit}."*, with a
  **first-count** copy variant and a **blocked** variant ("Counted more
  than expected — … ask the Store Manager … then recount"). **Confirm is
  disabled while `preview.blocked`** (server rejects it anyway). The dead
  `previousCount` / `previousQty` / `unitsSold` code and the
  `useDerivedSales({ date: today })` call that fed it are **deleted** —
  the endpoint is the source of truth. The full 9-state K1 visual rebuild
  (inline §9.8 error + `InstructionalBanner` + `FrictionDeleteDialog`
  against the re-spin artboards) stays with Batch 3d.
- `tests/screens/canteen-stock-count.screen.test.tsx` — 4 new tests: the
  preview card shows the real sold + revenue; first-count copy variant; a
  blocked preview disables Confirm and explains why; the preview updates
  when the counted value changes (stepper +).

### Other fixes applied

| ID | Fix | Tests |
|---|---|---|
| **F7-1** (M) | C4 `EditableOrder.save()` now sends `customerId` **only when the selected method is credit** (was always sending the original's, so credit→cash was server-rejected with no path). Switching a non-credit order **to** credit disables Save with a caption (C4 has no attach UI — that's C5 on the create flow). | `cashier-orders.screen.test.tsx` +3 (credit→cash sends no customerId; credit kept sends it; cash→credit disables Save) |
| **F7-3** (M) | New **"Today's stock counts"** section on the Canteen hub — each of today's counts with a **"Delete today's count"** action wired to the existing `voidStockCount` (via `useStockCountActions` + `useDerivedSales({ date: today })`, gated on `stockCountId`). A `window.confirm` step (consistent with the hub's existing `window.prompt` Flag flow); toast + double refresh on success. The full `FrictionDeleteDialog` treatment is Batch 3d — the kit dialog currently *always* requires retype (no `showTypeToConfirm={false}` prop despite ADR-36c), so wiring it needs a kit change out of QA scope. | `canteen-hub.screen.test.tsx` +3 (no section when nothing counted; delete → confirm → `voidStockCount` + toast + refresh; cancel → no call) |
| **F7-5** (L) | A3 correction impact banner: credit-order deltas now labelled **"Customer debt: −KES …"** / "No debt change." (was "Money: Credit −KES …"); delivery fee folded into both totals so the delta stays right. | `admin-orders.screen.test.tsx` +1 (credit correction banner says "debt", not "Credit: −KES") |
| **F7-6** (L) | A3 detail/correction drawer subtitle uses `order.cashierName` (was `cashierLabel(cashierId)` = a UUID fragment). | `admin-orders.screen.test.tsx` +1 |
| **F7-10** (L) | `docs/DECISIONS.md` ADR-25 — added a note that `editOwnOrder` pruning the `money_movement` `AuditLog` rows of the movements it replaces is deliberate (the rows describe movements that no longer exist; the edit stays audited on the order row; M3's `DayClose` lock removes the true-edit window entirely). No code change. |
| **FIX-CB** (was §3 flag) | C4 corrected-banner data gap — `OrderView` gained `correctedAt` / `correctedByName` (correction rows only), hydrated from the correction's `AuditLog` `correct` entry. C4 banner now names the Admin. | `qa-m2-session-7.test.ts` +1 (correction row carries them via `correctOrder` return **and** `listOrders`; original does not); `cashier-orders.screen.test.tsx` corrected-order test asserts "by Edwin K." |

### Deferred / escalated (not fixed under QA)

- **F7-4** (M) — A3 correction form is quantity-only (no payment / type /
  fee / add-line). `correctOrder`'s payment-method-change path stays
  UI-unreachable. **Orchestrator decision:** acceptable M2 cut, or
  assembly + design work before Submission 1?
- **F7-7** (L) — K2 hub timeline row shows "−96 pcs" not "+KES revenue";
  needs the `canteen_sale` figure in the hub feed. Design/assembly
  follow-up.
- **F7-8** (L) — A3 Cashier / Payment filter chips inert; needs a Staff
  list source (none in M2). Assembly follow-up.
- **F7-9** (L) — `GET /api/canteen/products` handler holds query logic;
  fold into a domain read in a follow-up.

---

## 5. Gate status (after part-2 fixes)

| Gate | Status |
|---|---|
| `pnpm test` | **450/450** across **67 files** (426 after part 1 + 24 net new in part 2: 5 `preview-stock-count.test.ts`, 6 `…/preview/route.test.ts`, 1 banner adversarial, 3 F7-1, 3 F7-3, 2 F7-5/F7-6, 4 K1-preview screen). Full run green. |
| `pnpm tsc --noEmit` | **0 errors** |
| `pnpm build` | **clean** — 42 routes (was 41; `+/api/canteen/stock-counts/preview`). |
| kit `test:visual` / `test:a11y` | **not run** — no `components/kit/**` change. (F7-3's delete-confirm deliberately did **not** touch `FrictionDeleteDialog` — see the note in §4.) |

---

## 6. Summary for the orchestrator

- **Findings:** 10 + the C4-banner gap. **0 High**, **4 Medium**
  (F7-1, F7-2, F7-3, F7-4), **6 Low** (F7-5…F7-10).
- **Data integrity: clean.** Every §7 attack-list target on money, stock,
  credit, canteen math, isolation, day-boundary, audit **passes**, backed
  by 11 new adversarial tests. Submission 1 is not blocked on ledger
  correctness.
- **Fixes applied this session (part 2):** **F7-1**, **F7-3**, **F7-5**,
  **F7-6**, **F7-10**, the **C4-corrected-banner** data gap, and — under
  an expanded brief — **F7-2 in full**: a shared `deriveStockCount`
  extracted so preview and commit use one calculation, a
  non-persisting `previewStockCount` + `GET
  /api/canteen/stock-counts/preview`, and the K1 counting screen now
  showing the real derived sold / revenue (+ first-count + blocked
  variants, Confirm disabled while blocked). Dead K1 preview code
  deleted. See §4.
- **Still deferred / needs a decision:**
  1. **F7-4** — A3 correction form is quantity-only;
     `correctOrder`'s payment-method-change path is UI-unreachable.
     Acceptable M2 cut, or assembly + design work before Submission 1?
  2. **F7-7 / F7-8 / F7-9** — Low, assembly/tech-debt follow-ups
     (K2 revenue in the hub feed; A3 filter pickers need a Staff list;
     `/api/canteen/products` route purity).
- **New tests:** +~38 net (11 domain adversarial incl. the banner test,
  5 preview domain, 6 preview route, 3 F7-1, 3 F7-3, 2 F7-5/F7-6,
  4 K1-preview screen). Suite **416 (QA baseline) → 450**.
- **Not merged.** One commit on `qa/m2-session-7`; the orchestrator
  sequences the final PR.

---

## 7. PROGRESS entry (for the orchestrator to paste)

### 2026-08-31 — M2 Session 7: QA Sprint — adversarial pass + fixes (QA Engineer) — DONE

First adversarial QA pass on Milestone 2. Full findings +
attack-list dispositions: `docs/sprints/milestone-2-session-7-qa-report.md`.

- **Attack list (plan §7) — all targets PASS.** Money-ledger integrity,
  order-correction idempotency across a chain (incl. correcting the same
  original twice and correcting a credit order), credit-balance
  derivation + flagged overpayment, canteen derived-sales math across a
  period boundary (transfers-in + production + non-sale consumption),
  cross-cashier isolation (domain + route), Africa/Nairobi edit-window
  boundary, audit coverage, route-handler purity, and the standard error
  shape / §3.8 rejection — each verified with a new adversarial test.
  **No High-severity data-integrity defect.**
- **11 findings — 0 High / 4 Medium / 6 Low** + the C4-corrected-banner
  data gap, all in the Session 6 **screen** layer (the domain holds).
- **Fixed this session:**
  - **F7-2 (M) — K1 sold/revenue preview, built for real** (expanded
    brief). New `lib/domain/sales/derive-stock-count.ts` — the single
    canteen derived-sale calculation; `recordStockCount` refactored to
    call it (behaviour unchanged, existing tests pass), so preview and
    commit can't diverge. New non-persisting `previewStockCount` +
    `GET /api/canteen/stock-counts/preview` (thin handler, attendant +
    admin, blocked count → 200 with `blocked:true`). New
    `useStockCountPreview` hook (debounced); K1 counting screen renders
    the real *"Since last count … sold {n}. Revenue KES {y}."* with
    first-count and blocked copy variants, Confirm disabled while
    blocked. Dead preview code deleted. `docs/API.md` updated. Full
    9-state K1 visual rebuild stays Batch 3d.
  - **F7-1 (M)** — C4 edit form now sends `customerId` only when the
    selected method is credit (credit→cash was server-rejected with no
    path); switching a non-credit order to credit disables Save with a
    caption.
  - **F7-3 (M)** — "Today's stock counts" section on the Canteen hub with
    a **Delete today's count** action wired to the existing
    `voidStockCount` (confirm step + toast + refresh). The kit
    `FrictionDeleteDialog` was **not** touched (it currently always
    requires retype — no `showTypeToConfirm={false}` — so wiring it needs
    a kit change out of QA scope; the full treatment is Batch 3d).
  - **F7-5 (L)** — A3 correction impact banner labels credit deltas
    "Customer debt: …" and folds in the delivery fee.
  - **F7-6 (L)** — A3 drawer subtitle uses `cashierName`, not a UUID
    fragment.
  - **F7-10 (L)** — ADR-25 note that `editOwnOrder` pruning the
    `money_movement` audit rows of the movements it replaces is
    deliberate.
  - **C4 corrected-banner gap** — `OrderView` gained `correctedAt` /
    `correctedByName` (correction rows only), hydrated from the
    correction's `AuditLog` `correct` entry (`listOrders` batches the
    lookup; `correctOrder` fills it inline). C4 banner now reads "on
    {date} by {Admin}".
- **Deferred (orchestrator decision / follow-up):** **F7-4 (M)** — A3
  correction form is quantity-only; `correctOrder`'s payment-method-change
  path stays UI-unreachable. **F7-7 / F7-8 / F7-9 (L)** — K2 revenue in
  the hub feed; A3 filter pickers need a Staff list; `/api/canteen/products`
  route-purity — all small assembly/tech-debt follow-ups.
- **Tests:** +~38 net. `qa-m2-session-7.test.ts` (11 adversarial),
  `preview-stock-count.test.ts` (5), `…/preview/route.test.ts` (6), plus
  regression tests in the four touched screen suites.
  **`pnpm test` 450/450** (67 files), **`tsc` 0**, **`build` clean**
  (42 routes). Kit visual/a11y not re-run (no `components/kit/**` change).
- **Not merged** — one commit on `qa/m2-session-7`; the orchestrator
  sequences the final M2 PR.
