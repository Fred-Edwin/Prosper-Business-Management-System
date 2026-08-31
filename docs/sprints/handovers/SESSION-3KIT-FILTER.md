# HANDOVER — Session 3-KIT-FILTER · Developer (kit) · prove `FilterToolbar`

**Paste this whole file as your first message in a fresh session.**
Branch: `feat/m2-3kit-filter-toolbar` off `main`.
**Kit + Storybook + gates ONLY. No screens, no `app/**`, no `lib/**`.**
**Blocks: 3e.** Concurrent with 3c / 3d / 3a / 3b / 3-KIT.

---

## 0. Context / urgency

Prosper is overdue; pushing Submission 1 = M1 + M2 ("staff can sell every
day"), every screen matching Paper. You are the **Developer (kit) this
session** (`CLAUDE.md`, ADR-42): build **one** new kit component and prove
it in Storybook — story per state, visual-regression baseline, axe, §9
`postVisit` colour/focus assertions — **before any screen composes it**.
Nothing else.

**Why:** several M2 screens used a dismissible-pill filter bar (`GQQ-0`)
where a dismissed filter vanished with no way back (QA F7-8). The owner's
call (2026-08-31): replace it everywhere with a persistent
labelled-dropdown toolbar, **and make it a proven kit component** so it
can't drift. Design Sprint 3-DESIGN-FILTERS drew the component artboard
+ wrote the full contract. You build + gate it; then session 3e retrofits
every screen (Ledger, Assets, the merged Sales toolbar, Customers) onto
it.

## 1. Mandatory reading (in this order — CLAUDE.md hard requirement)

1. **`docs/design/filter-toolbar.md`** — the complete spec: §1 why, §2
   anatomy (exact tokens), §3 the props contract, §4 mobile, §5
   keyboard/ARIA, §9 additions. **This is your primary source.**
2. `docs/DECISIONS.md` — **ADR-42** (the kit proving gate). Also skim the
   `Select` / `DatePicker` / `ToggleSwitch` ADRs if any.
3. `docs/design/design-principles.md` §9 (ENFORCED — per-state
   computed-value assertions), §6 (token list), §7 (the new 18th kit-area
   paragraph for FilterToolbar).
4. `docs/design/component-states.md` §2 **C34** (the FilterToolbar state
   matrix 3-DESIGN-FILTERS added) and §9 (its implementation-status row —
   the stories to build + the `postVisit` assertions).
5. `docs/design/kit-audit.md` §1 — the `FilterToolbar` before→after entry
   (update its status when done).
6. `.storybook/test-runner.ts` — the `postVisit` harness
   (`parameters.interaction` → real pseudo-state, `assertColor` /
   `assertFocusRing` → computed value === token).
7. **Exemplars:** `components/kit/select.tsx` + `.stories.tsx` (the
   dropdown you compose), `components/kit/date-picker.tsx` +
   `.stories.tsx`, `components/kit/quantity-stepper.stories.tsx` (the
   state-per-story + `play` + `Harness` shape to copy), and — if it
   exists — `components/kit/pill-filter.*` (the thing FilterToolbar
   replaces on multi-control rows; do NOT change it).

## 2. The artboards

Paper file "Prosper Hotel" (`01M0EZ7TAHZM26KBMWNYT0928X`), page
"Shell+Component kit":
- **`L9O-0` — "Component Kit — Filter Toolbar [M2-3DF]"** — the visual
  acceptance target. 6 states drawn: **default · one filter active ·
  multiple active · toggle-style control (A1 "Has balance") · mobile
  (scroll chips + More) · filtered-empty consequence.** A full written
  Contract block is on the artboard.
- **`IEA-0`** (desktop, inside `I00-0`) and **`IKW-0`** (mobile, inside
  `IJ1-0`) — the pattern as already shipped on the merged-Sales screen;
  your component must match these pixel-for-pixel so 3e's retrofit of
  that screen is a no-op visually.

`get_guide({ topic: "paper-mcp-instructions" })` once before Paper tools.
Use `get_screenshot` / `get_computed_styles` / `get_jsx` for exact
values — never read sizes/colours off a screenshot alone.

## 3. Deliverables

### 3.1 `components/kit/filter-toolbar.tsx`

Compose from existing kit primitives **only** — `Select` (labelled
dropdowns), `DatePicker` trigger (date chip), a native checkbox,
`ToggleSwitch` (the A1 idiom), text (result count), a tertiary `Button`
(Reset). **No new primitive.**

**Props — exactly as `filter-toolbar.md` §3:**
```ts
type FilterControl =
  | { id: string; label: string; kind: "select"; options: {value:string;label:string}[]; value: string; default: string }
  | { id: string; label: string; kind: "date";   value: string | null; default: string | null }
  | { id: string; label: string; kind: "toggle"; value: boolean; default: boolean };

interface FilterToolbarProps {
  controls: FilterControl[];
  onChange: (id: string, value: string | boolean | null) => void;
  onReset?: () => void;
  resultCount: number;
  resultNoun: string;
  "aria-label"?: string;   // default "Filters"
}
```
- **Controlled — owns no filter state.** (Mirror `Select` / `Tabs`.)
- **Reset** rendered iff `controls.some(c => c.value !== c.default)`
  (null-safe compare for `kind:"date"`). Click → `onReset` if given, else
  `onChange(id, c.default)` for every non-default control. The `·`
  separator renders only alongside Reset.
- **Value display is load-bearing:** a control **at default** →
  label `--text-secondary` / `--weight-regular`; **off default** →
  `--text-primary` / `--weight-medium`. This is the only "filter on"
  signal on the control — implement it, don't drop it.
- **Fixed-width slots** (`flex-shrink:0`) on each control + the
  count/Reset cluster so the row doesn't reflow as values change.
- Row: `display:flex; align-items:center; gap:var(--sp-4);
  padding-block:var(--sp-6)` (the `padding-top` is the 16px tab→toolbar
  gap). `resultNoun` singularised by the component when `resultCount===1`.
- A screen's **`SearchInput`** is NOT a `FilterControl` — the component
  should accept it as a sibling (a `children` slot or a `search?` prop
  rendered at the row's start) that keeps its own state; it only shares
  the row + gets cleared by the screen on reset. Pick the cleaner API,
  document it in the component's JSDoc.

### 3.2 Mobile (`< --bp-md`, model `IKW-0`) — same component

- Controls → horizontally-scrollable (`overflow-x:auto`) row of **32px
  chips** + trailing **`More`** chip. `gap:var(--sp-3)`,
  `padding-block:var(--sp-4)`, `padding-inline:var(--sp-5)`, each chip
  `flex-shrink:0` `white-space:nowrap`, 12px chevron `stroke-width:2`.
- Chip label: **value** when set (`--text-primary`/`--weight-medium`),
  **control name** when at default (`--text-secondary`/`--weight-regular`).
- Result count + `Reset` on their own row below the chips, `Reset`
  right-aligned. `Reset` wording on mobile too (not "Clear all").
- Decide how `More` reveals the overflow controls (a `BottomSheet`? an
  expanding row?) — match `IKW-0`; if `IKW-0` is ambiguous, pick the
  simplest kit-consistent option and note it for the orchestrator.

### 3.3 `components/kit/filter-toolbar.stories.tsx`

`title: "Kit/FilterToolbar"`. **One story per `L9O-0` state** (6), each
with:
- a `Harness` holding the controlled `controls` array (copy the
  `quantity-stepper.stories.tsx` controlled-state pattern),
- a `play` asserting that state's contract:
  - **default:** no `Reset` in the DOM; every control label is the
    `--text-secondary` treatment; count text present.
  - **one active / multiple active:** `Reset` present; the off-default
    controls render `--text-primary`/`--weight-medium`; clicking `Reset`
    fires `onChange`/`onReset` (spy with `fn()`) and (in the Harness)
    returns every control to default.
  - **toggle control:** the `ToggleSwitch` reflects `value`; flipping it
    calls `onChange(id, boolean)`.
  - **mobile:** rendered at `< --bp-md` width — the chip row is
    `overflow-x:auto`, the `More` chip is present, the count/Reset row is
    below.
  - **filtered-empty consequence:** the toolbar sits above an
    `EmptyState variant="filtered"` with the correct `--sp-*` gap (assert
    the spacing token / computed margin).
- `parameters.interaction` with `assertColor` for: a set control's label
  colour (`--text-primary`), a default control's label colour
  (`--text-secondary`), the control box border (`--border-strong`), the
  `Reset` link colour (`--color-accent`); and `assertFocusRing` on the
  first `Select` trigger and on `Reset` (§9.2).
- Reuse an `a11y` rule opt-out **only if** axe actually flags something
  the design already ratified elsewhere (e.g. the same recessive-label
  contrast call as `Select` placeholder / `QuantityStepper` unit —
  check `select.stories.tsx` for the precedent). Don't opt out
  speculatively.

### 3.4 Gate + docs

- ADR-42 gate:
  - `pnpm tsc --noEmit` → 0.
  - `pnpm storybook` (bg) + `pnpm test:visual` → all 6 stories snapshot;
    **commit the new baselines** under
    `tests/visual/__screenshots__/` (no prior baseline — first run
    creates them; eyeball each against `L9O-0` / `IEA-0` before
    committing).
  - `pnpm test:a11y` → 0 serious/critical axe, 0 console errors.
  - `pnpm test` (jsdom suite) still green — you added no `app`/`lib`
    code; confirm no regression from the `main` baseline (426).
- `docs/design/component-states.md` §2 C34 → mark "implemented + gated
  (M2-3KIT-FILTER)"; §9 → record the per-state assertions you actually
  wrote.
- `docs/design/kit-audit.md` §1 → flip the `FilterToolbar` entry's status
  to shipped/gated.
- `docs/design/filter-toolbar.md` → add a one-line "Built + gated:
  M2-3KIT-FILTER, commit <sha>" note at the top; if any part of the
  contract changed during the build (e.g. the search-slot API), update
  §3 and say so.
- Do **NOT** touch `docs/PROGRESS.md` §7 / `ROADMAP.md` — FINAL does that.

## 4. Output summary (for the human → orchestrator)

- Final prop list + the search-slot API you chose + the mobile `More`
  reveal mechanism — **3e needs these exact shapes.**
- Story count + baseline count committed.
- Gate results (tsc / test:visual / test:a11y / test).
- Any deviation from `L9O-0` / `IEA-0` and why.
- Confirm: no `app/**`, no `lib/**`, no other kit component changed
  (`Select` / `DatePicker` / `ToggleSwitch` / `PillFilter` untouched),
  no M3 work, not merged.

## 5. Do NOT

- Compose this into any screen — that's 3e's job.
- Add or modify a kit **primitive** — `FilterToolbar` is the only new
  file; it composes what exists.
- Change `Select`, `DatePicker`, `ToggleSwitch`, `PillFilter`, or any
  other kit component.
- Convert the Stock Levels category tab-strips (out of scope, they stay
  `PillFilter`).
- Add app-level Playwright/e2e (the Storybook test-runner's Playwright is
  the sanctioned exception).
- Work on Milestone 3. Merge to `main`.
