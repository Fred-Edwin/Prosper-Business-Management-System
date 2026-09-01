# FilterToolbar — component spec

**Built + gated: M2-3KIT-FILTER (commit on `feat/m2-3kit-filter-toolbar`).**
`components/kit/filter-toolbar.tsx` + `filter-toolbar.stories.tsx` (8
stories / 8 visual baselines / axe clean / tsc 0 / jsdom 416).
- **Search-slot API (§3):** a `search?: React.ReactNode` prop, rendered as a
  sibling at the START of the toolbar row (it keeps its own state; the
  screen clears it on reset). Chosen over a `children` slot so the toolbar
  owns the row layout around it.
- **Mobile "More" reveal (§4):** a kit `BottomSheet` listing *all* controls
  as full-width rows (not just the overflow). `IKW-0` doesn't draw the
  reveal; `BottomSheet` is the staff-shell's proven overflow affordance.
- **Layout split:** `matchMedia("(max-width: --bp-md - 1)")` via an in-file
  hook, plus a `layout?: "auto" | "desktop" | "mobile"` escape hatch so the
  Storybook visual snapshot is deterministic.
- **Two deviations from L9O-0** (composition limits of the kit primitives,
  documented in the component header for 3e): (a) an at-default `select`
  label stays `--text-primary` — the kit `Select` trigger has no
  recessive-tone hook and forking it was out of scope; date + toggle
  controls DO honour the tone rule. (b) the date chip uses `DatePicker`'s
  trailing calendar glyph + mono value where L9O-0 shows a leading glyph +
  ui-font value.
- **Kit touch:** `Select` + `DatePicker` gained an additive, a11y-only
  `aria-label` prop (names a label-less trigger; ignored when `label` set).

**Status:** Approved for build (Design Sprint 3-DESIGN-FILTERS, Product
Designer, 2026-08-31). Consumed by **3-KIT-FILTER** (builds + ADR-42-gates
the kit component) and **3e** (retrofits every screen onto it).

**Paper source of truth:** `Component Kit — Filter Toolbar [M2-3DF]`
(page "Shell+Component kit"). Model artboard: `IEA-0` (the toolbar
subtree inside `I00-0`, the merged-Sales Restaurant Orders screen A/A2
already shipped). Mobile model: `IKW-0` (inside `IJ1-0`). This doc is the
*why/when*; Paper is the *what*. Tokens per `design-principles.md` §6.

---

## 1. Why this exists

Several M2 screens used a **dismissible-pill filter bar** — artboard
`GQQ-0` ("Filter Bar"): pill chips like `Product ✕` / `Date range ✕`
that mixed *active-filter chips* with *dormant menu triggers*, and when
dismissed **vanished from the UI with no affordance to bring them back**.
QA flagged the built instances as inert (M2 Session 7, F7-8). The owner's
instruction (2026-08-31): replace every dismissible-pill filter with a
**persistent labelled-dropdown toolbar** — artboard `IEA-0`.

The value now lives *inside* each control; nothing is ever removed — you
set a control back to its default (`All`, `Today`, off). This is also the
reason it becomes a **proven kit component** rather than per-screen
markup — so it cannot drift (orchestrator decision, 2026-08-31).

**Not in scope:** the one-tap category tab-strips on the Stock Levels
screens (`All · Ingredients · Goods · Dishes`) and the location switch on
`6IW-0` — those stay as `PillFilter` (C12). A `FilterToolbar` is for the
multi-control filter row, not a single-axis segmented switch.

---

## 2. Anatomy (from `IEA-0`)

Desktop row:

```
[ Cashier: All cashiers ▾ ]  [ Payment: All ▾ ]  [ 📅 Today ]  [ ☐ Corrected only ]  ……spacer……  6 orders  ·  Reset
```

