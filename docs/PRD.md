# Prosper — Product Requirements Document

**Status:** Aligned — ready for Phase 2 (Technical Foundation)
**Source:** `docs/discovery.md` + Session 1 (Product Manager alignment)

---

## 1. Overview

Prosper is a mobile-first business management system that replaces an Excel-based
workflow for a food business operating across three locations:

- **Restaurant** — kitchen, dine-in, takeaway, and delivery sales.
- **Canteen** — a university-based shop selling items transferred from the
  restaurant plus its own stock.
- **Store** — a non-selling location where purchased ingredients are held
  before use.

The system tracks stock, sales, money, and people across all three locations,
and gives the Admin a single, trustworthy daily reconciliation: what should
have been sold, what cash and M-Pesa actually came in, and where the two
disagree.

The core problem being solved is **trust and visibility**. Records are
currently kept in Excel and sometimes lost. The Admin cannot easily verify
that what staff hand over in cash matches what was actually sold. Prosper
makes that check automatic, keeps a permanent history, and gives the Admin a
full financial picture — profitability, debts, expenses, and her own draws
from the business — from her phone or laptop.

---

## 2. Target Users

All users access the system from their own personal phones (no shared
terminal/POS hardware). The Admin also uses a laptop.

| Role | Location | Responsibilities |
|---|---|---|
| **Admin** | All | Owns the business. Sets the catalog and prices, pays for purchases, adjusts opening/closing stock, records handover receipts, records expenses, manages staff pay and attendance, views all financials and the audit trail, closes each day. |
| **Store Manager** | Restaurant/Store | Confirms receipt of purchases into the Store, records issues (stock taken to cook), records production output. |
| **Cashier** (×2) | Restaurant | Records orders (dine-in/takeaway/delivery), payment method, credit sales; records end-of-day handover. |
| **Canteen Attendant** | Canteen | Confirms receipt of purchases into the Canteen, records stock counts (derives sales), records non-sale consumption and transfers as they happen; records end-of-day handover. |

Access is role-scoped: staff see only their own entries and stock/sales
screens. Buying prices, unit costs, margins, and all financial reporting are
Admin-only. Staff cannot see each other's data.

---

## 3. Domain Language

Used consistently across UI, code, and database.

**Places:** Location (generic) → Restaurant, Canteen, Store.

**Products** (`product_kind`):
- **Ingredient** — bought to be cooked, never sold (flour, oil, gas). Has a buying price only.
- **Dish** — cooked in-house, then sold (chapati, samosa). Buying price is
  fixed at zero — its true cost is captured at the ingredient level (see
  Cost of Goods Sold, below), not per dish, to avoid double-counting.
- **Goods** — bought ready-made, sold as-is (soda, pens, logbooks, biscuits). Has both a buying price and a selling price.

A product is one catalog record; each location it's sold at has its own
stock ledger and its own selling price.

**Stock movements** (`movement_type`), always signed, always against one
product at one location:

| Term | Meaning | Recorded by |
|---|---|---|
| Opening stock | Carried from yesterday's closing; Admin-adjustable | auto |
| Purchase payment | Admin pays for/orders stock — hits Cash at hand / M-Pesa, no stock effect yet | Admin |
| Purchase receipt | Store Manager or Attendant confirms what actually arrived — this is what updates stock. **Ingredients land at the Store; goods land at the Restaurant/Canteen** (ADR-67). Received by **destination**, not by the receiver's home location (ADR-69): Store Manager → Store + Restaurant, Attendant → Canteen | Store Manager (Store, Restaurant) / Attendant (Canteen) |
| Issue | **Ingredient** stock taken from the Store to be cooked (ADR-67 — never a dish or goods) | Store Manager |
| Production | Dishes added to Restaurant stock | Store Manager |
| Transfer | **Dish or goods** stock moved **between the Restaurant and the Canteen** (either direction). Never touches the Store; never an ingredient (ADR-67) | Store Manager / Attendant |
| Sale | Stock sold, money due | Cashiers (direct) / Canteen (derived) |
| Non-sale consumption | Stock gone without a sale — reason required (Staff meal, Complimentary, Spoiled, Damaged, Other) | Any staff |
| Stock count | Physical count of what remains | Attendant / Store Manager |
| Closing stock | What's left at day end; becomes tomorrow's opening; Admin-adjustable | auto |

**Where a product lives (ADR-67).** Ingredients are stocked at the Store
only. Dishes and goods are stocked at the Restaurant and the Canteen only
— never at the Store, not even a goods delivery in transit. This is
enforced in the stock domain, not just by convention.

