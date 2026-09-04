# `/admin/financials` — Financials & Expenses screen

**Status:** M3/M5 versions below are SUPERSEDED. Current approved design
is **v2** (Paper "Prosper Hotel" · page "M5 — Dashboard & Audit",
`Financials — desktop [v2]` + `Financials — mobile [v2]`), approved in
the same Design Sprint as Dashboard v2 (2026-09-04, following the M5
close-out QA walkthrough) — **build against v2's "Structure" section
below.** The M3 S5/M5 S12 sections further down are kept for history
(the flows-vs-balances rule, date-range control, and Handovers table
sections they contain are still current and unchanged by v2).

Related: ADR-55 (COGS model, non-sale consumption), ADR-56 (single admin
header row), **ADR-57 (flow-vs-balance date semantics)**.

---

## v2 RESTRUCTURE — why and what changed

The M5 restructure (below) had already pulled the Position/balances strip
off this screen onto the Dashboard, leaving Financials as "one period
toggle drives a report you read top to bottom" plus five transaction
tabs. The v2 pass goes one step further, following the owner's direction
to make the Dashboard the home for the full profit narrative:

- **The entire profit statement leaves this screen** — Revenue / COGS /
  Gross / Expenses / Net and the per-location Revenue/COGS/Gross table
  both move to `/admin` (see `dashboard-screen.md`'s "For `<period>`"
  and "Financial performance by location" zones). Financials no longer
  shows a profit report at all.
- **"Where unsold stock went" is also gone from this screen** — it was a
  COGS sub-detail, and COGS itself no longer lives here. In its place,
  the underlying data — non-sale consumption **rows** (product,
  quantity, reason, who recorded it) — gets a proper home as a **6th
  transaction tab** (see below), which is strictly more useful than the
  old summed-by-reason panel: the owner can now see which product, which
  day, whose write-off, not just a total.
- **A KPI strip replaces the profit statement as the page's orienting
  element.** Since this page is now transaction-first, the strip
  previews the six tabs below it (count + amount per tab) rather than
  restating Revenue/COGS/Net, which would just duplicate the Dashboard.
  Clicking a tile jumps to that tab; the active tab's tile gets a
  `--color-accent` left-rule + `--surface-subtle` tint so the strip
  doubles as a tab indicator.
- **"Debts owed to the business" is promoted from a single balance line
  to a real, actionable table** — Customer / Amount owed / Oldest
  unpaid, each row a clickable link into `/admin/customers/[id]`. Owner's
  explicit ask: she needs to see *who* owes money and get to their
  account, not just a total.
- **Six transaction tabs, not five** — Stock Purchases · Deliveries ·
  Handovers · Expenses · Owner Draws · **Non-Sale Consumption** (new).

