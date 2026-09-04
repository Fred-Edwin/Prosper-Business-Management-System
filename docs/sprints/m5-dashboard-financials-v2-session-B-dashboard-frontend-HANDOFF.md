# M5 — Dashboard & Financials v2 — Session B (Dashboard frontend) — HANDOFF

**For:** a fresh agent building the Dashboard v2 frontend. No
`milestone-5-plan.md` exists — like S11 / S13 / S14 / S15 / S16 / Session
A, this handoff **is** the plan. Three sessions total for this feature:
**A (backend, DONE — merged `main` at `b859200`) → B (this one) → C
(Financials frontend, not started)**. The owner is doing the "check"
phase manually on `pnpm dev` — there is no separate QA session, so run
this on `pnpm dev` yourself as far as you can before handing back, but
expect the owner to do a further pass.

---

## 0. READ FIRST (binding — `CLAUDE.md` rules apply)

1. `CLAUDE.md` — whole file. **pnpm only.** Post a visible-progress
   checklist (TodoWrite if available) and update it as you go — this is
   a real requirement in this project, not decoration.
2. `docs/CONVENTIONS.md` — naming, folder structure, error shape, §6
   working practices ("compose from the frozen kit; don't extend it per
   feature").
3. `docs/design/flows/dashboard-screen.md` — **the whole file.** Read
   "Why v2", "The now/period split" (this is the screen's central design
   idea — get it right), then "Structure (v2 — current)" top to bottom.
   The "Structure (M5, superseded — kept for history)" section further
   down is marked as such for a reason — do not build from it, but its
   Needs-Attention / Today's-Activity / Day-Close row tables are still
   the correct CONTENT (only their position on the page changed), so you
   will reference it for those three zones' exact row shapes.
4. `docs/API.md` — **"Dashboard"** section in full (the endpoint you're
   building against, including the `stockActivity` field Session A
   added) and **"Financials"** section's `GET /api/financials/summary`
   entry (the endpoint the profit-stack zone calls).
5. `docs/PROGRESS.md` — read the **"Milestone 5 'Dashboard & Financials
   v2' Session A"** entry in full (near the top of the file). It records
   the exact API decisions this session depends on and has an explicit
   "For Session B" section — read that section twice.
6. `docs/DECISIONS.md` — ADR-52 (Day Close on this page), ADR-56 (single
   admin header row), ADR-57 (flows vs. balances — **v2 extends this
   rule to the Dashboard, read the extended table in
   `financials-screen.md`'s "The one rule the screen turns on" section
   too**), ADR-64 (telescoping-COGS, why the trend series is cheap).
7. **Paper artboards** — file "Prosper Hotel", page "M5 — Dashboard &
   Audit", artboards **`Dashboard — desktop [v2]`** and **`Dashboard —
   mobile [v2]`**. These are the pixel reference; the spec doc is the
   written companion. Screenshot-diff against them band-by-band the way
   S14 did for the original M5 dashboard (`docs/PROGRESS.md`'s M5 S14
   entry describes that verification method if you want the precedent).
8. **Sibling screens to copy structure from:**
   - `app/admin/financials/financials-range.tsx` +
     `app/admin/financials/use-financials-range.ts` — the EXACT period
     control (`<SegmentedControl>` Today/This week/This month/Custom +
     `<DatePicker>` for Custom, resolving to `{from, to}` via
     `businessWeekRange`/`businessMonthRange` from `lib/time`) you need
     on the Dashboard now. **Reuse this hook, don't rewrite it** — either
     import it directly if it's generic enough, or extract a shared
     version if it's too Financials-specific. Check before assuming
     either way.
   - `app/admin/use-dashboard.ts` — the existing data hook for
     `GET /api/admin/dashboard`. Its header comment currently says "The
     dashboard has NO period picker" — **that line is now wrong**, update
     it, and extend the hook (or add a sibling hook) to also read
     `GET /api/financials/summary?from=&to=` for the period-scoped zones
     — see §2 below for exactly how the two calls divide the page.
   - `app/admin/dashboard-client.tsx` — the current (M5) composed screen.
     You are restructuring this file, not writing a new one from scratch
     — a lot of its band markup (Needs Attention, Today's Activity, Day
     Close) carries forward with only a reordering, not a rewrite.
   - `app/admin/day-close/day-close-client.tsx` — `<DayCloseCard>` is
     already extracted as its own component (M5 S14) for exactly this
     kind of reuse. Don't touch its internals.

---

## 1. THE SCREEN'S NEW SHAPE — READ THE SPEC, THIS IS A SUMMARY ONLY

Per `dashboard-screen.md` "Structure (v2 — current)", top to bottom:

1. **Header** — title, current date, **new: period `<SegmentedControl>`**
   (Today/This week/This month/Custom), account avatar.
2. **Zone — For `<period>` (profit stack).** FIRST content zone, directly
   under the header. Revenue → −COGS → Gross → −Expenses → Net, five
   hairline-split columns, Net gets a coloured background
   (`--color-success-bg`/`--color-danger-bg`) + a delta caption. Below
   the card, a slim Owner Draws row. **All from
   `GET /api/financials/summary?from=&to=`** using the period control's
   resolved range — see §2.
3. **Zone — Right now (position).** SECOND zone. `--color-accent` top
   border + accent-coloured caption — the ONE deliberate visual exception
   on this screen, meaning "ignores the period control above". Content
   unchanged from the old Band 1 (liquidity/cash/mpesa/owed-by-owner),
   still from `GET /api/admin/dashboard`'s `position` field, unaffected
   by the period control.
4. **Zone — Trend charts (a row).** Left: period-driven bar strip — see
   §3, this is the session's one real open engineering question. Right:
   the 30-day reference strip, UNCHANGED from M5 (always last-30-days,
   never period-driven) — reuse the existing bar-strip code wholesale.
5. **Zone — Financial performance by location (table).** Restaurant +
   Canteen only (Store excluded — no P&L). From
   `GET /api/financials/summary?from=&to=`'s `perLocation[]` — **already
   exactly this shape**, no transformation needed beyond formatting.
6. **Zone — Stock & activity by location (table).** NEW. Store +
   Restaurant + Canteen. From `GET /api/admin/dashboard`'s new
   `stockActivity[]` field — **already exactly this shape**. Always
   "now"/"today", same rule as Right Now — do not let the period control
   affect this table.
7. **Zone — Needs attention.** UNCHANGED content from the old Band 3 —
   see "Structure (M5, superseded)" for the exact row table + empty-state
   rule. Only its position changed (was Band 3, now after the two
   location tables).
8. **Zone — Today's activity.** UNCHANGED content from the old Band 4.
9. **Zone — Day Close.** UNCHANGED — reuse `<DayCloseCard>` as-is. No
   longer paired with the 30-day trend in a shared row (that moved up
   into zone 4) — Day Close is now its own full-width zone at the
   bottom.

**Mobile** (`Dashboard — mobile [v2]` artboard): same zone order, each
stacked full-width. **One deliberate cut, already owner-approved:** the
period trend bar strip from zone 4 is DROPPED on mobile — only the
30-day reference strip ships there. Don't add it back without asking;
this was an explicit decision, not an oversight (see
`dashboard-screen.md`'s "Mobile" note under the Trend charts zone).

---

## 2. HOW THE TWO CALLS DIVIDE THE PAGE (Session A's decision — do not relitigate)

`GET /api/admin/dashboard` stays **`date`-only** — Session A deliberately
did not add `from`/`to` params to it. Instead:

- **Period-scoped content** (zones 2 and 5 above: profit stack + owner
  draws + Financial-performance-by-location table) — call
  `GET /api/financials/summary?from=&to=` with the period control's
  resolved range. **One call covers all three.** `consolidated` has
  `revenue`/`cogs`/`grossProfit`/`totalExpenses`/`netProfit`/
  `ownerDrawsForPeriod`; `perLocation[]` has the location table rows
  directly.
- **"Now"-scoped content** (zones 3, 4-right, 6, 7, 8, 9) — call
  `GET /api/admin/dashboard?date=` as before (`date` optional, defaults
  to today).
- **The period-driven trend strip** (zone 4-left) — see §3, this needs
  its own resolution, either from one of the two calls above or a third
  read; work it out per §3's guidance rather than assuming.

**No prior-period comparison figure exists yet** for the profit stack's
Net Profit delta caption (the "▼ was + KES 4,100 by this point last
week" style line). Session A did not build one. Options: (a) the client
makes a second `/api/financials/summary` call for the prior-equivalent
period and computes the delta itself (simple, one extra network call per
load — acceptable at this app's scale, matching the existing WTD-vs-prior
pattern the M5 dashboard already used for its week band), or (b) treat
the delta caption as **out of scope for this session** and ship the Net
Profit tile without it, flagging that cut to the owner explicitly rather
than silently dropping it. **(a) is the better default** unless it proves
awkward — this project's stated preference (Session A's PROGRESS.md
entry) is "raise it rather than build a second aggregator shape as a
workaround," and a second `/summary` call is not a new aggregator shape,
it's the existing endpoint called twice.

---

## 3. THE TREND STRIP'S PERIOD-BUCKETING — YOUR MAIN OPEN DECISION

Per `dashboard-screen.md`'s "Trend bucketing by period" note, this was
**explicitly deferred to this session** by the owner — it is not
pre-designed in Paper beyond the "This week" state you can see on the
artboard. Your job:

- **Today / This week** → daily bars (what the artboard shows — carry
  the existing week-strip code forward, just re-titled from the period
  control's label instead of hardcoded "THIS WEEK SO FAR").
- **This month** → weekly bars (≈4–5 bars), not 30 daily ones crammed
  into the same card width. You will need to bucket `dailyNet[]` entries
  into ISO weeks (Monday-first, matching `businessWeekRange`'s
  convention everywhere else in this app) and sum each week's net.
- **Custom** → your call; a reasonable default is daily if the custom
  range is short (say ≤ 14 days) and weekly above that, mirroring the
  Today/Week vs Month split. Document whatever threshold you pick in the
  component's comment — don't leave it as an unexplained magic number.
- **Where does the daily data come from?** `GET /api/admin/dashboard`'s
  existing `trend.dailyNet[]` (30 entries) covers up to 30 days ending
  "today" — it does NOT cover an arbitrary custom range, and it is NOT
  period-aligned (it always ends on `date`, not on the period control's
  `to`). For "This month" specifically, you likely need the daily series
  from `getFinancialSummary`'s domain layer over the period's exact
  `[from, to]` — check whether `dailyNetSeries` (ADR-64, the fast
  telescoping-COGS series `lib/domain/dashboard/trend-series.ts` behind
  the 30-day band) is already exported in a way you can call for an
  arbitrary range, or whether the aggregator needs a small new endpoint
  parameter to expose it for a period rather than a fixed 30 days. If it
  needs a backend change, **that's acceptable to do in this session** —
  it's a small, additive extension of an already-cheap, already-tested
  domain fn (ADR-64 proved it's ~21ms, not 30+ stock sweeps), not new
  domain logic. Keep it small: expose what the bucketing needs, nothing
  more, and add a route test.
- **Do not hand-roll a second charting approach.** Same plain-div-bar
  technique as everywhere else on this screen (`dashboard-screen.md`
  "Charts" section) — `flex:1` bars, height from value-as-%-of-max,
  `--color-success`/`--color-danger` by sign, no axes/gridlines/tooltips.

---

## 4. WHAT THIS SESSION DOES **NOT** DO

- No Financials screen changes — that's Session C, against the same
  Session A backend. Don't touch `app/admin/financials/*` beyond reading
  `financials-range.tsx`/`use-financials-range.ts` as reference.
- No further backend work beyond the narrow trend-bucketing extension in
  §3 if you determine it's needed — everything else Session A shipped is
  final; don't re-derive `stockActivity`, `perLocation`, or
  `ownerDrawsForPeriod` client-side.
- No new kit components. Everything on this screen composes from
  `components/kit/*` plus the existing screen-local bar-strip divs — see
  `dashboard-screen.md`'s "What the kit couldn't express" section for
  the exact list of what's already an approved exception.
- Don't relabel or second-guess `oldestDebtAt` / the Financials Debts
  card — that's Session C's screen, not this one.

---

## 5. TESTS

Follow the M5 S14 precedent
(`tests/screens/admin-dashboard.screen.test.tsx` already exists — extend
it, don't replace it): interactive bits only — period control changes
trigger the right refetch, needs-attention action links navigate
correctly, Day Close toggle still works, the new Stock & activity table
renders `stockActivity` rows including the `handoverStatus: null` Store
case, the profit stack's Net Profit tile picks the right background
colour by sign. If you add a small backend extension per §3, it gets its
own domain + route test in the usual pattern (see any recent
`lib/domain/dashboard/*.test.ts` for the house style).

---

## 6. GATES

```
pnpm test          # note the exact before/after count; the current baseline (post Session A) is 990 tests, 122 files, with ONE known pre-existing flake (create-order.test.ts, a DayClose cross-file parallel-run race — green in isolation, unrelated to this work; do not "fix" it, just don't let it block you)
pnpm typecheck     # must be 0 errors
pnpm build          # run after `rm -rf .next`
grep -rn "TODO(mock)" --include="*.ts" --include="*.tsx" app lib components
                    # must return nothing new (one pre-existing test-description string, lib/domain/stock/purchases.test.ts:61, is not a real marker — ignore it)
```

**Do NOT commit unless the owner explicitly asks** — same as every other
session in this project.

---

## 7. DOCS TO UPDATE WHEN DONE

- `docs/design/flows/dashboard-screen.md` — if you resolved the trend
  bucketing differently than §3's guidance suggests, or discovered the
  spec's zone order/content needs correcting once built, update the doc
  to match reality (same discipline S14 followed for the original M5
  dashboard).
- `docs/API.md` — if §3 required a small backend addition, document it
  in the "Dashboard" section the same way Session A documented
  `stockActivity`.
- `docs/PROGRESS.md` — a session entry: what shipped, the trend-bucketing
  decision and why, gate state, and an explicit "For Session C" note if
  anything you learned building this screen is relevant to Financials
  (e.g. anything about `use-financials-range.ts` worth knowing before C
  reuses/extends it).

---

## 8. HANDOFF TO SESSION C

Session C (Financials frontend) needs, at minimum: confirmation of
whether `use-financials-range.ts` stayed Financials-only or became a
shared hook (and if shared, its new location/name), and any lesson from
building the profit-stack zone against `/api/financials/summary` that
would help Session C build its own read of the same endpoint's
`nonSaleConsumption` and `perLocation` fields correctly on the first
try.
