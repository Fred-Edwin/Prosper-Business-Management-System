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

### `GET /api/locations`
Roles: all. Returns active locations.

### `GET /api/products`
Roles: all (buying price stripped for non-Admin).
Query: `?location_id=` to scope to what's sellable at a location.

### `POST /api/products`
Roles: Admin. Body: `{ name, kind, buying_price?, unit_label }`.
`buying_price` required for Ingredient/Goods; ignored (forced to `0`) for
Dish — see ADR-33.

### `PATCH /api/products/:id`
Roles: Admin. Non-ledger metadata edit (name, unit_label) — true edit, not
a correction (product catalog entries aren't a ledger).

### `POST /api/products/:id/soft-delete`
Roles: Admin.

### `POST /api/products/:id/hard-delete`
Roles: Admin. Body: `{ confirm_name }` (must match product name exactly).
Returns `409 CONFLICT` if any linked `StockMovement`/`OrderLine` exists.

### `POST /api/products/:id/locations`
Roles: Admin. Sets/updates `ProductLocation` (selling price, active flag)
for a location.

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

### `GET /api/stock-movements`
Roles: Admin (all), Store Manager/Attendant (their location only).
Query: `?product_id=&location_id=&movement_type=&date=`.

### `POST /api/stock-movements`
Roles vary by `movement_type`:
- `purchase_payment` — Admin only. Body: `{ product_id, location_id, supplier, quantity, cost, paid_from_account }`. Writes a `MoneyMovement` too; no stock effect.
- `purchase_receipt` — Store Manager/Attendant. Body: `{ product_id, location_id, quantity, purchase_payment_id? }`. Updates stock.
- `issue` — Store Manager. Body: `{ product_id, quantity }` (Store → cooking).
- `production` — Store Manager. Body: `{ product_id, quantity }` (adds Dish stock to Restaurant).
- `transfer` — Store Manager/Attendant. Body: `{ product_id, from_location_id, to_location_id, quantity }`.
- `non_sale_consumption` — any staff. Body: `{ product_id, location_id, quantity, reason, reason_note? }`. `reason_note` required if `reason = other`.

### `POST /api/stock-movements/:id/correct`
Roles: Admin only if the movement's date is closed; original recorder if
same-day and still open. Body: `{ corrected_quantity, note? }`.

### `GET /api/stock-movements/outstanding`
Roles: Admin. Returns purchase payments awaiting receipt and receipts
without a matching payment (PRD §4.2).

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

### `POST /api/assets`, `PATCH /api/assets/:id`, `POST /api/assets/:id/soft-delete`, `POST /api/assets/:id/hard-delete`
Roles: Admin. Same pattern as Products (hard-delete blocked if linked
history exists).

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
