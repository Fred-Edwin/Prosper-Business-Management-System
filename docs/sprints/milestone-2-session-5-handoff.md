# M2 Session 5 Handoff — Developer: Canteen Derived Sales (backend)

**Status:** READY once Session 3 is merged to `main` (it is —
`m2-session-3-financials-customers`). **May run in parallel with Session
4** (Restaurant Orders); both depend only on S3, not on each other. Both
live in `lib/domain/sales` — if you and S4 are truly concurrent, split by
file (S5 owns `record-stock-count.ts` / `derived-sales.ts`; S4 owns
`create-order.ts` / `edit-own-order.ts` / `correct-order.ts` /
`list-orders.ts`) and the second-to-merge rebases the shared `index.ts` /
`types.ts` / `test-helpers.ts`.

**Role:** Developer (Development Sprint — backend only). One role:
`lib/domain/sales` (canteen slice) + `lib/validation/canteen` +
`app/api/canteen/**` + tests + the doc sections in §7. **No UI, no
screens, no `components/**`.** If a screen's need is unclear, that's
Session 6's problem — flag it, don't design it.

**Milestone plan:** `docs/sprints/milestone-2-plan.md` — read §1, §2, §3
(esp. **#5 canteen derived sale** — the derivation formula and the
"revenue `MoneyMovement`, account = Cash, no `Debt`" rule), §4 "M2-F3",
§7 "Allowed concurrency", §8 guardrails.

---

## 0. What this session delivers

`lib/domain/sales` — the **Canteen derived-sales** slice:

- `recordStockCount` — write a `StockCount` row at `occurredAt`, then
  derive units sold for the period **since that product's previous
  count**, write one `sale` `StockMovement` for the derived quantity,
  write a revenue `MoneyMovement` (`sold × canteen selling price`, account
  = `cash`), and set closing stock to the counted value.
- `getDerivedSalesForProduct` / `listDerivedSales` — per product: when it
  was last counted, what period a figure covers, units sold, revenue
  (PRD §4.4 "As the Admin, I can see…").
- Routes: `POST /api/canteen/stock-counts`, `GET /api/canteen/stock-counts`
  (or `GET /api/canteen/derived-sales` — see §7).

Plus the `docs/API.md` "Canteen" section and the S5 rows in `SCHEMA.md` /
`PROGRESS.md` / plan §7.

---

## 1. Required reading (before any code)

- **`docs/sprints/milestone-2-plan.md`** §3.5 — the derivation is the
  contract:
  `sold = opening + received(transfers + production) − non_sale_consumption − counted_remaining`
  over the period since the product's previous count. Write a `sale`
  `StockMovement` for `sold`, set closing to the counted value, write a
  revenue `MoneyMovement` (`sold × canteen selling price`, account =
  `cash` — the canteen takes no M-Pesa or credit in M2 unless Session 1's
  flow doc says otherwise). **No `Debt` path at the canteen** (PRD §4.4).
- **`docs/sprints/milestone-2-session-3-handoff.md`** — "Session Notes" →
  **"For Session 5"**. The money seam (`recordMoneyMovement` inside your
  transaction, `sourceType: "canteen_sale"`, `sourceId` = the
  `StockCount` id, `account: "cash"`) is spelled out there.
- **`docs/DECISIONS.md`** — **ADR-16** (canteen sales derive from counts
  and write a `sale` `StockMovement` so reporting is uniform with
  Restaurant sales), **ADR-11** (opening/closing not pre-written by a job
  — computed on read), **ADR-15** (corrections are new rows — not in M2
  scope for stock counts, but shape the module so a `correctStockCount`
  could drop in), **ADR-17** (money derived), **ADR-25** (audit),
  **ADR-29** (`Africa/Nairobi` day boundary), **ADR-30** (Decimal).
- **`docs/CONVENTIONS.md`** §1, §3, §4, §5, §6.
- **`docs/SCHEMA.md`** §3 (`StockMovement` — `movement_type` values;
  `sale` with `stock_count_id` set; `stock_count` type),
  §5 (`StockCount`), §6 (`MoneyMovement`).
- **`docs/PRD.md`** §4.4 — the four bullets. Note "any product at any
  time — no fixed daily requirement" and "set closing stock to the
  counted remaining value".