| Part | Kit primitive | Notes |
|---|---|---|
| Labelled dropdown | `Select` | Trigger label reads `"<Label>: <value>"`. `h-36`, `--surface-page`, `1px --border-strong`, `--radius-sm`, `px-(--sp-5)`, 14px chevron `--text-tertiary`. |
| Date chip | `DatePicker` trigger | Leading 14px calendar glyph instead of a trailing chevron; label = the value (`Today` / `All dates` / `Aug 24`). Same box as the dropdowns. |
| Checkbox toggle | native checkbox | 16px square, `--border-strong`, `--radius-sm`, `gap-(--sp-3)` to its label. A plain checkbox — **not** a pill. |
| Toggle control | `ToggleSwitch` | The A1 "Has balance" idiom: a `--weight-medium` label + the 40×22 kit toggle, sitting in the same row. Use when the control is a boolean the user thinks of as on/off rather than a checkbox nicety. |
| Result count | text | `"<n> <resultNoun>"`, `--text-tertiary`, `--text-sm`. Pushed right by a `flex-grow:1` spacer. |
| Separator | text `·` | `--text-tertiary`. Only rendered when `Reset` is. |
| Reset | tertiary `Button` / link | `--color-accent`, `--weight-medium`, `--text-sm`. **Rendered iff at least one control is off its default.** |

Row layout: `display:flex; align-items:center; gap:var(--sp-4);
padding-block:var(--sp-6); width:1200px`. The `padding-top:var(--sp-6)` is
the deliberate 16px gap between the tab row above and the toolbar (owner
flagged them touching).

**Value display — load-bearing.** A control **at its default** renders
its label `--text-secondary` / `--weight-regular`. A control **off its
default** renders `--text-primary` / `--weight-medium`. This is the only
"a filter is on" signal on the control itself — do not drop it.

**Fixed-width slots.** Each control and the count+Reset cluster is
`flex-shrink:0` with a fixed-width intent so the row does not reflow as
values change (Paper guide: vertical-lane alignment).

---

## 3. The contract (props)

```ts
type FilterControl =
  | { id: string; label: string; kind: "select"; options: {value: string; label: string}[]; value: string; default: string }
  | { id: string; label: string; kind: "date";   value: string | null; default: string | null }  // null = "all dates"
  | { id: string; label: string; kind: "toggle"; value: boolean; default: boolean };

interface FilterToolbarProps {
  controls: FilterControl[];
  onChange: (id: string, value: string | boolean | null) => void;
  onReset?: () => void;          // optional; default behaviour loops onChange over non-default controls
  resultCount: number;
  resultNoun: string;            // "orders" | "customers" | "movements" | "rows" | "assets"
  "aria-label"?: string;         // defaults to "Filters"
}
```

- **Controlled.** The toolbar owns **no** filter state. The screen holds
  the filter object and re-queries. Mirrors `Select` / `Tabs` /
  `PillFilter`.
- **Reset.** Shown iff `controls.some(c => c.value !== c.default)` (with a
  null-safe compare for `kind:"date"`). Clicking it calls `onReset` if
  provided, otherwise `onChange(id, default)` for every non-default
  control.
- **`resultNoun`** is singularised by the component for `resultCount === 1`.
- A control's search field, when a screen has one (Assets, Customers), is
  a sibling `SearchInput` *in the same toolbar row*, not a `FilterControl`
  — it keeps its own state/handler; it just shares the row and the Reset
  logic (screen clears the search string on reset).

---

## 4. Mobile (`< --bp-md`, model `IKW-0`)

- The controls become a **horizontally-scrollable** (`overflow-x:auto`)
  row of **32px chips** + a trailing **`More`** chip for any controls
  that don't fit / are secondary. `gap:var(--sp-3)`;
  `padding-block:var(--sp-4)`; `padding-inline:var(--sp-5)`. Each chip
  `flex-shrink:0`, `white-space:nowrap`, 12px chevron `stroke-width:2`.
- Chip label: the **value** when set (`Mary N.`, `Today`) in
  `--text-primary` / `--weight-medium`; the **control name** when at
  default (`Payment`, `Location`) in `--text-secondary` / `--weight-regular`.
- The **result count + `Reset`** move to their own row directly below the
  chip row (`Reset` right-aligned). On mobile the desktop `Clear all`
  wording is also `Reset`.

---

## 5. Keyboard / ARIA

- Each control keeps its own primitive's a11y unchanged — `Select`
  (APG listbox), `DatePicker` (dialog + grid), native checkbox,
  `ToggleSwitch`.
