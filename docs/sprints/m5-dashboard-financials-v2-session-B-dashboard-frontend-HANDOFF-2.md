# M5 — Dashboard & Financials v2 — Session B (Dashboard frontend) — HANDOFF, part 2

**For:** a fresh agent picking up where Session B stopped mid-way. Read
this whole file before touching anything — it explains exactly what's
built, what's verified, and what's still open, including one bug that
turned out to be pre-existing and out of this session's scope to fix
alone.

**Read `m5-dashboard-financials-v2-session-B-dashboard-frontend-HANDOFF.md`
first** (the original Session B brief, same directory) — this file is an
addendum recording what happened when that brief was executed, not a
replacement for it. Section numbers below (§0–§8) refer to that original
doc.

---

## 0. Where things stand — the short version

The Dashboard v2 screen is **built and gate-green** (`pnpm test` /
`pnpm typecheck` / `pnpm build` all pass, no new `TODO(mock)`). While
doing the manual `pnpm dev` walkthrough the original handoff's §0 and §6
require, a real, reproducible bug was found: **clicking a period-control
preset (e.g. "This month") does not always update the period-scoped
content on screen**, even though the correct data is genuinely being
fetched from the server.

Critically: **this bug is not something this session introduced.** It
reproduces identically, with the exact same steps, on `/admin/financials`
— a screen this session did not touch except for one import-path rename
(see §2 below). It is a pre-existing defect in shared infrastructure
(`AdminToolbarProvider` / ADR-56's single-header-row mechanism, likely
interacting with the dual desktop/mobile shell mount — see §4). Given
that scope, it should probably be triaged and fixed as its own
cross-cutting piece of work, not folded silently into "Session B, Dashboard
frontend" — but that's a call for whoever picks this up, informed by
what's below.

---

## 1. What's actually built and verified this session

All of this is done, tested, and believed correct:

- **New backend route**: `GET /api/admin/dashboard/trend?from=&to=`
  (`app/api/admin/dashboard/trend/route.ts` + `route.test.ts`, 6 tests
  passing). A thin wrapper over the already-exported `dailyNetSeries`
  (ADR-64) — validates `from`/`to`, rejects `from > to`, returns
  decimal-string daily nets. Documented in `docs/API.md` "Dashboard".
  `GET /api/admin/dashboard` itself is untouched — still `?date=` only,
  per Session A's explicit steer (not relitigated).
- **Validation**: `dashboardTrendQuerySchema` added to
  `lib/validation/dashboard.ts`.
- **Shared date-range hook/control**: `app/admin/financials/use-financials-range.ts`
  + `financials-range.tsx` were promoted to shared `app/admin/`-level
  files — `use-date-range.ts` (`useAdminDateRange`, `AdminDateRange`,
  `resolvePreset`, `rangeLabel`, etc.) and `date-range-control.tsx`
  (`AdminDateRangeControl`). **Behaviour is byte-identical to the
  original** — only names changed (`FinancialsRange` → `AdminDateRange`,
  `useFinancialsRange` → `useAdminDateRange`, `FinancialsRangeControl` →
  `AdminDateRangeControl`). `app/admin/financials/financials-client.tsx`
  was updated to import from the new shared location — its **only**
  change this session. The full test suite (1004/1004) passing after this
  move confirms Financials' own behaviour, including whatever bugs it
  already had (see §3), is unchanged.
- **New hook**: `app/admin/use-dashboard-trend.ts` (`useDashboardTrend`) —
  fetches the new trend route.
- **Rebuilt `app/admin/dashboard-client.tsx`** into the v2 zone order per
  `docs/design/flows/dashboard-screen.md` "Structure (v2 — current)":
  profit stack (5-column card + owner draws, with a prior-period delta
  via a second `/api/financials/summary` call) → Right now (position,
  accent-bordered) → trend row (period bar strip + unchanged 30-day
  strip; period strip correctly dropped on mobile) → Financial-performance-
  by-location + Stock-activity-by-location tables side by side → Needs
  attention → Today's activity → Day Close.
