# Flow — Customers & Credit

**Status:** Design Sprint M2-01 (2026-08-29). Design intent for the
**customer credit register and repayment** — the Cashier's mobile view
(C6), the Admin's register + ledger (A1, A2), and the Admin orders list
with its correction path (A3).

> **Artboard status:** **DONE.** C6 drawn and approved in M2-01; **A1,
> A2, A3 drawn in Session 1b (M2-01b, 2026-08-29)** — desktop + mobile
> per screen, every structural state (drawer open, empty, filtered-empty,
> error, loading, linked row-group) as its own artboard. See the
> "Artboards" list at the bottom of this doc. See **ADR-15** (corrections are new rows),
**ADR-17** (money is a derived ledger), **ADR-19** (customers / debt /
repayment), **ADR-25** (audit), **ADR-30** (Decimal money). Built:
backend Session 3 (`lib/domain/customers` + money ledger), screens
Session 6.

**Scope:** customer records, the **derived** running balance, and
repayments. A `Debt` is *created* by a Credit order — that path lives in
`restaurant-sales-flow.md` §C. This doc picks up from "a customer owes
money" and covers seeing the balance and recording a repayment, plus the
Admin's read-only orders list (A3) and the order-correction drawer it
owns (shared with the Cashier's C4 "Correct this (Admin)" route). No
supplier credit — never tracked (PRD §4.6).

> **Status note — Design Sprints A / A2 (2026-08-31, fidelity pass for
> Submission 1).**
> **A3** is now the **"Restaurant Orders" tab of the merged "Sales"
> screen** (see `restaurant-sales-flow.md` for the merge + the filter
> toolbar that replaces the pill bar). Its content — read-only detail
> drawer + correction form drawer + linked correction row-group — is
> unchanged and its canonical artboards are the `[M2-SA]` set at
> `worldY 24000`. §G below (the correction drawer contents) still stands;
> the built drawer is **quantity-only** pending QA finding F7-4 (full
> corrected-order form → build batch 3a).
> **A1's filter row is converted to the toolbar idiom** (Design Sprint
> A2): the **"Has balance" pill becomes a labelled toggle** — the text
> `Has balance` (`--text-sm`, `--weight-medium`, `--text-primary`) next
> to the kit **toggle switch** (`40×22` track, `--color-accent` on / knob
> right; `--border-strong` off / knob left), sitting in the same flex row
> as the search field. The row is right-aligned (`margin-left:auto` via a
> flex spacer) with the **result count** (`--text-tertiary`) · a `·` · a
> **`Reset`** link (`--color-accent`, `--weight-medium`, shown only when
> a filter is off its default). Row: `display:flex; align-items:center;
> gap:var(--sp-4)`. Mobile (`EPJ-0`): the toggle row sits full-width
> below the search field (`Has balance` label left, toggle right).
> Nothing else on A1/A2 changed — content is the owner-confirmed
> fidelity-reference and stays as-is.

---

## Who and why

**Actors:**
- a **Cashier** — needs to look up a customer's balance at the counter
  and take a cash/M-Pesa repayment (C6).
- the **Admin** — needs the whole register with history, needs to record
  repayments from the desk, and needs to see and correct any order across
  all cashiers (A1, A2, A3).

**Job to be done (Cashier):** *"This customer wants to pay off some of
what they owe. Show me their balance and let me record what they just
handed me."*

**Job to be done (Admin):** *"Who owes the business money, how much, and
what's the history? Let me take a payment. And show me every order — if
one's wrong, let me correct it without deleting anything."*

---

## The screens

| ID | Screen | Shell |
|---|---|---|
| **C6** | Customers list + balances (mobile) | Staff mobile shell; repayment in a `BottomSheet` |
| **A1** | Customers & Credit register | Admin desktop shell + mobile variant; `SimpleTable`; repayment + add-customer in a right-edge `Drawer` (rail) |
| **A2** | Customer detail | Admin desktop shell + mobile variant; `DenseLedger` (debt/repayment interleaved, running balance) |
| **A3** | Orders list (Admin) | Admin desktop shell + mobile variant; `SimpleTable`; **read-only** + correction `Drawer` |

---

## Cross-cutting rules these screens encode (plan §3)

