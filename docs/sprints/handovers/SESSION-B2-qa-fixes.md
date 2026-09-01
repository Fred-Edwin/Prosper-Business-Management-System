# HANDOVER — Session B2 · M2 Session 7 QA — apply the cleared fix set

**Paste this whole file as your first message in a fresh session** (or, if
your Session B is still open, continue there — same branch
`qa/m2-session-7`, on top of commit `76c14cb`).

You are still the **QA Engineer**. The findings report
(`docs/sprints/milestone-2-session-7-qa-report.md`) is delivered. The
orchestrator has reviewed it and cleared a specific fix set. Apply
**exactly** this set — nothing more. Every code fix gets a regression test
that fails before the fix and passes after.

## Context / urgency

Project is overdue, pushing Submission 1 = Milestone 1 + Milestone 2
("staff can sell every day"), every screen matching Paper. Your QA pass
found **0 High** — ledgers are provably correct. These fixes close the
operational gaps that would embarrass us in front of the client. Move
efficiently; keep fixes minimal and targeted; don't refactor for taste.

## Re-read before touching code (CLAUDE.md requirement)

- `docs/sprints/milestone-2-plan.md` §3 (cross-cutting contracts), §8
  (guardrails — note **no app-level Playwright/e2e**; jsdom+RTL screen
  specs are the gate).
- `docs/CONVENTIONS.md` — error shape, correction-entry pattern, §6.
- `docs/DECISIONS.md` — ADR-15, ADR-16, ADR-17, ADR-19, ADR-25, ADR-29.
- Your own report §1 (the findings) and §4 (recommended fix order).
- `docs/design/flows/restaurant-sales-flow.md` §F,
  `docs/design/flows/canteen-derived-sales-flow.md` (K1 states +
  period-boundary + walkthroughs C/C2/C3).

## The cleared fix set — apply all seven (F7-2 added by owner)

### FIX 1 — F7-1 · C4 edit form: credit-order payment-method change
**File:** `app/cashier/orders/[id]/order-detail-client.tsx` (`EditableOrder.save()`).
- Send `customerId` in the request body **only when the currently selected
  payment method is `credit`** — not based on `order.customerId`.
- Add C3-parity gating: when selected method is `credit` and no customer
  is attached, **disable "Save changes"** with a caption (mirror
  `new-order-client.tsx` `confirmDisabled = … || (isCredit && !customer)`).
  Minimal fix = the conditional `customerId` + the disabled-Save caption;
  do **not** build a full C5 attach sheet into the edit form for M2.
- **Regression test** (`tests/screens/cashier-orders.screen.test.tsx`):
  editing a same-day credit order to Cash saves successfully; editing a
  cash order to Credit disables Save until a customer is attached.

### FIX 2 — F7-6 · A3 cashier shown as UUID fragment
**File:** `app/admin/orders/admin-orders-client.tsx`.
- Use `drawerOrder.cashierName` (added by G1, Session 6e) in the drawer
  subtitle (~L380) and anywhere `cashierLabel(id)` renders a name. Keep
  `cashierLabel` only as a fallback if `cashierName` is ever absent, or
  drop it.
- **Regression test** (`tests/screens/admin-orders.screen.test.tsx`): the
  detail drawer subtitle for a correction shows the cashier's **name**,
  not a hex fragment.

### FIX 3 — F7-5 · A3 correction impact banner mis-labels / mis-computes
**File:** `admin-orders-client.tsx` (`CorrectionForm`, `impactText` ~L602–635).
- Label the money delta line **"Debt: …"** for a **credit** order (not
  "Money: Credit −KES …").
- Fold `deliveryFee` into the `correctedTotal` used for the preview delta.
- Compute the preview delta from the **same quantities the request will
  send** (not always `original.total`).
- **Regression test**: banner text for a credit-order correction contains
  "Debt"; a fee-only change previews a non-zero money/debt delta.

### FIX 4 — F7-3 · canteen count undo has no UI entry point
The domain (`voidStockCount`) and `DELETE /api/canteen/stock-counts/:id`
are built + tested. Wire them:
- Add a **"Delete today's count"** affordance on the **Canteen hub**
  (`app/canteen/hub-client.tsx`) — a row/action, visible only when
  today's `derivedSale.stockCountId` is present (G4 exposes it via
  `useDerivedSales`). On confirm → call the `voidStockCount` action from
  `app/canteen/use-stock-count.ts` → toast → refetch.
  - Use the kit confirm dialog / `BottomSheet` pattern already used
    elsewhere in the canteen screens; do not invent a control.
- On **K1's blocked ("counted more than expected") state**
  (`app/canteen/stock-count/stock-count-client.tsx`): replace the raw
  danger toast with the **§9.8 inline field error** carrying the server's
  exact message, plus an `InstructionalBanner` (kit) explaining a likely
  missing transfer, and keep **Confirm disabled**. (Full 9-state K1
  rebuild is NOT in scope — just the blocked-state treatment + the delete
  path.)
- **Regression tests**
  (`tests/screens/canteen-hub.screen.test.tsx` +
  `tests/screens/canteen-stock-count.screen.test.tsx`): hub shows "Delete
  today's count" only when a count exists for today and invoking it calls
  the void action; K1 blocked state renders an inline error (not just a
  toast) and a disabled Confirm.

### FIX 5 — F7-10 · ADR note only, NO code change
**File:** `docs/DECISIONS.md`.
- Add a short ADR-style note: `editOwnOrder` hard-deletes the `AuditLog`
  rows for the `MoneyMovement` rows it replaces during a same-day edit;
  this is the one place M2 deletes rather than appends an audit row. It is
  acceptable because (a) the money movements themselves no longer exist,
  and (b) the edit event is still audited by a fresh `action: "correct"`
  row on the order with old/new summaries. Record it so the exception is
  explicit against "never overwrite history".

