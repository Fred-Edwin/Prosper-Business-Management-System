# `/admin/financials` — Financials & Expenses screen

**Status:** Approved M3 S5, built M3 S7 — **RESTRUCTURED in M5 Session 12**
(Design Sprint). The M5 restructure is the current design: Paper "Prosper
Hotel" · page "M5 — Dashboard & Audit", `Financials — desktop,
restructured [M5]` + `Financials — mobile, restructured [M5]`. The
original M3 S5 artboards (page "M3 S5 — Financials redesign") are
superseded but kept for history. This doc's "Structure" section below is
updated to the M5 shape; the flows-vs-balances rule and the
date-range/handover notes are unchanged.

Related: ADR-55 (COGS model), ADR-56 (single admin header row),
**ADR-57 (flow-vs-balance date semantics)**.

---

## M5 RESTRUCTURE — why and what changed

M5 review found the screen was doing three jobs at once (position
snapshot + period analysis + ledger browsing) and felt overcrowded,
while the new `/admin` dashboard felt thin. The fix:

- **The "Position & balances" KPI strip is REMOVED from this screen** and
  now lives on the dashboard (`docs/design/flows/dashboard-screen.md`
  Band 1). Financials is now **analysis only** — one period toggle drives
  a report you read top to bottom. There is no balances strip here any
  more; a balance figure the owner wants "as of now" is on the
  dashboard, "as of period-end" context stays in the report captions.
- **The screen is now two visually separated zones:**
  1. **Report zone** — the profit statement (hero), per-location table,
     "Debts owed to the business" line, and "Where unsold stock went".
     On desktop these are a **two-column layout**: profit statement left
     (~520px), the per-location table + debts + where-stock-went stacked
     in a right column.
  2. **Transactions zone** — below a 2px `--border-strong` divider and a
     **"Transactions"** heading + one-line explainer ("Every recorded
     money and stock movement for <period>. The figures above are
     derived from these rows."), the five transaction tabs.
- **The five tabs stay on this screen** (owner decision — chose this over
  a separate `/admin/transactions` screen). They are: Stock Purchases ·
  Deliveries · Handovers · Expenses · Owner Draws.
- **No chart was added.** A grouped bar chart / donut with an axis-flip
  toggle was designed as an alternative and rejected — 3-colour marks
  contradict `design-principles.md` §1/§3 and duplicated the
  per-location table. The report zone stays kit-native.

**Mobile:** status bar + hamburger header + the period `<SegmentedControl>`
on its own row, then the Report zone stacked (compact profit statement →
by-location one-line-per-location → debts line → where-stock-went panel),
then the divider + "Transactions" heading + a horizontal-scroll tab chip
strip + the active tab's list as stacked cards.

---

## Structure (top → bottom) — M5 restructured shape

1. **Header row** (ADR-56) — title "Financials & Expenses" · the
   date-range `<SegmentedControl>` (Today / This week / This month /
   Custom) · "Record Payment" / "Record Expense" (tab-specific, in the
   Transactions zone toolbar — not the header) · account avatar.
   - **Mobile:** the range control drops to its own row below the header
     ("SHOWING" label + control) so the ~390px header never crowds.
   - **The Position & balances KPI strip that used to sit here is GONE**
     (→ dashboard Band 1).

2. **Zone 1 — Report.** Opens straight into the profit statement (no KPI
   strip above it). Desktop: **two columns**.
   - **Left (~520px) — "Profit for <range> · Consolidated":** the running
     stack in a bordered card —
     `Revenue − Cost of goods sold = Gross profit − Total expenses = Net
     profit`. All FLOWS — the whole range. Gross at `--text-h1`, Net at
     `--text-display` in `--color-success` / `--color-danger`. `Revenue`
     and `Cost of goods sold` carry a `--text-caption` sub-line
     explaining the derivation.
   - **Right column (stacked):** the per-location table (Location ·
     Revenue · COGS · Gross profit — revenue/COGS/gross only, expenses &
     net stay consolidated); a "Debts owed to the business" line (a
     BALANCE, as of range end); and **"Where unsold stock went"** — the
     non-sale-consumption breakdown by reason, on `--surface-subtle`,
     captioned "already inside the COGS figure above" (ADR-55 — a view
     INTO COGS, never a sibling line in the Revenue→Net stack).
   - **Mobile:** the same blocks stacked; per-location collapses to one
     line per location ("Restaurant · Gross 80,800.00").

3. **Zone 2 — Transactions.** Separated from Zone 1 by a 2px
   `--border-strong` divider and a **"Transactions"** `--text-h2`
   heading + a one-line explainer ("Every recorded money and stock
   movement for <range>. The figures above are derived from these
   rows."). Then:
   - The five tabs: **Stock Purchases · Deliveries · Handovers ·
     Expenses · Owner Draws** (underline tabs desktop; horizontal-scroll
     chip strip mobile). Profit is NOT a tab — it is Zone 1.
   - A per-tab toolbar: a count line ("28 expenses in September 2026 ·
     KES 88,300.00") and the tab's primary action ("Record Expense" /
     "Record Payment").
   - Each tab's table keeps its **column headers visible even when
     empty**, with the empty-state message rendered in a full-height
     area the page scrolls to (the Stock Purchases pattern — no
     `min-h-0` / trapped inner scroll on the tab container). Every tab
     has a **64px bottom gap** (`pb-(--sp-12)`) so a short table is
     obviously the end of the list, not content cut off at the viewport.
   - **Mobile:** the tab's rows render as stacked cards (category/name +
     mono amount on the first line, "<note> · <account> · <date>"
     caption below).

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