1. **The balance is derived, never stored (ADR-17, ADR-19).** A
   customer's balance = `Σ Debt − Σ Repayment`, summed on read. It is
   shown as a **read-out** everywhere — `--font-mono`, right-aligned,
   `--color-danger` when they owe, `--text-tertiary` "Settled" when zero.
   Never an input, never labelled "current balance" as if editable.
2. **A repayment writes two rows (ADR-17, ADR-19).** One `Repayment`
   (against the customer, not a specific `Debt`) **and** one
   `MoneyMovement` in (Cash **or** M-Pesa/Bank account, `sourceType =
   repayment`). The balance falls because the derivation re-sums — no
   stored number is touched.
3. **Repayment is not a page (plan §5 "no disconnected workflows").** It
   is a `BottomSheet` on C6 and a `Drawer` on A1/A2 — always in the
   context of the customer row you tapped.
4. **Correction = a new append-only row (ADR-15).** A3 is **read-only**.
   The only mutating action is **"Correction entry"**, which opens a
   drawer that writes a **new** `Order` (`correctsOrderId` set) with
   offsetting `StockMovement` and `MoneyMovement`/`Debt` rows. **No
   delete affordance on any posted order, anywhere.**
5. **Role scoping (plan §3.6).** C6 is the Cashier's view — name, phone,
   derived balance, repayment. It shows **all** customers (credit is a
   business-wide relationship, not per-cashier — a customer may have run
   up debt with either cashier), but **no order-level detail** and **no
   cost/margin**. A1/A2/A3 are Admin-only and show everything, including
   which cashier took each order.
6. **Audit (ADR-25).** `createCustomer`, `recordRepayment`, and the A3
   correction each write an `AuditLog` row.

---

## Balance derivation — as seen by Cashier vs Admin

| | Cashier (C6) | Admin (A1 / A2) |
|---|---|---|
| **Balance shown** | Yes — one derived figure per row | Yes — per row (A1) and a running column (A2) |
| **How it's labelled** | "owes KES 1,200" / "Settled" | "Balance" column header; "Owes" / "Settled" status text (table density — plain colored text, not a chip, per `design-principles.md` §4.4) |
| **History** | No — just the current figure and a repayment action | Yes — A2 is the full interleaved `Debt` / `Repayment` ledger with a running balance column |
| **Where the number comes from** | `GET /api/customers` → each row carries a server-derived `balance` | same endpoint for A1; `GET /api/customers/:id` for A2's ledger |
| **Never** | shown as editable, or as a field the Cashier can type into | same |

Both roles read the **same derivation**. The Admin just also sees the
rows it's summed from (A2).

---

## Walkthroughs

### A — Cashier looks up a balance and takes a repayment (C6)

1. Cashier taps **Customers** in the `BottomNav` → **C6**. A search field
   at the top; below it, a list of customer rows: **name** ·
   **phone** (`--text-secondary`) · **derived balance** (right, mono —
   `--color-danger` "KES 1,200" if they owe, `--text-tertiary` "Settled"
   if zero).
2. Cashier searches "grace", taps **Grace Wanjiru** → a **repayment
   `BottomSheet`** slides up (the `6Z4-0` open state):
   - header: "Grace Wanjiru" + "Owes KES 1,200" (read-out)
   - **Amount** field (numeric, KES)
   - **Account in**: a `SegmentedControl` — Cash · M-Pesa
   - a **"Record repayment"** primary button
3. Cashier enters "500", leaves it on **Cash**, taps **Record
   repayment**. Server writes a `Repayment` (KES 500, this customer) +
   a `MoneyMovement` (+KES 500, Cash, `sourceType = repayment`).
4. The sheet closes; a `Toast` (bottom-center) — "Repayment recorded ·
   KES 500 from Grace Wanjiru". Grace's row now reads "owes KES 700"
   (the derivation re-summed).

### B — C6 empty and repayment-success states

- **C6 empty** (no customers at all): `EmptyState` (default) — a people
  icon, "No customers yet", one line — "Customers are added when you take
  a credit order, or here." (No "Add customer" button on the Cashier
  view — quick-create happens in the credit-order flow, C5. If the owner
  wants Cashier-side add, it's a one-line change to surface the same
  two-field form; flagged, not designed in.)
