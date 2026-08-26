# Screen Export Audit — Handoff Brief

**Role for this session:** QA Engineer (audit only — do NOT fix
anything, do NOT edit any file, except optionally
`docs/design/screens/admin-financials-full-table/page.tsx` which is
explicitly out of scope — see note below). Output is a written report,
nothing else.

## Why this exists

Sprint 06 exported 21 screens + Login from the approved Paper "Prosper
Hotel" file into `docs/design/screens/<slug>/page.tsx` +
`mock-data.ts`, composed from `components/kit/*` and
`components/shells/*`. A manual review by the project owner found the
live `/design-preview/*` routes look meaningfully different from their
Paper artboards — cramped spacing, wrong table structure, wrong heading
scale, a card grid used where Paper actually has a full-width table.

One screen (`admin-financials-full-table`) was already hand-audited and
fixed as a proof of concept — **do not re-audit that screen**, its
current state is correct, use it only as a worked example of the kind of
gap to look for (see §3 below).

A prior session separately audited the component kit itself (not
screens) and found two real component-level defects: `stat-tile-row.tsx`
and `dense-summary-strip.tsx` don't support per-value semantic color,
even though Paper clearly color-codes those values. That report is at
`docs/sprints/component-audit-report.md` — **read it in full before
starting**. Any screen you audit that uses `StatTileRow` or
`DenseSummaryStrip` will show a color mismatch that is NOT that screen's
fault — attribute it to the known kit defect, don't re-report it as a
screen bug, and don't try to fix it by hacking around it in the screen
file.

## Read first

1. `docs/sprints/component-audit-report.md` — the component-level
   findings (see above). This tells you which visual gaps are
   "inherited from the kit" vs. "this screen's own mistake."
2. `docs/design/design-principles.md` — binding house rules.
3. `docs/design/paper-workflow-lessons.md` — known Paper-extraction
   gotchas.
4. `docs/CONVENTIONS.md` §4 — the `TODO(mock)` convention (so you can
   tell mock-data issues from layout issues).

## Paper file

https://app.paper.design/file/01M0EZ7TAHZM26KBMWNYT0928X/1-0 (page
"Shell+Component kit"). Call `get_guide({topic: "paper-mcp-instructions"})`
once at the start. Tokens are current (`contentHash.tokens: 710ac1c5`).

**Known MCP reliability issue:** `get_jsx` / `get_font_family_info`
sometimes blocked by an auto-mode classifier. `get_computed_styles`
works reliably in small batches — max 2 nodeIds per call.

## Screens to audit (20 — Login and Financials already verified, skip both)

| Screen | Artboard id | Slug |
|---|---|---|
| Admin Catalog — Product Catalog | `6ZO-0` | `admin-catalog-product-catalog` |
| Admin Catalog — Mobile | `8L7-0` | `admin-catalog-mobile` |
| Product Drawer — Create/Edit | `796-0` | `product-drawer` |
| Product Delete Dialog | `797-0` | `product-delete-dialog` |
| Admin Stock — Desktop Ledger (Full Width) | `798-0` | `admin-stock-ledger-full-width` |
| Admin Stock — Desktop Ledger (Sidebar Collapsed) | `7G9-0` | `admin-stock-ledger-sidebar-collapsed` |
| Admin Stock — Desktop Ledger (Drawer Open) | `7LJ-0` | `admin-stock-ledger-drawer-open` |
| Admin Stock — Mobile | `8Q4-0` | `admin-stock-mobile` |
| Bulk Opening Stock Grid | `7UD-0` | `bulk-opening-stock-grid` |
| Admin Financials — Payment Drawer Open | `85W-0` | `admin-financials-payment-drawer-open` |
| Admin Assets Register | `8DL-0` | `admin-assets-register` |
| Asset Delete Dialog | `8IV-0` | `asset-delete-dialog` |
| Asset Drawer — Create/Edit | `8JO-0` | `asset-drawer` |
| Store Manager Mobile Hub | `8T3-0` | `store-manager-mobile-hub` |
| Store Manager Flows — Issues & Production | `8XH-0` | `store-manager-flows-issues-production` |
| Store Manager Flows — Transfers & Consumption | `92M-0` | `store-manager-flows-transfers-consumption` |
| Store Manager — Stock Levels | `986-0` | `store-manager-stock-levels` |
| Canteen Mobile Operations Hub | `9BA-0` | `canteen-mobile-operations-hub` |
| Canteen — Transfer Dispatch | `9FE-0` | `canteen-transfer-dispatch` |
| Canteen — Stock Levels | `9GW-0` | `canteen-stock-levels` |

