# Mobile parity — Dashboard (`/admin`) — HANDOFF

**For:** a fresh agent. Everything you need is in this file. This is the
whole session: make the mobile rendering of `/admin` match its approved
Paper artboard, pixel for pixel.

Desktop is signed off. **Do not regress it.**

---

## The artboard

| | |
|---|---|
| **Open** | https://app.paper.design/file/01M0EZ7TAHZM26KBMWNYT0928X/8-0/PQR-0 |
| **File** | `Prosper Hotel` (`01M0EZ7TAHZM26KBMWNYT0928X`) |
| **Page** | `approved mobile screens` (`8-0`) |
| **Artboard** | `Dashboard — mobile [v2]` — node **`PQR-0`**, 390px wide, ~1961px tall |
| **Desktop twin** | `Dashboard — desktop [v2]` (`P5Y-0`) on page `M5 — Dashboard & Audit` (`6-0`) — reference only, already shipped |

`get_screenshot("PQR-0")` to see it. `get_tree_summary("PQR-0", depth: 5)`
to work from it.

---

## 0. Rules (binding)

- CLAUDE.md applies. **pnpm only.**
- Post a visible-progress checklist (TodoWrite if available) and update it
  as you go — not in a batch at the end.
- **Do not commit** unless the owner asks.
- Do not touch: `app/api/admin/dashboard/*`, `components/shells/*`
  (shared infra, fixed in `e275cba` — a bug there would be surprising;
  flag it, don't patch it), or the desktop branches of
  `dashboard-client.tsx`.

## 1. Read (only this — don't go wider)

- `app/admin/dashboard-client.tsx` — the screen.
- `docs/design/flows/dashboard-screen.md` → **"Structure (v2 —
  current)"** only. The M5 section below it is superseded.
- `docs/PROGRESS.md` → the **Session B** entry (search "Session B —
  Dashboard frontend").
- `app/admin/financials/kpi-strip.tsx` + `debts-card.tsx` — the only
  mobile components in the repo built by the measured method. Copy their
  approach.

## 2. The method — this is the session

**Screenshots judge the result; they never source a value.**
(`docs/CONVENTIONS.md` §6.) Every number comes from
`get_computed_styles`. Full explanation in `_METHOD.md` beside this file.

1. `open_file` → confirm Paper's tokens match `app/globals.css`. They
   should be identical. If any token differs, **stop and report** — do
   not invent a mapping.
2. `get_tree_summary("PQR-0", depth: 5)` → the structure you're building.
3. **Batch** `get_computed_styles` over every node you'll build. Pull
   **`flexGrow` / flex ratios explicitly** — column alignment lives there
   and is invisible in a screenshot. This is the step that separates
   pixel-perfect from "close but off".
4. `pnpm dev`, sign in as **Admin / PIN 1234**, viewport **390px**,
   screenshot the real screen.
5. Write the diff as an explicit list — each item with its exact
   `from → to` value — **before changing any code**. Show the owner that
   list.

Then rebuild to match. Compose from `components/kit/*`; where a prop
shape doesn't fit, thin mapper **in the screen file** — never fork the
kit.

## 3. Screen-specific notes

- **Session B measured almost nothing on this screen.** Its own PROGRESS
  entry lists under "Not done": only the trend-charts row and the
  location tables were checked with `get_computed_styles`; every other
  band was eyeballed. Assume nothing here is verified.
- **It's a long scroll** (~1961px). Zone-to-zone vertical rhythm matters
  more than usual — measure every zone gap. Session B corrected *desktop*
  to 24px and the trend row to 20px; mobile was never separately checked.
- **v2 does not reorder zones between viewports** (unlike M5). Order:
  profit stack · Right now · trend row (mobile: 30-day card only) ·
  Financial performance + Stock & activity by location · Needs attention ·
  Today's activity · Day Close.
- **The profit stack is structurally different on mobile** — stacked rows
  with Net Profit as an emphasised, tinted bottom row, *not* the desktop
  5-column split. Build it from the artboard, not from the desktop code.
- **Two per-location tables** are the hard part at 390px.
- **`app/admin/day-close/day-close-client.tsx` is shared** — the Dashboard
  renders `<DayCloseRow>`. It was reworked recently (v2.1: unified
  week table with toggle-per-day). Check it at 390px but change it only
  if the artboard demands it.

## 4. Stop and ask the owner if

- The artboard needs a pattern the kit has no answer for.
- The artboard contradicts `design-principles.md` §9 (ENFORCED — §9
  wins; flag it).
- Matching mobile would regress desktop.
- **`perLocation` / Store:** `perLocation` includes a Store row with
  `revenue: 0` and negative gross profit even though captions say Store
  doesn't sell. **Known, open, deliberately unresolved.** Session B added
  a Total row to hide the visual symptom. If it affects your layout,
  flag it — **never** filter Store client-side (that would make this
  screen and Financials disagree about what `perLocation` means).

## 5. States the artboard doesn't draw

The artboard shows the populated case. Each of these must still look
deliberate at 390px — tell the owner what you chose:

empty · loading · error + retry · a single row · long text (truncate or
wrap) · the largest realistic number without overflow or wrapping.

## 6. Check + gates (run only these)

**Check** — same session, no separate QA:
- Drive it at **390px** as Admin. Also sanity-check **360px**.
- **No horizontal page scroll.** Wide content scrolls in its own
  container.
- Re-screenshot and compare against `PQR-0` side by side. State plainly
  what still differs and why.
- Extend `tests/screens/admin-dashboard.screen.test.tsx` only if you
  changed interactive behaviour. Pure layout/spacing work needs no new
  test. (Mocked-hook specs can't catch shell/context bugs — they
  complement the manual walkthrough, never replace it.)

**Gates** — these four, nothing more:
```
pnpm vitest run tests/screens/admin-dashboard.screen.test.tsx
pnpm typecheck                      # 0 errors
rm -rf .next && pnpm build
grep -rn "TODO(mock)" --include="*.ts" --include="*.tsx" app lib components
```
Nothing new from the grep. (`lib/domain/stock/purchases.test.ts:61` is a
test description, not a marker.)

Run the full `pnpm test` **only** if you touched something outside
`app/admin/dashboard-client.tsx` — this is a layout session; the full
suite is several minutes and buys nothing here.

## 7. When done

- `docs/design/flows/dashboard-screen.md` — only if a real design
  decision was made.
- `docs/PROGRESS.md` — a short entry: what changed, gate state, the
  walkthrough result, anything still open.