- **The M1 code you mirror / reuse:**
  - `lib/domain/stock/` — module shape, `guards.ts`
    (`assertProductExists`, `assertLocationOfType` — use it to assert the
    location is a `canteen`), `test-helpers.ts` pattern.
  - `lib/domain/stock/derived-balance.ts` — `getDerivedStockBalance` with
    an `asOf`. **You need the *period* sum, not the all-time balance** —
    see §3 for how to bound it by `(previousCount.occurredAt,
    thisCount.occurredAt]`.
  - `lib/domain/stock/opening-stock.ts` — how an `opening`/`closing`
    concept is handled as ledger rows, not a stored column.
  - `lib/domain/stock/consumption.ts` — `recordNonSaleConsumption` writes
    a `non_sale_consumption` row; these are the rows you subtract in the
    derivation.
  - `lib/domain/stock/transfer.ts` / `issue-production.ts` — `transfer`
    (into the canteen) and `production` rows are the "received" term.
  - `lib/domain/financials/record-money-movement.ts` — what you call
    inside your transaction (S3).
  - `app/api/stock-movements/route.ts` — the route pattern;
    `lib/api/actor-location.ts` (`resolveActorLocationId`) — you **do**
    need this: a `canteen_attendant` is bound to their canteen location.
  - `lib/validation/stock.ts` — Zod style.

---

## 2. `lib/domain/sales` — module setup (canteen slice)

If S4 hasn't created the module yet, create it (see the S4 handoff §2 for
the file list — `index.ts` barrel, `errors.ts` re-export, `types.ts`,
`internal.ts`, `test-helpers.ts`). Your additions:

- `record-stock-count.ts` — `recordStockCount`.
- `derived-sales.ts` — `getDerivedSalesForProduct`, `listDerivedSales`.
- `types.ts` — add `RecordStockCountInput`, `DerivedSaleView`
  (`{ productId, productName, lastCountedAt, periodStart, periodEnd,
  unitsSold, revenue }`), `ListDerivedSalesFilter`.
- `test-helpers.ts` — prefix `__canteen_test__<scope>__` if you own the
  file, or add a `setupCanteenTestData` alongside S4's if sharing. You
  need a Canteen `Location`, a `canteen_attendant` user linked via
  `Staff` to that location, an `admin`, a `store_manager` (for the
  "count by non-attendant rejected" test), one or two `Product`s each
  with a `ProductLocation` at the Canteen carrying a `sellingPrice`, and
  the ability to seed `opening` / `transfer` / `production` /
  `non_sale_consumption` `StockMovement` rows at chosen `occurredAt`s so
  you can hand-work the derivation. **Delete `AuditLog` by `userId`
  before deleting users** (`AuditLog.userId` RESTRICTs — S3 finding).

---

## 3. `recordStockCount(input, ctx)` → { count, derivedSale }

