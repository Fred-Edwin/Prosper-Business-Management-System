# Owner Walkthrough Guide — Milestone 1 + Milestone 2 (Submission 1)

**For:** the owner, driving the real app on `pnpm dev`.
**Goal:** confirm every M1 + M2 feature works as the PRD says, as every
role that touches it (plan guardrail 3). This is the last gate before M2
Submission 1 is declared fully done.

**How to use this:** work top to bottom. Each step is a concrete action
and the result you should see. When something doesn't match, note the
step number + what you saw — small fixes can land this cycle with a
regression test; larger ones go to `docs/sprints/m2-followups.md`.

---

## 0. Setup

```bash
pnpm install            # if you haven't lately
pnpm prisma db push     # sync schema
pnpm prisma:seed        # fresh dev data (idempotent — safe to re-run)
pnpm dev                # http://localhost:3000
```

**Re-seed any time** the data gets messy — `pnpm prisma:seed` is
idempotent and re-dates the sample orders to *today / yesterday* so the
"Today" filters are never empty.

### Logins (all PIN `1234`)

| Name | Role | Lands on |
|---|---|---|
| `Admin` | Admin | `/admin` (sidebar nav) |
| `Cashier` | Cashier | `/cashier` (bottom nav: Today · New Order · Customers) |
| `Cashier Two` | Cashier | `/cashier` — the 2nd cashier, for isolation checks |
| `Store Manager` | Store Manager | `/store-manager` (bottom nav: Hub · Stock · History) |
| `Canteen Attendant` | Canteen Attendant | `/canteen` (bottom nav: Hub · Stock · History) |

Sign out from the **avatar** (top-right of every shell). There is **no
hamburger menu on the staff shells** — that's intentional (removed
2026-09-01); the bottom nav is the only staff navigation. The Admin shell
*does* have a sidebar (and a hamburger drawer below the `md` breakpoint).

### Two viewports

Every screen below should be checked **desktop** *and* **mobile** (narrow
the window under ~768px, or use device emulation). M2's fidelity pass was
largely about the mobile layouts matching Paper.

---

## PART 1 — Milestone 1 (the business exists in the system)

M1 has **no revenue** — it's Catalog, the stock ledger, purchases +
reconciliation, and the Assets register.

### 1.1 Catalog & Products — as **Admin** (`/admin/catalog`)

- [ ] **Create an Ingredient** — e.g. "Rice", unit `kg`, buying price
  `120`. Saves; appears in the list.
- [ ] **Create a Dish** — e.g. "Beef Stew". Note the buying-price field
  is absent / fixed at 0 for a dish (dishes have no buying price — COGS
  comes from ingredient consumption).
- [ ] **Create a Goods item** — e.g. "Exercise Book", buying price `50`.
- [ ] **Set per-location selling prices** — in a product's drawer, tick a
  location and give it a price; tick a second location with a *different*
  price. Both save.
- [ ] **Set a unit label** (kg / pcs / crate / ream) — no conversion
  happens, it's just a label.
- [ ] **Set a category** on a product (free-text field in the drawer,
  e.g. "Drinks"). It round-trips.
- [ ] **Soft-delete** a product you just made — it leaves the list.
- [ ] **Archived tab** — the soft-deleted product shows here.
  **Unarchive** it — friction-free, one tap, it returns to the main list.
- [ ] **Hard-delete** a product with no history — you must **retype its
  exact name** to confirm. It's gone permanently.
- [ ] **Hard-delete is blocked** for a product that has stock history —
  you get a "can't delete, it has history" style error (409), not a
  crash.

### 1.2 Stock ledger — as **Admin** (`/admin/stock`, nav label "Ledger")

- [ ] The ledger lists movements, newest first, filterable by product /
  location / type / date.
- [ ] **Opening stock** (`/admin/stock/opening`) — the bulk grid. Enter
  opening quantities for a few product/location rows and save. On
  **mobile** this is a **stacked-card** layout (not the wide grid) —
  confirm it's usable one-handed.
- [ ] A second opening entry for the **same** product/location/date is
  treated as a **correction** of the first (not a duplicate row) — the
  ledger shows the corrected value.
- [ ] **Correct a movement** — open a row's "Correct this", enter the
  correct *final* quantity (not a delta). A new correction row appears
  linked to the original; the derived balance reflects the corrected
  value.