- **Trend bucketing** (`bucketTrendByPeriod` in `dashboard-client.tsx`):
  daily for Today/This week, ISO-week buckets (Monday-first, via
  `businessWeekRange`) for This month, a documented 14-day threshold for
  Custom (Custom is currently always a single day in this app, so that
  branch is dormant but present for if Custom ever grows a real range).
- **Tests**: `tests/screens/admin-dashboard.screen.test.tsx` extended
  (16 tests, all mocked — `useDashboard`, `useFinancialSummary`,
  `useDashboardTrend`, `useDayClose` are all mocked, so **these tests do
  not exercise the real re-render bug described in §3** — they assert the
  right `{from, to}` reaches the mocked hooks on a preset change, which is
  correct and passing, but that's exactly the layer where the bug does
  NOT live; see §3).
- **Docs updated**: `docs/design/flows/dashboard-screen.md` (trend
  bucketing decision marked RESOLVED) and `docs/API.md` (new trend route
  documented in full, with example response).
- **Gates run and green**: `pnpm test` → 1004/1004 passing, 123 files (up
  from the 990-test baseline noted in the original handoff — this
  session added roughly 14 net new tests across the route test file and
  the extended screen spec). `pnpm typecheck` → 0 errors. `pnpm build`
  (after `rm -rf .next`) → succeeds, new route shows in the route table.
  `grep -rn "TODO(mock)"` → only the one pre-existing non-marker hit in
  `lib/domain/stock/purchases.test.ts:61` (a test description string),
  nothing new.

**Nothing has been committed.** Per this project's standing rule, do not
commit unless the owner explicitly asks.

---

## 2. Files touched this session (for a diff review)

```
app/admin/dashboard-client.tsx                    — rewritten (v2 structure)
app/admin/use-dashboard.ts                        — header comment updated only
app/admin/use-dashboard-trend.ts                  — NEW
app/admin/use-date-range.ts                       — NEW (was app/admin/financials/use-financials-range.ts, renamed+moved)
app/admin/date-range-control.tsx                  — NEW (was app/admin/financials/financials-range.tsx, renamed+moved)
app/admin/financials/financials-client.tsx        — import path + call-site renames only (useAdminDateRange, AdminDateRangeControl)
app/api/admin/dashboard/trend/route.ts            — NEW
app/api/admin/dashboard/trend/route.test.ts        — NEW
lib/validation/dashboard.ts                       — added dashboardTrendQuerySchema
tests/screens/admin-dashboard.screen.test.tsx     — extended/rewritten for v2
docs/API.md                                       — new trend route section
docs/design/flows/dashboard-screen.md             — bucketing decision resolved
```

`git status --short` at time of writing this handoff:

```
 M app/admin/dashboard-client.tsx
RM app/admin/financials/financials-range.tsx -> app/admin/date-range-control.tsx
 M app/admin/financials/financials-client.tsx
 M app/admin/use-dashboard.ts
RM app/admin/financials/use-financials-range.ts -> app/admin/use-date-range.ts
 M docs/API.md
 M docs/design/flows/dashboard-screen.md
 M lib/validation/dashboard.ts
 M tests/screens/admin-dashboard.screen.test.tsx
?? app/admin/use-dashboard-trend.ts
?? app/api/admin/dashboard/trend/
```

(Stray screenshot PNGs dropped in the repo root during manual testing
were deleted before this handoff was written — confirm `git status` is
still this clean before continuing.)

---

## 3. THE BUG — full reproduction, what's known, what isn't

### Repro (confirmed twice, on two different screens)

1. `pnpm dev`, sign in as Admin, go to `/admin` (Dashboard) at a desktop
   viewport (≥768px, so the `md:` desktop shell is the one showing).