**Input** (`ctx = { userId, role, locationId }`; role must be
`canteen_attendant`, enforced at the route; `locationId` = the
attendant's canteen from `resolveActorLocationId`):

```
recordStockCount({
  productId: string,
  countedQuantity: string,     // decimal string, >= 0
  occurredAt?: Date,           // defaults to now; the count's timestamp
}, { userId, role, locationId })
```

**Validation (all `DomainError`):**

1. `productId` exists and is not soft-deleted.
2. The product has an **active** `ProductLocation` at the canteen
   `locationId` with a **non-null `sellingPrice`** (`VALIDATION_ERROR` —
   "X is not sold at the canteen"). Snapshot that price for the revenue
   calc.
3. `countedQuantity` parses to a `Decimal` `>= 0` (`VALIDATION_ERROR`,
   field `countedQuantity`).
4. `occurredAt` (default now) must be **after** the product's previous
   `StockCount.occurredAt` at this location, if any (`VALIDATION_ERROR` —
   "A later count already exists for this product"). Counts must move
   forward in time so a period is well-defined. (M2 has no correction
   path for a mis-dated count — that's a `correctStockCount`, later.)

**The derivation — do it inside the transaction, on the `tx` client:**

Let `prev` = the product's most recent `StockCount` at this location with
`occurredAt < thisOccurredAt` (or `null` if this is the first ever).

- `periodStart` = `prev ? prev.occurredAt : <the product's first
  StockMovement.occurredAt at this location, or thisOccurredAt if none>`.
  (For the first-ever count, "opening" is everything from the beginning of
  the ledger up to this count — so `periodStart` is effectively the epoch;
  simplest is to not lower-bound the sum at all when `prev` is null.)
- `periodEnd` = `thisOccurredAt`.
- **`openingPlusFlows`** = signed sum of every `StockMovement.quantity`
  for `(productId, locationId)` with `occurredAt` in the window
  `(periodStart, periodEnd]` **excluding** any `sale` rows already written
  for a *previous* count in this window (there shouldn't be any if counts
  move forward and each count consumes its whole period, but exclude
  `movementType = "sale"` with a `stockCountId` to be safe) — i.e. sum
  `opening` + `purchase_receipt` + `transfer` (signed — into canteen is
  positive) + `production` + `issue` + `non_sale_consumption` (these are
  already negative rows in the ledger) + `stock_count` closing rows from a
  prior count.
  - **Cleanest formulation:** the stock that *should* be on the shelf at
    `periodEnd` before this count = `getDerivedStockBalance({ productId,
    locationId, asOf: periodEnd })` **minus** the `sale`/`stock_count`
    rows this very count is about to write (nothing yet) — i.e. just call
    `getDerivedStockBalance` with `asOf: thisOccurredAt` on the `tx`
    client. Call that `expectedRemaining`.
- **`sold` = `expectedRemaining − countedQuantity`.**
  - `sold < 0` (counted **more** than expected — a mis-count or an
    unrecorded receipt): plan §3.5 doesn't cover it. **Default: clamp to
    a `VALIDATION_ERROR`** ("Counted quantity exceeds expected stock by N
    — record the missing receipt/transfer first, then recount") and write
    nothing. Flag this in PROGRESS for Session 1 / QA — if the owner
    wants "allow and set sold = 0", that's a flag, not a silent choice.
  - `sold === 0` — valid (nothing sold this period). Still write the
    closing row; the `sale` row and `MoneyMovement` are for `0` — write
    them anyway for a uniform audit trail, **or** skip the zero-value
    money row (cleaner). Pick one, document it.

**Writes — one `prisma.$transaction(async (tx) => { … })`:**

1. `StockCount` row (`productId`, `locationId`, `countedById: ctx.userId`,
   `countedQuantity`, `occurredAt: thisOccurredAt`).
2. One `sale` `StockMovement`: `movementType: "sale"`, `quantity: -sold`
   (negative — stock leaves as a sale), `stockCountId: count.id`,
   `recordedById: ctx.userId`, `occurredAt: thisOccurredAt`. (This makes
   canteen sales sum into the same derived-balance and reporting paths as
   Restaurant sales — ADR-16.)
3. Set closing to the counted value. Per ADR-11 closing isn't a stored
   column — after step 2 the derived balance `asOf thisOccurredAt` equals
   `expectedRemaining − sold = countedQuantity` automatically, so **no
   extra "closing" row is needed** if `sold` was computed as
   `expectedRemaining − countedQuantity`. If you'd rather be explicit,
   write a `stock_count`-type `StockMovement` for the reconciling delta
   (`countedQuantity − (expectedRemaining − sold)` = 0 in the happy path)
   — but that's a zero row; skip it unless the flow doc wants the
   explicit marker. **Document which.**
4. `recordMoneyMovement({ account: "cash", amount: +(sold × sellingPrice),
   sourceType: "canteen_sale", sourceId: count.id, occurredAt:
   thisOccurredAt }, { actorId: ctx.userId, tx })`. Skip if `sold === 0`
   and you chose to skip zero rows.
5. `AuditLog` `action: "create"`, `entityType: "stock_count"`, `entityId:
   count.id`, `newValue: { countedQuantity, sold, revenue }`,
   `occurredAt`.

Return `{ count, derivedSale: { unitsSold: sold, revenue, periodStart,
periodEnd } }` so the Session 6 K1 screen can show the "sold since last
count" preview from the same call.

**Keep the module shaped for `correctStockCount`** (ADR-15 — a later
mis-count correction would be a new `StockCount` + offsetting `sale` /
`MoneyMovement` rows linked via a `correctsStockCountId`). The schema has
no `corrects_stock_count_id` column today — **do not add one**; just
don't build a design that would need a migration to correct a count
later. Note the gap in PROGRESS.

---

## 4. `getDerivedSalesForProduct(productId, ctx)` / `listDerivedSales(filter, ctx)`

PRD §4.4: "As the Admin, I can see, per product, when it was last counted
and what period any derived sales figure covers."

- Per product, return `{ productId, productName, lastCountedAt,
  periodStart, periodEnd, unitsSold, revenue }` for the **most recent**
  count's derived sale (join the latest `StockCount` to its `sale`
  `StockMovement` via `stockCountId` and to its `canteen_sale`
  `MoneyMovement` via `sourceId`). `lastCountedAt` = that count's
  `occurredAt`; `periodStart` = the previous count's `occurredAt` (or
  null / "since opening" for a first count).
- `listDerivedSales({ productId?, date? })` — all canteen products (or
  one), newest count first. `date` windows on the count's `occurredAt`.
- Role scope: `admin` → all; `canteen_attendant` → their own canteen
  location only (mirror `stock/list-movements.ts`); any other role →
  `FORBIDDEN`. (The attendant needs the read for the K2 hub timeline.)
- Revenue and quantities as decimal strings at the boundary.

---

## 5. Routes (`app/api/canteen/**`)

| Route | Method | Role | Body / query → domain |
|---|---|---|---|
| `/api/canteen/stock-counts` | POST | canteen_attendant | `{ productId, countedQuantity, occurredAt? }` → `recordStockCount` → 201 |
| `/api/canteen/stock-counts` | GET | admin, canteen_attendant | `?productId=&date=` → `listDerivedSales` |

`GET /api/canteen/derived-sales` as a distinct alias is optional — the
plan mentions "or a dedicated" route. One GET is enough for M2; if the
Session 1 flow doc names `/derived-sales` explicitly, add it as a thin
alias to the same domain call and document it. Don't build both with
divergent shapes.

Each handler follows `app/api/stock-movements/route.ts`: parse → Zod
`safeParse` → `requireApiRole("canteen_attendant")` /
`requireApiRoleIn(["admin","canteen_attendant"])` →
`resolveActorLocationId(auth.user.id)` for the attendant →
`try { domain } catch (DomainError) → fail`. **No logic in the handler.**
Zod in `lib/validation/canteen.ts` (shape only — `countedQuantity` a
decimal string, `occurredAt` an optional ISO datetime).

---

## 6. Tests (`lib/domain/sales/*.test.ts` + route tests)

Domain (per-file helpers, prefix `__canteen_test__<scope>__`, clean only
own rows, audit-before-users):

- **derivation against a hand-worked ledger:** seed `opening 100` at
  `T0`, `transfer +20` at `T1`, `non_sale_consumption −5` (staff_meal) at
  `T2`, then `recordStockCount(countedQuantity: 80)` at `T3`. Expected
  `sold = (100 + 20 − 5) − 80 = 35`. Assert: one `sale` `StockMovement`
  `quantity = -35` with `stockCountId` set; a `canteen_sale`
  `MoneyMovement` `amount = 35 × sellingPrice`, `account: "cash"`,
  `sourceId` = count id; `getDerivedStockBalance(asOf T3) === "80.0000"`;
  `getAccountBalances().cash` rose by `35 × sellingPrice`; an `AuditLog`
  row.
- **two counts with a gap (period boundary):** count at `T3` (as above),
  then `transfer +10` at `T4`, then `recordStockCount(countedQuantity:
  15)` at `T5`. Second period: `expectedRemaining at T5 = 80 + 10 = 90`;
  `sold = 90 − 15 = 75`. Assert the second `sale` row is `-75` and the
  first period's `35` is **not** double-counted (the T3 count's `sale`
  row already consumed period 1). `getDerivedSalesForProduct` returns the
  **second** count's figures with `periodStart = T3`, `periodEnd = T5`.