**Mobile:** status bar + hamburger header + the period `<SegmentedControl>`
on its own row, then a **2×3 KPI grid** (not a horizontal strip — six
tiles read better as a grid at 390px), the Debts card stacked below it,
then the divider + "Transactions" heading + a horizontal-scroll tab chip
strip (off-default/active tab sorted toward the visible front, per
ADR-66's mobile-filter convention) + the active tab's list as stacked
cards.

---

## Structure (v2 — current)

1. **Header row** (ADR-56) — title "Financials & Expenses" · the
   date-range `<SegmentedControl>` (unchanged, see "Date-range control"
   below) · tab-contextual primary action ("Record Expense" etc.) ·
   account avatar.

2. **KPI strip** — six hairline-split tiles, one per transaction tab, in
   tab order: **Stock Purchases · Deliveries · Handovers · Expenses ·
   Owner Draws · Non-Sale Consumption**. Each tile: uppercase
   `--text-tertiary` label, a mono figure (count-led for Deliveries/
   Handovers when there's an open item — e.g. "2 pending" / "1
   shortfall" — with a small `--color-warning`/`--color-danger` status
   dot; amount-led otherwise), and a `--text-disabled` caption ("6
   payments", "28 expenses"). The tile matching the active tab gets a 2px
   `--color-accent` left-rule and `--surface-subtle` background; its
   label turns `--color-accent`. Caption above the strip: **"THIS
   `<PERIOD>` AT A GLANCE"**.

3. **Debts owed to the business** — a bordered card, header row (title +
   sub-caption "Unpaid customer credit, as of today — click a customer
   to see their account" + the total, mono, top-right), then a compact
   table: **Customer · Amount owed · Oldest unpaid**, each customer name
   `--color-accent` and the whole row a link to `/admin/customers/[id]`.
   A trailing **"View all customer credit →"** row (on `--surface-subtle`)
   links to `/admin/customers` for the full list — this card shows only
   the open-debt customers, not a paginated table, so it never grows
   unbounded on the Financials page itself.
   - This is a **balance, as of now** (ADR-57) — not period-scoped, same
     rule as the old single-line version. The "as of today" caption stays
     mandatory per the flow-vs-balance rule below.
   - **Mobile:** same content, stacked — customer name + "Since <date>"
     caption on the left, amount right; "View all" row unchanged.

4. **Transactions zone.** Unchanged shape from M5 (divider, heading,
   per-tab toolbar, tables) — see the M5 section below for the full
   detail on tab tables, empty-state handling, and the Handovers
   reconciliation table. **The addition is a 6th tab:**

   **Non-Sale Consumption tab.** Columns: **Date · Product · Location ·
   Qty · Reason · Recorded by · Est. cost**. `Reason` renders as a small
   coloured pill (reusing the semantic colour tokens, not new ones):
   `Spoiled` → `--color-danger` / `--color-danger-bg`; `Complimentary` →
   `--color-info` / `--color-info-bg`; `Staff meal` / `Damaged` / `Other`
   → neutral `--text-secondary` / `--surface-subtle`. Toolbar count line:
   "N write-offs this `<period>` · KES `<total>`"; primary action
   **"Record Non-Sale Use"**.
   - **No new domain or schema work** — this is a pure read-wiring job.
     `listMovements({ movementType: "non_sale_consumption" })` already
     returns every field the table needs (product, location, quantity,
     `reason` is on the movement row, actor via `recordedById`); cost is
     the same per-unit valuation `computeNonSaleCost` already uses
     (`buyingPrice` for ingredient/goods, `dishWasteCostPercent ×
     sellingPrice` for dish — ADR-55). The KPI tile's total is exactly
     `nonSaleConsumption.total` from `getFinancialSummary`, already
     computed server-side today.
   - **Mobile:** stacked cards — product name + cost on line 1, the
     reason pill + "`<location>` · `<qty>` units · `<recorded by>` ·
     `<date>`" caption on line 2.

---

## Structure (M5, superseded — kept for history)

The profit statement, per-location table, and "Where unsold stock went"
panel this section describes are **gone from the current v2 design** —
see "v2 RESTRUCTURE" above for where each moved. This section is kept
because the **Handovers reconciliation table format**, **date-range
control**, and **flows-vs-balances rule** sections further down are
unchanged by v2 and still current — read past this section for those.

### Structure (top → bottom) — M5 restructured shape

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

## Handovers reconciliation table (current — Paper page "M3 S7 — Handovers table redesign")

Unchanged by the v2 restructure above — this table format still ships
as-is inside the Transactions zone's Handovers tab.

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

**This rule now governs both `/admin/financials` and `/admin`** (v2 put a
period control on the Dashboard too — see `dashboard-screen.md`'s "The
now/period split"), not just this screen. One control drives every
figure, two ways:

| Kind | Figures | Screen | Responds to the range by… |
|---|---|---|---|
| **Flow** | revenue, COGS, gross/net profit, total expenses, owner draws (period) | Dashboard | accumulating over the **whole `from..to`** |
| **Flow** | every transaction table, non-sale consumption | Financials | accumulating over the **whole `from..to`** |
| **Balance** | cash at hand, M-Pesa/bank, total liquidity, owed back by the owner | Dashboard ("Right now" — always as of NOW, not period-scoped at all) | a level **as of now** |
| **Balance** | debts owed to the business | Financials (Debts card) | a level **as of now** |

The Dashboard's balance figures are a stricter case than the original
ADR-57 "as of range end" rule — v2's "Right now" zone is **always now**,
regardless of the period control, not "as of the end of the selected
range". Financials' Debts card follows the same always-now rule (it has
no period control of its own to be "as of the end of" — it's a static
balance card on a now-transaction-first page).

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
