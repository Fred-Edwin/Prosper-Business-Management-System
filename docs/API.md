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
Roles: Admin, Store Manager, Canteen Attendant. `buyingPrice` is stripped
to `null` for the non-Admin roles (they consume this for the stock-flow
product pickers and the mobile stock-levels views). `POST` stays Admin.
Query: `?kind=ingredient|dish|goods`, `?search=` (case-insensitive `name`
contains), `?includeArchived=true` (default excludes soft-deleted).
Returns `{ data: ProductWithLocations[] }`, sorted kind→name. Each item:
`{ id, name, kind, unitLabel, buyingPrice, deletedAt, createdAt,
updatedAt, locations: [{ locationId, locationName, locationType,
sellingPrice, active }] }`. Money fields are decimal **strings**
(`"580.00"`); `sellingPrice` is `null` when the location is stocked but
not sold.

### `POST /api/products`
Roles: Admin. Body:
```json
{ "name": "...", "kind": "ingredient|dish|goods", "unitLabel": "...",
  "buyingPrice": "580.00",
  "locations": [{ "locationId": "...", "sellingPrice": "850.00" | null, "active": true }] }
```
`buyingPrice` required for `ingredient`/`goods` (`>= 0`); ignored (forced
to `"0.00"`) for `dish` — ADR-33. Writes the product + one
`ProductLocation` per `locations[]` entry in one transaction. Returns
`{ data: ProductWithLocations }`, `201`.

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

### `GET /api/orders`
Roles: Admin (all), Cashier (own only).

### `POST /api/orders`
Roles: Cashier. Body:
```json
{
  "order_type": "dine_in|takeaway|delivery",
  "delivery_fee": 0,
  "payment_method": "cash|mpesa|credit",
  "customer_id": null,
  "lines": [{ "product_id": "...", "quantity": 1 }]
}
```
`customer_id` required if `payment_method = credit` — creates a `Debt`.
Writes a `StockMovement` (`sale`) per line.

### `POST /api/orders/:id/correct`
Roles: Cashier (own, same-day, before close), Admin (any, after close).
Body: full corrected line set + order-level fields.

---

## Canteen

### `POST /api/canteen/stock-counts`
Roles: Canteen Attendant. Body: `{ product_id, counted_quantity }`. Derives
and writes the `sale` `StockMovement` since the last count.

### `GET /api/canteen/stock-counts`
Roles: Admin (all), Attendant (own location). Includes last-counted date
and the period any derived sale figure covers (PRD §4.4).

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

### `GET /api/customers`
Roles: Admin.

### `POST /api/customers/:id/repayments`
Roles: Admin, Cashier. Body: `{ amount }`.

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
