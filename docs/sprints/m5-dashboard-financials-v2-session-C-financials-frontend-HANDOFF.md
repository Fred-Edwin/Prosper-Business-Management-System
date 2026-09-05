# M5 — Dashboard & Financials v2 — Session C (Financials frontend) — HANDOFF

**For:** a fresh agent building the Financials frontend half of the v2
redesign — the last of three sessions. No `milestone-5-plan.md` exists —
like every other M5 session, this handoff **is** the plan.
**A (backend, DONE, merged) → B (Dashboard frontend, DONE, merged) → C
(this one).** The owner does the "check" phase manually on `pnpm dev` —
there is no separate QA session, but you MUST still do your own `pnpm
dev` walkthrough before handing back (Session B found a real,
cross-cutting bug this way — see §3 below for why that discipline
matters here specifically).

---

## 0. READ FIRST (binding — `CLAUDE.md` rules apply)

1. `CLAUDE.md` — whole file. **pnpm only.** Post a visible-progress
   checklist (TodoWrite if available) and update it as you go.
2. `docs/CONVENTIONS.md` — naming, error shape, §6 working practices
   ("compose from the frozen kit", "never eyeball a screenshot — pull
   exact values with Paper's `get_computed_styles` where precision
   matters").
3. `docs/design/flows/financials-screen.md` — **the whole file.** Read
   "v2 RESTRUCTURE" then "Structure (v2 — current)" top to bottom. The
   "Structure (M5, superseded — kept for history)" section further down
   is marked as such for a reason — the Handovers-table section, the
   Date-range-control section, and the flows-vs-balances section AFTER
   it are all still current (unchanged by v2); only the profit-statement
   structure it originally described is gone.
4. `docs/API.md` — **"Financials"** section (`GET
   /api/financials/summary`, now carrying `ownerDrawsForPeriod`),
   **"Customers & Credit"** section (`GET /api/customers?owingOnly=true`,
   now carrying `oldestDebtAt`), and **"Dashboard"** section's
   `stockActivity`/trend-route entries (not used by this screen, but
   read them anyway — Financials and Dashboard now share components and
   you need to know what the sibling screen looks like).
5. `docs/PROGRESS.md` — read, in order: the **Session A** entry, then
   the **Session B** entry (both titled "Milestone 5 'Dashboard &
   Financials v2' Session …", near the top of the file). **Session B's
   entry has hard prerequisites for you — read it in full, not just its
   "For Session C" section**, because two things happened mid-Session-B
   that materially change what you're building against:
   - A real bug was found and fixed in **shared shell infrastructure**
     that Financials' own period control was ALSO affected by (it
     wasn't a Dashboard-only bug — it reproduced identically on
     `/admin/financials`). It is fixed on `main` now
     (`components/shells/admin-toolbar-context.tsx` +
     `admin-shell-client.tsx`, commit `e275cba`) — but **you must
     personally re-verify Financials' period control still works
     correctly** (click each preset, confirm the visible numbers
     change) before assuming it does, since Financials was the original
     screen this bug was reproduced on and it may not have been
     re-checked since the fix landed.
   - The date-range hook/control Financials already uses was **renamed
     and promoted**: `use-financials-range.ts` / `financials-range.tsx`
     → `app/admin/use-date-range.ts` / `app/admin/date-range-control.tsx`
     (`useFinancialsRange` → `useAdminDateRange`,
     `FinancialsRangeControl` → `AdminDateRangeControl`). **This already
     happened and `financials-client.tsx` already imports from the new
     location** (`import { AdminDateRangeControl } from
     "../date-range-control"`) — confirm this before assuming you need
     to do anything about it; you almost certainly don't, this note is
     here so you don't get confused seeing an unfamiliar import path and
     "fix" something that isn't broken.
6. `docs/DECISIONS.md` — ADR-55 (COGS model, non-sale consumption),
   ADR-56 (single admin header row), ADR-57 (flow-vs-balance — v2's
   extended cross-screen version is in `financials-screen.md`'s "The one
   rule the screen turns on" section, read that version not just the
   ADR text).
7. **Paper artboards** — file "Prosper Hotel", page "M5 — Dashboard &
   Audit", artboards **`Financials — desktop [v2]`** and **`Financials —
   mobile [v2]`**. Pixel reference; the spec doc is the written
   companion. Session B's screenshot-diff discipline against
   `get_computed_styles` (not just eyeballing) is the standard to match
   here too — Session B's PROGRESS.md entry names this as something it
   only did partially; don't repeat that gap.
8. **Sibling screens / files to copy structure from:**
   - `app/admin/dashboard-client.tsx` (the just-rebuilt v2 Dashboard) —
     it already demonstrates the profit-stack-card visual language
     (5-column hairline-split card, Net Profit's coloured background),
     the `AdminDateRangeControl` wiring pattern, and how a
     `getFinancialSummary` response gets consumed and formatted. You are
     NOT rebuilding the profit stack on this screen (it left Financials
     entirely — see §1) but the KPI-strip tiles and the Debts table will
     want the same figure-formatting helpers this file already has —
     check whether they're extractable/shared rather than
     copy-pasted twice.
   - `app/admin/financials/financials-client.tsx` — the CURRENT (M5)
     composed screen you are restructuring. Its five existing tabs
     (Stock Purchases / Deliveries / Handovers / Expenses / Owner Draws)
     and their toolbar/table pattern carry forward almost unchanged —
     you're removing the profit-statement zone above them and adding a
     6th tab, not rewriting the tab mechanics.
   - `app/admin/financials/handovers-tab.tsx` (or wherever the
     Handovers reconciliation table lives) — unchanged by v2, don't
     touch its internals; the pattern in `financials-screen.md`'s
     "Handovers reconciliation table" section is current documentation
     of what's already there.
   - `app/admin/customers/` (find the actual customer detail route —
     check `app/admin/customers/[id]/page.tsx` or similar) — the Debts
     card's rows need to link here. Confirm the exact route shape before
     hardcoding a link path.

---

## 1. THE SCREEN'S NEW SHAPE — READ THE SPEC, THIS IS A SUMMARY ONLY

Per `financials-screen.md` "Structure (v2 — current)":

1. **Header row** — title "Financials & Expenses", the
   `AdminDateRangeControl` (unchanged control, shared component now),
   tab-contextual primary action ("Record Expense" etc.), account
   avatar. **The entire profit statement is GONE from this header
   area and from the screen in general** — it lives on `/admin` now
   (Dashboard v2's "For `<period>`" zone). Do not rebuild it here even
   partially "for convenience" — that was the explicit point of the v2
   split (`financials-screen.md`'s "v2 RESTRUCTURE" section explains
   why).

2. **KPI strip** — six hairline-split tiles, ONE PER TRANSACTION TAB,
   in tab order: **Stock Purchases · Deliveries · Handovers · Expenses
   · Owner Draws · Non-Sale Consumption**. Caption above the strip:
   "THIS `<PERIOD>` AT A GLANCE". Each tile: uppercase label, a mono
   figure (count-led with a status dot when there's an open item — e.g.
   "2 pending" / "1 shortfall" in `--color-warning`/`--color-danger`;
   amount-led otherwise), a `--text-disabled` caption ("6 payments",
   "28 expenses"). **The tile matching the currently-active tab gets a
   2px `--color-accent` left-rule + `--surface-subtle` background**, and
   clicking any tile switches to that tab — the strip doubles as a tab
   indicator, it is not a separate/independent summary. Where do the
   six tiles' figures come from? Mostly the SAME data each tab's own
   list already needs (count + a sum) — compute tile figures from
   whatever each tab already fetches rather than a seventh new read;
   only Non-Sale Consumption's total has an existing dedicated field
   (`getFinancialSummary().nonSaleConsumption.total` — already fetched
   for the tab itself, don't fetch it twice).

3. **Debts owed to the business** — a bordered card, NOT a single
   balance line anymore. Header row: title + sub-caption "Unpaid
   customer credit, as of today — click a customer to see their
   account" + the total (mono, top-right — this total is
   `GET /api/financials/summary`'s `consolidated.debtsOwedToBusiness`,
   which is UNCHANGED and still the correct total; the new ROWS come
   from a different endpoint, see below). Then a compact table:
   **Customer · Amount owed · Oldest unpaid**, each customer name
   `--color-accent`, whole row links to the customer's detail page.
   Trailing **"View all customer credit →"** row linking to
   `/admin/customers` for the full list.
   - **Rows come from `GET /api/customers?owingOnly=true`** (Session A,
     confirmed shipped — see `docs/API.md` "Customers & Credit"). Each
     item: `{ id, name, phone, balance, lastActivityAt, oldestDebtAt }`,
     pre-sorted `oldestDebtAt` ascending when `owingOnly=true` is set —
     you do not need to re-sort client-side.
   - **`oldestDebtAt` labelling — already decided, do not relitigate.**
     The owner has accepted `oldestDebtAt` as a documented proxy (earliest
     `Debt.occurredAt` for the customer, not true per-debt FIFO aging —
     `docs/API.md`'s caveat explains why a precise version isn't possible
     with the current schema) and confirmed the UI should label the
     column **"Oldest unpaid" as-is**, no softened wording needed. Ship
     it exactly as `financials-screen.md` describes.
   - This is a **balance, as of now** (ADR-57) — not period-scoped by the
     header's date-range control. The "as of today" caption is mandatory,
     not decorative.

4. **Transactions zone.** Unchanged shape/mechanics from M5 (divider,
   "Transactions" heading + explainer, per-tab toolbar, tables with
   headers-visible-when-empty and the 64px bottom gap). **The change is
   a 6th tab:**

   **Non-Sale Consumption tab.** Columns: **Date · Product · Location ·
   Qty · Reason · Recorded by · Est. cost**. `Reason` is a small coloured
   pill: `Spoiled` → `--color-danger`/`--color-danger-bg`;
   `Complimentary` → `--color-info`/`--color-info-bg`; `Staff meal` /
   `Damaged` / `Other` → neutral `--text-secondary`/`--surface-subtle`.
   Toolbar count line: "N write-offs this `<period>` · KES `<total>`";
   primary action **"Record Non-Sale Use"**.
   - **Data source, confirmed by Session A:**
     `listMovements({ movementType: "non_sale_consumption", from, to })`
     via `GET /api/stock-movements?movementType=non_sale_consumption&from=&to=`
     returns every raw field (`productId`→resolve to name via the
     existing product lookup pattern every other tab already uses,
     `locationId`→name, `quantity`, `reason`, `recordedById`,
     `occurredAt`).
   - **`Recorded by` (a name) and `Est. cost` are NOT fields on the
     movement row — you compute/resolve them client-side, same as every
     other tab already does for its own columns.** `Recorded by`: resolve
     `recordedById` → staff name the same way another tab already
     resolves an actor id (check `expenses-tab.tsx` or `owner-draws-tab.tsx`
     for the existing pattern — don't invent a new one). `Est. cost`: the
     PER-ROW valuation is `buyingPrice` for ingredient/goods,
     `dishWasteCostPercent × sellingPrice` for dish (ADR-55) — check
     whether `computeNonSaleCost`'s per-reason logic is exported/reusable
     for a per-row figure, or whether you need a small client-side
     helper matching its formula exactly (don't reinvent the percentage
     or the valuation rule, just the per-row application of it).
   - **"Record Non-Sale Use"** — the write endpoint
     (`recordNonSaleConsumption` / its batch variant) already exists
     from M1; this is a drawer wiring exercise, following the same
     pattern as `expense-drawer.tsx` / `owner-draw-drawer.tsx` (kit
     `<Drawer>` + `<FormField>` + `<SegmentedControl>` for the reason).
   - **Mobile:** stacked cards — product name + cost on line 1, the
     reason pill + "`<location>` · `<qty>` units · `<recorded by>` ·
     `<date>`" caption on line 2.

5. **Mobile overall:** status bar + hamburger header + the
   `AdminDateRangeControl` on its own row (unchanged pattern), then a
   **2×3 KPI grid** (not a horizontal strip — six tiles read better as a
   grid at 390px), the Debts card stacked below it, then the divider +
   "Transactions" heading + a horizontal-scroll tab chip strip
   (off-default/active tab sorted toward the visible front, per ADR-66's
   established mobile-filter convention) + the active tab's stacked
   cards.

---

## 2. THE STILL-OPEN STORE / `perLocation` QUESTION — READ BEFORE YOU BUILD ANYTHING TOUCHING PER-LOCATION DATA

Session B found and explicitly did NOT resolve: `getFinancialSummary`'s
`perLocation[]` includes a **Store** row with `revenue: 0` and a
**negative** `grossProfit` whenever Store has purchase/COGS activity
with no matching sale — even though this project's docs (including this
very handoff's sibling `dashboard-screen.md`) have repeatedly stated
"Store naturally absent, it never sells." That claim is **false** on
real seeded data; it was never fixed, only worked around visually on the
Dashboard (a Total row was added there so the two location tables'
row-counts visually match, without addressing why Store shows up at
all — see `docs/PROGRESS.md`'s Session B entry, "Not resolved" section,
for the full detail and both fix options considered).

**This screen (`/admin/financials`) does not have its own
per-location table anymore** (that moved to the Dashboard entirely — see
§1's "the entire profit statement is GONE" note) — so this specific
display bug may not even surface visible symptoms on the Financials
screen itself. But **check before assuming it's irrelevant here**:

- Does anything on this screen's KPI strip, Debts card, or Non-Sale
  tab touch `perLocation` at all? (Likely no — but verify, don't
  assume, since the KPI strip tiles' figures need to come from
  somewhere and you should confirm none of them are accidentally
  summing a `perLocation` array that includes a phantom Store row.)
- If you find yourself needing ANY per-location breakdown on this
  screen, do not silently filter out Store client-side as a quick fix —
  that would make this screen and the Dashboard disagree about what
  `perLocation` means, which is worse than the current bug (per Session
  B's own reasoning for not doing this on the Dashboard either). Flag it
  to the owner instead.
- **If this doesn't come up while you're building**, it's fine to leave
  it exactly as documented (still open, still flagged) — you are not
  required to fix it in this session unless the owner asks. Just don't
  make it worse or paper over it with a screen-local filter.

---

## 3. WHY THE MANUAL WALKTHROUGH MATTERS HERE SPECIFICALLY

Session B's manual `pnpm dev` check (required by `CLAUDE.md`'s "Check"
phase) is what found the shared dual-shell header bug in §0 — a bug that
had been live in production Financials since M3, undetected, because
jsdom+RTL screen specs mock the data hooks and never exercise the real
shell-mounting behavior. **Do the same discipline here**, specifically:

1. Sign in as Admin, go to `/admin/financials` at a desktop viewport.
2. Click through all four period presets (Today / This week / This
   month / Custom) and confirm the KPI strip figures and the Debts card
   genuinely change where they should (KPI strip: yes, it's
   period-scoped; Debts card: no, it's a balance, it should NOT change
   with the period — if it does, something's wrong).
3. Repeat at a mobile viewport (< 768px) — this is exactly the
   viewport-pair the shell bug hid in.
4. Click every KPI tile and confirm it switches to the matching tab.
5. Open the new Non-Sale Consumption tab, confirm real seeded rows
   render with correct reason pills and a sane-looking cost figure.
6. Click a Debts-card customer row, confirm it lands on their real
   detail page (not a 404 / wrong id).

If you find something wrong, follow Session B's precedent: write a
`-HANDOFF-2.md` addendum documenting the repro precisely rather than
either silently working around it or leaving it undocumented for
whoever's next.

---

## 4. WHAT THIS SESSION DOES **NOT** DO

- No Dashboard changes — Session B already shipped and merged that.
  Don't touch `app/admin/dashboard-client.tsx`,
  `app/admin/use-dashboard.ts`, `app/admin/use-dashboard-trend.ts`, or
  `app/api/admin/dashboard/*`.
- No further backend work beyond what's already shipped by Session A —
  every field this screen needs already exists (`ownerDrawsForPeriod`
  is NOT used by this screen, that was Dashboard's ask; this screen's
  new needs are `owingOnly`/`oldestDebtAt` on Customers, already
  shipped, and the Non-Sale read, already confirmed ready). If you find
  a genuine gap, flag it rather than building a workaround silently —
  same discipline both prior sessions followed.
- No fixing the Store/`perLocation` question (§2) unless it's blocking
  something you're actually building — see that section.
- No new kit components. Compose from `components/kit/*` plus whatever
  screen-local patterns the existing five tabs already established.
- Don't touch `components/shells/admin-toolbar-context.tsx` or
  `admin-shell-client.tsx` — that infrastructure is fixed and shared;
  if you think you've found a NEW problem in it, that's surprising
  enough to flag and investigate carefully before changing shared code
  used by every `/admin/*` screen, not something to patch quietly.

---

## 5. TESTS

Extend the existing `tests/screens/*financials*.screen.test.tsx` (find
the exact filename — check `tests/screens/` for the M5-era Financials
spec) rather than replacing it: interactive bits only — KPI tile clicks
switch tabs, Debts card rows link correctly, the Non-Sale tab renders
reason pills and resolves recorded-by names, "Record Non-Sale Use"
opens its drawer and submits. Mock the data hooks the same way Session
B's dashboard spec does (`useFinancialSummary`, `useCustomers` or
whatever the Debts read's hook ends up being called, the Non-Sale
list read) — but remember Session B's own lesson: mocked-hook screen
specs cannot catch shell/context-level bugs, so they don't replace §3's
manual walkthrough, they complement it.

---

## 6. GATES

```
pnpm test          # baseline going in: 1023 tests, 126 files, all green (confirmed 2026-09-05)
pnpm typecheck     # must be 0 errors
pnpm build          # run after `rm -rf .next`
grep -rn "TODO(mock)" --include="*.ts" --include="*.tsx" app lib components
                    # must return nothing new (one pre-existing test-description
                    # string in lib/domain/stock/purchases.test.ts:61 is not a
                    # real marker — ignore it)
```

**Do NOT commit unless the owner explicitly asks** — standing rule,
every session in this project has followed it.

**Before you start:** run `git status` — there may be other in-progress
work on `main` from a concurrent session (this has happened before in
this feature's history; check `docs/PROGRESS.md`'s recent entries and
`git log --oneline -10` for context on what's current). If you find
uncommitted changes you didn't make, do not touch, revert, or build on
top of them without understanding what they are first — ask rather than
assume.

---

## 7. DOCS TO UPDATE WHEN DONE

- `docs/design/flows/financials-screen.md` — if anything about the
  KPI-strip tile composition or the Non-Sale tab's cost-resolution
  turned out to need a real decision beyond what's written, record it
  the way Session B recorded the trend-bucketing resolution.
- `docs/API.md` — only if you find a genuine backend gap and have to
  add something; otherwise this screen needs no new API documentation
  (everything it uses is already documented from Sessions A/B).
- `docs/PROGRESS.md` — a full session entry, following Session A/B's
  format: what shipped, gate state, the manual-walkthrough results from
  §3 (pass/fail per step), and whether the Store/`perLocation` question
  came up or stayed purely theoretical for this screen. **This closes
  out the three-session Dashboard & Financials v2 feature** — if nothing
  else is outstanding, say so explicitly so a future session doesn't go
  looking for a "Session D" that was never planned.