2. Click "This month" in the period control (top right, in the header).
3. **Observed**: the radio control itself DOES show "This month" as
   checked/selected. The correct network requests DO fire — verified by
   inspecting `GET /api/financials/summary?from=2026-09-01&to=2026-09-30`
   both via the browser's network log and by calling it directly from the
   page's own `fetch` (via `page.evaluate`) — the backend returns
   correct, different data (e.g. `netProfit` changed from `-27300.00` to
   `26940.00` in one test run). **But** the visible profit-stack caption
   ("For today · Fri 4 Sep") and figures do NOT update to reflect it —
   they stay frozen on the pre-click values indefinitely (waited several
   seconds, still stale).
4. **Same exact repro on `/admin/financials`** (a screen this session did
   not modify beyond the import-path rename in §2): click "This month" in
   its header period control — "Profit for 4 Sept 2026" (a today-only
   caption) and the Per-location table stay frozen too.

This second data point is the important one: it means the bug is **not**
in anything Session B wrote. It's in something both screens share.

### What's confirmed NOT the cause

- **Not the data layer.** The correct `{from, to}` reaches the API, and
  the API returns correct, different figures. Confirmed by direct
  `fetch()` from the browser console-equivalent.
- **Not `useFinancialSummary` / `useAdminDateRange` themselves** — these
  are plain, standard hooks (`useState` + `useCallback` + `useEffect`
  keyed on `[from, to]`), the same pattern used successfully elsewhere in
  this codebase (e.g. `useExpenses`, `useOwnerTransactions` in the same
  file). Reading the code finds no bug in the hooks themselves.
- **Not a `pnpm build`/typecheck-catchable issue** — both are clean.
- **Not the screen test suite's mocked hooks** — those tests
  intentionally bypass the real hook implementations, so they can't (and
  didn't) catch this.

### What's suspected but NOT confirmed

The investigation (documented turn-by-turn in this session's transcript,
not repeated in full here) traced the DOM and found:

- Both `/admin` and `/admin/financials` are rendered by
  `app/admin/admin-shell-client.tsx`, which mounts **two full, independent
  copies of `{children}`** — one inside a `hidden md:block` desktop shell,
  one inside a `md:hidden` mobile shell — wrapped by a **single, shared**
  `<AdminToolbarProvider>`. This is documented, intentional M2 S6b
  architecture ("the hidden shell's hooks still run — an accepted cost").
- Each shell's copy of the page (e.g. two `DashboardClient` mounts, or two
  `FinancialsClient` mounts) calls its own `useAdminDateRange()`, so each
  has its **own independent `range` state** — this part is expected and
  fine, it's how the M5-era screens always worked with two shells.
- The header row itself (title + the period control + account avatar) is
  NOT rendered inline by the page — it's "teleported" via
  `AdminPageHeader` → `setContent()` → the single shared
  `AdminToolbarProvider` context → read back by whichever shell is
  actually rendering the header chrome (`AdminShell` / `MobileShellAdmin`).
- Because **both** mounted copies of the page call `setContent()` on the
  **same shared context** (one provider wraps both shells), the value
  each pushes will overwrite the other's, and — going by the observed
  behaviour — clicking the ONE physically-visible period control on
  screen updates ONE mount's `range` state correctly (confirmed via DOM
  inspection: the radio's own `aria-checked` state DOES flip correctly,
  and the OTHER (hidden) shell's copy of the same caption DOES
  eventually show the new period), but the VISIBLE caption stays bound to
  whichever mount's context push "wins" — which was NOT the mount whose
  radio was actually clicked, in the reproductions run.
- In short: **the click, the state update, and the visible header control
  all appear to be internally consistent with each other — but the large
  content body below the header is reading from a *different* mount's
  state than the header controlling it.** That points at the
  `AdminToolbarProvider` / dual-shell interaction as the root cause, not
  at anything screen-specific.

