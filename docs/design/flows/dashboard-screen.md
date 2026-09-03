# `/admin` — Dashboard screen

**Status:** Approved (Paper "Prosper Hotel" · page "M5 — Dashboard &
Audit", `Dashboard — desktop [M5]` + `Dashboard — mobile [M5]`). Design
Sprint M5 Session 12. This doc is the written spec that accompanies the
artboards; the artboards are the pixel reference.

Borrows the `/admin/financials` (M3 S5/S7) and `/admin/staff` (M4 S8B)
layout language wholesale — same shell, same KPI-column treatment, same
`<SimpleTable>` head/row, same dark-figure emphasis. Composed from
`components/kit/*` only, **except** the two inline bar strips (see
"Charts" below).

Related: ADR-52 (Day Close lives on this page), ADR-56 (single admin
header row), ADR-57 (flows vs. balances).

---

## The screen's job

This is the owner's morning screen and their pre-close review. It answers
**"is anything wrong, and is the business healthy?"** — NOT "how did we do
over this period" (that is `/admin/financials`, which this screen links
into). **There is no period picker on the dashboard.** Every figure is
"now", "today", or "this week so far".

The **overlap with the Financials KPI strip is resolved by moving that
strip here** (Band 1). `/admin/financials` no longer shows a
position/balances strip — the dashboard is the single home for "where the
money is right now".

---

## Structure (top → bottom)

### Header row (ADR-56)
Title **"Dashboard"** · the current date (e.g. "Wed, 3 Sep 2026") ·
account avatar. No actions. Owned by `<PageShell>` / `AdminPageHeader`.

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

## Data-shape notes for the build session to confirm against `docs/API.md`

**There is no dashboard backend today.** `GET /api/day-close` returns
only `{ today, recent }` (recent = closed dates). Every other figure on
this screen needs an endpoint that does not yet exist. Recommended: one
aggregator, `GET /api/admin/dashboard?date=YYYY-MM-DD`, returning:

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