- **C6 repayment sheet open**: walkthrough A step 2.
- **C6 repayment success**: the `Toast` from step 4; the row updates in
  place, no full-list reload.

### C — Admin records a repayment from the register (A1)

1. Admin → **Customers** in the side nav → **A1 Customers & Credit
   register**. A `PageShell` with a breadcrumb ("Customers"), a filter
   row (chip-based: **Has balance** toggle, **Search**), then a
   `SimpleTable`: **Name · Phone · Balance · Last activity · (row →
   drawer)**.
   - Balance column: `--font-mono`, right-aligned; "Owes KES 1,200" in
     `--color-danger` text or "Settled" in `--text-tertiary` (plain
     colored text, table density — §4.4).
   - "Last activity" = the date of the most recent debt or repayment.
2. Admin clicks a row → a **right-edge `Drawer` (rail variant)** opens:
   **Record repayment** — the customer name + derived balance as a
   read-out header, an **Amount** field, an **Account in**
   `SegmentedControl` (Cash · M-Pesa), an optional **Note** `Textarea`,
   and a **Record repayment** primary button in the footer.
3. Save → `Repayment` + `MoneyMovement` as in walkthrough A. The drawer
   closes, a `Toast` (top-right for admin) — "Repayment recorded", the
   row's Balance and Last activity update.

### D — Admin adds a customer (A1)

1. On **A1**, Admin clicks **"Add customer"** (a secondary button in the
   toolbar) → the **Add customer `Drawer`** (rail) opens: **Name**
   (`TextInput`, required), **Phone** (`TextInput`, required, validated),
   **Add customer** primary button.
2. Invalid phone or blank name → the §9.8 error pattern on that field;
   the primary button stays disabled.
3. Save → `createCustomer`; the drawer closes; `Toast` — "Customer
   added"; the new row appears in the table (balance "Settled", no
   activity yet).

### E — A1 filtered-empty, empty, error, loading

- **A1 filtered-empty** (Has balance = on, or a search that matches
  nothing): `EmptyState variant="filtered"` inside the table area — "No
  customers match" + a **"Clear filters"** action. The toolbar and
  filter chips stay visible so the Admin sees *why* it's empty (chip
  reads "Has balance").
- **A1 empty** (no customers in the system): `EmptyState` (default) —
  "No customers yet" + an **"Add customer"** button.
- **A1 error** (fetch failed): `ErrorState` — "Couldn't load customers"
  + **Retry**.
- **A1 loading**: toolbar + filter row render; table body shows 3
  `.kit-skeleton` rows (§9.10).

### F — Admin opens one customer's ledger (A2)

1. From **A1**, Admin clicks the customer **name** (distinct from the
   row → repayment drawer; the name is a link to the detail page) →
   **A2 Customer detail**.
2. Header block: **name**, **phone**, **current derived balance** (large
   read-out — `--font-mono`, `--text-h1`, `--color-danger` if owing). A
   **"Record repayment"** action (opens the same drawer as A1).
3. Body: a **`DenseLedger`**-style table, one row per `Debt` or
   `Repayment`, interleaved by date, newest first (or oldest-first with
   the running balance building down — Session 6 picks; the running
   balance must read correctly either way):
   **Date · Type (Credit order / Repayment) · Reference (order # or
   note) · Amount (signed, mono) · Running balance (mono, semibold —
   this is the reconciled figure, §4 numeric-typography rule)**.
   - A `Debt` row: `+KES 230` in `--color-danger`, running balance goes
     up.
   - A `Repayment` row: `−KES 500` in `--color-success`, running balance
     goes down.
4. **A2 zero-history** (customer exists, never had a credit order or
   repayment): the header shows "Settled"; the ledger area shows an
   inline `EmptyState` — "No credit history for this customer."
5. **A2 loading**: header renders; ledger shows 3 skeleton rows.

### G — Admin reviews all orders and records a correction (A3)

