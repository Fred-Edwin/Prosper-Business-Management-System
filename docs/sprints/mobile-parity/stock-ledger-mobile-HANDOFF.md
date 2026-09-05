# Mobile parity — Stock / Ledger (`/admin/stock`) — HANDOFF

**For:** a fresh agent. Everything you need is in this file. This is the
whole session: make the mobile rendering of `/admin/stock` match its
approved Paper artboard, pixel for pixel.

Desktop is signed off. **Do not regress it.**

---

## The artboard

| | |
|---|---|
| **Open** | https://app.paper.design/file/01M0EZ7TAHZM26KBMWNYT0928X/8-0/RM6-0 |
| **File** | `Prosper Hotel` (`01M0EZ7TAHZM26KBMWNYT0928X`) |
| **Page** | `approved mobile screens` (`8-0`) |
| **Artboard** | `Admin Stock — Mobile` — node **`RM6-0`**, 390×844 |

This is the **approved, final** mobile design for this route (owner
confirmed). Stock and Ledger are the same screen. Build to it.

Desktop v2 references, on page `M5b — Ledger v2` (`7-0`) — already
shipped, reference only:
`Ledger — desktop [v2, day-grouped]` (`PWD-0`) ·
`Ledger — desktop [v2, period summary]` (`Q3J-0`) ·
`Ledger — desktop [v2, drill-in]` (`Q6I-0`).

`get_screenshot("RM6-0")` to see it. `get_tree_summary("RM6-0", depth: 5)`
to work from it.

---

## 0. Rules (binding)

- CLAUDE.md applies. **pnpm only.**
- Post a visible-progress checklist (TodoWrite if available) and update it
  as you go.
- **Do not commit** unless the owner asks.
- Do not touch `components/shells/*` or the desktop branches of
  `stock-client.tsx`.
- `<DenseLedger>` is a **kit** component — never fork it. If it can't do
  what the artboard needs, stop and ask.

## 1. Read (only this — don't go wider)

- `app/admin/stock/stock-client.tsx` — the screen (it is large; read the
  mobile branches closely, skim the rest).
- `docs/PROGRESS.md` → the **Ledger v2** notes inside the Session B entry.
- `docs/DECISIONS.md` → **ADR-66** (mobile filter row = one all-visible
  horizontal-scroll row of real controls; the "3 chips + More →
  BottomSheet" overflow was removed).
- `app/admin/financials/kpi-strip.tsx` — the one mobile component built
  by the measured method. Copy its approach.

## 2. The method — this is the session

**Screenshots judge the result; they never source a value.**
(`docs/CONVENTIONS.md` §6.) Every number comes from
`get_computed_styles`. Full explanation in `_METHOD.md` beside this file.

1. `open_file` → confirm Paper's tokens match `app/globals.css`. They
   should be identical. If any differ, **stop and report** — never invent
   a mapping.
2. `get_tree_summary("RM6-0", depth: 5)` → the structure you're building.
3. **Batch** `get_computed_styles` over every node you'll build. Pull
   **`flexGrow` / flex ratios explicitly** — on a dense ledger, column
   alignment is the whole game, and ratios are invisible in a screenshot.
   This is the step that separates pixel-perfect from "close but off".
4. `pnpm dev`, sign in as **Admin / PIN 1234**, viewport **390px**,
   screenshot the real screen.
5. Write the diff as an explicit list — each item with its exact
   `from → to` value — **before changing any code**. Show the owner.

Then rebuild to match. Compose from `components/kit/*`; where a prop
shape doesn't fit, thin mapper **in the screen file** — never fork the
kit.

## 3. Screen-specific notes

- **This is the densest screen in the app**, and density at 390px is the
  hard problem. Take the artboard's answer literally rather than
  inventing a compromise.
- **The screen has grown since this artboard was drawn.** Ledger was
  rebuilt to v2 during Session B — a period KPI band, period-summary and
  drill-in views, and the shared `AdminDateRangeControl` /
  `useAdminDateRange`. The artboard is the approved design for what it
  draws; where the *code* has a feature the artboard is simply silent
  about, that is **not** licence to delete it. See §4.
- **The filter row must follow ADR-66** — all controls visible in one
  horizontal-scroll row, none hidden behind an overflow sheet. Verify the
  shipped screen actually does this.
- **`<DenseLedger>` scrolls horizontally in its own container.** The
  *page* must never scroll horizontally. Keep that boundary.
- Money and quantities are mono figures — no floating-point drift.

## 4. Stop and ask the owner if

- **The code has functionality the artboard doesn't draw.** Do not delete
  a working feature to match a picture — list what you found and ask.
  This is the most likely question on this screen.
- The artboard needs a pattern the kit has no answer for (including
  anything `<DenseLedger>` can't express).
- The artboard contradicts `design-principles.md` §9 (ENFORCED — §9
  wins; flag it).
- Matching mobile would regress desktop.

## 5. States the artboard doesn't draw

Must still look deliberate at 390px — tell the owner what you chose:

empty · loading · error + retry · a single row · a product with a very
long name · the largest realistic quantity/value without overflow.

## 6. Check + gates (run only these)

**Check** — same session, no separate QA:
- Drive it at **390px** as Admin. Also sanity-check **360px**.
- Exercise **every view**: day-grouped ledger, period summary
  (Week/Month), and the drill-in. A parity pass that only checks the
  default view is not done.
- **No horizontal page scroll.** `<DenseLedger>` scrolls inside itself.
- Re-screenshot and compare against `RM6-0` side by side. State plainly
  what still differs and why.
- Extend `tests/screens/stock-ledger-v2.screen.test.tsx` or
  `stock.screen.test.tsx` **only** if you changed interactive behaviour.
  Pure layout work needs no new test.

**Gates** — these four, nothing more:
```
pnpm vitest run tests/screens/stock-ledger-v2.screen.test.tsx tests/screens/stock.screen.test.tsx tests/screens/stock-levels.screen.test.tsx
pnpm typecheck                      # 0 errors
rm -rf .next && pnpm build
grep -rn "TODO(mock)" --include="*.ts" --include="*.tsx" app lib components
```
Nothing new from the grep. (`lib/domain/stock/purchases.test.ts:61` is a
test description, not a marker.)

Run the full `pnpm test` **only** if you touched `lib/` or a kit
component — this is a layout session; the full suite is several minutes
and buys nothing here.

## 7. When done

- A flow doc under `docs/design/flows/` only if a real design decision
  was made.
- `docs/PROGRESS.md` — a short entry: what changed, gate state, the
  walkthrough result (per view), anything still open.
