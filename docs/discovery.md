# Discovery — Prosper Hotel Restaurant & Canteen Management System

**Source:** Brain dump from meeting with the business owner, plus follow-up clarifications.

---

## 1. Business Overview

The business operates two locations:

- **Restaurant** ("Prosper Hotel" is the owner's name for it, but it functions as a restaurant): has a kitchen where food is cooked, a dine-in area, and supports takeaway and delivery orders.
- **Canteen**: located inside a university, functions more like a shop, selling primarily to students.

There is also a **Store**, separate from the restaurant, where purchased items are kept before use.

---

## 2. Product Catalog

- The owner sets the catalog independently for each location — what is sold at the Restaurant vs. what is sold at the Canteen.
- For every item, the owner should be able to set full item details: **buying price, selling price, unit cost**, and other relevant attributes.
- **Restaurant** sells: food cooked in-house, drinks (e.g., sodas), and student-oriented items (logbooks, printing paper).
- **Canteen** sells: items transferred from the restaurant (e.g., samosas cooked in the morning and transported to the canteen for daytime sale), plus its own independent stock (pens and other canteen-specific goods).
- Items can be transferred between locations in both directions — Restaurant → Canteen and Canteen → Restaurant.

---

## 3. Staff & Roles

- **Store Manager** — restaurant
- **Cashiers** (two) — restaurant
- **Canteen Attendant** (one) — canteen
- **Admin / Owner** — oversees the entire business

**Operating context:** staff each work from their own personal phones. The owner operates from her own phone and also uses a laptop.

---

## 4. Daily Operational Workflow

A typical day runs as follows:

1. **Opening stock:** Yesterday's closing stock becomes today's opening stock automatically. The admin can manually adjust this, since she knows the actual ground truth (e.g., if not all of yesterday's closing stock is genuinely available to carry forward).
2. **Purchases:** Items purchased for the Store are recorded — quantity and cost — as part of the daily workflow. **The Store Manager is responsible for recording all purchases.**
3. **Store withdrawal for cooking:** The Store Manager records what is taken from the Store, and the quantities, in order to be cooked.
4. **Production:** After cooking, the amount produced of each menu item is recorded. This becomes added stock for the restaurant.
5. **Transfers:** A portion of what's produced is transferred to the canteen. Transfers can also happen in the other direction — canteen to restaurant. Transfers are logged as their own tracked activity in both directions.
6. **Restaurant sales (during the day):** The two cashiers record sales as they happen, including dine-in, takeaway, and delivery orders. They record credit sales (customers who buy on credit), payments, and payment methods.
7. **Canteen sales (during the day):** Because students arrive in large numbers during specific periods, the canteen attendant does not log sales one by one. Instead, she records stock quantities at intervals. Sales are inferred from the difference between stock counts (e.g., 20 chapatis in the morning, 5 remaining later, implies 15 sold, with revenue calculated accordingly).
   - **Non-sale reductions:** When stock leaves the canteen for reasons other than a sale (e.g., transferred to the restaurant, wastage), the attendant separately notes this when it happens. Any remaining, unexplained difference in the stock count is assumed to be sold.
8. **Stock counts:** Stock counts are taken regularly, daily.
9. **End of day:** The owner returns from her day job, reviews the day's records, and collects the money from the cashiers and the canteen attendant. The amount received should reconcile with what was recorded as sold, allowing the owner to confirm the business is running as expected.

---

## 5. Inventory Tracking Model

For each item, per location, the system tracks:

- **Opening stock** — carried from yesterday's closing stock, editable by admin
- **Added stock** — from production (restaurant) or purchases (store)
- **Sold** — recorded directly (restaurant) or inferred from stock counts (canteen)
- **Non-sales consumption** — staff meals, wastage, and complimentary items; tracked separately as its own category since the owner wants visibility into this
- **Closing stock** — automatically carries forward to become the next day's opening stock, but is manually adjustable by the admin based on ground truth

---

## 6. Financials

- **Credit sales** are tracked (amounts owed by customers who buy on credit).
- **Payment methods** are recorded for each transaction.
- **Staff pay:** each staff member has a set daily rate; monthly pay is calculated based on the number of days worked that month.
- **Owner's cash at hand / personal draws:** this is part of the system, not out of scope. The owner needs to log when she takes money out of the business, and see her cash-at-hand balance in-app — so she can track how much she has drawn and how much she is expected to return to the business, and generally track money going out versus money coming in.
- The owner wants a full financial picture: profitability, debts, credits — everything about the state of the business's finances.

---

## 7. Reporting & Historical Records

- **Weekly and monthly review:** the owner checks progress, profit, and financial figures on a weekly and monthly cadence, to understand how the business is doing and to verify these figures reconcile with the daily records.
- **Historical records:** the owner should be able to view records for any past day. This addresses a real pain point — using Excel currently, records are sometimes lost.
- **Audit trail:** the owner wants visibility into everything that has happened within the app.

---

## 8. Current State / Context

- All record-keeping is currently done manually in Excel spreadsheets.
- The owner accesses records via both her phone and her laptop.
- Staff each use their own personal phones to record their respective activities.