# HANDOVER — Session 3-DESIGN-FILTERS · Product Designer

**Paste this whole file as your first message in a fresh session.**
**docs/** + Paper only — no code. Concurrent with 3-KIT / 3a / 3b /
3-DOMAIN(done). **Blocks: 3-KIT-FILTER, 3e.**

---

## 0. Context / urgency + the exact problem

Prosper is overdue; pushing Submission 1 = M1 + M2 ("staff can sell every
day"), every screen matching Paper. You are the **Product Designer this
session only** (`CLAUDE.md`). No `.tsx`, no kit code, no M3.

**The bug we're killing:** several screens use a **dismissible-pill**
filter bar — artboard **`GQQ-0`** ("Filter Bar", currently on the A4
Canteen Derived Sales artboard `GL2-0`): pill chips like `Product ✕` /
`Date range ✕` that, when dismissed, **vanish with no way to reactivate
them from the UI**. QA flagged the built instances as inert
(F7-8). The owner's instruction: **replace every dismissible-pill filter
with the persistent labelled-dropdown toolbar** — artboard **`IEA-0`**:
`Cashier: Mary Njeri ▾` · `Payment: All ▾` · `📅 Today` ·
`☐ Corrected only` · right-aligned result count · `Reset` link (appears
only when a control is off its default). The value lives *inside* each
control; nothing is ever removed — you set it back to "All".

**Design A2 already created this pattern** for the merged Sales
artboards (`[M2-SA]` set) and converted the 7 A1 Customers artboards.
This session **rolls it out everywhere else** and makes it a **kit
component** so it can't drift (orchestrator decision 2026-08-31).

**In scope:** every screen with the `GQQ-0`-style dismissible-pill /
multi-filter bar. **Out of scope:** single category **tab-strips** on the
Stock Levels screens (`All · Ingredients · Goods · Dishes`) — those stay
as one-tap pills, do NOT convert them.

## 1. Mandatory reading (in this order — CLAUDE.md hard requirement)

1. `docs/design/design-principles.md` — **§9 ENFORCED contract**; §4;
   the token list in §6.
2. `docs/design/component-states.md` §2 (component-list + state-matrix
   conventions) and §9 (the `postVisit` assertion format). You'll add a
   `FilterToolbar` row.
3. `docs/design/kit-audit.md` §1 — the per-component before→after format.
4. `docs/design/export-workflow.md` — compose from proven kit; Paper is
   the visual acceptance target.
5. `docs/design/fidelity-audit-m1.md` — check which screens it already
   touched; don't duplicate.
6. `docs/sprints/milestone-2-session-7-qa-report.md` — **F7-8** (inert
   filter chips) full text.
7. `docs/sprints/handovers/_ORCHESTRATOR-STATE.md` — the filter-rollout
   decisions block + the 3-DESIGN-FILTERS / 3-KIT-FILTER / 3e rows.
8. Design A2's summary (in `_ORCHESTRATOR-STATE.md` session ledger) — the
   `[M2-SA]` filter-toolbar spec it already produced, and its escalation:
   *"filter-toolbar pattern is now the standard but only the merged Sales
   artboards use it so far … A1, A3-standalone, A4-standalone, Ledger,
   Assets need a re-spin."*

## 2. The two reference artboards

Paper file "Prosper Hotel" (`01M0EZ7TAHZM26KBMWNYT0928X`), page
"Shell+Component kit":
- **`GQQ-0`** — the OLD dismissible-pill "Filter Bar" (what we're
  removing). Also look for other instances of this pattern across the
  screen artboards.
- **`IEA-0`** — the NEW persistent labelled-dropdown toolbar (the
  target). This is the visual model for the component.
- The `[M2-SA]` merged-Sales artboards + the 7 converted A1 Customers
  artboards from Design A + A2 — the pattern as already applied.

`get_guide({ topic: "paper-mcp-instructions" })` once before other Paper
tools; `get_font_family_info` before typographic styling;
`get_screenshot` to self-review; `finish_working_on_nodes` when done.

## 3. Deliverables

### 3.1 Screen audit — which screens carry the old pattern

Sweep the screen artboards **and** the built screens' source for the
dismissible-pill / multi-filter bar. Known/likely:
- Admin Sales / Orders (A3) — **already done by A/A2** (`[M2-SA]`); note
  only.
- Admin Customers (A1) — **already converted by A2**; note only.
- Admin Canteen Derived Sales (A4) — `GQQ-0` lives here (`GL2-0`).
  Being merged into Sales by 3a, but confirm the merged Canteen-Derived
  tab uses the toolbar.
- Admin Ledger / Stock (`798-0` / `8Q4-0` and the `/admin/stock` +
  `/admin/financials` stock ledger) — check its toolbar/filter row.
- Admin Assets (`8DL-0`) — check its filter row.
- Admin Financials transactions (`7ZJ-0`) — the tab row is a tab strip
  (leave), but check for any pill-filter.
- Anything else the sweep finds.

Produce a table: screen · artboard · current filter pattern · which
filters it needs (the controls + their defaults) · desktop + mobile.

### 3.2 `FilterToolbar` — component artboard (the thing 3-KIT-FILTER builds)

On a component artboard near the other `Component Kit — *` artboards,
named e.g. `Component Kit — Filter Toolbar [M2-3DF]`. Model it on
`IEA-0`. Compose from existing kit primitives — **`Select`**
(the labelled-dropdown controls), **`DatePicker`** (the date chip),
**checkbox** (the `☐ Corrected only` toggle), text (result count),
a tertiary **`Button`**/link (`Reset`). **No new primitive inside it.**