### FIX 6 — C4 corrected-banner: add `correctedAt` + `correctedByName`
**Files:** `lib/domain/sales/types.ts` (`OrderView`), the `toOrderView`
mapper in `lib/domain/sales/internal.ts`, the list/get queries, and
`app/cashier/orders/[id]/order-detail-client.tsx` (the corrected banner).
- Add `correctedAt: string | null` and `correctedByName: string | null`
  to `OrderView`.
- Source them from the correction's **`AuditLog`** row for that order
  (`action: "correct"`, `entityType: "order"`, matching entity id):
  `correctedAt` = that row's `createdAt`; `correctedByName` = the acting
  user's name (join `AuditLog.userId` → `User.name`). If a corrected order
  has no such audit row (shouldn't happen), leave both `null` and keep the
  current date-only fallback.
- Wire into the C4 corrected banner so it reads like `D18-0`
  ("Corrected on {date} by {name} (Admin)").
- **Regression test** (`lib/domain/sales/*.test.ts` +
  `tests/screens/cashier-orders.screen.test.tsx`): a corrected order's
  `OrderView` carries `correctedByName` = the admin who ran the
  correction; the C4 banner renders that name.

### FIX 7 — F7-2 · K1 stock-count sold/revenue preview (NOW IN SCOPE)

The K1 counting screen must show derived **units sold** + **revenue**
*before* the attendant confirms (`canteen-derived-sales-flow.md` rule 2 +
the "count entered + preview" / first-count artboards `H8J-0` / `HA3-0`).

**Backend (your scope):**
- Add a **dry-run / preview** function in `lib/domain/sales` that runs the
  *exact same* derivation as `recordStockCount`
  (`sold = opening + received (transfers + production) − non-sale
  consumption − counted remaining`, over the period since that product's
  last count) but **persists nothing** — no `StockCount`, no `sale`
  `StockMovement`, no `MoneyMovement`, no `AuditLog`. Returns
  `{ periodStart, lastCountedAt, daysSincePrevious, unitsSold, revenue,
  closingStockWillBe, isFirstCount }`.
- **Factor the shared calculation out** so `recordStockCount` and the
  preview call the *same* function — do not copy-paste the math (a
  preview/commit divergence is the exact bug we're avoiding).
- Expose as **`GET /api/canteen/stock-counts/preview?productId=…&countedRemaining=…`**
  (or `POST …/preview`). Role-scoped identically to `recordStockCount`
  (`canteen_attendant` own location + `admin`). Thin handler:
  parse → Zod → auth → domain → respond.
- **Tests:**
  - preview result **equals** what `recordStockCount` then produces for
    the same inputs, across a period boundary (transfers-in + production +
    non-sale between two counts) — to the cent.
  - preview writes **nothing** (`StockCount` / `StockMovement` /
    `MoneyMovement` / `AuditLog` row counts unchanged after the call).
  - first-ever-count path → `isFirstCount: true` + correct fields.
  - "counted more than expected" → preview returns the same
    rejection/validation signal `recordStockCount` would (screen shows the
    blocked state without a write).

**Screen (minimum to consume it — full K1 visual polish stays with build
batch 3d):**
- In `app/canteen/stock-count/stock-count-client.tsx` counting screen,
  call the preview endpoint (debounced) on counted-value change; render
  real figures in `CalculatedImpactBanner`: *"Since last count on {date}
  ({n} days): sold {unitsSold} {unit}. Revenue KES {revenue}. Closing
  stock will be set to {countedRemaining} {unit}."* First-count copy
  variant per `HA3-0`.
- Delete the obsolete dead code (`previousCount`, `previousQty`,
  `unitsSold`, `previousQty = todayCount.unitsSold`) — the endpoint is the
  source of truth now.
- **Regression test** (`canteen-stock-count.screen.test.tsx`): entering a
  count shows a sold figure + a revenue figure (mock the endpoint);
  changing the count updates them.

---

## Explicitly OUT of scope for this session (note in the report, do NOT fix)

- **F7-4** — A3 full corrected-order form (payment/type/fee/add-line).
  Routed to build batch 3a. Leave `CorrectionForm` quantity-only.
- **F7-7** — K2 hub row revenue styling. Routed to build batch 3d (needs
  revenue in the hub feed).
- **F7-8** — inert A3 Cashier/Payment filter chips. Routed to build
  batch 3a.
- **F7-9** — `/api/canteen/products` route-purity. Tech-debt backlog.

## Finish

1. Update `docs/sprints/milestone-2-session-7-qa-report.md` §4 with the
   disposition of each finding (fixed here / routed to 3a / routed to 3d /
   deferred) and §5 gate status.
2. Gates: `pnpm test` (should be 426 + your new regression tests),
   `pnpm tsc --noEmit` 0, `pnpm build` clean. If any `components/kit/**`
   file changed (it shouldn't) run `pnpm test:visual` + `pnpm test:a11y`.
3. One additional commit on `qa/m2-session-7`. **Do not merge to `main`**
   — the orchestrator sequences the final PR.
4. Summary for the human → orchestrator: fixes applied, new test count,
   gate status, and the updated §4 dispositions.

## Do NOT
- Add app-level Playwright/e2e.
- Fix anything outside the six-item set above.
- Touch `components/kit/*` unless a kit bug is unavoidable (escalate).
- Merge to `main`. Work on Milestone 3.