- [ ] **Double-submit a correction** (submit the same correction twice) —
  the second submit is a **no-op** (delta 0), the balance doesn't move
  twice. *(This was M1 finding F-1.)*

### 1.3 Purchases & reconciliation — as **Admin** (`/admin/financials`)

- [ ] **Record a purchase payment** — supplier, product, quantity, cost,
  paid-from account (Cash / M-Pesa), destination location. **Cash at
  hand** (or M-Pesa/Bank) drops by the cost **immediately**. **Stock
  does not change yet.**
- [ ] The **Reconciliation table** shows this payment under **Awaiting
  delivery**.
- [ ] On **mobile**, `/admin/financials` renders a card layout — confirm
  the reconciliation table and transaction list are readable.

### 1.4 Stock movements — as **Store Manager** (`/store-manager`)

The staff movement flows were rebuilt in M2's fidelity pass onto a
**multi-row picker** — you pick several products in one flow, each with
its own quantity, and submit them as **one batch**.

- [ ] **Receive** (`/store-manager/flows/receive`) — "match a delivery
  the Admin already paid for": the outstanding purchase from 1.3 is
  offered; select it, confirm the quantity that arrived. **Now** stock
  goes up at your location. The Admin's reconciliation table moves it to
  **Delivered**.
- [ ] Receiving a **different** quantity than was paid for — the Admin
  sees the **variance**; stock reflects what arrived, the payment record
  is not auto-adjusted.
- [ ] **Issue** (`/flows/issue`) — take stock from the Store for cooking.
  Multi-row: add two products, quantities, submit. Store balance drops
  for both. **Blocked** if a line exceeds available stock (you can't go
  negative).
- [ ] **Production** (`/flows/production`) — record dishes produced;
  Restaurant stock goes up. Only `dish` products are offered.
- [ ] **Transfer** (`/flows/transfer`) — move stock between two
  locations. Pick `from` and `to`, add lines, submit — the dispatch side
  is written now.
- [ ] **Non-sale consumption** (`/flows/non-sale`) — required reason
  (Staff meal / Complimentary / Spoiled / Damaged / Other). "Other"
  **requires a note**. Stock drops.
- [ ] The **sticky submit bar** stays pinned at the bottom as the row
  list scrolls; the header stays at the top.

### 1.5 Transfers received — as **Canteen Attendant** (`/canteen`)

- [ ] A transfer **into** the Canteen (dispatched in 1.4) shows as an
  **incoming banner** / pending item; **Accept** it — Canteen stock goes
  up. *(2-phase transfer.)*
- [ ] **Canteen Dispatch** — the Attendant can also send a transfer out
  via the same multi-row picker (dispatch mode).

### 1.6 Assets — as **Admin** (`/admin/assets`)

- [ ] **Add an asset** — name, location, purchase date, purchase cost,
  condition/status.
- [ ] **Change its condition** (e.g. Good → Needs repair) — the status
  updates.
- [ ] **Soft-delete**, check the **Archived** tab, **Unarchive**.
- [ ] **Hard-delete** with the **retype-the-name** friction.
- [ ] Hard-delete **blocked** (409) for an asset with linked audit
  history — surfaced as an error, not a crash.
- [ ] On **mobile**, the register is a card layout — readable, the
  row-action (edit / delete in the drawer) works.

### 1.7 Role walls (quick checks)

- [ ] As a **Cashier**, you have **no** stock / catalog / financials nav
  — and hitting `/admin/*` directly bounces you.
- [ ] As a **Store Manager**, you can read the product list and your
  location's stock, but you **never see buying prices**.

---

## PART 2 — Milestone 2 (staff can sell, every day)

The money ledger is live. Everything below writes to it; **no balance is
ever a stored number** — they're all summed from append-only rows.

### 2.1 Restaurant Sales — as **Cashier** (`/cashier`, login `Cashier`)

**C1 — Hub / Today** (`/cashier`)

- [ ] Lands on today's own orders, a running total, day-open status, and
  a **New order** button. The seed puts a few orders here dated *today*.
- [ ] You see **only your own** orders — nothing from `Cashier Two`.

**C2 — New order → build** (`/cashier/orders/new`)

- [ ] A **category tab row** across the top (Mains / Sides / Drinks /
  Snacks / Uncategorised — from the product `category` field).
- [ ] **Tap a product to add it**; tap again / use the stepper to raise
  the quantity. **Tap the quantity number** to type a large qty directly.
