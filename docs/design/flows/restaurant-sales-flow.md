# Flow — Restaurant Sales (Orders)

**Status:** Design Sprint M2-01 (2026-08-29). Design intent for the
**Cashier order flow** — build → checkout → payment branches → edit-own
vs. Admin correction. Screens C1–C5 (`docs/sprints/milestone-2-session-1-handoff.md`
§3.1). New components: none (see §New components at the bottom). Built:
backend Session 4, screens Session 6. See **ADR-15** (corrections are new
rows), **ADR-16** (orders), **ADR-17** (money ledger), **ADR-29**
(Africa/Nairobi day), **ADR-30** (Decimal money); this doc is the
user-flow narrative.

**Scope:** Restaurant orders only. Canteen sales are derived, never
entered as an order — see `canteen-derived-sales-flow.md`. Credit orders
create a `Debt`; repayment is in `customers-credit-flow.md`. Day Close as
a hard lock is **M3** — M2 uses the soft "is the order's business day
today?" check (§3.4 of the plan).

---

## Who and why

**Actor:** a Cashier, on their own phone, standing at the Restaurant
counter with a customer in front of them.

**Job to be done:**
*"Take what the customer ordered, say how they're paying, and record it —
in a few taps, one-handed, without reading prices off a screen the
customer can see. If I got it wrong and the day's still open, let me fix
it myself."*

**What the Cashier must never see** (PRD §4.3, plan §3.6): buying price,
unit cost, margin, or any other cashier's orders. Every figure on these
screens is a selling price or an order total.

---

## The screens

| ID | Screen | Shell |
|---|---|---|
| **C1** | Cashier Hub / Today | Staff mobile shell, `BottomNav` = Today · New order · Customers |
| **C2** | New Order — build | Staff mobile shell, sticky running-total bar |
| **C3** | New Order — checkout | Staff mobile shell, sticky Confirm bar |
| **C4** | Order detail / edit | Staff mobile shell, `FlowHeader` (back) |
| **C5** | Customer attach / quick-create | `BottomSheet` over C3 |

C1 is the Cashier's home. C2 → C3 is the create flow. C4 is reached by
tapping a row on C1. C5 is a bottom sheet invoked from C3 when payment =
Credit.

---

## Cross-cutting rules these screens encode (plan §3)

1. **Money is a live derived ledger (ADR-17).** The order total on C2/C3
   is computed from the line list in the client; on Confirm the server
   writes the `Order` + one `MoneyMovement` (Cash/M-Pesa) **or** one
   `Debt` (Credit). No balance is shown as editable anywhere in this
   flow.
2. **Credit needs a customer (plan §3.2).** On C3, selecting **Credit**
   reveals the customer-attach block; **Confirm stays disabled until a
   customer is attached.** A Credit order writes **no** `MoneyMovement`.
3. **Correction = a new row (ADR-15).** C4 has **no delete affordance**
   on a posted order. "Correct this" produces a **new** `Order`
   (`correctsOrderId` set) with offsetting stock + money/debt rows —
   Admin-only, so from the Cashier's C4 it routes to the Admin path, it
   does not open an edit form.
4. **Staff edit window (plan §3.4).** The Cashier edits their **own**
   order **only while its business day (`Africa/Nairobi`) is today**.
   C1 shows the day-open status; C4 switches its primary action on it —
   editable form while open, read-only + "Correct this (Admin)" after.
5. **Role scoping (plan §3.6).** C1 and C4 show **only this Cashier's
   own** orders. No buying price / cost / margin anywhere.
6. **Audit (ADR-25).** Confirm, edit-own, and the correction route each
   write an `AuditLog` row. No screen action implies a silent change.
7. **Insufficient stock → the sale is blocked (§the decision below).**

---

## The §3.8 decision — insufficient Restaurant stock on an order line

**Question (plan §3.8, PRD silent):** an order line for a Dish or Goods
whose derived Restaurant stock balance is less than the quantity being
sold — block the sale, or allow the balance negative and flag it?

**Decision: BLOCK the sale.** *(Owner call, 2026-08-29.)*

- On **C2**, when a line's quantity exceeds the product's current derived
  Restaurant balance, that line renders in the **error field pattern**
  (`design-principles.md` §9.8): `--color-danger` 1px border on the line
  row, a helper line directly below it in `--color-danger` /
  `--text-caption` reading *"Only {n} {unit} in stock at the Restaurant.
  Reduce the quantity or remove this line."*
