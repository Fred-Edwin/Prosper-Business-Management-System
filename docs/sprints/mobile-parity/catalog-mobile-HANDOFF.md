# Mobile parity — Catalog (`/admin/catalog`) — HANDOFF

**For:** a fresh agent. Everything you need is in this file. This is the
whole session: make the mobile rendering of `/admin/catalog` match its
approved Paper artboard, pixel for pixel.

Desktop is signed off. **Do not regress it.**

---

## The artboard

| | |
|---|---|
| **Open** | https://app.paper.design/file/01M0EZ7TAHZM26KBMWNYT0928X/8-0/ROY-0 |
| **File** | `Prosper Hotel` (`01M0EZ7TAHZM26KBMWNYT0928X`) |
| **Page** | `approved mobile screens` (`8-0`) |
| **Artboard** | `Admin Catalog — Mobile` — node **`ROY-0`**, 390px wide |

This is the **approved, final** mobile design for this route (owner
confirmed). Build to it.

`get_screenshot("ROY-0")` to see it. `get_tree_summary("ROY-0", depth: 5)`
to work from it.

---

## 0. Rules (binding)

- CLAUDE.md applies. **pnpm only.**
- Post a visible-progress checklist (TodoWrite if available) and update it
  as you go.
- **Do not commit** unless the owner asks.
- Do not touch `components/shells/*` or the desktop branches of
  `catalog-client.tsx` / the tab files.

## 1. Read (only this — don't go wider)

- `app/admin/catalog/catalog-client.tsx`, `products-tab.tsx`,
  `locations-tab.tsx` — the screen.
- `app/admin/catalog/product-drawer.tsx`, `location-drawer.tsx`,
  `product-delete-dialog.tsx` — part of this screen; see §3.
- `app/admin/financials/kpi-strip.tsx` + `debts-card.tsx` — the only
  mobile components built by the measured method. Copy their approach.

## 2. The method — this is the session

**Screenshots judge the result; they never source a value.**
(`docs/CONVENTIONS.md` §6.) Every number comes from
`get_computed_styles`. Full explanation in `_METHOD.md` beside this file.

1. `open_file` → confirm Paper's tokens match `app/globals.css`. They
   should be identical. If any differ, **stop and report** — never invent
   a mapping.
2. `get_tree_summary("ROY-0", depth: 5)` → the structure you're building.
3. **Batch** `get_computed_styles` over every node you'll build. Pull
   **`flexGrow` / flex ratios explicitly** — column and lane alignment
   lives there and is invisible in a screenshot. This is the step that
   separates pixel-perfect from "close but off".
4. `pnpm dev`, sign in as **Admin / PIN 1234**, viewport **390px**,
   screenshot the real screen.
5. Write the diff as an explicit list — each item with its exact
   `from → to` value — **before changing any code**. Show the owner.

Then rebuild to match. Compose from `components/kit/*`; where a prop
shape doesn't fit, thin mapper **in the screen file** — never fork the
kit.

## 3. Screen-specific notes

- **Two tabs — Products / Locations.** Check the mobile tab row at 390px;
  both tabs get the full treatment, not just the default one.
- **Drawers and the delete dialog belong to this screen** and the
  artboard may not draw them. They must still work and look deliberate at
  390px. Don't skip them because they're undrawn — but don't redesign
  them either; match the kit's existing drawer behaviour.
- **Products carry money** (buying / selling price). Mono figures, 2dp,
  no floating-point formatting drift.
- **The screen has grown since this artboard was drawn** (it is M2-era).
  Where the code has a feature the artboard is silent about, that is
  **not** licence to delete it — see §4.

## 4. Stop and ask the owner if

- **The code has functionality the artboard doesn't draw.** Do not delete
  a working feature to match a picture — list what you found and ask.
  This is the most likely question on this screen.
- The artboard needs a pattern the kit has no answer for.
- The artboard contradicts `design-principles.md` §9 (ENFORCED — §9
  wins; flag it).
- Matching mobile would regress desktop.

## 5. States the artboard doesn't draw

Must still look deliberate at 390px — tell the owner what you chose:

empty (no products / no locations) · loading · error + retry · a single
row · a very long product name · an archived/inactive row · the largest
realistic price without overflow.

## 6. Check + gates (run only these)

**Check** — same session, no separate QA:
- Drive it at **390px** as Admin. Also sanity-check **360px**.
- Exercise **both tabs**, and open each drawer + the delete dialog.
- **No horizontal page scroll.** Wide content scrolls in its own
  container.
- Re-screenshot and compare against `ROY-0` side by side. State plainly
  what still differs and why.
- Extend `tests/screens/catalog.screen.test.tsx` /
  `catalog-locations.screen.test.tsx` **only** if you changed interactive
  behaviour. Pure layout work needs no new test.

**Gates** — these four, nothing more:
```
pnpm vitest run tests/screens/catalog.screen.test.tsx tests/screens/catalog-locations.screen.test.tsx
pnpm typecheck                      # 0 errors
rm -rf .next && pnpm build
grep -rn "TODO(mock)" --include="*.ts" --include="*.tsx" app lib components
```
Nothing new from the grep. (`lib/domain/stock/purchases.test.ts:61` is a
test description, not a marker.)

Run the full `pnpm test` **only** if you touched `lib/` or a kit
component.

## 7. When done

- A flow doc under `docs/design/flows/` only if a real design decision
  was made.
- `docs/PROGRESS.md` — a short entry: what changed, gate state, the
  walkthrough result, anything still open.