- [ ] A **live running total** updates as lines change, in a sticky
  footer.
- [ ] **Insufficient stock is blocked** — try to add more of a product
  than the Restaurant has. The line is rejected inline naming the
  shortfall; you **cannot** save the order. *(§3.8 BLOCK.)*

**C3 — Checkout** (bottom sheet over C2)

- [ ] **Order type** segmented control: Dine-in / Takeaway / Delivery.
- [ ] **Delivery fee** field appears **only** when type = Delivery
  (and is rejected otherwise).
- [ ] **Payment method**: Cash / M-Pesa / Credit.
- [ ] **Cash** order → saves; Cash at hand goes **up** by the total.
- [ ] **M-Pesa** order → saves; M-Pesa/Bank goes up.
- [ ] **Credit** order → you **must attach a customer** (C5 sheet). It
  creates a **Debt**, and writes **no** money movement. Saving a credit
  order with no customer is refused.

**C5 — Customer attach / quick-create**

- [ ] Searchable customer picker; an **"Add new"** row inline — create a
  customer (name + phone) without leaving checkout, and it's attached.

**C4 — Order detail / edit** (`/cashier/orders/[id]`)

- [ ] Open a **today** order — you can **edit** it (change quantities,
  etc.). Save re-writes the lines and the money/stock effect.
- [ ] Open a **yesterday** order (the seed has one) — it's **read-only**;
  the action is **"Correct this (Admin)"**, not Edit.
- [ ] Open the **corrected** order from the seed — it shows a banner
  ("corrected on {date} by Admin") and the **current** (corrected)
  values, not the original.
- [ ] You **cannot delete** an order anywhere.

### 2.2 Restaurant Sales — as **Cashier Two** (isolation)

- [ ] Log in as `Cashier Two`. The Hub shows **only** `Cashier Two`'s
  orders (the seed gives them 2). None of `Cashier`'s orders are visible
  or reachable by URL.
- [ ] Nowhere in the Cashier UI is there a **buying price, unit cost, or
  margin**.

### 2.3 Customers & Credit — as **Cashier** (`/cashier/customers`, C6)

- [ ] The customer list shows each customer's **derived balance** (what
  they owe = debts − repayments). The seed has Grace & Mary owing, and
  one customer in credit (negative balance shown as such).
- [ ] **Record a repayment** against a customer with a balance — pick
  Cash or M-Pesa, enter an amount. Their balance drops by that amount;
  the matching account balance goes **up**.

### 2.4 Customers & Credit — as **Admin**

**A1 — Customers & Credit register** (`/admin/customers`)

- [ ] List of all customers + derived balances + payment history.
- [ ] The **"Has balance"** control is a **labelled toggle** (not a
  pill) — flip it and the list filters to customers who owe.
- [ ] **Record-repayment drawer** — same effect as the Cashier's, plus
  you can add an **account** and a **note** (the note shows in the ledger
  "Reference" cell).
- [ ] On **mobile**, the register is a card list with a row chevron into
  the detail.

**A2 — Customer detail** (`/admin/customers/[id]`)

- [ ] The **debt / repayment ledger** for one customer, interleaved,
  with a **running balance** down the page.
- [ ] A repayment you gave a **note** shows it in the Reference cell.

### 2.5 Restaurant Orders (Admin view) — as **Admin** (`/admin/sales`, "Restaurant Orders" tab)

- [ ] **Sales** is **one** nav item. Two underline tabs: **Restaurant
  Orders** / **Canteen Derived**. (`?tab=derived` deep-links the second.)
- [ ] `/admin/orders` and `/admin/canteen/derived-sales` typed directly
  **redirect** here.
- [ ] **Restaurant Orders** tab: **all** orders, **all** cashiers (this
  is the Admin — no isolation). No margin column, no delete affordance.
- [ ] **Filter toolbar** (not pills): **Cashier: … ▾**, **Payment: … ▾**,
  a **Today / All dates** date chip, a **☐ Corrected only** checkbox,
  then a result count · **Reset** (Reset shows only when a filter is off
  its default). On **mobile** it's a horizontally-scrollable chip row.
- [ ] Click an order → **read-only detail drawer**; the subtitle shows
  the **cashier's name** (not a UUID).
- [ ] A corrected order shows as a **linked row-group** (original +
  correction together).
