# `/admin` — Dashboard screen

**Status:** M5 (S12) version below is SUPERSEDED. Current approved design
is **v2** (Paper "Prosper Hotel" · page "M5 — Dashboard & Audit",
`Dashboard — desktop [v2]` + `Dashboard — mobile [v2]`), approved in a
Design Sprint following the M5 close-out QA walkthrough (2026-09-04). This
doc's "Structure (v2)" section is the current spec; the "Structure (M5,
superseded)" section is kept for history only — **build against v2.**

Borrows the `/admin/financials` v2 (same session) and `/admin/staff`
(M4 S8B) layout language wholesale — same shell, same KPI-column
treatment, same `<SimpleTable>` head/row, same dark-figure emphasis.
Composed from `components/kit/*` only, **except** the two inline bar
strips (see "Charts" below).

Related: ADR-52 (Day Close lives on this page), ADR-56 (single admin
header row), ADR-57 (flows vs. balances), ADR-55 (COGS model, non-sale
consumption).

---

## Why v2 — what changed from M5 and why

The M5 design deliberately kept the Dashboard "now"-only (no period
control) and left the full profit breakdown on Financials. The owner
revisited this after the M5 close-out walkthrough: Financials' tabs
(Stock Purchases / Deliveries / Handovers / Expenses / Owner Draws /
**Non-Sale Consumption**, added in this pass) stay as the ledger, but the
**profit narrative — Revenue/COGS/Gross/Expenses/Net and the
per-location P&L — moves onto the Dashboard**, driven by the same period
control Financials used to own alone. Financials becomes closer to a pure
transaction browser (see `financials-screen.md`); the Dashboard becomes
the one place that answers both "is anything wrong" and "how did we do".

**The screen's job (v2):** still the owner's morning screen and pre-close
review, but now also carries the profit narrative for whatever period
she's looking at. **The Dashboard now has a period control** (Today /
This week / This month / Custom — the same `<SegmentedControl>` +
`<DatePicker>` pattern Financials used). This is a deliberate change from
M5's "no period picker" rule — read the next section before building.

---

## The now/period split (v2's central design problem)

Putting a period control on this screen creates a real tension: the
Position band (cash / M-Pesa / liquidity / owed-by-owner) must stay
**"as of now" regardless of the period** (ADR-57 — these are balances,
not flows), while the profit stack now **flows with the period**. Two
kinds of figure now share one screen. The chosen resolution: **two
visually distinct zones**, not one undifferentiated list of bands —

- The **"Right now"** zone gets a `--color-accent` top border on its card
  and an accent-coloured (not the usual `--text-tertiary`) caption. This
  is the ONLY zone on the screen styled this way — it is a deliberate
  visual signature meaning "this ignores the period control above."
- Every other zone uses the plain `--text-tertiary` uppercase caption
  style already established (Needs Attention, Day Close, etc.).

Do not extend the accent-border treatment to any other card — it would
dilute the one signal it's meant to carry.

## Structure (v2 — current)

