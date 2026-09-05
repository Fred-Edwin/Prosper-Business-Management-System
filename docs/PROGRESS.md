# Prosper — Progress Log

Running status log, updated at the end of every sprint session.

**How this log is kept (so it doesn't inflate):**

- The **current milestone** gets a full entry per session: what shipped,
  what's blocked, what changed from plan, key ADRs, gate state.
- When a milestone closes, its detailed entries are **compressed to
  one-line ledger rows** in the "Shipped — earlier milestones" table
  below, and the full milestone plan (`docs/sprints/milestone-XX-plan.md`)
  plus the ADRs remain the durable record.
- Per-session handoff docs are **not** kept — once a session's PROGRESS
  entry is written, the handoff has done its job.

---

## Mobile parity — Dashboard (`/admin`) (Developer — 2026-09-05) — DONE

Against `docs/sprints/mobile-parity/dashboard-mobile-HANDOFF.md`. Goal:
make `/admin` at 390px match Paper `Dashboard — mobile [v2]` (`PQR-0`).
Desktop signed off and verified unregressed.

**Method.** Every value measured with `get_computed_styles` (never
eyeballed, CONVENTIONS §6); full `from → to` diff written and shown to
the owner before any code change. Paper tokens confirmed identical to
`app/design-system/tokens.css` (contentHash `710ac1c5`) — the only
deltas are the two documented ones (Paper still shows Inter vs shipped
Geist; retired `--surface-panel-tint`), neither affecting metrics.

**Shipped**

- **Zone order swapped on mobile** — the position card now leads, then
  the period control, then the profit stack, per the artboard. Done with
  CSS `order` (`order-N md:order-none`) so desktop renders in its
  signed-off order from the same markup. *This contradicted the flow
  doc's "v2 does not reorder zones between viewports"; owner ruled the
  artboard wins.*
- **Body rhythm**: mobile inline padding 24px→16px (358px content), zone
  gap 24px→16px, tail padding 40px→32px. Desktop keeps 24px/24px/40px.
- **Profit stack**: 8px radius, 12/16px rows, 15px/18px mono figures,
  Revenue sub-caption restored, Net row flat `--surface-subtle` (was a
  success/danger tint) with an 18px/22px figure.
- **Right now**: padding moved from the card onto each block so the
  hairlines run edge-to-edge; 10px/12px tile labels, 22px liquidity /
  16px sub-figures.
- **30-day trend card**: dropped the 24px "KES …" anchor figure on
  mobile (the artboard has none, and it overlapped the caption at 390px
  — Geist Mono is much wider than Paper's JetBrains Mono at equal px);
  70px bar box via a `--bar-scale` var that leaves desktop's 84px scale
  byte-identical.
- **Location tables**: titles pulled inside each card, 8px radius,
  measured row/total padding and type; stock rows put their meta on one
  line right.
- **Today's activity**: kept (owner call — the artboard was stale) and
  restyled to the neighbouring card language; "Sales so far" restored as
  an emphasised lead row (it is the day's headline figure and appears
  nowhere else on mobile). **Added to the Paper artboard** so design and
  code agree again.

**Kit changes (owner-approved).** `<PageShell>` and `<SegmentedControl>`
are shared kit; both were made responsive rather than forked:
- `page-shell.tsx` — body/toolbar inline padding `px-(--sp-6)
  md:px-(--sp-8)` (16px mobile, 24px desktop). Benefits every mobile screen.
- `segmented-control.tsx` — full-width with evenly-sharing segments and
  11px labels below `md`; at 390px the old fixed-width segments pushed
  "This month" onto a second line.
- `date-range-control.tsx` — `w-full md:w-auto` so the control can fill
  the mobile row.

**Corrected mid-session.** The mobile period-trend strip was reported in
the first diff as wrongly rendering; it was already correctly gated
`hidden md:flex`. Two measurement traps caused it and are worth knowing:
the admin shell mounts `children` twice (M2 S6b), so an unscoped query
reads the *invisible desktop mount* and returns zeroes; and `textContent`
of a `hidden` element still matches text probes. Every measurement must
be scoped to the visible mount.

**Gates** — all green. `pnpm vitest run
tests/screens/admin-dashboard.screen.test.tsx` 19/19 · `pnpm typecheck`
0 errors · `rm -rf .next && pnpm build` clean · no new `TODO(mock)`.
No new tests: layout/spacing only, no interactive behaviour changed.

**Walkthrough.** Driven as Admin at 390px and 360px — no horizontal page
scroll at either. Desktop re-checked at 1440px: original zone order,
5-column stack, 4-column position, both trend cards, table headers all
intact.

**Open / flagged**

- `/admin/financials` at 390px inherits the 16px padding correctly, but
  its range control keeps a "SHOWING" label that squeezes the segments so
  "This month" wraps. Cosmetic, out of scope for this screen — belongs to
  the Financials mobile-parity session.
- The 30-day strip renders near-flat against the current seed (one large
  outlier dwarfs ~29 near-zero days). Data shape, not layout.
- `perLocation`/Store remains open and deliberately unresolved (Store row
  with `revenue: 0`); untouched, never filtered client-side.

---

## Milestone 5 "Dashboard & Financials v2" Session C — Financials frontend (Developer — 2026-09-05) — DONE

Against `docs/sprints/m5-dashboard-financials-v2-session-C-financials-frontend-HANDOFF.md`.
**This closes the three-session feature: A (backend) → B (Dashboard
frontend) → C (this one). Nothing is outstanding; there was never a
Session D — do not go looking for one.**

**Shipped**

- `app/admin/financials/financials-client.tsx` rebuilt to v2 per
  `docs/design/flows/financials-screen.md` "Structure (v2 — current)":
  header row → KPI strip → Debts card → Transactions zone. The profit
  statement is **gone from this screen entirely** (it lives on `/admin`);
  `profit-panel.tsx` + `profit-panel-mobile.tsx` deleted as dead code.
- `kpi-strip.tsx` — six hairline-split tiles, one per tab, in tab order.
  Doubles as a tab indicator: active tile gets the 2px `--color-accent`
  left-rule + `--surface-subtle` tint, and every tile is a real button
  that switches tabs. Desktop 6-across; mobile 2×3 grid.
- `debts-card.tsx` — "Debts owed to the business" promoted from a single
  balance line to a real table (Customer · Amount owed · Oldest unpaid),
  each row linking to `/admin/customers/[id]`, plus a "View all customer
  credit →" row. A BALANCE, as of now (ADR-57) — not period-scoped, with
  the mandatory "as of today" caption.
- `non-sale-tab.tsx` + `non-sale-drawer.tsx` — the 6th tab. Reason pills
  on semantic tokens, client-side resolution of product / location /
  recorded-by, per-row ADR-55 est. cost. Drawer wires the existing M1
  `POST /api/stock-movements/non-sale/batch`.
- Hooks: `useOwingCustomers`, `useNonSaleConsumption` (in
  `use-financials.ts`), and `useFinancialsKpis` (new file).
- `page.tsx` — deep-link tab list corrected: dropped the stale `"profit"`
  (removed back in M5), added `"non-sale"`.

**No backend work.** Every field already existed from Session A.

**Decisions that went beyond the spec** — all recorded in
`financials-screen.md`'s new "v2 build notes" section: where the six KPI
figures actually come from (the spec's "compute from what each tab
fetches" is impossible — inactive tabs are unmounted); per-row Est. cost
(`computeNonSaleCost` is private + server-only, so the ADR-55 rule is
applied client-side with the percentage taken off the wire); "Recorded
by" resolution via `StaffView.userId` and its accepted gap (a User with
no Staff row renders `—`, never guessed); and the mobile tab row being
**scrolled rather than re-ordered** — a second re-ordered `<Tabs>` would
put a duplicate tablist with duplicate ids into the a11y tree at every
viewport, so ADR-66's intent is met by scrolling instead. That last one
is a deliberate, flagged divergence from artboard `PN6-0`.

**Store / `perLocation` (Session B's open question): did not arise.**
Verified explicitly — zero `perLocation` references anywhere in
`app/admin/financials/`. Left open and untouched, as instructed.

**Manual walkthrough (§3).** Ran `pnpm dev` as Admin at 1440px. Signed
in, loaded `/admin/financials`, confirmed the v2 structure renders
against real seeded data. The owner then drove the screen themselves and
signed it off ("everything checks out"). Per-step detail: the shared
dual-shell period control (Session B's `e275cba` fix) works correctly on
Financials — presets re-fetch and the visible figures change; the Debts
card correctly does **not** move with the period; KPI tiles switch tabs;
the Non-Sale tab renders seeded rows with correct pills and sane costs;
Debts rows land on the right customer. **Not separately re-verified by
me at <768px** — the owner's sign-off covered the screen as a whole; a
dedicated mobile-parity pass is queued (see below).

**Fixed during the session:** the KPI strip had no error state —
`useFinancialsKpis` captured an error but the shell only destructured
`{ kpis, refresh }`, so a failed read showed six "—" tiles with nothing
to say anything was wrong. Now renders `<ErrorState>` with retry, and has
a regression test.

**Gates.** `pnpm vitest run tests/screens/financials.screen.test.tsx`
27/27 (was 16 — extended with KPI-tile clicks, Debts links + the "as of
today" caption, Non-Sale pills / recorded-by / ADR-55 costs, the drawer
submit, and the KPI error state). `pnpm test:unit` 432/432.
`pnpm typecheck` 0 errors. `rm -rf .next && pnpm build` clean.
`grep -rn "TODO(mock)"` — nothing new.

**Also this session:** drafted six per-screen mobile design-parity
handoffs under `docs/sprints/mobile-parity/` (Dashboard, Stock/Ledger,
Catalog, Assets, Audit trail, Financials-verify) plus `_METHOD.md`
documenting the measured-diff method — `get_computed_styles` for every
value, never eyeballing a screenshot, flex ratios pulled explicitly.
Owner's direction: the admin desktop screens are in good shape but the
mobile ones drifted from Paper; each will get its own session against a
deep-linked, approved artboard.

---

## Milestone 5 — COGS bug: "This week"/"This month" inflated Net Profit (Developer — 2026-09-05) — DONE

Owner-reported: `/admin` and `/admin/financials` showed correct figures
for "Today", but picking "This week" or "This month" reported a **positive
~27,000 net profit for a period the business actually lost money in**.
Hand-calculation against the raw ledger put the true figure at −5,760.

Against `docs/sprints/cogs-pre-ledger-period-bug-HANDOFF.md` (a prior
session's handoff, now deleted per this log's policy).

### Root cause — a modelling error, not a boundary bug

`cogsByLocationSweep` computes `Opening + Purchases − Closing`, which
assumes **every non-purchase movement is consumption**. An `opening` row
violates that: it is not goods entering the business, it is a
*restatement of a position* ("we had N on hand"). `setOpeningStock`
(ADR-11) stamps it at `businessDateStartUtc(businessDate)`.

Dated like an ordinary movement, that row falls **inside** any period
starting earlier than the day tracking began. The closing term (`< end`)
counted it; the opening term, which only looked at `start`, could not —
so the entire opening-stock valuation looked like stock materialising
from nowhere, dragging COGS negative and inflating profit by the same
amount. With the dev ledger's 32,700 baseline that is the reported swing.

Crucially this is **not reachable by any boundary operator**: for a
week-long range the row sits *days* inside the period, nowhere near
`start`. `lt`, `lte`, and clamping `start` forward all fail.

### The fix — one `where` clause, no new queries

The opening term now separates `opening` rows by **type**, not timestamp:

```
Σ (non-opening movements  occurredAt <  start)     ordinary history
Σ (opening    rows        occurredAt <  end)       position restatements
```

An `opening` row inside the period lands in **both** the opening and the
closing term, so it nets to zero across the subtraction — correct, since
restating a position consumes nothing. A pair whose tracking starts
mid-period is then charged only what it actually bought and used. A
period entirely before any history has the rows on neither side, so it
stays 0.

Kept the original 3-query design — no per-pair clamp, no extra round
trips.

### Correcting the handoff's record

The handoff's §4 account of "Attempt 2" (that `lte` fixed week/month, and
fabricated a −32,700 loss on a prior-month range) was **reproduced and
found false on both counts**: `lte` leaves week/month at −25,600, and the
prior-month range returns 0.00. Attempts 3 and 4 (a global first-movement
clamp, then a per-(product, location) clamp) were therefore built against
a phantom, which is why they kept trading one regression for another. No
clamp is needed.

### Verified

- 7 ranges hand-checked against the dev DB — the 4 from the handoff's
  ground-truth table plus an all-time range and an empty far-future range
  (the two that previously caught nothing). All match, net −5,760.
- **Range-additivity restored**: the per-day `dailyNetSeries` now sums to
  the range summary (−5,760 = −5,760). Pre-fix the week summary said
  +26,940 while its own days summed to −5,760 — the ADR-64 telescoping
  identity held per-day but the range summary disagreed with itself.
- `lib/domain/dashboard/trend-series.ts` needed no code change: its
  same-day exclusion of `opening` rows already agrees, because
  `setOpeningStock` is the only writer of `opening` rows and always
  stamps the day-start instant (corrections included — they reuse the
  original date). Its doc comment said an "`opening` correction dated
  mid-day is ordinary flow", describing a row the system cannot produce;
  comment corrected to state the type-based rule the two paths now share.
- `cogs-pre-ledger-period.test.ts` kept and rewritten: its prose
  described the abandoned clamp, and one assertion claimed a pre-fix
  `+6,000` that never occurred. Added a third case — a pair whose
  tracking **begins mid-period** while it trades — which is the shape no
  boundary fix reaches. Both regression tests were confirmed to fail
  against the pre-fix code (−6,000 and −3,500) and pass after.

### Gates

`pnpm test` **1026/1026 across 127 files**, `pnpm typecheck` clean,
`pnpm build` clean.

### Not done / open

- The working tree also carries unrelated uncommitted test-infra changes
  (`.env.test` pinning `connection_limit=5`, `vitest.db.config.ts` raising
  `maxWorkers` 2 → 8). Not part of this fix; left for the owner to judge
  separately.
- Nothing committed — no commit was requested.

---

## Milestone 5 "Dashboard & Financials v2" Session B — Dashboard frontend (Developer — 2026-09-04/05) — DONE

Against `docs/sprints/m5-dashboard-financials-v2-session-B-dashboard-frontend-HANDOFF.md`
(+ a `-HANDOFF-2.md` addendum written mid-session recording the bug below).
Three sessions total for this feature: **A (backend, DONE) → B (this one)
→ C (Financials frontend, not started)**.

**Shipped**

- `app/admin/dashboard-client.tsx` rebuilt into the v2 zone order per
  `docs/design/flows/dashboard-screen.md` "Structure (v2 — current)":
  profit stack → Right now → trend row → Financial-performance +
  Stock-activity-by-location tables → Needs attention → Today's activity
  → Day Close.
- New route `GET /api/admin/dashboard/trend?from=&to=`
  (`app/api/admin/dashboard/trend/route.ts`) — a thin wrapper over the
  already-exported `dailyNetSeries` (ADR-64). `GET /api/admin/dashboard`
  itself stays `?date=`-only, per Session A's decision (not relitigated).
- `bucketTrendByPeriod` (in `dashboard-client.tsx`): daily bars for
  Today/This week, ISO-week (Monday-first) bars for This month, a
  documented 14-day threshold for Custom (dormant today — Custom is
  always single-day in this app; exists for if it grows a real range).
- Promoted the Financials date-range hook/control to shared `app/admin`
  level: `use-financials-range.ts` / `financials-range.tsx` →
  `use-date-range.ts` / `date-range-control.tsx`
  (`useFinancialsRange`→`useAdminDateRange`,
  `FinancialsRangeControl`→`AdminDateRangeControl`), behaviour
  byte-identical. Dashboard and Financials both import from here now.

**Bug found and fixed — pre-existing, not scoped to Dashboard.** Manual
`pnpm dev` walkthrough (required by CLAUDE.md's Check phase) found that
clicking a period preset fetched correct data but the visible header/body
sometimes didn't update. Root cause: `app/admin/admin-shell-client.tsx`
mounts `children` twice (once per desktop/mobile shell, M2 S6b) under one
shared `AdminToolbarProvider`. Any screen with a header-hosted period
control has two independent copies of that control's state, both racing
to publish into the one shared header slot — whichever mount's effect
fires last "wins" the header regardless of which shell is actually
visible, so the visible header could end up bound to the invisible
mount's state. Reproduced identically on `/admin/financials` (untouched
by this session beyond an import-path rename), confirming it predates
Session B. Fixed in `components/shells/admin-toolbar-context.tsx` (new
`AdminVisibleContext`/`useAdminShellVisible`/`<AdminShellVisibility>`) +
`admin-shell-client.tsx` (tracks the real visible shell via
`matchMedia('(min-width: 768px)')`, not just CSS) — only the visible
mount now publishes toolbar content. Verified end-to-end on Dashboard and
Financials, desktop and mobile, via a real browser walkthrough (commit
`e275cba`).

**Visual-parity fixes from an owner review against the Paper artboard**
(`P5Y-0`/`PQR-0`, file "Prosper Hotel" · page "M5 — Dashboard & Audit"),
commit `1b6db77`:
- Zone spacing corrected to the artboard's 24px (was 32px on desktop);
  trend-row gap corrected to 20px (was 16px).
- "Net profit per day" now renders the full 7-day week strip on the
  Today preset too, not just This week, matching the spec's "unchanged
  M5 week-strip look, just re-titled" intent — the trend fetch requests
  the current business week whenever the preset is Today or This week,
  not just the single selected day.
- The two trend cards (period + 30-day) now stretch to equal height
  (`items-start` → `items-stretch`) with their bar-baseline borders
  landing on the same row — both cards' caption rows and bar-chart boxes
  now share fixed heights instead of sizing to their own content.
- Added a Total row to "Stock & activity by location" so its row count
  matches "Financial performance by location" (owner's fix for the two
  tables' differing row counts — sidesteps the separate, still-open
  Store/`perLocation` question below rather than resolving it).
- The Net Profit tile (desktop + mobile) dropped its "KES " prefix and
  moved to the same type size as its sibling columns, matching the
  artboard and fixing the value wrapping to a second line for larger
  negative figures. Removed the now-unused `kes()` formatter.

**Also merged this session: Ledger v2** (`ledger-v2-kpi-and-range`
branch, built in a separate worktree by another agent session, reviewed
and verified there before merge) — KPI band, period-summary/drill-in
views for `/admin/stock`, reusing the same shared `AdminDateRangeControl`
/ `useAdminDateRange` this session promoted. Rebased onto this session's
`main` (commit `02b7b28`); the rebase's own conflict-resolution commit
missed one file's remaining old-name references
(`app/admin/stock/stock-client.tsx`, left uncommitted in the source
worktree) — caught by re-running `pnpm typecheck` on `main` immediately
after merging, fixed in a same-session follow-up (commit `82b2e18`).
Lesson: **always re-run gates on `main` itself right after a merge**,
not just on the source branch before merging — a worktree's uncommitted
state can pass gates there while the actual merged commit does not.

**Not resolved — flagged, needs the owner's decision:** `perLocation`
(hence "Financial performance by location") includes a **Store** row
with `revenue: 0` and a negative `grossProfit` whenever Store has
purchase/COGS activity with no matching sale, even though the table's
own caption says "Store excluded, it doesn't sell." Pre-existing
(confirmed identical on `/admin/financials`), not a Session B
regression, not fixed this session. Options: (a) accept Store can
legitimately show a row and fix the caption/doc claim, or (b) exclude
Store from `perLocation` server-side (`getFinancialSummary` change
affecting both Dashboard and Financials). The Total-row fix above
resolves the *visual* row-count symptom the owner raised without
resolving this underlying data question.

**Gates:** `pnpm test` 1004/1004 → 1023/1023 after the Ledger v2 merge
(two intermittent cross-file DB-race failures during the session,
`lib/domain/sales/qa-m2-session-7.test.ts` and
`lib/domain/sales/list-orders.test.ts`, both confirmed pre-existing/non-
code by rerunning each in isolation — 1004/1004 and 1023/1023 clean).
`pnpm typecheck` 0 errors (after the follow-up fix above).
`pnpm build` clean. `grep -rn "TODO(mock)"` — only the one pre-existing
non-marker hit in `lib/domain/stock/purchases.test.ts:61`.

**Changed from plan:** none for the Dashboard scope itself; the
shell-visibility bugfix and the Ledger v2 merge were both opportunistic
(discovered/requested mid-session) rather than planned Session B work,
but both are now on `main`.

**Not done this session (still open):**
- Visual/spacing diff of the *rest* of the screen (only the trend-charts
  row and location tables were checked precisely against the artboard;
  other bands were eyeballed, not measured with `get_computed_styles`).
- Full `pnpm dev` walkthrough of This month / Custom on both viewports.
- `origin/ledger-v2-kpi-and-range` (remote branch) and
  `origin/session-10b-kit-proof-harness` — local branches/worktree for
  the former were cleaned up after merging; the remote branches
  themselves were left for the owner to delete (destructive/shared
  action, not taken without explicit confirmation).

**For Session C (Financials frontend):**
- `use-date-range.ts` / `date-range-control.tsx` (formerly
  `use-financials-range.ts` / `financials-range.tsx`) are now the shared
  `app/admin`-level location — import from there, not the old
  `app/admin/financials/*` path.
- The dual-shell header-publishing bug (above) is fixed in shared infra
  — Financials' own period control should now work correctly without
  any change on Session C's part, but re-verify it manually rather than
  assuming, since Financials was the screen this bug was originally
  reproduced on.
- The Store/`perLocation` caption question (above) affects Financials
  too — worth resolving before/during Session C rather than carrying it
  forward again.

---

## Milestone 5 "Dashboard & Financials v2" Session A — backend (Developer — 2026-09-04) — DONE (backend only)

Backend-only session against the (unwritten-as-a-plan-doc) handoff
`docs/sprints/m5-dashboard-financials-v2-session-A-backend-HANDOFF.md`.
Three sessions total for this feature: **A (this one) → B (Dashboard
frontend) → C (Financials frontend)**. No schema migration. No frontend
screen work — the two test-fixture / one call-site edits below are pure
mechanical follow-through to keep `pnpm typecheck` green after widening
`CustomerListRow` and `DashboardView`, not screen composition.

**Decision Session B needs (§6 of the handoff): `GET /api/admin/dashboard`
still takes only `?date=` — no `from`/`to` were added.** The v2 period
control's THREE period-scoped Dashboard zones are split as follows:

- **Profit stack** (Revenue/COGS/Gross/Expenses/Net) + **"Financial
  performance by location"** — client calls `GET
  /api/financials/summary?from=&to=` directly. Already returned exactly
  this shape before this session (`consolidated`, `perLocation[]`) — **no
  backend change needed**, confirmed per the handoff's "verify, don't
  build" framing for this piece.
- **"Owner draws this `<period>`"** — **also** `GET
  /api/financials/summary`, not the dashboard aggregator. `consolidated`
  gained a new field, `ownerDrawsForPeriod` (Σ `OwnerTransaction` rows of
  `type = "draw"` only, unnetted against returns, over `from..to` — a
  FLOW, distinct from the existing `ownerOwedToBusiness` BALANCE). Chose
  this over adding the read to the dashboard aggregator (which the
  handoff explicitly steered away from — "lean toward NOT adding period
  params to this endpoint") and over leaving it to client-side summing of
  `GET /api/owner-transactions?from=&to=` rows (that endpoint has no
  server-side aggregation and summing money client-side, while not
  unprecedented in this codebase — `expenses-tab.tsx` already does it for
  a tab total — would have meant Session B reimplementing "sum draws
  only, ignore returns" itself). Reusing `/summary` means Session B builds
  the ENTIRE period-scoped zone (profit stack + per-location table +
  owner draws) from one call.
- **"Stock & activity by location"** — new, and it DOES live on the
  dashboard aggregator, per the handoff — it's a "now" figure like the
  rest of that endpoint, not period data. See below.

**Shipped**

- `lib/domain/dashboard/stock-activity.ts` (new) —
  `getStockActivityByLocation(today)`: per location (Store → Restaurant →
  Canteen, via `Location.type` — not a name-string match),
  `{ locationId, locationName, movementCount, lowStockCount,
  handoverStatus }`.
  - `movementCount` — a `groupBy` over today's `StockMovement` rows.
  - `lowStockCount` — reuses `needs-attention.ts`'s existing low-stock
    `groupBy` rather than a second sweep: `getLowOrNegativeStock` now
    also returns a `countByLocationId` map alongside its unchanged
    top-3-overall view (signature change, both call sites updated).
  - `handoverStatus` — folded from `getReconciliation(today).rows`
    (**not** re-derived from `Handover` directly) by `locationId`: any
    row `received === false` → `"awaiting"`; rows present and all
    received → `"received"`; no rows today → `null` (Store — no handover
    flow at all, PRD).
  - Wired into `getDashboard()` as `stockActivity: StockActivityByLocation[]`
    on the aggregate (Promise.all'd alongside the existing bands — no
    added round trips).
- `lib/domain/financials/owner-transactions.ts` —
  `getOwnerDrawsForPeriod(from, to)`: `Σ OwnerTransaction` where
  `type = "draw"`, business-date range `[from, to]`. Wired into
  `getFinancialSummary` as `consolidated.ownerDrawsForPeriod`.
- `lib/domain/customers/list-customers.ts` — `listCustomers` gained
  `owingOnly` (strictly-positive-balance filter, sorted oldest-unpaid
  first when set — otherwise the existing name sort is untouched) and
  every row now carries `oldestDebtAt` (earliest `Debt.occurredAt`, or
  `null`). `GET /api/customers?owingOnly=true` — chose extending the
  existing route/domain fn over a new endpoint, matching the handoff's
  explicit steer and the existing `?hasBalance=true` precedent on the
  same route.
- `docs/API.md` — "Dashboard" gained the `stockActivity` field + a "v2
  additions" note recording the from/to decision above; "Financials"
  gained `ownerDrawsForPeriod` in the worked example + explanation;
  "Customers & Credit" gained `owingOnly` + `oldestDebtAt`.

**§1b (Non-Sale Consumption) — VERIFIED, nothing built.** Confirmed, not
assumed:
- `app/api/stock-movements/route.ts` already accepts
  `?movementType=non_sale_consumption` (`listMovementsQuerySchema`
  already had the field) — no route change.
- `listMovements({ movementType: "non_sale_consumption" })` already
  returns every field the v2 tab needs: `productId`, `locationId`,
  `quantity`, `reason`, `recordedById`, `occurredAt`, plus `productName` /
  `unitLabel` (joined). New test:
  `lib/domain/stock/non-sale-consumption-read-shape.test.ts` — writes a
  real row and asserts the shape against it, rather than trusting the
  spec doc's claim.
- `Recorded by` (a resolved staff **name**) and `Est. cost` are **not**
  fields on `StockMovementView` — the row carries the raw
  `recordedById`, and cost is not persisted or returned anywhere. Per the
  spec (`financials-screen.md`), Session C is expected to resolve the
  name and compute cost the same way every other transaction tab and
  `computeNonSaleCost` already do (client-side, from data already on the
  page) — flagging this explicitly so C doesn't go looking for a
  `recordedByName` / `estCost` field that was never meant to exist.
- `getFinancialSummary(from, to).nonSaleConsumption.total` — unchanged,
  already the KPI tile total. No action needed.

**§1c open question — flagged to the owner, not guessed:** "oldest
unpaid" has no single well-defined meaning in this schema. `Debt` and
`Repayment` carry **no FIFO linkage** — a repayment reduces a customer's
total derived balance, not any specific debt row — so for a customer with
several debts and partial repayments, which individual debt(s) remain
"unpaid" is not answerable from the data as it exists today. Built
`oldestDebtAt` as a documented simplification (earliest `Debt.occurredAt`
for the customer, regardless of how much has since been repaid against
the balance as a whole) rather than inventing a FIFO-allocation business
rule unprompted. **Someone needs to decide**, before Session C ships the
"Oldest unpaid" column as literal fact: is the simplification acceptable
long-term, or does the product need real per-debt aging (which would mean
schema work — linking repayments to debts — well beyond this session's
read-only scope)? Documented in `docs/API.md` "Customers & Credit" so
Session C inherits the caveat, not just the field name.

**Tests** (+7 files): `stock-activity.test.ts` (7) — location order,
`movementCount` scoped to today only, `lowStockCount` reflects ≤0 on
hand, Store's `handoverStatus` is always `null`, and **two
reconciliation-agreement tests** asserting `stockActivity[].handoverStatus`
matches `getReconciliation(today).rows` exactly through an
awaiting→received transition and a mixed-status multi-row case (the
handoff's explicit "two reads of the same rows must not drift"
discipline, `day-detail-reconciliation.test.ts`'s S11 precedent);
`owner-transactions.test.ts` (+2) — draws-only sum ignores returns and
out-of-range dates, malformed-date rejection; `asof-semantics.test.ts`
(+2) — `getFinancialSummary().consolidated.ownerDrawsForPeriod` agrees
with `getOwnerDrawsForPeriod` directly and behaves as a flow (unaffected
by the balance-moving return, excluded entirely outside its date rather
than netted); `customers.test.ts` (+2) — `oldestDebtAt` correctness
(including the no-debt `null` case) and `owingOnly` (excludes
zero/negative balances including an overpaid customer, sorts
oldest-unpaid first); `non-sale-consumption-read-shape.test.ts` (2, new
file, §1b verification); `app/api/admin/dashboard/route.test.ts` (updated)
— `stockActivity` shape assertion added to the existing 200 case;
`app/api/financials/summary/route.test.ts` (+1) — `ownerDrawsForPeriod`
decimal-string shape; `app/api/customers/route.test.ts` (+1) —
`?owingOnly=true` 200 + filter sanity.

**Mechanical fixture/call-site fixes (not screen work) to keep
`typecheck` green after widening the two shared types:**
`app/cashier/orders/new/new-order-client.tsx` (one `onAttach(...)` call
gained `oldestDebtAt: null` for a brand-new customer),
`tests/screens/admin-customers.screen.test.tsx`,
`tests/screens/cashier-customers.screen.test.tsx`,
`tests/screens/cashier-orders.screen.test.tsx` (fixture rows gained
`oldestDebtAt`), `tests/screens/admin-dashboard.screen.test.tsx` (fixture
`DashboardView` gained a 3-row `stockActivity` fixture). None of these
touch screen composition or business logic — Session B/C still own the
real UI for `stockActivity` / `oldestDebtAt`.

**`app/globals.css` and `components/kit/dense-ledger.tsx` were not
touched** — confirmed clean of any change in this worktree at session
start (the parked Ledger-redesign work the handoff warned about was not
present here) and left untouched throughout.

**Gates:** `pnpm test` — baseline run (before this session's edits, on a
freshly-generated Prisma client this worktree needed via `pnpm
prisma:generate`) was 978/978 passing with 1 unrelated file flaking on a
concurrent-worker DB cleanup race, confirmed pre-existing/non-code by
rerunning that one file in isolation (11/11 green) after the codebase
was stable. Final full-suite result with every change in this entry
applied: see the session's actual gate report (typecheck 0 errors;
`grep -rn "TODO(mock)"` → none added, pre-existing state unchanged).

**Changed from plan:** none — this handoff was the plan (no
`milestone-5-plan.md`, matching S11/S13/S14/S15/S16 precedent).

**For Session B (Dashboard frontend):**
- `GET /api/admin/dashboard` — build `stockActivity` into the "Stock &
  activity by location" table exactly as returned; no client-side
  re-derivation.
- For the period-scoped zones (profit stack, per-location table, owner
  draws), call `GET /api/financials/summary?from=&to=` — **one call**
  covers all three; `consolidated.ownerDrawsForPeriod` is the new field.
- No prior-period comparison figure was built this session (see
  `docs/API.md` "Dashboard" v2 note) — if the profit stack's delta
  captions need one, that's a new ask, raise it rather than building a
  second summary call as a workaround.

**For Session C (Financials frontend):**
- Non-Sale Consumption tab: `listMovements({ movementType:
  "non_sale_consumption" })` is confirmed ready — resolve `recordedById`
  → name and compute cost client-side, the same way the other tabs and
  `computeNonSaleCost` already do; no new fields were added for this.
- Debts card: `GET /api/customers?owingOnly=true` returns rows
  pre-sorted oldest-unpaid-first with `oldestDebtAt` on each — **but read
  the caveat above** before labelling that column "Oldest unpaid" as if
  it were a precise per-debt figure; it is a customer-level proxy.

---

## Milestone 5 Session 16 — QA walkthrough: one awkward business day, end to end (Developer + Owner — 2026-09-04) — DONE

A full-day reconciliation pass, not a feature session. The owner scripted
one deliberately awkward business day — 20 steps across every role
(`docs/sprints/session-16-qa-walkthrough-RESUME.md` §3) — against
hand-computed **sealed predictions** (RESUME §4), to get eyes-on
confidence that a full day reconciles. The developer was the arithmetic /
code-investigation / bug-fix partner; the owner drove `pnpm dev` in their
own browser. Three sub-efforts that grew out of it each got their own
entry above + an ADR: **ADR-67** (location↔kind model enforcement),
**ADR-68** (cashier is a location-scoped stock reader), **ADR-69**
(receiving by destination). This entry covers the walkthrough itself, the
15 findings, and the close-out reconciliation.

### The baseline

`prisma/seed.ts` was rewritten (finding #1) from a screen fixture to the
RESUME §2 QA baseline: 10 opening-stock cells (Store: Rice 100, oil 20,
Chicken Breast 10; Restaurant: Chapati 30, Chicken Stew 10, Soda 48,
Water 24; Canteen: Soda 60, Water 40, Mandazi 50), model-compliant
kinds, priced per RESUME §2.

### The scenario (20 steps)

Opening stock → an Admin purchase split across two destinations (Rice →
Store, Soda ×12 → Restaurant) → kitchen issues → batch production →
Restaurant + Canteen sales (cash / M-Pesa / credit) → a Restaurant→Canteen
transfer → a Mandazi waste write-off → a canteen stock-count that *derives*
a sale → two staff handovers (one short) → two more receipts → day close.
Then the full §4 reconciliation.

### 15 findings (all fixed in-session, all gated)

`#1`–`#3` predate the QA-walkthrough handover chain; `#1` seed rewrite,
`#2` COGS day-1 opening-boundary in `getFinancialSummary`, `#3` the same
flaw in the dashboard net series (`trend-series.ts`). `#4`–`#14` are
detailed in the ADR-67/68/69 entries above and in the handover
(`docs/sprints/session-16-HANDOVER.md` §2). Summary:

| # | One-liner | Resolution |
|---|---|---|
| 1 | Dev seed was a screen fixture, not a QA baseline | `prisma/seed.ts` → RESUME §2 baseline |
| 2 | COGS day-1 opening-boundary: `occurredAt < start` (strict) excluded the day-1 `opening` rows from the opening term but kept them in closing → COGS dragged ≈ −32,700, Gross/Net inflated | `get-financial-summary.ts` opening term also matches `{ occurredAt: start, movementType: "opening" }`. `cogs-opening-boundary.test.ts` (new, 4). |
| 3 | Same flaw in the dashboard net series (telescoping-COGS, ADR-64) → fake +32,700 net on day 1 | `trend-series.ts` skips `opening` rows dated exactly at their day start. `trend-series-opening-boundary.test.ts` (new). |
| 4 | Production/Receive painted a false §9.8 "over stock" block on additive rows | screen-local `AdditiveStepperRow` / `AdditiveProductRow` — no ceiling, no block; kit untouched |
| 5 | *(not a bug)* stale M-Pesa view | — |
| 6 | No Canteen/Restaurant non-sale UI despite PRD §3 "any staff" | `canteen-non-sale` + `restaurant-non-sale` modes + routes + hub entries. **ADR-68** |
| 7 | Stock Count "Confirm count" pushed off-screen | `min-h-screen` → `grow min-h-0` (shell already `h-screen`) |
| 8 | Cashier non-sale 403 — `listMovements` denied `cashier` outright | location-scoped like every staff role. **ADR-68**; inverted `locations/route.test.ts` |
| 9 | Cashier non-sale entry too easy to miss | text link → full-width secondary `<Button>` |
| 10 | "Confirm count" button narrow | one-off `h-(--control-xl)` → `size="lg"` + `w-full` |
| 11 | SM delivery banner wired to an empty fixture (live `TODO(mock)`) — Admin purchases unreceivable | real `useOutstandingDeliveries()`; tile badge fixed; Flag action dropped (wrong domain path) |
| 12 | Canteen Review & Receive blocked receiving MORE than dispatched | screen-local `ReceiveLineRow` (same root cause as #4) |
| 13 | *(enhancement, owner)* review screens didn't show resulting balance | shared `<ResultingBalanceLine>` — "60 → 72" second line on additive flows |
| 14 | Receiving scoped to the receiver's HOME location (ADR-67 fallout) — a Restaurant/Canteen-destined purchase was a dead end | receiving by DESTINATION; `lib/domain/stock/receiving-scope.ts` single source for read + write. **ADR-69** |
| 15 | SM Receive Goods read every non-Store product's on-hand as 0 — a single-location balance read on an inherently two-destination flow (ADR-67: ingredients→Store, goods→Restaurant) | **This session.** See below. |

### Finding #15 — SM Receive Goods on-hand (this session)

**Symptom.** On `/store-manager/flows/receive`, goods rows (Soda, Water,
Mandazi) showed "On hand: 0" and a resulting balance of "0 → N". Only
Store products (Rice, oil, Chicken Breast) read a real balance.

**Root cause.** `movement-picker-flow.tsx` resolved a single
`balanceLocationId` (the Store for `receive`) and read
`useStockLevels(that)`. But post-ADR-67 the Receive flow is inherently
**two-destination** — its submit already kind-splits into a Store batch
(ingredients) and a Restaurant batch (goods). The on-hand readout never
got that split, so goods rows looked up the Store, found nothing, and
rendered 0. `useStockLevels` / `GET …/balances` are both single-location
by design (`locationId: z.string().min(1)`).

**Fix (owner chose the client-side per-row option; plain defect, no ADR).**
`movement-picker-flow.tsx`:

- A second `useStockLevels(restaurantLocationId)` read, active for
  `mode === "receive"` only — `useStockLevels(undefined)` is a no-op, so
  every other mode pays nothing.
- New `onHandFor(productId, kind)`: `receive` + `kind === "goods"` → the
  Restaurant balance; everything else → the existing Store/source
  balance. The exact mirror of the submit-time kind-split.
- The second read's loading/error folded into the screen's, same as the
  first.
- The resulting-balance line (#13) is `before + added`, so a correct
  `before` makes the goods "after" correct for free.
- `canteen-receive` (ADR-69) verified unaffected: it is `CANTEEN_SOURCED`,
  single-location, and both new guards are `mode === "receive"`.

**Also fixed this session — dead "Flag Variance" button** (owner-approved
frozen-kit exception). `components/kit/banner.tsx` rendered its "Flag
Variance" button unconditionally, even when a caller passed no `onFlag`.
The two `PurchaseDeliveryBanner` callers (SM + Canteen hubs) deliberately
omit `onFlag` — it calls `flagTransfer`, the two-phase **transfer**
variance path (ADR-39), which rejects a `purchase_payment` row — so both
delivery banners showed a button that silently did nothing. Guard added:
`{onFlag && <Button>Flag Variance</Button>}`. Strictly additive — every
caller wanting Flag already passes `onFlag`. Note added to the Banner
section of `docs/design/kit-audit.md` (co-owned with the audit session;
additive table row, no collision).

**Tests (this session).** `store-manager-flows.screen.test.tsx`: the
`useStockLevels` mock made location-aware (`loc-rest` → a distinct
Restaurant balance set); two new `bug #15` cases (ingredient rows read
the Store, goods rows read the Restaurant; a selected goods row's
resulting balance is off the Restaurant on-hand); one production test
fixed to mutate the Restaurant object. Negative Flag-button assertions
added to `store-manager-hub` + `canteen-hub` screen specs (absent on the
delivery banner, still present on the transfer banner).

### The close-out reconciliation — every sealed figure MATCHED

After day close, the app was reconciled against the RESUME §4 sealed
predictions (frozen; not recomputed to match the app):

| Figure | Predicted | App (`/admin/financials` + `/admin`) | |
|---|---|---|---|
| COGS | 7,100.00 | 7,100.00 | ✓ |
| Gross Profit | −4,560.00 | −4,560.00 (both screens agree) | ✓ |
| Net Profit | −5,760.00 | −5,760.00 (Dashboard + Financials + 30-day) | ✓ |
| Revenue | 2,540.00 | 2,540.00 | ✓ |
| Cash at hand | 3,320.00 | 3,320.00 (handover shortfall did NOT move cash — ADR-53/54) | ✓ |
| M-Pesa / bank till | −3,040.00 | −3,040.00 (renders cleanly, no clamp) | ✓ |
| Owed back by owner | −3,000.00 | −3,000.00 ("business owes owner") | ✓ |
| Debts owed to business | derived | 520.00 | ✓ |
| Non-sale ("unsold stock went") | 60.00, a view INTO COGS | 60.00 spoiled, "already inside the COGS figure" | ✓ |
| Restaurant Soda 300ml closing | 44 | 44 | ✓ |
| Canteen Soda 300ml closing | 60 | 60 (opening 60, +12 transfer-in, −12 derived sale) | ✓ |
| `/admin/stock` total closing | — | 422.0, every line matches the handover "expects at close" column | ✓ |

Negative Gross/Net and negative M-Pesa render cleanly on both screens (no
crash, no clamp to 0). A stale hand-written local QA note showed a
pre-#2-fix COGS; disregarded — the sealed predictions in the RESUME are
the source of truth and the running (fixed) app matches them.

### Logged for their own future handoffs (NOT built here)

- **`account_transfer` (Cash↔M-Pesa) is UNBUILT** — the enum value exists,
  but no domain fn / route / UI. PRD §4.7 calls for it. Needs its own
  session.
- **Finding #15 aside — cross-location on-hand.** The SM Receive screen
  still shows "On hand: 0" for a product whose only stock is at the
  *Canteen* (e.g. Mandazi, 45 at Canteen). This is *correct* for the
  screen — an SM receipt can only land at the Store or Restaurant
  (ADR-67) — but a "0 here / N elsewhere" hint could reduce confusion.
  Design question, deferred.
- **Test-DB isolation (ADR-61 territory).** The cross-file `DayClose`
  race persists — under the full parallel run one suite briefly seals
  "today" and a concurrent suite writing a "today" row can time out or
  500. `lib/domain/financials/get-account-balances.test.ts` timed out
  once in this session's final full run; green in 2.6s isolated. Same
  class as the known `correct-order.test.ts` flake. Not introduced here.

### Gates

`pnpm test` — 973 passed / 974 (120 files). The one failure is
`get-account-balances.test.ts` **timing out** (15s) under parallel DB
load — passes isolated; unrelated to this work (financials domain,
untouched). `pnpm typecheck` 0 errors. `pnpm build` clean after
`rm -rf .next`. No `TODO(mock)` in `app` / `lib` / `components` — this
session cleared the last one (#11).

### Optional (owner's call, not done)

Re-run the script as a full scripted **week** to check day-boundary
carry-over — Tuesday's opening == Monday's closing, and a week crossing
month-end.

### Docs

`docs/PROGRESS.md` (this entry). ADR-67 / ADR-68 / ADR-69 written (see
those entries above). `docs/design/kit-audit.md` Banner note. The three
`session-16-*.md` handoff / resume docs remain in the tree as the
walkthrough's durable record for the optional week-long re-run; they can
be dropped once that's done or explicitly skipped.

---

## Milestone 5 — ADR-69: delivery receiving by destination (Developer — 2026-09-04) — DONE

Backend + frontend bug fix, one session, run alongside the owner's manual
QA walkthrough. Not on the M5 plan's session table — a defect the
walkthrough surfaced. Full detail in **ADR-69**; handoff was
`docs/sprints/session-16-adr69-delivery-receiving-HANDOFF.md`.

**The bug (owner, live).** A purchase payment for Soda 300ml ×12 destined
for the **Restaurant** showed as "Awaiting delivery" on
`/admin/financials` and **no staff role could receive it** — no SM hub
banner, an empty "Deliveries awaiting receipt" list in the SM Receive
flow. ADR-67 fallout: it moved goods deliveries to land at the Restaurant
and updated the WRITE path, but `listOutstandingPurchasesForLocation`
still filtered on the caller's single assigned location — so the SM,
assigned to the Store, could post a Restaurant receipt but never see one
was pending. The Canteen was worse: `/outstanding` `403`'d the attendant
outright, so a Canteen-destined purchase had no receive screen at all.

**Shipped — backend**

- `lib/domain/stock/receiving-scope.ts` (new) —
  `resolveReceivingDestinationIds(role)`, the single source of truth for
  the destination map: admin → unfiltered, `store_manager` → Store +
  Restaurant, `canteen_attendant` → Canteen. Resolves by `Location.type`
  (active only), never by name.
- `listOutstandingPurchasesForLocation` takes a **list** (`string |
  readonly string[]`, normalised) → `{ locationId: { in: [...] } }`;
  `undefined` still means no filter (the Admin read, unchanged).
- `GET /api/stock-movements/outstanding` widened to
  `["admin", "store_manager", "canteen_attendant"]` and resolves through
  the map. Misconfigured staff (no location link) still `403`.
- `resolveBatchActor` gains **`guardReceivingDestination(target)`**,
  checking the same map. The receipts batch route's inline "is the target
  a restaurant?" ADR-67 carve-out is **deleted** in favour of it — read
  and write can no longer drift. `guardLocation` untouched for the other
  batch routes. The single-movement `purchase_receipt` case had the
  identical hole and now uses the map too. R1 stays the backstop.

**Shipped — frontend**

- New mode **`canteen-receive`** in the shared `MovementPickerFlow`
  (`FLOW_CONFIG` entry + `CANTEEN_SOURCED` membership + an `isReceive`
  helper replacing the `mode === "receive"` literals), and the thin
  wrapper route `app/canteen/flows/receive/page.tsx`. One
  `receiptBatch` at the Canteen — **no kind split** (the Canteen only
  holds dish/goods). No kit change.
- Canteen hub — a **"Receive Goods"** tile (`PackagePlus`, "N deliveries
  pending" + badge) and pinned **`<PurchaseDeliveryBanner>`** rows,
  mirroring the SM hub. Primary "Review & receive" routes into the flow
  (never a one-tap receipt — a delivery can arrive short); no `onFlag`
  (that is the two-phase transfer path and rejects a `purchase_payment`).
- Admin payment drawer — the **Destination** `<Select>` now offers only
  locations legal for the product's kind (ingredient → Store; goods →
  Restaurant/Canteen), and clears a stale destination when the product
  changes kind. Stops the Admin creating an unreceivable dead-end row.
  Dishes were already excluded from the picker (ADR-46 §6).

**Tests.** `list-outstanding-destination-scope.test.ts` (new, 5);
`canteen-receive-goods.screen.test.tsx` (new, 10); +6 canteen-hub cases,
+3 financials destination cases, +3 batch-route cases (SM sees the
Restaurant payment — the exact bug; SM→Canteen and attendant→Store
receipts `403`). **One test inverted:** `batch.route.test.ts`'s "canteen
attendant → 403 (route not widened to them)" encoded the reversed rule
and is now "canteen attendant sees the Canteen's payments, and only
those".

**Gates.** `pnpm test` 972/972 (118 files → 120), `pnpm typecheck` 0
errors, clean `pnpm build` green, no `TODO(mock)`. No schema change.

**Unblocks** scripted step 3 of the Session 16 QA walkthrough
(`docs/sprints/session-16-qa-walkthrough-RESUME.md`).

---

## Milestone 5 — Enforce the location ↔ product-kind stock model (Developer — 2026-09-04) — DONE

Backend + frontend modelling correction, one session. Not on the M5 plan's
session table — a cross-cutting invariant the owner clarified during the
Session 16 QA walkthrough that was held up only by convention (the seed +
per-flow UI product filters). Made it a real, enforced domain rule and
changed the SM/Canteen UI flows to match. Full detail in **ADR-67**;
handoff was `docs/sprints/location-stock-model-enforcement-handoff.md`.

**The model (now enforced, not just implied).** Ingredients live only at
the Store; dishes and goods live only at the Restaurant/Canteen; a
transfer is Restaurant↔Canteen and carries dish/goods only.

**Shipped — backend**

- `lib/domain/stock/guards.ts` — three new guards:
  `assertKindAllowedAtLocation` (R1: ingredient⇒store, dish/goods⇒
  restaurant/canteen), `assertTransferLocations` (R2: both endpoints
  restaurant/canteen, never the store), `assertTransferableKind` (R3:
  dish/goods only). Same shape as `assertProductIsDish` — minimal
  `select`, `NOT_FOUND` for missing/deleted, `VALIDATION_ERROR` for the
  rule.
- Wired in: `setOpeningStock`; `recordPurchaseReceipt` + batch (shared
  `receiptLineCore`); `recordKitchenIssue` + batch (`issueLineCore` — now
  also pins the product to `ingredient`); `recordNonSaleConsumption` +
  batch (`nonSaleLineCore`); `recordTransfer` + `recordTransferBatch`
  (R2 once per call before any write; R3 per line in
  `transferDispatchLineCore`). `recordProduction` already satisfied R1 —
  one-line comment added. `acceptTransfer` / `flagTransfer` /
  `correctMovement` deliberately **not** guarded (they derive
  location/product from an already-validated row and can't change
  either).
- `POST /api/stock-movements/receipts/batch` — new "SM → Restaurant"
  carve-out (mirrors the `production` / `transfer` batch routes): a
  `store_manager` may post a receipt batch at a `restaurant`, for goods
  deliveries. Domain R1 is the backstop.
- **Sales (`sale` / `stock_count`) — no new guard.** Both `createOrder`
  and `recordStockCount` already require an active `ProductLocation` with
  a non-null `sellingPrice`, and an ingredient can never have one.
  Confirmed by `lib/domain/sales/ingredient-not-sellable.test.ts` (locks
  it in — goes red if a future change lets an ingredient carry a selling
  price).

**Shipped — frontend (`app/store-manager/flows/movement-picker-flow.tsx`)**

- **SM Transfer is single-source from the Restaurant.** Was per-product
  multi-source (dishes from the Restaurant, goods from the Store) via
  `useTransferSourceLevels` + a per-source batch split — both **deleted**.
  Now one `transferBatch { fromLocationId: restaurant, ... }`.
- **Transfer / Canteen Dispatch destination is auto-resolved, no picker.**
  `validDestinations = locations.filter(not source && not store)`; with
  exactly one it auto-sets `destId` and the direction badge shows it
  ("Restaurant → Canteen" / "Canteen → Restaurant"). `<Select>` kept only
  for the 2+ case; `EmptyState` for the 0 case.
- **Receive splits by kind (3c decision — owner chose "option 2"
  in-session).** One screen lists every delivered item; on submit,
  ingredient lines → one `receiptBatch` at the Store, goods lines → one
  `receiptBatch` at the Restaurant. Chosen because goods can't sit at the
  Store *at all* under R1, and no legal movement gets them out afterwards
  — so they must land at a selling location on receipt, no intermediate
  hop. (Rejected: a second dedicated goods screen; honouring the
  `purchase_payment` "Destination" column — leaves unmatched manual goods
  lines with no target.)

**Regression budget — COGS/balances unchanged (ADR-55).** Guards are a
pure gate — reject illegal combos, never alter a written row.
`prisma/seed.ts` (Session-16 QA baseline, already model-compliant)
unchanged and still seeds. New
`lib/domain/financials/cogs-model-guards-regression.test.ts` drives a
model-compliant world through the guarded domain fns and asserts (a) every
legal movement accepted, (b) COGS delta == hand-computed figure, incl. a
Restaurant→Canteen transfer netting to zero across COGS.

**Tests.** Stock-domain transfer fixtures rewritten from `store→canteen`
ingredient transfers to `restaurant→canteen` goods transfers;
`setupStockTestData` gains `goodsProductId`. R1/R2/R3 cases added to
`transfer.test.ts`, `movement-batch.test.ts`, `movement-guards.test.ts`.
`derived-balance.test.ts` / `correct-movement.test.ts` fixtures that put a
non-ingredient at the Store (or an ingredient at Restaurant/Canteen)
switched to model-compliant kinds. `batch.route.test.ts` gains the
SM→Restaurant receipt carve-out cases. Screen specs
(`store-manager-flows`, `canteen-transfer-dispatch`) updated: no
Destination `<Select>`, single-source transfer, the receive split.

**Gate.** `pnpm typecheck` 0, `pnpm build` clean, no `TODO(mock)` in
touched files. `pnpm test` green on the clean run. **Known pre-existing
flake (not introduced here):** a cross-file race on the global `DayClose`
table — one suite briefly seals "today", and a concurrent suite writing a
"today" `StockMovement` can 500 with "This day is closed". Recurred once
across ~4 full runs during this session, always passing on re-run. ADR-61
(test DB isolation) territory; out of scope for this handoff.

**No schema migration** (no schema change).

**Docs.** ADR-67 (new). PRD §3 movement table + §4.2 tightened. SCHEMA §3
note under `StockMovement`. `docs/design/flows/staff-stock-movements-flow.md`
updated (no destination picker; single-source transfer; receive split).

---

## Milestone 5 Session 15 — Build the audit-trail screen + batch grouping (Developer — 2026-09-04) — DONE

Full-stack. The read backend existed (S11) but ignored `correlationId`;
batch-grouping is new backend work this session, then the screen composed
against it. Built to the approved M5 S12 design
(`docs/design/flows/audit-screen.md` + Paper "Prosper Hotel" · page "M5 —
Dashboard & Audit", `Audit trail — desktop/mobile [M5]`).

**Shipped — backend (ADR-65)**

- `lib/domain/audit/list-audit-log.ts` — `listAuditLog` now groups rows
  sharing a `correlationId` (extracted from `newValue` JSON — not a
  column) **and** the same `action` into one `BatchGroup`. Returns
  `{ items, actors, page }`: an item is `{ kind: "single", entry }` or
  `{ kind: "batch", correlationId, action, actorId, actorName, count,
  entityType, subAction, occurredAt, entries }`. The S11 flat
  `entries: AuditLogEntryView[]` is **gone**; `flattenAuditItems(items)`
  exported for callers that want the raw rows.
- **Pagination is by ITEM.** A batch never straddles a page: the read
  applies filters at the DB, fetches the whole matching set newest-first
  (bounded `SCAN_CEILING = 5000` — justified by the tens-of-rows/day
  volume, same argument S11 used for offset pagination), folds into
  buckets, slices `limit` items from `offset`. `page.total` = item count.
  Label resolution still one batched query per entity type on the sliced
  page (S11 N+1 guarantee holds). Full rationale + the mixed-batch and
  one-row-bucket rules in **ADR-65**.
- `actors: { id, name }[]` added to the response — every `User` with ≥1
  audit row, name-sorted, one `groupBy`, filter/page-independent (the
  Actor dropdown's option list).
- `GET /api/audit` route unchanged (thin pass-through); `docs/API.md`
  "Day Close & Audit" rewritten for the grouped shape, S11's flat
  response marked superseded.

**Shipped — frontend**

- `app/admin/audit-trail/` — `page.tsx` (parses the Dashboard's
  `?action=correct&from=&to=` deep link), `audit-trail-client.tsx`,
  `audit-format.ts` (per-row summary + FIELD/WAS/NOW resolution + entity
  label/link/fallback + action tone), `use-audit-trail.ts` (one read,
  `request<T>` shape like `use-dashboard.ts`).
- Composed from `components/kit/*`: `<PageShell>` / `<AdminPageHeader>` /
  `<FilterToolbar>` (four `<Select>` + the `<ToggleSwitch>`) /
  `<ErrorState>` / `<EmptyState>` + the Financials table language
  (bordered `<div>` grid, info-bg uppercase header, hairline rows, plain
  coloured status text). Two things the kit had no answer for — both
  built in the screen file, re-using existing visual language, **not** new
  kit components: (a) the expanded FIELD/WAS/NOW mini-table (bordered
  `<div>` grid, profit-stack language); (b) the **mobile card layout**
  (audit-screen.md §"Mobile" / artboard `OEA-0` — action · entity ·
  timestamp on line 1, summary line 2, actor line 3). The desktop table
  is `hidden md:flex`; a `flex md:hidden` card list renders the same
  items on mobile.
- Default view = `group=significant` (logins hidden). "Show everything"
  toggle drops the restriction; result line switches copy (trimmed on
  mobile); logins would appear (none in the dev seed — the exclusion is
  proven by the domain test, not a live screenshot).
- Batch rows render as one summary row ("N items received · 9:14am" —
  `newValue.action` normalised, `_batch` suffix stripped) that expands to
  the member rows; each member row itself expands its own FIELD/WAS/NOW
  detail. A `"single"` is a plain row with an inline chevron; trivial
  rows (`day_close` / `day_reopen`) have no chevron. Verified on the real
  seeded DB — a 3-row seed batch collapses to one summary row.
- Pagination footer — "1–50 of N" · Previous / Page N of M / Next; page
  size 50; Previous disabled on page 1, Next on the last page. Any filter
  change resets to page 1.

**Kit changes this session (owner-directed, both in `components/kit/*`)**

- **`<Select>` popover width (kit-audit.md §Select).** Was `w-full`
  (trigger width) + fixed-height option rows, so a long option label
  wrapped and overflowed. Now `min-w-full w-max max-w-[26rem]` +
  `whitespace-nowrap` rows. Byte-identical for short-option selects;
  fixes the audit Entity dropdown (18 long options). Tokens-only, no API
  change.
- **`<FilterToolbar>` mobile — ADR-66.** Removed the "3 chips + `More` →
  `BottomSheet`" overflow. Mobile is now one horizontal-scroll row of the
  **real** controls (`<Select>` / `<DatePicker>` / toggle), every filter
  always visible; off-default controls sort first. Owner decision: for
  the 3–5-filter screens that are the real case, a filter must never hide
  behind an overflow affordance. Toggle stays an inline control (a
  divergence from `OEA-0`, which drew it on its own row — owner chose kit
  consistency). `MobileChip` + the `bottom-sheet` import deleted from the
  file. Affects Assets / Customers / Stock / Sales mobile too — all their
  screen specs pass unchanged.

**Changed from plan**

- **Date filter is presets only** (Today / Last 7 days / Last 30 days /
  This month). The kit `<FilterToolbar>`'s `kind:"date"` bridges a single
  day, not a range — a preset `<Select>` is the honest kit fit. A custom
  range picker is deferred (would need a kit answer that doesn't exist).
  The Dashboard's explicit `?from=&to=` still passes straight through.
- Two kit changes (above) were not planned — they came out of the owner
  looking at the shipped filter chrome on mobile.
- No M5 plan file exists (M5 never formally opened) — the session prompt
  was the plan, as in S11/S13/S14.

**Tests:** 867 → 881 (+14). Domain `list-audit-log.test.ts` +5 (batch
fold, no-split-across-page, mixed batch, one-row bucket, actor list);
route test updated for the `items` shape; new
`tests/screens/admin-audit-trail.screen.test.tsx` (+9 — filter re-query,
show-everything toggle, scalar expansion → FIELD/WAS/NOW, raw fallback,
batch expansion, mobile card list, pagination). All 111 test files green.
`pnpm test` + `typecheck` + `build` all green (full suite run last).

**Docs.** ADR-65 (batch grouping + pagination-by-group), ADR-66
(FilterToolbar mobile row); `docs/API.md` "Day Close & Audit" (grouped
response + `actors`); `docs/design/filter-toolbar.md` §4 +
`docs/design/kit-audit.md` (Select popover + FilterToolbar mobile rows).

---

## M3 S7 follow-up — Handovers table redesign + typography foundation (Developer + Owner — 2026-09-04) — DONE

Frontend polish on the shipped `/admin/financials`, plus two foundation
token changes. No backend, schema, or route changes.

**Handovers reconciliation table — rebuilt to owner-approved v2** (Paper
"Prosper Hotel" · page "M3 S7 — Handovers table redesign", artboard
"v2 — APPROVED"). The old table stacked a `Cash / M-Pesa` pair in each
of 7 columns and read cluttered.

- Now a **bespoke grouped table** (the kit `<SimpleTable>` has no
  grouped-header / footer support — hand-built from token markup with
  full ARIA table roles; no kit change). Two-row header: group labels
  (Declared · Received · Variance) over `Cash | M-Pesa` sub-columns.
  **One line per row.**
- Columns: Staff (150) · Status (130) · six 90px money columns · Note
  (grow) · action (130); a hairline `border-l` opens each money group +
  Note.
- Status is a bare dot + coloured label (no filled pill). Real figure =
  `--text-primary`; exact `0.00` = `--text-tertiary`; variance = danger
  short / success over. Unreceived row → centered `—`. Note header
  centered; `—` in a Note cell centered. Totals strip aligns to the same
  columns, **not bold** (`--weight-medium` label, regular figures).
- Mobile stacked cards unchanged.

**Empty-state parity + 64px bottom gap** (from earlier this session,
carried): Handovers / Expenses / Owner Draws keep their table headers
when empty, the PAGE scrolls to the empty-state message (removed
`min-h-0` that trapped it in an inner strip), and every tab now has
`pb-(--sp-12)` so a short table reads as the end of the list.

**Typography foundation (ADR-63)** — a type audit of the code vs. the
Paper mockups for this screen found the app rendered Inter heavier /
fuzzier than the design:

- **`body` in `app/globals.css`** gains `-webkit-font-smoothing:
  antialiased` + `-moz-osx-font-smoothing: grayscale` + `font-synthesis:
  none` + `font-optical-sizing: none` + `text-rendering:
  optimizeLegibility`. Set once, inherited app-wide — every screen now
  renders closer to its mockup.
- **`--weight-semibold: 600 → 550`** in BOTH `tokens.css` and `tokens.ts`
  (the `tokens.test.ts` drift guard enforces they match). Inter is
  variable, so 550 is a true intermediate weight; the 3-step scale is
  kept, gentler at the top. Every `font-(--weight-semibold)` in the app
  softens at once — a deliberate global visual change.

**Docs.** ADR-63; `design-principles.md` §2 type scale; the flow doc
`docs/design/flows/financials-screen.md`.

**Tests.** 843/843 (`pnpm test`), `typecheck`, `build` all green. The
only failure during the work was the `tokens.test.ts` drift guard when
`tokens.ts` lagged `tokens.css` — fixed by syncing both.

---

## Milestone 5 Session 11 — Audit-trail read + day detail (Developer — 2026-09-03) — DONE (backend only)

Backend only. The audit-log **read** side (write side has existed since
M1, ADR-25) plus a one-date "everything that happened" read. No UI — a
later session builds the screens after a Paper pass.

**Shipped**

- `lib/domain/audit/list-audit-log.ts` — `listAuditLog(filter)`:
  paginated (OFFSET/limit), newest first. Filters: `from`/`to`
  (business-date range on `occurredAt`), `actorId`, `action`,
  `entityType`, and `group: "significant"` (corrections + deletions +
  day close/reopen + staff/payout/pay-adjustment creates — the
  investigable subset the screen defaults to). Each entry carries
  `actorName` (one `include`, no per-row query) and a best-effort
  `entityLabel` resolved with **one batched query per entity type on the
  page**.
- `lib/domain/audit/get-day-detail.ts` — `getDayDetail(businessDate)`:
  orders / stock movements / handovers (+receipts) / expenses / owner
  transactions / stock counts / payouts / close status for one
  Africa/Nairobi date. **Composed from the existing per-module reads**
  (`listOrders`, `listMovements`, `listHandovers`, `listExpenses`,
  `listOwnerTransactions`) called with an `admin` context; only
  `stockCount` and `staffPayout` are queried directly (no date-scoped
  domain read exists for them). Empty date → empty collections, not an
  error.
- `GET /api/audit` and `GET /api/audit/day-detail` — thin handlers,
  Zod in `lib/validation/audit.ts`, **Admin-only**.
- Tests: `list-audit-log.test.ts` (8) — filters, pagination stability,
  significant-set, label resolution, N+1 sanity;
  `day-detail-reconciliation.test.ts` (6) — **the reconciliation
  guarantee**: day-detail revenue / expense / handover figures equal
  `getFinancialSummary(date, date)` for the same seeded date; plus
  empty-date and every-category coverage. `app/api/audit/*/route.test.ts`
  (8) — admin-only gates.

**Test count:** 821 → 843 (+22). typecheck clean, build clean.

**Docs**

- `docs/DECISIONS.md` **ADR-62** — no separate reports page (owner's
  call); period reporting IS `/admin/financials`; M5 backend is only the
  audit read + day detail; reconciliation enforced by test.
- `docs/API.md` "Day Close & Audit" — full contract for `GET /api/audit`
  and `GET /api/audit/day-detail` (the M5 screen session builds against
  this, must not re-derive it). Old `GET /api/audit-log` /
  `GET /api/reports/*` stubs marked "not built".
- `docs/SCHEMA.md` §14 — the ingredients-only COGS split (superseded by
  ADR-55 in M3 S4, never edited) corrected to the ADR-55 all-stock
  sweep. This was the last doc describing the old formula.

**Changed from plan:** none — the session prompt was the plan (no
`milestone-5-plan.md` exists yet; M5 hadn't been formally opened).

**For the screen session — things that make the audit data hard to
design:**

- `oldValue` / `newValue` **shapes vary wildly by action**. There is no
  common schema. `docs/API.md` lists every known shape. Do NOT build a
  generic deep-diff renderer blind — design per action group
  (create / correct / delete / day-close).
- On a `correct` for an **order**, `entityId` is the *correction row's*
  id, not the original's. `handover` / `expense` corrections put the
  original's id in `entityId` and the correction id inside `newValue`.
  Inconsistent — the screen must special-case order corrections.
- `stock_movement` rows always have `action: "create"` in the enum
  column; the real sub-action (`purchase_receipt`, `transfer`, `issue`,
  `production`, `non_sale_consumption`, …) is `newValue.action`. Filter
  by `entityType` + read the sub-label from the Json.
- `entityLabel` is `null` for `money_movement`, `receipt_of_handover`,
  `staff_pay_adjustment`, `user` — the screen needs a graceful
  `entityType #id` fallback for ~4 of the ~15 entity types.
- `login` rows exist and are frequent — the default `group=significant`
  hides them; an "everything" view will be login-heavy.

## Milestone 5 Session 14 — Build the `/admin` dashboard + financials KPI-strip removal (Developer — 2026-09-03) — DONE

Full-stack session, backend already done (S13). Composition + wiring
against the finished `GET /api/admin/dashboard` aggregator, plus one
focused cut on `/admin/financials`. Built to the approved M5 S12 design
(Paper "Prosper Hotel" · page "M5 — Dashboard & Audit", `Dashboard —
desktop [M5]` + `Dashboard — mobile [M5]`; spec
`docs/design/flows/dashboard-screen.md`). Screenshot-diffed band-by-band
at both viewports against the Paper artboards.

**Shipped — the dashboard**

- `app/admin/use-dashboard.ts` — per-feature hook; one read of
  `GET /api/admin/dashboard`, same typed-request-error shape as
  `use-day-close` / `use-financials`.
- `app/admin/dashboard-client.tsx` — the composed screen. Five bands,
  each built from `components/kit/*` + screen-local mappers (never a kit
  fork):
  - **Band 1 — Position right now.** Four mono figure columns on
    `--surface-subtle`, hairline vertical rules (desktop); mobile:
    liquidity full-width, Cash + M-Pesa 2-up, Owed-by-owner.
  - **Band 2 — This week so far.** The 7-bar week strip in its own
    bordered box + three WTD figure columns (Revenue / Expenses / Net,
    each with a per-tile delta line — revenue ▲ good, expenses ▲ bad, net
    is prose "was + KES … by this point last week"). Deltas computed
    client-side from `revenueWtd` / `revenuePriorWtd` etc.; "no
    comparable point last week" when the prior figure is 0.
  - **Band 3 — Needs attention.** One row per non-empty queue (open prior
    dates / handovers awaiting receipt / open shortfalls / low-or-negative
    stock), coloured lead dot (amber, red for stock), two-line block,
    right-aligned action link (desktop) / inline link at end of detail
    (mobile). Collapses to a single `--color-success` "All clear —
    nothing needs you before you close." row when every queue is empty
    (the band never disappears).
  - **Band 4 — Today's activity.** Row of hairline-split count cells
    (Sales so far / Stock movements / Purchases & receipts / Handovers
    received-due / Corrections today). Mobile: vertical list, value in a
    32px slot; "Sales so far" is dropped and the handovers cell becomes a
    plain readout ("Handovers · 2 received · 1 awaiting"), matching the
    mobile artboard.
  - **Band 5 — Day Close + 30-day trend.** The existing Day Close card
    (unchanged logic) alongside the 30-bar trend strip + its anchor
    total. Two columns desktop, stacked mobile.
- **Mobile reorders** (built explicitly, not flattened): Position · This
  week · **Today's activity · Needs attention** · Day Close — Today's
  activity is ABOVE Needs attention on mobile, BELOW it on desktop.
- `app/admin/day-close/day-close-client.tsx` — extracted `<DayCloseCard>`
  (the card body) from `<DayCloseClient>` (the page wrapper). The
  dashboard composes the card as Band 5; the standalone client is kept
  for a direct mount / screen spec. Card ground switched to
  `--surface-subtle` with a `--surface-page` inset status row, per the
  artboard.
- `app/admin/page.tsx` — now renders `<DashboardClient />` (was
  `<DayCloseClient />`).
- The two inline bar strips (7-bar week, 30-bar trend) are plain flex
  `<div>` bars — the documented S12 one-off, no charting lib, no new kit
  component. Sign drives colour (`--color-success` / `--color-danger`);
  future days render a faded `--border-strong` stub at `opacity 0.35`.

**Shipped — the financials cut**

Per `docs/design/flows/financials-screen.md` M5 section: the "Position &
balances" KPI strip is REMOVED from `/admin/financials` — it now lives
ONLY on the dashboard (Band 1). Financials is analysis-only (range
control + profit report + five transaction tabs). Nothing else on that
screen touched.

- `profit-panel.tsx` — deleted `KpiRowDesktop` + `kpiTiles`;
  `ProfitPanelDesktop` no longer renders the position band or takes
  `asOfLabel`.
- `profit-panel-mobile.tsx` — deleted `KpiBandMobile` (the compact
  2-tile cash / M-Pesa dark band).
- `financials-client.tsx` — dropped the `<KpiBandMobile>` mount + import.

**Verification**

- Screenshot-diff pass per band, both viewports (1440 + 390), driven as
  Admin on `pnpm dev` against the seeded DB — every band matches the
  approved artboard for layout, grouping, content and order. The only
  differences are seed-data-driven (negative balances; "no comparable
  point last week" where the seed has no prior-week activity), not
  layout.
- **Reconciliation:** `tests/screens/admin-dashboard.screen.test.tsx`
  asserts the dashboard renders `position.cash` / `mpesaBank` /
  `liquidity` / `ownerOwedToBusiness` verbatim (no rounding / transform)
  and that `liquidity` prints as `cash + mpesaBank`. The data-layer
  guarantee `getDashboard().position === getFinancialSummary()` balances
  (proven in S13's `get-dashboard.test.ts`) therefore survives the UI
  wiring — the dashboard Position and the Financials balance figures
  agree at the same instant.
- Screen specs (interactive bits only): needs-attention action links
  navigate to the right routes; all-clear empty state; Day Close
  toggle → `close(date)` + toast and a recently-closed row's Reopen →
  `reopen(date)`, both from the card's new Band-5 position; Today's
  Activity "Purchases & receipts" → `?tab=purchases`.
- `financials.screen.test.tsx` KPI assertion flipped to a negative check
  ("no Position & balances strip"); the KPI-row `describe` removed from
  `admin-financials-expenses.screen.test.tsx`.
- No `TODO(mock)` in touched files.

**Link targets note:** "Review day →" points at `/admin` (the Day Close
card is here — there is no per-date review screen yet); "Correction
today →" points at `/admin/audit-trail` (the nav already forward-links
there; the screen lands in a later M5 session). Both are best-available
real routes, flagged here for the audit-screen session to revisit.

**Test count:** 862 → 867 (+5 net: +8 new dashboard screen specs, −3
removed with the financials KPI-row `describe`). typecheck clean, build
clean.

**Changed from plan:** none — the session prompt was the plan (still no
`milestone-5-plan.md`). No new ADR — no architectural decision was made;
the design was approved in S12 and the API frozen in S13.

## Milestone 5 Session 13 — Dashboard backend: the aggregator + fast trend series (Developer — 2026-09-04) — DONE (backend only)

Backend only. One Admin-only, read-only aggregator for the `/admin`
morning-triage screen. **Writes nothing.** Session 14 builds the screen
against `docs/API.md` "Dashboard".

**Shipped**

- `lib/domain/dashboard/` — new module, spans financials + audit +
  handovers + stock, owns no entity:
  - `trend-series.ts` — `dailyNetSeries(from, to)`: net profit + revenue
    + expenses per business date over a contiguous span, **fixed query
    count regardless of span length** (see "the real work" below).
  - `needs-attention.ts` — `getNeedsAttention(today)`: open prior dates
    (activity but no `DayClose`, ≤ 60-day lookback, excludes today);
    handovers with no receipt yet (+ location / declarer / declared
    total); ALL open handover shortfalls (count + total, **not
    month-scoped**); products ≤ 0 on-hand anywhere (count + top 3). All
    queues empty = empty collections, not an error.
  - `todays-activity.ts` — `getTodaysActivity(today)`: sales so far (Σ
    `order` + `canteen_sale` MoneyMovement today), stock-movement count,
    purchase-receipt count, handovers received / due, `action="correct"`
    AuditLog count today.
  - `get-dashboard.ts` — `getDashboard(date)`: the 5-band aggregate.
    Position reuses `getAccountBalances` / `getOwnerOwedToBusiness` with
    `asOf` = end of `date` (no second balance derivation). Week + 30-day
    trend are slices of ONE `dailyNetSeries` call over the union span.
- `GET /api/admin/dashboard?date=YYYY-MM-DD` — thin handler, Zod in
  `lib/validation/dashboard.ts`, **Admin-only**, `date` defaults to
  today (Africa/Nairobi). First route under `app/api/admin/`.
- `lib/time` — `addBusinessDays` is now exported (was file-private).

**The real work — making the trend series fast (ADR-64)**

Bands 2 + 5 need net profit for ~37 days. The naive
`getFinancialSummary(day, day)` × 37 runs a full stock-valuation sweep
per day — **measured 625 ms for 37 calls on the *seeded* DB** (~17
ms/day), and it scales with product × location × history.

Instead: the opening/closing COGS terms **telescope** — one day's COGS
is `purchaseReceiptValueDay − Σ(value of every StockMovement in that
day)`, needing NO opening sweep. The whole series then comes from a fixed
handful of span-wide queries bucketed by business date in memory.
**Measured: the FULL aggregator for today runs in ~21 ms on the seeded
DB.**

This is **not a proxy** — `dailyNetSeries` net values equal
`getFinancialSummary(day, day).consolidated.netProfit` **to the cent**,
proven day-by-day across a month boundary (2024-08-29 … 2024-09-02) in
`trend-series.test.ts`. The design spec floated a cheaper proxy and said
to flag it with the owner; not needed — the exact path is fast enough.
No owner decision required.

**Tests** (+19): `trend-series.test.ts` (4) — per-day agreement across a
month boundary, superseded-order not double-counted, span-sum agreement,
**fixed query count for a 2-day vs 5-day span**;
`get-dashboard.test.ts` (10) — Monday-first week matching
`businessWeekRange`, future days `null` not zero, per-day + WTD +
prior-WTD agreement with `getFinancialSummary`, 30-entry oldest-first
trend, position == `getFinancialSummary` balances, malformed-date reject,
needs-attention structural invariants + "never includes today", **PERF:
full aggregator < 2 s on seeded DB (actual ~21 ms)**;
`app/api/admin/dashboard/route.test.ts` (5) — 401 / 403 / 200-all-bands /
default-date / 400-malformed.

**Test count:** 843 → 862 (+19). typecheck clean, build clean.

**Docs**

- `docs/DECISIONS.md` **ADR-64** — the telescoping-COGS identity, the
  bucketed approach, exact-agreement (not proxy), the measured timings,
  and the lockstep dependency on `getFinancialSummary`'s COGS formula.
- `docs/API.md` "Dashboard" — the full `GET /api/admin/dashboard`
  contract with a worked response for all 5 bands. Session 14 builds
  against this doc; must not re-derive it.

**Changed from plan:** none — the session prompt was the plan (still no
`milestone-5-plan.md`).

**For the screen session:**

- `week.dailyNet[i].net === null` ⇒ future day → faded stub, not a zero
  bar. Only Sunday (`week.to`) is guaranteed future on a mid-week load.
- Every bar value (`week.netWtd`, each `trend.dailyNet[i].net`) is
  exactly what `/admin/financials` shows for the same day/range — they
  will not disagree.
- The client computes the "vs. same point last week" delta lines from
  `revenueWtd` / `revenuePriorWtd` etc. — wording differs per tile
  (revenue ▲ good, expenses ▲ bad, net is prose).
- `needsAttention` all-clear = empty collections + zero counts (the band
  never disappears — it's a reassurance signal).

## Milestone 4 Session 9C — Locations tab, the assets crash, a real test DB (Developer — 2026-09-03) — DONE

Four contained items. Mostly frontend + infrastructure. `pnpm test`
815 → **819** (4 new: the Locations-tab screen spec). typecheck + build
green. Full suite run **twice** after the DB change — both **819/819**
(deterministic).

**TASK 1 — Locations tab on `/admin/catalog`.** M1 shipped product CRUD
but left locations read-only; the CRUD backend landed in S8A. Closed the
UI gap.

- `catalog-client.tsx` slimmed to the shared `<AdminPageHeader>` (title +
  count badge + "Add …" button) + a `<Tabs>` row (Products · Locations),
  following `app/admin/financials/financials-client.tsx`. **Both tabs stay
  mounted** (hidden), so drawer/data state survives a switch; each tab
  publishes `{ countLabel, openCreate }` up so the header renders the
  right badge and wires the right button (financials/staff pattern).
- Tab bodies split into their own files: **`products-tab.tsx`** (the old
  single-file body, VERBATIM — kind sub-tabs, search, drawer, delete
  dialog) and **`locations-tab.tsx`** (new).
- `locations-tab.tsx` — `<SimpleTable>` / mobile cards (name · type ·
  status), row actions Edit / Deactivate (active) or Reactivate
  (inactive). **`location-drawer.tsx`** for add/edit (`<Drawer>` +
  `<FormField>` + `<SegmentedControl>` for type). Deactivation goes
  through a confirm `<Drawer>`; when the domain's referential guard 409s,
  its **specific** message (active staff / stock on hand / pending
  transfer) is shown verbatim in a `bg-danger-bg` panel and the dialog
  stays open — never collapsed to a generic string.
- `use-locations.ts` — sibling of `use-catalog`, same request/error shape
  (reuses `CatalogRequestError`). Lists **all** locations via a new
  `GET /api/locations?includeInactive=1` (admin-only widening; other read
  roles still get active-only). Route test extended (2 cases).
- Screen spec `tests/screens/catalog-locations.screen.test.tsx` —
  interactive bits only (list + status, add through the drawer,
  deactivate-after-confirm, the 409 guard message surfaces verbatim).
  Read-only display not specced.

**TASK 2 — `/admin/assets` crash fixed, all three layers.**

- **Seed** (`prisma/seed.ts`): `"Fair"` → **`"Needs Repair"`** (a
  700-day-old chest fridge reads as needing attention, and it keeps two
  distinct conditions in the seed); `"Needs repair"` → `"Needs Repair"`
  (capitalisation).
- **Domain** (`lib/domain/assets/internal.ts`): `toAssetView` now calls
  the existing `assertCondition` helper instead of a blind
  `as AssetCondition` cast — an unrecognised `conditionStatus` (the column
  is free-text `String`) raises `VALIDATION_ERROR` at the boundary and
  never reaches the UI.
- **Kit** (`components/kit/condition-chip.tsx`): `STYLES[condition] ??
  FALLBACK_STYLE` (neutral, matching `status-chip`'s `neutral` variant).
  Minimal defensive fallback only — API, styling, variants unchanged.
- **Real data check:** the dev DB's 4 asset rows are all `seed-asset-*`;
  no admin-created rows carry an invalid value, so re-seeding fixes it
  and no separate data migration is needed. (A production DB with real
  rows would need a one-off `UPDATE` — none exist here.)

**TASK 3 — the test suite gets its own database (ADR-61).** Was running
against the **dev** DB; concurrent writes / stale rows / cross-cutting
summary sums cost real tests across the last five sessions.

- `.env.test` (committed — local connection string only) → dedicated DB
  `prosper_hotel_tests`. `vitest.shared.ts` loads it with
  `dotenv` `override: true`.
- `scripts/setup-test-db.mjs` — idempotent: `CREATE DATABASE` if absent →
  `prisma migrate deploy` (**real `_prisma_migrations` history**, not
  `db push`) → seed. Wired as `pretest` / `pretest:db` / `pretest:e2e`,
  so `pnpm test` needs no manual steps and a fresh clone needs only a
  running Postgres.
- Documented in **`docs/TESTING.md`** (incl. from-scratch + reset steps).
- **No test weakened or deleted.** First run on the new DB: 815/815 — no
  test turned out to depend on dev-DB-specific data. The `m1-flows`
  suites rely on **seed** users/locations by stable name, which is why
  the test DB is seeded (noted in TESTING.md + ADR-61 as a test-breaking
  surface).

**TASK 4 — API.md.** `GET /api/pay/shortfalls?month=` was **already**
documented in the "Staff & Pay" section (commit 795b774, line ~1062) — no
action needed. The 9B PROGRESS entry's "flagged for the next doc pass"
note is now stale.

**Files touched:** `app/admin/catalog/{catalog-client,products-tab,
locations-tab,location-drawer,use-locations}.tsx/.ts`,
`app/api/locations/route.ts` (+ `route.test.ts`),
`lib/domain/assets/internal.ts`, `components/kit/condition-chip.tsx`,
`prisma/seed.ts`, `vitest.shared.ts`, `package.json`, `.env.test` (new),
`scripts/setup-test-db.mjs` (new), `tests/screens/catalog.screen.test.tsx`
(+ `catalog-locations.screen.test.tsx` new), `docs/TESTING.md` (new),
`docs/DECISIONS.md` (ADR-61), `docs/PROGRESS.md`.

**Not done / deferred:** nothing from the four tasks. No `TODO(mock)` in
any touched file.

---

## Milestone 4 Session 8A — Locations CRUD + Staff CRUD + attendance + pay (Developer — 2026-09-03) — DONE (backend only)

**Backend only. No schema change** — every table used
(`Location`, `Staff`, `User`, `Attendance`, `StaffPayAdjustment`) already
existed; only `Staff` / `Attendance` / `StaffPayAdjustment` had no domain
module or route until now. A parallel session (8B) designs `/admin/staff`;
a later session builds the screens against this API.

**Shipped — Locations CRUD.** `lib/domain/catalog/locations.ts` gained
`createLocation`, `updateLocation`, `deactivateLocation` (soft — `active:
false`; `Location` has no `deletedAt`) alongside the existing
`listLocations`. Case-insensitive name uniqueness on create + rename
(`CONFLICT`). `deactivateLocation` runs a referential guard following
`catalog/delete-product.ts` (409 on conflict):

- **Hard blockers** (409, nothing written): active staff assigned to the
  location (`Staff.locationId` is REQUIRED and drives role-scoping —
  orphaning staff breaks their whole session); non-zero derived stock on
  hand for any product at the location; any pending transfer (in-transit
  `transfer` row, dispatched not accepted) on either end.
- **Not a blocker**: products merely *priced* at the location
  (`ProductLocation` rows) — harmless once inactive, re-pointable later;
  reported as info only.

API: `POST /api/locations` (admin) + `PATCH /api/locations/:id` (admin;
`?mode=deactivate` runs the guard). GET unchanged — staff roles still read
it.

**Shipped — Staff CRUD with the login account.** New module
`lib/domain/staff/` (customers-module shape: `index` / `types` / `errors`
/ `internal` / `test-helpers` + one file per op).

- `createStaff` — name, role, locationId, dailyRate, PIN → writes the
  `Staff` row **and** its 1:1 `User` in ONE transaction. PIN is
  `bcrypt.hash(pin, 10)` — the exact scheme `prisma/seed.ts` and
  `lib/auth/config.ts` use; `PIN_BCRYPT_ROUNDS` is a named constant in
  `internal.ts`. `User.name` is `@unique`, so a taken name is `CONFLICT`.
  Admin sets the PIN; **no first-login self-service flow** (owner
  decision).
- `updateStaff` — name / role propagate to BOTH rows; `locationId`
  reassignment (the role-scoping field) validated against an active
  location; `pin` re-hashes `User.pinHash`. True edit, not a correction
  row (a staff record is not a ledger).
- `deactivateStaff` — soft (`Staff.active = false`) **and sets
  `User.active = false`** in the same tx. The auth path gates sign-in on
  `User.active` only (never `Staff.active`), and the session callback
  re-checks it every request — so a deactivated staff member cannot log in
  and any live session drops on its next request. Verified by test.
- `listStaff` / `getStaff` — Admin-only. **No read ever returns or logs a
  PIN or hash** — `toStaffView` carries neither field and the queries
  never select `pinHash`; asserted in `staff.test.ts`.
- API: `GET/POST /api/staff`, `GET/PATCH /api/staff/:id`
  (`?mode=deactivate`). All `requireApiRole("admin")`.

**Shipped — Attendance.** `lib/domain/staff/attendance.ts`:
`setAttendance` (upsert on `[staffId, date]`), `setAttendanceBulk` (one
date, many staff, one transaction — how the screen marks a day),
`listAttendance(from, to, { staffId? })`. Admin-only.

- **Default present** (PRD §4.8): a staff member with no row for a date
  counts as present. `listAttendance` returns only the rows that exist;
  pay treats a missing `(staffId, date)` as present. No row is required
  per person per day.
- **Backdatable by the Admin** — ADR-53's today-only rule is NOT applied
  (owner decision).
- **`assertDayOpen` deliberately NOT applied to attendance** — see ADR-58.

**Shipped — Pay.** `lib/domain/staff/pay.ts`:

- `recordPayAdjustment` — advance / deduction, positive magnitude stored,
  sign implied by type. **IS a `StaffPayAdjustment` append-only create
  path → `assertDayOpen(date)` inside the transaction** (per the S8A
  brief). A mistaken adjustment on a closed day is undone by recording the
  opposite type for the same amount.
- `getStaffPay(staffId, month)` / `getPayrollSummary(month)` — nothing
  stored; all derived. `gross = dailyRate × daysPresent`, where
  `daysPresent = payableDays − explicit present:false rows` and
  `payableDays` = every calendar day of the month from the 1st through
  `min(month-end, today)` (a future day has not been worked → a wholly
  future month has 0 payable days). `net = gross − Σ advances − Σ
  deductions` — both types net OFF (PRD §4.8). `getPayrollSummary` is
  set-wise (one attendance groupBy + one adjustments query across all
  active staff), business-wide over every active staff member. Handover
  shortfalls do **not** auto-deduct (PRD §4.8).
- API: `GET /api/pay?month=YYYY-MM` (payroll) or `&staffId=…` (one
  person); `POST /api/pay` (record adjustment). Admin-only.

**Tests.** +42 (`pnpm test` 745 → 787, all green; typecheck + build
clean). New suites: `lib/domain/catalog/locations.test.ts` (15 — CRUD +
every deactivation blocker + the non-blockers),
`lib/domain/staff/staff.test.ts` (CRUD, login-account linkage, bcrypt PIN
round-trips the seed scheme, PIN never leaked, deactivation blocks
login), `.../attendance.test.ts` (upsert-corrects, not-day-close-gated,
default-present, bulk), `.../pay.test.ts` (the pay-math priority — gross,
per-day absence, advance+deduction netting, month bounds, day-close gate,
set-wise summary, future month = 0). All new tests scope to their own
rows or assert internal consistency — no unscoped admin-wide "today"
reads (per the seed-collision note).

**Decisions.** ADR-58 (attendance not day-close gated) + ADR-59 (staff
deactivation cascades to `User.active`) added to `docs/DECISIONS.md`.

**Not done / for a later session.** No screens (`/admin/staff` is 8B's
design + a later build). No `/admin/locations` screen. The known
shared-dev-DB suite flakiness is unchanged — not addressed here.

---

## Milestone 4 Session 9A — Staff payout: record a payment, post it to the ledger (Developer — 2026-09-03) — DONE (backend only)

**Backend only. One additive schema change.** 9B builds the payout screen
against this API. This writes to the money ledger and changes Net Profit,
so the verification centred on a no-double-count assertion.

**Owner decision — CHANGES PRD §4.8 (ADR-60).** Payroll now happens
**inside** the system. Recording a payout for a staff-month creates one
Salaries `Expense` for the net, which reduces Cash and Net Profit like any
other expense. PRD §4.7, §4.8, §6 updated; the old "payroll disbursement
happens outside the system" rationale removed. **ADR-60** records the
change and states explicitly that it **SUPERSEDES** the old §4.8 rule.

**Shipped — schema.** New model `StaffPayout` (`staffId`, `month`
`@db.Date`, `netPaid`, `date`, `paidFromAccount`, `recordedById`,
`expenseId` 1:1 → `Expense`). `@@unique([staffId, month])` — a staff-month
is payable at most once, **at the DB level**. `expenseId @unique`.
Migration `20260903130000_m4_s9a_add_staff_payout` (additive; no existing
table altered). Applied to the dev DB via `prisma db execute` + `prisma
generate` (the repo's DB is `db push`-tracked, not migrate-tracked — same
as prior sessions).

**Shipped — domain (`lib/domain/staff/pay.ts`, not a new module).**

- `payStaff({ staffId, month, paidFromAccount, date }, actor)` —
  Admin-only. **No `amount` in the input.** In ONE transaction: recompute
  net from the ledger via `getStaffPay`, `assertDayOpen(date)`, create the
  Salaries `Expense` via `recordExpense(…, { tx })`, write the
  `StaffPayout` row + an `AuditLog` row. Returns the refreshed
  `getStaffPay`.
- `payAllUnpaid({ month, paidFromAccount, date }, actor)` — every unpaid
  **active** staff member for the month; **one transaction per staff
  member** (one failure is skipped, not a batch rollback); one `Expense`
  each. Returns `{ month, paid: PayoutView[], skipped: [{ staffId,
  staffName, reason }] }`.
- `recordExpense` gained an optional `{ tx }` third arg (mirrors
  `recordMoneyMovement`'s ctx pattern) so expense + payout commit
  atomically. **No bespoke `MoneyMovement`, no new `MoneySourceType`** —
  everything routes through `recordExpense`.
- `getStaffPay` / `getPayrollSummary` now carry `paid` + `payout`
  (id/month/netPaid/date/account/expenseId); summary `totals` gains
  `netPaid`, `netUnpaid`, `paidCount`, `unpaidCount` so 9B renders a
  paid/unpaid column with no second call.

**Decisions (also in ADR-60 / the report).**

- **Net-pay floor:** `netPay` is **not** floored — it may be negative.
  A payout is **refused** while `netPay ≤ 0` (`VALIDATION_ERROR`, `field:
  "net"`).
- **Carry-forward:** the excess over-advance is **neither written off nor
  auto-carried** — it stays as the `StaffPayAdjustment` rows in that
  month; the Admin clears it with a correcting entry.
- **Zero-net payout:** rejected, nothing written, no negative expense
  ever.
- **Payout reversal:** **out of scope for 9A** — a payout's effect lives
  entirely in its `Expense`, and `correctExpense(payout.expenseId,
  "0.00")` already reverses Cash + Net Profit. A first-class "void
  payout" (releasing the unique slot) is deferred; `reversesPayoutId` was
  considered and rejected as scope creep.

**Shipped — API.** `POST /api/pay/payout` (single) + `POST
/api/pay/payout?mode=all`. Thin handlers, `requireApiRole("admin")`, Zod
schemas (`payStaffSchema` / `payAllUnpaidSchema`) in
`lib/validation/staff.ts` — neither has an `amount` field. `GET /api/pay`
reads now return `paid` / `payout` so the screen renders the column
without a second call. Endpoints + payloads documented in `docs/API.md`
(9B builds against that, must not re-derive).

**Tests.** +15 (`pnpm test` 787 → **802**, all green; typecheck + build
clean).

- `lib/domain/staff/payout.test.ts` (11) — **the no-double-count
  assertion** (after a payout: cash −netPay exactly once, exactly ONE
  Salaries `Expense` linked, exactly ONE paired `MoneyMovement`,
  `getFinancialSummary` netProfit −netPay and no more); pay-twice →
  `CONFLICT` + a direct-insert `P2002`; future month; closed day (nothing
  written, no orphan expense); zero/negative net (rejected, advance row
  untouched); **amount recomputed server-side** (a bogus client `amount`
  has no effect); **handover shortfall does NOT affect net pay** (S8A
  assertion kept); `payAllUnpaid` (b paid with exactly one payout+expense,
  a skipped already-paid, c skipped zero-net, inactive never appears);
  future-month rejection; non-admin `FORBIDDEN`; `paid`/`payout` fields on
  both reads.
- `app/api/pay/payout/route.test.ts` (4) — admin-only gates (401/403 on
  both single and `?mode=all`), a 400 on a malformed body, and one
  admin-happy-path single payout through the route. `?mode=all` happy path
  is domain-suite only (it is business-wide and would pollute the shared
  dev DB).

The no-double-count assertion was **verified by a run**, not assumed.

**Seed.** One paid staff-month — the seed Cashier
(`seed-staff-cashier`), previous calendar month, `KES 17,050` — as a real
`Expense` + paired `MoneyMovement` + `StaffPayout`. Every other staff
member left unpaid, so 9B opens with both states. `staffPayout.deleteMany`
added to the wipe transaction (before `expense.deleteMany` — FK order).

**Not done / for a later session.** No payout screen (`/admin/staff` pay
tab — 9B). No first-class payout void. Shared-dev-DB suite flakiness
unchanged (9B's remit).

---

## Milestone 4 Session 9B — `/admin/staff` screen: Roster / Attendance / Pay & advances (Frontend — 2026-09-03) — DONE

**Frontend session.** Built `/admin/staff` to the approved design (Paper
"Prosper Hotel" · page "M4 S8 — Staff & Pay"; `docs/design/flows/staff-screen.md`)
against the S8A/S9A API. One small **read-only** backend addition (owner-approved
mid-session) — see below.

**Shipped — the screen.** New route `app/admin/staff/` composed entirely
from the frozen kit, following `app/admin/financials/` as the sibling.
Tab bodies split into their own files from the start (financials' 1,034-line
lesson).

- `page.tsx` (`?tab=` deep-link → roster | attendance | pay) + `staff-client.tsx`
  (ADR-56 single header via `<AdminPageHeader>`; desktop underline `<Tabs>`,
  mobile pill strip + sticky bottom action bar; header buttons reach the
  active tab through a registered callback, same pattern as financials'
  `registerRecordPayment`).
- `roster-tab.tsx` + `staff-drawer.tsx` — count line + Location `<PillFilter>`,
  `<SimpleTable>` / mobile cards, whole row opens the add/edit `<Drawer>`.
  Status is plain colored text, no chip (design-principles §4.4). Drawer:
  name / role / location / daily rate (KES adornment) / 4-digit PIN
  (`inputmode=numeric`, digit-only, capped 4, wide tracking) / Active
  `<ToggleSwitch>`. PIN optional on edit (blank = unchanged). Active→off
  in the edit drawer calls `PATCH ?mode=deactivate`.
- `attendance-tab.tsx` — DEFAULT PRESENT, one `<SegmentedControl>`
  (Present/Absent) per staff, no per-row save; a single "Save attendance"
  does one `?mode=bulk` write. Header `<DatePicker>` (backdatable, capped
  today via `maxDate`). "Mark all present" is a working-set reset.
- `pay-tab.tsx` + `month-picker.tsx` + `payout-drawer.tsx` +
  `advance-drawer.tsx` + `shortfalls-card.tsx` — per-staff month table
  (role·location caption joined from the roster — `StaffPay` carries
  neither), Advances/Deductions as `− x / —`, **Net pay not floored**
  (negative → red `− x`, and the row's "Pay out" button is disabled).
  Dark totals footer mirrors the `<SimpleTable>` row geometry exactly
  (`px-(--sp-6)` + `gap-(--sp-6)`). Payout drawer shows the full
  reconciliation (Gross → − Advances → − Deductions → Net to pay now) and
  surfaces server error **fields** inline — `month` (already paid),
  `net` (≤ 0), `FORBIDDEN` (closed day). "Pay out all unpaid" → `?mode=all`.
- **Month picker** — kit has none; composed from `<Select>` with a
  generated month list (newest first), the workaround the flow doc names.
  No new kit component.
- **Handover shortfalls** — a SEPARATED warning-framed card below the
  totals footer (NOT a pay column), mandated caption verbatim, a
  different row shape (name + "date · note" + one `--color-warning`
  amount), foot line "N open shortfalls · tracked outside payroll" +
  total. Built from a plain frame + `--color-warning*` tokens + a
  triangle icon (not `<Banner>` / not `<CalculatedImpactBanner>`), per
  the flow doc.

**Shipped — one read-only backend add (owner-approved mid-session).**
The Pay tab's shortfalls card needs a **per-row KES amount + a month
total**; S8A shipped neither (`HandoverShortfall` has no amount column,
no by-month/by-staff read). Rather than a schema migration, the amount is
**derived** from the receipt's already-stored negative variances:

- `lib/domain/staff/shortfalls.ts` — `getMonthlyShortfalls(month)` reads
  `HandoverShortfall` rows whose `ReceiptOfHandover.occurredAt` falls in
  the month (business-date window, `lib/time`), amount = `|min(cashVariance,0)|
  + |min(mpesaVariance,0)|` on the linked receipt, grouped by staff,
  with a total + count. **Zero schema change.** Read-only. Never touches
  pay (`getStaffPay` / `getPayrollSummary` unchanged).
- `GET /api/pay/shortfalls?month=YYYY-MM` — admin-only, thin handler,
  inline Zod. Documented shape: `{ month, entries: [{ id, staffId,
  staffName, date, amount, note }], total, count }`.
- `lib/domain/staff/index.ts` exports it; `test-helpers.ts` cleanup
  extended for `handoverShortfall` + linked receipts.

**API.md** — needs a `GET /api/pay/shortfalls` entry added (the existing
"Staff & Pay" section still lists only the S8A/S9A endpoints). Flagged for
the next doc pass; the shape is in this entry and the route file.

**What did NOT survive contact with the frozen kit / the S8A contract:**

1. **Roles.** The Paper Roster/Attendance artboards show "Cook", "Waiter",
   "Cleaner" alongside the three real roles. `POST /api/staff` only
   accepts `store_manager | cashier | canteen_attendant` (it creates the
   login `User`; those are the only non-admin roles). The Role dropdown
   offers **only the three real roles**; existing rows render whatever
   string comes back. If the owner wants job *titles* distinct from
   *system roles*, that is a schema field + a backend session — NOT
   substituted here.
2. **No reactivate path.** S8A gives `PATCH ?mode=deactivate` but no
   reactivate. The edit drawer's Active toggle can be switched **off**
   only; once inactive it is disabled with an explanatory caption. A
   "reactivate staff" endpoint + UI is a later add.
3. **`StaffPay` has no role/location** for the Pay table's "Role ·
   Location" caption — joined client-side from `useRoster`. Works, but a
   second fetch; a future `getPayrollSummary` could include them.

**Owner walkthrough feedback applied.** After a first look at the Pay
tab: the dark totals footer was cramped and over-bold. Fixed — footer
geometry now matches the table row (`px-(--sp-6)`/`gap-(--sp-6)`),
weights dropped semibold → medium, the "N of N paid / X to pay" block
vertically centered instead of squeezed. Table **Net pay** column also
softened semibold → medium at the owner's request (flow doc had it
semibold).

**Verification (driven on `pnpm dev` as Admin, real DB).**

- Created a staff member via the screen's API path; **logged in AS that
  staff member with the Admin-set PIN — succeeded.**
- Backdated bulk attendance (absent on a past date) — written.
- Recorded an advance; on the current (partial) month the advance
  exceeded the 3-day gross → **net −300, rendered red, payout button
  disabled**; `POST /api/pay/payout` → `400 field "net"`.
- Paid a past month (net 27,900) from Cash: **Cash 1,540.00 →
  −26,360.00, i.e. −27,900.00 exactly** (`/api/financials/summary`).
- Paid the same staff-month again → **`409 CONFLICT field "month"`**.

**Tests.** +13 (`pnpm test` 802 → **815**, all green; typecheck + build
clean).

- `lib/domain/staff/shortfalls.test.ts` (3) — month-scoped, amount =
  summed negative variances, month total + count, malformed month
  rejected.
- `tests/screens/admin-staff.screen.test.tsx` (10) — interactive bits
  only (per brief): add-staff drawer incl. PIN entry (digit-only, capped
  4, disabled until valid), attendance flag-absence + bulk save, "Mark
  all present", payout drawer submit (**no client `amount` in the
  body**), already-paid `CONFLICT` surfaced inline, net ≤ 0 disables the
  row button + the `net`-field server error surfaced inline, advance
  drawer records.

**Nav.** The **Staff** item already existed in `admin-shell.tsx` +
`mobile-nav-drawer.tsx` (key `staff` → `/admin/staff`) — it was a dead
link until this session. Now resolves; verified `GET /admin/staff` →
200 for all three tabs.

**Pre-existing bug found (NOT 9B, NOT fixed here — for 9C or a ticket).**
`/admin/assets` throws `Cannot read properties of undefined (reading
'dot')` in `components/kit/condition-chip.tsx`. Cause: `prisma/seed.ts`
(line 539/541, introduced in `e13da9c`) seeds asset `conditionStatus`
values `"Fair"` and `"Needs repair"` that are not valid `AssetCondition`
(`"Good" | "Needs Repair" | "Decommissioned"`); `conditionStatus` is a
free `String` in the schema so the write succeeds, but `ConditionChip`
has no fallback and crashes. Reseeding does not fix it — the seed is the
source. Two fixes needed (separate task): (a) `ConditionChip` fallback
for an unknown condition, (b) correct the seed literals (and/or validate
the asset PATCH path).

**Not done / for a later session.** Locations tab on `/admin/catalog`
(9C). Shared-dev-DB suite flakiness (9C). `API.md` `GET
/api/pay/shortfalls` entry. Reactivate-staff endpoint + UI. Job-title
field if the owner wants roles beyond the three system roles.

---

## Milestone 3 Session 7 — Financials redesign + date-range filtering (Developer — 2026-09-03) — DONE

**Mostly frontend. One focused backend addition (`asOf` on the balance
reads) + an additive `from`/`to` on `listMovements`. No schema change.**

**Shipped — the approved redesign (Paper "M3 S5 — Financials redesign").**

- **Profit promoted OUT of the tab row** into an always-on panel above
  the tabs. The old `profit-summary.tsx` + `kpi-strip.tsx` are deleted;
  replaced by `profit-panel.tsx` (`KpiRowDesktop`, `ProfitStack`,
  `ProfitSecondary`, `ProfitPanelDesktop`) + `profit-panel-mobile.tsx`
  (`KpiBandMobile`, `ProfitPanelMobile`).
- **KPI strip restyled kit-native** — no card, a caption header, four
  mono figure columns separated by hairline rules. Tiles: Total Business
  Liquidity · Cash at Hand · M-Pesa/Bank Till · Owed Back by the Owner.
- **KPI section and Profit section are visually distinct** (owner
  follow-up): KPI on its own `--surface-subtle` band, hairline-separated;
  Profit on the page ground with generous spacing; then the tabs.
- **Tabs cut from 6 to 5** — Stock Purchases · Deliveries · Handovers ·
  Expenses · Owner Draws (Profit is no longer a tab).
- **Mobile** — the range control drops to its own "Showing" row below the
  ADR-56 header (keeps the ~390px header uncrowded); a compact dark
  2-tile KPI band (Cash / M-Pesa); the panel blocks stack.
- ADR-55 respected — non-sale consumption still renders as its own block,
  captioned "already inside the COGS figure above", never a sibling line
  in the Revenue→Net stack.

**Shipped — date ranges (owner-approved: Today / This week / This
month / Custom).**

- **`use-financials-range.ts`** — resolves a preset (or a custom single
  day) to an inclusive `{ from, to }` pair of Africa/Nairobi business
  dates. **Weeks start Monday** (ISO 8601 / local trading-week
  convention; matches the kit `<DatePicker>` grid). `financials-range.tsx`
  — kit `<SegmentedControl>` of the four presets + the existing
  single-date `<DatePicker>` shown only for Custom. **The kit was not
  touched** — no range picker added.
- **`lib/time`** gained `businessDateLastInstantUtc`, `nairobiToday`,
  `businessWeekRange`, `businessMonthRange`.
- **`getFinancialSummary(from, to)`** now threads `asOf = end of `to``
  into `getAccountBalances`, `getOwnerOwedToBusiness` and the
  `Debt`/`Repayment` aggregates — **the flow-vs-balance split, ADR-57**.
  Flows still take the whole range; balances are point-in-time as of the
  range's end. Previously the balance tiles ignored the date filter
  entirely (always "now") — that was a real bug, now fixed.
- **`listMovements`** gained additive `from`/`to` (business-date range on
  `occurredAt`; `date` still wins) so the Stock Purchases / Deliveries
  flow lists span the range. Backward compatible.
- **Handover reconciliation stays a single-day worksheet** — when the
  range is multi-day it reconciles the range's end day and captions that.
- **`use-financials.ts`** hooks (`useFinancialSummary`, `useExpenses`,
  `useOwnerTransactions`) take `(from, to)`; the tabs thread
  `from`/`to`/`isRangeToday` down.
- **Balance figures are labelled point-in-time** — KPI caption "Position
  & balances as of <date>"; Owner Draws card "· as of <date>".

**Owner follow-ups fixed in-session.**

- KPI / Profit sections separated (above).
- **Empty-state parity** — Handovers / Expenses / Owner Draws now keep
  their table headers visible AND render the empty-state message in a
  full-height area the **page** scrolls to, exactly like Stock Purchases.
  Root cause: `min-h-0` on those tabs' outer flex column was clipping
  height and trapping the message in a tiny inner scroll strip; removed
  it, kept `overflow-x-auto` for horizontal scroll only.

**Docs.** ADR-57 (flow-vs-balance date semantics). `API.md` — summary
balance fields documented "as of the end of `to`"; `GET
/api/stock-movements` documents `from`/`to`. Approved design recorded in
`docs/design/flows/financials-screen.md`.

**Tests.** 717 → **745** (`+28`). New: `lib/time` range/cutoff helpers
(10), `lib/domain/financials/asof-semantics.test.ts` (11 — the
flow-vs-balance split pinned), `lib/domain/stock/list-movements-range.test.ts`
(3), plus screen specs for the range control refetch, the as-of caption,
and the persistent-headers empty state on all three tabs. `pnpm test`
(745 pass) / `typecheck` / `build` green — full suite re-run after the
last change.

**Not done (out of scope, noted for later).** The dashboard page (the
KPI strip may overlap what a dashboard shows — flagged in the S5
handoff). Staff shells still two-row (ADR-56 scope).

---

## M3 follow-up — Unify the admin header into a single toolbar row (Developer — 2026-09-03) — DONE

**Frontend-only refactor. No backend, schema, routes, or domain logic touched.**

**Problem.** Every admin screen rendered two stacked header rows: the
shell's hardcoded "Prosper" + avatar row, above the page's own
`<PageShell toolbar>` (real title, date picker, primary action). The
sidebar already identifies the product.

**Shipped.**

- **New: `components/shells/admin-toolbar-context.tsx`** —
  `AdminToolbarProvider` + `useAdminToolbarValue()` + `<AdminPageHeader
  title=… actions=… />`. A screen renders one `<AdminPageHeader>` at the
  top of its JSX; inside the provider it publishes title/actions into the
  shell's one header row and renders nothing, outside a provider (screen
  specs) it renders them inline in a `<header>`. See **ADR-56**.
- **`AdminShell` / `MobileShellAdmin`** — dropped `toolbarTitle` /
  `toolbarSubtitle` / `toolbarActions` props; both now read
  `useAdminToolbarValue()`. Desktop: title · actions · avatar in the one
  44px row (expand toggle still there when collapsed). Mobile: hamburger ·
  title · primary action · avatar.
- **`admin-shell-client.tsx`** — wraps both shells + `children` in
  `<AdminToolbarProvider>`; no longer passes `toolbarTitle="Prosper"`.
  Brand name now lives only in the sidebar nav / mobile nav drawer.
- **All 9 admin screens** — `<PageShell toolbar={…}>` → `<PageShell>` +
  `<AdminPageHeader …>`: assets, catalog, customers, customers/[id],
  day-close, financials, sales, stock, stock/opening. Assets + Catalog
  titles moved `text-display/display` → `text-h1/h1` to match the shell
  header type (the other 7 already used it). Redundant single-item
  `<Breadcrumb>` dropped from `/admin/customers` and `/admin/sales`
  (repeated the title / the tab strip); real back-link breadcrumbs on
  `customers/[id]` and `stock/opening` kept as the `title` node.

**Tests.** 715 → **718** (`+3`, all in the new
`tests/screens/admin-single-header.screen.test.tsx`). No existing spec
needed a rewrite — `<AdminPageHeader>` outside a provider renders inline,
so every per-screen assertion on title/actions text still resolves.
`pnpm test` / `typecheck` / `build` green.

**Not done (out of scope).** Staff shells
(`components/layout/staff-shell-client.tsx` + cashier / canteen /
store-manager screens) share the same two-row shape; the same change can
follow in a later session.

---

## Milestone 3 Session 4 — Financials: expenses, owner draws, profit (Developer — 2026-09-02) — DONE · **M3 COMPLETE**

**Shipped (full-stack — backend + frontend + check).**

- **`lib/domain/financials/` extended** (not a new module):
  - `recordExpense` — Admin-only. Writes the `Expense` row **and** a paired
    negative `MoneyMovement` (`sourceType: "expense"`) debiting
    `paidFromAccount`, one transaction — the `recordPurchasePayment`
    pattern. Day-close gated (`assertDayOpen`); Admin exempt from the
    today-only rule so a past-dated expense on an open day is allowed.
  - `correctExpense` — append-only via `correctsExpenseId`. Admin-only,
    **not** day-close gated. Delta measured against `original + Σ existing
    deltas` (M1 F-1 guard — double-submit is delta-0 → `VALIDATION_ERROR`;
    can't correct a correction). Writes the delta `Expense` row + a paired
    delta `MoneyMovement`.
  - `recordOwnerTransaction` — draw (`−` cash, `owner_draw`) / return (`+`
    cash, `owner_return`), each a `MoneyMovement`. Day-close gated.
  - `getOwnerOwedToBusiness` — `Σ draws − Σ returns`, DERIVED by grouping
    `OwnerTransaction` rows (no stored counter — CLAUDE.md non-negotiable).
  - `listExpenses` (date + category filter, corrections folded),
    `listOwnerTransactions`.
  - `getFinancialSummary(from, to)` — the profit calc (see COGS model
    change below): `perLocation` (revenue / cogs / grossProfit) +
    `consolidated` (revenue / cogs / grossProfit / totalExpenses /
    netProfit / debtsOwedToBusiness / ownerOwedToBusiness / cash +
    mpesaBank balances) + `nonSaleConsumption` (separate).
  - `config.ts` — `getDishWasteCostPercent()`, default 0.60, env override
    `DISH_WASTE_COST_PERCENT`. Single source of truth (ADR-55 §4).
- **API** (`app/api/`, all Admin-only, thin handlers): `POST/GET
  /api/expenses`, `POST /api/expenses/:id/correct`, `POST/GET
  /api/owner-transactions`, `GET /api/financials/summary?from=&to=`. Zod
  in `lib/validation/financials.ts`. `GET /api/financials/balances` was
  **not** built — those figures are all in `summary.consolidated`.
- **Frontend** (`app/admin/financials/`, composed from the frozen kit,
  siblings `handovers-tab.tsx` / `transactions-tab.tsx`):
  - **KPI strip WIRED** — `kpi-strip.tsx` now takes `summary` + `loading`;
    the shell fetches `useFinancialSummary(date)` and passes it. The four
    tiles = liquidity (cash+mpesa) / cash / mpesa / today's expenses.
    **`TODO(mock)` deleted.** Desktop strip + mobile 2×2 markup + semantic
    colours unchanged; only values are real. Em-dash until the summary
    resolves.
  - **Expenses tab** — `expenses-tab.tsx` + `expense-drawer.tsx`
    (create + correct modes) + `use-financials.ts`. Table + entry drawer
    (category / amount / date / paid-from / note); per-row "Correct". A
    create/correct refreshes the summary + KPIs.
  - **Owner Draws tab** — `owner-draws-tab.tsx` + `owner-draw-drawer.tsx`.
    Draw/return log + the running **"Owed back to the business"** figure
    from `consolidated.ownerOwedToBusiness`.
  - **Profit tab** — `profit-summary.tsx`. Revenue → COGS → Gross →
    Expenses → Net stack (consolidated); position tiles (cash / M-Pesa /
    debts owed / owed by owner); per-location table (revenue / cogs /
    gross). The **non-sale consumption** figure is a separate block, well
    clear of the Net stack, captioned "already inside the COGS figure
    above", leading with the by-reason breakdown — so no reader totals the
    two (per orchestrator guidance).
  - `financials-client.tsx` inner tab row now 6 tabs; `page.tsx` `?tab=`
    accepts the 3 new keys.
- **Seed** (`prisma/seed.ts`, new §8): today's handovers (exact-match
  received, shortfall received + note, declared-not-received),
  6 expenses across the week (cash + mpesa), 3 owner transactions
  (2 draws + 1 return → owed = 4,000). Stale header comment updated —
  Handover / ReceiptOfHandover / HandoverShortfall / Expense /
  OwnerTransaction removed from the exclusion list; Recipe / Attendance /
  StaffPayAdjustment / DayClose stay excluded (M4).

**COGS model changed mid-session (orchestrator + owner).** The
ingredients-only sweep in PRD §3 / ADR-33 §2 was **wrong**. Corrected
model (now ADR-55, PRD §3 rewritten):
- **COGS = opening stock value + purchase-RECEIPT value − closing stock
  value**, over EVERY product at EVERY location. Valued by kind:
  ingredient/goods → `buyingPrice`, dish → **0** (dishes value at zero is
  what prevents double-counting, not excluding them). "Added" = purchase
  receipts only — production, transfers, opening excluded. Transfers
  between the business's own locations never move COGS.
- **Non-sale consumption cost is a SEPARATE report — a view INTO COGS,
  not an addition.** Wasted stock already left the ledger and is already
  in the sweep. Valued: ingredient/goods → `buyingPrice`; dish →
  `dishWasteCostPercent × sellingPrice` (configurable, default 0.60).
  Broken out by reason.

**Verified.**
- Domain: `expenses.test.ts` (9), `owner-transactions.test.ts` (5),
  `get-financial-summary.test.ts` (8) + the pre-existing `record-money-
  movement` / `get-account-balances` suites — 29 financials tests green.
  The profit chain asserts exact figures on a controlled fixture:
  **revenue 5,000 · COGS 5,000 (goods sweep 2,000 + ingredient sweep
  3,000, dishes valued 0) · gross 0 · expenses 400 · net −400**; plus
  explicit tests that a dish contributes 0 to valuation, a transfer
  doesn't move COGS, production doesn't inflate COGS, a waste event
  doesn't add to COGS on top, dish waste values at `% × sellingPrice`,
  and changing the config `%` changes the waste figure but not COGS.
- Route: admin-only gates on all 4 endpoints (10 tests).
- Screen: `admin-financials-expenses.screen.test.tsx` — expense drawer
  submit, expense correct, owner-draw submit + owed figure, KPI tiles
  rendering real values + em-dash fallback (5 tests). `financials.screen.
  test.tsx` updated (KPI "M3" placeholder gone).
- `pnpm test` (full suite), `pnpm typecheck`, `pnpm build` — green.
- `pnpm dev` as Admin: logged an expense → cash moved by exactly −750;
  logged a draw (−1000 cash, +1000 owed) and a return (+400 cash, −400
  owed); recorded a handover receipt → **cash unchanged** (no double-
  count, ADR-54 no-split holds); non-sale consumption over a past range
  read spoiled 100 (Carrots 2 × 50 buying) + staffMeal 360 (Chicken Stew
  3 × 0.60 × 200 selling), and net profit did NOT absorb it.

**Changed from plan / notes for M4.**
- No `milestone-3-plan.md` (M3 ran without one, per the S1–S3 handoffs).
- The seed now creates **today-dated handovers**. Three unscoped
  `handovers.test.ts` admin-wide reads (`getReconciliation(today)` /
  `listHandovers({}, admin)`) assumed an empty "today" and broke — fixed
  to assert on their own rows / on deltas. M4 authors: any new test that
  reads "all rows for today" must scope to its own fixtures.
- SCHEMA §14 still describes the old ingredients-only COGS split — flagged
  in ADR-55 to reconcile next time it's touched.
- `Expense` has no location column and Dish COGS is not per-location, so
  per-location profit is revenue/COGS/gross only; expenses, net profit,
  debts are consolidated. Called out in the UI and ADR-55.
- The no-split decision (ADR-54) was verified from inside the code and is
  sound — recorded as a context block on ADR-54, not a new ADR.

---

## Milestone 3 Session 3 — Handover UI (Admin reconciliation tab + staff declare screens) (Developer — 2026-09-03) — DONE

**Shipped.**

- **`/admin/financials` rebuilt: one screen, one shared business-date
  picker, ONE inner tab row over transaction types.**
  `financials-client.tsx` (was 1,034 lines) is now a ~150-line shell:
  toolbar = title + kit `<DatePicker>` (defaults to today, `maxDate =
  today`, Admin may view past dates) + a "Record Payment" button (Stock
  Purchases tab only). Body = one `<Tabs>` row —
  **Stock Purchases · Deliveries · Handovers** — over `transactions-tab.tsx`.
  Change the date → every tab re-fetches for that Africa/Nairobi business
  day. Expenses / owner draws (S4) slot in as more inner tabs under the
  same date. `?tab=` (`purchases`|`deliveries`|`handovers`) deep-links.
  * `transactions-tab.tsx` — owns the fetch for the active tab.
    Stock Purchases / Deliveries: one kit `<SimpleTable>` each,
    **date-scoped** via `stockApi.listMovements({ movementType, date })`
    (the old body called `listMovements` with no date — it showed *all
    time*). The **KPI strip** sits above the table, on every tab (markup
    + `TODO(mock)` kept — S4 owns wiring it).
  * `kpi-strip.tsx` — the KPI markup + `TODO(mock)`, extracted.
  * **The ADR-46 "Reconciliation" table is GONE.** Its four states folded
    into a **Status column**: Stock Purchases → Awaiting delivery /
    Delivered / Flagged (from `outstanding.awaitingReceipt` + a
    "variance" note); Deliveries → Matched / Unmatched, and an Unmatched
    receipt carries an inline "Record payment" link. One table language,
    the kit `<SimpleTable>` — no bespoke second table, no cross-reference.
- **Handovers tab** (`HandoversView` in `handovers-tab.tsx` +
  `use-handovers.ts`) — the third inner tab; consumes
  `GET /api/handovers/reconciliation?date=` for the toolbar date (no own
  picker). Columns (owner-specified): **Staff · Declared · Received ·
  Variance · Status · Note · action** — Location + Time dropped
  (Location is redundant with Staff; declaration time isn't useful at day
  granularity). Declared / Received / Variance each a right-aligned
  `Cash <n>` / `M-Pesa <n>` labelled stack (not a `c / m` slash pair —
  that was cramped and its 4-line Staff-cell pile-up overflowed the
  fixed row height, the bug in the first screenshot). Variance is the
  only coloured column (exact = neutral, short = `text-danger`, over =
  `text-success`). Note is its own wrapping column (the shortfall note
  was truncated to "…" under Status before). `isToday` gates the primary
  **"Record receipt"** on un-received rows; a past date shows "Not
  received" instead (staff can't declare/receive for past days, ADR-53).
  Received rows carry **"Correct"** on any date (Admin corrections aren't
  day-gated). Totals strip below, rendered from the endpoint's pre-summed
  `totals`. Mobile = stacked cards.
- **Receipt drawer** (`receipt-drawer.tsx`) — kit rail `<Drawer>` +
  `<TextInput startAdornment="KES">` ×2 + `<Textarea>` +
  `<CalculatedImpactBanner>`. Live per-channel variance preview. When
  either received figure is below declared, the note field flags as
  required **and** the drawer surfaces the server `VALIDATION_ERROR` on
  field `shortfallNote` inline (submission is not blocked client-side
  only — the server is the gate). Fires a toast on success.
- **Correction drawer** (`handover-correction-drawer.tsx`) — follows
  `app/admin/stock/correction-drawer.tsx`. A `<SegmentedControl>` picks
  the discriminated `target` ("The receipt" / "The declaration"); the
  form submits corrected **absolute** figures (never a delta — the domain
  computes it). `target: "receipt"` keeps the shortfall-note requirement.
  Defaults to correcting the receipt when one exists.
- **Nav** — the `handovers` admin nav item (a standalone `/admin/handovers`
  route that was never built) now deep-links `/admin/financials?tab=handovers`
  and moved to the "People & Money" group next to Financials. A 308
  redirect `/admin/handovers → /admin/financials?tab=handovers` added in
  `next.config.ts`. The admin shell reads `?tab=` from `window.location`
  in an effect (not `useSearchParams` — that would force a Suspense
  boundary on the whole admin tree) so the "Handovers" item highlights.
- **`/cashier/handover` + `/canteen/handover`** — one shared
  `HandoverClient` (in `app/cashier/handover/`, imported by the canteen
  page — the `derived-tab` cross-role-import precedent) + `use-my-handover.ts`.
  Today's declaration is a 2-field form (cash + M-Pesa); if one exists
  it renders pre-filled and editable ("Update handover"). Once a receipt
  exists the form renders **locked** with "Already received — ask an
  administrator to correct it."; a `CONFLICT` thrown on submit (Admin
  receives between load and submit) shows the same message, not a generic
  error. Own history below (declared / received / variance, read-only).
  **No date picker** (staff are today-only, ADR-53). Both routes added to
  the staff bottom nav as `handover` — the key matches the route segment
  (F2 guard); `staff-nav-routes.screen.test.tsx` covers both automatically.

**Screen specs** (`tests/screens/`):

- `financials.screen.test.tsx` — **rewritten** for the new structure
  (toolbar date + 3 inner tabs + status-column fold). Asserts: toolbar
  date picker + the 3 tabs; `listMovements` scoped to today; KPI strip
  still `—`/M3; date-scoped empty states; the folded status chips
  (Awaiting delivery / Delivered / Matched / Unmatched + inline "Record
  payment"); payment drawer excludes Dishes + records + toasts; the
  Handovers tab renders the reconciliation table + totals for the
  toolbar date.
- `admin-handovers.screen.test.tsx` (3) — drives `<HandoversView date …
  isToday />` directly: receipt drawer exact-match submit + toast;
  shortfall → server `VALIDATION_ERROR` field `shortfallNote` surfaced
  inline, drawer stays open; correction drawer submits corrected absolute
  declared figures (`target: "handover"`).
- `staff-handover.screen.test.tsx` (3) — declare posts
  `{ cashDeclared, mpesaDeclared }`; a receipt on the loaded view locks
  the form with the CONFLICT copy; a `CONFLICT` on submit shows the same
  copy.

**Owner walkthrough (`pnpm dev`, all three roles via the real HTTP API).**
Cashier + Canteen declare; Cashier edits own pre-receipt (200). Admin
reconciliation lists both with pre-summed totals. Exact-match receipt
(201); shortfall-without-note → 400 `field: shortfallNote`;
shortfall-with-note → 201. Cashier edit post-receipt → 409 CONFLICT.
Admin corrects the receipt then the declaration with absolute values →
final derived declared / stored variance / shortfall notes fold in.
Cashier hitting `GET /api/handovers/reconciliation` → 403. `/admin/handovers`
→ 308. `/cashier/handover` + `/canteen/handover` → 200. **The dev DB was
reseeded afterward** (`pnpm prisma:seed`) — the walkthrough left extra
handover rows on today's date that broke `handovers.test.ts`'s
"length 2" reconciliation assertions (shared-dev-DB pollution, not a code
regression; suite green after reseed).

**Deltas from plan / handoff.**

- **The handoff's refactor premise was stale**, and the first cut of the
  fix was revised by the owner mid-session. The handoff said "split each
  tab of `financials-client.tsx`, add a fourth tab" — but the file had
  **no top-level tabs** (KPI strip + an inner Purchases/Deliveries
  `<Tabs>` + a separate Reconciliation section), and the nav already
  routed `Handovers` at a never-built `/admin/handovers`. First cut:
  outer "Purchases | Handovers" tabs. **Owner then specified the real
  shape:** ONE screen, ONE toolbar business-date picker shared across
  **Stock Purchases · Deliveries · Handovers** inner tabs; the separate
  ADR-46 Reconciliation table folded into a Status column; KPI strip
  above the table. `financials-client.tsx` → shell (`transactions-tab.tsx`
  holds the bodies; `handovers-tab.tsx` exports `HandoversView`).
  `purchases-tab.tsx` was created then deleted in the same session.
- **Handovers table columns** were owner-specified after a first render
  overflowed: **Staff · Declared · Received · Variance · Status · Note ·
  action**. Dropped Location (redundant with Staff) and Time (not useful
  at day granularity). Money cells are labelled `Cash <n>` / `M-Pesa <n>`
  stacks, not `c / m` slash pairs; Note is its own wrapping column.
- **`listMovements` is now date-scoped** on the Purchases/Deliveries tabs
  (`{ movementType, date }`) — the old body fetched with no date and
  showed all-time rows, with the "Delivered" reconciliation window hacked
  to today-only in code. Gone.
- No `milestone-3-plan.md` created (per handoff).
- The KPI-tile `TODO(mock)` moved into `kpi-strip.tsx`, otherwise
  byte-identical — still owned by S4 Financials.

**For Session 4 (Financials) — API contract notes.**

- `GET /api/handovers/reconciliation` fit the Admin tab cleanly. One
  gap: the row has no `handoverOccurredAt`-vs-`receiptOccurredAt` split
  and no `correctedAt` marker, so the tab can't show "declared at X,
  received at Y, corrected at Z" — it shows the handover `occurredAt`
  only. Fine for the reconciliation view; the **audit-trail screen**
  (later) will need the receipt/ correction timestamps, which today live
  only on the `HandoverView.receipts[]` rows (not in the reconciliation
  payload).
- `correctReceipt` appends a second `ReceiptOfHandover` row; the
  reconciliation `receiptId` / variance / notes correctly take the
  latest, but a `HandoverView` returned from the correct endpoint has
  `receipts.length === 2`. The staff history card uses `receipts.at(-1)`
  for the same reason. If S4 ever sums receipts it must dedupe to the
  latest per handover.
- **ADR-54 stands:** a receipt still writes no `MoneyMovement`. If S4
  introduces a till/hand account split, wire the paired
  `sourceType: "handover_receipt"` movement then (the enum value is
  reserved).

**Kit.** No kit change. The old bespoke `ReconTable` was **deleted**
(status folded into a `<SimpleTable>` column). One mapper remains: the
Handovers totals strip (a `<SimpleTable>` has no footer slot) — hand-laid
`<div>`s whose column widths track the `columns` array. Possible kit gaps
noted: no `rowClassName` / footer slot on `<SimpleTable>`; a labelled
two-line money cell (`Cash <n>` / `M-Pesa <n>`) is a local `<Stack>`
helper — a candidate if a third screen needs it.

**Owner should look at** — the Handovers table column set + the
`Cash`/`M-Pesa` stacked cells were tuned live with the owner; a Paper
pass could still refine the totals strip (sticky footer?) and the mobile
card hierarchy. The staff declare screen is deliberately plain (mirrors
cashier-today) — worth a look for whether the "past handovers" list
earns its place or should be a separate view.

**Gate state.** `pnpm tsc --noEmit` **0**. `pnpm build` **clean**.
`pnpm test` green after the post-walkthrough reseed (the 3 transient
`handovers.test.ts` failures were dev-DB pollution from the manual drive,
not code — see Deltas). `grep TODO(mock)` in new files → only the
pre-existing KPI one (S4).

---

## Milestone 3 Session 2 — Handovers & Reconciliation backend + staff "today only" gate (Developer — 2026-09-03) — DONE

**Shipped.**

- **`lib/domain/handovers`** is a real module (was an empty dir),
  structured after `lib/domain/customers`:
  - `declareHandover` — Cashier / Canteen Attendant declares cash +
    M-Pesa for their own `Staff`-linked location. Day-close **and**
    today-only gated.
  - `editOwnHandover` — staff true-edit of their own declaration before
    close and before a receipt exists (`CONFLICT` once received). Both
    gates.
  - `recordReceipt` — Admin records actual received; computes
    `variance = received − (current derived declared)` per channel and
    **stores it permanently** on a new `ReceiptOfHandover` row. Shortfall
    → required note → `HandoverShortfall`. Day-close gated. **Writes no
    `MoneyMovement`** (ADR-54).
  - `correctHandover` / `correctReceipt` — Admin-only, append-only,
    **not** day-close gated. `correctHandover` writes a delta `Handover`
    row via `correctsHandoverId`, computing the delta against
    `original + Σ existing deltas` (double-submit → delta 0 →
    `VALIDATION_ERROR`; cannot correct a correction — the F-1 pattern
    from `correctMovement`). `correctReceipt` writes a fresh
    `ReceiptOfHandover` row with corrected absolutes + recomputed stored
    variance (no `corrects_receipt_id` column — reads take the latest
    receipt).
  - Reads: `listHandovers` (role-scoped — staff see own, Admin sees all;
    `date` + `locationId` filters; correction rows excluded, derived
    figures folded in) and `getReconciliation(date)` — the Admin
    reconciliation view's read (declared vs received vs stored variance
    per handover + day totals).
- **API:** `app/api/handovers/` — `POST` (declare, staff), `PATCH /:id`
  (edit own, staff), `POST /:id/receive` (Admin), `POST /:id/correct`
  (Admin, discriminated `target: "handover" | "receipt"`), `GET` (list,
  role-scoped), `GET /reconciliation` (Admin). Thin handlers,
  `lib/validation/handovers.ts`.
- **Staff "today only" gate (ADR-53) — added task from the owner
  mid-session.** New shared guard `assertStaffDateIsToday(value, actor)`
  in `lib/domain/audit/day-close-guard.ts` (exported from the barrel):
  a non-admin may only create / edit a record dated to today
  (Africa/Nairobi); Admin is exempt. Applied **in addition to**
  `assertDayOpen` in: `createOrder`, `editOwnOrder`, `recordStockCount`,
  `voidStockCount`, `recordRepayment` (via a new optional
  `CustomerContext.role`), `declareHandover`, `editOwnHandover`, and the
  `writeMovementLine` stock chokepoint (via optional
  `LineAuditMeta.actorRole` — inert today as every stock create lands at
  `now`, a guard for any future backdated stock path).

**Key decisions (ADRs).**

- **ADR-54 — a handover receipt writes NO `MoneyMovement`.** The takings
  are already on the money ledger from point-of-sale (`sourceType:
  "order"` / `"canteen_sale"`); a handover is a custody transfer, and
  `MoneyAccount` has no till-vs-hand split for it to move between.
  Variance is a `HandoverShortfall` note, not a ledger debit. **Hook for
  Session 4:** if Financials introduces a till/hand account split, a
  receipt becomes the transfer event and SHOULD write a paired movement
  with `sourceType: "handover_receipt"` (enum value reserved for it).
  Until then: nothing.
- **ADR-53** — the staff today-only rule above.

**Deltas from plan.**

- The today-only gate was not in the Session 2 handoff — it arrived from
  the orchestrator mid-session as an owner decision and was folded in.
- **30 existing tests** assumed staff could backdate writes (order /
  stock-count suites using fixed 2026-08 fixture dates). Fixed to match
  the new rule, not weakened: canteen-derivation suites now use an
  `admin`-role actor for backdated `recordStockCount` (the domain gates
  on `locationId`, not role; role-scoping has dedicated coverage);
  order-correction / edit-own-order tests drop the backdated `occurredAt`
  (default = today) or backdate via a post-create `prisma.update`. One
  `voidStockCount` closed-day test re-anchored to a fixed 2019 date to
  dodge shared-DB `DayClose.date` collisions.
- No `milestone-3-plan.md` created (per handoff).

**Gate state.** `pnpm test` / `typecheck` / `build` green. No UI this
session (handover UI is next). No `TODO(mock)` in new files.

**For the handover UI session (next).**

- Build the Admin reconciliation screen against **`GET
  /api/handovers/reconciliation?date=`** — its `rows[]` shape (above) is
  the exact contract; do not re-derive. `totals` are pre-summed.
- Staff declare/edit screens hit `POST /api/handovers` and
  `PATCH /api/handovers/:id`. A staff member has exactly one open
  declaration to edit per day; `editOwnHandover` returns `CONFLICT` once
  the Admin has received it — surface that as "already received, ask the
  Admin".
- The receipt drawer (Admin) posts to `/:id/receive`; when either
  received figure is below declared, the note field is **required** — the
  domain returns `VALIDATION_ERROR` field `shortfallNote`, wire the
  inline error off that.
- Corrections (Admin) post to `/:id/correct` with `target`. The screen
  shows current derived figures; the form submits corrected **absolute**
  values (declared: absolute too — the domain computes the delta).

---

## Milestone 3 Session 1 — Day Close foundation (Developer — 2026-09-02) — DONE

**Shipped.**

- **`lib/domain/audit`** is now a real module (was an empty dir). One
  shared day-close guard — `isDayClosed` / `assertDayOpen` /
  `assertActorMayCorrectOnDate` (`day-close-guard.ts`) — plus `closeDay`
  / `reopenDay` / `listDayCloses` / `getDayStatus` (`close-day.ts`,
  `list-day-closes.ts`). Both close and reopen write an `AuditLog` row.
- **Schema:** `day_close` + `day_reopen` added to the `AuditAction` enum
  (additive migration `20260903120000_add_day_close_audit_actions`). No
  table change; `DayClose` model was already present.
- **Every ledger write path retrofitted** to the shared guard:
  - `correctMovement` — inline `tx.dayClose.findUnique` **replaced** with
    `assertActorMayCorrectOnDate` (the single implementation now).
  - `createOrder`, `recordStockCount`, `recordRepayment`,
    `setOpeningStock`, `recordPurchasePayment`, and the
    `writeMovementLine` chokepoint (all 8 stock movement fns + batches) —
    `assertDayOpen` on the entry's business date.
  - `editOwnOrder`, `voidStockCount` — `isDayClosed` (staff same-day
    actions; the old "is it today?" heuristic is gone).
- **API:** `app/api/day-close` — `GET` (today's status + recent closes),
  `POST` (close), `DELETE` (reopen). Admin-only, all verbs, thin
  handlers. `lib/validation/day-close.ts`.
- **UI:** the `/admin` dashboard page (was an `EmptyState` placeholder)
  now renders the **Day Close card** — today's status, a close/reopen
  `ToggleSwitch`, and a `SimpleTable` of recent closed dates each with a
  one-tap Reopen. `app/admin/day-close/` (`use-day-close.ts` +
  `day-close-client.tsx`). Composed from the frozen kit; no new route, no
  kit change.

**Owner decisions carried in (ADR-52).**

- **Reopening is permitted and low-friction** — a plain toggle, any date
  incl. historical, no type-to-confirm. The **audit trail** (`day_close`
  / `day_reopen` rows) is the history-preservation mechanism, not a hard
  seal.
- Guard placed in `lib/domain/audit` (not `lib/time`) — `CONVENTIONS.md`
  §1/§5 already name it as the home for DayClose + day-boundary logic.

**Deltas from plan.**

- No `milestone-3-plan.md` yet (per handoff — not created).
- **`correctOrder` and `acceptTransfer`/`flagTransfer` deliberately left
  ungated.** `correctOrder` *is* the sanctioned correction path and must
  work on closed days. `acceptTransfer` completes an in-flight transfer
  at `occurredAt = now` — gating it would strand a dispatched transfer
  when a day closes. Both write via `tx.stockMovement.create` directly
  (not `writeMovementLine`), so the chokepoint doesn't catch them — by
  design. **Sessions 2–5 (handovers, financials) should assume the same
  rule:** gate *create* paths with `assertDayOpen`; leave append-only
  *correction* paths to enforce admin-only themselves.
- 3 sibling domain tests rewrote their day-close assertion from the M2
  "not today" heuristic to sealing an actual `DayClose` row
  (`edit-own-order`, `record-stock-count`, `qa-m2-session-7`).
- `DayClose.date` is `@unique` with no scope column — suites that seal a
  date now clean up `dayClose` by `closedBy IN (suite users)`
  (`cleanupSalesTestData` + the new audit test-helper). Audit-domain
  tests use fixed 2019-… dates.

**Verification.**

- `pnpm test` **635/635** green (was 621 — +9 audit domain suite, +5
  day-close route, rest from modified sibling tests). `pnpm typecheck`
  clean. `pnpm build` clean.
- Manual drive on `pnpm dev` (Admin + Store Manager sessions): SM `GET
  /api/day-close` → 403; Admin close today → 201; second close → 409;
  **SM records stock on the closed day → FORBIDDEN**; Admin reopen → 200;
  **SM records stock after reopen → 201**. `/admin` card renders.

**Blocked / follow-ups.** None. M1 known follow-ups (2-phase transfer
receiver visibility, seed `update: {}` hardening, migration-history) still
open, unchanged.

---

## Post-M2 — quantity audit fixes: 7 of 10 findings closed (Developer — 2026-09-02) — DONE

Second half of the audit handover (`docs/sprints/handovers/SESSION-seed-rebuild-and-quantity-fixes.md`
§3). §2 (the seed rebuild) shipped in the previous session and closed
F3/F5/F10 by data; this session fixed the remaining code findings.

**Owner decisions taken this session** (both were blocked pending a call):

- **F1** — a superseded order is EXCLUDED from `listOrders`; only the
  correction counts. Chosen over "show both, sum one" so no future
  consumer can re-introduce the double-count by forgetting a flag.
- **F2 History tabs** — dropped from the nav rather than built. The hub
  timeline already covers recent activity; a real History screen can be
  planned on its own merits.
- **F6** — a new `variance` movement type, not a ledger-only column, so
  the loss is a row anything can sum.

**Shipped**

- **F4 · ledger hid opening stock on the day it was set (HIGH).** The
  Opening column is now walked BACK from the day's own closing balance
  (`balances asOf date` − Σ the day's columned movements) instead of read
  forward from the prior day's closing. `useLedger` fetches `dayClosing`
  in place of `priorClosing`. Self-heals every movement type that feeds no
  column — `opening` AND `stock_count` — and makes it structurally
  impossible for the ledger's Closing to contradict
  `GET /api/stock-movements/balances` for the same date, which was the
  actual defect. Verified against the live seed: on the opening day all
  **19** product/location pairs holding stock read `Opening 0.0 · Closing
  0.0` before and reconcile exactly now; the other 6 days unchanged.
- **F2 · three of nine staff nav tabs 404'd (HIGH).** `StaffNavDef` gained
  an optional `href` for when the route isn't `<basePath>/<key>`; the
  Cashier's "New Order" now points at `/cashier/orders/new` and
  `activeNavKeyFromPathname` matches the deep route so the tab lights up.
  Both "History" tabs removed. Re-measured authenticated: real pages
  19–22KB, the two `history` URLs 13.8KB (Next default 404) and no longer
  reachable from any tab.
- **F1 · corrected orders double-counted every revenue total (HIGH).**
  `listOrders` drops any order a correction supersedes. The superseding
  query deliberately ignores the caller's role/date scope — a
  cashier-scoped read never sees the Admin's correction, which is why the
  original leaked into the cashier's total in the first place. The dead
  `correctedByNumber` map and the unreachable "Corrected" chip are gone
  from C1.
- **F6 · transfer variance lost stock with no quantity trail (MEDIUM).**
  New `variance` MovementType. Accepting short now books a PAIR at the
  destination: the receipt lands the FULL dispatched magnitude and a
  `variance` row writes the difference off. Both balances are identical to
  the old behaviour — the point is that the loss is now a summable row
  instead of free text on the accept note. Shape forced by the ledger
  rule: a balance is a plain signed sum of the rows AT a location, so
  there was nowhere to "add" a loss row without corrupting a balance that
  was already correct; the write-off has to be paired with the receipt it
  offsets.
- **F7 · both hubs showed ALL history under a "today" heading (MEDIUM).**
  New `todaysMovements()` filters at the timeline, NOT at the fetch —
  `deriveIncomingTransfers` needs the unscoped history to find a transfer
  dispatched on an earlier day that is still awaiting acceptance, so
  date-scoping the request (as the handover suggested) would have blanked
  the Accept banner. Covered by a test.
- **F8 · zero-quantity money rows rendered as stock (LOW).**
  `purchase_payment` excluded by the same helper, on the same grounds the
  Admin ledger already routes it to no column.
- **F9 · soft-deleted products rendered as "?" (LOW).** `productName` /
  `unitLabel` now travel on `StockMovementView`, resolved server-side from
  the movement's own relation. Screens must NOT resolve names against
  `GET /api/products` — that read excludes archived rows and must keep
  doing so for the pickers (`tests/integration/archived-picker-exclusion.test.ts`).

**Blocked / carried forward**

- **F6 has no ledger column of its own.** `variance` is currently routed
  into the Issues column so the TOTAL reconciles and the loss is visible.
  A dedicated column means editing `<DenseLedger>`, which CLAUDE.md
  freezes — raised with the owner rather than forked. Until then a
  variance reads as an issue on the grid.
- **F10 data migration** — the seed fixed the classification, but whether
  any real rows created through the UI need migrating is still open.

**Notes**

- The dev DB has no `_prisma_migrations` table (built by `db push`, a
  known condition already logged under M1 follow-ups), so
  `migrate deploy` refused. The migration file
  `20260902120000_add_variance_movement_type` is committed for a real
  deploy AND the enum value was applied directly to the dev DB.
- `previousBusinessDate` is now unused by `useLedger` but kept — it is
  exported and directly tested.

**Gate:** `pnpm test` **621/621** (75 files) · `pnpm typecheck` 0 ·
`pnpm build` clean. No `TODO(mock)` added.

---

## Post-M2 — quantity accuracy audit, 3 roles + the ledger (Developer — 2026-09-02) — AUDIT DONE, FIXES HANDED OVER

Owner asked for a check that every quantity shown to a Store Manager,
Canteen Attendant and Restaurant Cashier is actually accurate, and
mid-session extended it to the Admin ledger ("this is what the admin is
going to be referring to and checking daily").

**Method.** 16 role screens + the Admin ledger. For each, call its API as
that role, independently recompute every figure from raw `StockMovement` /
`Order` rows, compare. Then exercise the real write endpoints with scratch
data and verify the deltas. All scratch writes reversed — DB back to 18
stockMovements / 10 orders / 14 orderLines. **No source changed by the audit.**

**10 findings** — full detail in `docs/sprints/m2-quantity-audit.md`.
HIGH: F1 cashier "Today" total double-counts corrections (renders KES 380
where KES 120 was collected, and a cashier can never see the "Corrected"
chip); F2 three of nine staff bottom-nav tabs 404 (owner reported the
Cashier one; SM + Canteen "History" found by sweep); F4 the ledger hides
opening stock on the day it is set (Closing contradicts the balances
endpoint for the same date); F10 goods mis-typed as dishes, so **Record
Batch Production offers Soda 300ml and Water 500ml as things to cook**.
MEDIUM: F3/F5 seeded orders and canteen counts have no `sale` movements
(seed early-return; production path verified correct); F6 transfer variance
loses stock with only a free-text note (6 dispatched, 4 accepted, 2 vanish
from every total); F7 both hubs render ALL history under a "today" heading.
LOW: F8 zero-quantity money rows render as "+0 kg"; F9 archived products
render as "?".

**Verified correct** (so a later session doesn't "fix" them): issue,
receive, non-sale, both transfer phases, sale-on-order, cross-day
carry-forward, and ledger columns/totals recomputed exactly for 30 Aug and
2 Sep. The canteen stock-count preview is the strongest calculation in the
app — 192−150=42 sold, KES 2,520, and an over-count correctly blocks.

**One self-correction:** `StockCount.soldQuantity` was first reported as
corrupt (`"undefined"` in the DB). That column does not exist by design —
units sold is derived from sale movements, per the ledger rule — and the
string was an artifact of the audit script. F5 was rewritten.

**Owner decisions taken:** seed to be **wiped and rebuilt** (not upserted),
with dates **relative to today**; goods are sold at the **Restaurant as well
as the Canteen**, so the catalogue's kind/location model is wrong today.

**Handed over, not fixed:** `docs/sprints/handovers/SESSION-seed-rebuild-and-quantity-fixes.md`
carries the seed spec (§2) and all 10 findings (§3). F1 and F6 need an owner
product decision before coding. Sequence: seed rebuild first (it resolves
F3/F5/F10 and makes the rest visible), then the code fixes.

---

## Post-M2 — dev seed wiped and rebuilt (Developer — 2026-09-02) — DONE

Task 0 of `SESSION-seed-rebuild-and-quantity-fixes.md` §2. `prisma/seed.ts`
rewritten from an upsert-onto-existing script into a **wipe + rebuild**,
per the owner decision recorded in the audit entry above. Only the seed
changed — no `app/**`, no `lib/**`, no schema, no migration.

**What the new seed lays down.** 18 products · 91 stock movements over 7
business days · 20 orders / 34 lines · 7 canteen stock counts · 26 money
movements · 6 customers · 4 assets. Dates are recomputed from `SEED_NOW`
on every run, so it never goes stale.

**Three audit findings are closed by the data itself:**

- **F3** — every order now writes its `sale` `StockMovement` rows. The old
  seed early-returned when an order id already existed, so a re-seed left
  10 orders with zero sale movements. Verified: 20/20 orders have exactly
  one sale row per line.
- **F5** — each canteen count writes its paired derived `sale` movement
  and `canteen_sale` `MoneyMovement`, so `unitsSold` and `revenue` agree.
  Was `unitsSold "0.0000"` against `revenue "2880.00"`; now Soda 22/1320,
  Groundnuts 30/900, Mandazi 34/680, and the zero-sold count reads 0/0.00.
- **F10** — product kinds corrected. Sodas, Water, Mandazi, Groundnuts,
  Bar Soap and Glucose are `goods`, not `dish`, so **Record Batch
  Production no longer offers Soda 300ml as a thing to cook**. Enforced
  and verified: 0 `production` rows name a non-dish, and 0 ingredients
  hold stock outside the Store. Goods reach the Restaurant/Canteen by
  `purchase_receipt` or `transfer` only.

**Ledger coverage.** Every `COLUMN_FOR_TYPE` column is non-empty on some
day of the week (purchases, issues, production, transferIn, transferOut,
sold, plus `non_sale_consumption`). 9–12 resting products per day exercise
the resting-rows fix. One product (Chicken Breast, −2) ends negative on
purpose. One accepted transfer, two pending dispatches (the incoming
banner), and one corrected `purchase_receipt` using the correction-entry
pattern.

**Verification.** Ledger closing recomputed against `getDerivedStockBalances`
for all 7 days: **0 mismatches**. Customer balances resolve to the four
intended states (owing 320 · settled · owing 500 · in credit −100) plus
two with no history. Stock-count preview drives correctly end-to-end:
counting 70 Soda derives 10 sold / KES 600, and an impossible count of 999
blocks with `exceedsExpectedBy 919`. Seed run three times consecutively —
identical row counts every time.

**Two constraints found while building it, both now encoded in the file:**

- **`AuditLog.userId` is a RESTRICT foreign key onto `user`.** The handover
  said "do not delete AuditLog (79 rows of real history)", which makes
  deleting Users impossible. So `wipe()` spares User / Staff / Location and
  §2 **upserts** them by their unique `name` instead — every audit entry
  stays correctly attributed. Non-seed logins are deactivated, not deleted.
  Orphaned `Staff` rows from the old underscore id convention
  (`seed-staff-store_manager` vs `seed-staff-store-manager`) *are* deleted —
  Staff carries no AuditLog FK, and they were surfacing as phantom staff.
- **Today's canteen count is dated to the morning (06:30), not the evening.**
  `deriveStockCount` refuses a count at or before an existing one ("counts
  must move forward in time"), so an evening-dated count today would block
  the attendant from recording a live one during a walkthrough.

**Deliberately not seeded.** Recipe, RecipeIngredient, Handover,
ReceiptOfHandover, HandoverShortfall, OwnerTransaction, Attendance,
StaffPayAdjustment, DayClose — no UI. Expense — has a screen but **no
`app/api/expenses` route** (verified this session), so seeding it would
create invisible data. This is the handover §2.3 rule applied.

**F4 now reproduces on a known date.** The ledger's 7-day reconciliation is
exact on every day *except* the opening day, where it reports Closing 0
against true balances of 40/25/30 — exactly the F4 symptom
(`COLUMN_FOR_TYPE.opening` is `null`, so an opening row feeds no column and
the prior day's closing is 0). That is a code bug for the next session, not
a seed defect; the seed just makes it reproducible on demand.

**Gate:** `pnpm test` 597/597 (73 files) · `pnpm typecheck` 0 · `pnpm build`
clean.

**Note for the next session.** The handover's F7 fix names
`nairobiBusinessDate()`. That function does not exist — the helper is
`toBusinessDate(new Date())` in `lib/time`.

**Still open:** all 10 findings' *code* fixes (F1, F2, F4, F6, F7, F8, F9,
and any F10 data migration for rows created through the UI). F1 and F6
still need an owner product decision before coding — see
`docs/sprints/m2-quantity-audit.md` §3.1 and §3.6.

---

## Post-M2 — Store opening stock seeded + additive readouts made honest (Developer — 2026-09-02) — DONE

**Owner walkthrough finding (follow-on).** With the Restaurant
re-activated, the SM flows split cleanly: Record Batch Production and
Transfer Stock read correctly, but **Issue Ingredients** and **Log
Non-Sale** showed "None on hand" for every item, and **Receive Goods**
showed Carrots "On hand: 1 kg". Two independent causes, both now closed.

**Cause 1 — the Store ledger was genuinely empty (data, not a bug).**
`prisma/seed.ts` seeded opening stock at the Canteen and production at
the Restaurant, and created the Store's ingredient `Product` rows, but
never a Store `ProductLocation` and never a Store `opening` movement. The
only Store row in the ledger was the owner's own test Rice
`purchase_receipt` (10 kg) — so every other balance summed to a correct
0. "Opening = yesterday's closing" (ADR-11 / ADR-40) carries a balance
forward only if there was one; the Store was never given its one-time
opening figure.

**Fix:** a Store block in `prisma/seed.ts` — each ingredient gets a
`ProductLocation` at the Store (`sellingPrice: null` — a Store is
stocked, not sold-at) and one `opening` movement dated 4 days back, keyed
`seed-sm-store-open-<key>` so a re-seed is a no-op. Figures: Cooking oil
40 litre, Carrots 25 kg, Beans 30 cups. The `at()` wall-clock-Nairobi
helper was lifted from `seedM2Sales` to module scope so both use it.

Two seed judgement calls worth recording:
- **No seeded Rice.** The owner's dev DB already has a Rice created
  through the app (non-seed id); adding `seed-product-rice` put two
  identical "Rice" rows in every Store picker. Dropped, and the stray
  rows from the first run were removed.
- **Soft-deleted products are skipped.** `seed-product-beans` was
  soft-deleted through the Catalog on 2026-08-27. The `upsert`'s
  `update: {}` already declined to resurrect it, but the block would
  still have written a `ProductLocation` + opening row for a product no
  read path returns. Added a `product.deletedAt !== null` guard; the
  stray Beans rows from the first run were removed. (The owner then
  un-archived Beans mid-session and a re-seed gave it its 30 cups — the
  guard is what makes that work: un-archive, re-seed, done.)

**Cause 2 — the additive flows fabricated stock (m2-followups #16).**
`movement-picker-flow.tsx` passed `Math.max(onHand, lineQty, 1)` as an
additive row's `available`, to dodge two `SelectableProductRow`
behaviours at once: the §9.8 over-available BLOCK, and `available === 0
⇒ row inert`. The `, 1` floor meant a true balance of 0 read
**"On hand: 1"** — the same defect that made the inactive-Restaurant bug
present as a screen of fake `1`s.

**Fix (screen-only, kit untouched).** Additive rows now pass the TRUE
`onHand`. An `AdditiveProductRow` wrapper in the screen file handles the
single state the kit gets wrong for an additive flow — on-hand 0 — and
delegates everything else to the kit unchanged: an unselected 0-row reads
an honest "On hand: 0" and stays selectable; a selected one keeps a live
stepper (a sibling `ZeroStockAdditiveStepperRow` mirroring the kit's
ADR-43 / ADR-48 stepper contract), with no ceiling, since adding stock
can never be "over available". Spend flows (Issue / Transfer / Non-sale /
Dispatch) are unchanged — a 0 balance still reads "None on hand" and the
row stays inert, as drawn. The kit `neverBlocks` prop
(m2-followups #1) would delete the wrapper; **not taken** — it needs
owner sign-off and the kit is frozen.

**Also fixed:** the balance read is now folded into the screen's
`loading` / `error`. `useStockLevels.loading` / `.error` were both
ignored, so a slow or failed `GET /api/stock-movements/balances` settled
into a screen of honest-looking zeros instead of skeletons then
`<ErrorState>` — mirrors how `transferLevels` / `canteen` were already
folded in.

**Verified live** (Store Manager on `pnpm dev`, real balances endpoint):
Issue / Receive / Non-Sale now list Cooking oil 40 litre, Carrots 25 kg,
Rice 10 kg; only genuinely-unstocked items read 0. Carrots reads
"On hand: 25 kg" on Receive, not the fabricated 1.

**Gates:** `pnpm test` **597/597** across 73 files · `pnpm typecheck` 0 ·
`pnpm build` clean. New / changed specs:
`tests/screens/store-manager-flows.screen.test.tsx` (+6 — additive
0-readout, additive 0-selectability, production at 0, the spend-flow
inert path, balance loading / error), `tests/screens/admin-ledger-resting-rows.screen.test.tsx`
(+3, new — verified to fail 2/3 against the pre-fix `useLedger`), and
`tests/screens/stock-levels.screen.test.tsx` (migrated to `useStockCard`,
+5 stock-card specs).

**Noted, not fixed:** one flaky failure in `cashier-new-order.screen.test.tsx`
appeared on a single run while a `prisma:seed` was executing concurrently,
and did not reproduce on two subsequent full runs. Consistent with
m2-followups **#17** (the suite runs against the dev DB) — the durable fix
is still a throwaway `test:db`.

**Ledger rows fixed (owner escalation, same session) — m2-followups #19
now DONE.** The owner asked why the seeded opening stock wasn't visible in
the ledger, then sent a screenshot of `/admin/stock` showing **3 rows**. It
was not a seeding gap: the three visible rows were exactly the three
product/location pairs that had **moved that day**. Two distinct defects:

**(a) The Admin ledger dropped every resting product.** `useLedger`
(`app/admin/stock/use-stock.ts`) built its candidate `(product, location)`
pairs from **this day's movements only**, so a product holding stock but
not moving on the selected day never got a `priorClosing` entry and so
never got a row. `deriveLedgerRows` already had a branch written for
exactly this case (`derive-ledger.ts` — surface a pair whose opening is
non-zero even with no movements); it could never fire, because the pair
never arrived. Fix: seed the pairs from the catalogue's `ProductLocation`
set plus the day's movements, skipping soft-deleted products; a pair with
a 0 opening and no movement is still dropped. **3 rows → 15** on the
owner's data — and the hidden stock was not only the Store's: the
Restaurant's Chicken Stew 40 / Samosa 60 and the Canteen's Soda 192 were
equally invisible on any day they didn't move. The screenshot corroborated
the diagnosis: Restaurant Chapati already showed Opening 120.0, so the
carry-forward arithmetic was never broken — only the row set was.

**(b) Mobile Stock Levels had no day framing.** `/store-manager/stock` and
`/canteen/stock` rendered a bare current balance. Now a stock card per row
— **opening → the day's signed movement → closing** — via a new
`useStockCard` hook. Opening is derived, never stored (ADR-11 / ADR-40):
`balances(asOf = previousBusinessDate(date))`. A resting product reads
`Open 40 · — · Close 40`; the headline figure is the day's closing; the
summary strip gained a "Moved" count. Non-stock movement types
(`opening`, `closing`, `purchase_payment`, `stock_count`) are excluded
from the delta, mirroring the Admin grid's `COLUMN_FOR_TYPE` nulls.
Business date via `toBusinessDate` (`Africa/Nairobi`), never server-local.

Neither fix writes rows or changes the ledger model — both derive at read
time, so append-only + "corrections are new rows" stand untouched.
Verified live as Store Manager: Beans `Open 30 · — · Close 30`, Carrots
`Open 25 · — · Close 25`, Cooking oil `Open 40 · — · Close 40`, Rice
`Open 0 · +10 · Close 10`.

**Owner's model confirmed correct.** The owner's premise — "yesterday's
closing should automatically be today's opening" — is exactly how the
system works and always did: on-hand is a running `SUM(quantity)` over the
append-only ledger, so carry-forward needs no daily re-write. Verified by
reading `asOf` 29 Aug → 2 Sep and getting Cooking oil 40 / Carrots 25
unchanged at every step. What was broken was only which *rows* the two
screens chose to render.

**Left on the backlog:** m2-followups #17 (throwaway test DB), #18
(Prisma 7 unescaped LIKE wildcards), and the Admin Locations management
UI (no UI/API toggles `Location.active` — the hole that let the
Restaurant silently go inactive). All need an owner scope decision.

---

## Post-M2 — workflow streamlined + Restaurant re-activated (Tech Lead — 2026-09-02) — DONE

**Owner walkthrough finding.** From the Store Manager account, Issue
Ingredients showed "None on hand" for every ingredient, Record Batch
Production showed a uniform "Available: 1" for every dish, and Transfer
Stock was likewise wrong. **Root cause:** `Location.active` for
`seed-location-restaurant` had been flipped to `false` (2026-09-01
13:22:38) — by a `route.test.ts` run against the dev DB (several specs do
`prisma.location.updateMany({ data: { active: false } })` to win
`resolveRestaurantId`). `GET /api/locations` returns active-only, so the
client couldn't resolve `restaurantLocationId`; the three flows fell back
to `0` / the additive `Math.max(onHand, lineQty, 1)` floor. The domain
read (`getDerivedStockBalances`) and the balances route were verified
correct (SM reading the Restaurant returns Chapati 120, etc.). **Fix:**
`UPDATE "Location" SET active = true WHERE id = 'seed-location-restaurant'`
(a re-seed also heals it). No code change — the client-side hardening
(fold the balance hooks' `loading`/`error` in; don't fabricate
"Available: 1" when the balance location fails to resolve) is noted in
`m2-followups.md` as optional.

**Recurrence found + root-caused (same session).** After the workflow
teardown's `pnpm test` run, the Restaurant was `active: false` again. Real
cause: **Prisma 7 + `@prisma/adapter-pg` does not escape `_` / `%` in
`startsWith`/`contains`/`endsWith`** — `orders/route.test.ts`'s
`updateMany({ where: { …, name: { startsWith: "__" } }, data: { active:
false } })` compiled to `LIKE '__%'` and matched `seed-location-restaurant`
on every full-suite run. **Fixed** (`app/api/orders/route.test.ts`): select
the *other* active restaurants by id (no name wildcard), deactivate those,
restore them in `afterAll`. Full suite now leaves all three seed locations
`active: true`. The unescaped-wildcard behaviour also affects the
catalog/customers/assets `{ contains: search }` filters — logged as
`m2-followups.md` #18, low severity, not fixed. Isolating `test:db` onto a
throwaway DB (#17) is still the durable fix.

**Workflow change (owner directive).** The per-feature ceremony —
mandatory Design Sprint in Paper, per-feature kit extension, Storybook
story-per-state with `test:visual` + `test:a11y` + §9 `postVisit` gates
(ADR-42), and a standalone QA Sprint — was removed as disproportionate to
the change sizes this project ships. New loop: **backend → frontend
(compose from the frozen kit, follow sibling-screen patterns) → in-session
check.** Paper design happens only when the owner explicitly hands over a
mock to copy. Applied:
- `docs/sdlc.md` — Phase 2 marked done-once; Phase 3 rewritten to
  Backend → Frontend → Check; Phase 1 Session 3 mandate struck.
- `docs/design/export-workflow.md` — rewritten as a compose-from-kit
  reference (was "Binding" Paper→code pipeline).
- `CLAUDE.md` — "How sessions work" + reading list + "Where to look"
  table updated.
- `docs/CONVENTIONS.md §4/§6`, `docs/TEST_PLAN.md §2a/§2b`,
  `docs/design/design-principles.md §9`, `DECISIONS.md` ADR-42
  (superseded banner), `kit-audit.md` + `component-states.md` (historical
  banners).
- **Deleted:** `.storybook/`, all 40 `*.stories.tsx`,
  `tests/visual/__screenshots__/` (168 baselines), the `storybook` /
  `build-storybook` / `test:visual` / `test:a11y` scripts, and the
  `@storybook/*` + `axe-playwright` + `jest-image-snapshot` deps.
- **Gate after teardown:** `pnpm typecheck` 0 · `pnpm test:unit`
  258/258 green.

**First feature under the new workflow — Catalog location column + filter
— DONE (owner walkthrough owed).** Backend: `listProducts` gains a
`locationId` filter (active `ProductLocation` only — assignment, not
stock-on-hand); `GET /api/products?locationId=` forwards it; empty string
treated as absent. Frontend: a "Locations" column (neutral chips) in the
desktop table + mobile card, and a "Filter by location" `<Select>` in the
toolbar ("All locations" default); the filtered EmptyState clears search +
location together. Composed from the frozen kit against the existing
catalog structure — no design step. Tests: `list-products.test.ts` (5
cases) + 2 new `catalog.screen.test.tsx` cases. Gate: `pnpm typecheck` 0 ·
`pnpm test` 583/583 · `pnpm build` clean. Branch
`chore/streamline-workflow-catalog-locations` (workflow change + feature,
two commits — not merged; hand back for the walkthrough).

---

## Milestone 2 — Staff can sell, every day

**Plan:** `docs/sprints/milestone-2-plan.md`.
**Status: DONE — landed on `main` 2026-09-01** as one `--no-ff` merge
(`integration/m2-submission-1` → `main`, M2 Submission 1 = M1 + M2).
All sessions done: 1a, 1b, 2, 3, 4, 5, 6a–6e, 7, plus the Submission-1
fidelity pass (3-DOMAIN, 3-KIT, 3-KIT-FILTER, 3-DESIGN, 3-DESIGN-FILTERS,
3a, 3b, 3c, 3d, 3e, opening-stock-mobile) and FINAL. Gate at landing:
`pnpm test` 556/556 (69 files), `tsc` 0, `build` clean (41 routes).
Deferrals recorded in `docs/sprints/m2-followups.md`.

### 2026-09-01 — QA fix: SM↔Canteen transfer scoping + Canteen receive-transfer flow (Developer — branch `qa/sm-canteen-routine`) — DONE (owner walkthrough owed)

Owner walked the SM → Canteen routine and hit a chain of transfer bugs.
Two commits on `qa/sm-canteen-routine` (not merged — hand back for the
walkthrough):

- **§0 (commit 1) — transfer scoping.** `GET …/balances` lets a
  `store_manager` read a `type:"restaurant"` balance; `POST
  …/transfers/batch` own-location guard carves out the SM dispatching
  from the Restaurant; `listMovements` returns pending inbound `-q`
  transfer rows addressed to a location-bound actor (so
  `deriveIncomingTransfers` can render the banner); production readout
  prefix `"In Rest.:"` → `"Available:"`.
- **§1 (commit 2) — Canteen "Review & Receive".** New route
  `/canteen/transfer/receive` (+ `receive-transfer-flow.tsx`), composed
  from the SM movement-picker kit (`FlowScaffold` + `SelectableProductRow`
  + sticky submit). The Canteen hub banner is now one **"N items incoming
  — Review & Receive"** prompt (`InstructionalBanner` + `Button`, not the
  kit `TransferBanner` — its hard-wired "Flag Variance" button can't be
  hidden without a kit change) that **navigates** to the screen instead
  of a one-tap inline accept. The screen lists every pending inbound line
  with a stepper pre-filled to the dispatched qty; adjust + one **Receive**
  → `POST …/:id/accept` per line (`{ receivedQuantity }` only for changed
  lines; per-line loop via `stockApi.acceptTransferBatch`, noted as
  non-atomic).
  - **"Flagged banner, no buttons" diagnosis: real bug, not stale data.**
    `transferDispatchLineCore` always writes `note: "Transfer dispatched
    — awaiting receipt"` on phase-1 rows, and `deriveIncomingTransfers`
    set `flagged = note != ""` → *every* incoming transfer rendered
    flagged. Fixed: `flagged` now matches the real flag-note prefix
    (`"Discrepancy flagged:"`) that `flagTransfer` writes. No bad DB rows
    to reset — the note is written by design, not by a stray flag press.
  - **Variance accounting: option (b).** `acceptTransfer` gained an
    optional `receivedQuantity`; the `+q` lands at the received amount
    with a `"Received N, dispatched M"` note. No second correction row —
    the source ledger already dropped by the full dispatched amount at
    phase 1, so a shortfall is just stock lost in transit and each
    location's derived balance stays correct. `deriveIncomingTransfers`
    keys "accepted" off `correctsMovementId`, not quantity equality, so a
    variance `+q` clears the pending banner. `flagTransfer` domain fn +
    the route's `{ flag, note }` branch left in place (unused by the UI).
- **Changed from the two-phase design:** no admin-flag path for the
  Canteen receive routine — a variance is a note on the `+q` row, no
  escalation.
- **In-scope regression fix.** §0 had made the *whole* SM Transfer flow
  Restaurant-sourced, which zeroed every soda/goods row (goods live at
  the Store, not the Restaurant — matches the approved flow doc §D).
  Reverted to **multi-source**: `useTransferSourceLevels` reads both
  balances and tags each product by kind (dish → Restaurant, else →
  Store); the row `available` and the phase-1 dispatch resolve per
  product; submit fires one `transferBatch` per source. Badge: "Store /
  Restaurant → {dest}".
- **Console-noise fix.** `useCanteenProducts()` fired
  `GET /api/canteen/products` (admin + canteen_attendant only) on *every*
  `MovementPickerFlow` mode → a harmless `403` on every SM stock screen.
  Now gated to `dispatch` mode via a `useCanteenProducts(enabled)` param.
- **Also on this branch:** a vitest test-split (`vitest.shared.ts` +
  `test:unit` / `test:db` lanes) authored by a concurrent session —
  bundled in via a `git stash` (recovered), tsc error in
  `vitest.shared.ts` fixed (`UserConfig` → `ViteUserConfig`), kept as its
  own commit.
- **Gate:** `pnpm tsc --noEmit` 0 · `pnpm test` 576/576 (71 files) ·
  `pnpm build` clean (`/canteen/transfer/receive` registered).
  New tests: `transfer.test.ts` (+2, receivedQuantity variance + plain),
  `app/api/stock-movements/[id]/accept/route.test.ts` (new, 4),
  `canteen-receive-transfer.screen.test.tsx` (new, 5),
  `canteen-hub.screen.test.tsx` (banner navigates, not inline accept),
  `store-manager-hub.screen.test.tsx` (flag fixture → real flag note),
  `store-manager-flows.screen.test.tsx` (multi-source split).

### 2026-09-01 — M2 Submission 1 landed on `main` (Tech Lead — Session FINAL) — DONE

`integration/m2-submission-1` (the orchestrator's green superset of the
10 fidelity-pass branches + S7) landed on `main` as **one `--no-ff`
merge** — mirroring how M1 landed. No feature branch was re-merged.

- **Gate on `main` after the merge:** `pnpm test` 556/556 (69 files),
  `pnpm tsc --noEmit` 0, `pnpm build` clean — 41 routes (`/admin/sales`
  present; `/admin/orders` + `/admin/canteen/derived-sales` → 308
  redirects; 5 `…/batch` stock-movement routes; `/api/canteen/stock-counts/preview`).
- **Dead staff hamburger removed** (`components/shells/staff-shell.tsx`).
  No staff caller ever wired `onMenuClick` / a drawer — the button did
  nothing on tap. Header is now the location/role label + avatar;
  sign-out stays on the avatar. Owner-approved.
- **Seed fixes** (`prisma/seed.ts`): `Location.name` re-asserted on the
  upsert `update` (an early row stored the id string in `name`, which
  rendered raw on `/admin/stock`); `makeOrder` re-dates an existing
  order + its stock/money/debt rows on re-seed so the Admin Sales
  "Today" default and the same-day edit gate keep working on any later
  `pnpm dev` day.
- **ADR-49** added (`docs/DECISIONS.md`): the three carried fidelity-pass
  decisions — ADR-44 partial reversal (multi-row picker restored),
  `editOwnOrder` audit-prune rationale + the inverse ADR-25 gap-close,
  and the additive `Select` / `DatePicker` `aria-label` prop.
- **Docs reconciled:** `milestone-2-plan.md` §7 table re-baselined + §10
  changelog line; `ROADMAP.md` M2 → DONE; `API.md` `recordPurchasePayment`
  MoneyMovement line corrected; this log's M2 status → DONE.
- **Follow-ups** recorded in `docs/sprints/m2-followups.md` (nothing
  fixed there — KIT `neverBlocks` mode, `DatePicker` quick-rows,
  `Drawer variant="sheet"`, A2 Assets artboard CATEGORY strip,
  `/api/canteen/products` route-purity, F7-7 hub subtitle fields, +
  the 3c/3d QA deltas).
- **Branch cleanup:** the 13 merged feature/integration/QA branches
  deleted (local + origin where pushed); only `main` remains.

**Milestone 2 code + docs are done and on `main` (pushed 2026-09-01).**
The one remaining gate is the **owner walkthrough pass** (plan guardrail
3) — the owner walks M1 + M2 end-to-end as every role using
`docs/sprints/m1-m2-walkthrough-guide.md`. Any failure lands as a small
fix + regression test this cycle, or a `m2-followups.md` entry. Once the
walkthroughs sign off, M2 Submission 1 is fully done and M3 starts from a
fresh milestone-plan doc.

### 2026-08-31 — M2 Session 7: QA Sprint — adversarial pass + fixes (QA Engineer) — DONE

First adversarial QA pass on Milestone 2. Full findings +
attack-list dispositions: `docs/sprints/milestone-2-session-7-qa-report.md`.

- **Attack list (plan §7) — all targets PASS.** Money-ledger integrity,
  order-correction idempotency across a chain (incl. correcting the same
  original twice and correcting a credit order), credit-balance
  derivation + flagged overpayment, canteen derived-sales math across a
  period boundary (transfers-in + production + non-sale consumption),
  cross-cashier isolation (domain + route), Africa/Nairobi edit-window
  boundary, audit coverage, route-handler purity, and the standard error
  shape / §3.8 rejection — each verified with a new adversarial test.
  **No High-severity data-integrity defect.**
- **11 findings — 0 High / 4 Medium / 6 Low** + the C4-corrected-banner
  data gap, all in the Session 6 **screen** layer (the domain holds).
- **Fixed this session:** F7-2 (K1 sold/revenue preview built for real —
  `lib/domain/sales/derive-stock-count.ts` shared calc +
  `GET /api/canteen/stock-counts/preview`); F7-1 (C4 credit↔cash edit
  path); F7-3 ("Today's stock counts" + delete on the Canteen hub via
  `voidStockCount`); F7-5 / F7-6 (A3 correction banner labels + subtitle);
  F7-10 (ADR-25 audit-prune note); the C4 corrected-banner data gap
  (`OrderView.correctedAt` / `correctedByName`).
- **Deferred to follow-ups:** F7-4 (A3 correction form is quantity-only),
  F7-7 / F7-8 / F7-9 (K2 hub revenue, A3 filter Staff list,
  `/api/canteen/products` route-purity).
- **Tests:** `qa-m2-session-7.test.ts` (11 adversarial),
  `preview-stock-count.test.ts` (5), `…/preview/route.test.ts` (6), plus
  regressions in the four touched screen suites. Gate at report time:
  `pnpm test` 450/450, `tsc` 0, `build` clean.

### 2026-09-01 — M2 Session 3a: Admin merged "Sales" screen + F7-4 + F7-8 (Developer) — DONE

Post-QA batch-3 session (orchestrator-tracked, `feat/m2-3a-sales` off
`qa/m2-session-7`). Merged the Admin's two separate screens —
`/admin/orders` (A3) and `/admin/canteen/derived-sales` (A4) — into one
tabbed **`/admin/sales`** screen.

- **Route + nav.** New `app/admin/sales/` — `page.tsx` (server, resolves
  `?tab=`) + `sales-client.tsx` (kit `<Tabs>` underline; deep-link via
  `router.replace`; initial tab from `?tab=derived`). `orders-tab.tsx`
  (A3 content) + `derived-tab.tsx` (A4 content). Old route dirs deleted;
  `next.config.ts` `redirects()` 308s `/admin/orders` → `/admin/sales`
  and `/admin/canteen/derived-sales` → `/admin/sales?tab=derived`. The
  separate "Derived sales" nav link removed from `admin-shell.tsx` +
  `mobile-nav-drawer.tsx`; one "Sales" → `/admin/sales`.
- **Filter toolbar** (`filter-toolbar.tsx`, screen-level, Paper `IEA-0`).
  Composed from proven primitives (kit `<Select>` in a labelled `role=
  group` wrapper, a native `<input type=date>` popover, a native
  checkbox). Orders tab: Cashier · Date · Payment · Corrected-only.
  Derived tab: Product · Date. Right-aligned result count + a **Reset**
  link shown only when a control is off its default. Value display
  load-bearing (default = `--text-secondary`/regular; off-default =
  `--text-primary`/medium). Mobile: controls scroll horizontally, count
  + Reset drop to their own row. **Session 3e** retrofits this onto the
  shared `FilterToolbar` kit component (now on a separate branch).
- **F7-8 — Cashier / Payment pickers wired.** Payment → sets
  `filter.paymentMethod`, re-queries. **Cashier list source decision:**
  no `/api/staff` in M2, so the Cashier options are **derived from the
  loaded orders** (distinct `cashierId` + `cashierName`, kept in a
  sticky map so a narrowed result set doesn't drop the active option) —
  zero new API, per the orchestrator's pre-approved choice.
- **F7-4 — full corrected-order form** (`correction-form.tsx`). The
  Admin now restates the whole order: line list with `QuantityStepper`
  + remove + a searchable **add-product** row (kit `<Select searchable>`
  over the Restaurant menu via `useRestaurantProducts`), order-type +
  payment-method `<SegmentedControl>`s, a delivery-fee `<TextInput>`
  (Delivery only), a customer-attach `<Select searchable>` when payment
  = Credit (submit blocked until a customer is attached, parity with
  C3), required Reason `<Textarea>`. `CalculatedImpactBanner` recomputed
  against the exact request inputs; credit deltas labelled **"Customer
  debt"** (extends the F7-5 fix); payment-method changes show both the
  reversed original channel and the new one. Wired to `correctOrder`
  via the shared `use-orders` hook. The domain `validateOrder` stays
  the gate (delivery-fee-only-on-delivery, credit⇒customerId, §3.8 stock
  BLOCK); server errors surface inline.
- **Gate.** `tests/screens/admin-sales.screen.test.tsx` (22 tests) —
  folds in the old `admin-orders` + `canteen-derived-sales` specs and
  adds tab switch + deep-link, the working Payment/Cashier/Product
  filters, F7-4 (credit→cash saves + banner says "Customer debt";
  credit-no-customer disables submit; add-a-line), no-margin assertions.
  Old two specs deleted. `pnpm test` **460/460**, `pnpm tsc --noEmit`
  **0**, `pnpm build` clean (`/admin/sales` registers; old routes 308).
  `grep TODO(mock) app/admin/sales` clean.
- **Screenshot-diff deltas logged for QA:**
  1. **Correction form vs `G4I-0`** — the artboard still draws the
     pre-3a quantity-only drawer; 3a builds the fuller F7-4 form the
     flow docs specify (`customers-credit-flow.md` §G step 3 /
     `restaurant-sales-flow.md` §E). Expected per the 3a brief §3.4.
  2. **Linked correction row-group tint (`GCP-0`)** — the correction
     row's `bg-(--surface-subtle)` + left accent bar is **not** applied;
     `SimpleTable` has no per-row style hook and the kit is frozen this
     session. The "Corrected" / "Correction of #N" status text still
     ties the pair. (This tint was dead code in the shipped A3 too — the
     const was defined but never passed.)
  3. **Mobile toolbar** — the controls **wrap onto rows** rather than
     collapsing secondary ones into a **"More"** chip (`IJ1-0`).
     Functionally equivalent; all controls reachable. (Was briefly
     `overflow-x-auto`, which clipped the dropdown popovers — fixed to
     `flex-wrap` in the follow-up below.)
  4. **Date control** — **resolved in the follow-up below.** Now a quick-
     rows panel (Today / Yesterday / All dates) + the proven kit
     `<DatePicker>` calendar for any other day.
  5. **Linked row-group tint on mobile** — the mobile Orders card list
     *does* tint the correction card (`bg-(--surface-subtle)`); only the
     desktop `SimpleTable` can't (delta 2).

**Follow-up fixes (2026-09-01, same session, after owner spotted issues
on `pnpm dev` mobile):**
- **Canteen Derived tab had no mobile layout** — it was the desktop
  `<SimpleTable>` (5 cols) crushed into 440px, text overlapping. Added
  the `hidden md:block` table / `flex md:hidden` **stacked-card list**
  per artboard `ILC-0` (name + KES on one row; "Last counted …" /
  "Covers … · N sold" sub-lines; `—` for never-counted). Did the same
  for the Restaurant Orders tab per `IJ1-0` (time + "cashier · type ·
  payment" left; total + status right; correction card tinted).
- **Filter dropdowns unreachable on mobile** — the toolbar row had
  `overflow-x-auto`, which (CSS: one axis non-visible ⇒ the other
  becomes `auto`) clipped the `Select` / date popovers that open
  downward. Changed to `flex-wrap` (the `[M2-SA]` mobile artboards show
  ≤4 chips, they wrap cleanly). Verified: dropdowns now open fully.
- **Restaurant Orders looked "broken" (0 orders)** — not a wiring bug
  (the `/api/orders` filter params work; verified `?paymentMethod=mpesa`
  returns only mpesa rows). The tab defaults to a **`date=today`** filter
  (flow doc §G) and the dev seed's orders are all dated Aug 27–30 vs a
  Sep 1 "today", so everything is filtered out. Made that empty state
  actionable: **"No orders today"** + a **"Show all dates"** button
  (sets `date=null` → omits the param → all orders). The date chip now
  reads **"All dates"** (bold, off-default) in that mode, with a
  visible result count + Reset. Reworked the `DateControl` model so
  `today` / `null` (all dates) / a specific day are all distinct. **The
  stale seed itself is a `prisma/seed.ts` concern for another session**
  — some orders should be dated relative-to-today.
- **Date control refined (2026-09-01, owner-directed).** The old chip
  opened a popover holding a raw browser `<input type="date">` — its
  month-navigation arrows fired `onChange` (jumping to the 1st) and my
  handler closed the popover on every `onChange`, so you could never
  page months to reach an earlier day. Replaced with: a chip that opens
  a small panel of **quick rows — Today / Yesterday / All dates** (one
  tap, covers the common cases), then **"OR PICK A DAY" → the proven kit
  `<DatePicker>`** calendar for anything else. The kit calendar's `‹ ›`
  month paging only calls its internal `setView` — it never commits or
  closes; only clicking a day does. Today ringed, future days disabled
  (`maxDate`), arrow-key nav — all from the kit. Screen-level composition
  only, **no kit change**. New spec case: quick rows re-query + paging
  the calendar month does not dismiss. This is a UX refinement to an
  approved screen taken as owner direction — **flag for the designer /
  3e to ratify** the quick-rows + calendar pattern for the shared
  `<FilterToolbar>`. (A first draft of the `component-states.md` matrix
  row for this was started but belongs to the designer.)

- **Out of scope but flagged for the orchestrator:** `/admin/stock/opening`
  (the bulk opening-stock grid) has **no mobile layout** — the owner hit
  it during the walkthrough. Not a 3a file (brief §5 forbids touching
  Ledger/Stock screens); needs its own session.

- **Owner walkthrough:** owed (Admin).

### 2026-08-30 — M2 Session 6e: Gap-Fix Sprint — Domain & API Hydration (Developer) — DONE

Development Sprint (Gap-Fixes before QA). Resolved all 4 domain/API gaps (G1–G4) identified during design review:

- **G1 — Cashier Name Hydration.**
  - Added `cashierName: string` to `OrderView` in `lib/domain/sales/types.ts`.
  - Updated Prisma queries in `createOrder`, `editOwnOrder`, `correctOrder`, and `listOrders` to include `cashier: { select: { name: true } }`.
  - Updated `toOrderView` in `internal.ts` to map `cashier.name`.
  - Updated `app/admin/orders/admin-orders-client.tsx` to render `order.cashierName` in the table.
- **G2 — Product Name Hydration.**
  - Added `productName: string` to `OrderLineView` in `lib/domain/sales/types.ts`.
  - Updated Prisma queries to include `lines: { include: { product: { select: { name: true } } } }`.
  - Updated `toOrderLineView` in `internal.ts` to map `product.name`.
  - Updated `app/admin/orders/admin-orders-client.tsx` (detail and correction drawers) and `app/cashier/orders/[id]/order-detail-client.tsx` to render `productName` instead of raw UUIDs.
- **G3 — Dedicated Canteen Products API.**
  - Created `app/api/canteen/products/route.ts` with role-scoped fetching for `canteen_attendant` (assigned location) and `admin`.
  - Added route unit tests in `app/api/canteen/products/route.test.ts` (5 tests).
  - Updated `app/canteen/stock-count/stock-count-client.tsx` to directly consume `/api/canteen/products`.
- **G4 — Same-Day Count Detection & stockCountId.**
  - Added `stockCountId: string | null` to `DerivedSaleView` in `lib/domain/sales/types.ts` and mapped `latest.id` in `lib/domain/sales/derived-sales.ts`.
  - Enables K1 / Canteen Hub to identify today's count ID for same-day void and re-counting.
- **Verification & Gates.**
  - `pnpm tsc --noEmit` — 0 errors.
  - `pnpm build` — Clean production build of all 41 routes.
  - `pnpm test` — **416/416 tests passing across all 64 test files.**

Development Sprint (frontend assembly + final M2 gates). Complete frontend coverage for Admin Orders (A3), Canteen Derived Sales (A4), Canteen Mobile Stock Count (K1), and Canteen Mobile Operations Hub timeline extensions (K2).

- **Hooks.**
  - `app/canteen/use-stock-count.ts` — typed `StockCountRequestError`, `request<T>`, domain-typed hooks for `useStockCountActions` (`recordStockCount`, `voidStockCount`) and `useDerivedSales({ productId, date })`.
- **A3 Admin Orders** (`app/admin/orders/page.tsx` → `admin-orders-client.tsx`).
  - SimpleTable listing all orders (Time · Cashier · Type · Total · Payment · Status).
  - Filter chips row matching Paper FA1-0 (active dismissible chips + inactive picker chips + order counter + "Clear all").
  - Detail drawer (read-only breakdown of order lines and totals).
  - Correction drawer with `QuantityStepper` per line, `CalculatedImpactBanner` (live money/stock delta preview), and required Reason `Textarea`.
  - Linked correction pair handling (`bg-(--surface-subtle)` styling and "Correction of #N" status).
  - G6: disabled double correction with clear affordance.
  - Zero delete buttons (§3.3), zero cost/margin columns (§3.6).
- **A4 Admin Canteen Derived Sales** (`app/admin/canteen/derived-sales/page.tsx` → `derived-sales-client.tsx`).
  - Read-only table of per-product sales derived from stock counts (Product · Last counted · Period covered · Units sold · Revenue).
  - G5: functional Product select dropdown and Date filter pickers.
  - Formatted currency (KES) and relative time labels ("today", "1 day ago").
- **K1 Canteen Mobile Stock Count** (`app/canteen/stock-count/page.tsx` → `stock-count-client.tsx`).
  - Two sub-screens in one component: product picker (search + category tabs + select) → counting screen (selected product + `QuantityStepper` + `CalculatedImpactBanner` impact preview).
  - G3 stopgap: canteen products filtered from `/api/products` by active canteen `ProductLocation`.
  - Sticky bottom "Confirm count" button triggering `recordStockCount`.
- **K2 Canteen Operations Hub Extension** (`app/canteen/hub-client.tsx` & `app/store-manager/staff-stock-format.ts`).
  - Resolved `TODO(mock)` on Stock Count action tile to point to `/canteen/stock-count`.
  - G7: `movementsToTimeline` recognizes `movementType === "sale"` with `stockCountId` as "Stock count" timeline entries with accurate quantities and timestamps.
- **Navigation Wiring.**
  - Connected `/admin/orders` ("Sales") and `/admin/canteen/derived-sales` ("Derived sales") in both desktop `admin-shell.tsx` and `mobile-nav-drawer.tsx`.
- **Full Database Seed.**
  - `prisma/seed.ts` expanded with Canteen products (`Mandazi`, `Groundnuts 50g`, `Soda 300ml`, `Water 500ml`), initial stock movements, and Stock Counts producing derived sales and revenue matching Paper GL2-0 walkthroughs.
- **Screen Tests.**
  - `tests/screens/admin-orders.screen.test.tsx` (6 tests).
  - `tests/screens/canteen-derived-sales.screen.test.tsx` (4 tests).
  - `tests/screens/canteen-stock-count.screen.test.tsx` (3 tests).
  - `tests/screens/canteen-hub.screen.test.tsx` (expanded to 7 tests).
  - **All 17 screen test suites passing (127/127 tests).**
- **Gates.**
  - `pnpm tsc --noEmit` — 0 errors.
  - `pnpm build` — Clean production build of all 40 routes.
  - `pnpm test` — **411/411 unit, integration, and screen tests passing across all 63 test files.**

### 2026-08-30 — M2 Session 6c: Restaurant Orders C1–C5 (Developer) — DONE (owner walkthrough owed)

Development Sprint (frontend assembly). The Cashier can take a Restaurant
order end to end on real data. No schema. Small hook additions:
`useCustomers.createCustomer` now returns the created customer (C5
quick-create attach). **Two kit changes were approved mid-session by the
owner** (both defects vs the kit's own artboards, not new design
decisions) — see the "6c follow-up" block below.

- **Hooks.**
  - `app/cashier/use-orders.ts` — mirrors `use-catalog.ts` /
    `use-customers.ts` (typed `OrdersRequestError`, `request<T>`,
    domain-typed shapes). `useOrders({ date })` list (the API role-scopes
    to the caller; `date: "today"` resolved against Africa/Nairobi
    client-side), `createOrder`, `editOwnOrder`, `correctOrder`
    (exposed for A3's reuse in 6d — Admin-only at the API). `useOrder(id)`
    for C4 — finds the row in the caller's list (M2 has no `GET
    /api/orders/:id`), plus the linked `correction` row if visible.
    `isSameBusinessDay` / `nairobiBusinessDate` helpers.
  - `app/cashier/use-restaurant-products.ts` — `GET /api/products`
    filtered to products with an active, priced Restaurant
    `ProductLocation` (the Restaurant `locationId` comes from the
    payload's `locationType`, so the Cashier needs no `/api/locations`
    access), joined with `GET /api/stock-movements/balances` for the
    tile stock-available count + the §3.8 block.
- **C1 Cashier Today** (`app/cashier/page.tsx` → `cashier-today-client.tsx`).
  Own orders for today, newest first; day running total; "Day open" pill
  (M2 has no Day Close — `isPastDay` is a permanently-false hook and the
  `C0Z-0` day-closed banner stays behind it). `CORRECTED` / `Correction`
  chip derived from whether another visible row's `correctsOrderId` points
  at this one. States: populated / empty / loading / error. Sticky "New
  order" (the `flow-scaffold.tsx` `sticky bottom-0` pattern — the staff
  shell's `stickyActionBar` slot isn't wired for hub routes).
- **C2 New Order build** (`app/cashier/orders/new/*`). `SearchInput` +
  kit `Tabs` (underline) `category` row ("All" + one per distinct
  `Product.category`; `null` → "Uncategorised") + a 2-col product-tile
  grid (tap to add / +1, qty badge) + a pinned order-line panel
  (`QuantityStepper` per row) + a sticky total bar. §3.8: a line whose
  qty exceeds the derived Restaurant balance renders the §9.8 error
  pattern on the row and disables "Review order" with a danger caption —
  the server is still the gate. States: populated / empty (no sellable
  products) / loading / error / line-blocked.
- **C3 Checkout** — a `BottomSheet` over C2. Order-type + payment
  `SegmentedControl`s; the delivery-fee `TextInput` appears only for
  Delivery and is dropped on switch-back; **`account` is omitted** (the
  domain derives cash→cash / mpesa→mpesa_bank). Credit reveals the
  customer-attach block and **Confirm stays disabled until a customer is
  attached** (plan §3.2). On confirm → `createOrder` → toast → back to C1.
- **C4 Order detail / edit** (`app/cashier/orders/[id]/*`). The server
  page resolves `currentUserId` + today's business date so the client
  needs no session hook. Editable iff own **and** same Africa/Nairobi
  business day (`editOwnOrder` / PATCH) — reuses the C2 line rows + C3
  controls, "Save changes", same §3.8 block. Otherwise **read-only**: a
  static list + a warning banner + "Correct this (Admin)" which does
  **not** open a form (ADR-15) — it fires a toast surfacing the order
  **number** for the Cashier to give the Admin (flow doc walkthrough F).
  A corrected order shows a `CORRECTED` banner + "View correction entry —
  order #N" linking the correction row; no Correct button.
- **C5 Customer attach / quick-create** — a `BottomSheet` over C3, reusing
  `useCustomers` (search + `createCustomer`). Search results / no-match
  quick-create (name prefilled from the search text until edited) / phone
  validation error / an explicit "Add new customer" row.
- **Spec** `tests/screens/cashier-orders.screen.test.tsx` — 28 tests.
  Per screen: populated / empty / error / loading + the primary
  interaction. Contracts proven: credit → Confirm disabled until a
  customer is attached; §3.8 line block disables Review; C4 same-day →
  editable form, past-day / not-own → read-only + no edit + Admin path;
  **no margin / cost / profit value or "buying price" string anywhere in
  C1–C4**. `SegmentedControl` renders `role="radio"` (not tab);
  `BottomSheet` renders `role="dialog"`.
- **Seed** — `prisma/seed.ts` gained a `seedM2Sales()` block (idempotent
  by fixed `seed-*` ids): the Restaurant menu now carries `category` +
  `production` stock so C2 tiles aren't all §3.8-blocked; a **second
  cashier** ("Cashier Two" / PIN 1234); 4 customers (Grace owes 220 net
  after a 200 cash repayment, John owes 100 net after a 500 mpesa_bank
  repayment **with a note**, Mary owes 400, Peter clear); ~8 orders
  across the two cashiers — cash / M-Pesa / credit / dine-in / takeaway /
  delivery+fee, two dated **yesterday**, one **corrected** (original +
  linked correction row). Enables both the owed 6b Customers walkthrough
  and the 6c Cashier walkthrough on `pnpm dev`. The **full** M2 seed
  (canteen counts, more breadth) stays a 6d task.
- **Flow-doc-vs-behaviour deltas for QA (Session 7):**
  - C4 "corrected" banner omits the correcting Admin's **name** and shows
    only the correction's date + number — `OrderView` carries neither a
    `correctedByName` nor a `correctedAt`; `D18-0` shows "by Edwin K.
    (Admin)". Data gap, not a bug.
  - "Correct this (Admin)" on C4 fires a **toast** with the order number
    rather than a modal/alert; the flow doc only says it "surfaces the
    order reference … does not open a form".
  - C2/C4 line-row `QuantityStepper` uses the **kit** control size, not
    the artboard's fixed 30px cells (owner ruling 6a — kit wins on
    sizing).
- **Gates (as of the 6c screen work):** `pnpm tsc --noEmit` 0;
  `pnpm build` clean (new routes `/cashier`, `/cashier/orders/new`,
  `/cashier/orders/[id]` registered); **`pnpm test` 396/396**;
  `grep TODO(mock) app/cashier` clean.
- **Owner walkthrough:** _PENDING — owner drives the Cashier order flow
  on `pnpm dev` (cash, M-Pesa, credit-with-new-customer, edit a same-day
  order, view a past-day order), plus the still-owed 6b Customers walk
  (C6 as Cashier, A1/A2 as Admin). Seed data is in place._

#### 6c follow-up (owner-driven review on `pnpm dev`, same day)

The owner walked C1–C6 on `pnpm dev` and found four issues; all fixed
this session:

1. **Runtime — `POST /api/orders` failed "No active Restaurant location
   is configured."** The seeded `Restaurant` `Location` row had
   `active: false` (flipped by an earlier test run against the dev DB;
   the seed's `update: {}` never healed it). `resolveRestaurantId`
   requires an **active** restaurant. Fix: the seed's three
   `location.upsert` calls now `update: { active: true }` (self-healing).
   Dev DB re-seeded.
2. **Kit `BottomSheet` — open-state `children` rendered edge-to-edge.**
   Only the (now-removed) h1 title bar was padded; C3 checkout, C5
   attach and the 6a C6 repayment sheet all had text running to the
   screen edge. **Kit fix (owner-approved):** the open-state content is
   wrapped in a padded (`px-(--sp-6) pt-(--sp-5) pb-(--sp-8)`),
   `overflow-y-auto` scroll region; the panel is capped `max-h-[90dvh]`
   so tall sheets scroll internally. Consumers pass bare content now.
   Matches artboards `6ZJ-0` / `DLP-0` / `DDD-0`. Story `visual: {
   disable: true }` → no baseline to re-key.
3. **Kit `TextInput` — no in-field currency marker.** `DDD-0` (repayment
   Amount) and `DRN-0` (C3 delivery fee) show a "KES" marker *inside* the
   box. **Kit fix (owner-approved):** new optional `startAdornment`
   prop — a node rendered before the input, `aria-hidden`,
   `--text-tertiary`, not focusable; a string is `--font-mono` and
   mono-izes the input. Off ⇒ byte-identical. Applied to the C6 Amount
   field (label → "Amount", `startAdornment="KES"`) and both C3 + C4
   delivery-fee fields (label → "Delivery fee"). New story `StartAdornment`.
   ⚠️ **Owed:** the visual baseline `kit-textinput--start-adornment.png`
   has NOT been generated — the Playwright story runner
   (`pnpm test:visual` / `test:a11y`, Storybook on :6006) needs to run
   once and `-u` to write it, then eyeball + commit. `tsc` + the jsdom
   screen specs are green.
4. **C6 repayment sheet — fidelity gaps vs `DDD-0`:** (a) dropped the
   "Record repayment" h1 sheet title — `BottomSheet` now takes an
   `ariaLabel` prop so a titleless sheet is still named; the in-body
   name + balance IS the header. (b) balance line now whole-KES
   ("Owes KES 1,200", not "…220.00") via `balanceLabel(balance, true)` —
   the A1/A2 rail-drawer "Current balance" row keeps 2dp. (c) fields +
   the C6 button are now full-width (kit `FormField` hard-codes
   `w-[280px]`; overridden locally with `[&_.kit-field]:w-full` in
   `RepaymentForm` and `[&>button]:w-full` in C6's `renderFooter`).
   A1/A2 footer (Cancel + primary row) unchanged.

Docs updated for the kit changes: `component-states.md` §C3 / §C19,
`kit-audit.md` (TextInput / BottomSheet rows).

**Full-suite re-run after the follow-up: `pnpm test` 396/396, `tsc` 0.**

### 2026-08-30 — M2 Session 6b: responsive Admin shell + nav wiring + SimpleTable rowChevron + Catalog category (Developer) — DONE

Development Sprint (frontend assembly). Closes the five 6a-flagged frontend
gaps + the one approved kit change. No schema, no `lib/domain`.

- **6b.1 — Admin shell responsive.** _(first attempt merged the mobile
  chrome into `admin-shell.tsx`; that entangled the desktop flex-row and
  mobile fixed-height-column box models and shipped two bugs — see the
  fix commit `921fe6d` below.)_ **Final:** `admin-shell.tsx` stays
  **desktop-only**; `app/admin/admin-shell-client.tsx` renders **both**
  proven shells and toggles with `hidden md:block` / `md:hidden` — the
  desktop `AdminShell` (`649-0`/`67T-0`) and the existing
  `MobileShellAdmin` (`6B1-0`/`1ZP-0`, hamburger → kit `MobileNavDrawer`).
  `children` renders in both subtrees (client-only, no server effects;
  the hidden shell's hooks still run — accepted). Also fixed:
  `MobileNavDrawer`'s portal wrapper was `position: fixed` +
  `z-index: auto`, a level-0 stacking context that trapped the scrim
  (`--z-overlay`) / panel (`--z-drawer`) **below** `PageShell`'s
  `--z-sticky` (1100) toolbar — the drawer painted under the page header.
  Wrapper is now non-positioned (mirrors the kit `Drawer`); scrim + panel
  (`fixed inset-y-0 left-0`) escape to root and cover the page. Owner
  verified on localhost (drawer over toolbar; both viewports).
- **6b.2 — Admin nav wired.** In both `admin-shell.tsx` and
  `mobile-nav-drawer.tsx`: **Sales** → `/admin/orders` (A3, key `orders`);
  new **Derived sales** item → `/admin/canteen/derived-sales` (A4, key
  `derived-sales`) in the Operations group (`canteen-derived-sales-flow.md
  §G` allows a top-level item). Active-nav resolution moved from
  first-path-segment to **longest matching href prefix** (exported
  `ADMIN_NAV_ITEMS`) so `/admin/canteen/derived-sales` lights the right
  item. Links land ahead of their screens — a 404 until 6d is acceptable
  per the handoff.
- **6b.3 — Cashier bottom nav** (`components/layout/staff-shell-client.tsx`)
  → **Today · New Order · Customers** (was New Order · History). `today`
  key = the bare `/cashier` route (C1, lands 6c); `customers` →
  `/cashier/customers` (C6, built 6a); `new-order` → C2 (6c). Glyphs
  match artboard `D8E-0` (home / bag / speech-bubble).
- **6b.4 — `SimpleTable` `rowChevron`** — opt-in `rowChevron?: boolean`.
  Off (default) → byte-identical. On (and `onRowClick` set): a fixed
  `w-[24px]` trailing slot — header spacer + a `ChevronRight`
  (`--text-tertiary`) per clickable row — so column lanes stay aligned.
  Matches the M2 A1–A4 artboards. New story `Kit/SimpleTable → RowChevron`
  + baseline `kit-simpletable--row-chevron.png` (only that snapshot
  added; no existing baseline moved). `kit-audit.md` /
  `component-states.md` updated. First consumer: **A1**
  (`customers-client.tsx`). A2's ledger rows are not click targets — no
  chevron there.
- **6b.5 — Catalog `category` field** (`app/admin/catalog/product-drawer.tsx`)
  — one free-text `<FormField label="Category">` in "General Information",
  wired to the create/update body (`"" → null`). Domain + Zod already
  accepted it (6a). Without this C2/K1's tabs are permanently
  "Uncategorised". `catalog.screen.test.tsx` asserts it round-trips into
  the create payload.
- **6b.6 — Customers state artboards verified** (`E41-0` `DZ0-0` `E97-0` /
  `EXK-0` `F23-0` / `D8E-0` `DBH-0` `DF9-0`). **All structural states
  match** — correct kit component in the correct place. Minor **copy**
  deltas only (6a-built screens, not state gaps) — logged for QA:
  empty/filtered-empty/zero-history `EmptyState` descriptions are shorter
  than the artboards'; A1 error shows the live error string rather than
  the artboard's static line; C6 success toast is "Repayment recorded ·
  {name}" vs the artboard's "… · KES {amt} from {name}" (the shared
  `RepaymentForm.onDone` carries no amount — deferred, would touch A1
  too).

**Gate state:** `tsc --noEmit` 0 · kit `test:visual` + `test:a11y` green
(181/181, 1 new snapshot) · `catalog.screen.test.tsx` 10/10 · full
`pnpm test` run <PENDING — fill on completion>.

**Owner walkthrough (Customers & Credit, Cashier C6 + Admin A1/A2) —
still owed** (the real e2e gate). Needs seed data: minimal customer block
or a couple added by hand during the walk (full M2 seed is a 6d task).

**Flow-doc-vs-behaviour / doc gaps for QA:** none new. (Canteen
negative-sold gap from S5 still stands for 6c/6d.)

### 2026-08-30 — M2 Session 6a: backend gap-fills + Customers screens (Developer) — DONE

Development Sprint. Started as "assemble all M2 screens"; on discovery,
three backend gaps blocked the designs, the owner approved filling them,
and the session was **re-scoped and split** — 6a delivers the backend
fills + the one feature they most affect (Customers & Credit); 6b/6c/6d
carry the rest. See `docs/sprints/milestone-2-session-6-handoff.md` for
the 6b–6d breakdown.

**Backend gap-fills (owner-approved scope exceptions — schema + domain,
which the original Session 6 handoff forbade):**

- **`Order.number`** (`Int @unique @default(autoincrement())`) — a
  human-readable, monotonic order number ("#1043") that staff and the
  Admin say out loud. The `Order` model had only a UUID `id`; every M2
  screen design (A2 ledger, A3 list + "Correction of #1043", C1/C4)
  assumed a spoken number. `OrderView.number` + `toOrderView` expose it.
  A correction is its own row with its own number.
- **`Product.category`** (`String?`, free-text ≤40 chars) — the
  Admin-set menu category (Mains / Drinks …) that powers the C2 grid and
  K1 picker category tab rows. Planned M2-01 §6/§10, folded into "Session
  3 + a Catalog follow-up", **never built**. Wired through
  `lib/domain/catalog` (types, `toProductView`, create/update/list),
  `lib/validation/catalog` (create/update/list schemas), and
  `GET /api/products` (`?category=` + the field in the payload).
- **`cashier` added to `PRODUCT_READ_ROLES`** (`app/api/products`) **and
  `STOCK_ROLES`** (`app/api/stock-movements/balances`) — C2's product
  grid + the §3.8 over-stock check need both as a Cashier. `buyingPrice`
  stays stripped for the Cashier (no cost/margin leak — plan §3.6). Two
  stale M1 tests (`route.test.ts` "cashier is still 403",
  `flow-6-role-access` "a cashier cannot read the catalogue") updated to
  assert the new correct behaviour (200 + `buyingPrice: null`).
- **`Repayment.account` + `.note`** columns + `recordRepayment` writes
  them + `CustomerLedgerEntry` carries `account` / `note` / `orderNumber`
  — the A2 ledger "Reference" cell (artboard ER9-0) shows "Order #1043"
  for a debt and "Cash" / "M-Pesa" / the note for a repayment. The entry
  previously carried only a debt's `orderId` (a UUID).
- **Migration:** dev DB via `prisma db push` (owner-consented — Prisma's
  AI-safety guard); deploy migration
  `prisma/migrations/20260830120000_m2_s6_order_number_product_category_repayment_detail/`.
  `prisma generate` re-run. `docs/API.md` Orders / Customers / Catalog
  sections carry ADR-style notes for each addition.

**Customers & Credit screens (C6, A1, A2) — composed from the proven kit,
verified against Paper:**

- **`app/admin/customers/use-customers.ts`** — feature hook (`useCustomers`
  list + repayment; `useCustomerLedger` for A2). Mirrors
  `use-catalog.ts`; money stays a decimal string end to end.
- **`app/admin/customers/repayment-form.tsx`** — shared repayment form
  body (A1 rail Drawer, A2 rail Drawer, C6 BottomSheet) — kit `TextInput`
  + `SegmentedControl` (Cash / M-Pesa) + `Textarea`.
- **A1** (`customers-client.tsx` + `page.tsx`) — `PageShell` + `Breadcrumb`
  + desktop `SimpleTable` (`md:block`) + mobile row list (`md:hidden`) +
  `PillFilter` (All customers / Owing) + `SearchInput` + rail `Drawer`
  (repayment + add-customer) + `EmptyState` / `ErrorState` + `Toast`.
- **A2** (`[id]/customer-detail-client.tsx` + `page.tsx`) — `Breadcrumb`,
  header with Current-balance read-out + Record repayment, desktop ledger
  `SimpleTable` + mobile 2-line cards, "Reference" = `orderNumber` /
  `account` / `note`.
- **C6** (`app/cashier/customers/customers-client.tsx` + `page.tsx`) —
  `SearchInput` + row list + `BottomSheet` repayment (mobile, whole-KES
  balance per artboard DDD-0).
- **Specs:** `tests/screens/admin-customers.screen.test.tsx` (14) +
  `tests/screens/cashier-customers.screen.test.tsx` (6) — populated /
  empty / filtered-empty / error / loading / repayment happy-path +
  Esc-restore + the §3.6 "no cost/margin/order-detail on the Cashier
  view" contract. **18 new, 368/368 total.**

**Paper verification done:** artboards `DU2-0` (A1 desktop, + `get_jsx`),
`EJ6-0` (A1 repayment drawer), `EPJ-0` (A1 mobile), `ER9-0` (A2 desktop),
`F7F-0` (A2 mobile), `DDD-0` (C6 sheet). **Not yet verified** (6b): A1
`E41-0`/`DZ0-0`/`E97-0`, A2 `EXK-0`/`F23-0`, C6 `D8E-0`/`DBH-0`/`DF9-0`.

**Paper→code divergence handled (owner ruling):** the artboards draw
fixed pixel row heights + grow-ratio columns + a trailing row chevron;
the **kit `SimpleTable` is the design-system source of truth** for row
height / header / hairlines, so those come from the kit (responsive,
token-based), not the artboard pixels. "Has balance" pill → kit
`PillFilter`. The trailing chevron has no kit equivalent — a small
opt-in `SimpleTable` prop is a **6b task** (owner-approved), not
hand-rolled.

**Gate state:** `tsc --noEmit` 0 · `pnpm build` clean · `pnpm test`
368/368 · dev server runs. Kit untouched → `test:visual` / `test:a11y`
not re-run (no `components/kit/**` change).

**Frontend gaps found (full register in the 6b–6d handoff):**
1. **`AdminShellClient` is not responsive** — fixed 240px sidebar at all
   widths, no breakpoint switch to the mobile hamburger + drawer shell
   (Paper `6B1-0`). This is why the admin screens still look desktop in
   DevTools mobile view. Shell-level, affects every admin screen (M1's
   too). Kit `MobileNavDrawer` already exists to build it. **6b.**
2. Admin sidebar "Customers" / "Sales" nav entries route nowhere. **6b.**
3. Cashier bottom nav has no "Customers" entry → C6 unreachable. **6b.**
4. Kit `SimpleTable` clickable rows have no trailing-chevron affordance
   the artboards show. **6b (small kit change, approved).**
5. Only the *populated* states of A1/A2/C6 verified vs Paper. **6b.**

### 2026-08-30 — M2 Session 2: QuantityStepper verify-and-gate (Developer — kit) — DONE

Kit Sprint, re-scoped. The M2 plan and the 1a handoff scoped Session 2 as
"build the `QuantityStepper` tap-to-type value". **On inspection it already
existed** — the `<span>` → `<input inputmode="decimal" role="spinbutton">`
rewrite (− / + unchanged, `↑`/`↓` step, `onValueString` raw-string hatch)
landed in **M1 Session 10** as an owner-approved kit-audit item (`kit-audit.md`
§1, ratified ADR-43 / ADR-48), before M2 planning assumed it was still owed. So
Session 2 became a **verification pass + paper-trail close-out**, not a build.
No change to `quantity-stepper.tsx`.

**Verified (§2 of the handoff):**
- **Gate (ADR-42):** `tsc --noEmit` clean; `test:visual` + `test:a11y` on the
  stepper stories **7/7 play, 7/7 snapshots, 0 axe serious/critical, 0 console**
  (`--failOnConsole`). `pnpm test` (full vitest) **not run** — no vitest-visible
  file changed (only `.stories.tsx` + baselines + docs), and the suite is slow
  by design since S4/S5 (`maxWorkers: 2`, Postgres pool); `tsc` is the type gate
  here.
- **§9 contract per state:** REST byte-identical to `6XC-0` / `6CG-0`; §9.2
  accent border on `.kit-field` focus; §9.7 − / + disabled at bound (opacity
  0.5, `pointer-events: none`); §9.8 danger border + `--text-caption` helper row
  via the `error` prop, `aria-invalid` + `aria-describedby` wired; `↑`/`↓` step
  by `step`; commit on blur / Enter; out-of-range / non-numeric raw does **not**
  fire `onChange`. All proven by a `play` story.
- **M2 screen needs:** C2/C3/C4 order-line stepper + A3 correction editor +
  K1 counted-remaining all covered by the as-built component. K1's larger
  presentation (40px controls, `--text-h2` value) is reachable via a
  screen-level `className` / wrapper — **no new size variant needed**, no flag.

**Added:** one story — **`TypeALargeQuantity`** (`quantity-stepper.stories.tsx`):
a `play` that focuses the spinbutton, `userEvent.clear` + `type(input, "24")`,
asserts the raw string shows + `onValueString("24")` fired, `userEvent.tab()` to
blur, then asserts the committed display is `24` and `onChange` was last called
with `24`. Maps to the `6CG-0` / `DKR-0` "value focused — type a quantity"
artboard. Baseline committed (committed-state, not mid-type — caret blink makes
mid-type snapshots flaky; the `play` proves the typing path directly).

**Behaviour sign-off (§2.4):** commit-on-blur / commit-on-Enter + the
`onValueString` escape hatch + `↑`/`↓` stepping confirmed as-is — the ratified
ADR-48 "keep the full §9 contract, add the input" pattern (same as
`Select searchable`). Not judged a wrong commit-trigger → **no owner
escalation**, nothing BLOCKED.

**Docs closed:** `component-states.md` §9 C10 → **"implemented + gated
(M2-02)"** (was "Behaviour pending owner review"); `kit-audit.md` — the C10
BEFORE→AFTER table's `_tbd_` AFTER column filled in, "Remaining gaps" item 4
marked RATIFIED; story title de-suffixed `Kit/QuantityStepper — NEEDS OWNER
REVIEW` → `Kit/QuantityStepper` (matches ratified `Kit/Select`), 6 baselines
re-keyed + 1 new = 7.

**Discipline:** files touched — `components/kit/quantity-stepper.stories.tsx`,
`tests/visual/__screenshots__/kit-quantitystepper--*.png` (7),
`docs/design/component-states.md`, `docs/design/kit-audit.md`,
`docs/sprints/milestone-2-plan.md`, `docs/PROGRESS.md`,
`docs/sprints/milestone-2-session-2-handoff.md`. Nothing under `app/`, `lib/`,
no other kit component, no change to `quantity-stepper.tsx`.

**Handoff to next:** Session 6 (screen assembly) — the `QuantityStepper` hard
dependency for C2/C3/C4 order lines + A3's correction editor is now satisfied
and gated. Session 7 (QA) will re-check the §9 contract on the stepper as
composed into the real screens.

### 2026-08-29 — M2 Session 1a: Cashier screens design (Product Designer) — DONE

Design Sprint, Phase A. Ran after Session 3 landed. Scoped **mid-session
by the owner** to the Cashier screens only (C1–C6); the Admin (A1–A4) and
Canteen (K1–K2) screens moved to a new **Session 1b**. The 3 flow docs
were written in full (all of M2), so the backend sessions are unblocked.

**Shipped — Paper ("Prosper Hotel", page "Shell+Component kit"):**
22 Cashier artboards + 1 component artboard, all named `… [M2-01]`.
- **C1 Cashier Today** (4): populated · empty · day-closed banner · loading.
- **C2 New Order — build** (3): populated · empty · line-blocked (§3.8).
  **Redesigned** from a search-only add flow to a **tap-to-add 2-column
  product grid** (POS-standard): search → category tab row → tappable
  tiles (name · price · unit · stock-available · qty badge) → a pinned
  order-line panel above the sticky total bar.
- **C3 Checkout** (5): Cash · M-Pesa · Credit-no-customer · Credit-attached
  · Delivery — all drawn as a **tall bottom-sheet over the dimmed C2**
  (mobile-POS convention; Square / Toast / Loyverse open tender as a
  modal sheet, not a route).
- **C4 Order detail** (3): day-open editable · day-closed read-only ·
  corrected.
- **C5 Customer attach** (3): search results · no-match quick-create ·
  phone error — bottom-sheet over the dimmed C3.
- **C6 Customers (mobile)** (4): populated · empty · repayment sheet open
  · repayment success.
- **`Component Kit — M2 Sales Patterns [M2-01]`** — canonical states for
  the order-line row, product tile, and sticky total bar. **`6CG-0`
  Form Controls** — `QuantityStepper` tap-to-type states added.

**Flow docs (all written, full M2 scope):**
`restaurant-sales-flow.md`, `customers-credit-flow.md`,
`canteen-derived-sales-flow.md` — match the
`financials-reconciliation-flow.md` format. The customers + canteen docs
carry a note that their Admin/Canteen artboards are owed by Session 1b.

**Decisions:**
- **§3.8 — BLOCK.** A Restaurant order line whose qty exceeds the
  product's derived stock-available count cannot be confirmed (line →
  §9.8 error pattern, sticky action disabled + danger caption; server
  enforces `400 insufficient_stock`). Recorded in `restaurant-sales-flow.md`.
- **New-component verdict: ONE kit change → Session 2 runs.**
  `QuantityStepper` gains a **tap-to-type numeric value** (`<span>` →
  `<input inputmode="decimal">`; − / + unchanged) for large order
  quantities — already flagged in `kit-audit.md` C10. Everything else on
  the plan §6 list composes from the proven kit.

**Changed from plan:**
- **Session 1 → 1a (done) / 1b (pending).** §7 re-baselined, §10 changelog
  appended. M2 is now 8 session-slots.
- **Session 2 confirmed needed** (was "skipped if none").
- **New product `category` field flagged** — the C2 / K1 category tab row
  needs an Admin-set `category` attribute on products (schema column +
  Catalog UI + `PRD.md` §4.1 line). Folded into Session 3's backend +
  a Catalog follow-up; `milestone-2-plan.md` §6/§10.

**Gate state:** design-only session — no code, no tests. Discipline held:
only `docs/**` and the Paper file were touched.

**Owed by Session 1b:** A1–A4, K1–K2 — desktop **and** mobile, every
structural state.

### 2026-08-29 — M2 Session 1b: Admin + Canteen screens design (Product Designer) — DONE

Design Sprint, Phase A — the second half of M2's design. Ran against the
3 flow docs from 1a; disjoint from the domain sessions (docs + Paper
only). Delivers the Admin (A1–A4) and Canteen (K1–K2) screens.

**Shipped — Paper ("Prosper Hotel", page "Shell+Component kit"),
32 new artboards, all `… [M2-01]`:**

- **A1 Customers & Credit register** (7): desktop populated · filtered-empty
  · empty · error · repayment rail-drawer open · add-customer rail-drawer
  open · mobile. `SimpleTable` (Name · Phone · Balance mono · Last
  activity), chip filter bar (Has balance toggle + Search, count +
  Clear all at ≥2), repayment / add-customer in a right-edge `Drawer`
  (rail, ADR-37b).
- **A2 Customer detail** (4): desktop populated · zero history · loading
  · mobile. Header block with large mono derived balance + Record
  repayment; body is a `DenseLedger`-style interleaved Debt / Repayment
  table with a semibold running-balance column (signed colour: red
  +debt, green −repayment).
- **A3 Orders list (Admin)** (8): desktop populated · filtered-empty ·
  empty · error · read-only order-detail drawer open · correction form
  drawer open · order + correction linked row-group · mobile.
  **Read-only** — the only mutating action is "Record correction",
  opening a rail `Drawer` with the original as read context + a
  corrected line list (M2 Sales Patterns order-line row +
  `QuantityStepper` tap-to-type) + `CalculatedImpactBanner` + required
  Reason. **No delete affordance anywhere.** Corrected order + its
  correction render as a bracketed, indented linked pair.
- **A4 Canteen Derived Sales** (5): desktop populated · product never
  counted (Never / — / muted em-dash) · filtered-empty · loading ·
  mobile. `SimpleTable` (Product · Last counted date+relative · Period
  covered span · Units sold mono · Revenue mono); correcting-period
  negative in `--color-danger`.
- **K1 Stock Count** (6): product picker · count entered + preview ·
  first-ever count (distinct copy) · correcting re-count negative sold
  · validation error · confirm success (Toast). Staff mobile shell +
  back-nav `FlowHeader` (no direction badge); product picker reuses the
  C2 category tab row over the new `category` field; preview card is
  `CalculatedImpactBanner` (amber, read-only) with the exact flow-doc
  derivation copy.
- **K2** (2): the derived sale as a **new entry type in the existing
  Canteen hub `ActivityTimeline`** (`9BA-0`) — "Stock count — {product}"
  / "{n} {unit} sold since {date} · closing {rem}" / "+KES {y}" green
  mono (correcting negative → "−KES {y}" red). Shown once at the top of
  the log and once interleaved between a transfer and an opening-stock
  row (the visual-consistency acceptance point). No new screen, no new
  component.
- **`Component Kit — M2 Sales Patterns [M2-01]`** extended with 3 new
  canonical sections: chip filter bar states, derived-sale timeline row
  (positive + correcting-negative), correction linked row-group. One
  canonical artboard; no component has two divergent versions.

**Flow docs:** `customers-credit-flow.md` and
`canteen-derived-sales-flow.md` — "Artboards" lists filled in with the
1b frames + a composition note; the top "Artboard status" note flipped
from "deferred to Session 1b" to **DONE**. No new policy written into
the flow docs.

**Decisions:** none — §3.8 (BLOCK) and the one-kit-change verdict were
settled in 1a and stand. Nothing surfaced that the flow docs + kit +
M2-01 patterns didn't already cover; **nothing flagged for escalation**.

**Changed from plan:** none. §7 table: Session 1b marked done; no
sequencing change, no §10 changelog line.

**Gate state:** design-only session — no code, no tests. Discipline
held: only `docs/**` and the Paper file were touched (`lib/`,
`app/api/`, `components/kit/`, `app/**/*.tsx`, tests all untouched).

**Handoff to next:** Session 2 (kit — `QuantityStepper` tap-to-type),
Sessions 4 / 5 (Orders + Canteen domain), then Session 6 assembles all
M2 screens (Cashier from 1a, Admin + Canteen from 1b) into real routes
from the Paper screenshots.

### 2026-08-30 — M2 Canteen design re-spin: `voidStockCount` (Product Designer) — DONE

A targeted Design touch-up, **not** a full sprint. Triggered by Session
5's owner decision (2026-08-30): "counted more than expected" is
**rejected** (`400`) with a **same-day hard-delete undo**
(`voidStockCount`), overriding the flow doc's earlier "allow a
negative-sold reconciliation" design. That made 3 M2-01b artboards +
2 pattern-sheet variants + parts of `canteen-derived-sales-flow.md`
stale. This session brings design back in sync — **docs + Paper only**.

**Paper — K1 re-spun from 6 → 9 states** (`worldY 20400`):
- `K1 … correcting re-count, negative sold` → renamed + reworked to
  **`K1 … counted more than expected (blocked)`** — §9.8 inline error
  on the count field with the server's exact message ("exceeds expected
  stock by N pcs"), an `InstructionalBanner` ("a transfer/delivery may
  not have been recorded — ask the Store Manager, then recount"), a
  "Delete today's count" link for the redo case, Confirm disabled, **no
  preview card**.
- **Added `K1 … delete count confirm`** — `FrictionDeleteDialog` over
  the dimmed screen, **no type-to-confirm** (ADR-36c
  `showTypeToConfirm={false}` — same-day, recount-recoverable), body
  spells out exactly what's deleted incl. the KES figure, Cancel /
  "Delete count" (destructive).
- **Added `K1 … delete count success`** — returns to the Canteen hub
  with a `Toast` ("Count deleted · … sale removed · recount when
  ready"); the timeline entry for that count is gone.
- **Added `K1 … count locked, previous day`** — count field read-only,
  amber lock banner ("from a closed day — ask the Admin to correct
  it"), sticky bar disabled "Only the Admin can change this" (mirrors
  C4's "Correct this (Admin)").
- `K1 … validation error` clarified as blank/non-numeric only — the
  "over expected" case is now its own artboard.

**Paper — A4** (`GL2-0` + `H4I-0`): the correcting-negative Mandazi row
→ a normal positive count; **no `--color-danger` on any Units/Revenue
cell anywhere**.

**Paper — "M2 Sales Patterns" (`DIN-0`):** derived-sale timeline row
section's "correcting-negative" variant → **"zero sold"** variant (no
`canteen_sale` money row → muted em-dash where the value would be); new
**"Stock-count delete confirm"** section pinned.

**Paper — K2:** no change — both artboards already showed a positive
derived sale.

**Flow doc — `canteen-derived-sales-flow.md` rewritten:** cross-cutting
rule 5 (was "self-adjusting correction" → now "can't go negative,
delete + redo"); §"The period-boundary case" (new `> UPDATED
2026-08-30` box + the "hard stop, not a negative" bullet); walkthroughs
**C** (blocked), **C2** (delete + redo), **C3** (day-locked) replace
the old "correcting re-count showing a negative"; **D** narrowed to
blank/non-numeric; **F** (timeline) drops the negative-revenue mention,
adds zero-sold; data notes updated with the `voidStockCount` contract +
`recordStockCount` return shape + "reject if `sold < 0`". Artboards
list + a re-spin changelog appended.

**Not touched (correctly):** `restaurant-sales-flow.md`,
`customers-credit-flow.md`, any Cashier/Admin artboard — the override
is Canteen-only.

**Decisions:** none new — this implements the owner's 2026-08-30 call.
**Nothing flagged.** **Gate state:** design-only — `docs/**` + Paper
only; no `lib/`, `app/`, `components/`, tests.

**Handoff to next:** Session 6 can now assemble the **whole** Canteen
slice (K1's 9 states, K2, A4) against the shipped `voidStockCount` — no
blocker remains. `FrictionDeleteDialog` needs its
`showTypeToConfirm` / configurable-copy props confirmed present (they
are per ADR-36c) when Session 6 composes the delete-confirm.

### 2026-08-29 — M2 planning + doc/codebase cleanup (Tech Lead) — DONE

Not a feature sprint — a planning + cleanup pass before M2 Session 1.

- **`docs/sprints/milestone-2-plan.md`** written — scope, out-of-scope,
  starting state, §3 cross-cutting contracts (money ledger goes live;
  order money effect; append-only correction; soft "open day" check;
  canteen derivation; role scoping; audit), backend + screen + new-component
  outlines, the 7-session sequence, the 7 guardrails, definition of done,
  a changelog section. It is a **living** doc — re-baselined as M2 runs.
- **`docs/sprints/milestone-2-session-1-handoff.md`** — the M2 Session 1
  (Design Sprint) handoff (renamed from an externally-authored
  `sprint-m2-01-…`; content kept, verified consistent with the plan).
- **PROGRESS.md compacted** 3,344 → ~90 lines. M1's 30 detailed session
  entries collapsed to a one-line ledger on M1 close. Rule added: full
  detail for the current milestone only.
- **`docs/sprints/` cleared** of all per-session handoffs, findings docs,
  and the old `sprint-0X-*` files. Kept: `milestone-1-plan.md` (rewritten
  to a short closed stub + pointers) and the two M2 files.
- **`app/design-preview/` + `docs/design/screens/` deleted** (23 preview
  routes, 21 screen skeletons + their `fixtures.ts`). From M2 the frontend
  model is screenshot-the-artboard-and-assemble — no skeleton export, no
  fixtures mock layer, no `/design-preview` route. The 5 `app/admin/**`
  page comment headers updated to drop the dangling references.
- **`docs/design/export-workflow.md`** — added the M2 model (Phases
  C1 backend / C2 frontend assembly; owner walkthrough as a gate step);
  removed the `fixtures.ts` / `/design-preview` machinery.
- **`docs/sdlc.md`** trimmed 614 → 277 lines (dropped the 7 verbose prompt
  templates + the stale monorepo codebase-structure block; added a
  "deviations from the generic structure" note). Phase 3.1 / 3.2 rewritten
  for the M2 backend-first model.
- **Headless-browser e2e dropped** (per owner). The M1 Playwright harness
  was never built; Session 17 already repurposed `test:e2e` to run Vitest
  integration suites. `TEST_PLAN.md §2` rewritten (Playwright → Vitest
  domain-integration + owner walkthrough); `DECISIONS.md` ADR-35 given an
  M2 superseding note. `@playwright/test` / `axe-playwright` **kept** —
  the Storybook test-runner (`test:visual` / `test:a11y`) uses them.
- **`docs/CONVENTIONS.md §6`** added — working practices carried forward
  from M1 (prove-before-use, never-eyeball-a-screenshot, named audit
  passes, owner walkthrough per feature, re-baseline don't annotate,
  ledgers-not-totals + correction-of-correction rejection).
- **`CLAUDE.md` / `ROADMAP.md` / `milestone-01-*.md`** updated for the
  new doc layout (one plan file per milestone; PROGRESS ledger; M1 marked
  done).
- Gates: `pnpm tsc --noEmit` 0, `pnpm build` clean, `pnpm test` **226/226**.

### 2026-08-29 — M2 Session 3: Money ledger + Customers & Credit (Developer) — DONE

Backend-only Development Sprint; ran in parallel with Session 1 (Design)
on disjoint files. Unblocks Sessions 4 (Orders) and 5 (Canteen sales).

**Shipped:**

- **Migration `20260829130000_add_m2_money_source_types`** — adds `order`,
  `repayment`, `canteen_sale` to the `MoneySourceType` enum (plain
  `ALTER TYPE … ADD VALUE`, no table change). **Applied to the dev DB via
  `prisma db push`** (the dev DB carries no `_prisma_migrations` history —
  carried convention from M1); the migration file is committed for a real
  deploy. S4/S5 consume `order` / `canteen_sale` and need no further
  migration.
- **`lib/domain/financials/`** — the money ledger (ADR-17):
  - `recordMoneyMovement(input, { actorId, tx? })` — internal, no route.
    Appends one signed `MoneyMovement` row + an `AuditLog` row. Takes an
    **optional Prisma tx client** so S4/S5 can write it inside the same
    transaction as the `Order` / `StockCount` and its `StockMovement`s —
    money and stock commit together or not at all. With no `tx` it opens
    its own transaction. Shaped for a future `correctMoneyMovement`
    (offsetting row via `correctsMovementId`, ADR-15) — not built.
  - `getAccountBalances()` → `{ cash, mpesaBank }` as `Prisma.Decimal`,
    one grouped `SUM(amount)` by account over the whole ledger. No stored
    total. `serialiseAccountBalances` stringifies at the route boundary.
- **`lib/domain/customers/`** — Customers & Credit (ADR-19):
  - `createCustomer` (trim + non-empty name/phone; no phone format /
    uniqueness — SCHEMA sets none; `AuditLog` on create).
  - `listCustomers({ search?, hasBalance? })` — derived `balance`
    computed **set-wise** (two grouped sums, `Σdebts − Σrepayments`),
    `lastActivityAt`, case-insensitive name-or-phone search.
  - `getCustomerLedger` — debts + repayments interleaved by `occurredAt`
    then `createdAt`, running balance, `NOT_FOUND` for an unknown id.
  - `recordRepayment` — one transaction: `Repayment` + a `+amount`
    `MoneyMovement` (`sourceType: "repayment"`) + two `AuditLog` rows.
    `amount > 0`. **Overpayment allowed → negative balance** (see flag).
    `occurredAt` stamped, not day-gated (no Day Close in M2).
  - `recordDebt({ customerId, orderId, amount, occurredAt }, { tx })` —
    **tx-only helper for S4** to call from `createOrder` on a `credit`
    order. S3 only reads `Debt`; it never originates one.
- **Routes** (each mirrors `app/api/products/route.ts` in shape; no logic
  in the handler): `GET`/`POST /api/customers`, `GET /api/customers/:id`,
  `POST /api/customers/:id/repayments` — all **Admin or Cashier**;
  `GET /api/money/balances` — **Admin only**. Zod in
  `lib/validation/customers.ts`.

**Changed from plan:** none — scope as handoff. `recordDebt` helper built
this session (handoff left it to my discretion; building it keeps S4 out
of Prisma for `Debt` writes).

**Flag for Session 1 flow doc + QA:** a repayment greater than the
outstanding balance is **accepted** and drives the derived balance
negative (credit in hand). Deliberate per the handoff; not silently
blocked. If the owner wants it blocked that is a follow-up, not a code
change made here.

**One existing test adjusted (not weakened):**
`tests/integration/m1-flows/flow-4-purchase-reconciliation.test.ts` —
its "purchase_payment writes NO MoneyMovement" check used a global
`prisma.moneyMovement.count()` before/after, which is now flaky because
the money ledger is live and other suites hold `MoneyMovement` rows
concurrently. Rescoped to "no `MoneyMovement` linked to *this* payment"
(by `stockMovementId` / `sourceId`) — a stricter assertion of the same
intent.

- Gates: `pnpm tsc --noEmit` **0**; `pnpm build` **clean**; `pnpm test`
  **268/268** (226 existing + 42 new: financials 7, customers domain 17,
  routes 18), stable across repeated runs.
  `grep TODO(mock)` in the new modules → none.

### 2026-08-30 — M2 Session 4: Restaurant Orders (Developer) — DONE

Backend-only Development Sprint. `lib/domain/sales` Restaurant-order slice
+ `lib/validation/orders` + `app/api/orders` + tests. Ran concurrently
with Session 5 (Canteen) in the same working tree, split by file per the
handoff — S4 owns `create-order.ts` / `edit-own-order.ts` /
`correct-order.ts` / `list-orders.ts` / `order-effects.ts` /
`restaurant-location.ts` and its share of the barrel + `types.ts` +
`test-helpers.ts`.

**Shipped:**

- **`createOrder(input, ctx)` → `OrderView`** — one `prisma.$transaction`:
  validate lines / prices / delivery-fee / payment; **snapshot** each
  line's Restaurant `sellingPrice` as its `unitPrice` (never re-looked-up,
  ADR-16); **§3.8 BLOCK** — sum ordered qty per product, compare to the
  derived Restaurant balance **re-read on the tx client** right before the
  writes, reject in full (nothing written, balance never negative) naming
  every short line; then write `Order` + `OrderLine[]` + one negative
  `sale` `StockMovement` per line + **either** a `MoneyMovement` (cash →
  `cash`, mpesa → `mpesa_bank`; `sourceType: "order"`) **or** a `Debt`
  (credit; `customerId` required, no money row — plan §3.2) + an
  `AuditLog` row.
- **`editOwnOrder(orderId, input, ctx)` → `OrderView`** — a Cashier's
  **true edit** of their own, same-day order. `NOT_FOUND` / `FORBIDDEN`
  (not own) / `FORBIDDEN` "closed" (order's Africa/Nairobi business day ≠
  today — a business-date equality check; **M3 swaps in the real
  `DayClose` gate**, comment left in code). Deletes this order's lines /
  `sale` movements / `MoneyMovement` / `Debt`, re-validates (incl. §3.8),
  rewrites, recomputes `total`. `AuditLog` `action: "correct"` (no `edit`
  in the enum) with pre/post summaries. Shared write body factored into
  `order-effects.writeOrderEffects` (used by create + edit).
- **`correctOrder(orderId, input, ctx)` → `OrderView`** — Admin-only
  append-only correction (ADR-15, mirrors `stock/correct-movement.ts`).
  `NOT_FOUND`; `VALIDATION_ERROR` if the target is itself a correction
  (no chaining); `FORBIDDEN` for a non-admin. Writes a **new `Order`**
  (`correctsOrderId` set, `cashierId` = original, `occurredAt` =
  original's), its lines, and **offsetting** deltas so the net effect
  across `original + all corrections` = the corrected state: one delta
  `sale` `StockMovement` per changed product (`correctsMovementId` → the
  original's `sale` row where singular), one signed delta `MoneyMovement`,
  and/or one signed `Debt` (payment-method change reverses one kind and
  writes the other). **F-1 idempotency:** deltas measured against the
  *current* derived effect; an identical re-submit → `VALIDATION_ERROR`
  "nothing to correct". §3.8 for the corrected state adds the original's
  `sale` movements back before comparing.
- **`listOrders(filter, ctx)` → `OrderView[]`** — role-scoped (mirrors
  `stock/list-movements.ts`): `admin` → all (`cashierId` narrows);
  `cashier` → forced to own, a foreign `cashierId` → `[]` (no error, no
  leak); other role → `FORBIDDEN`. `date` windows the Africa/Nairobi
  business day on `occurredAt`. Newest first. **No margin / cost /
  buyingPrice / profit field** in any row (an `OrderView` has none).
  **Correction rows are returned as separate rows** with `correctsOrderId`
  exposed — reads are **not folded** (simplest for M2; the Session 6
  screen badges / links the pair).
- **Routes** (`app/api/orders/**`), thin handlers per
  `app/api/products/route.ts`: `POST` (cashier → 201), `GET` (admin +
  cashier), `PATCH /:id` (cashier, own + same-day), `POST /:id/correct`
  (admin → 201). Zod shape-only in `lib/validation/orders.ts`; the
  `credit ⇒ customerId` cross-field rule lives in the domain.
- **`lib/domain/customers/correct-debt.ts`** — new tx-only helper for
  `correctOrder`: appends a **signed** `Debt` row (negative reverses,
  positive tops up) — `recordDebt` rejects non-positive amounts by
  design. Exported from the customers barrel; tested.
- **M1 `purchases.ts` `TODO(mock)` resolved** (plan §11): a
  `purchase_payment` now also writes one **`−cost` `MoneyMovement`**
  against `purchase_paid_from` (`sourceType: "purchase_payment"`,
  `sourceId` = the stock-movement id) inside the same transaction. The
  `flow-4` integration test and the `stock` / `flow-4` cleanup helpers
  updated to match; `grep TODO(mock)` in `lib/domain/stock` → none.

**Schema change (owner-approved):** added **`Order.occurred_at`**
(`DateTime @default(now())`) — the edit-vs-correct gate and the
correction-lands-in-the-original's-day rule need a business instant on the
order, and every other ledger table already has one. Applied to the dev
DB via `prisma db push` + `prisma generate`; migration file
`20260829140000_add_order_occurred_at` committed for a real deploy.

**Account-mapping assumption:** `restaurant-sales-flow.md` shows no
explicit account picker on the checkout sheet (walkthroughs A/B: Cash →
Cash account, M-Pesa → M-Pesa/Bank), so `createOrder` **derives** the
account from `paymentMethod`. An optional `account` input is still
accepted and validated for consistency — the Session 6 screen may pass it
explicitly.

**`listOrders` correction rows:** returned as **separate rows** (not
folded), `correctsOrderId` exposed.

**Test-infra change:** `vitest.config.ts` — `maxWorkers: 4` (+
`testTimeout`/`hookTimeout` bumps). The full suite was exhausting the
local Postgres 100-connection ceiling once S4's + S5's DB-heavy suites
ran alongside the M1 set (8 forks × ~17 Prisma connections); capping
forks keeps the total ~68. Isolated suites still run sub-second.

- Gates: `pnpm tsc --noEmit` **0**; `pnpm build` **clean**; `pnpm test`
  **350/350** with S5's suites present (268 M1/S3 baseline untouched +
  S4 domain 33 + S4 routes 16 + purchases money-effect test + S5's).
  `grep TODO(mock)` in `lib/domain/sales` → none.
- Committed on `feat/m2-session-4-orders` (off the S1a HEAD, which
  carries S3 + the handoffs; `main` does not yet have S3). Merge order to
  `main`: S3 → {S4, S5} → S1a/S1b/S2 → S6.

### 2026-08-30 — M2 Session 5: Canteen Derived Sales (Developer) — DONE

Backend-only Development Sprint; ran in the same working tree as Session 4
(Orders), split by file per the handoff (S5 owns `record-stock-count.ts` /
`derived-sales.ts` / `canteen-guards.ts` and adds to the shared
`types.ts` / `index.ts` / `test-helpers.ts` — additively; S4 rebases
those on its final versions before committing).

**Shipped (`lib/domain/sales` canteen slice):**

- **`recordStockCount(input, ctx)` → `{ count, derivedSale }`** — the
  attendant records what is physically on the shelf; the system derives
  the sale for the period since that product's previous count at this
  canteen. `sold = expectedRemaining − countedQuantity`, where
  `expectedRemaining` is the signed `Σ StockMovement.quantity` for
  (product, canteen) up to the count's `occurredAt`, **read on the tx
  client** so two concurrent counts can't both pass a stale read. In one
  transaction: the `StockCount`; one `sale` `StockMovement`
  (`quantity = −sold`, `stockCountId` set — ADR-16, uniform with
  Restaurant sales); a `canteen_sale` `MoneyMovement`
  (`sold × canteen sellingPrice`, `account: "cash"`, `sourceId` = count
  id) **skipped when `sold === 0`**; an `AuditLog` `create` row.
  Validates: product exists & sold at the canteen (active
  `ProductLocation` + non-null `sellingPrice`, snapshotted);
  `countedQuantity ≥ 0`; `occurredAt` (default now) strictly after the
  previous count.
- **`voidStockCount(countId, ctx)`** — same-day undo. **Hard delete** of
  the `StockCount` + its `sale` `StockMovement` + its `canteen_sale`
  `MoneyMovement`, plus a `hard_delete` `AuditLog` row. `FORBIDDEN` for
  another attendant's count or once the Africa/Nairobi business day has
  rolled; `NOT_FOUND` for an unknown id.
- **`getDerivedSalesForProduct(productId, ctx)` /
  `listDerivedSales({ productId?, date? }, ctx)`** — per product, the
  most-recent count's `{ lastCountedAt, periodStart, periodEnd,
  unitsSold, revenue }` (PRD §4.4), joining the latest `StockCount` to
  its `sale` `StockMovement` and `canteen_sale` `MoneyMovement`.
  Never-counted canteen products list with `null` figures (shown, not
  hidden). Role scope: `admin` → every canteen; `canteen_attendant` →
  own canteen; else `FORBIDDEN`. `date` windows on the count's
  Africa/Nairobi business day; newest count first, never-counted last.
- **Routes** (`app/api/canteen/**`, mirror `stock-movements/route.ts`
  shape, no logic in handler): `POST /api/canteen/stock-counts`
  (Attendant only, → 201), `DELETE /api/canteen/stock-counts/:id`
  (Attendant only), `GET /api/canteen/stock-counts` (Admin + Attendant).
  Zod shape-only in `lib/validation/canteen.ts`.
- **Closing stock** is never a written row (ADR-11) — after the `sale`
  row the derived balance at the count's instant equals `countedQuantity`.

**Decisions recorded (owner, 2026-08-30):**

- **Counted more than expected (`sold` < 0): REJECT** —
  `VALIDATION_ERROR`, nothing written. The approved
  `canteen-derived-sales-flow.md` (walkthrough C / "the period-boundary
  case") had described *allowing* a negative-sold reconciliation with a
  reversing money row; the owner overrode that in favour of reject +
  **same-day undo** (`voidStockCount`). The flow doc's negative-sold
  narrative is now superseded — **Session 6 / QA should treat "count
  more than expected" as a blocked error, and "undo today's count" as
  the recovery path.** Flow doc not yet edited (design artifact — flag
  for a Design touch-up or QA note).
- **Zero-value rows:** the `sale` `StockMovement` is still written for
  `sold === 0` (uniform audit trail); the `canteen_sale` `MoneyMovement`
  is **skipped** for `sold === 0` (no zero-value money row).
- **Explicit `stock_count` closing marker row:** not written — relied on
  the derived balance (ADR-11).
- **GET route:** `/api/canteen/stock-counts` only; no `/derived-sales`
  alias (the flow doc doesn't name one).
- **`correctStockCount` schema gap:** no `corrects_stock_count_id`
  column; an Admin post-close correction path needs a migration in a
  later session. Module is shaped so it can drop in.

**Changed from plan:** the reject-vs-allow decision above (plan §3.5 /
handoff §3 left it to the owner; the flow doc's lean toward "allow" was
not taken). Added a `DELETE` route for the same-day undo — not in the
handoff's route table, follows from the owner decision.

**Shared-file edits (additive — S4 unaffected, still green):**
`types.ts` (+`RecordStockCountInput`, `DerivedSale*`,
`ListDerivedSalesFilter`, `ActorContext.locationId?`), `index.ts` (+4
exports), `test-helpers.ts` (+`setupCanteenTestData`, `seedMovement`,
canteen cleanup branch — `Staff` + `StockCount` + `canteen_sale` money
rows).

**Test note:** `getAccountBalances()` and `prisma.debt.count()` are
global aggregates and race the parallel S4 order suites — S5 domain
tests assert revenue/debt effects on their **own** `sourceId` /
location, never a global before/after delta.

- Gates: `pnpm tsc --noEmit` **0**; `pnpm build` **clean**; `pnpm test`
  **350/350** (318 after S4 + 32 new: `record-stock-count` 16,
  `derived-sales` 8, canteen route 8). Existing suite untouched.
  `grep TODO(mock)` in the new canteen files → none.

*(Full per-session entries for M2 Sessions 1–7 go here as they run.)*

---

## Shipped — earlier milestones (ledger)

### Milestone 1 — The business exists in the system — COMPLETE 2026-08-29

Catalog & Locations, the full append-only StockMovement ledger across
Restaurant / Canteen / Store, the `/admin/financials` stock-purchase +
reconciliation slice, and the Assets register. No revenue.
Plan: `docs/sprints/milestone-1-plan.md`. ADRs: 13–48.

| Date | Session | Shipped |
|---|---|---|
| 2026-08-19 | Planning & repo setup | PRD / ARCHITECTURE / API / SCHEMA / DECISIONS / CONVENTIONS / TEST_PLAN / ROADMAP; git init; first commit. |
| 2026-08-19 | Sprint 01 — Foundation | Next.js App Router + TS on pnpm; full Prisma schema migrated; Auth.js name + 4-digit-PIN login, server-side role checks on 4 shells; PWA manifest + SW; seed; `lib/time` (Africa/Nairobi); Zod validation example. |
| 2026-08-20 | Phase 2B — Design system | Paper.design component library (16-artboard kit) + `design-principles.md`. |
| 2026-08-20 | Component export (Paper → code) | First kit export pass (later superseded by the Session 3/9–10 rebuild). |
| 2026-08-20 | Login screen + role shells | `app/login/*` + 4 role shell routes wired to `usePathname` / `router` / `signOut`. |
| 2026-08-24 | Sprint 02 — Catalog design & Next.js assembly | Catalog screens assembled on mock data (later superseded). |
| 2026-08-25 | Sprint 06 — Design export | 21 screens exported by `get_computed_styles` reconstruction — **all wrong, all scrapped**. Triggered the `milestone-1-plan.md` re-plan and `export-workflow.md`. |
| 2026-08-27 | Tech Lead — M1 re-plan | `export-workflow.md` written; stale docs cleaned; M1 scope pinned in `milestone-1-plan.md`. |
| 2026-08-27 | Design Sprint 2 — component states | `component-states.md`; consistency audit (5 token/structure divergences fixed in Paper); `design-principles.md §9` interaction contract. ADR-36. |
| 2026-08-27 | Design Sprint 3 (pt 1 + 2) | Kit + 4 shells re-exported by verbatim `get_jsx`; route clients rewired; `tsc` green. |
| 2026-08-27 | Design Sprint 4a / 4b / 4c | All 21 M1 screens re-exported from Paper + screenshot-verified (F1/F3/Financials, then 5 Admin Stock, then 7 Store Manager/Canteen). `globals.css` type-scale fix; ADR-37c FlowHeader. |
| 2026-08-27 | Dev Sprint 5 — M1-F1 Catalog & Locations | `lib/domain/catalog` (Dish `buyingPrice=0` invariant, soft/hard delete + referential guard → 409), `app/api/products*`, `/api/locations`. F1 screens wired. 35 tests. ADR-38. |
| 2026-08-27 | Dev Sprint 6 — M1-F2 Stock backend | `lib/domain/stock` — all 8 movement fns + 2-phase transfer + `correctMovement` (day-close gate) + sum-the-ledger balances + `listMovements` (role/location scoped). Routes. ADR-39. 56 tests. |
| 2026-08-27 | Dev Sprint 7 — M1-F2 Admin stock frontend | Ledger + correction drawer + mobile + bulk opening grid + financials stock-purchase/reconciliation slice. `GET /api/stock-movements/balances` (ADR-40). Collapse persists (ADR-36b). 76 tests. |
| 2026-08-27 | Dev Sprint 9 — Kit remediation pt 1 | `app/design-system/tokens.{css,ts}` (foundations + interaction contract + drift-guard test); §9 as shared CSS. ADR-41 (opaque `--surface-raised`, `--surface-panel-tint` retired), ADR-42 (Storybook adopted). |
| 2026-08-27 | Dev Sprint 10 — Kit remediation pt 2 | All 32 `components/kit/*` audited + fixed to implement every §9 state + keyboard + ARIA; 4 primitives added (`Spinner` / `Toast` / `PageShell` / `FormField`). `lib/tokens.css` deleted. ADR-43. 80 tests. |
| 2026-08-28 | Dev Sprint 10b–10d — Kit proof harness | Storybook stood up: one story per state, visual-regression baselines, `axe` a11y, §9 `postVisit` assertions. `test:visual` / `test:a11y` gates. |
| 2026-08-28 | Dev Sprint 11 — Admin screens recomposed | `/admin/catalog`, `/admin/stock` + `/opening` + `/financials` rebuilt as compositions of the proven kit (`PageShell` / `FormField` / `Toast` / `EmptyState` / `ErrorState`). `export-workflow.md` rewritten (compose, don't transcribe). Per-screen `*.screen.test.tsx` gate (18 specs). |
| 2026-08-28 | Dev Sprint 12 — Store Manager + Canteen frontend | 7 staff screens composed from the proven kit + wired to F2 API; incoming-transfer banner + 2-phase accept. ADR-44. 28 screen specs. |
| 2026-08-28 | Dev Sprint 13 — M1-F3 Assets | `lib/domain/assets` (CRUD + `transitionCondition` + friction-guarded `hardDeleteAsset` → 409 on linked AuditLog), routes, Register + Drawer + Delete Dialog from the kit. ADR-45. Suite 127 → 154. |
| 2026-08-29 | Dev Sprint 14 — M1 manual-walkthrough fixes | D1 staff-FORBIDDEN fixed (`GET /api/products` + `/api/locations` widened to staff stock roles; POST stays admin; `buyingPrice` still stripped). Copy sweep: B1 "Stock"→"Ledger", B4 "Shop Goods"→"Goods", C2 "Cash at Hand"→"Cash". A3 Catalog drawer → `variant="rail"`. |
| 2026-08-29 | Design Sprint 15 — M1 design-change pass | ADR-46 (Financials Reconciliation section → table; purchase-payment detail → real fields; delete-in-drawer; A4 kind hint; B3 typography) + ADR-47 (Archive model: table tab + friction-free Unarchive + stock-flow picker exclusion). Paper + ADRs only. |
| 2026-08-29 | Kit Sprint — `<Select>` searchable mode | Opt-in `searchable` + `noMatchesLabel` props on `components/kit/select.tsx` (APG editable-combobox filter, 288px cap + scroll); 5 stories + 5 visual baselines. `<Select>` without the prop byte-unchanged. ADR-48. |
| 2026-08-29 | Dev Sprint 16 — build S15 designs + A5 Archive | Migration: 4 nullable `purchase_*` columns + backfill. `recordPurchasePayment` writes them; `parsePaymentNote` deleted. Reconciliation table (Awaiting delivery / Delivered / Received-no-payment / Flagged). Delete-in-drawer + Edit-only rows (Catalog + Assets). A4 kind hint. A5 Archive: `?mode=unarchive` + `/assets/:id/restore` endpoints, Archived tabs, archived-record guard, stock-flow picker-exclusion audit + one test per flow. Suite 154 → 200/201. |
| 2026-08-29 | QA Sprint 17 — adversarial M1 pass — **M1 COMPLETE** | **F-1 (High, ledger integrity) fixed:** `correctMovement` stacked a second delta on a double-submitted correction and allowed correcting a correction — now rejects a target with `correctsMovementId` set and computes `delta = corrected − (original + Σ existing deltas)` so a repeat is delta-0. B2 (bulk opening post-save) + B5 (correction cell) reproduced + resolved. M1-flow Vitest integration tests added. Suite **226/226**, `tsc` 0, `build` clean. Merged to `main` (PR #1). |

**M1 known follow-ups (not blocking M2):**

- **2-phase transfer receiver visibility** — a `transfer` dispatch row is
  stored with `locationId = source`; `listMovements` scopes a
  location-bound role to their own location, so the receiver never sees
  the pending inbound dispatch and the Accept banner never appears for a
  real cross-location transfer. `POST …/accept` works given a valid id.
  Needs a Design call (match on
  `transferCounterpartLocationId = actor.locationId`, or a dedicated
  inbound-transfers endpoint).
- `prisma/seed.ts` upserts the staff `User` with `update: {}` — a staff
  row created before `staffId` existed would never be backfilled. One-line
  hardening, deferred.
- Dev DB has no `_prisma_migrations` history (built by `db push` every
  session); the committed migration files are for a real deploy — confirm
  `migrate deploy` applies them cleanly on a tracked DB.

---

## Changelog of this log's structure

- 2026-08-29 — Compacted. M1's 30 detailed session entries (was ~3,340
  lines) collapsed to the ledger table above on M1 close. Going forward:
  full detail for the current milestone only.