- [ ] Open the **correction form** on a past-day order — enter corrected
  quantities; the **impact banner** shows the stock + money/debt delta
  (credit deltas labelled "Customer debt: …", delivery fee folded in).
  Save writes an append-only correction, never a delete.
  *(Known: the correction form is currently quantity-only — changing
  payment method / order type there is a recorded follow-up, F7-4.)*
- [ ] **Empty / filtered-empty** states read sensibly (filter to a
  cashier+date with no orders).

### 2.6 Canteen Derived Sales — as **Canteen Attendant** (`/canteen`)

**K1 — Stock Count** (`/canteen/stock-count`)

- [ ] **Category tab row** over the product picker (same idiom as C2).
- [ ] Pick a product, enter the **counted remaining** quantity.
- [ ] **Before you save**, a preview shows *"Since last count on {date} …
  sold {n}. Revenue KES {y}."* — computed live from the real ledger.
- [ ] For a **never-counted** product, the preview uses a first-count
  variant (period starts at opening).
- [ ] **Count more than the system expects** (enter a *higher* remaining
  than opening + receipts) → **blocked** with a validation message;
  nothing is written. *(Owner ruling — reject, don't allow negative
  sold.)*
- [ ] A valid count → **Confirm**. It writes the derived sale (units
  sold), sets closing stock to your counted value, and writes the
  **revenue** to Cash. Confirmation state shows.
- [ ] A count you made **earlier today** can be **undone** — the Canteen
  hub has a **"Delete today's count"** action (confirm step → toast →
  the count + its sale + its revenue row are removed).
- [ ] A count from a **previous day** is **locked** — no undo (that would
  be an Admin correction path, which is M3).

**K2 — Canteen Hub** (`/canteen`)

- [ ] Today's derived sales appear **in the hub timeline**, interleaved
  with other activity, rendered as **revenue-in** (KES) rather than
  stock-out. A zero-sold count shows without a revenue figure.

### 2.7 Canteen Derived Sales (Admin view) — as **Admin** (`/admin/sales`, "Canteen Derived" tab)

- [ ] Per product: **when it was last counted**, **what period** the
  figure covers, **units sold**, **revenue**.
- [ ] A **never-counted** canteen product is **listed** with blank
  figures (shown, not hidden). The seed has "Groundnuts 50g" never
  counted.
- [ ] **Desktop + mobile**, plus empty / filtered-empty / error /
  loading states.

### 2.8 Money ledger integrity — as **Admin**

- [ ] After all the above, sanity-check the balances: **Cash at hand**
  and **M-Pesa/Bank** on `/admin/financials` should reconcile with what
  you'd expect from the cash/M-Pesa orders + repayments + canteen
  revenue you just recorded, minus the purchase payment. There is no
  "stored balance" field anywhere — it's all summed live.
- [ ] Every action you took is attributable (the audit trail view itself
  is M5, but the rows are being written — nothing silently skips it).

---

## Sign-off

| Feature | Walked as | Pass? | Notes |
|---|---|---|---|
| M1 Catalog & Products | Admin | ☐ | |
| M1 Stock ledger + Opening (desktop + mobile) | Admin | ☐ | |
| M1 Purchases + Reconciliation | Admin | ☐ | |
| M1 Stock movement flows (multi-row picker) | Store Manager | ☐ | |
| M1 2-phase transfer receive/accept | Store Manager + Canteen | ☐ | |
| M1 Assets register (desktop + mobile) | Admin | ☐ | |
| M2 Restaurant Sales C1–C5 | Cashier | ☐ | |
| M2 Cross-cashier isolation + no margin leak | Cashier Two | ☐ | |
| M2 Customers & Credit — C6 | Cashier | ☐ | |
| M2 Customers & Credit — A1 / A2 (desktop + mobile) | Admin | ☐ | |
| M2 Admin Sales — Restaurant Orders tab + filter toolbar | Admin | ☐ | |
| M2 Canteen Stock Count K1 (+ undo) | Canteen Attendant | ☐ | |
| M2 Canteen Hub K2 timeline | Canteen Attendant | ☐ | |
| M2 Admin Sales — Canteen Derived tab (desktop + mobile) | Admin | ☐ | |
| M2 Money-ledger reconciliation | Admin | ☐ | |

When every row is ✅, tell the session — I'll flip the M2 status in
`PROGRESS.md` / the plan to fully done and M2 Submission 1 is closed. Any
❌ → give me the step number and what you saw.
