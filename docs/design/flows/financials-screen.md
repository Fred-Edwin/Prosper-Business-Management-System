# `/admin/financials` — Financials & Expenses screen

**Status:** Approved (Paper "Prosper Hotel" · page "M3 S5 — Financials
redesign", desktop + mobile artboards). Built in M3 S7. This doc is the
written spec that accompanies the artboards; the artboards are the pixel
reference.

Related: ADR-55 (COGS model), ADR-56 (single admin header row),
**ADR-57 (flow-vs-balance date semantics)**.

---

## Structure (top → bottom)

1. **Header row** (ADR-56) — title "Financials & Expenses" · the
   date-range control · "Record Payment" (Stock Purchases tab only) ·
   account avatar.
   - **Mobile:** the range control drops to its own row below the header
     ("Showing" label + control) so the ~390px header never crowds.

2. **Section 1 — Position & balances (KPI strip).** Its own band on
   `--surface-subtle`, hairline-separated from Section 2. Kit-native: a
   caption header "Position & balances as of <date>", then four mono
   figure columns split by hairline vertical rules — Total Business
   Liquidity · Cash at Hand · M-Pesa / Bank Till · Owed Back by the
   Owner. **Every figure here is a BALANCE**, read as of the end of the
   selected range (ADR-57); the caption says so.
   - **Mobile:** a compact dark 2-tile band — Cash at hand · M-Pesa /
     Bank. Liquidity + owed-by-owner surface in the panel caption below.

3. **Section 2 — Profit.** On the page ground, generous top padding, so
   it reads as its own section. Two columns on desktop:
   - **Left — "Profit for <range> · Consolidated":** the running stack in
     a bordered card —
     `Revenue − Cost of goods sold = Gross profit − Total expenses = Net
     profit`. All FLOWS — the whole range.
   - **Right:** the per-location table (Location · Revenue · COGS · Gross
     profit — revenue/COGS/gross only, expenses & net stay consolidated);
     a "Debts owed to the business" strip (a BALANCE, as of range end);
     and **"Where unsold stock went"** — the non-sale-consumption
     breakdown by reason, on `--surface-subtle`, captioned "already
     inside the COGS figure above" (ADR-55 — a view INTO COGS, never a
     sibling line in the Revenue→Net stack).
   - **Mobile:** the same blocks stacked.

4. **Section 3 — Transaction tabs.** Five tabs: Stock Purchases ·
   Deliveries · Handovers · Expenses · Owner Draws. (Profit is NOT a tab
   — it is Section 2.) Each tab's table keeps its **column headers
   visible even when empty**, with the empty-state message rendered in a
   full-height area the page scrolls to (the Stock Purchases pattern —
   no `min-h-0` / trapped inner scroll on the tab container). Every tab
   has a **64px bottom gap** (`pb-(--sp-12)`) so a short table is
   obviously the end of the list, not content cut off at the viewport.

## Handovers reconciliation table (owner-approved v2 — Paper page "M3 S7 — Handovers table redesign")

A bespoke grouped table — the kit `<SimpleTable>` has no grouped-header
or footer support, so it is hand-built from token markup with full ARIA
table roles (`table` / `row` / `columnheader` / `cell`). No kit change.

- **Two-row header.** Group labels (Declared · Received · Variance) sit
  over `Cash | M-Pesa` sub-columns. **One line per row** — Cash and
  M-Pesa each get their own narrow right-aligned column; nothing is
  stacked.
- **Columns:** Staff (150) · Status (130) · six money columns 90px each ·
  Note (grow) · action (130). A hairline `border-l` opens each of the
  three money groups and the Note column.
- **Status** is a bare coloured dot + coloured label (no filled pill) in
  the Staff column — success "Received" / warning "Awaiting".
- **Value styling:** a real figure is `--text-primary`; an exact `0.00`
  is `--text-tertiary` so real numbers pop; a variance is `--color-danger`
  when short, `--color-success` when over. An unreceived row shows `—`
  (centered) in the Received / Variance columns and the Note column.
- **Note header** is centered; the `—` placeholder in a Note cell is
  centered (a real shortfall sentence stays left-aligned).
- **Totals strip** aligns to the same columns; label is `--weight-medium`,
  figures are regular weight (NOT bold — matches the body rows).
- Mobile keeps the existing stacked cards.

## Typography foundation (ADR-63)

The screen (and the app) render Inter with the foundation block on
`body` — `antialiased`, `font-synthesis: none`, `font-optical-sizing:
none` — so it matches the Paper mockups. `--weight-semibold` is **550**,
not 600.

---

## Date-range control

Kit `<SegmentedControl>` — **Today · This week · This month · Custom** —
plus the existing single-date `<DatePicker>`, shown only when Custom is
selected. The kit `<DatePicker>` is single-date by design; **no range
picker was added to the kit.**

- Presets resolve to an inclusive `{ from, to }` pair of Africa/Nairobi
  business dates (`lib/time`, never server-local).
- **Weeks are Monday–Sunday** — ISO 8601 and the local trading-week
  convention; the same Monday-first boundary the kit `<DatePicker>` grid
  already uses (`businessWeekRange`).
- **Months** are the 1st → last day of the calendar month
  (`businessMonthRange`).
- Custom is one business day (`from === to`), capped at today.

## The one rule the screen turns on — flows vs. balances (ADR-57)

One control drives every figure, two ways:

| Kind | Figures | Responds to the range by… |
|---|---|---|
| **Flow** | revenue, COGS, gross/net profit, total expenses, non-sale consumption, every transaction table | accumulating over the **whole `from..to`** |
| **Balance** | cash at hand, M-Pesa/bank, debts owed to the business, owed back by the owner | a level **as of the end of `to`** |

So "This month" shows the month's revenue next to cash *as it stood on
the last day of the month*. A balance tile must always carry an "as of
<date>" label (KPI caption; Owner Draws card) — a correct number shown so
it invites a wrong reading is still a bug.

`getFinancialSummary(from, to)` applies this split itself: flow terms sum
over `[from, to]`; `getAccountBalances` / `getOwnerOwedToBusiness` / the
Debt-Repayment aggregates get `asOf = businessDateLastInstantUtc(to)`.

## Handovers under a multi-day range

Handover reconciliation is a single-DAY worksheet (declared vs received
vs variance, with day totals). When the range spans more than one day the
Handovers tab reconciles the range's **end day** and shows a caption
saying so.
