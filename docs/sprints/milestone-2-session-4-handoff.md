# M2 Session 4 Handoff — Developer: Restaurant Orders (backend)

**Status: DONE (2026-08-30).** `lib/domain/sales` Restaurant-order slice +
`lib/validation/orders` + `app/api/orders` + tests, all green
(`pnpm test` 350/350 with S5's suites present; `tsc` 0; `build` clean).
Committed on `feat/m2-session-4-orders` (off the S1a HEAD, which carries
S3 + the handoffs; `main` does not yet have S3 — merge order S3 → {S4,
S5}). Ran concurrently with S5, split by file. **See "Session Notes" at
the bottom for what Session 6 needs.** Full write-up:
`docs/PROGRESS.md` → "M2 Session 4".

---

**Original brief below.**

**Status (original):** READY once Session 3 is merged to `main` (it is —
`m2-session-3-financials-customers`). **May run in parallel with Session
5** (Canteen derived sales); both depend only on S3, not on each other,
and touch different files inside `lib/domain/sales`. If you and S5 are
truly concurrent, split the module by file (S4 owns `create-order.ts` /
`edit-own-order.ts` / `correct-order.ts` / `list-orders.ts`; S5 owns
`record-stock-count.ts` / `derived-sales.ts`) and let the second-to-merge
rebase the shared `index.ts` / `types.ts` / `test-helpers.ts`.

**Role:** Developer (Development Sprint — backend only). One role this
session: `lib/domain/sales` + `lib/validation/orders` + `app/api/orders`
+ tests + the doc sections listed in §7. **No UI, no screens, no
`components/**`.** If a screen's need is unclear, that's Session 6's
problem — flag it in PROGRESS, don't design it.

**Milestone plan:** `docs/sprints/milestone-2-plan.md` — read §1, §2, §3
(all of it — esp. #2 order money effect, #3 correction pattern, #4 staff
edit window, #6 role scoping, #7 audit, **#8 insufficient-stock = BLOCK**),
§4 "M2-F1", §7 "Allowed concurrency", §8 guardrails.

---

## 0. What this session delivers

`lib/domain/sales` — the **Restaurant order** slice:

- `createOrder` — validate → compute total → in one transaction write the
  `Order` + `OrderLine[]` + one `sale` `StockMovement` per line + **either**
  a `MoneyMovement` (cash / M-Pesa) **or** a `Debt` (credit).
- `editOwnOrder` — a Cashier's true edit of their **own, same-day** order;
  re-validates and rewrites the lines + movements. After the day rolls →
  a "closed" error routing the user to the correction path.
- `correctOrder` — Admin-only append-only correction: a **new** `Order`
  row (`correctsOrderId` set) with offsetting stock + money/debt rows.
- `listOrders` — role-scoped (Cashier ⇒ own only), no margin fields for a
  non-admin.
- Routes: `POST /api/orders`, `GET /api/orders`, `PATCH /api/orders/:id`,
  `POST /api/orders/:id/correct`.

Plus the `docs/API.md` "Orders (Restaurant)" section and the S4 rows in
`SCHEMA.md` / `PROGRESS.md` / plan §7.

---

## 1. Required reading (before any code)

- **`docs/sprints/milestone-2-plan.md`** — as above. §3.8 (BLOCK) is a
  hard contract: an order with any line whose quantity exceeds the current
  derived Restaurant balance for that product is **rejected** — no `Order`,
  `OrderLine`, `StockMovement`, or `MoneyMovement` row is written, and the
  balance is never allowed to go negative.
- **`docs/sprints/milestone-2-session-3-handoff.md`** — "Session Notes" →
  **"For Session 4"**. The money seam and the `recordDebt` helper are
  spelled out there. Read it.
- **`docs/DECISIONS.md`** — **ADR-16** (orders & derived sales), **ADR-15**
  (corrections are new rows — the delta is computed against
  `original + Σ existing correction deltas`, so a re-submit is a no-op;
  see M1 finding F-1 in `stock/correct-movement.ts`), **ADR-17** (money
  derived), **ADR-24** (`DayClose` presence = the day is locked — checked
  the same way everywhere), **ADR-25** (every mutation → `AuditLog`),
  **ADR-29** (`Africa/Nairobi` day boundary via `lib/time`), **ADR-30**
  (Decimal money).
- **`docs/CONVENTIONS.md`** §1 (folders), §3 (error shape), §4 (correction
  pattern — the action is "Correct this", the input is the *corrected
  final value*, the domain computes the delta), §5 (Decimal; day
  boundary), §6 (working practices — ledgers not totals, correction of a
  correction is rejected).
- **`docs/SCHEMA.md`** §3 (`StockMovement` — `movement_type = sale`,
  `order_id` set), §4 (`Order` / `OrderLine`), §6 (`MoneyMovement`), §8
  (`Debt`).
- **`docs/PRD.md`** §4.3 — the five Cashier acceptance bullets. Note:
  "edit my own orders until the day is closed", "cannot see orders
  recorded by the other cashier", "cannot see buying prices, unit costs,
  or margins".
- **The M1 code you mirror:**
  - `lib/domain/stock/` — module shape (barrel, `errors.ts` re-export,
    `types.ts`, `internal.ts`, `guards.ts`, `test-helpers.ts` with a
    per-file row-prefix, one file per operation).
  - `lib/domain/stock/derived-balance.ts` — `getDerivedStockBalance` /
    `getDerivedStockBalances`. **Use these** for the §3.8 stock check —
    don't re-implement the sum.
  - `lib/domain/stock/correct-movement.ts` — the exact correction pattern
    you mirror for `correctOrder`: load original (never mutate), reject a
    row that is itself a correction, compute delta against the current
    derived value, write a new row with `correctsOrderId`, carry
    `occurredAt` so the correction lands in the same business day,
    `DayClose`-gate who may do it.
  - `lib/domain/stock/list-movements.ts` — the role-scoping shape
    (`admin` → all; location-bound role → own; a role with no access →
    `FORBIDDEN`). Your `listOrders` is the cashier analogue: `admin` →
    all, `cashier` → `where.cashierId = actor.userId`.
  - `lib/domain/catalog/list-products.ts` — the `stripBuyingPrice`
    pattern for non-admin. Your order payloads must carry **no**
    `buyingPrice` / unit cost / margin for a cashier (they don't naturally
    appear in an order shape — just don't add them).
  - `lib/domain/financials/record-money-movement.ts` +
    `lib/domain/customers/record-debt.ts` — what you call inside your
    transaction (S3).
  - `app/api/stock-movements/route.ts` — the "dispatch on body, per-type
    role check, no logic in the handler" route pattern;
    `lib/api/actor-location.ts` (`resolveActorLocationId`) — not needed
    for orders (Restaurant is the only order location) but shows the
    actor-context assembly.
  - `lib/validation/stock.ts` / `catalog.ts` — Zod style (money as a
    decimal string, never a float).

---

## 2. `lib/domain/sales` — module setup

New files under the existing `lib/domain/sales/` (currently `.gitkeep`):

- `index.ts` — barrel. Export the four public functions + their input
  types. If you add an internal `computeOrderTotals` / `toOrderView`, keep
  them in `internal.ts`, unexported from the barrel.
- `errors.ts` — `export { DomainError } from "@/lib/domain/catalog/errors";`
  (mirror `stock/errors.ts`).
- `types.ts` — `CreateOrderInput`, `EditOwnOrderInput`, `CorrectOrderInput`,
  `ListOrdersFilter`, `OrderView`, `OrderLineView`, an `ActorContext`
  (`{ userId, role }`). Money crosses the boundary as decimal **strings**.
- `internal.ts` — `toOrderView`, `computeLineSubtotal` / `computeTotal`,
  `toMoney` (copy from `stock/internal.ts` or `financials/internal.ts`).
- `test-helpers.ts` — copy `lib/domain/customers/test-helpers.ts`. Prefix
  `__sales_test__<scope>__`. You need a Restaurant `Location`, two
  `cashier` users (for the cross-cashier isolation test), one `admin`, a
  couple of `Product`s each with a `ProductLocation` at the Restaurant
  carrying a `sellingPrice`, and opening `StockMovement` rows so a derived
  balance exists to test the §3.8 block against. **Delete `AuditLog` rows
  by `userId` before deleting the users** — `AuditLog.userId` RESTRICTs
  (S3 finding; see the customers helper).

---

## 3. `createOrder(input, ctx)` → OrderView

**Input** (`ctx = { userId, role }`, role must be `cashier` — enforced at
the route; the domain can assume it):

```
createOrder({
  orderType: "dine_in" | "takeaway" | "delivery",
  deliveryFee?: string,              // decimal string; allowed ONLY when orderType === "delivery"
  paymentMethod: "cash" | "mpesa" | "credit",
  customerId?: string,               // REQUIRED when paymentMethod === "credit"
  account?: "cash" | "mpesa_bank",   // which money account a cash/mpesa order lands in — see below
  occurredAt?: Date,                 // defaults to now; its business day gates edit-vs-correct
  lines: [{ productId: string, quantity: string }],
}, { userId, role })
```

**Validation, in order (all `DomainError`):**

1. `lines` non-empty; each `quantity` > 0 (`VALIDATION_ERROR`, field
   `lines`).
2. Each `productId` exists, is **not** soft-deleted, and has an **active**
   `ProductLocation` at the Restaurant with a non-null `sellingPrice`
   (`VALIDATION_ERROR` naming the product — "X is not sold at the
   Restaurant"). Snapshot that `sellingPrice` as the line's `unitPrice` —
   **never look it up later** (SCHEMA §4: "captured at time of sale").
3. `orderType !== "delivery"` ⇒ `deliveryFee` must be absent/zero;
   `orderType === "delivery"` ⇒ `deliveryFee` optional, `>= 0`
   (`VALIDATION_ERROR`, field `deliveryFee` — "Delivery fee is only
   allowed on a delivery order").
4. `paymentMethod === "credit"` ⇒ `customerId` required and the customer
   must exist (`VALIDATION_ERROR`/`NOT_FOUND`, field `customerId`).
   `paymentMethod !== "credit"` ⇒ `customerId` must be absent.
5. **§3.8 BLOCK.** For each distinct product in `lines`, sum the line
   quantities for that product, then compare to
   `getDerivedStockBalance({ productId, locationId: restaurantId })`.
   If any product's total ordered quantity **exceeds** its current derived
   balance → `VALIDATION_ERROR` naming **every** short line and its
   available quantity (`field: "lines"`). **Write nothing.** Do this
   check *inside* the transaction, right before the writes, re-reading the
   balance on the `tx` client, so two concurrent orders can't both pass a
   stale read and drive the balance negative. (Acceptable at this
   business's scale; a `SELECT … FOR UPDATE` equivalent isn't needed —
   just don't read the balance outside the tx and trust it.)

**`total` = Σ line subtotals + (deliveryFee ?? 0)`.** `subtotal =
quantity × unitPrice`, 2dp. Decimal throughout (ADR-30).

**Writes — one `prisma.$transaction(async (tx) => { … })`:**

- `Order` (`locationId = restaurantId`, `cashierId = ctx.userId`,
  `orderType`, `deliveryFee ?? null`, `paymentMethod`, `customerId ?? null`,
  `total`).
- One `OrderLine` per line (`quantity`, `unitPrice`, `subtotal`).
- One `sale` `StockMovement` per line: `movementType: "sale"`,
  `productId`, `locationId: restaurantId`, `quantity: -lineQuantity`
  (**negative** — stock leaves), `orderId: order.id`, `recordedById:
  ctx.userId`, `occurredAt`.
- **Then, exactly one of:**
  - `paymentMethod` is `cash` or `mpesa` →
    `recordMoneyMovement({ account, amount: +total, sourceType: "order",
    sourceId: order.id, occurredAt }, { actorId: ctx.userId, tx })`.
    **Account mapping:** a `cash` order → `account: "cash"`; an `mpesa`
    order → `account: "mpesa_bank"`. (If Session 1's flow doc says the
    cashier picks the account explicitly, accept `input.account` and
    validate it's consistent with `paymentMethod`; otherwise derive it as
    above. Check `docs/design/flows/restaurant-sales-flow.md` — if it's
    silent, derive, and note the assumption in PROGRESS.)
  - `paymentMethod` is `credit` →
    `recordDebt({ customerId, orderId: order.id, amount: total,
    occurredAt }, { tx })`. **No `MoneyMovement`** (plan §3.2).
- One `AuditLog` row for the order: `entityType: "order"`, `action:
  "create"`, `entityId: order.id`, `userId: ctx.userId`, `newValue`
  a small summary (`{ total, paymentMethod, orderType, lineCount }`),
  `occurredAt`. (The money movement / debt write their own audit or are
  self-evident — `recordMoneyMovement` writes one; `recordDebt`
  deliberately doesn't.)

Return the `OrderView` (order + lines; **no** stock-movement or
money-movement detail in the default shape).

---

## 4. `editOwnOrder(orderId, input, ctx)` → OrderView

A **true edit** (not a correction row) — PRD §4.3 "edit my own orders
until the day is closed".

- Load the order. `NOT_FOUND` if missing.
- `order.cashierId !== ctx.userId` → `FORBIDDEN` ("You can only edit your
  own orders").
- **Same-day check (plan §4 soft gate, ADR-29):** if
  `toBusinessDate(order.occurredAt) !== toBusinessDate(new Date())` →
  `FORBIDDEN` with a distinct message ("This day is closed — ask an
  administrator to correct it"). M2 has **no `DayClose` UI**, so this is
  the business-date equality check, *not* a `DayClose` lookup. (M3 swaps
  in the real `DayClose` gate; leave a comment saying so.)
- Re-run **all** of `createOrder`'s validation on the new input, including
  **§3.8** — but the stock check must add back this order's *own* existing
  `sale` movements before comparing (you're replacing them, not stacking).
  Simplest correct approach: inside the tx, delete this order's existing
  `OrderLine`s and `sale` `StockMovement`s and its `MoneyMovement`/`Debt`,
  then re-derive the balance and re-write everything exactly as
  `createOrder` does. A true edit of an open-day order leaves no ledger
  history behind (that's the point of the same-day window; history-
  preservation kicks in only after close, via `correctOrder`).
- Rewrite `OrderLine`s, `sale` `StockMovement`s, and the money/debt effect
  to match the new state. Recompute `total`.
- `AuditLog` `action: "correct"` (there's no `edit` action in the enum),
  `oldValue` = the pre-edit summary, `newValue` = the post-edit summary.
- Factor the shared write body so `createOrder` and `editOwnOrder` call
  one `writeOrderEffects(tx, …)` — don't copy-paste the 40 lines.

---

## 5. `correctOrder(orderId, input, ctx)` → OrderView

Admin-only append-only correction (ADR-15, mirrors
`stock/correct-movement.ts`).

- Load the original order. `NOT_FOUND` if missing.
- `original.correctsOrderId !== null` → `VALIDATION_ERROR` ("This order is
  itself a correction — correct the original"). Corrections don't chain.
- Role: `ctx.role === "admin"` required (`FORBIDDEN` otherwise). Unlike
  the stock path there is **no open-day cashier branch** here — a cashier
  edits their own open-day order via `editOwnOrder`; `correctOrder` is
  the Admin's post-close tool. (If Session 1's flow says a cashier may
  also correct after close, that's a flag — don't implement it silently.)
- `input` is the **corrected final state** of the order (full line set +
  order-level fields), same shape as `createOrder`'s input.
- In one transaction:
  1. Validate the corrected state (all of §3's rules; for §3.8, the stock
     comparison is against the derived balance **with the original
     order's `sale` movements added back** — you're replacing the
     original's effect, not adding to it).
  2. Write a **new `Order`** row: `correctsOrderId = original.id`,
     `cashierId = original.cashierId` (keep the original cashier — the
     Admin corrects *on their behalf*), `occurredAt = original.occurredAt`
     (the correction lands in the original's business day),
     `total` = recomputed.
  3. Write the new order's `OrderLine`s.
  4. Write **offsetting** `sale` `StockMovement` rows so the net stock
     effect equals the corrected state: the cleanest form is one set of
     reversing rows for the original (`+originalLineQty`, `orderId =
     newOrder.id`, `correctsMovementId` pointing at the original's `sale`
     row) **plus** the new `sale` rows (`-correctedLineQty`). Net across
     original + reversals + new = the corrected quantities. (Match how
     `stock/correct-movement.ts` writes a single delta row where it can —
     if a line is unchanged, no rows for it.)
  5. Offset the money effect: if the original wrote a `MoneyMovement`,
     write a reversing one (`-original.total`, `sourceType: "order"`,
     `sourceId: newOrder.id`, `correctsMovementId` = the original
     movement) then the corrected one (`+corrected.total`). If the
     original wrote a `Debt`, write a reversing `Debt` (negative amount is
     not allowed by `recordDebt` — for the debt-correction case write the
     `Debt` rows directly on `tx`, or add a `correctDebt` helper to
     `lib/domain/customers` and **test + document it**; your call, but
     don't leave a negative-amount `recordDebt` call — it throws by
     design). A payment-method *change* on correction (credit → cash,
     etc.) means reversing one kind and writing the other.
  6. `AuditLog` `action: "correct"`, `entityType: "order"`, `entityId:
     newOrder.id`, `oldValue` = original summary, `newValue` = corrected
     summary.
- **Idempotency:** as in F-1, compute the corrected state's deltas against
  the *current* derived effect (original + any prior corrections). Two
  identical `correctOrder` submissions must net to zero the second time —
  a `VALIDATION_ERROR` ("nothing to correct") if every line and the
  totals are unchanged from the current derived state.

---

## 6. `listOrders(filter, ctx)` → OrderView[]

- `filter`: `{ cashierId?, date?, paymentMethod?, orderType? }`.
- Role scope (mirror `stock/list-movements.ts`):
  - `admin` → all orders; `filter.cashierId` narrows if given.
  - `cashier` → force `where.cashierId = ctx.userId`; a `filter.cashierId`
    that isn't the caller → return `[]` (don't error, don't leak).
  - any other role → `FORBIDDEN`.
- `date` → `[businessDateStartUtc, businessDateEndUtc)` on `occurredAt`
  (copy from `list-movements.ts`).
- Newest first (`occurredAt` desc, then `createdAt` desc).
- Include lines. **No `buyingPrice` / cost / margin** anywhere in the
  shape — an `OrderView` naturally has none; just don't add a "profit"
  field. A correction row (`correctsOrderId` set) is included; the
  read shows the current derived state (original + corrections) per
  CONVENTIONS §4.4 — decide whether `listOrders` returns corrected orders
  as separate rows or folds them; simplest for M2 is separate rows with
  `correctsOrderId` exposed so the Session 6 screen can badge them.
  Document the choice.

---

## 7. Routes (`app/api/orders/**`)

| Route | Method | Role | Body / query → domain |
|---|---|---|---|
| `/api/orders` | GET | admin, cashier | `?cashierId=&date=&paymentMethod=&orderType=` → `listOrders` |
| `/api/orders` | POST | cashier | `CreateOrderInput` → `createOrder` → 201 |
| `/api/orders/:id` | PATCH | cashier (own, same-day) | `EditOwnOrderInput` → `editOwnOrder` |
| `/api/orders/:id/correct` | POST | admin | `CorrectOrderInput` → `correctOrder` → 201 |

Each handler follows `app/api/products/route.ts` / `stock-movements/route.ts`
verbatim: parse JSON → Zod `safeParse` → `requireApiRole("cashier")` /
`requireApiRole("admin")` / `requireApiRoleIn(["admin","cashier"])` →
`try { domain } catch (DomainError) → fail(code, msg, field)`. **No
business logic in the handler.** Pass `{ userId: auth.user.id, role:
auth.user.role }` as the domain `ctx`. Zod schemas in
`lib/validation/orders.ts` (money + `deliveryFee` as decimal strings;
`lines[]` shape; the `credit ⇒ customerId` cross-field rule can live in
the schema via `.refine` or in the domain — domain is fine, keep the
schema shape-only like `catalog.ts`).

---

## 8. Tests (`lib/domain/sales/*.test.ts` + route tests)

Domain (per-file `test-helpers.ts`, prefix `__sales_test__<scope>__`,
clean only own rows, audit-before-users):

- **cash order** → `Order` + N `OrderLine` + N negative `sale`
  `StockMovement` + one `+total` `MoneyMovement` (`sourceType: "order"`,
  `account: "cash"`, `sourceId` = order id) + `AuditLog`; derived
  Restaurant balance drops by the ordered quantity;
  `getAccountBalances().cash` rises by `total`.
- **M-Pesa order** → same but `account: "mpesa_bank"`.
- **credit order** → `Order` + lines + `sale` movements + a `Debt`
  (`amount = total`, `orderId` set) and **no** `MoneyMovement`; the
  customer's derived balance (S3 `listCustomers` / `getCustomerLedger`)
  rises by `total`.
- **credit without `customerId`** → `VALIDATION_ERROR` field `customerId`,
  nothing written.
- **delivery fee on a non-delivery order** → `VALIDATION_ERROR` field
  `deliveryFee`, nothing written. Delivery order **with** a fee → fee in
  `total`.
- **§3.8 insufficient stock** → order a quantity above the derived
  Restaurant balance → `VALIDATION_ERROR` (`field: "lines"`) naming the
  short line and its available qty; assert **zero** new `Order` /
  `OrderLine` / `StockMovement` / `MoneyMovement` rows; assert the
  derived balance is unchanged and **not negative**. Include a
  multi-line order where one line is fine and one is short — still all-or-
  nothing.
- **`editOwnOrder`**: own same-day order, change a line qty → lines +
  `sale` movements + money effect all rewritten, `total` recomputed,
  balance reflects the new qty; another cashier's order → `FORBIDDEN`;
  an order dated to yesterday (set `occurredAt` back in the fixture) →
  `FORBIDDEN` "closed".
- **`correctOrder`**: Admin corrects a posted cash order's line qty down →
  a new `Order` (`correctsOrderId` set), net stock effect = corrected
  qty (original + reversal + new sums correctly), net money effect =
  corrected total (`getAccountBalances` reflects only the corrected
  amount); **re-submitting the identical correction** → `VALIDATION_ERROR`
  "nothing to correct", no second delta (F-1); a cashier calling
  `correctOrder` → `FORBIDDEN`; correcting a correction row →
  `VALIDATION_ERROR`.
- **`listOrders`**: cashier A sees only A's orders; a `cashierId=B`
  filter as cashier A → `[]`; admin sees both; `date` filter windows
  correctly; no margin/cost field present in any row.

Route tests (mock `getServerSession` like
`app/api/products/route.test.ts`): `cashier` → 201 on POST, 200 on GET
(own only), 200 on PATCH own / 403 on PATCH other's, 403 on
`/correct`; `admin` → 200 GET all, 201 on `/correct`; unauthenticated →
401; `store_manager` / `canteen_attendant` → 403 on every order route.

**Don't weaken the existing suite.** After S3 it's **268** green. Add
yours on top.

---

## 9. Docs to update this session

- **`docs/API.md`** — rewrite the "Orders (Restaurant)" section in the
  implemented-contract style (see how S3 did "Customers & Credit" — a
  `> Implemented M2 Session 4 (date)` note, camelCase JSON, decimal
  strings, per-route roles, the §3.8 error, the correction semantics).
- **`docs/SCHEMA.md`** — under `Order` / `StockMovement`: a line that
  `sale` movements + the `order` `MoneyMovement` are now written by
  `createOrder` (M2 S4); note the §3.8 no-negative-balance rule and the
  `correctsOrderId` append-only correction.
- **`docs/PROGRESS.md`** — a Session 4 entry under "Milestone 2" (what
  shipped, test counts, the account-mapping assumption if you made one,
  any `correctDebt` helper you added, anything flagged). **Rebase
  before writing it** — S1 and/or S5 may have appended in parallel (plan
  §7 hygiene).
- **`docs/sprints/milestone-2-plan.md`** §7 — mark Session 4 status; §10
  changelog line only if sequencing changed.
- **This file** — set the status line to `DONE` and note anything Session
  6 needs (the `OrderView` shape, how corrections surface in `listOrders`,
  the `editOwnOrder` vs `correctOrder` routing rule the C4 screen must
  reflect).

---

## 10. Guardrails for this session (plan §8)

- **Every endpoint's role access explicit and tested** — cashier-only
  POST/PATCH, admin-only `/correct`, and a negative test for each refused
  role.
- **§3.8 BLOCK is absolute** — no code path writes an order line that
  takes a derived Restaurant balance negative. If you catch yourself
  adding an "allow and flag" branch, stop.
- **Ledgers, not stored totals** — `Order.total` is a stored convenience
  value **recomputed on every write/correction**, never trusted as the
  source of truth for money or stock. Cash/M-Pesa balances and stock
  balances stay derived (S3 `getAccountBalances`, `getDerivedStockBalance`).
- **Corrections are new rows** — `correctOrder` never `UPDATE`s the
  original `Order` / `OrderLine` / `StockMovement` / `MoneyMovement` /
  `Debt`. A correction of a correction is rejected.
- **Money is Decimal end to end** (ADR-30) — `Prisma.Decimal` in the
  domain, decimal strings at the route. No `number`.
- **No margin leak to a cashier** (plan §3.6) — verified by a test.
- **Every mutation writes `AuditLog`** (ADR-25).
- **No UI decisions.** Flag, don't design.

## 11. Gates (definition of done)

- `pnpm tsc --noEmit` → 0.
- `pnpm build` → clean.
- `pnpm test` → green; the existing 268 untouched (don't weaken any),
  new domain + route suites added.
- `lib/domain/sales` barrel exports the public surface; route handlers
  import only from the barrel (+ `lib/domain/financials`,
  `lib/domain/customers`, `lib/domain/stock` barrels as needed).
- `grep -rn "TODO(mock)"` in `lib/domain/sales` → none. **The M1
  `purchases.ts` `TODO(mock)`** (a `purchase_payment` should also debit
  Cash / M-Pesa) — the plan hands its resolution to this session; the
  `recordMoneyMovement` seam now exists (`sourceType: "purchase_payment"`,
  `sourceId` = the stock-movement id). Resolve it if it fits in scope; if
  you defer it, re-scope it explicitly in PROGRESS with a reason and the
  target session (CONVENTIONS §4).

---

## 12. Explicitly NOT this session

- `recordStockCount` / canteen derivation / `canteen_sale` movements — S5.
- Any screen, hook, or `components/**` file — S6.
- Day Close as a hard `DayClose` gate — M3 (M2 uses the business-date
  equality soft check).
- Handover / expenses / owner draws — M3.

---

## Session Notes

- **Account mapping for a cash / M-Pesa order:** **derived from
  `paymentMethod`** (`cash` → `cash`, `mpesa` → `mpesa_bank`).
  `restaurant-sales-flow.md` walkthroughs A/B show no explicit account
  picker on the checkout sheet, so the domain derives it. An optional
  `account` input is still accepted and validated for consistency
  (`400`, `field: "account"` on a mismatch) — the Session 6 screen may
  send it explicitly if the design gains a picker.
- **`correctDebt` helper added? YES.**
  `lib/domain/customers/correct-debt.ts`, exported from the customers
  barrel. Tx-only; appends a **signed** `Debt` row (negative reverses a
  customer's balance, positive tops it up) — `recordDebt` rejects
  non-positive amounts by design, so `correctOrder` uses `correctDebt`
  for the reversal/change legs. No `AuditLog` of its own (the correcting
  order's audit row covers it). Any later credit-correction work should
  call this rather than write signed `Debt` rows directly.
- **`listOrders` correction rows:** **separate rows** (not folded). Each
  `Order` — original and every correction — is its own row;
  `correctsOrderId` is exposed so the Session 6 screen can badge a
  corrected order and link to / from its correction. A read shows the
  current derived state because the offsetting ledger rows already net
  out; `Order.total` on each row is that row's own recomputed total.
- **M1 `purchases.ts` `TODO(mock)`:** **resolved this session.**
  `recordPurchasePayment` now writes one **`−cost` `MoneyMovement`**
  (money out) against `purchase_paid_from`
  (`sourceType: "purchase_payment"`, `sourceId` = the `purchase_payment`
  `StockMovement` id) inside the same transaction. `flow-4` integration
  test + the `stock` / `flow-4` cleanup helpers updated.
  `grep TODO(mock)` in `lib/domain/stock` → none.
- **Schema addition (owner-approved mid-session):** **`Order.occurred_at`**
  (`DateTime @default(now())`). The edit-vs-correct gate compares the
  order's Africa/Nairobi business date to today, and `correctOrder`
  backdates its correcting row to `original.occurredAt` — the model had
  no business instant (only `createdAt`), unlike every other ledger
  table. Applied via `prisma db push` + `generate`; deploy migration
  `20260829140000_add_order_occurred_at`.
- **Test infra:** `vitest.config.ts` gained `maxWorkers: 4` (+
  `testTimeout` / `hookTimeout` bumps). The full suite was exceeding the
  local Postgres 100-connection ceiling once S4's + S5's DB-heavy suites
  ran alongside the M1 set. Project-wide change; isolated suites still
  run sub-second.
- **Flags / escalations:** none.

### For Session 6 (screen assembly)

- **`OrderView` shape** (returned by every order domain fn / route):
  `{ id, locationId, cashierId, orderType, deliveryFee (string|null),
  paymentMethod, customerId (string|null), total, correctsOrderId
  (string|null), occurredAt, createdAt, updatedAt,
  lines: [{ id, productId, quantity, unitPrice, subtotal }] }`. Money +
  quantities are decimal **strings**. No cost / margin / profit field
  anywhere — safe to render wholesale for a Cashier.
- **C4 routing rule the screen must encode:** load the order, then
  - `order.cashierId === session.user.id` **and**
    `toBusinessDate(order.occurredAt) === toBusinessDate(now)` →
    **editable** (PATCH `/api/orders/:id`).
  - else → **read-only**; the "Correct this" action is **Admin-only**
    (POST `/api/orders/:id/correct`). From a Cashier's C4 it does not
    open a form — it surfaces the order reference for the Admin (flow doc
    walkthrough F). The API enforces this regardless (`403` for a
    Cashier on `/correct`, `403` "closed" for a Cashier PATCH after the
    day rolls).
- **Corrections in the C1 / A3 list:** `listOrders` returns the original
  **and** the correction as separate rows, `correctsOrderId` set on the
  correction. Badge the original `CORRECTED` and render the pair linked
  (A3's "linked row-group" artboard). The figures on each row are
  already the current derived state — no client-side netting needed.
- **§3.8 inline errors:** `createOrder` / `editOwnOrder` reject with
  `code: "VALIDATION_ERROR"`, `field: "lines"`, and a `message` naming
  every short line and its available quantity. C2's per-line error
  pattern reads the short-line names out of that message (or the screen
  re-derives per-line from the product grid's stock counts — the block
  is a courtesy; the server is the gate).
- **`account` on checkout:** the C3 sheet does **not** need an account
  picker — omit `account` and the domain derives it. Only add one if the
  design later calls for it; the field is already accepted.
- **Canteen slice (S5)** lives in the same `lib/domain/sales` barrel —
  `recordStockCount` / `voidStockCount` / `listDerivedSales` /
  `getDerivedSalesForProduct` — for the K1 / K2 / A4 screens.
