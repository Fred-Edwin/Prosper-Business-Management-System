# Prosper — Data Model

**Status:** Approved. Reflects `DECISIONS.md` ADR-13 through ADR-26.

Conventions: all tables have `id` (uuid), `created_at`, `updated_at` unless
noted. Money/price columns are `NUMERIC`. See `CONVENTIONS.md` for naming
rules.

---

## Core principles (apply throughout this schema)

- **Ledgers, not totals.** Anywhere a "current amount" is needed (stock
  level, cash balance, customer balance, monthly pay), it is *derived* by
  summing rows in an append-only ledger table — never stored as a single
  mutable column. See ADR-14, ADR-17.
- **Corrections are new rows.** No row in a ledger table is ever updated
  after creation (except non-ledger metadata edits, e.g. a product's name).
  A correction is a new row referencing the one it corrects. See ADR-15.
- **Soft-delete via `deleted_at`.** Hard-delete only permitted where zero
  linked history exists (ADR-23).

---

## 1. Identity & Access

### `User`
Login account. Login is by unique display name + 4-digit PIN, not
email/password (see `DECISIONS.md` ADR-5 addendum) — this is a staff app
used on shared devices at the till, not a general web login.

| Column | Notes |
|---|---|
| name | unique — what staff type in at login |
| pin_hash | hash of a 4-digit PIN, not a free-text password |
| role | enum: `admin`, `store_manager`, `cashier`, `canteen_attendant` |
| staff_id | nullable FK → `Staff` (Admin has none) |
| active | |
| failed_pin_attempts | count since last successful login, for lockout |
| locked_until | nullable — set after repeated failed attempts (ADR-5 addendum) |

### `Staff`
Pay/attendance profile, distinct from login credentials.

| Column | Notes |
|---|---|
| name | |
| role | same enum as User.role |
| location_id | FK → `Location` |
| daily_rate | NUMERIC |
| active | |

---

## 2. Locations & Catalog

### `Location`
| Column | Notes |
|---|---|
| name | |
| type | enum: `restaurant`, `canteen`, `store` |
| active | |

### `Product`
| Column | Notes |
|---|---|
| name | |
| kind | enum: `ingredient`, `dish`, `goods` |
| buying_price | NUMERIC, nullable — Ingredient only. Dish is always `0` (see ADR-33) — its real cost is captured at the ingredient level, never per unit, to avoid double-counting. |
| unit_label | e.g. kg, pcs, crate, ream |
| deleted_at | nullable — soft-delete |

### `ProductLocation`
Join table: which locations sell a product, and at what price.

| Column | Notes |
|---|---|
| product_id | FK → `Product` |
| location_id | FK → `Location` |
| selling_price | NUMERIC, nullable — Dish/Goods only |
| active | sold at this location currently |

Unique on (`product_id`, `location_id`).

---

## 2a. Recipes (Informational Only — ADR-33)

Recipes never affect stock movements, COGS, or any profit figure (§14).
They exist purely so the Admin can see an estimated per-dish cost and spot
production-yield anomalies.

### `Recipe`
| Column | Notes |
|---|---|
| dish_product_id | FK → `Product` (kind = `dish`) |
| active | |

### `RecipeIngredient`
| Column | Notes |
|---|---|
| recipe_id | FK → `Recipe` |
| ingredient_product_id | FK → `Product` (kind = `ingredient`) |
| quantity_per_unit | NUMERIC — how much of this ingredient one unit of the dish is expected to use |

**Estimated cost per dish** (informational only, not COGS):
```
Estimated Dish Cost = Σ (RecipeIngredient.quantity_per_unit × Ingredient.buying_price)
```

**Yield anomaly flag** (Admin-only, informational, does not block anything):
compares actual recorded `production` StockMovement quantity for a Dish
against the yield the recipe would predict from the ingredient `issue`
quantity over the same period, and flags a meaningful divergence for the
Admin to investigate.

---

## 3. Stock Ledger

### `StockMovement`
Single unified ledger for every stock event. Current stock for a
product/location = signed sum of its rows.

| Column | Notes |
|---|---|
| product_id | FK → `Product` |
| location_id | FK → `Location` |
| movement_type | enum: `opening`, `purchase_payment`, `purchase_receipt`, `issue`, `production`, `transfer`, `sale`, `non_sale_consumption`, `stock_count`, `closing` |
| quantity | signed NUMERIC |
| recorded_by | FK → `User` |
| occurred_at | timestamp (business-day relevant — see CONVENTIONS.md) |
| reason | enum, nullable — required when `movement_type = non_sale_consumption`: `staff_meal`, `complimentary`, `spoiled`, `damaged`, `other` |
| reason_note | text, nullable — required if reason = `other` |
| order_id | FK → `Order`, nullable — set when `movement_type = sale` (Restaurant) |
| stock_count_id | FK → `StockCount`, nullable — set when derived from a canteen count |
| transfer_counterpart_location_id | FK → `Location`, nullable — set when `movement_type = transfer` |
| purchase_payment_id | FK → purchase payment record, nullable — links a receipt back to its payment, if any |
| purchase_supplier | text, nullable — **`purchase_payment` only** (ADR-46 §3). The supplier the payment was made to. |
| purchase_ordered_qty | NUMERIC(14,4), nullable — **`purchase_payment` only**. Ordered magnitude (the row's `quantity` stays `0` — no stock effect). |
| purchase_total_cost | NUMERIC(14,2), nullable — **`purchase_payment` only**. Total amount paid (money). |
| purchase_paid_from | text, nullable — **`purchase_payment` only**. `"cash"` or `"mpesa_bank"` — which balance the money left. |
| corrects_movement_id | FK → `StockMovement`, nullable, self-referencing — set when this row is a correction of an earlier row (ADR-15) |
| note | text, nullable — for `purchase_payment` rows this is a human display sentence composed from the four `purchase_*` columns, not the source of truth |

**`purchase_*` columns (ADR-46 §3):** promoted from a free-text `note` that
was regex-scraped client-side (`parsePaymentNote`, now deleted). Set only
for `movement_type = purchase_payment`; `null` on every other type, and
`null` on any pre-ADR-46 payment row whose `note` didn't parse during the
one-time backfill (`scripts/backfill-purchase-payment-detail.ts`). No
`MoneyMovement` is written — that boundary (ADR-39 §4) is unchanged.

**`purchase_payment_id` / purchase receipt matching:** payment and receipt
are both rows in this ledger (`purchase_payment` has no stock effect;
`purchase_receipt` does). They are linked when known but a receipt may
exist without a matching payment and vice versa — surfaced to the Admin as
"awaiting receipt" / "unmatched receipt" (PRD §4.2).

**Opening/closing stock:** not pre-written by a job (ADR-11). Computed on
read as the prior day's closing (sum of movements up to that day's close),
with any Admin manual adjustment applied as an `opening`-type correction
row.

---

## 4. Restaurant Sales

### `Order`
| Column | Notes |
|---|---|
| location_id | FK → `Location` (always Restaurant) |
| cashier_id | FK → `User` |
| order_type | enum: `dine_in`, `takeaway`, `delivery` |
| delivery_fee | NUMERIC, nullable — only if `order_type = delivery` |
| payment_method | enum: `cash`, `mpesa`, `credit` |
| customer_id | FK → `Customer`, nullable — required if `payment_method = credit` |
| total | NUMERIC, derived from lines + delivery fee (stored for convenience, recomputed on every write **and** correction) |
| occurred_at | DateTime, default `now()` — **added M2 Session 4**. The order's business instant (Africa/Nairobi, ADR-29). May be backdated by a correction so the correcting row lands in the original's business day. The edit-vs-correct gate (M2 soft check; M3 real `DayClose`) compares this to today. Migration `20260829140000_add_order_occurred_at`. |
| corrects_order_id | FK → `Order`, nullable, self-referencing — set on an append-only correction row (ADR-15); the corrected order's own row is never `UPDATE`d. |

### `OrderLine`
| Column | Notes |
|---|---|
| order_id | FK → `Order` |
| product_id | FK → `Product` |
| quantity | |
| unit_price | NUMERIC — captured at time of sale, not looked up later |
| subtotal | NUMERIC |

**Implemented M2 Session 4 (2026-08-30) — `createOrder` / `editOwnOrder` /
`correctOrder` (`lib/domain/sales`).** In one transaction a `createOrder`
writes: the `Order` + one `OrderLine` per line + one **negative** `sale`
`StockMovement` per line (`movement_type = sale`, `quantity = −lineQty`,
`order_id` set) + **either** one `MoneyMovement` (`source_type = order`,
`source_id` = order id, `account` = `cash` | `mpesa_bank`,
`amount = +total`) **for a cash / M-Pesa order** **or** one `Debt`
(`credit` order — no `MoneyMovement`, plan §3.2) + an `AuditLog` row.

**§3.8 no-negative-balance rule:** the total quantity ordered for a
product may not exceed its current derived Restaurant balance (re-read on
the write transaction). If it would, the write is **rejected in full** —
no row is written and the balance is never negative.

**Corrections are append-only** (ADR-15): `correctOrder` writes a **new**
`Order` (`corrects_order_id` set) plus offsetting `sale` `StockMovement`
(`corrects_movement_id` pointing at the original's row where singular),
`MoneyMovement` and/or `Debt` delta rows so the net effect equals the
corrected state. `editOwnOrder` (a Cashier's own, same-day order) is a
**true edit** — it deletes and rewrites its own lines / movements rather
than writing a correction row; history-preservation begins only after the
business day rolls.

---

## 5. Canteen Derived Sales

### `StockCount`
| Column | Notes |
|---|---|
| product_id | FK → `Product` |
| location_id | FK → `Location` (always Canteen) |
| counted_by | FK → `User` |
| counted_quantity | |
| occurred_at | |

**Implemented M2 Session 5 (2026-08-30) — `recordStockCount`
(`lib/domain/sales`).** On save, sold quantity since the product's last
count at this canteen is derived as
`expectedRemaining − counted_quantity`, where `expectedRemaining` is the
signed sum of every `StockMovement.quantity` for (product, canteen) up to
the count's `occurred_at` (opening + transfers-in + production −
non_sale_consumption − prior sales — ADR-11, computed on read, no stored
column). In one transaction the count writes:
- this `StockCount` row;
- one `StockMovement` — `movement_type = sale`, `quantity = −sold`,
  `stock_count_id` set (so canteen sales sum into the same
  derived-balance / reporting paths as Restaurant sales — ADR-16);
- unless `sold = 0`, one `MoneyMovement` — `source_type = canteen_sale`,
  `source_id` = this count's id, `account = cash`,
  `amount = +(sold × canteen ProductLocation.selling_price)`;
- an `AuditLog` row (`action = create`, `entity_type = stock_count`).

**Closing stock** = the counted value, **derived** (no row written): after
the `sale` row the derived balance at `occurred_at` equals
`counted_quantity`.

**Counted more than expected** (`sold` < 0) is **rejected**
(`VALIDATION_ERROR`, nothing written) — owner decision 2026-08-30. The
attendant instead undoes the count **same-day** via `voidStockCount`
(`DELETE /api/canteen/stock-counts/:id`), a **hard delete** of the
`StockCount` + its `sale` `StockMovement` + its `canteen_sale`
`MoneyMovement` (an `AuditLog` `hard_delete` row is kept). After the
Africa/Nairobi business day rolls the count is locked — an Admin
correction path (a new `StockCount` + offsetting rows, ADR-15) is a later
session. **There is no `corrects_stock_count_id` column today**; adding
that correction path needs a migration.

**No credit and no M-Pesa at the Canteen** (PRD §4.4) — no `Debt`, no
`payment_method`; the money row's `account` is always `cash`.

---

## 6. Money Ledger

### `MoneyMovement`
Single unified ledger for everything affecting Cash at hand or
M-Pesa/Bank. Current balance of either account = signed sum of its rows.

| Column | Notes |
|---|---|
| account | enum: `cash`, `mpesa_bank` |
| amount | signed NUMERIC |
| source_type | enum: `handover_receipt`, `expense`, `purchase_payment`, `owner_draw`, `owner_return`, `account_transfer`, `order`, `repayment`, `canteen_sale` |
| source_id | polymorphic FK → the originating record (ReceiptOfHandover, Expense, StockMovement[purchase_payment], OwnerTransaction, Order, Repayment, StockCount) |
| recorded_by | FK → `User` |
| occurred_at | |
| corrects_movement_id | FK → `MoneyMovement`, nullable, self-referencing |
| note | text, nullable |

The write path is `lib/domain/financials.recordMoneyMovement` (internal —
no route). Exercised for: `repayment` (S3 — a customer debt repayment,
`+amount`); `canteen_sale` (S5 — Canteen derived-sale revenue, `+`,
`account = cash`, `source_id` = the `StockCount` id, deleted by
`voidStockCount`); **`order` (S4 — a cash / M-Pesa Restaurant order's
revenue, `+total`, `account` = the matching account, `source_id` = the
order id; a `credit` order writes a `Debt`, not a money row)**; and
**`purchase_payment` (S4 — resolves the M1 `purchases.ts` `TODO(mock)`,
ADR-39 §4: a supplier payment now also writes one `−cost` `MoneyMovement`
against `purchase_paid_from`, `source_id` = the `purchase_payment`
`StockMovement` id, inside the same transaction)**.
Migration: `20260829130000_add_m2_money_source_types` (`ALTER TYPE …
ADD VALUE`, no table change; applied to the dev DB via `prisma db push`).

---

## 7. Handover & Reconciliation

### `Handover`
Staff-declared amounts at day end.

| Column | Notes |
|---|---|
| staff_id | FK → `Staff` |
| location_id | FK → `Location` |
| cash_declared | NUMERIC |
| mpesa_declared | NUMERIC |
| occurred_at | |
| corrects_handover_id | FK → `Handover`, nullable, self-referencing |

### `ReceiptOfHandover`
Admin-confirmed amounts actually received.

| Column | Notes |
|---|---|
| handover_id | FK → `Handover` |
| cash_received | NUMERIC |
| mpesa_received | NUMERIC |
| cash_variance | NUMERIC — `cash_received − cash_declared`, stored permanently at time of receipt (ADR-18), not recalculated |
| mpesa_variance | NUMERIC — same, for M-Pesa |
| recorded_by | FK → `User` (Admin) |
| occurred_at | |

Writes a `MoneyMovement` row per account for the received amounts.

> **Open item (PRD §7, Q2):** M-Pesa routing (direct-to-Admin vs.
> staff-held) is unconfirmed. This schema assumes the physical-handover
> model. Revisit if M-Pesa is confirmed to bypass staff.

---

## 8. Customers & Credit

### `Customer`
| Column | Notes |
|---|---|
| name | |
| phone | |

Running balance is derived: sum of `Debt.amount` minus sum of
`Repayment.amount` for that customer — never a stored column (ADR-17).
`lib/domain/customers.listCustomers` computes it set-wise (two grouped
sums), `getCustomerLedger` interleaves the two tables with a running
balance. Overpayment is allowed, so the balance may be negative (credit
in hand). No phone format or uniqueness constraint.

### `Debt`
| Column | Notes |
|---|---|
| customer_id | FK → `Customer` |
| order_id | FK → `Order` — created automatically on a Credit order |
| amount | NUMERIC |
| occurred_at | |

Written only by `createOrder` (S4) for a `credit` order, inside its
transaction. S3 ships a tx-only `lib/domain/customers.recordDebt` helper
for S4 to call; S3 itself only reads `Debt` (for balances / the ledger).

### `Repayment`
| Column | Notes |
|---|---|
| customer_id | FK → `Customer` |
| amount | NUMERIC |
| recorded_by | FK → `User` (Admin or Cashier) |
| occurred_at | |

No supplier credit is tracked (PRD §4.6).

---

## 9. Expenses & Owner Transactions

### `Expense`
| Column | Notes |
|---|---|
| category | enum: `rent`, `utilities`, `transport`, `gas_fuel`, `salaries`, `repairs`, `other` |
| amount | NUMERIC |
| date | |
| paid_from_account | enum: `cash`, `mpesa_bank` |
| note | text, nullable |
| recorded_by | FK → `User` |
| corrects_expense_id | FK → `Expense`, nullable, self-referencing |

Writes a `MoneyMovement` row (negative, on `paid_from_account`).

### `OwnerTransaction`
| Column | Notes |
|---|---|
| type | enum: `draw`, `return` |
| amount | NUMERIC |
| date | |
| note | text, nullable |

Writes a `MoneyMovement` row (Cash at hand). "Owed to business" balance is
derived: sum of `draw` amounts minus sum of `return` amounts.

---

## 10. Staff, Attendance, Pay

### `Attendance`
| Column | Notes |
|---|---|
| staff_id | FK → `Staff` |
| date | |
| present | boolean, default true |

Unique on (`staff_id`, `date`).

### `Advance` / `Deduction`
| Column | Notes |
|---|---|
| staff_id | FK → `Staff` |
| type | enum: `advance`, `deduction` |
| amount | NUMERIC |
| date | |
| note | text, nullable |

Monthly pay is derived, not stored: `daily_rate × days_present −
advances/deductions for the month`, computed on demand. This derived
`net_pay` is **not floored** — it may be negative when advances +
deductions exceed gross (ADR-60).

### `StaffPayout` (M4 S9A, ADR-60)
| Column | Notes |
|---|---|
| staff_id | FK → `Staff` |
| month | `@db.Date`, stored as the 1st of the covered calendar month |
| net_paid | `NUMERIC(12,2)` — net disbursed, recomputed from the ledger at record time, always > 0 |
| date | `@db.Date` — the business day the disbursement is dated to (day-close gated) |
| paid_from_account | enum `MoneyAccount` (`cash` \| `mpesa_bank`) |
| recorded_by | FK → `User` |
| expense_id | FK → `Expense`, **unique** — the one Salaries `Expense` this payout created (which carries the paired `MoneyMovement`) |

Unique on (`staff_id`, `month`) — a staff-month can be paid at most once,
enforced by the database. Recording a payout does **not** write a bespoke
`MoneyMovement`; it goes through `recordExpense`, so Cash and Net Profit
move exactly once through the shared path. No new `MoneySourceType`.
Reversal = correct the linked `Expense` to zero (ADR-60); a first-class
void is deferred.

### `HandoverShortfall`
| Column | Notes |
|---|---|
| receipt_of_handover_id | FK → `ReceiptOfHandover` |
| staff_id | FK → `Staff` |
| note | required |

Does not auto-deduct pay or block day-close (PRD §4.8).

---

## 11. Assets

### `Asset`
| Column | Notes |
|---|---|
| name | required, trimmed non-empty |
| location_id | FK → `Location` |
| purchase_date | `@db.Date` (calendar date, no time) — not in the future |
| purchase_cost | `NUMERIC(12,2)` — `Decimal` in code, never a float (ADR-30) |
| condition_status | text; the app enforces `Good` \| `Needs Repair` \| `Decommissioned` (matches the `<ConditionChip>` kit component + `component-states.md` C14). Stored as the display string. |
| deleted_at | nullable — soft-delete (ADR-23); hidden from the default `listAssets` read |
| created_at / updated_at | standard |

**Implemented Session 13.** The register is **mutable** (ADR-22) —
`updateAsset` is a true in-place edit, not a correction row; contrast the
append-only stock ledger (ADR-15 / ADR-39). `transitionCondition` is a
plain `condition_status` update (no approval workflow in M1) routed
through the domain so a later audit-log hook has one seam.

Hard-delete permitted only if no linked history exists (ADR-23). In M1
the only history an asset can accrue is `AuditLog` rows
(`entity_type = "asset"`) — there is no maintenance-log or assignment
table yet. The guard (`hardDeleteAsset`) counts those; when such a table
is added, its count joins the guard, mirroring `hardDeleteProduct`. No
schema change was needed for F3 — the table above already carried every
field.

---

## 12. Day Close

### `DayClose`
| Column | Notes |
|---|---|
| date | unique |
| closed_by | FK → `User` (Admin) |
| closed_at | |

Presence of a row for a date is the single source of truth that date is
locked. Checked wherever the "closed day → Admin-only correction" rule
applies (ADR-15, ADR-24).

---

## 13. Audit Trail

### `AuditLog`
| Column | Notes |
|---|---|
| user_id | FK → `User` |
| action | e.g. `create`, `correct`, `soft_delete`, `hard_delete`, `login` |
| entity_type | e.g. `Product`, `Expense` |
| entity_id | |
| old_value | JSON, nullable |
| new_value | JSON, nullable |
| occurred_at | |

Primarily captures what isn't already self-evident from ledger tables:
logins, non-ledger metadata edits, deletes. Ledger corrections are already
traceable via `corrects_*_id` self-references but are also logged here for
a single unified audit view.

---

## 14. Financial Reporting Formulas

None of these are stored — every figure below is computed on read, for a
given date range and optionally a given location, from the ledger tables
already defined above. This section is the single source of truth for how
`GET /api/financials/summary` and `GET /api/reports/*` (see `API.md`)
calculate each number.

### Revenue
```
Revenue = value of all `sale`-type StockMovement rows in the period
        (Restaurant Order lines + Canteen derived sales, at selling price)
```

### Cost of Goods Sold (COGS)

> **SUPERSEDED by ADR-55 (Milestone 3 Session 4).** The
> ingredients-only / per-kind split described below was never the
> client's actual method. COGS is now **one all-stock valuation sweep**
> over every product at every location, with dishes valued at zero.
> The formula below is kept only as the historical record of what these
> docs said before; `getFinancialSummary` implements ADR-55, and the M5
> Audit Trail / day-detail screens read against ADR-55, not this. Fixed
> in M5 Session 11 — this was the last unreconciled doc.

**The live formula (ADR-55).**

Every product has one **cost value**: `buying_price` for `ingredient`
and `goods`, and **0** for `dish` (double-counting is prevented by
dishes valuing at zero, not by excluding them — the ingredients that
became a dish were already counted as ingredients).

```
COGS (period) = opening stock value + purchases value − closing stock value
```
summed as `Σ quantity × costValue(product)` over **every**
`StockMovement` for that product/location:

- **Opening value** — movements with `occurred_at <` period start.
- **Closing value** — movements with `occurred_at <` period end.
- **Purchases value** — `purchase_receipt` movements **only**, in the
  period. NOT production, NOT transfers, NOT opening adjustments.
- **Transfers between the business's own locations net to zero** by
  construction (not in the purchases term; the two signed legs cancel
  across the opening/closing deltas).

Per-location COGS is the same sweep restricted to one location. Revenue
and COGS (hence gross profit) are location-attributable; `Expense` rows
carry no location, so total expenses / net profit / debts are
consolidated only.

**Non-sale consumption** (`staff_meal` / `complimentary` / `spoiled` /
`damaged` / `other`) is a **separate report**, a view *into* COGS — it is
NOT added on top and does NOT reduce gross/net profit. The wasted stock
already left the ledger and is already inside the sweep. Dish waste is
valued at `dishWasteCostPercent × selling_price` (a configurable proxy,
`DISH_WASTE_COST_PERCENT`, default 0.60); ingredient/goods waste at
`buying_price`.

~~**Goods** — COGS uses the real per-unit buying price:~~
```
Goods COGS = Σ (quantity sold × Product.buying_price) over `sale` movements in the period   [SUPERSEDED]
```

~~**Dishes** — COGS is *not* per-dish. It's the blended cost of all
ingredients actually consumed across the whole business in the period,
regardless of which dish they went into (ADR-33). This is why `Dish.
buying_price` is always `0` — counting a per-dish cost on top of this
would double-count:~~
```
Dish COGS (period) = opening Ingredient stock (period start)
                    + Ingredient purchase receipts (period)
                    − closing Ingredient stock (period end)                                 [SUPERSEDED]
```

~~**Ingredients** — never sold directly, no COGS entry of their own; their
cost is captured via the Dish COGS formula above.~~

```
Total COGS = Goods COGS + Dish COGS                                                         [SUPERSEDED — see ADR-55]
```

(Recipes, §2a, still give an informational per-dish estimate for the
Admin's own reference — never used in any COGS calculation, old or new.)

### Gross Profit
```
Gross Profit = Revenue − COGS
```

### Total Expenses
```
Total Expenses = Σ Expense.amount in the period
```
Includes a `salaries` category `Expense` entry when the Admin manually
logs a salary payment. Calculated `Staff` pay (ADR-21) is a separate,
informational "amount owed" figure — it does **not** automatically feed
into Total Expenses, since payroll disbursement happens outside the system
(PRD §6) and the Admin logs what she actually paid as its own Expense.
This is a deliberate choice, confirmed during design: keeps "what's owed"
and "what was paid" distinctly visible rather than assumed equal.

### Net Profit
```
Net Profit = Gross Profit − Total Expenses
```

### Cash Position
```
Cash at Hand balance = Σ MoneyMovement.amount where account = cash
M-Pesa/Bank balance  = Σ MoneyMovement.amount where account = mpesa_bank
```

### Debts Outstanding
```
Total Debt Outstanding = Σ Debt.amount − Σ Repayment.amount (per customer, and summed)
```

### Owed to Business (from owner draws)
```
Owed to Business = Σ OwnerTransaction.amount where type = draw
                  − Σ OwnerTransaction.amount where type = return
```

### Handover Variance
```
Variance = ReceiptOfHandover.cash_received  − Handover.cash_declared
Variance = ReceiptOfHandover.mpesa_received − Handover.mpesa_declared
```
Stored permanently at time of receipt (ADR-18), not recalculated.

All of the above respect corrections: since every ledger row a correction
touches is itself just another row (ADR-15), summing "all rows in the
period" automatically reflects corrections with no special-casing needed
in these formulas.