Issues and production are independent events (loose coupling) for stock
and financial purposes — no recipe/BOM linkage drives cost or stock
deduction. **Recipes exist only as an optional, informational tool** (see
§4.11): the Admin may define expected ingredient quantities per Dish to
see an estimated per-dish cost and flag production-yield anomalies. A
recipe never affects stock movements, COGS, or any profit figure.

**Cost of Goods Sold (COGS)** is derived from the stock ledger — never
entered per dish (see ADR-55 for the full model and reasoning).

Every product has a **cost value** used for stock valuation:

| Kind | Cost value |
|---|---|
| Ingredient | its buying price |
| Goods | its buying price |
| Dish | **0** — its cost is captured at the ingredient level; counting a dish cost on top would double-count the same food |

COGS is one sweep across **all products at all locations**:
```
COGS (period) = opening stock value
              + purchases value          ← purchase RECEIPTS only
              − closing stock value
```
where each valuation is `quantity × cost value`. Scoping that matters:

- **"Purchases" means purchase receipts only** — not production, not
  transfers, not opening adjustments. Only stock the business actually
  bought in counts as "added".
- **Transfers between the business's own locations are excluded.** Nothing
  entered the business — stock only moved (e.g. Store → Canteen). Counting
  both sides would inflate the figure.
- Production adds a Dish, valued at 0, so it contributes nothing by
  construction — but the scoping above is explicit, not incidental.

Because dishes value at 0, this reduces to "the cost of the ingredients
and goods that left the business," which is the intent. This blended
figure is the true food/goods cost for the period, in the financial
reports (§4.7).

**Non-sale consumption cost is a SEPARATE report — a view INTO COGS, not
an addition on top of it.** Wasted / staff-meal / complimentary stock has
already left the ledger and is already inside the COGS sweep above. The
Admin still wants to see what that cost, broken out by reason, so it is
reported separately (§4.7). Valuation per consumed unit:

| Kind | Non-sale consumption cost |
|---|---|
| Ingredient / Goods | buying price × quantity |
| Dish | `dishWasteCostPercent` × selling price × quantity |

`dishWasteCostPercent` is a **configurable** cost proxy (ADR-55; default
**60%**) — a Dish selling at KES 100 is assumed to have cost ~KES 60 to
make. It stands in for the buying price a Dish does not have, and is used
**only** in this separate report — never in COGS, Gross Profit or Net
Profit.

**Money:** Order, Order type (Dine-in/Takeaway/Delivery, delivery orders may
carry a delivery fee), Payment method (Cash/M-Pesa/Credit), Credit sale,
Customer (name, phone, running balance), Debt, Repayment, Expense, Handover
(staff declaring cash + M-Pesa given to Admin), Receipt of handover (Admin
confirming what she got), Variance, Cash at hand, Owner draw, Owner return,
Day close.

**Assets:** Equipment/furniture with lasting value (fridges, cookers, gas
cylinders, tables, POS phones) — distinct from stock; never sold or consumed.

**People:** Admin, Store Manager, Cashier, Canteen Attendant.

---

## 4. Functional Requirements

### 4.1 Catalog & Products
- As the Admin, I can create a product as an Ingredient, Dish, or Goods, and set its buying price, unit cost, or selling price as applicable to its type.
- As the Admin, I can choose which locations a product is sold at, and set a different selling price per location.
- As the Admin, I can set a unit label per product (kg, pcs, crate, ream) — no unit conversion is performed by the system.
- As the Admin, I can soft-delete a product, removing it from the UI while keeping its history in the database.
- As the Admin, I can hard-delete a product, with confirmation friction (retyping the product name), permanently removing it from the database.

### 4.2 Store & Stock Movements
- As the Admin, I can record a purchase payment — supplier, what was ordered, quantity, cost, location it's destined for — which is deducted from Cash at hand or M-Pesa/Bank immediately. This does not yet affect stock.
- As the Store Manager or Canteen Attendant, I can confirm receipt of a purchase — the quantity that actually arrived. This is what updates stock, independent of whether a matching payment exists yet. **Ingredient deliveries land at the Store; goods deliveries land at the Restaurant (or Canteen) — goods never sit at the Store (ADR-67).** The Store Manager's Receive screen lists everything delivered and routes each line to the right location automatically.
- **Who receives what is decided by the delivery's destination, not by where the receiver works (ADR-69):** the Store Manager sees and receives everything destined for the **Store or the Restaurant** (ADR-67 splits ingredients and goods between exactly those two); the Canteen Attendant sees and receives everything destined for the **Canteen**, on their own Receive Goods screen. Goods still also reach the Canteen by transfer from the Restaurant — a direct Canteen delivery is an addition to that path, not a replacement.
- As the Admin recording a purchase payment, I can only pick a destination that is legal for the product's kind (ADR-69 §2b): an **ingredient** may only be destined for the **Store**, **goods** only for the **Restaurant or Canteen**. This stops a payment being recorded whose receipt could never be posted.
- As the Admin, I can see any purchase payment awaiting receipt, and any receipt recorded without a matching payment, so nothing outstanding is hidden.
- As the Admin, when a receipt's quantity differs from the quantity paid for, I can see the variance. Stock always reflects what was received; the payment record is not auto-adjusted.
- As the Store Manager, I can record an issue — ingredient stock taken from the Store for cooking (only ingredients; only from the Store — ADR-67).
- As the Store Manager, I can record production — quantity of a Dish produced, added to Restaurant stock.
- As the Store Manager or Canteen Attendant, I can record a transfer of dish/goods stock between the Restaurant and the Canteen, in either direction. A transfer never touches the Store and never moves an ingredient (ADR-67); the destination is auto-resolved (Restaurant sends to Canteen and vice versa), not picked.
- As the Admin, opening stock automatically carries forward from the prior day's closing stock, for every product/location, and I can manually adjust it.
- As the Admin, closing stock automatically carries forward to become the next day's opening stock, and I can manually adjust it.
- As any relevant staff member, I can record non-sale consumption of stock with a required reason (Staff meal, Complimentary, Spoiled, Damaged, Other + note).