- The **sticky running-total bar** shows the total as usual but its
  **"Review order" / "Checkout" action is disabled** while any line is
  over-stock. A short `--color-danger` caption sits above it: *"1 line
  is over available stock."*
- The Cashier resolves it in place — step the quantity down with the
  `QuantityStepper`, or remove the line — and the block clears the moment
  the line is within stock.
- **C3 is never reached with an over-stock line** (Checkout is disabled
  on C2), so C3 has no over-stock state of its own.
- **Session 4 enforces the same rule server-side:** `createOrder` and
  `editOwnOrder` re-derive each line's location balance and return
  `400 { error: "insufficient_stock", line: <productId>, available: <n> }`
  if any line would drive it negative. The client block is a courtesy;
  the server is the gate.
- **Rationale:** the Restaurant's stock of a sellable item (Dish or
  Goods) is a real, countable thing — a Dish is added to Restaurant
  stock by a Store Manager `production` movement, Goods by a
  `purchase_receipt`. Selling more than exists is either a mis-tap or a
  missing production/receipt entry; both are better caught at the counter
  than reconciled later. This differs from Ingredients (never sold, so
  never on an order line) and from the Canteen (sales are *derived from*
  a count, so "negative" there is a period-boundary artefact the count
  itself resolves — see `canteen-derived-sales-flow.md`). Blocking keeps
  the Restaurant ledger's Sold column always backed by stock that was
  really there.
- **Known trade-off:** if the kitchen physically has the dish but the
  Store Manager hasn't recorded the `production` movement yet, the
  Cashier is blocked on a sale they could otherwise make. The mitigation
  is operational (the Store Manager records production promptly) and the
  error copy points at the cause ("in stock at the Restaurant"), not at
  the Cashier. Revisit in QA (Session 7) if it bites in the owner
  walkthrough.

---

## Walkthroughs

### A — a normal cash order

1. Cashier opens the app → **C1 Cashier Hub / Today**. Header shows the
   day-open pill (`--color-success` dot · "Day open"). A running total
   for the day sits under it ("Today · 14 orders · KES 12,450"). Below,
   this Cashier's own orders, newest first: time · order type · total ·
   payment method, a `CORRECTED` marker on any that carry one. A
   prominent **"New order"** button (primary, sticky bottom or a large
   tile).
2. Tap **New order** → **C2 New Order — build**. The screen is a
   **tap-to-add product grid** (POS-standard — Square / Toast / Loyverse
   phone layout), top to bottom:
   - a **search bar** (filters the grid; the fallback for a long
     catalogue, not a separate add step);
   - a **category tab row** — the existing kit `Tabs` (underline) over a
     new product **`category`** attribute (`All` + the business's
     categories, e.g. Mains · Sides · Drinks · Snacks). `All` default.
     *(New field — see the flag in `PROGRESS.md` and `milestone-2-plan.md`
     §6/§10; the Catalog UI to set it and the schema column are
     Development-Sprint work.)*
   - a **2-column product tile grid** (the mobile-POS standard — one
     column wastes width and forces scrolling; 3+ columns make tiles too
     small to tap and truncate price/stock). Each tile: **name ·
     selling price · unit · stock-available count**. Tapping a tile adds
     it to the order (qty 1) and the tile shows a running **qty badge**;
     tapping again is +1. The grid scrolls; the order-line list is
     **pinned** in a compact panel above the sticky total bar.
   The Cashier never sees `buyingPrice` / cost / margin — tiles show the
   **selling price only**.
3. Cashier taps **Chapati** (×2), **Samosa** (×3), **Soda 300ml** (×2)
   from the grid — or types "chap" in the search to filter first. Each
   appears as a **pinned line row**: product name · unit selling price ·
   **stock-available count** · `QuantityStepper` · line subtotal
   (`--font-mono`, right-aligned) · remove. The **`QuantityStepper`
   value is tap-to-type** — − / + step by one, and **tapping the number
   opens inline numeric entry** for a large quantity (type "24" instead
   of tapping + twenty-four times). *(This is a kit change — see §New
   components; Session 2 builds it.)*
4. The **sticky total bar** at the bottom updates on every change:
   "Total KES 250" (`--font-mono`, `--text-h2`) + a **"Review order"**
   primary action. If any line's qty exceeds its product's
   stock-available count, the §6 block engages (that line goes red,
   Review is disabled).