1. Admin → **Sales** (or **Orders**) in the side nav → **A3 Orders list
   (Admin)**. `PageShell` + breadcrumb + a chip-based filter bar
   (**Cashier**, **Date**, **Payment method**, **Corrected only**) +
   result count + **Clear all** when ≥2 filters active. Then a
   `SimpleTable`: **Time · Cashier · Type · Total · Payment · Status ·
   (row → detail/correction)**.
   - Status: "Posted" / "Corrected" / "Correction of #123" as plain
     colored text (table density).
   - A **corrected order and its correction** render as a linked
     **row group** — the original row carries a "Corrected" status, the
     correction row directly under it is visually tied (a hairline-
     bracketed pair, indent on the correction, "Correction of #{original}"
     in its Reference).
2. **A3 is read-only** — clicking a row opens a **read-only order
   detail** in a `Drawer` (rail): the lines, type, payment, total, who
   took it, when. **No edit form, no delete.**
3. The one action in that drawer is **"Record correction"** →
   the drawer switches to the **correction form**:
   - the original order shown as read context at the top
   - the corrected line list (re-uses the C2 line-row + `QuantityStepper`
     pattern), corrected order type / delivery fee / payment method
   - a **`CalculatedImpactBanner`** (warning-amber) previewing the
     consequence: *"This replaces order #123. Stock: Chapati +2 back to
     Restaurant. Money: Cash −KES 40. Original is kept and marked
     Corrected."*
   - a **Reason** `Textarea` (required)
   - a **"Record correction"** primary button