## Method — for every screen, in this order

1. `get_screenshot` on the artboard for the visual reference.
2. Read `docs/design/screens/<slug>/page.tsx` and `mock-data.ts` in
   full.
3. `get_tree_summary` (depth 4-5) on the artboard's content subtree —
   every admin/staff screen artboard splits into a shell subtree
   (already correct, built in Sprint 06, don't re-audit shell internals
   here) and a content/body subtree (the actual screen work, and where
   bugs live). Identify which is which from the root children before
   drilling in.
4. For every structural container in the content subtree (toolbar
   rows, table headers, table rows, footers, card grids vs. tables,
   section headings) — `get_computed_styles` on the real node (2 at a
   time), and compare the measured value against what the screen's code
   actually renders.
5. Specifically check for these failure patterns (found in the
   Financials worked example, likely to recur):
   - **Hand-rolled markup instead of a kit component.** If Paper shows
     a "Simple Table" or "Dense Ledger" pattern but the screen's
     `page.tsx` builds raw `<div>` rows instead of importing
     `SimpleTable`/`DenseLedger`, that's a defect even if the numbers
     happen to look close — it's the reason numbers drift screen to
     screen.
   - **Invented structure not in Paper.** e.g. an extra toolbar row, an
     extra wrapper card, a grid used for what Paper actually laid out
     as a full-width list/table.
   - **Wrong type-scale token** (e.g. `text-h1` where Paper measures
     `text-h2`, or vice versa) — cross-check against
     `lib/tokens.css`'s scale, don't eyeball "looks about the right
     size."
   - **Wrong container width behavior** — full-width in Paper vs.
     constrained/grid-boxed in code, or vice versa.
   - **Missing states** — if Paper's artboard for this exact screen
     shows a specific chip tone, drawer state, or disabled control that
     the mock data / JSX doesn't reproduce.
6. Cross-check any color/tone-related visual gap against
   `docs/sprints/component-audit-report.md` before reporting it — if
   it's a `StatTileRow`/`DenseSummaryStrip` color issue (or any other
   confirmed kit defect from that report), note it as "inherited from
   kit defect, see component-audit-report.md" instead of writing a new
   finding.

## What NOT to flag

- Anything already covered by the component audit report as a kit-level
  defect — reference it, don't duplicate it.
- Minor sub-pixel/rounding differences with no visible effect.
- Decorative hover/press states Paper never explicitly designed.
- Anything correctly implemented — don't pad the report.

## Output format

A markdown report, one entry per screen, only for screens with at least
one confirmed defect (skip clean screens silently, just count them in
the summary). For each defect:

```
### `<slug>` — <one-line summary>

**Paper reference:** artboard `<id>`, node(s) `<id(s)>`
**What Paper shows:** <concrete description with measured values>
**What the code does instead:** <concrete description, cite file + line>
**Category:** hand-rolled-vs-kit-component | invented-structure |
wrong-scale-token | wrong-container-width | missing-state |
inherited-kit-defect
**Why it matters:** <visible consequence>
```

End with a one-paragraph summary: how many screens audited, how many
clean, how many defective, whether defects cluster by screen type
(desktop admin vs. mobile staff vs. drawers/dialogs) or by pattern
(e.g. "every screen with a secondary/reconciliation table has the same
grid-vs-table mistake").

Do not fix anything. Do not touch git. Report back when done.