- **first-ever count:** no prior `StockCount` → `periodStart` is
  null/"since opening"; derivation sums from the start of the ledger.
- **closing = counted value:** after any count,
  `getDerivedStockBalance(asOf = count.occurredAt)` equals
  `countedQuantity` exactly.
- **revenue = sold × canteen price:** exact Decimal (`0.1`-type values
  don't drift — reuse the S3 precision assertion style).
- **counted more than expected** → `VALIDATION_ERROR`, nothing written,
  balance unchanged (per §3 default; adjust if the flag resolves
  otherwise).
- **no credit path:** there is no `account` / `paymentMethod` input and
  no `Debt` is ever written — assert `prisma.debt.count()` unchanged
  across a count.
- **count out of order** (`occurredAt` before the previous count) →
  `VALIDATION_ERROR`.
- **count by a non-attendant** — the domain assumes the route enforced
  the role, but add a guard test: calling `recordStockCount` with
  `ctx.role !== "canteen_attendant"` (if your domain double-checks) or
  the route test below covers it.

Route tests (mock `getServerSession` like
`app/api/products/route.test.ts`): `canteen_attendant` → 201 on POST,
200 on GET (own location); `admin` → 200 on GET; a `store_manager` /
`cashier` → 403 on both; unauthenticated → 401. An attendant whose
`Staff` link is missing (no `locationId`) → `FORBIDDEN` (mirror
`stock/list-movements.ts`).

**Don't weaken the existing suite** — 268 green after S3 (more if S4
merged first). Add yours on top.