4. Save → `POST /api/orders/:id/correct` writes a **new** `Order`
   (`correctsOrderId = 123`) + offsetting `StockMovement` rows
   (reverse the original's Sold effect and apply the corrected one) +
   offsetting `MoneyMovement` **or** `Debt` rows (reverse original,
   apply corrected). The original `Order` is **never touched** — it just
   now *displays* as "Corrected" because a row points at it. `AuditLog`
   records it. `Toast` (top-right) — "Correction recorded as order #124".
5. This is the same drawer the Cashier's **C4 "Correct this (Admin)"**
   route points the Admin at (`restaurant-sales-flow.md` §F) — the
   Cashier never sees the form, only the Admin, on A3.

### H — A3 filtered-empty, empty, error, correction-drawer states

- **A3 filtered-empty** (e.g. Cashier = "Mary", Date = yesterday, no
  match): `EmptyState variant="filtered"` + **Clear filters**; the
  active chips stay visible.
- **A3 empty** (no orders in the system at all — early days):
  `EmptyState` (default) — "No orders yet".
- **A3 error**: `ErrorState` + **Retry**.
- **A3 correction drawer open**: walkthrough G step 3 — its own
  artboard.
- **A3 order + correction linked group**: walkthrough G step 1 — its own
  artboard, showing the bracketed pair.
- **A3 loading**: filter bar renders; table body 3 skeleton rows.

---

## Data notes for Session 3 / Session 6

- **`listCustomers`** → each row: `{ id, name, phone, balance,
  lastActivityAt }` where `balance = Σ Debt.amount − Σ Repayment.amount`
  (batched derivation, ADR-17). `lastActivityAt = max(debt/repayment
  dates)`.
- **`getCustomerLedger(id)`** → interleaved `Debt` + `Repayment` rows
  ordered by date, each with a computed `runningBalance`. No stored
  running total.
- **`recordRepayment`** → `{ customerId, amount, account: "cash" |
  "mpesa_bank", note? }` → writes a `Repayment` + a `MoneyMovement`
  (`amount` positive, `sourceType = "repayment"`, `sourceId =
  repayment.id`). Admin **or** Cashier (route allows both roles).
- **`createCustomer`** → `{ name, phone }`, both required; phone
  validated (Session 3 picks the rule — at minimum non-empty, digit/`+`
  shape). Admin or Cashier.
- **A3 `listOrders`** (Admin) → all orders, all cashiers, with
  `cashierName`, `correctsOrderId`, and a derived `status` ("posted" /
  "corrected" / "correction"). Margin/cost fields present (Admin).
- **`correctOrder`** (`POST /api/orders/:id/correct`, Admin only) → new
  `Order` with `correctsOrderId`, offsetting stock + money/debt rows;
  original untouched. 403 for non-admin. See `restaurant-sales-flow.md`
  data notes for the order-write shape being reversed/reapplied.
- **Routes:** `POST /api/customers`, `GET /api/customers`,
  `GET /api/customers/:id`, `POST /api/customers/:id/repayments`,
  `GET /api/orders` (A3), `POST /api/orders/:id/correct` (A3).
- **Composed from:** `PageShell`/staff shell, `SimpleTable`,
  `DenseLedger`, `Drawer` (rail), `BottomSheet`, `SegmentedControl`,
  `TextInput`, `Textarea`, `PillFilter`, `CalculatedImpactBanner`,
  `EmptyState` / `ErrorState`, `StatusChip`, `Toast`. **No kit change.**

---

## New components

**None.** The customer picker + inline quick-create (C5, invoked from the
credit-order flow) is `Select searchable` + a two-field form inside a
`BottomSheet`, assembled in the screen file — see
`restaurant-sales-flow.md` §New components. Repayment and correction are
existing `Drawer` / `BottomSheet` + existing form controls +
`CalculatedImpactBanner`. Session 2 not needed for this flow.

---

## Artboards (Paper — "Prosper Hotel", page "Shell+Component kit")

- `C6 Customers Mobile — populated [M2-01]`
- `C6 Customers Mobile — empty [M2-01]`
- `C6 Customers Mobile — repayment sheet open [M2-01]`
- `C6 Customers Mobile — repayment success [M2-01]`
- `A1 Customers Register — desktop populated [M2-01]`
- `A1 Customers Register — filtered-empty [M2-01]`
- `A1 Customers Register — empty [M2-01]`
- `A1 Customers Register — error [M2-01]`
- `A1 Customers Register — repayment drawer open [M2-01]`
- `A1 Customers Register — add customer drawer open [M2-01]`
- `A1 Customers Register — mobile [M2-01]`
- `A2 Customer Detail — desktop populated [M2-01]`
- `A2 Customer Detail — zero history [M2-01]`
- `A2 Customer Detail — loading [M2-01]`
- `A2 Customer Detail — mobile [M2-01]`
**A3 — now the "Restaurant Orders" tab of the merged Sales screen; see
`restaurant-sales-flow.md` "Artboards" for the canonical `[M2-SA]` set.**
The M2-01 standalone A3 artboards are superseded / re-skinned:

- `A3 Orders List — desktop populated [M2-01]` (`FA1-0`) — **SUPERSEDED** by `[M2-SA]`
- `A3 Orders List — mobile [M2-01]` (`GIA-0`) — **SUPERSEDED** by `[M2-SA]` mobile Restaurant Orders tab
- `A3+A4 Sales (merged) — desktop, Restaurant Orders tab — filtered-empty / — error [M2-SA]` (replace the standalone `filtered-empty` / `empty` / `error` frames)
- `A3+A4 Sales (merged) — Restaurant Orders tab, read-only order-detail drawer [M2-SA]` (was `FYX-0`; filter toolbar rolled on, A2)
- `A3+A4 Sales (merged) — Restaurant Orders tab, correction form drawer [M2-SA]` (was `G4I-0`; A2)
- `A3+A4 Sales (merged) — Restaurant Orders tab, order + correction linked row-group [M2-SA]` (was `GCP-0`; A2)

**A1 — filter row updated to the toolbar idiom (A2); all 7 A1 artboards
touched:** `DU2-0` (desktop populated), `DZ0-0` (filtered-empty), `E41-0`
(empty — no filter row, unchanged), `E97-0` (error — no filter row,
unchanged), `EJ6-0` (repayment drawer open), `EEE-0` (add customer drawer
open), `EPJ-0` (mobile). Content otherwise unchanged.

All A1–A3 frames created in Session 1b (M2-01b, 2026-08-29), page
"Shell+Component kit", `worldY 16000`–`18200`. Composed from the Admin
desktop shell (`649-0`) + Admin mobile shell (`6B1-0`), `SimpleTable`,
`DenseLedger`, rail `Drawer` (ADR-37b), `SegmentedControl`,
`CalculatedImpactBanner`, `EmptyState` / `ErrorState`, chip filter bar,
and `QuantityStepper` tap-to-type (Session 2's change, in A3's
correction line editor). No kit change.
