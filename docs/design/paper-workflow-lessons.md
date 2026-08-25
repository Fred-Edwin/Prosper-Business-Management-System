# Paper Workflow Lessons

Running log of Paper.design MCP-workflow gotchas discovered during the
Sprint 05 screen reassembly effort, and how to avoid or fix them. Update
this file whenever a new lesson is learned — it isn't sprint-scoped,
it's a standing reference for any future session working in this Paper
file.

---

## 1. Layout containment doesn't propagate automatically

Paper's flex layout does not clip a wide child unless *every* frame in
the ancestor chain explicitly declares a `width`/`maxWidth` (or
`overflow`). A single un-constrained ancestor lets a wide table or
toolbar silently balloon the whole content column past its intended
bound, which then throws off siblings (e.g. a filter bar's trailing
controls get pushed off-artboard).

**Fix:** when a screen has a wide content element (a dense table, a
long toolbar), check `get_node_info` on every frame from the content
root up to the wide element itself, confirming each has an explicit
width/maxWidth. Don't assume `flexGrow: 1` alone will clip — it won't.

## 2. `duplicate_nodes` preserves source layer names

Cloning a template row (or any repeated element) keeps the source's
generic name verbatim — e.g. five duplicated ledger rows all show up as
"Ledger Header" in the tree. This makes the layer tree hard to read and
easy to misidentify by ID alone.

**Fix:** immediately after duplicating repeated elements, call
`rename_nodes` with the real identity (e.g. "Row — Beef Fillet") before
doing anything else with those node IDs.

## 3. Duplicating from inside a Component Kit artboard nests the clone

If the source node lives inside another artboard (a Component Kit
artboard, or any other screen), the duplicate is placed as a child of
that same parent artboard — not as a new top-level artboard. Setting
`top`/`left` via `update_styles` in this state silently repositions the
clone *within its parent* instead of moving it on the canvas, which
looks like nothing happened.

**Fix:** after any duplication meant to become its own screen, call
`get_node_info` and check `parentId`. If it isn't `root_node_1-0`, call
`move_nodes` with `parentId: 'root'` to lift it out **before** setting
position. Never trust a position update until `parentId` is confirmed.

## 4. Screenshotting an isolated (non-artboard) node renders on Paper's dark canvas

`get_screenshot` on a node that is itself an artboard renders correctly
against that artboard's own background. But `get_screenshot` on an
*inner* frame (a table, a card, a row) that doesn't have its own
opaque background renders against Paper's dark canvas color behind it —
which can look like a color/contrast bug (e.g. white text on black)
that isn't actually there.

**Fix:** for final verification, always screenshot the top-level
artboard, not an inner sub-frame. Use inner-node screenshots only for
zoomed-in detail checks, and mentally discount their background color.

## 5. `justify-content: space-between` on a two-child row breaks with an icon + text pattern

A common pattern — icon + text-block as two children of a row — reads
as "icon, gap, text" only if the row uses `gap` and left-alignment. If
that row is set to `justify-content: space-between` (often inherited
from a cloned pattern that originally had more children), the icon and
text get pushed to opposite ends of the row's full width instead of
sitting adjacent, producing a large accidental gap.

**Fix:** rows with exactly two children that should sit close together
need `justify-content: flex-start` (or `normal`) plus an explicit
`gap` — never `space-between` unless the intent is genuinely to push
content to both edges.

## 6. Nav-item deactivation must be verified per-duplicate, not assumed from a descendantIdMap key

When duplicating a shell (Admin Shell, Mobile Shell) repeatedly across
many screens, it's tempting to reuse the same "this key in the
descendantIdMap is always the Dashboard nav frame" assumption from a
previous duplication. The map keys are stable per source node ID, but
which *new* ID they resolve to changes every time, and copy-paste
errors compound silently — the result is a shell where the wrong nav
item (or no nav item) shows as active, and it's easy to miss in a quick
screenshot glance.

**Fix:** after every shell duplication, use `find_nodes` with the
target nav label's text (e.g. `textValue: "Dashboard"`) to get the
*actual* node ID for that duplicate, rather than reusing an assumed key
from the `descendantIdMap`. Confirm both the outgoing (deactivated) and
incoming (activated) nav items before moving on.

## 7. Flex-wrap grids need explicit `flexBasis`, not just `flexGrow`, for uniform box sizing

A `flex-wrap` container with children that only set `flexGrow: 1` (no
`flexBasis`) will size each child by its *content*, not by an even
share of the row — so a 2x2 grid of action tiles can render as two
narrow tiles on the first row and two full-width tiles on the second,
even though visually a uniform grid was intended.

**Fix:** give every tile in a wrap-grid an explicit `flexBasis: calc(50% - <half-gap>)`
(or equivalent) alongside `flexGrow: 0`, so all tiles size uniformly
regardless of content length.
