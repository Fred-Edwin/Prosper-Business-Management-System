# Component Kit Audit — Handoff Brief

**Role for this session:** QA Engineer (audit only — do NOT fix anything,
do NOT edit any file). Output is a written report, nothing else.

## Why this exists

Sprint 06 exported a 28-file component kit (`components/kit/`) from the
approved Paper "Prosper Hotel" file by pulling `get_computed_styles` /
`get_tree_summary` on each Component Kit artboard. A later spot-check
found that while most primitives matched Paper exactly (button, text
input, tables, tabs), at least two — `stat-tile-row.tsx` and
`dense-summary-strip.tsx` — silently dropped a real design dimension
(per-value semantic color) that Paper's artboards clearly show. That was
found by accident while debugging one screen, not by a systematic pass.

This session's job: do that systematic pass, for every kit component,
and report findings. A second session will separately audit how screens
*use* these components — don't do that here, and don't fix anything here
either. This is diagnosis, not repair.

## Read first

1. `docs/design/design-principles.md` — binding house rules, kit artboard
   table (§7), token snapshot (§6).
2. `docs/design/paper-workflow-lessons.md` — known Paper-extraction
   gotchas.
3. `docs/CONVENTIONS.md` §2 (naming) — just enough to recognize whether
   a mismatch is a real bug or an intentional convention.

## Paper file

https://app.paper.design/file/01M0EZ7TAHZM26KBMWNYT0928X/1-0 (page
"Shell+Component kit"). Call `get_guide({topic: "paper-mcp-instructions"})`
once at the start. Tokens are current (`contentHash.tokens: 710ac1c5`) —
no need to re-pull `lib/tokens.css`.

**Known MCP reliability issue:** `get_jsx` and `get_font_family_info` are
sometimes blocked by an auto-mode classifier. `get_computed_styles` works
reliably in small batches — request at most 2 nodeIds per call.

## Component Kit artboards (Paper `get_basic_info` artboard IDs)

| Kit area | Artboard ID | Components inside |
|---|---|---|
| Buttons & Actions | `6BR-0` | `button.tsx`, `icon-button.tsx` |
| Form Controls | `6CG-0` | `text-input.tsx`, `select.tsx`, `segmented-control.tsx`, `toggle-switch.tsx`, `textarea.tsx`, `date-picker.tsx` |
| Chips & Status | `6DJ-0` | `status-chip.tsx`, `condition-chip.tsx` |
| Tables | `6ET-0` | `simple-table.tsx`, `dense-ledger.tsx` |
| Tabs & Filters | `6IW-0` | `tabs.tsx`, `pill-filter.tsx` |
| Drawers & Dialogs | `6OE-0` | `drawer.tsx`, `friction-delete-dialog.tsx` |
| Stat Tiles & KPI | `6R4-0` | `stat-tile-row.tsx`, `dense-summary-strip.tsx` |
| Banners & Cards | `6SB-0` | `banner.tsx` (4 variants: Transfer/PurchaseDelivery/CalculatedImpact/Info), `match-card.tsx` |
| Bulk Entry Grid | `6TT-0` | `bulk-entry-grid.tsx` |
| Utility & Layout | `6WD-0` | `search-input.tsx`, `breadcrumb.tsx`, `instructional-banner.tsx`, `bottom-nav.tsx`, `flow-header.tsx`, `action-tile-grid.tsx` |
| Bottom Sheet | `6Z4-0` | `bottom-sheet.tsx` |

Shells (also in scope — same audit method, they're primitives too):

| Shell | Artboard ID(s) | File |
|---|---|---|
| Admin Shell — Desktop, full sidebar | `649-0` | `components/shells/admin-shell.tsx` |
| Admin Shell — Desktop, collapsed/icon-rail | `67T-0` | same file, `collapsed` prop |
| Mobile Shell — Staff | `4Y-0` | `components/shells/staff-shell.tsx` |
| Mobile Shell — Admin | `6B1-0` | `components/shells/mobile-shell-admin.tsx` |
| Mobile Shell — Sidebar Drawer Open | `1ZP-0` | `components/shells/mobile-nav-drawer.tsx` |

## Method — for every component, in this order

1. `get_screenshot` on the artboard for a quick visual reference.
2. `get_tree_summary` (depth 3-4) on the artboard to see every state the
   component was actually designed with (Paper often shows 3-6 variants
   side by side on one artboard — e.g. Buttons shows primary/secondary/
   tertiary/destructive/disabled/icon in one row).
3. `get_computed_styles` on the key nodes for EVERY state shown (2
   nodeIds per call max) — height, padding, gap, colors, font
   size/weight, border. Do not skip a state because it "looks similar."
4. Read the corresponding file in `components/kit/` (or `components/shells/`)
   in full.
5. Compare line by line:
   - Does every visual state Paper shows have a corresponding code path?
     (e.g. if Paper shows 4 button variants + disabled, does
     `button.tsx` implement all 5?)
   - Do measured pixel values match the Tailwind classes/arbitrary
     values in code? (e.g. Paper says `height: 36px` → code should say
     `h-9` or `h-[36px]`, not `h-8` or `h-10`.)
   - Do colors match the token names, not just "look close"? (e.g.
     Paper's warning value should map to `text-warning`/`var(--color-warning)`,
     not a hardcoded amber hex or the wrong semantic token.)
   - Is any dimension of the design entirely unimplemented — not a wrong
     value, but a missing capability? (This is what happened with
     `stat-tile-row.tsx`: Paper color-codes each tile's value by
     semantic meaning; the `StatTile` TypeScript type has no field for
     it at all, so no screen can ever render it correctly no matter what
     data it passes in. That is a **type-level gap**, not a styling
     mismatch — look for this pattern specifically, it's the most
     expensive kind of bug because every consumer inherits it silently.)

## What NOT to flag

- Minor structural looseness that doesn't produce a visible difference
  at real screen widths (e.g. Paper uses a fixed `616px` column width,
  code uses `grow` with a `minWidth` — flag it only if you can show it
  actually renders differently, not just "differs in the JSX").
- Decorative interaction states Paper never designed (hover/press
  feedback with no explicit Paper artboard state) — house rule is
  hover = subtle shift, focus = 2px accent ring, disabled = reduced
  opacity. Don't flag the absence of a hover state Paper never showed.
- Anything already correctly implemented — don't pad the report with
  confirmations, only report actual defects.

## Output format

A markdown report, one entry per confirmed defect, ranked most-severe
first (type-level/missing-capability bugs before pixel-value mismatches
before minor structural looseness). For each:

```
### `components/kit/<file>.tsx` — <one-line summary>

**Paper reference:** artboard `<id>`, node(s) `<id(s)>`
**What Paper shows:** <concrete description, with the exact measured
value(s) or the semantic behavior>
**What the code does instead:** <concrete description, cite the actual
line(s)>
**Why it matters:** <what visibly breaks on real screens because of
this — cite a specific screen if you know one uses this component>
```

End with a one-paragraph summary: how many components audited, how many
clean, how many defective, and whether the defects cluster in one kit
area (e.g. "everything with a color/semantic dimension is under-built")
or are scattered/random.

Do not fix anything. Do not touch git. Report back when done.