### 4.3 Restaurant Sales
- As a Cashier, I can create an order: add one or more products, select order type (Dine-in/Takeaway/Delivery), add a delivery fee if the order type is Delivery, select payment method (Cash/M-Pesa/Credit), and save it as a completed sale.
- As a Cashier, if payment method is Credit, I must attach the order to a Customer record and it creates a Debt.
- As a Cashier, I can edit my own orders until the day is closed. I cannot delete orders — corrections are made as an explicit correction entry, preserving history.
- As a Cashier, I cannot see orders recorded by the other cashier.
- As a Cashier, I cannot see buying prices, unit costs, or margins.

### 4.4 Canteen Sales (Derived)
- As the Canteen Attendant, I can perform a stock count for any product at any time — there is no fixed daily requirement per product.
- As the system, given a stock count, I calculate units sold and revenue for the period since that product's last count, as: `opening + received (transfers/production) − non-sale consumption − counted remaining = sold`, and set closing stock to the counted remaining value.
- As the Canteen Attendant, no credit sales are supported at the canteen.
- As the Admin, I can see, per product, when it was last counted and what period any derived sales figure covers.

### 4.5 Handover & Reconciliation
- As a Cashier or Canteen Attendant, at day end I record a handover: cash amount and M-Pesa amount I am giving to the Admin.
- As the Admin, I record receipt of each handover — the actual cash and M-Pesa amount I received from each staff member.
- As the system, I calculate and permanently store the variance (expected vs. received) for each handover.
- As the Admin, for canteen products not counted that day, I see the resulting cash as an unattributed balance, which settles and is explained once the next stock count for that product lands.
- As the Admin, I can close a day. Closing locks all records for that date; after close, only the Admin can amend them, and every amendment is written to the audit trail. Before close, staff can edit their own same-day entries.

### 4.6 Customers & Credit
- As the Admin, I can view a list of customers with credit balances and payment history.
- As the Admin or Cashier, I can record a repayment against a customer's debt.
- No supplier credit is tracked — all purchases are treated as paid.

### 4.7 Financials
- As the Admin, I can record a business expense (category: Rent, Utilities, Transport, Gas/Fuel, Salaries, Repairs, Other; amount; date; paid-from account; note).
- As the Admin, I maintain two balances — Cash at hand and M-Pesa/Bank — updated by handovers, expenses, purchases, and transfers between the two.
- As the Admin, I can log an owner draw (money taken out) or an owner return (money put back), each affecting Cash at hand and a running "owed to business" balance.
- As the Admin, I can view a full financial picture: sales, cost, profit, debts owed to the business, and expenses, broken down per location and consolidated.
- As the Admin, profit is calculated as: Revenue − Cost of Goods Sold =
  Gross Profit; Gross Profit − Total Expenses = Net Profit. Cost of Goods
  Sold for Dishes is the derived ingredient-consumption figure (§3), not a
  per-dish entered cost. Recording a staff **payout** (§4.8) creates one
  Salaries `Expense` for the net amount, which reduces Net Profit like any
  other expense — payroll disbursement now happens inside the system
  (ADR-60). Merely *calculated* pay for a month not yet paid does not
  affect Net Profit; only the payout does.

