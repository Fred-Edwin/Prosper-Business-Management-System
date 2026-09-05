# Mobile parity VERIFY — Financials (`/admin/financials`) — HANDOFF

**For:** a fresh agent. Everything you need is in this file.

**This is a verify-then-fix session, not a rebuild.** This screen's
mobile rendering was already built against the artboard by the measured
method. What was never done is a rendered-vs-artboard comparison. If the
diff is empty, say so and stop — do not manufacture work.

Desktop is signed off. **Do not regress it.**

---

## The artboard

| | |
|---|---|
| **Open** | https://app.paper.design/file/01M0EZ7TAHZM26KBMWNYT0928X/8-0/PN6-0 |
| **File** | `Prosper Hotel` (`01M0EZ7TAHZM26KBMWNYT0928X`) |
| **Page** | `approved mobile screens` (`8-0`) |
| **Artboard** | `Financials — mobile [v2]` — node **`PN6-0`**, 390px wide |
| **Desktop twin** | `Financials — desktop [v2]` (`PGB-0`) on page `M5 — Dashboard & Audit` (`6-0`) — reference only, shipped |

`get_screenshot("PN6-0")` to see it. `get_tree_summary("PN6-0", depth: 5)`
to work from it.

---

## 0. Rules (binding)

- CLAUDE.md applies. **pnpm only.**
- Post a visible-progress checklist (TodoWrite if available).
- **Do not commit** unless the owner asks.
- Do not touch `components/shells/*` or the desktop branches.

## 1. What was already built (M5 v2 Session C)

Read `docs/PROGRESS.md` → the **Session C** entry, and
`docs/design/flows/financials-screen.md` → **"Structure (v2 — current)"**
(the M5 section below it is superseded).

Mobile values were pulled from `PN6-0` with `get_computed_styles` and
implemented as:

| element | value |
|---|---|
| body padding / gap | `16px` / `16px` |
| KPI tile padding | `12px` block, `14px` inline |
| KPI tile gap | `3px` |
| KPI layout | 2×3 grid (not a scroller) |
| Debts row | `11px` block, `16px` inline |
| Debts "view all" row | `10px`, centred, `--surface-subtle` |
| Transactions zone | `2px --border-strong` top rule, `16px` pad, `12px` gap |
| Non-sale card | `12px` block, `5px` gap, `1px` top rule |

Files: `app/admin/financials/kpi-strip.tsx`, `debts-card.tsx`,
`non-sale-tab.tsx`, `non-sale-drawer.tsx`, `financials-client.tsx`.

## 2. The method — do this, then decide

**Screenshots judge the result; they never source a value.**
(`docs/CONVENTIONS.md` §6.) Full explanation in `_METHOD.md` beside this
file.

1. `open_file` → confirm Paper's tokens match `app/globals.css`. If any
   differ, **stop and report**.
2. `get_tree_summary("PN6-0", depth: 5)`.
3. **Batch** `get_computed_styles` over the artboard nodes and compare
   against the table in §1. Pull **`flexGrow` / flex ratios explicitly**.
4. `pnpm dev`, sign in as **Admin / PIN 1234**, viewport **390px**,
   screenshot the real screen.
5. Compare side by side. Write the diff as an explicit `from → to` list.

**Then:** if it's empty or trivial, report that and stop. If it's real,
fix it — compose from `components/kit/*`, thin mapper in the screen file,
never fork the kit.

## 3. Known-open item to check while you're here

The **mobile tab chip order**. The artboard (`PPN-0`) sorts the *active*
chip toward the visible front, per ADR-66's mobile-filter convention. The
shipped screen instead keeps DOM order and scrolls the active tab into
view — a deliberate call, because a second re-ordered `<Tabs>` would put
a duplicate tablist (duplicate tab ids and all) into the accessibility
tree at every viewport.

Confirm the shipped behaviour is acceptable, or raise it with the owner.
**Do not** "fix" it by rendering two `<Tabs>`.

## 4. Stop and ask the owner if

- The artboard needs a pattern the kit has no answer for.
- The artboard contradicts `design-principles.md` §9 (ENFORCED — §9
  wins) or ADR-66.
- Matching mobile would regress desktop.

## 5. States already handled (verify, don't rebuild)

Non-sale: empty (headers stay visible) · loading skeleton · error+retry ·
`—` for an unresolvable cost or recorded-by.
Debts: empty ("No customer owes the business right now") · loading ·
error+retry.
KPI strip: `—` tiles before data; `<ErrorState>` on a failed read.

Check each renders sensibly at 390px.

## 6. Check + gates (run only these)

**Check:**
- Drive at **390px** as Admin. Also **360px**.
- All four period presets; all six tabs; the non-sale drawer.
- The Debts card must **not** change with the period (it's a balance).
- **No horizontal page scroll.**

**Gates** — these four, nothing more:
```
pnpm vitest run tests/screens/financials.screen.test.tsx
pnpm typecheck                      # 0 errors
rm -rf .next && pnpm build
grep -rn "TODO(mock)" --include="*.ts" --include="*.tsx" app lib components
```
Baseline: **26 tests** in that spec, all green. Nothing new from the grep
(`lib/domain/stock/purchases.test.ts:61` is a test description).

Run the full `pnpm test` **only** if you touched `lib/` or a kit
component.

## 7. When done

- `docs/design/flows/financials-screen.md` — only if a real decision was
  made.
- `docs/PROGRESS.md` — a short entry, including "diff was empty" if that
  is the honest result.