**States, one sub-frame each:**
- **default** — all controls at their default value (`Payment: All`,
  `Cashier: All cashiers`, date = the screen's default e.g. `Today`,
  checkbox off), **no `Reset` link**, result count shown.
- **one filter active** — e.g. `Payment: M-Pesa`, `Reset` link now
  visible, result count updated.
- **multiple active** — 2–3 controls off default, `Reset` visible.
- **a toggle-style control** — the A1 "Has balance" case: a labelled
  toggle sitting in the same toolbar (A2 already drew this idiom —
  reuse it).
- **mobile** — a horizontally-scrollable row of the dropdown chips +
  a `More` chip (per A2's mobile variant); `Reset` + count where they
  fit.
- **filtered-empty consequence** — not a toolbar state per se, but show
  how the toolbar sits above an `EmptyState variant="filtered"` so
  3-KIT-FILTER / screens get the spacing right.

**Contract to write into the artboard note + the flow/spec doc:**
- Controls are **declarative props**: the screen passes an array of
  control descriptors (id, label, kind: `select | date | toggle`,
  options, value, default) + `onChange(id, value)` + `resultCount` +
  `resultNoun` ("orders" / "customers" / "movements").
- The toolbar renders `Reset` iff **any** control's value ≠ its default;
  `Reset` calls `onChange` for each non-default control back to default
  (or a single `onReset`).
- The toolbar **owns no filter state** — it's controlled; the screen
  holds the filter object and re-queries. (Mirrors how the kit's other
  controlled components work.)
- Fixed-width slots / `flex-shrink:0` on each control and on the
  count+Reset cluster so the row doesn't reflow as values change
  (Paper guide: vertical-lane alignment).
- Keyboard/ARIA: each control keeps its own primitive's a11y; the
  toolbar is a labelled `group` / `role="search"` region with an
  accessible name.

### 3.3 Per-screen toolbar artboards

For every screen in the 3.1 audit that is **not already done by A/A2**,
produce its toolbar row in context (desktop + mobile) using the
`FilterToolbar` composition — the actual controls that screen needs, at
their defaults, plus one "filters active + Reset" variant. Name them
`{Screen} — filter toolbar [M2-3DF]` etc. These are the visual targets
3e builds against.

Also: **formally supersede `GQQ-0`** and any other old dismissible-pill
artboard — rename to `— SUPERSEDED by FilterToolbar [M2-3DF]` (don't
delete; keeps history legible).

### 3.4 Spec / flow doc

Add a `FilterToolbar` section to `docs/design/component-states.md` §2
(matrix row) + §9 (per-state assertions), and a `kit-audit.md` §1 entry
("before: dismissible-pill Filter Bar `GQQ-0`, filters could be lost from
the UI; after: persistent labelled-dropdown toolbar, controlled, Reset
appears on non-default"). If a short standalone note is cleaner, put it
in `docs/design/filter-toolbar.md` and link it from both.

## 4. Output summary (for the human → orchestrator)

- The 3.1 audit table (this is the scope list for 3e).
- The `FilterToolbar` component artboard id + final contract — 3-KIT-FILTER
  consumes this.
- Every per-screen artboard created + every artboard superseded.
- Confirm the merged-Sales `[M2-SA]` and A1-Customers toolbars from A/A2
  are consistent with this component contract (flag any divergence for
  3e to reconcile).
- Escalations: any screen where the toolbar genuinely doesn't fit, or a
  filter that needs a data source that doesn't exist (e.g. the Cashier
  list — note it; 3a is deriving it from loaded orders).
- Confirm: no code, no kit change, no M3, Stock Levels tab-strips
  untouched.

## 5. Do NOT

- Convert the Stock Levels category tab-strips (`All · Ingredients ·
  Goods · Dishes`) — out of scope.
- Write code / touch the kit.
- Redesign the screens themselves — only their filter row.
- Invent primitives — `FilterToolbar` composes `Select` / `DatePicker` /
  checkbox / `Button`.
- Design M3.