5. Tap **Review order** → **C3 New Order — checkout** slides up as a
   **tall bottom sheet over the dimmed C2** (grabber + "Checkout" header
   + X — the mobile-POS convention; Square / Toast / Loyverse all open
   tender as a modal sheet over the ticket, not a navigated screen, so
   the Cashier can dismiss down to add a forgotten item in one gesture
   and the order stays visually present). Inside the sheet:
   - **Order type**: a `SegmentedControl` — Dine-in · Takeaway ·
     Delivery. Dine-in preselected.
   - **Delivery fee**: hidden. (Appears only if Delivery is chosen — see
     walkthrough D.)
   - **Payment method**: a `SegmentedControl` — Cash · M-Pesa · Credit.
     Cash preselected.
   - An order summary (line count + per-line totals, read-only) above a
     **Confirm order** primary button in the sheet's sticky footer.
6. Cashier leaves it Dine-in / Cash, taps **Confirm order**. The server
   writes the `Order` + `OrderLine[]` + one `Sale` `StockMovement` per
   line (Restaurant stock down) + one `MoneyMovement` (Cash account, +KES
   230, `sourceType = order`).
7. Returns to **C1**, a `Toast` (bottom-center for staff) — "Order
   recorded · KES 230". The new row is at the top of the list; the
   day's running total ticks up.

### B — an M-Pesa order

Identical to A through step 5. At step 5 the Cashier taps **M-Pesa** on
the payment `SegmentedControl`. No extra field (M-Pesa reference capture
is out of scope for M2). Confirm writes the `Order` + one `MoneyMovement`
against the **M-Pesa/Bank** account instead of Cash. Same toast, same
return to C1.

### C — a credit order (hands off to the customer flow)

1. Steps 1–5 as in A. At step 5 the Cashier taps **Credit** on the
   payment `SegmentedControl`.
2. A **customer-attach block** appears inline below the payment control:
   "Credit order — attach a customer" + a **"Choose customer"** button.
   The **Confirm order** button is **disabled** (visibly, per §9.7) with
   a caption: "Attach a customer to confirm a credit order."