---

## 7. Docs to update this session

- **`docs/API.md`** — rewrite the "Canteen" section in the
  implemented-contract style (see S3's "Customers & Credit" for the
  format — a `> Implemented M2 Session 5 (date)` note, camelCase JSON,
  decimal strings, per-route roles, the derivation summary, the
  "counted > expected" error, "no credit at the canteen").
- **`docs/SCHEMA.md`** — under `StockCount` / `StockMovement` /
  `MoneyMovement`: `recordStockCount` (M2 S5) now writes the `sale`
  movement (`stock_count_id` set), the `canteen_sale` `MoneyMovement`
  (account `cash`), and closing = counted value is derived (no stored
  column, ADR-11). Note there's no `corrects_stock_count_id` column yet
  (a `correctStockCount` would need a migration).
- **`docs/PROGRESS.md`** — a Session 5 entry under "Milestone 2" (what
  shipped, the derivation, test counts, the "counted > expected" and
  "closing marker row" decisions, anything flagged). **Rebase before
  writing it** — S1 and/or S4 may have appended in parallel.
- **`docs/sprints/milestone-2-plan.md`** §7 — mark Session 5 status; §10
  changelog line only if sequencing changed.
- **This file** — set the status line to `DONE` and note anything Session
  6 needs (the `recordStockCount` return shape that feeds the K1 "sold
  since last count" preview; the `DerivedSaleView` shape for A4 / K2).

---

## 8. Guardrails for this session (plan §8)

- **Every endpoint's role access explicit and tested** — attendant-only
  POST, admin + attendant GET, negative tests for refused roles and for a
  location-unassigned attendant.
- **Derived, not stored** — `sold`, `revenue`, closing stock are all
  computed from ledger rows; the only rows you *write* are the
  `StockCount`, the `sale` `StockMovement`, and the `canteen_sale`
  `MoneyMovement`. No "units sold" or "closing" column exists — don't add
  one.
- **Canteen sales reconcile against stock counts** (guardrail 7): the
  derivation must be exact across a period boundary — a QA target. Your
  two-counts-with-a-gap test is the proof.
- **No credit at the canteen** (PRD §4.4) — no `Debt`, no
  `payment_method`, account is always `cash`.
- **Money is Decimal end to end** (ADR-30).
- **Every mutation writes `AuditLog`** (ADR-25).
- **No UI decisions.** Flag, don't design.

## 9. Gates (definition of done)

- `pnpm tsc --noEmit` → 0.
- `pnpm build` → clean.
- `pnpm test` → green; the existing suite untouched (don't weaken any),
  new domain + route suites added.
- `lib/domain/sales` barrel exports the canteen surface; route handlers
  import only from the barrel (+ `lib/domain/financials` /
  `lib/domain/stock` barrels as needed).
- `grep -rn "TODO(mock)"` in the new canteen files → none.

---

## 10. Explicitly NOT this session

- `createOrder` / order routes / `Debt` writing / Restaurant stock
  deduction — S4.
- Any screen, hook, or `components/**` file — S6.
- A `correctStockCount` path (and its schema column) — later; just leave
  the module shaped so it could be added.
- Day Close / handover / expenses / owner draws — M3.

---

## Session Notes

*(Live notes added during the session.)*

- **"Counted more than expected":** _VALIDATION_ERROR (default) / allowed
  with sold = 0 — record which, and whether the flow doc drove it._
- **Zero-value `sale` / `MoneyMovement` rows (sold === 0):** _written /
  skipped — record which._
- **Explicit `stock_count` closing marker row:** _written / relied on the
  derived balance — record which._
- **`GET` route name:** `/api/canteen/stock-counts` _(+ `/derived-sales`
  alias? yes/no)_.
- **`correctStockCount` schema gap:** noted — no `corrects_stock_count_id`
  column; a correction path needs a migration in a later session.
- **Flags / escalations:** _none yet._