### 4.8 Staff & Pay
- As the Admin, I can mark staff attendance daily (default present, flag absences).
- As the Admin, monthly pay is calculated as daily rate × days present.
- As the Admin, I can record salary advances and deductions against a staff member, netted off monthly pay.
- As the Admin, I can **pay** a staff member for a month — recording the
  payout. The net amount is recomputed from the ledger at that moment
  (daily rate × days present − advances − deductions); it is never
  entered by hand. Recording a payout creates one Salaries `Expense` for
  the net amount, which is what moves Cash and reduces Net Profit — there
  is exactly one expense per payout, through the same path as any other
  expense (ADR-60). Payroll disbursement happens **inside** the system.
  - A staff-month can be paid at most once (enforced in the database).
  - A future month cannot be paid; a payout dated to a closed day is
    rejected like any other create.
  - If advances + deductions exceed what was earned, net pay is negative
    and the payout is refused — the over-advance stays on the books as
    the recorded adjustments until the Admin posts a correcting entry; it
    is neither written off nor auto-carried to another month.
  - "Pay all unpaid" pays every unpaid active staff member for the month
    in one action, one Salaries `Expense` each, skipping (with a reason)
    anyone already paid or whose net is zero or less.
- As the Admin, I can record handover shortfalls with a required note against the responsible staff member; shortfalls do not block day-close, **do not auto-deduct pay, and never reduce a payout** (unchanged by ADR-60).

### 4.9 Recipes (Informational)
- As the Admin, I can optionally define a recipe for a Dish — the
  ingredients and quantities expected to go into producing one unit — at
  my own leisure. Not required in order to sell or produce a Dish.
- As the Admin, I can see an estimated cost per Dish, derived from its
  recipe and current ingredient buying prices — for my own reference only
  (e.g. pricing decisions). This never affects COGS, Gross Profit, or Net
  Profit, which are always derived from actual ingredient consumption
  (§3), not from recipes.
- As the Admin, when actual recorded production of a Dish diverges
  meaningfully from what its recipe and the ingredients issued would
  predict, I see a flag calling this out — a signal to investigate
  possible waste, error, or loss, not an automatic block or correction.
  Visible to the Admin only; does not block the Store Manager from
  recording production.

### 4.10 Assets
- As the Admin, I can maintain a register of business assets (equipment/furniture): name, location, purchase date, purchase cost, condition/status.
- As the Admin, I can soft-delete or hard-delete (with confirmation friction) an asset record.

### 4.11 Reporting & History
- As the Admin, I can view full records for any past date.
- As the Admin, I can view weekly and monthly summaries of sales, profit, and financial figures, reconciled against the underlying daily records.
- As the Admin, I can view an audit trail of every action taken in the app: who did what, when, including all edits and corrections.

---

## 5. Non-Functional Requirements

- **Platform:** Mobile-first responsive web app (installable PWA), usable on personal phones and the Admin's laptop.
- **Connectivity:** Wi-Fi/data connectivity is assumed available at all locations. No offline mode required for v1. Forms should retry on a dropped submit so in-progress input is not lost.
- **Data integrity:** No hard deletes except via explicit, friction-gated confirmation on products and assets. All other records are immutable once a day is closed, with corrections tracked via new entries, not edits to history.
- **Auditability:** Every create, edit, and correction is attributable to a user and timestamped, and visible in the audit trail.
- **Access control:** Role-based; staff restricted to their own entries and non-financial views; Admin has full access.
- **Language:** English only.
- **Multi-location model:** Locations, products, and roles are modeled as data (not hardcoded) so a future fourth location can be added without a schema change.
- **Multi-tenancy:** Not required. Single business only.

---

## 6. Explicitly Out of Scope (v1)

- Customer-facing ordering or self-service
- Online payment collection / payment gateway integration
- Printed or thermal receipts
- KRA eTIMS or any tax e-invoicing/compliance
- Supplier purchase orders or supplier credit
- Table or reservation management
- Kitchen display screens
- Barcode scanning
- Payroll bank/M-Pesa integration or payslip generation (a payout is
  recorded in-system and posts a Salaries expense — ADR-60 — but the
  system does not move money to staff accounts or produce payslips)
- Accounting-software export/integration
- Recipes / bill-of-materials linking ingredients to dishes
- Multi-currency support
- Loyalty programs
- Offline mode
- Asset depreciation and maintenance scheduling
- Multi-tenancy / supporting other businesses

---

## 7. Open Questions

These require an answer from the Admin/business owner before or during
build; each has a provisional default noted in this PRD that should be
treated as unconfirmed until closed out.

1. **Unattributed handover balance** — is a rolling reconciliation (settling once the next stock count lands) acceptable for canteen shop-goods cash, or does the Admin expect an exact nightly figure regardless? *(Provisional: rolling reconciliation, §4.5.)*
2. **M-Pesa routing** — does M-Pesa payment go directly to the Admin's own account/till (never physically passing through staff), or through a staff-held number? This affects what "handover" means for M-Pesa specifically.
3. **Partial days / overtime** — does any staff member work partial days or earn overtime, beyond the flat daily-rate model?
