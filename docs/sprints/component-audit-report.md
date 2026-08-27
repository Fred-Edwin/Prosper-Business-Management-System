# Component Kit Audit Report

**Session role:** QA Engineer (audit only — no files were fixed, edited, or
touched in the codebase; no git commands were run). This report is the
sole output of that audit session (its handoff brief has since been
deleted as a spent husk). Kept as the record of what the kit audit found
and the running checklist of known-suspect patterns for the kit-rebuild
session.

**Scope:** All 28 files in `components/kit/` and all 4 files in
`components/shells/`, checked against every state shown on the 11
Component Kit artboards (`6BR-0` through `6Z4-0`) and 5 shell artboards
(`649-0`, `67T-0`, `4Y-0`, `6B1-0`, `1ZP-0`) in the "Prosper Hotel" Paper
file, page "Shell+Component kit". Method followed exactly as specified in
the handoff brief: screenshot → tree summary (depth 3-5) → computed
styles on every visible state (2 nodeIds/call) → full file read → line-
by-line comparison.

**Not in scope:** How screens *use* these components (a separate session's
job). Nothing was fixed.

---

## Findings, ranked most-severe first

### `components/kit/segmented-control.tsx` — no semantic-tone capability; Edit Asset drawer's Condition selector can never render its designed colors

**Paper reference:** artboard `6OE-0`, node `6QQ-0` (Condition segmented
control inside "Edit Drawer"), active option node `6QR-0`/`6QS-0`
("Good").

**What Paper shows:** The Condition segmented control's active-option
label is colored by the semantic meaning of the value, not the generic
accent: "Good" renders in `var(--color-success)` (green). By the same
pattern established elsewhere in the kit (status chips, condition chips),
"Needs Repair" and "Decommissioned" would be expected to render in
`--color-warning` and `--color-danger` respectively when active. This is
a materially different treatment from the generic Product Kind segmented
control shown in the same kit (`6DC-0`), whose active label is plain
`--color-accent`.

**What the code does instead:** `SegmentedControl<T>` (`segmented-control.tsx`
lines 4-15) has a single hardcoded active style: `"bg-surface-page
font-medium text-accent shadow-[...]"` (line 35). `SegmentedControlOption<T>`
has no field for a per-option semantic tone. There is no way for any
consumer to reproduce Paper's green/amber/red active-state coloring — the
component always renders accent-purple when active, full stop.

**Why it matters:** This is a type-level gap, the same class of bug as
the already-known `stat-tile-row.tsx` issue: no consumer can ever render
the correct output no matter what data it passes in. The Asset
Drawer/Condition editor (used on the Admin Assets Register, artboard
`8DL-0`, and the Asset Drawer, artboard `8JO-0`) is the concrete consumer
that needs this and currently cannot get it from the shared kit.
`SegmentedControl` has zero other call sites in the codebase today
(`grep` confirms), so this gap is currently latent but will surface the
moment the Asset Drawer is wired up in a Development Sprint, unless the
type is fixed first.

---

### `components/kit/bulk-entry-grid.tsx` — no "not applicable at this location" cell state; every location cell is forced into the editable-accent style

**Paper reference:** artboard `6TT-0`, node `6TY-0` ("Grid Shell"),
compare node `6V1-0` (Beef Fillet × Store, editable) against `6V4-0`
(Beef Fillet × Restaurant, not applicable) and `6V7-0`/`6VH-0` (the other
not-applicable cells).

**What Paper shows:** Two distinct, clearly different visual states per
location cell:
- **Editable/applicable:** `border: 1px solid var(--color-accent)`,
  transparent background, value text `font-weight: 600 (semibold)`,
  `color: var(--text-primary)`.
- **Not applicable:** `background: var(--surface-subtle)`,
  `border: 1px solid var(--border-subtle)`, value text
  `font-weight: 400 (regular)`, `color: var(--text-disabled)`.

**What the code does instead:** `BulkEntryGrid` (lines 54-63) renders
every location cell identically: `"flex h-8 w-[110px] shrink-0 items-
center rounded-sm border border-solid border-accent px-2"` with a live
`<input type="number">` inside, always. `BulkEntryRow.quantities` is a
flat `Record<string, number>` with no per-cell applicability flag, so
there is no way to distinguish "this item isn't stocked at this location"
from "this item's quantity here happens to be 0."

**Why it matters:** The Bulk Opening Stock Grid (artboard `7UD-0`) is the
real screen this powers — a real inventory item is rarely valid at every
location. As built, every cell in every row always looks and behaves as
editable, silently misrepresenting which location/product combinations
are real. This is a type-level gap in the same family as the known
`stat-tile-row.tsx` bug.

---