3. Tap **Choose customer** → **C5** opens as a `BottomSheet` over C3
   (a sheet over a sheet — common and fine).
   - **Search with results:** a search field + a scrollable customer
     list (name · phone · derived balance, balance in `--font-mono`,
     `--color-danger` when they owe). Tap a row → sheet closes, C3 now
     shows "Customer: Grace Wanjiru · owes KES 1,200" in the attach
     block, **Confirm order** enabled.
   - **No match → quick-create:** if the search returns nothing, the
     sheet shows an inline **"Add new customer"** form — name + phone,
     two fields, minimal. Save → returns to C3 with the new customer
     attached.
   - **Quick-create validation error:** an invalid/blank phone shows the
     §9.8 error pattern on the phone field ("Enter a valid phone
     number") — the Save button stays disabled until it's fixed. Name
     required the same way.
4. Back on **C3**, Cashier taps **Confirm order**. The server writes the
   `Order` + `OrderLine[]` + one `Sale` `StockMovement` per line + a
   **`Debt`** row (`customerId` required, linked to the `Order`) and
   **no `MoneyMovement`**. `Toast` — "Credit order recorded · KES 230 to
   Grace Wanjiru".

### D — a delivery order with a fee

1. Steps 1–4 as in A. At **C3**, Cashier taps **Delivery** on the order-
   type `SegmentedControl`.
2. A **Delivery fee** field appears immediately below the segmented
   control (a `TextInput` / numeric, KES). It is only present for
   Delivery — switching back to Dine-in/Takeaway removes it and drops any
   entered value.
3. Cashier enters "150". The order summary and the sticky total now read
   "Items KES 230 · Delivery KES 150 · Total KES 380".
4. Payment method as normal (Cash / M-Pesa / Credit — the fee is part of
   the order total for all three; a Credit delivery order puts the full
   KES 380 on the `Debt`).
5. Confirm. `createOrder` validates **fee allowed only when type =
   Delivery** (400 `delivery_fee_not_allowed` otherwise) and folds the
   fee into `total`.

### E — editing an own order, same day (day open)

1. On **C1**, the day-open pill is green. Cashier taps a row from earlier
   today → **C4 Order detail**.
2. Because the order's business day (`Africa/Nairobi`) **is today**, C4
   is **editable**: it re-uses the C2 line list (with `QuantityStepper`,
   add/remove) and the C3 controls (order type, delivery fee, payment
   method), pre-filled from the order. Primary action: **Save changes**.
3. Cashier fixes a quantity, taps **Save changes**. `editOwnOrder`
   re-validates (including the §3.8 stock block and the delivery-fee
   rule) and **rewrites** the order's lines and movements in place
   (still same-day, still this Cashier's own — no correction row needed
   yet). `AuditLog` records the edit. `Toast` — "Order updated".
4. If the edit would put a line over stock, the same C2 block applies and
   **Save changes** is disabled until it's resolved.

### F — the day has rolled (order is from a previous day)

1. Cashier taps an older row on **C1** (or the day-open pill now reads
   "Day closed" / it's simply a past date) → **C4**.
2. The order's business day **is not today**. C4 is **read-only**: the
   lines, type, payment and total render as static text, no steppers, no
   editable controls.
3. The primary action is **"Correct this"** — but the Cashier **cannot
   self-correct** (ADR-15: only the Admin corrects a record dated to a
   closed day). The button copy is *"Correct this (Admin)"* and it
   explains: *"This order is from a closed day. Ask the Admin to record
   a correction."* On tap it does **not** open an edit form — at most it
   surfaces the order reference for the Cashier to give the Admin. (The
   actual correction is entered by the Admin on **A3** — see
   `customers-credit-flow.md` for A3's correction drawer, shared with the
   Admin orders flow.)

### G — viewing an order that has already been corrected

1. On **C1**, a row carries a **`CORRECTED`** marker (a neutral
   `StatusChip`, per the M1 convention of not using colour alone).
2. Tap it → **C4**, read-only, with a line at the top: *"This order was
   corrected on {date} by {Admin}."* + a link to the **correction
   entry** (the new `Order` row that `correctsOrderId` points at). No
   edit path from here.

### H — empty and loading states

- **C1 empty** (no orders yet today): `EmptyState` (default) — a cart
  icon, "No orders yet today", one line of guidance, and the **New
  order** action as its single button. The day running-total row shows
  "Today · 0 orders · KES 0".
- **C1 day-closed banner**: when the current business day is closed (or
  the Cashier is looking at a past day), a `--color-warning-bg`
  `InstructionalBanner` above the list — "This day is closed. New orders
  post to today; past orders are read-only." The **New order** button
  stays enabled (a new order always posts to *today*).
- **C1 loading**: header pill + running-total row render; the list area
  shows 3 `.kit-skeleton` rows (§9.10).
- **C2 empty** (no lines): the product grid is fully visible (that is the
  point — you tap to start); the pinned order panel shows an inline
  "Tap a product above to start the order." line and the sticky total
  bar reads KES 0 with **Review order** dimmed.
- **C3** has no empty state (it is only reachable with ≥1 line).
- **C4 loading**: `FlowHeader` + 3 skeleton blocks.

---

## Data notes for Session 4 / Session 6

- **Order total** = Σ(line unit price × qty) + delivery fee (Delivery
  only). Unit price is **snapshotted** from `ProductLocation` at
  `createOrder` time (ADR-16) — never re-looked-up on display or edit.
- **Line stock check** (§3.8): re-derive `Σ StockMovement` for
  `{productId, location: Restaurant}` at request time; reject if
  `balance - qty < 0`. Applies to `createOrder` and `editOwnOrder`.
- **Payment branch:** Cash/M-Pesa → one `MoneyMovement`
  (`account = Cash | MpesaBank`, `amount = +total`, `sourceType = order`,
  `sourceId = order.id`). Credit → one `Debt` (`customerId` **required**,
  400 `customer_required` otherwise; `amount = total`; linked to the
  order). Never both.
- **Delivery fee:** allowed only when `orderType = Delivery`; 400
  `delivery_fee_not_allowed` otherwise. Folded into `total`.
- **Edit window:** `editOwnOrder` allowed iff `order.cashierId ===
  session.userId` **and** the order's `Africa/Nairobi` business day ===
  today (ADR-29). Otherwise `409 day_closed` and the client shows the
  C4 read-only / "Correct this (Admin)" state.
- **List scoping:** `GET /api/orders` for a Cashier returns
  `where cashierId = session.userId`; margin/cost fields are stripped
  from the serializer for non-admin (mirror M1 `listProducts`).
- **Correction:** entered on A3 by the Admin (`POST
  /api/orders/:id/correct`) — a new `Order` with `correctsOrderId`,
  offsetting `StockMovement` and `MoneyMovement`/`Debt` rows. C4 only
  *links to* it.
- **`category` field** (new): a product attribute the Admin sets in the
  Catalog, powering the C2 category tab row (and K1's — see
  `canteen-derived-sales-flow.md`). Needs a schema column, Catalog UI,
  and a `PRD.md` §4.1 line. Not built this session — flagged in
  `PROGRESS.md` and `milestone-2-plan.md` §6/§10.
- Screens are composed from: `PageShell`/staff shell, `FlowHeader`,
  `SegmentedControl`, `QuantityStepper` (**with the new tap-to-type
  value — Session 2**), `Select` (searchable), `Tabs` (category row),
  `BottomSheet` (C3 checkout sheet + C5), `TextInput`, `SimpleTable`
  (C1 list on wider view), `EmptyState`, `InstructionalBanner`,
  `StatusChip`, `Toast`, plus a per-screen product-tile grid,
  order-line row and sticky total bar (all composed — see
  §New components).

---

## New components

**One kit change: `QuantityStepper` gains a tap-to-type value.**
Everything else composes from the proven kit.

| Needed | Verdict | Detail |
|---|---|---|
| **`QuantityStepper` — tap-to-type value** | **KIT CHANGE (Session 2)** | The kit audit already flags it (`kit-audit.md` C10: "the value is a `<span>`, not an `<input>` … the value must become an `<input inputmode="decimal">`"). M2 needs it for large order quantities. − / + unchanged; tapping the number opens inline numeric entry. States drawn this session on `6CG-0` (rest · value focused · at-bound · error). Session 2 builds it with the full ADR-42 gate. |
| Product-tile grid (C2) | compose | a 2-col flex-wrap of tiles (name · price · unit · stock · qty badge) — screen-level, not a kit component. Tile resting / in-order / out-of-stock states on the "M2 Sales Patterns" artboard. |
| Category tab row (C2, K1) | compose | the existing kit `Tabs` (underline) bound to the new `category` field. No kit change — but the field is new (flagged above). |
| Order-line row (product · price · stock · `QuantityStepper` · subtotal · remove) | compose | `QuantityStepper` + a flex row + `IconButton` (remove) — per-screen. §6 over-stock block = the §9.8 error pattern on the row. States on the "M2 Sales Patterns" artboard. |
| Payment / order-type selector | compose | `SegmentedControl` + a screen-level branch that shows the delivery-fee field / customer-attach block. |
| Customer picker + quick-create | compose | `Select searchable` (customer list) inside a `BottomSheet`; the "Add new customer" affordance is an extra non-`role="option"` row + a two-field inline form — screen-level, see `customers-credit-flow.md`. |
| Sticky total bar | compose | `DenseSummaryStrip` + the shell's sticky action-bar slot. **Confirmed Session 1: no kit variant needed** (states: default · action-disabled · blocked-caption on the "M2 Sales Patterns" artboard). |
| C3 checkout sheet / C5 sheet | compose | the kit `BottomSheet` (`6Z4-0`) at a tall content-height — grabber + header + X + sticky footer. No kit change. |

Session 2 (Kit Sprint) **runs** — it builds the `QuantityStepper`
tap-to-type value. See the session-wide new-component verdict in
`docs/sprints/milestone-2-session-1-handoff.md` §8.

---

## Artboards (Paper — "Prosper Hotel", page "Shell+Component kit")

All created and approved in Session 1 (M2-01). C3 and C5 are drawn as
bottom-sheet overlays (dimmed parent screen + scrim + panel).

- `C1 Cashier Today — populated [M2-01]`
- `C1 Cashier Today — empty [M2-01]`
- `C1 Cashier Today — day closed banner [M2-01]`
- `C1 Cashier Today — loading [M2-01]`
- `C2 New Order Build — populated [M2-01]` (grid + category tabs + pinned order panel)
- `C2 New Order Build — empty [M2-01]`
- `C2 New Order Build — line blocked (insufficient stock) [M2-01]`
- `C3 Checkout — Cash [M2-01]` (tall sheet over dimmed C2)
- `C3 Checkout — M-Pesa [M2-01]`
- `C3 Checkout — Credit, no customer (Confirm disabled) [M2-01]`
- `C3 Checkout — Credit, customer attached [M2-01]`
- `C3 Checkout — Delivery, fee field [M2-01]`
- `C4 Order Detail — day open, editable [M2-01]`
- `C4 Order Detail — day closed, read-only [M2-01]`
- `C4 Order Detail — corrected order [M2-01]`
- `C5 Customer Attach — search results [M2-01]` (sheet over dimmed C3)
- `C5 Customer Attach — no match, quick-create [M2-01]`
- `C5 Customer Attach — quick-create phone error [M2-01]`
- `Component Kit — M2 Sales Patterns [M2-01]` (order-line row, product tile, sticky total bar — states)
- `Component Kit — Form Controls` (`6CG-0`) — QuantityStepper tap-to-type states added
