# Prosper — API Contract

**Status:** Approved. See `DECISIONS.md` ADR-27 and `CONVENTIONS.md` for
the error shape and correction pattern referenced throughout.

Base: REST-ish JSON over Next.js Route Handlers. All routes require an
authenticated session unless noted. All list responses are automatically
scoped to what the caller's role/ownership permits (ADR-26) — a Cashier's
`GET /api/orders` never returns another cashier's orders, buying-price
fields are stripped for non-Admin roles, etc.

**Standard error shape** (all endpoints):
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "field": "..." } }
```
See `CONVENTIONS.md` §3 for the full code list.

**No PUT/DELETE on historical records.** Corrections are `POST` to a
dedicated `/:id/correct` action endpoint, which accepts the corrected final
value and computes the delta internally (ADR-15).

---

## Auth

`/api/auth/*` — handled by Auth.js. Login, logout, session.

---

## Catalog

> **Implemented Session 5 (2026-08-27).** The contract below reflects what
> shipped. Changes from the original spec (see ADR-38): per-location
> pricing is submitted *with* the product, not via a separate endpoint;
> delete is `DELETE /api/products/:id` (with `?mode=archive` or a
> `{ confirmName }` body), not `POST .../soft-delete` + `.../hard-delete`.
> Field names are `camelCase` in the JSON (matching the domain types) —
> `buyingPrice`, `unitLabel`, `sellingPrice`.

Success envelope is `{ "data": ... }`; errors use the standard shape.

### `GET /api/locations`
Roles: Admin, Store Manager, Canteen Attendant (widened in Session 14 —
the staff stock hooks consume this for the transfer destination picker).
Returns active locations, `{ data: Location[] }`, sorted by name.

### `GET /api/products`
Roles: Admin, Store Manager, Canteen Attendant, **Cashier**. `buyingPrice`
is stripped to `null` for every non-Admin role (they consume this for the
stock-flow product pickers, the mobile stock-levels views, and — from M2 —
the Cashier's C2 New-Order product grid). `POST` stays Admin.
Query: `?kind=ingredient|dish|goods`, `?search=` (case-insensitive `name`
contains), `?category=` (exact match on the menu category),
`?includeArchived=true` (default excludes soft-deleted).
Returns `{ data: ProductWithLocations[] }`, sorted kind→name. Each item:
`{ id, name, kind, unitLabel, buyingPrice, category, deletedAt, createdAt,
updatedAt, locations: [{ locationId, locationName, locationType,
sellingPrice, active }] }`. Money fields are decimal **strings**
(`"580.00"`); `sellingPrice` is `null` when the location is stocked but
not sold; `category` is `null` when uncategorised.

> **`category` + Cashier read access — M2 Session 6 (2026-08-30,
> owner-approved scope exception).** `Product.category` (`String?`,
> free-text, ≤40 chars) is an Admin-set menu category set in the Catalog
> product drawer; it powers the C2 New-Order grid and K1 Stock-Count
> picker category tab rows (planned M2-01 §6/§10, never built until now).
> `cashier` was added to this route's read roles (and to
> `GET /api/stock-movements/balances`) so C2 works — `buyingPrice` stays
> stripped for the Cashier, so no cost/margin leaks (plan §3.6). Same
> deploy migration as `Order.number`.

### `POST /api/products`
Roles: Admin. Body:
```json
{ "name": "...", "kind": "ingredient|dish|goods", "unitLabel": "...",
  "buyingPrice": "580.00", "category": "Mains" | null,
  "locations": [{ "locationId": "...", "sellingPrice": "850.00" | null, "active": true }] }
```
`buyingPrice` required for `ingredient`/`goods` (`>= 0`); ignored (forced
to `"0.00"`) for `dish` — ADR-33. `category` optional, free-text, trimmed,
≤40 chars; `""` → `null`. Writes the product + one `ProductLocation` per
`locations[]` entry in one transaction. Returns
`{ data: ProductWithLocations }`, `201`. `PATCH /api/products/:id` takes
the same body shape (`category` included).

### `PATCH /api/products/:id`
Roles: Admin. Same body as `POST`. True edit, not a correction (a catalog
entry is not a ledger). `locations[]` is reconciled to the submitted set:
entries present are upserted; a previously-active location no longer in
the array is **deactivated** (`active = false`), not deleted (ADR-38).
Switching `kind` to `dish` zeroes `buyingPrice`. `404` if missing or
soft-deleted.

### `DELETE /api/products/:id`
Roles: Admin.
- `?mode=archive` — soft-delete: sets `deletedAt`, deactivates the
  product's `ProductLocation` rows. Idempotent. Returns
  `{ data: { archived: true } }`.
- otherwise — hard delete. Body `{ "confirmName": "..." }` must equal the
  product name **exactly** (case-sensitive) → else `400 VALIDATION_ERROR`
  (`field: "confirmName"`). Returns `409 CONFLICT` if any linked
  `StockMovement` / `OrderLine` / `StockCount` / `RecipeIngredient`
  exists — the client turns this into the "Archive instead" path. Clean ⇒
  deletes the `ProductLocation` rows then the product. Returns
  `{ data: { deleted: true } }`.

### `POST /api/products/:id?mode=unarchive`
Roles: Admin. Restore an archived product (ADR-47 §4) — the mirror of
`DELETE …?mode=archive`. Clears `deletedAt`. Does **not** reactivate the
product's `ProductLocation` rows (they were deactivated on archive per
ADR-38; the Admin re-enables the ones they want via the Edit drawer,
which restores each row's last-known selling price). Idempotent
(unarchiving an active product is a no-op success). A missing / wrong
`mode` → `400 VALIDATION_ERROR`. Returns `{ data: { archived: false } }`.

### `GET /api/products/:id`
Roles: Admin. Returns `{ data: ProductWithLocations }` for the edit
drawer; `404` if missing or soft-deleted.

---

## Recipes (Informational Only — ADR-33)

Never affects stock, COGS, or profit figures. Purely for the Admin's own
reference and yield-anomaly flagging.

### `GET /api/recipes/:dish_product_id`
Roles: Admin. Returns the recipe (ingredients + quantities) and the
derived estimated per-dish cost, if one is defined.

### `POST /api/recipes`
Roles: Admin. Body:
```json
{
  "dish_product_id": "...",
  "ingredients": [{ "ingredient_product_id": "...", "quantity_per_unit": 0.5 }]
}
```

### `PATCH /api/recipes/:id`
Roles: Admin. Update ingredient list/quantities.

### `GET /api/recipes/yield-anomalies`
Roles: Admin. Query: `?from=&to=`. Compares recipe-predicted yield
(ingredients issued ÷ recipe quantity) against actual recorded
`production` for each Dish with a recipe defined, in the period. Returns
flagged divergences above a meaningful threshold. Informational only —
does not block anything.

---

## Stock Movements

> **Implemented Session 6 (2026-08-27).** The contract below reflects what
> shipped. Field names are **`camelCase`** in the JSON (matching the domain
> types, as Session 5 did for Catalog) — the `snake_case` in earlier drafts
> of this section is superseded. Quantities and money are decimal
> **strings** (`"12.5000"`, `"6000.00"`), never floats. Changes from the
> original spec: `opening` is a `POST` body here (not a separate endpoint);
> `POST /api/stock-movements/:id/accept` is added for the 2-phase transfer;
> `GET /api/stock-movements/balances` (batched derived-balance read) added
> Session 7 (ADR-40); `recordPurchasePayment` does **not** yet write a
> `MoneyMovement` (deferred to F3 — see ADR-39). Signed-quantity +
> 2-phase-transfer model: ADR-39.
> Success envelope is `{ "data": ... }`; errors use the standard shape.

### `GET /api/stock-movements`
Roles: Admin (all locations), Store Manager / Canteen Attendant (their
location only — resolved via `User.staff.locationId`). Cashier: `403`.
Query: `?productId=&locationId=&movementType=&date=` (`date` is a
`YYYY-MM-DD` business date, matched on `occurredAt` in the
`Africa/Nairobi` day). A location-bound caller passing another location's
`locationId` gets `[]`. Newest first.

Each row: `{ id, productId, locationId, movementType, quantity (signed
decimal string, from this row's location's perspective), recordedById,
occurredAt (ISO), reason, reasonNote, orderId, stockCountId,
transferCounterpartLocationId, purchasePaymentId, purchaseSupplier,
purchaseOrderedQty, purchaseTotalCost, purchasePaidFrom,
correctsMovementId, note, createdAt, updatedAt }`.

`purchaseSupplier` / `purchaseOrderedQty` (4dp decimal string) /
`purchaseTotalCost` (2dp decimal string) / `purchasePaidFrom` (`"cash"` |
`"mpesa_bank"`) are **non-null only on `purchase_payment` rows** (ADR-46
§3); `null` on every other movement type, and `null` on any legacy
payment row whose `note` didn't parse during the one-time backfill. The
`note` string is still written (a human sentence) but is no longer the
source of truth for these values.

### `POST /api/stock-movements`
Body is discriminated on `movementType`. Role allowed **varies by type**;
location-bound roles may only write at their own location (except
`production`, which is inherently Store → Restaurant). All return `201`
with the created row. Inputs take an **unsigned magnitude**; the domain
applies the sign.

- `opening` — Admin. `{ movementType: "opening", productId, locationId, businessDate (YYYY-MM-DD), quantity }`. Writes an `opening` row at that business day's start. A second call for the same product/location/date is a **correction** of the first (ADR-15), not a duplicate.
- `purchase_payment` — Admin. `{ movementType: "purchase_payment", productId, locationId, supplier, quantity, cost, paidFromAccount: "cash" | "mpesa_bank" }`. **No stock effect** (row stored with `quantity = 0`). `supplier` / `quantity` / `cost` / `paidFromAccount` are persisted to the real `purchaseSupplier` / `purchaseOrderedQty` / `purchaseTotalCost` / `purchasePaidFrom` columns (ADR-46 §3); a human `note` sentence is also composed for display. The `MoneyMovement` debit is **not** written yet — F3 owns it (ADR-39). The **payment-drawer product picker shows `ingredient` + `goods` only** (a `dish` is never purchased — ADR-33); the API does not reject a `dish` productId, the UI just never offers one.
- `purchase_receipt` — Store Manager / Canteen Attendant. `{ movementType: "purchase_receipt", productId, locationId, quantity, purchasePaymentId? }`. `+quantity` at `locationId`. `purchasePaymentId`, if given, must reference a real `purchase_payment` row → `404` otherwise.
- `issue` — Store Manager. `{ movementType: "issue", productId, locationId, quantity }`. `−quantity` at the Store (Store → cooking; single row).
- `production` — Store Manager. `{ movementType: "production", productId, locationId, quantity }`. `+quantity` at `locationId`, which **must be a `restaurant` location**; `productId` **must be `kind = "dish"`** → `400` otherwise.
- `transfer` — Store Manager / Canteen Attendant. `{ movementType: "transfer", productId, fromLocationId, toLocationId, quantity }`. **Phase 1 of 2:** writes the `−quantity` dispatch row at `fromLocationId` only (stock leaves now; `toLocationId` in `transferCounterpartLocationId`). Same from/to → `400`. Completed by `POST .../:id/accept`.
- `non_sale_consumption` — Admin / Store Manager / Canteen Attendant, location-scoped. `{ movementType: "non_sale_consumption", productId, locationId, quantity, reason, reasonNote? }`. `−quantity`. `reason` ∈ `staff_meal | complimentary | spoiled | damaged | other`; `reasonNote` **required iff `reason = "other"`** → `400` on `reasonNote`.

### `POST /api/stock-movements/:id/accept`
Phase 2 of a 2-phase transfer. `:id` is the pending dispatch (`−q`) row.
Roles: the receiving location's Store Manager / Canteen Attendant, or
Admin.
- No body / `{}` → **accept**: writes the `+quantity` counterpart at the
  destination, linked to the dispatch (`correctsMovementId` = dispatch id).
  `201`. Stock lands at the destination only now. Double-accept → `409`.
- `{ "flag": true, "note": "..." }` → **flag a discrepancy**: records the
  note on the pending dispatch row, releases **no** stock. `200`.

### `POST /api/stock-movements/:id/correct`
Body: `{ correctedQuantity (signed decimal string), note? }` — the
*corrected final quantity* of the target row; the domain computes
`delta = correctedQuantity − original.quantity` and writes a new row
(same type/product/location, `quantity = delta`, `correctsMovementId` set,
`occurredAt` = the original's). Returns `201` with the delta row.
Roles: if a `DayClose` exists for the original's business day → **Admin
only** (`403` otherwise); if the day is still open → Admin **or the
original recorder**. `delta = 0` → `400`.

### `GET /api/stock-movements/outstanding`
Roles: Admin only (`403` otherwise). Returns `{ awaitingReceipt: [...],
unmatchedReceipts: [...] }` — `purchase_payment` rows no `purchase_receipt`
links back to, and `purchase_receipt` rows with a null `purchasePaymentId`
(PRD §4.2). Each entry is a full movement row (same shape as `GET
/api/stock-movements`).

### `GET /api/stock-movements/balances`
**Added Session 7 (2026-08-27), ADR-40.** Batched derived-balance read —
the ledger's Opening column source (opening = the prior business day's
closing, ADR-11). Wraps the Session-6 domain fn
`getDerivedStockBalances`; no stored total.

Query: `?productIds=a,b,c&locationId=<id>&asOf=YYYY-MM-DD`. `productIds` is
comma-separated. `asOf` is a **business date** — the balance sums every
movement whose `occurredAt` is before the **end** of that Africa/Nairobi
day (that day's closing figure); omit `asOf` for "as of now".

Roles: same as `GET /api/stock-movements` — Admin (any location), Store
Manager / Canteen Attendant (their own location only; a foreign
`locationId` → `[]`). Cashier: `403`.

Returns `{ data: [{ productId, locationId, quantity }] }` — one entry per
requested id, `quantity` a signed decimal string, `"0.0000"` when the
product has no rows.

---

## Orders (Restaurant)

> **Implemented M2 Session 4 (2026-08-30).** The contract below reflects
> what shipped. `camelCase` JSON; money fields are decimal **strings**
> (`"230.00"`), line quantities decimal **strings** (up to 4dp). The
> Restaurant is the only order location — there is no `locationId` in the
> request. Cash / M-Pesa balances stay **derived** (Σ `MoneyMovement`);
> `Order.total` is a stored convenience value recomputed on every write
> and correction, never the source of truth. A Cashier never sees any
> buying price / unit cost / margin — an order payload carries none.

### `GET /api/orders`
Roles: **Admin** (all orders; `?cashierId=` narrows), **Cashier** (their
own only — a `?cashierId=` that isn't the caller returns `[]`, never
another cashier's rows; PRD §4.3). Any other role → `403`.

Query: `?cashierId=`, `?date=YYYY-MM-DD` (Africa/Nairobi business day,
windowed on `occurredAt`), `?paymentMethod=cash|mpesa|credit`,
`?orderType=dine_in|takeaway|delivery`.

Returns `{ data: OrderView[] }`, newest first (`occurredAt` desc, then
`createdAt` desc). An `OrderView` is
`{ id, number, locationId, cashierId, orderType, deliveryFee,
paymentMethod, customerId, total, correctsOrderId, occurredAt, createdAt,
updatedAt, lines: [{ id, productId, quantity, unitPrice, subtotal }] }`. A
correction row (`correctsOrderId` set) is returned as its **own row** with
`correctsOrderId` exposed (the Session 6 screen badges / links it) — reads
are not folded.

> **`number` added — M2 Session 6 (2026-08-30, owner-approved scope
> exception).** A human-readable, monotonic order number (`Int @unique
> @default(autoincrement())`) that staff and the Admin say out loud
> ("correct order 1043"). Rendered by A2 / A3 / C1 / C4. A correction is
> its own `Order` row and gets its own `number`; `correctsOrderId` links
> the pair. Deploy migration
> `20260830120000_m2_s6_order_number_product_category_repayment_detail`.
> The `Order` model previously had only a UUID `id`; the M2 screen designs
> assumed a spoken order number that did not exist.

### `POST /api/orders`
Roles: **Cashier only** (`403` otherwise). Body:
```json
{
  "orderType": "dine_in|takeaway|delivery",
  "deliveryFee": "150.00",
  "paymentMethod": "cash|mpesa|credit",
  "customerId": "…",
  "account": "cash|mpesa_bank",
  "occurredAt": "2026-08-30T09:00:00.000Z",
  "lines": [{ "productId": "…", "quantity": "2" }]
}
```
- `lines` non-empty; each `quantity` > 0.
- Each product must exist, not be soft-deleted, and have an **active**
  `ProductLocation` at the Restaurant with a non-null `sellingPrice` —
  that price is **snapshotted** as the line's `unitPrice` (SCHEMA §4
  "captured at time of sale"; never re-looked-up). Otherwise `400`,
  `field: "lines"` ("X is not sold at the Restaurant").
- `deliveryFee` is allowed **only** when `orderType = "delivery"` (and
  must be `≥ 0`); on any other order type a non-zero fee → `400`,
  `field: "deliveryFee"`.
- `paymentMethod = "credit"` ⇒ `customerId` **required** and must exist
  (`400`/`404`, `field: "customerId"`); any other payment method ⇒
  `customerId` must be **absent**.
- `account` is optional and only meaningful for a cash / M-Pesa order —
  it is otherwise **derived** from `paymentMethod` (`cash` → `cash`,
  `mpesa` → `mpesa_bank`); if supplied it must be consistent (`400`,
  `field: "account"`).
- `occurredAt` defaults to now; its Africa/Nairobi business day is what
  the edit-vs-correct gate later compares to "today".

**§3.8 — insufficient Restaurant stock (BLOCK).** For each distinct
product, the total ordered quantity is compared to the current derived
Restaurant balance, re-read **inside the write transaction**. If any
product is short → `400 VALIDATION_ERROR`, `field: "lines"`, naming every
short line and its available quantity. **No `Order`, `OrderLine`,
`StockMovement`, `MoneyMovement` or `Debt` row is written**, and the
balance is never driven negative.

On success `201` with the `OrderView`. In one transaction the order
writes: the `Order` + one `OrderLine` per line + one **negative** `sale`
`StockMovement` per line (`quantity = −lineQty`, `orderId` set) + **either**
one `MoneyMovement` (cash / M-Pesa: matching `account`, `amount = +total`,
`sourceType: "order"`, `sourceId` = order id) **or** one `Debt`
(`credit`: `amount = total`, `customerId` required, linked to the order —
**no `MoneyMovement`**, plan §3.2) + one `AuditLog` row
(`action: "create"`, `entityType: "order"`).

### `PATCH /api/orders/:id`
Roles: **Cashier only**, and only for **their own** order whose
Africa/Nairobi business day **is today**. Body: the same shape as
`POST` — a true edit fully re-states the order.

- Order missing → `404`. Another cashier's order → `403` ("You can only
  edit your own orders"). The order's business day has rolled → `403`
  ("This day is closed — ask an administrator to correct it") — M2 has no
  `DayClose` UI, so this is a business-date equality check; M3 swaps in
  the real `DayClose` gate.
- Re-runs **all** of `POST`'s validation, including §3.8. A true edit
  leaves **no ledger history** behind — it deletes this order's existing
  lines / `sale` movements / `MoneyMovement` / `Debt` and rewrites them,
  recomputing `total`. `AuditLog` `action: "correct"` (there is no `edit`
  action), `oldValue` / `newValue` = the pre/post summaries.

Returns `200` with the updated `OrderView`.

### `POST /api/orders/:id/correct`
Roles: **Admin only** (`403` for a Cashier — a cashier's open-day change
is `PATCH`; a post-close fix is the Admin's). Body: the **corrected final
state** of the order (same shape as `POST`).

- Original order missing → `404`. Target is itself a correction
  (`correctsOrderId` set) → `400` ("This order is itself a correction —
  correct the original"); corrections don't chain.
- Writes a **new `Order`** row (`correctsOrderId` = original id,
  `cashierId` = the original cashier — the Admin corrects on their
  behalf, `occurredAt` = the original's, so the correction lands in the
  same business day), its `OrderLine`s, plus **offsetting** ledger rows so
  the **net** effect across `original + all corrections` equals the
  corrected state: one delta `sale` `StockMovement` per changed product
  (`correctsMovementId` → the original's `sale` row where there is exactly
  one), one signed delta `MoneyMovement`, and/or one signed `Debt` — a
  payment-method change reverses one kind and writes the other. `AuditLog`
  `action: "correct"`, `entityType: "order"`, on the new row.
- §3.8 for the corrected state is measured against the balance **with the
  original order's `sale` movements added back** (replacing its effect,
  not stacking).
- **Idempotency:** deltas are computed against the *current* derived
  effect (original + prior corrections). Re-submitting an identical
  correction → `400 VALIDATION_ERROR` ("nothing to correct").

Returns `201` with the correcting `OrderView`.

---

## Canteen

> **Implemented M2 Session 5 (2026-08-30).** The contract below reflects
> what shipped. `camelCase` JSON; quantities are decimal **strings**
> (4dp, e.g. `"96.0000"`), money decimal **strings** (2dp, e.g.
> `"5760.00"`). The attendant never enters a sale — it is **derived**
> from a stock count over the period since that product's previous count
> (ADR-16): `sold = expectedRemaining − countedQuantity`, where
> `expectedRemaining` is the derived canteen balance for the product at
> the count's `occurredAt`. On a count the system writes the `StockCount`,
> one `sale` `StockMovement` (`quantity = −sold`, `stockCountId` set — so
> canteen sales sum into the same derived-balance / reporting paths as
> Restaurant sales), and — unless `sold = 0` — a revenue `MoneyMovement`
> (`sold × canteen sellingPrice`, `account: "cash"`,
> `sourceType: "canteen_sale"`, `sourceId` = the count id). Closing stock
> is **not** a stored row (ADR-11): after the `sale` row the derived
> balance at the count's instant equals `countedQuantity`. **No credit
> and no M-Pesa at the canteen** (PRD §4.4) — no `Debt`, no
> `paymentMethod`, `account` is always `cash`.

### `POST /api/canteen/stock-counts`
Roles: **Canteen Attendant only** (`403` otherwise; `403` too if the
attendant's `Staff` link has no location). Body:
`{ "productId": "...", "countedQuantity": "96", "occurredAt"?: ISO }`.
`countedQuantity` must parse to a decimal `≥ 0` (`400 VALIDATION_ERROR`,
`field: "countedQuantity"`). `occurredAt` defaults to now and must be
**after** the product's previous count at this canteen (`400`,
`field: "occurredAt"` — counts move forward so a period is well-defined).
The product must have an active canteen `ProductLocation` with a non-null
`sellingPrice` (`400`, `field: "productId"` — "X is not sold at the
canteen").

**Counted more than expected** (`sold` would be negative): `400
VALIDATION_ERROR`, `field: "countedQuantity"` ("Counted quantity exceeds
expected stock by N — record the missing receipt or transfer first, then
recount"). **Nothing is written.** (Owner decision 2026-08-30: reject
rather than allow a negative-sold reconciliation; the attendant undoes
the count same-day and re-records instead.)

Returns `201` with
`{ data: { count, derivedSale } }`:
- `count`: `{ id, productId, locationId, countedById, countedQuantity, occurredAt, createdAt }`.
- `derivedSale`: `{ unitsSold, revenue, periodStart, periodEnd }` —
  `unitsSold` a 4dp string (always `≥ 0`), `revenue` a 2dp string,
  `periodStart` the previous count's `occurredAt` ISO string or `null`
  for a first-ever count ("since the product's opening"), `periodEnd`
  this count's `occurredAt`.

Writes an `AuditLog` row (`action: "create"`, `entityType: "stock_count"`,
`newValue: { countedQuantity, sold, revenue }`).

### `DELETE /api/canteen/stock-counts/:id`
Roles: **Canteen Attendant only.** Undo a stock count **the caller
recorded today** (Africa/Nairobi). A count cannot be edited — it is
**hard-deleted** with its `sale` `StockMovement` and its `canteen_sale`
`MoneyMovement`, and re-recorded (owner decision 2026-08-30). `403
FORBIDDEN` for another attendant's count, or once the count's business
day has rolled ("This day is closed — ask an administrator to correct
this count" — an Admin correction path is a later session). `404
NOT_FOUND` for an unknown id. Returns `{ data: { voided: true } }`.
Writes a `hard_delete` `AuditLog` row.

### `GET /api/canteen/stock-counts`
Roles: Admin (every canteen), Canteen Attendant (their own canteen only).
Query: `?productId=` (one product), `?date=YYYY-MM-DD` (windows on the
latest count's `occurredAt`, Africa/Nairobi business day). Returns
`{ data: DerivedSaleView[] }`, newest count first, never-counted products
last. Each item:
`{ productId, productName, lastCountedAt, periodStart, periodEnd, unitsSold, revenue }`
— for the product's **most recent** count: `lastCountedAt` = that count's
`occurredAt`; `periodStart` = the previous count's `occurredAt` (or `null`
for a first count); `unitsSold` / `revenue` decimal strings. A canteen
product never counted comes back with every figure `null` (PRD §4.4 —
"per product, when it was last counted and what period a figure covers").

---

## Handovers

### `POST /api/handovers`
Roles: Cashier, Canteen Attendant. Body: `{ cash_declared, mpesa_declared }`.

### `POST /api/handovers/:id/receive`
Roles: Admin. Body: `{ cash_received, mpesa_received }`. Computes and
stores variance permanently. Writes `MoneyMovement` rows.

### `POST /api/handovers/:id/correct`
Roles: Admin only.

### `GET /api/handovers`
Roles: Admin (all), staff (own).

---

## Customers & Credit

> **Implemented M2 Session 3 (2026-08-29).** The contract below reflects
> what shipped. `camelCase` JSON; money fields are decimal **strings**
> (`"1200.00"`). Running balances are **derived** — `Σ debts − Σ
> repayments` — never stored (ADR-17). Every route is Admin **or**
> Cashier (PRD §4.6); nothing customer-side is per-cashier and no
> buying-price / margin field appears in any payload.

### `GET /api/customers`
Roles: Admin, Cashier. Query: `?search=` (case-insensitive contains on
`name` **or** `phone`), `?hasBalance=true` (only customers whose derived
balance ≠ 0). Returns `{ data: CustomerListRow[] }`, sorted by name. Each
item: `{ id, name, phone, balance, lastActivityAt }` — `balance` is a
signed decimal string (negative = overpaid / credit in hand);
`lastActivityAt` is the ISO max of the customer's debt/repayment
`occurredAt`, or `null`.

### `POST /api/customers`
Roles: Admin, Cashier. Body: `{ "name": "...", "phone": "..." }` (both
trimmed, non-empty; phone kept lenient — no format or uniqueness check).
Returns `{ data: Customer }` (`{ id, name, phone, createdAt, updatedAt }`),
`201`. Writes an `AuditLog` row.

### `GET /api/customers/:id`
Roles: Admin, Cashier. Returns `{ data: { customer, entries, balance } }`
— the customer's debt/repayment ledger, interleaved and ordered by
`occurredAt` then `createdAt`. Each entry:
`{ kind: "debt" | "repayment", amount, occurredAt, orderId?, orderNumber?,
account?, note?, runningBalance }` — `orderId` / `orderNumber` present only
on a debt (the order that created it); `account` (`"cash"` | `"mpesa_bank"`)
and `note` present only on a repayment; `runningBalance` accumulates
`+debt` / `−repayment`. `balance` is the final derived figure.
`404 NOT_FOUND` if the customer doesn't exist.

> **`orderNumber` / `account` / `note` added — M2 Session 6 (2026-08-30,
> owner-approved).** The A2 ledger "Reference" column (artboard ER9-0)
> renders "Order #1043" for a debt and "Cash" / "M-Pesa" / the note for a
> repayment; the entry previously carried only a debt's `orderId` (a
> UUID). `Repayment` gained `account` (`MoneyAccount`, default `cash`) and
> `note` (`String?`) columns — same deploy migration as `Order.number`.

### `POST /api/customers/:id/repayments`
Roles: Admin, Cashier. Body:
`{ "amount": "300.00", "account": "cash" | "mpesa_bank", "occurredAt"?: ISO, "note"?: "..." }`.
`amount` must be `> 0` (`400 VALIDATION_ERROR`, `field: "amount"`).
**Overpayment is allowed** — a repayment larger than the outstanding
balance succeeds and drives the derived balance negative. In one
transaction: writes the `Repayment`, a `+amount` `MoneyMovement`
(`sourceType: "repayment"`, `sourceId` = the repayment id, on the chosen
account), and two `AuditLog` rows. `occurredAt` defaults to now and is not
day-gated in M2 (no Day Close). Returns
`{ data: { id, customerId, amount, account, occurredAt, createdAt } }`,
`201`. `404 NOT_FOUND` for an unknown customer.

---

## Money

> **Implemented M2 Session 3 (2026-08-29).** The money ledger
> (`MoneyMovement`) is live. Balances are derived — `SUM(amount)` grouped
> by account over every row (ADR-17), no stored total. The write path
> (`recordMoneyMovement`) is internal: called by repayments now, by orders
> (S4) and canteen sales (S5) next. No public write route in M2.

### `GET /api/money/balances`
Roles: **Admin only** (`403` for every other role). Returns
`{ data: { cash, mpesaBank } }`, both decimal strings (may be negative).
No screen consumes this in M2 — it exists so QA and the owner walkthrough
can eyeball the ledger.

---

## Financials

### `POST /api/expenses`
Roles: Admin. Body: `{ category, amount, date, paid_from_account, note? }`.

### `POST /api/expenses/:id/correct`
Roles: Admin. Body: `{ corrected_amount, note? }`.

### `POST /api/owner-transactions`
Roles: Admin. Body: `{ type: "draw|return", amount, date, note? }`.

### `GET /api/financials/balances`
Roles: Admin. Returns derived Cash at hand, M-Pesa/Bank, "owed to
business" — each computed on read from `MoneyMovement`.

### `GET /api/financials/summary`
Roles: Admin. Query: `?location_id=&from=&to=`. Sales, cost, profit, debts,
expenses — per location and consolidated (PRD §4.7).

---

## Staff & Pay

### `GET /api/staff`
Roles: Admin.

### `POST /api/attendance`
Roles: Admin. Body: `{ staff_id, date, present }`.

### `POST /api/staff/:id/advances`
Roles: Admin. Body: `{ type: "advance|deduction", amount, date, note? }`.

### `GET /api/staff/:id/pay`
Roles: Admin. Query: `?month=`. Returns derived monthly pay
(daily_rate × days_present − advances/deductions).

### `POST /api/handovers/:id/shortfall`
Roles: Admin. Body: `{ staff_id, note }` (note required).

---

## Assets

> **Implemented Session 13 (2026-08-28).** The contract below reflects
> what shipped. The register is **mutable** (ADR-22) — `PATCH` is a true
> in-place edit, not a correction row (contrast the stock ledger). Field
> names are `camelCase` in the JSON. Money is a decimal **string**
> (`"45000.00"`); dates are `YYYY-MM-DD` calendar strings.

Success envelope is `{ "data": ... }`; errors use the standard shape.
An `AssetView` is
`{ id, name, locationId, locationName, locationType, purchaseDate,
purchaseCost, condition, deletedAt, createdAt, updatedAt }`.
`condition` is one of `"Good" | "Needs Repair" | "Decommissioned"`.

### `GET /api/assets`
Roles: Admin (M1 is Admin-only per ADR-22).
Query: `?search=` (case-insensitive `name` contains), `?locationId=`,
`?condition=Good|Needs Repair|Decommissioned`, `?includeDeleted=true`
(default hides soft-deleted rows). Returns `{ data: AssetView[] }`,
sorted by `name`.

### `POST /api/assets`
Roles: Admin. Body:
```json
{ "name": "...", "locationId": "...", "purchaseDate": "2025-01-15",
  "purchaseCost": "45000.00", "condition": "Good" }
```
`purchaseCost` must be `>= 0`; `purchaseDate` must not be in the future;
`locationId` must resolve to a real `Location`. Returns
`{ data: AssetView }`, `201`.

### `PATCH /api/assets/:id`
Roles: Admin. Two shapes on the same route:
- **Condition transition** — body `{ "condition": "Needs Repair" }` (that
  key alone). A plain condition move (ADR-22 — no approval workflow in
  M1).
- **Full edit** — the same body as `POST`. True in-place edit.

`404` if the asset is missing or soft-deleted. Returns
`{ data: AssetView }`.

### `POST /api/assets/:id/soft-delete`
Roles: Admin. Stamps `deletedAt`; the asset drops out of the default
`GET /api/assets` view (`?includeDeleted=true` still surfaces it).
Idempotent. Returns `{ data: { softDeleted: true } }`.

### `POST /api/assets/:id/restore`
Roles: Admin. Restore a soft-deleted asset (ADR-47 §4) — the mirror of
`.../soft-delete`. Clears `deletedAt`; the asset returns to the default
register view. Idempotent (restoring an active asset is a no-op success).
Returns `{ data: { softDeleted: false } }`.

### `POST /api/assets/:id/hard-delete`
Roles: Admin. Body `{ "confirmName": "..." }` must equal the asset name
**exactly** (case-sensitive) → else `400 VALIDATION_ERROR`
(`field: "confirmName"`). Returns `409 CONFLICT` if the asset has linked
history — in M1 that is any `AuditLog` row with
`entityType = "asset"` and `entityId = :id` (there is no maintenance-log
/ assignment table yet — ADR-22 keeps the surface small; when one lands,
its count joins the guard). The client renders the delete dialog's
blocked state, not a toast. Clean ⇒ the row is deleted. Returns
`{ data: { deleted: true } }`.

---

## Day Close & Audit

### `POST /api/day-close`
Roles: Admin. Body: `{ date }`. Locks all records dated to `date`.

### `GET /api/audit-log`
Roles: Admin. Query: `?entity_type=&entity_id=&user_id=&from=&to=`.

### `GET /api/reports/daily?date=`
Roles: Admin. Full reconciliation view for one date: expected vs. received
cash/M-Pesa, variances, sales, stock movements.

### `GET /api/reports/weekly` / `GET /api/reports/monthly`
Roles: Admin. Query: `?from=&to=` or `?month=`. Reconciled against
underlying daily records (PRD §4.10).