**This was not fully pinned to a single line of code before this session
ended.** The investigation used ad hoc DOM queries via Playwright's
`browser_evaluate` (documented live in the transcript) rather than
React DevTools' component tree, which would likely resolve this faster —
whoever continues should reach for that first: mount the app, open React
DevTools, click a preset, and watch exactly which `DashboardClient` /
`FinancialsClient` fiber's `range` state changes vs. which one the
rendered header/body actually reflects. That will show definitively
whether it's a stale-closure-in-context problem, a
context-value-identity problem (`AdminToolbarProvider`'s `useMemo` on
`[content]` — worth checking whether `content` object identity is stable
across the two mounts in a way that causes React to bail out of
re-rendering one of them), or something about effect-ordering between
two sibling mounts pushing to the same context in `useEffect`.

### Why this wasn't caught before now

- M5 S14's Dashboard shipped with **no period picker at all** — nothing
  to click, so this class of bug had no surface there.
- Financials (M3 S7) has had a period picker since M3, and per the
  original Session B handoff's own text, "the owner is doing the 'check'
  phase manually on `pnpm dev`" — it's plausible this exact interaction
  (switching Financials' preset and confirming the header numbers changed
  live) was never manually re-verified after a later change, or was
  verified in a way that didn't surface the desktop/mobile mount split
  (e.g. testing only in one shell size, or a real mouse click behaving
  differently from what was tested here — worth someone re-checking with
  an actual mouse in an actual browser window, not just Playwright, in
  case there's a genuine tool-vs-real-browser discrepancy — though the
  DOM-level evidence gathered makes a real bug far more likely than a
  tooling artifact).

---

## 4. What to do next — options, not a decision made for you

This needs a judgment call this session didn't have context to make
alone. Options, roughly in order of how contained they are:

1. **Triage this as a separate, cross-cutting bug** (affects both
   Financials and Dashboard, lives in shared shell/context
   infrastructure) and flag it to the owner rather than fixing it inside
   "Session B." Ship Session B's Dashboard work as-is with this bug
   called out explicitly — the screen is otherwise complete and correct;
   this defect pre-dates it and already affects production Financials
   today.
2. **Fix it as part of finishing Session B**, since the period control is
   the Dashboard's headline new feature and shipping it visibly broken
   undermines the whole session — but do so carefully, since the fix
   likely touches `components/shells/admin-toolbar-context.tsx` and/or
   `app/admin/admin-shell-client.tsx`, which are shared by every `/admin/*`
   screen, not scoped to Dashboard. Any change there needs the full test
   suite re-run (not just the dashboard/financials specs) and probably
   its own manual walkthrough of a couple of other admin screens
   (Staff, Audit trail) that also use `AdminPageHeader` to make sure
   nothing else regresses.
3. **Do nothing about it in code, but write a proper bug report** (repro
   steps above are copy-pasteable) and let the owner decide priority
   against Session C (Financials frontend) and the rest of the roadmap.

Whichever is chosen, **do not spend more time on ad hoc `browser_evaluate`
DOM archaeology** — reach for React DevTools' Components panel first, it
will show the actual fiber tree and context values directly instead of
inferring them from computed styles and `offsetParent`.

---

## 5. Two smaller, non-blocking things noticed along the way

- **`perLocation`'s Store row.** `docs/API.md` states "Store naturally
  absent since it never sells" for the Financial-performance-by-location
  table. On the seeded dev data, this is **false** — Store shows up with
  `revenue: 0` and a negative `grossProfit` whenever it has COGS activity
  (purchases) with no matching sale, because `getFinancialSummary`'s
  `perLocation` is built from `revenueByLocation.keys() ∪
  cogsByLocation.keys()`, and Store contributes to the latter. **This is
  pre-existing** (confirmed identical on `/admin/financials`, which this
  session didn't touch) — not a Session B regression. The Dashboard's own
  `FinancialLocationTable` deliberately does NOT filter this client-side,
  to stay byte-for-byte consistent with what Financials already shows
  (filtering only on the Dashboard would make the two screens disagree,
  which is worse). Flag to the owner: either accept Store can
  legitimately show a (negative) row when it has unsold purchases, and
  fix the doc's claim, or decide `perLocation` should genuinely exclude
  Store by `Location.type` server-side — that's a `getFinancialSummary`
  change affecting both screens, out of scope for a quick fix here.
- **A stray directory**: `.claude/worktrees/agent-<hash>/` exists inside
  this repo's working tree (contains what looks like a full duplicate
  checkout, e.g. `components/shells/admin-shell.tsx` inside it). Not
  created by this session, not touched by it — noted here only so it
  isn't mistaken for something Session B did. Worth asking the owner
  whether it's expected debris from another agent's worktree tooling.