### `components/shells/admin-shell.tsx` / `components/shells/mobile-nav-drawer.tsx` — brand mark is a plain "P" square, not the Prosper Hotel logo

**Paper reference:** artboard `649-0` node `67F-0` (desktop sidebar
brand mark), artboard `67T-0` node `6GQ-0` (collapsed rail), artboard
`1ZP-0` node `1ZT-0` (mobile drawer brand mark).

**What Paper shows:** In all three places, the brand mark is a fully
circular (`border-radius: calc(infinity*1px)`) image fill — an actual
logo photo asset
(`https://app.paper.design/file-assets/.../01M0VN1VB5J2R3GSKCSMFMPMSW.jpg`
on desktop, a second logo asset on the mobile drawer) — sized 30×30 on
the desktop sidebar, 28×28 on the collapsed rail, 32×32 in the mobile
drawer. This is exactly the masthead context design-principles.md §5
calls out as one of only two places the brand gold is allowed to appear.

**What the code does instead:**
- `admin-shell.tsx` line 141: `<div className="flex size-[30px] ... rounded-md bg-accent font-ui text-sm/sm font-semibold text-white">P</div>` — a purple *square* (`rounded-md`, not circular) with a plain letter "P", no image at all. The collapsed-rail variant has no brand mark rendered at all in the icon rail's top slot (only the toggle button, lines 104-108) — Paper's collapsed rail shows the logo mark at the very top (`6GQ-0`) above the toggle/hairline, which the code omits entirely.
- `mobile-nav-drawer.tsx` line 42: same `bg-accent` purple-square "P" pattern, 32×32.

**Why it matters:** This is the single most visually prominent brand
element in the entire Admin experience (top-left of every desktop and
mobile-admin screen) and it's currently generic and off-brand — no logo
image, wrong shape, and the deliberate accent-gold masthead exception
from design-principles.md §3/§5 is unimplemented. It affects `admin-
shell.tsx` (both sidebar states) and `mobile-nav-drawer.tsx` — three
render paths, one bug.

---

### `components/kit/dense-summary-strip.tsx` — no semantic-tone or trailing-alignment capability

