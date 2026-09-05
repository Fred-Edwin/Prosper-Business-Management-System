# Mobile parity — Assets (`/admin/assets`) — HANDOFF

**For:** a fresh agent. Everything you need is in this file. This is the
whole session: make the mobile rendering of `/admin/assets` match its
approved Paper artboard, pixel for pixel.

Desktop is signed off. **Do not regress it.**

---

## The artboard

| | |
|---|---|
| **Open** | https://app.paper.design/file/01M0EZ7TAHZM26KBMWNYT0928X/8-0/J6D-0 |
| **File** | `Prosper Hotel` (`01M0EZ7TAHZM26KBMWNYT0928X`) |
| **Page** | `approved mobile screens` (`8-0`) |
| **Artboard** | `Admin Assets — mobile, populated [M2-A2]` — node **`J6D-0`**, 390px wide |

This is the **approved, final** mobile design for this route (owner
confirmed). Build to it.

`get_screenshot("J6D-0")` to see it. `get_tree_summary("J6D-0", depth: 5)`
to work from it.

---

## 0. Rules (binding)

- CLAUDE.md applies. **pnpm only.**
- Post a visible-progress checklist (TodoWrite if available) and update it
  as you go.
- **Do not commit** unless the owner asks.
- Do not touch `components/shells/*` or the desktop branches of
  `assets-client.tsx`.

## 1. Read (only this — don't go wider)

- `app/admin/assets/assets-client.tsx` — the screen.
- `app/admin/assets/asset-drawer.tsx`, `asset-delete-dialog.tsx` — part
  of this screen; see §3.
- `app/admin/financials/debts-card.tsx` — a mobile card/row pattern built
  by the measured method. Copy its approach.

## 2. The method — this is the session

**Screenshots judge the result; they never source a value.**
(`docs/CONVENTIONS.md` §6.) Every number comes from
`get_computed_styles`. Full explanation in `_METHOD.md` beside this file.

1. `open_file` → confirm Paper's tokens match `app/globals.css`. They
   should be identical. If any differ, **stop and report** — never invent
   a mapping.
2. `get_tree_summary("J6D-0", depth: 5)` → the structure you're building.
3. **Batch** `get_computed_styles` over every node you'll build. Pull
   **`flexGrow` / flex ratios explicitly** — row lane alignment lives
   there and is invisible in a screenshot. This is the step that
   separates pixel-perfect from "close but off".
4. `pnpm dev`, sign in as **Admin / PIN 1234**, viewport **390px**,
   screenshot the real screen.
5. Write the diff as an explicit list — each item with its exact
   `from → to` value — **before changing any code**. Show the owner.

Then rebuild to match. Compose from `components/kit/*`; where a prop
shape doesn't fit, thin mapper **in the screen file** — never fork the
kit.

## 3. Screen-specific notes

- **This is the smallest of the admin screens.** If the measured diff
  turns out to be genuinely small, say so plainly and stop — do not
  manufacture changes to justify the session.
- **The artboard is titled "populated"** — it draws only the full-list
  case. §5 is therefore the bulk of the judgment here.
- **The drawer and delete dialog belong to this screen** and are likely
  undrawn. They must still work and look deliberate at 390px — match the
  kit's existing drawer behaviour rather than redesigning.
- Asset values are money — mono figures, 2dp, no floating-point drift.

## 4. Stop and ask the owner if

- **The code has functionality the artboard doesn't draw.** Do not delete
  a working feature to match a picture — list what you found and ask.
- The artboard needs a pattern the kit has no answer for.
- The artboard contradicts `design-principles.md` §9 (ENFORCED — §9
  wins; flag it).
- Matching mobile would regress desktop.

## 5. States the artboard doesn't draw

The artboard is the populated case only. Each of these must look
deliberate at 390px — tell the owner what you chose:

empty (no assets yet) · loading · error + retry · a single asset · a very
long asset name · the largest realistic value without overflow.

## 6. Check + gates (run only these)

**Check** — same session, no separate QA:
- Drive it at **390px** as Admin. Also sanity-check **360px**.
- Open the drawer (create *and* edit) and the delete dialog.
- **No horizontal page scroll.** Wide content scrolls in its own
  container.
- Re-screenshot and compare against `J6D-0` side by side. State plainly
  what still differs and why.
- Extend `tests/screens/assets.screen.test.tsx` **only** if you changed
  interactive behaviour. Pure layout work needs no new test.

**Gates** — these four, nothing more:
```
pnpm vitest run tests/screens/assets.screen.test.tsx
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
