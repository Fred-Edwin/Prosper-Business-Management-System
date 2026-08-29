# Flow — Financials Reconciliation section (M1 cut)

**Status:** Design Sprint Session 15 (2026-08-29), **scope-corrected the
same day** after owner review. Design intent for the **Reconciliation
section** of `/admin/financials` (M1). Built in Session 16. See
**ADR-46** for the decisions; this doc is the user-flow narrative.

**Scope:** the **Reconciliation section only.** Everything else on
`/admin/financials` — the KPI stat strip, the transaction tabs (All
Transactions / Stock Purchases / Operating Expenses / Owner Draws), the
transactions table, the reconciled-outflows footer — is **unchanged**.
No `MoneyMovement`, no KPI wiring (Milestone 3, ADR-36 D-FIN).

---

## Who and why

**Actor:** the Admin.

**Job to be done, for the Reconciliation section specifically:**
*"I paid suppliers for stock. Which of those payments have actually been
delivered? And are there deliveries my staff recorded that I never paid
for — so I can go record the payment?"*

The old Reconciliation list only showed *outstanding* items and only
offered a vague "Match" link. It never let the Admin **confirm** a
delivery arrived, and the "go record the missing payment" path was
unclear. The redesign makes both explicit.

---

## The Reconciliation section — a table

Columns: **Date · Supplier / Item · Product · Destination · Amount ·
Status · Action.**

One row per open or recently-resolved purchase. Status is one of:

| Status | Dot | Row means | Action column |
|---|---|---|---|
| **Awaiting delivery** | amber (`warning`) | A payment was made; no delivery/receipt yet. | `—` (the Store Manager receives it on mobile) |
| **Delivered** | green (`success`) | The payment is matched to a receipt. | `—` (done — shown so the Admin can confirm it arrived) |
| **Received, no payment** | blue (`info`); the row is tinted `--surface-subtle` | A delivery was recorded with no supplier payment. | **"Record payment"** → opens the payment drawer, pre-scoped to that product |
| **Flagged** | red (`danger`) | A quantity/price variance was raised on a match. | `—` (Admin resolves it) — only shown when such a row exists |

When there is nothing to reconcile, the table area collapses to one
line: *"Every payment is matched to a delivery, and every delivery has a
payment. Nothing to reconcile."*

**Data:** `GET /api/stock-movements/outstanding` (`awaitingReceipt` +
`unmatchedReceipts`) for the open rows, plus recently-`Delivered`
`purchase_payment` rows (a payment that has a `purchase_receipt` linking
back). Session 16 picks the "recently" window. No new endpoint.

---

## Walkthroughs

### A — a normal day

1. Admin opens `/admin/financials`, uses the tabs / KPI strip / table as
   always.
2. Scrolls to **Reconciliation**. The table shows a few rows — mostly
   green **Delivered**, one amber **Awaiting delivery**.
3. Admin confirms the deliveries at a glance and moves on.

### B — a payment still out

1. A payment to "Nairobi Grains Millers" this morning; not yet delivered.
2. In the Reconciliation table: one amber **Awaiting delivery** row —
   Date, Supplier, Product · qty, Destination, Amount, status. Action
   column `—`.
3. No action for the Admin; the row clears itself to **Delivered** when
   the Store Manager matches the receipt on mobile.

### C — a delivery with no payment (the actionable case)

1. A Store Manager recorded a `purchase_receipt` and linked no payment.
2. In the Reconciliation table: a blue **Received, no payment** row, its
   background tinted to stand out. Amount column `—` (no payment yet).
   Action column: **"Record payment"**.
3. Admin clicks **Record payment** → the payment drawer opens with the
   product pre-selected (picker scoped to `ingredient` + `goods` —
   ADR-46 §6). Admin fills supplier / qty / cost / paid-from and saves.
4. On refresh the row flips to **Delivered** (the receipt now back-links
   to the new payment), or **Awaiting delivery** if the quantities don't
   reconcile.

### D — nothing outstanding

The table area shows the single all-clear line. The rest of the screen is
unaffected.

### E — loading

The Reconciliation table shows a header + 3 skeleton rows while the
fetch is in flight. (The rest of the screen has its own existing loading
behaviour.)

---

## Data notes for Session 16

- Supplier / ordered qty / cost / paid-from are **real `StockMovement`
  columns** now (ADR-46 §3) — `parsePaymentNote` is deleted. A `null`
  renders as "Supplier not recorded" (muted), never `—`.
- Status derivation:
  - in `outstanding.awaitingReceipt` → **Awaiting delivery**
  - a `purchase_payment` with a `purchase_receipt` linking back & no
    variance note → **Delivered**
  - in `outstanding.unmatchedReceipts` → **Received, no payment**
  - variance note present → **Flagged**
- The section is a `<SimpleTable>` + a per-screen `columns` mapper + a
  dot+text status cell (table density, `design-principles.md §4.4`). No
  kit change. No `MatchCard`.

---

## Artboards (Paper — "Prosper Hotel", page "Shell+Component kit")

- `Admin Financials — Full Table (Recon = table) [S15]` — the whole
  screen with the redrawn Reconciliation section (everything above it
  unchanged). Session 16 folds this onto `7ZJ-0`.
- `Financials Reconciliation — section states [S15]` — the
  all-reconciled and loading states of the section.
- `Admin Financials — Payment Drawer (searchable picker) [S15]` — the
  drawer the "Record payment" action opens.