---

## 6. Still outstanding from the ORIGINAL handoff's checklist

- **§0 manual `pnpm dev` walkthrough** — partially done. Desktop Today
  preset walked through and looks correct against the Paper artboard at a
  glance (no visual diff done yet — see next point). This month / This
  week / Custom, and the mobile artboard, were NOT walked through because
  the period-control bug (§3) made further walkthrough unreliable until
  that's resolved or worked around.
- **Visual/spacing diff against the Paper artboards** — the owner asked
  for this explicitly mid-session and it was NOT done before the session
  ended. Specific concerns raised: spacing/alignment in the trend-charts
  row, and the two-column "Financial performance by location" /
  "Stock & activity by location" tables not visually matching each other
  in row count / sizing the way the artboard implies they should (the
  artboard screenshots were already pulled this session — see the
  transcript / re-fetch via Paper MCP `get_screenshot` on artboards
  `P5Y-0` ("Dashboard — desktop [v2]") and `PQR-0` ("Dashboard — mobile
  [v2]") in file "Prosper Hotel", page "M5 — Dashboard & Audit" — same ids
  as the original handoff references). This still needs to happen band by
  band, per `docs/CONVENTIONS.md` §6's "never eyeball a screenshot"
  discipline — pull exact values with Paper's `get_computed_styles` where
  precision matters (e.g. exact gap between the two trend cards, exact
  column widths in the location tables), not just eyeballed screenshot
  comparison.
- **`docs/PROGRESS.md` session entry** — NOT written yet. Should cover:
  what shipped (§1 above), the trend-bucketing decision (already recorded
  in the design doc, summarize + link), the discovered pre-existing bug
  and that it was NOT fixed this session (§3/§4), the Store/perLocation
  note (§5), and an explicit "For Session C" section per the original
  handoff's §8 requirements — at minimum: confirm `use-date-range.ts` /
  `date-range-control.tsx` are now the shared location (not
  Financials-only) so Session C doesn't go looking for the old
  `use-financials-range.ts` path, and flag the period-control bug to
  Session C since Financials frontend work will run straight into it too.
- **Mobile artboard verification** — not done (blocked behind the same
  bug making interactive verification unreliable; the static/no-JS layout
  was visually sane in the one screenshot taken).

---

## 7. Recommended first steps for whoever picks this up

1. Read `m5-dashboard-financials-v2-session-B-dashboard-frontend-HANDOFF.md`
   (the original), then this file, in full.
2. Reproduce §3's bug yourself, fast: `pnpm dev`, `/admin/financials`,
   click "This month," confirm "Profit for 4 Sept 2026" doesn't change. If
   it now DOES work, something changed since this handoff was written —
   note that explicitly rather than assuming this doc is stale silently.
3. Open React DevTools, find the two `FinancialsClient` (or
   `DashboardClient`) fibers, click the preset, watch which one's `range`
   state changes and which one the header/body you can see is actually
   subscribed to. This should take a few minutes and settle the root
   cause definitively, which the previous session did not manage with
   DOM-only inspection.
4. Decide + execute one of §4's options.
5. Finish the visual diff (§6) and the `pnpm dev` walkthrough of the
   period control on both viewports, once the interaction actually works.
6. Write the `docs/PROGRESS.md` entry (§6) and re-baseline anything in
   `docs/sprints/` if the session sequence changed because of this.
7. Do not commit unless the owner explicitly asks, per standing project
   rule.