### Header row (ADR-56)
Title **"Dashboard"** · the current date · a period `<SegmentedControl>`
(**Today · This week · This month · Custom**, identical control to
Financials' — see `financials-screen.md` "Date-range control") · account
avatar. Owned by `<PageShell>` / `AdminPageHeader`.

### Zone — For `<period>` (profit stack)
Sits **first**, directly under the header — the lead story of the page.
Caption **"FOR THIS WEEK · Mon 1 – Wed 3 Sep"** (or the equivalent for
the selected period) with a right-aligned link **"Full transactions in
Financials →"**.

A bordered card holding the running profit stack, five hairline-split
columns — **Revenue → − Cost of goods sold → Gross profit → − Expenses →
Net profit**. Each column: an uppercase `--text-tertiary` label, the
figure in `--font-mono` `--weight-semibold`, and (except Gross/Net) a
`--text-caption` `--text-disabled` derivation sub-line (e.g. "Orders +
canteen sales, at selling price"). **Net profit is the only column with
a coloured background** — `--color-success-bg` when ≥ 0, `--color-danger-bg`
when negative — so the eye lands there first; the figure itself is
`--color-success` / `--color-danger`, with a delta caption below it
("▼ was + KES 4,100 by this point last week", same rule as the old Band
2). All five figures are **flows** (ADR-57) — they accumulate over the
whole selected period, never "as of" a single instant.

Directly below the card, a slim **Owner Draws** row (same card language,
`--surface-subtle` background): "Owner draws this <period> · money the
owner has taken out" — label left, mono figure right. A flow, not a
balance — owner draws *during the period*, not the running owed-to-owner
balance (that stays in the Right Now zone).

**Mobile:** the five columns collapse to stacked label-left/value-right
rows (same treatment Financials mobile uses for its profit statement);
Net profit is the emphasised bottom row on `--surface-subtle`.

### Zone — Right now (position)
Sits **second**, directly below the profit stack. See "The now/period
split" above for why it's styled differently. Caption **"RIGHT NOW · not
affected by the date range below"** in `--color-accent`. Card gets a 2px
`--color-accent` top border.

Four mono figure columns split by hairline vertical rules, unchanged
content from M5 Band 1:

| Column | Colour |
|---|---|
| Total business liquidity | `--text-primary` |
| Cash at hand | `--color-success` |
| M-Pesa / Bank till | `--color-info` |
| Owed back by the owner | `--color-danger` |

All four are **balances as of now** (ADR-57).

**Mobile:** liquidity on its own row (full width), then Cash + M-Pesa as
a 2-up, then Owed-by-owner — unchanged from M5.

### Zone — Trend charts (a row)
Two cards side by side on desktop (wraps on narrow):

- **Left — period trend.** Caption **"NET PROFIT PER DAY — THIS WEEK"**
  (label follows the selected period — see "Trend bucketing by period"
  below). A bar strip, one bar per bucket, same colour/height rule as M5
  Band 2's week strip.
- **Right — "NET PROFIT — LAST 30 DAYS".** Unchanged from M5 Band 5 — a
  mono anchor figure (30-day net total) + a 30-bar strip. This card is
  **always the last-30-days view regardless of the period control** — a
  fixed reference series, not period-driven. Keeping one non-period-driven
  trend card gives the owner a stable "how does this compare to the
  recent run" anchor even while she's filtering the rest of the page to
  "Today".

**Mobile:** the period trend strip is **dropped** — only the 30-day
reference card ships on mobile (owner-approved cut, v2 design review:
the period profit-stack numbers above already answer "how did we do this
period" without a second chart competing for vertical space on a long
page). Revisit if the owner asks for it back.

**Trend bucketing by period (build-session work, not fully designed
here):** the period card's bucketing must change shape with the period
control — daily bars for Today/This week, weekly bars for This month
(≈4–5 bars, not 30 daily ones crammed in), and a sensible default for
Custom. This was **explicitly deferred to the build session** by the
owner ("we don't have to design it again... when we are building the
screen we'll ensure we handle this properly") — implement it there, not
by adding more Paper states.

### Zone — Financial performance by location (table)
Caption "Financial performance by location" + `--text-disabled` sub-line
("This month so far · Store excluded, it doesn't sell"). A bordered
table:

| Location | Revenue | COGS | Gross |
|---|---|---|---|
| Restaurant | flow | flow | flow |
| Canteen | flow | flow | flow |
| **Total** | | | |

**Store is deliberately excluded from this table** — it has no P&L
(never sells). This is the exact `perLocation: LocationFinancials[]`
shape `getFinancialSummary` already returns (see
`lib/domain/financials/get-financial-summary.ts`) — no new domain work,
just a period-scoped read instead of Financials' old placement. Figures
are flows over the selected period.

**Mobile:** one line per location — name + a "Rev … · COGS …" caption on
one line, gross profit right-aligned; a `--surface-subtle` Total row at
the bottom.

### Zone — Stock & activity by location (table)
A **second, separate table** next to the financial one (desktop:
side-by-side row; mobile: stacked below it) — **deliberately not merged**
into one table, per the owner's explicit direction: financial figures and
stock/activity figures are different kinds of data and read better apart.
Caption "Stock & activity by location" + `--text-disabled` sub-line
("Today · always current, not the date range above" — this table is
**always "now", never period-driven**, same rule as the Right Now zone).

| Location | Movements | Low stock | Handover |
|---|---|---|---|
| Store | count | count, `--color-danger` if > 0 | `—` (Store has no handover) |
| Restaurant | count | count | status dot + label (Awaiting/Received) |
| Canteen | count | count | status dot + label |

**Store IS included here** (unlike the financial table) — it has stock
movements and low-stock risk even without a P&L. Handover column: a 6px
status dot (`--color-warning` "Awaiting" / `--color-success` "Received")
— reuses the same dot-and-label convention as Needs Attention and the
Handovers reconciliation table.

**Mobile:** one line per location, movements + low-stock count on the
left, the handover dot+label (or nothing, for Store) on the right.

### Zone — Needs attention
Unchanged from M5 Band 3 — see "Structure (M5, superseded)" below for the
full row table and empty-state rule. Caption **"NEEDS ATTENTION"** +
right-aligned open count; a bordered list, one row per open item
(overdue day-closes, handovers awaiting receipt, open shortfalls,
low/negative stock); collapses to a single all-clear row when empty.

### Zone — Today's activity
Unchanged from M5 Band 4 — see below. A bordered row of count cells
(Sales so far · Stock movements · Purchases & receipts · Handovers
received/due · Corrections today).

### Zone — Day Close
Unchanged from M5 Band 5's Day Close card — see below. No longer paired
with the 30-day trend card in the same row (the trend card moved up into
the Trend charts zone above); Day Close is now its own full-width zone at
the bottom of the page.

---

## Structure (M5, superseded — kept for history)

The section below is the **original M5 Session 12 spec**, before the v2
period-control redesign. Band numbering and the exact "no period picker"
framing are **no longer accurate** — v2 above supersedes it — but the row
tables for Needs Attention / Today's Activity / Day Close are still the
correct content (only their position in the page changed), so this
section is retained rather than deleted.

### Band 1 — Position right now
On `--surface-subtle`, bordered, `--radius-md`. Caption **"POSITION RIGHT
NOW"**. Four mono figure columns split by hairline vertical rules:

| Column | Colour |
|---|---|
| Total business liquidity | `--text-primary` |
| Cash at hand | `--color-success` |
| M-Pesa / Bank till | `--color-info` |
| Owed back by the owner | `--color-danger` |

All four are **balances as of now** (ADR-57) — no "as of" label needed
because "now" is unambiguous on a screen with no period control. Figures
at `--text-display` / `--weight-semibold` / `--font-mono`.

**Mobile:** liquidity on its own row (full width), then Cash + M-Pesa
as a 2-up, then Owed-by-owner. Same colours, `--text-body`/`--text-h1`
sizes.

### Band 2 — This week so far
Caption **"THIS WEEK SO FAR · Mon 1 – Wed 3 Sep"** with a right-aligned
link **"Full breakdown in Financials →"** (opens `/admin/financials`
pre-filtered to This week).

A bordered card, `--radius-md`, split into:

- **Left — the daily strip.** Caption **"NET PROFIT PER DAY"**, then a
  7-bar strip (Mon–Sun). One bar per day = that day's **net profit**;
  bar height scales to the week's max absolute value. A **loss day's bar
  is `--color-danger`**, a profit day's is `--color-success`. Days that
  have not happened yet are a short `--border-strong` stub at
  `opacity: 0.35`. Day initials below each bar; today's initial is
  `--weight-medium` / `--text-primary`.
- **Right — three WTD figures**, hairline-split: **Revenue**,
  **Expenses**, **Net profit** — each week-to-date, `--font-mono`. Under
  each, a delta line: **"▲ N% vs. same point last week"** /
  **"▼ …"**. The comparison is **week-to-date this week vs. the same
  weekday last week** (NOT vs. last week's total). On Revenue, ▲ is
  `--color-success`; on Expenses, ▲ is `--color-danger` (spending more
  is bad). Net profit's line is prose: "▼ was + KES 4,100 by this point
  last week". Net profit tile sits on `--surface-subtle`,
  `--text-display`.

**Mobile:** the bar strip is a full-width row at the top of the card
(same caption); the three figures stack below as label-left /
value+delta-right rows; Net profit is the emphasised bottom row on
`--surface-subtle`.

### Band 3 — Needs attention
Caption **"NEEDS ATTENTION"** with a right-aligned mono count
**"N open"** (`--color-warning` when > 0). A bordered list,
`--radius-md`, one row per item that needs action:

| Item | Dot | Links to |
|---|---|---|
| N days still open before today | `--color-warning` | day-close review for that date |
| N handovers awaiting your receipt | `--color-warning` | the receipt drawer / Handovers |
| N open handover shortfalls | `--color-warning` | Handovers (open shortfalls) |
| N items low or negative on stock | `--color-danger` | Stock |

Each row: a 6px status dot (fixed slot) · a two-line block (bold title +
`--text-caption` detail) · a right-aligned `--color-accent` action link
("Review day →", "Record receipt →", "Open handovers →", "Open stock →").
The action link sits in a fixed trailing lane, `<SimpleTable>`-style.

**When every queue is empty:** the band collapses to a single row —
`--color-success` dot + **"All clear — nothing needs you before you
close."** The band never disappears entirely (it's a reassurance signal,
not just an error list).

**Mobile:** same rows; the action link moves to the end of the detail
line (`"Tue, 2 Sep — Review day →"`) rather than a separate right lane.

### Band 4 — Today's activity
Caption **"TODAY'S ACTIVITY · Wed 3 Sep"**. A bordered row of count
cells, hairline-split:

| Cell | Value | Links to |
|---|---|---|
| Sales so far | mono `KES …` | Sales |
| Stock movements | integer | Stock |
| Purchases & receipts | integer | Financials → Stock Purchases tab |
| Handovers received / due | `2 / 1` | Handovers |
| Correction today | integer | Audit trail (filtered to corrections, today) |

Values `--font-mono` `--text-h2` `--weight-semibold`; the label below
each is `--color-accent` `--weight-medium` when it links, plain
`--text-secondary` when it's just a readout.

**Mobile:** the same cells as a vertical list — value in a fixed 32px
left slot, label right.

### Band 5 — Day Close + 30-day trend (a row)
Two cards side by side on desktop (wraps on narrow):

- **Left — the Day Close card**, unchanged from what shipped in M3 S1
  (`app/admin/day-close/day-close-client.tsx`): heading + explainer,
  today's status row (date + Open/Closed `StatusChip` + close/reopen
  `ToggleSwitch`), then **"RECENTLY CLOSED"** — a `<SimpleTable>` of
  recent closed dates, each with a per-row **"Reopen"** button. Max
  width ~560px. Reopening stays low-friction (a plain toggle, no
  confirm) per ADR-52.
- **Right — "NET PROFIT — LAST 30 DAYS"** trend card. A mono anchor
  figure (the 30-day net total, `--color-success` / `--color-danger`),
  then a 30-bar strip — one bar per day, same technique and colour rule
  as Band 2's week strip (`--color-success` / `--color-danger`, height
  scales to the 30-day max absolute). Date labels at each end ("Aug 5"
  … "Sep 3"). `flex: 1`, min-width ~420px.

**Mobile:** the two cards stack — Day Close first, then the 30-day trend
card full width.

---

## Charts — a deliberate exception to "compose from the kit only"

The frozen kit has **no chart component**. The owner asked for the week
strip and the 30-day trend during M5 review. Both are implemented as
**plain flex `<div>` bars**, not a charting library and not a new kit
component:

- Each bar is a `<div>` with `flex: 1` (or a fixed width for the 7-bar
  strip), `height` set from the day's value as a % of the series' max
  absolute value, `border-radius: 1–2px`.
- Sign drives colour only: `>= 0` → `--color-success`, `< 0` →
  `--color-danger`. Future/empty days → a short `--border-strong` stub
  at `opacity: 0.35`.
- No axes, no gridlines, no tooltips, no legend, no animation.

These are **dashboard-screen elements**, documented here as one-offs —
the same status as the staff Attendance `<SegmentedControl>`'s fixed
width (a screen-level layout choice, not a kit change). A donut / grouped
bar chart with an axis-flip toggle was designed and **rejected** in M5
review: a 3-colour mark palette contradicts `design-principles.md` §1/§3,
and it duplicated the by-location table less precisely. If a **third**
screen ever needs a chart, a real `<Sparkline>` / `<BarChart>` kit
component gets designed then — the build session must **not** hand-roll
SVG arc/bar maths inline beyond these two div strips.

---

## What the kit couldn't express, and the workaround

- **The two bar strips** — see "Charts" above. Plain divs, no new
  component.
- Everything else is `<PageShell>` / `<SimpleTable>` / `<ToggleSwitch>` /
  `<StatusChip>` / `<Button>` / `<Spinner>` / `<ErrorState>` +
  token-styled figure columns (the same hairline-split KPI-column
  pattern the Financials KPI strip and the staff summary strip already
  use).

---

## Data-shape notes for the v2 build session

**The M5 shape below already shipped** (S13/S14 — `GET
/api/admin/dashboard?date=YYYY-MM-DD`, see `docs/API.md` "Dashboard" and
ADR-64's telescoping-COGS approach). v2 needs the following **additions**
to that contract, not a rewrite:

1. **Profit stack + per-location table — no new endpoint needed.** The
   existing `GET /api/financials/summary?from=&to=` (Admin-only, see
   `docs/API.md` "Financials") already returns exactly the
   `FinancialSummary` shape this zone needs: `consolidated.revenue` /
   `.cogs` / `.grossProfit` / `.totalExpenses` / `.netProfit` for the
   profit stack, and `perLocation[]` (`locationName`, `revenue`, `cogs`,
   `grossProfit`) for the Financial-performance-by-location table,
   Store naturally absent since it never sells. The client should call
   this endpoint directly with the period control's resolved
   `{from, to}` — **do not duplicate this data inside the dashboard
   aggregator.** A prior-period comparison figure for Net Profit's delta
   caption needs a second call with the prior period's `{from, to}` (or a
   small aggregator addition if two summary calls per load is
   undesirable — build session's call).
2. **Owner draws for the period** — Σ `OwnerTransaction` (draws only, not
   netted against returns) over `[from, to]`. Distinct from
   `ownerOwedToBusiness` (a balance, stays in Position). Not currently
   exposed by any endpoint at the draws-only granularity — check
   `docs/API.md` "Financials" Owner Draws tab contract before adding a
   new one.
3. **Stock & activity by location, always "now"** — this DOES belong on
   the `GET /api/admin/dashboard` aggregator (below), since it's a
   "now" figure like the rest of that endpoint's payload, not a period
   figure like the profit stack.
5. **Stock & activity by location, always "now"** — new: per-location
   `{ movementCount, lowStockCount, handoverStatus }`. `movementCount` /
   `lowStockCount` are straightforward `listMovements` / stock-balance
   groupBys per location (today's date). `handoverStatus` — reuses
   whatever the Handovers reconciliation read already exposes per
   location for today (declared-but-not-received vs received) — do not
   re-derive; call into the same domain fn `financials-screen.md`'s
   Handovers tab uses.

The M5 shape this endpoint already returns:

1. **Position band** — `liquidity`, `cash`, `mpesaBank`,
   `ownerOwedToBusiness` as of now. These are the same derivations
   `getFinancialSummary` already does for balances (`getAccountBalances`,
   `getOwnerOwedToBusiness`) — just with `asOf = now` instead of
   period-end.
2. **This week so far** — `dailyNet[]` (7 entries, Mon–Sun of the
   current business week, `Africa/Nairobi`; entries for future days are
   `null`), plus `revenueWtd` / `expensesWtd` / `netWtd` and the same
   three for **the same weekday range last week** (`…PriorWtd`) so the
   client computes the deltas. Weeks are Monday-first
   (`businessWeekRange`), matching the Financials range control.
3. **Needs attention** — `openPriorDates: string[]` (business dates
   before today with no `DayClose` row — a query the current day-close
   endpoint does not expose); `handoversAwaitingReceipt` (count + enough
   detail for the row: location, declared amount, declarer) from the
   handovers module; `openShortfalls` (count + total) from
   `GET /api/pay/shortfalls`-style logic but **not month-scoped** — all
   currently-open; `lowOrNegativeStock` (count + top 3
   `{ productName, qty, unit }`) from the stock balances.
4. **Today's activity** — `salesSoFar` (money in from `order` +
   `canteen_sale` `MoneyMovement` today), `stockMovementCount`,
   `purchaseReceiptCount`, `handoversReceived` / `handoversDue`,
   `correctionCountToday` (count of today's `AuditLog` rows with
   `action = "correct"`).
5. **30-day trend** — `dailyNet[]` (30 entries, oldest first, business
   dates), plus `net30Total`. Same net-profit derivation as
   `getFinancialSummary`'s consolidated `netProfit`, run per day.

All money as decimal strings at the route boundary (ADR-30). Day
boundaries `Africa/Nairobi` via `lib/time` (never server-local).

The Day Close card keeps its existing `GET/POST/DELETE /api/day-close`
contract unchanged.

---

## Assumptions the build session should verify

- **v2's period-trend bucketing is intentionally unspecified here** —
  the owner explicitly deferred it to the build session rather than
  designing every period state in Paper ("we don't have to design it
  again... when we are building the screen we'll ensure we handle this
  properly"). Implement: daily bars for Today/This week, weekly buckets
  for This month, a sensible default for Custom (likely daily under
  ~45 days, weekly above). This is purely a client-side bucketing
  decision over the period's `dailyNet[]` — no new backend shape needed
  beyond returning daily granularity for the requested span.
- The dashboard is **Admin-only** (same as every other `/admin/*`
  screen).
- "Corrections today" links into the Audit trail screen with
  `action=correct` and a today date-range preset — that screen must
  accept those query params (see `audit-screen.md`).
- The 30-day and 7-day net series are **expensive** if computed naively
  (a full `getFinancialSummary` per day = 30–37 sweeps). The build
  session should decide whether to cache, precompute nightly, or
  restrict the trend to a cheaper proxy (e.g. revenue − expenses without
  the full COGS sweep) — **flag this with the owner** if a cheaper
  figure changes what the bars mean.