- The toolbar is a labelled group: `role="search"` region with an
  accessible name (`aria-label`, default `"Filters"`).
- `Reset` is a real `<button>` (tertiary variant) — `.kit-focus-ring`,
  Enter/Space.
- The result-count text is `aria-live="polite"` so a filter change is
  announced.

---

## 6. Filtered-empty

When the screen has data but the current filter matches nothing, the
toolbar **stays visible** above an `<EmptyState variant="filtered">` (so
the reader sees *why* it's empty). Gap toolbar → EmptyState =
`var(--sp-8)`. The EmptyState's "Clear filters" action calls the same
reset path as the toolbar's `Reset`.

---

## 7. Rollout (for 3e — the scope list)

| Screen | Artboard(s) | Status | Controls (defaults) | Notes |
|---|---|---|---|---|
| Admin Sales — Restaurant Orders | `I00-0` / `IJ1-0` (`IEA-0`) | **done (A/A2)** — reconcile to this contract | Cashier: All ▾ · Payment: All ▾ · 📅 Today · ☐ Corrected only | Cashier options derived from loaded orders (F7-8). `resultNoun` "orders". |
| Admin Sales — Canteen Derived | `I5S-0` / `ILC-0` (`IEY-0`) | **done (A/A2)** — reconcile | Product: All ▾ · 📅 All dates | `resultNoun` "sales". |
| Admin Customers (A1) | `DU2-0` + states + `EPJ-0` | **done (A2)** — reconcile the toggle | Search · Has balance (toggle) | `Has balance` = `kind:"toggle"`, default `false`. `resultNoun` "customers". Spot-check `E41-0` / `E97-0` still say "Reset" not "Clear all". |
| **Admin Stock Ledger** | `798-0` / `7LJ-0` / `7G9-0` / `8Q4-0` | **CONVERT** — `Admin Stock Ledger — filter toolbar [M2-3DF]` | Location: All ▾ · Category: All ▾ · 📅 <business day> | `Columns` visibility control is **not** a filter — stays as its own control to the toolbar's right. Built code currently uses `PillFilter` for location. `resultNoun` "rows". |
| **Admin Assets** | `8DL-0` (+ A2 mobile set) | **CONVERT** — `Admin Assets — filter toolbar [M2-3DF]` | Search · Location: All ▾ · Condition: All ▾ | Category tab-strip **stays** (kit `Tabs`, primary cut). Built code diverges: bespoke filled-pill radiogroup for Condition + a `SearchInput` not on `8DL-0`. `resultNoun` "assets". |
| Admin Financials — transactions | `7ZJ-0` | **no change** | — | Only a `Tabs` strip (`All Transactions · Stock Purchases · …`). No filter chips. Out of scope. |
| Stock Levels (SM `986-0` / Canteen `9GW-0`) | — | **out of scope** | — | `All · Ingredients · Goods · Dishes` one-tap `PillFilter` stays. |

Superseded artboards (renamed, not deleted, to keep history legible):
`GQQ-0` → `Filter Bar — SUPERSEDED by FilterToolbar [M2-3DF]`;
`DIN-0`'s `Section — Chip filter bar` →
`… — SUPERSEDED by FilterToolbar [M2-3DF]`. The A3 (`FA1-0`) and A4
(`GL2-0`) artboards that carried the pill bar were already superseded at
the artboard level by A2's `[M2-SA]` merged-Sales set.

---

## 8. §9 interaction contract (per `design-principles.md` §9)

`FilterToolbar` composes proven primitives, so it inherits §9 through
them. The component's *own* additions:

- **Reset** — a tertiary `<Button>`; §9.1 focus ring, §9.5 hover
  (`--surface-hover`), §9.6 pressed (= hover), §9.7 disabled n/a (it's
  absent, not disabled, when there's nothing to reset).
- **Row** — no hover/selected tint of its own; it's a container.
- **Transition** — none on the row; the controls animate per their own
  §9.9 timing.
- **Result count** — `aria-live="polite"`; no visual state.

See `component-states.md` §2 (matrix row) and §9 (per-state assertions).
