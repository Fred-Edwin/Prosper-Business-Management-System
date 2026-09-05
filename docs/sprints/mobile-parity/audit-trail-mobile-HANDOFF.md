# Mobile parity — Audit trail (`/admin/audit-trail`) — HANDOFF

**For:** a fresh agent. Everything you need is in this file. This is the
whole session: make the mobile rendering of `/admin/audit-trail` match
its approved Paper artboard, pixel for pixel.

Desktop is signed off. **Do not regress it.**

---

## The artboard

| | |
|---|---|
| **Open** | https://app.paper.design/file/01M0EZ7TAHZM26KBMWNYT0928X/8-0/OEA-0 |
| **File** | `Prosper Hotel` (`01M0EZ7TAHZM26KBMWNYT0928X`) |
| **Page** | `approved mobile screens` (`8-0`) |
| **Artboard** | `Audit trail — mobile [M5]` — node **`OEA-0`**, 390px wide |
| **Desktop twin** | `Audit trail — desktop [M5]` (`O7P-0`) on page `M5 — Dashboard & Audit` (`6-0`) — reference only |

This is the **approved, final** mobile design for this route (owner
confirmed). Build to it.

`get_screenshot("OEA-0")` to see it. `get_tree_summary("OEA-0", depth: 5)`
to work from it.

---

## 0. Rules (binding)

- CLAUDE.md applies. **pnpm only.**
- Post a visible-progress checklist (TodoWrite if available) and update it
  as you go.
- **Do not commit** unless the owner asks.
- Do not touch `components/shells/*` or the desktop branches of
  `audit-trail-client.tsx`.
- `<FilterToolbar>` is a **kit** component — never fork it. See §3.

## 1. Read (only this — don't go wider)

- `app/admin/audit-trail/audit-trail-client.tsx` — the screen.
- `docs/DECISIONS.md` → **ADR-66**, in full. It came directly out of
  building this screen.
- `app/admin/financials/kpi-strip.tsx` + `debts-card.tsx` — the only
  mobile components built by the measured method. Copy their approach.

## 2. The method — this is the session

**Screenshots judge the result; they never source a value.**
(`docs/CONVENTIONS.md` §6.) Every number comes from
`get_computed_styles`. Full explanation in `_METHOD.md` beside this file.

1. `open_file` → confirm Paper's tokens match `app/globals.css`. They
   should be identical. If any differ, **stop and report** — never invent
   a mapping.
2. `get_tree_summary("OEA-0", depth: 5)` → the structure you're building.
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

- **This artboard is current (M5)** — the screen and the design were
  built together in Session 15. Expect a genuine, narrow parity diff
  rather than a rebuild.
- **ADR-66 came out of this screen.** The kit `<FilterToolbar>` mobile is
  **one all-visible horizontal-scroll row of real controls**; the old
  "3 chips + More → BottomSheet" overflow was removed because the Entity
  filter and the "Show everything" toggle ended up hidden inside it.
  Verify the shipped screen actually matches the ADR — the artboard drew
  this pattern *before* the kit implemented it.
- **Four filters + a toggle + pagination is a lot at 390px.** Every
  control must be reachable without a horizontal *page* scroll — the
  filter row scrolls in its own container.
- **Rows expand** to a "what changed" detail. Check the **expanded**
  state at 390px, not just the collapsed list.
- **Long values are the real truncation risk** — actor names, entity ids,
  and JSON-ish before/after diffs.

## 4. Stop and ask the owner if

- The artboard needs a pattern the kit has no answer for (including
  anything `<FilterToolbar>` can't express).
- The artboard contradicts `design-principles.md` §9 (ENFORCED — §9
  wins; flag it) or ADR-66.
- The code has functionality the artboard doesn't draw — don't delete it
  to match a picture; ask.
- Matching mobile would regress desktop.

## 5. States the artboard doesn't draw

Must still look deliberate at 390px — tell the owner what you chose:

empty (no entries for the filter) · loading · error + retry · a single
entry · the last page / pagination edges · a very long actor name or
entity id · a large before/after diff in the expanded row.

## 6. Check + gates (run only these)

**Check** — same session, no separate QA:
- Drive it at **390px** as Admin. Also sanity-check **360px**.
- Exercise **every filter**, the "Show everything" toggle, pagination,
  and an **expanded** row.
- **No horizontal page scroll.** The filter row scrolls inside itself.
- Re-screenshot and compare against `OEA-0` side by side. State plainly
  what still differs and why.
- Extend `tests/screens/admin-audit-trail.screen.test.tsx` **only** if
  you changed interactive behaviour. Pure layout work needs no new test.

**Gates** — these four, nothing more:
```
pnpm vitest run tests/screens/admin-audit-trail.screen.test.tsx
pnpm typecheck                      # 0 errors
rm -rf .next && pnpm build
grep -rn "TODO(mock)" --include="*.ts" --include="*.tsx" app lib components
```
Nothing new from the grep. (`lib/domain/stock/purchases.test.ts:61` is a
test description, not a marker.)

Run the full `pnpm test` **only** if you touched `lib/` or a kit
component (a `<FilterToolbar>` change would need it — but ask before
changing the kit at all).

## 7. When done

- A flow doc under `docs/design/flows/` only if a real design decision
  was made.
- `docs/PROGRESS.md` — a short entry: what changed, gate state, the
  walkthrough result, anything still open.