**Paper reference:** artboard `6R4-0`, node `6RT-0` ("Strip"). Value
nodes: `6RX-0` ("Good: 16"), `6S1-0` ("Needs Repair: 1"), `6S5-0`
("Decommissioned: 1"), trailing item wrapper `6S7-0` ("Total Cost
Basis: KES 482,500.00").

**What Paper shows:** Two separate real dimensions the code drops:
1. **Per-item semantic color** — "Good" value is white, "Needs Repair"
   value is `var(--color-warning)` (amber), "Decommissioned" value is
   `var(--color-danger)` (red).
2. **Trailing/pushed-right item** — the "Total Cost Basis" wrapper has
   `margin-left: auto`, visually separating it to the far right of the
   strip from the left-clustered condition breakdown.

**What the code does instead:** `DenseSummaryStrip` (lines 9-20) renders
every item identically: `<span className="text-white/60">{label}:</span>
<span className="font-medium text-white">{value}</span>` with flat
`gap-8` between all items and no `margin-left: auto` concept.
`SummaryStripItem` has no `tone` field and no `pushRight`/`emphasize`
field (contrast this with the sibling `BulkEntryValuationFooter` in
`bulk-entry-grid.tsx`, which *does* implement an `emphasize` flag with
`ml-auto pr-0` — proving the pattern was already solved once in this
same sprint and just wasn't carried over here).

**Why it matters:** Same class of bug as `stat-tile-row.tsx` (already
known) — a missing capability, not a wrong value. Every consumer of
`DenseSummaryStrip` (e.g., Admin Assets Register's sticky footer,
artboard `8DL-0`) will show all values in flat white, left-clustered,
with no way to flag a "Needs Repair"/"Decommissioned" count in warning/
danger color or to separate a cost total to the trailing edge.

---

### `components/kit/action-tile-grid.tsx` — meta text hardcoded to accent; no way to express a non-actionable tile

**Paper reference:** artboard `6WD-0`, node `6YB-0` ("Row"). Compare
`6YK-0` ("1 Delivery Pending" under "Receive Goods") against `6YQ-0`
("Raw ingredients" under "Issue to Kitchen").

**What Paper shows:** `6YK-0` (a meaningful pending-count state) is
`color: var(--color-accent)`. `6YQ-0` (a plain descriptive subtitle, no
pending state) is `color: var(--text-tertiary)` — a neutral gray. Two
different tones for two different meanings.

**What the code does instead:** `ActionTileGrid` (line 27) renders
`meta` uniformly as `<span className="font-ui text-caption/caption text-
accent">{tile.meta}</span>` for every tile, with no field on `ActionTile`
to opt into the neutral/no-state treatment.

**Why it matters:** Every action tile's meta line will always render in
accent-purple regardless of whether there's actually a pending/actionable
state to highlight — e.g. "Raw ingredients" would incorrectly draw the
same visual attention as "1 Delivery Pending" on the real Store Manager/
Canteen mobile hubs (artboards `8T3-0`, `9BA-0`) that consume this
pattern. Lower severity than the type-level gaps above since a consumer
could still pass an empty string to reduce the effect, but the intended
semantic distinction is structurally unavailable.

---

### `components/shells/admin-shell.tsx` — collapsed sidebar icon buttons are 36px, Paper specifies 40px

**Paper reference:** artboard `67T-0`, node `6GW-0` ("Rail Icon —
Dashboard") and the other 10 rail icon frames — all `width: 40px; height:
40px`.

**What Paper shows:** Every collapsed-rail nav icon button is 40×40px.

**What the code does instead:** `admin-shell.tsx` line 120: `className={cn("flex
size-9 shrink-0 items-center justify-center rounded-sm outline-none", ...)}`
— `size-9` is 36px, not 40px.

**Why it matters:** A real, measurable pixel mismatch (36px vs 40px, an
~11% size difference) on every nav icon in the collapsed/icon-rail state
of the Admin Shell — used whenever an Admin maximizes a wide table per
design-principles.md §2's shell-level maximize/restore pattern (e.g. the
Ledger screens, artboards `798-0`/`7G9-0`). Smaller tap targets and a
visibly tighter icon rail than approved.

---

### `components/kit/dense-ledger.tsx` — Sold Value column not styled as a secondary/muted column

**Paper reference:** artboard `6ET-0`, node `6FR-0` ("Ledger Shell").
Sold Value cells: `6N2-0` ("—", Beef Fillet), `6NF-0` ("—", Rice
Basmati), `6NS-0` ("18,240.00", Grilled Chicken).

**What Paper shows:** Every row's Sold Value cell — dash or real value
alike — uses `color: var(--text-tertiary)`, distinct from every other
numeric column in the same row (which use `--text-primary` or the
signed success/danger colors). This is a deliberate, column-wide
secondary/muted treatment, not conditional on the value.

**What the code does instead:** `dense-ledger.tsx` line 116 hardcodes
`<span className="w-[100px] shrink-0 text-right font-mono text-sm/sm
text-text-primary">{fmtMoney(row.soldValue)}</span>` — always
`text-text-primary`, same weight as Closing/Closing Value, no muted
treatment.

**Why it matters:** On the Admin's single most-used screen (per
design-principles.md §4.3), the Sold Value column will read with the
same visual weight as the primary Closing/Closing Value columns instead
of the intended secondary/de-emphasized treatment, flattening a
hierarchy cue Paper built deliberately.

---

### `components/kit/status-chip.tsx` — "neutral" tone uses one token for both dot and label; Paper uses two different tokens

**Paper reference:** artboard `6DJ-0`, node `6E6-0` ("Chip — Neutral" /
"Closed"). Dot `6E7-0`, label `6E8-0`.

**What Paper shows:** Dot color `var(--text-tertiary)`, label color
`var(--text-secondary)` — two distinct gray tokens (gray-500 vs
gray-600).

**What the code does instead:** `status-chip.tsx` line 11:
`neutral: "bg-text-tertiary text-text-tertiary"` — same token for both
dot and label.

**Why it matters:** A subtle but real, measurable token mismatch: every
"neutral"-tone status chip (e.g. "Closed" handovers, inactive records)
renders its label one shade lighter than approved, reducing contrast
slightly against the house's already-restrained palette.

---

### `components/kit/bulk-entry-grid.tsx` — Category column not semantically colored

**Paper reference:** artboard `6TT-0`, nodes `6UZ-0` ("Ingredient") and
`6VK-0` ("Dish (Finished)").

**What Paper shows:** `6UZ-0` is `color: var(--color-info)` (blue),
`6VK-0` is `color: var(--color-warning)` (amber) — the Category column is
color-coded by product kind.

**What the code does instead:** `bulk-entry-grid.tsx` line 52 renders
`category` uniformly: `<span className="w-[110px] shrink-0 font-ui text-
sm/sm text-text-secondary">{row.category}</span>`.

**Why it matters:** Same missing-capability pattern as the other findings
in this file — `BulkEntryRow.category` is a plain string with no tone,
so the Bulk Opening Stock Grid can't distinguish ingredient vs.
dish/goods rows by color as designed, even though the rest of this same
component (the cell applicability state, above) shows Paper clearly
intended per-row-kind differentiation throughout this grid.

---

### `components/kit/tabs.tsx` — no continuous baseline hairline under the tab row

**Paper reference:** artboard `6IW-0`, node `6J1-0` ("Tab Row") —
`border-bottom: 1px solid var(--border-subtle)` on the row wrapper
itself, spanning its full width.

**What Paper shows:** A full-width hairline runs underneath the entire
tab row, with the active tab's `border-accent` (2px) sitting on top of
it, visually continuous even under inactive tabs and past the last tab.

**What the code does instead:** `Tabs` (line 22) wraps items in a plain
`<div className={cn("flex items-center", className)} role="tablist">`
with no border at all. Only individual tab buttons get `border-b-2` when
active (line 35); inactive tabs and the row have no divider.

**Why it matters:** Wherever `Tabs` doesn't fill the full available width
(e.g., a tab row followed by trailing toolbar controls, or simply not
spanning edge-to-edge), the area beyond/beside the tabs will have no
divider line at all, unlike Paper's continuous hairline — a visible gap,
not a decorative nicety Paper never designed.

---

### `components/kit/friction-delete-dialog.tsx` — hardcoded warning copy differs from Paper's approved copy

**Paper reference:** artboard `6OE-0`, node `6OU-0` (Dialog Body warning
text, "Friction Delete Dialog — Default" state).

**What Paper shows:** "You are about to permanently delete this record.
This will erase it and its history from every register and audit log.
This cannot be undone."

**What the code does instead:** `friction-delete-dialog.tsx` line 42:
"You are about to permanently delete this record. This will erase all
associated history and cannot be undone." — shorter, generic, drops the
"from every register and audit log" specificity that ties the warning to
this app's actual data model (ledgers/audit trail).

**Why it matters:** Lowest-severity finding in this report — a content/
copy mismatch, not a styling or capability defect. Flagged because the
brief calls for a line-by-line comparison and this is a concrete,
verifiable divergence from the approved Paper source, appearing on every
use of the shared Friction Delete Dialog (Product Delete, artboard
`797-0`; Asset Delete, artboard `8IV-0`).

---

## Summary

**28 kit files + 4 shell files audited** (all files in scope, matching
every state shown across all 11 Component Kit artboards and 5 shell
artboards).

- **Clean (no defect found):** `button.tsx`, `icon-button.tsx`,
  `text-input.tsx`, `select.tsx`, `toggle-switch.tsx`, `textarea.tsx`,
  `date-picker.tsx`, `condition-chip.tsx`, `simple-table.tsx`,
  `pill-filter.tsx`, `drawer.tsx`, `banner.tsx`, `match-card.tsx`,
  `search-input.tsx`, `breadcrumb.tsx`, `instructional-banner.tsx`,
  `bottom-nav.tsx`, `flow-header.tsx`, `bottom-sheet.tsx`,
  `staff-shell.tsx`, `mobile-shell-admin.tsx` — **21 files**.
- **Defective:** `segmented-control.tsx`, `bulk-entry-grid.tsx`,
  `admin-shell.tsx`, `dense-summary-strip.tsx`, `action-tile-grid.tsx`,
  `dense-ledger.tsx`, `status-chip.tsx`, `tabs.tsx`,
  `friction-delete-dialog.tsx`, `mobile-nav-drawer.tsx` — **10 files**
  (`stat-tile-row.tsx`, already known and reported prior to this
  session, is not re-counted here but remains open).

**Total confirmed defects: 11** across 10 files (one file,
`bulk-entry-grid.tsx`, has two independent defects).

**Clustering:** The defects cluster heavily and unambiguously around one
axis — **components with a semantic/conditional color or state
dimension are systematically under-built at the type level.**
`segmented-control.tsx`, `dense-summary-strip.tsx`, `action-tile-grid.tsx`,
`bulk-entry-grid.tsx` (category color), `dense-ledger.tsx` (muted
column), and `status-chip.tsx` all fail in the same shape as the
already-known `stat-tile-row.tsx` bug: Paper consistently designs a
per-value/per-item color or weight variation to carry meaning, and the
corresponding TypeScript type has no field to carry it, so no consumer
can ever reproduce the approved design regardless of the data it passes.
This is not a scattered/random set of one-off mistakes — it is one
recurring gap in how the Sprint 06 export handled color-as-data, and it
should be treated as a single systemic issue when scoped for repair, not
as unrelated bugs.

A second, smaller cluster is **brand-identity elements dropped during
export**: the circular hotel-logo image used in three separate places
(desktop sidebar, collapsed rail, mobile drawer) was replaced everywhere
with a generic purple "P" placeholder, plus one related pixel-value miss
(40px vs 36px rail icons) in the same shell file.

The remaining two findings (tab-row hairline, dialog copy text) are
genuinely scattered, low-severity, one-off misses unrelated to either
cluster.
