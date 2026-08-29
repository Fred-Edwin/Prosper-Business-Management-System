# Handoff — Kit: add a `searchable` mode to `<Select>` (design + build)

**Status:** NOT STARTED.
**Origin:** flagged in **ADR-46 §6** (Design Sprint Session 15) and
`docs/design/component-states.md §2 C5`. The Financials payment-drawer
product picker will hold many products in production; a plain dropdown is
unusable at length. Owner authorised the kit change; it goes through the
kit pipeline (not a screen-building Development Sprint).

**This is TWO sessions, one per role.** Do not blend them.

| Phase | Role / sprint | Output |
|---|---|---|
| **A** | Product Designer — **kit Design Sprint** | 3 new state rows on the `6CG-0` Form Controls artboard; `component-states.md §2 C5` promoted from FLAGGED → spec'd-with-artboards; a `§9` "searchable" line in `design-principles.md`. **No code.** |
| **B** | Developer — **kit Developer Sprint** (Phase B of `export-workflow.md`) | `components/kit/select.tsx` gains a `searchable` mode; 3 Storybook stories; `pnpm test:visual` + `pnpm test:a11y` + the `§9` `postVisit` checks pass. **No screen file touched.** |

After Phase B ships, a screen (`app/admin/financials/payment-drawer.tsx`)
swaps its interim (`max-height` + scroll on the plain `<Select>`) for
`searchable` — that is a normal Development-Sprint edit, **not** part of
this handoff.

---

## Why this is an EDIT, not a rebuild

`components/kit/select.tsx` (≈285 lines, Session 10) is already a real
WAI-ARIA APG "Select-Only Listbox":

- trigger is `role="combobox"` with `aria-haspopup="listbox"` /
  `aria-expanded` / `aria-controls` / `aria-activedescendant`;
- popover is `role="listbox"`, options `role="option"` with `id`s;
- keyboard: Arrow / Home / End / Enter / Space / Esc / Tab, plus a
  `typeahead` ref + `typeaheadJump()` that **jumps** to the option whose
  label starts with what you typed;
- `.kit-row[data-active]` / `[data-selected]` option styling,
  `--shadow-md`, `--z-dropdown`, `.kit-focus-ring`, `<FormField>` label +
  helper;
- **proven in Storybook** — `components/kit/select.stories.tsx` has
  `Rest` / `Placeholder` / `FocusRing` / `Open` / `OpenKeyboardSelect` /
  `OpenEscCloses` / `OptionHoverAndSelected` / `Error`, all passing.

What's missing for a searchable combobox is small and additive:

1. a **visible `<input>`** in the trigger you type into (today the
   trigger shows the selected value as a `<span>`, non-editable);
2. **filtering** the option list by that input's text (`label` contains)
   — today `typeaheadJump` *jumps*, it doesn't *filter*;
3. a **`max-height` + scroll** on the popover `<ul>` (today it's
   `h-fit`);
4. a **"No matches"** row when the filtered list is empty.

`searchable` is **opt-in** — `<Select>` with no `searchable` prop stays
byte-identical to today, so no existing call site
(`product-drawer.tsx`, `asset-drawer.tsx`, `payment-drawer.tsx`, the
kit gallery) changes. This is a **new state on an existing component**
(`component-states.md` already frames it that way), not a divergent
version — the `export-workflow.md` Phase A "no component has two
divergent versions" rule is not at risk.

---

## PHASE A — kit Design Sprint (Product Designer)

### Required reading

1. `CLAUDE.md` — the role model (a Design Sprint makes design decisions,
   writes no real logic; post a visible checklist).
2. `docs/design/export-workflow.md` Phase A + Phase B (this feeds B).
3. `docs/design/design-principles.md` §9 (the enforced interaction
   contract — the searchable input must fit it) and §4 (tables/controls).
4. `docs/design/component-states.md §2 C5` (the current C5 matrix +
   the FLAGGED "searchable / combobox variant" row you are promoting) and
   §4 (naming convention for new state rows: a labelled `Frame` inside
   the existing kit artboard, layer-named `<Component> — <State>`,
   greppable).
5. `docs/DECISIONS.md` **ADR-46 §6** (the decision + the interim) and
   **ADR-42** (Storybook is the kit's proof harness — B will need one
   story per state you draw).
6. The Paper file — "Prosper Hotel" (`01M0EZ7TAHZM26KBMWNYT0928X`), page
   "Shell+Component kit", artboard **`6CG-0` "Component Kit — Form
   Controls"**. `get_guide({ topic: "paper-mcp-instructions" })` first.
   Look at the existing **`Select — Open`** state row (`9NU-0` region on
   `6CG-0`) — the searchable states are variations of it. Also
   `Admin Financials — Payment Drawer (searchable picker) [S15]` (drawn
   Session 15) — it shows the intended in-context look; the `6CG-0`
   rows are the canonical kit reference.

### Draw — 3 new state rows on `6CG-0` (naming per `component-states.md §4`)

Each is a labelled `Frame`, layer-named exactly as below, added below the
existing Select state rows. Build every state by duplicating the
canonical Select nodes and changing only the tokens/structure the state
changes — **no new non-token values**.

1. **`Select — Searchable (closed)`**
   - Identical to `Select — Default` (closed) — a trigger box showing
     either the placeholder or the selected value + the chevron. The
     *closed* searchable select looks the same as a normal closed
     select; the difference only appears on open. Draw it so the kit
     artboard is complete, with a caption: "closed = identical to the
     plain Select; searchability is an open-state behaviour."

2. **`Select — Searchable (open, query typed, list filtered)`**
   - Trigger: instead of the static value `<span>`, a **text input**
     showing a typed query (e.g. `ric`) with a text caret, left-aligned,
     `--text-body` / `--text-primary`, placeholder `--text-tertiary`
     when empty. A small **search glyph** (magnifier, 14px,
     `--text-tertiary`) sits left of the input. The chevron stays at the
     right, rotated up (open).
   - Trigger border: `--color-accent` (open, matches the existing
     `Select — Open`).
   - Popover `<ul>`: `--shadow-md`, `border-strong`, `--radius-md`,
     `4px` padding, `2px` row gap — **unchanged from `Select — Open`** —
     but now **height-capped**: show ~**8 rows** then a scroll region.
     Draw 3–4 visible filtered options (only those whose label contains
     the query) plus a visible scrollbar hint if the artboard can show
     one; a caption states `max-height ≈ 8 × --control-sm` (≈ 8 × 36px =
     288px) then scroll.
   - Options: same `.kit-row` treatment — the active (keyboard) row =
     `--surface-hover`, the selected row = `--color-accent` label
     (`--weight-medium`). The **matched substring** in each option label
     MAY be shown `--weight-semibold` (decide: highlight or not — pick
     the lighter option; if not highlighting, say so in the caption so B
     doesn't add it).

3. **`Select — Searchable (open, no matches)`**
   - Trigger as in state 2, with a query that matches nothing (e.g.
     `zzz`).
   - Popover: a single non-interactive row, centred,
     `--text-tertiary` / `--text-sm`, reading **"No products match"**
     (generic kit copy: **"No matches"** — the screen can pass its own
     via a prop; note that for B). No option rows. The row is **not**
     `role="option"` and not focusable.

### Docs (Phase A)

- **`component-states.md §2 C5`** — change the `searchable / combobox
  variant` row from "FLAGGED FOR A KIT DESIGN SPRINT" to a normal
  **ARTBOARD** row, listing the 3 state artboards by name, and add a
  short state matrix for the searchable mode:

  | State | artboard? |
  |---|---|
  | searchable — closed | ARTBOARD ✅ (identical to Default closed) |
  | searchable — open, filtered | ARTBOARD ✅ (input + search glyph + capped/scrolling filtered list) |
  | searchable — open, no matches | ARTBOARD ✅ ("No matches" row) |
  | searchable — focus (keyboard) | GLOBAL (§9.1 ring on the trigger/input) |
  | searchable — input focus border | GLOBAL (§9.2 — accent border on focus, already true when open) |
  | searchable — disabled | GLOBAL (§9.7) |

- **`design-principles.md §9`** — add one line under the existing
  interaction rules: *"A searchable `Select` (combobox with a filter
  input) keeps the full §9 contract of the plain `Select` — the filter
  input is a `.kit-field` (§9.2 accent border on focus), the option list
  scrolls inside a `max-height` container (§10 skeleton rule N/A — the
  list is never a loading surface), and a no-matches state renders one
  non-interactive `--text-tertiary` row, never an empty popover."*

- **`docs/design/kit-audit.md`** — a one-line note in the Select section
  that the searchable mode is designed (this handoff, Phase A) and
  awaiting Phase B.

- **`docs/PROGRESS.md`** — a Phase-A entry.

### Phase A exit criteria

- 3 state rows on `6CG-0`, correctly named, built from tokens only, no
  divergent copy of the base Select.
- `component-states.md §2 C5` updated (FLAGGED → ARTBOARD + matrix).
- `design-principles.md §9` line added.
- `kit-audit.md` + `PROGRESS.md` noted.
- **Phase B can start** — hand it this file.

---

## PHASE B — kit Developer Sprint (Developer, backend-independent)

### Required reading

1. `CLAUDE.md`; `docs/design/export-workflow.md` **Phase B** (the kit is
   built + **proven in Storybook** before any screen composes it —
   ADR-42, `TEST_PLAN.md §2a`).
2. `docs/design/component-states.md §2 C5` (as updated by Phase A) and
   **§9** (the interaction contract, already shared CSS in
   `app/globals.css` — `.kit-field`, `.kit-row`, `.kit-focus-ring`).
3. `docs/DECISIONS.md` **ADR-42** (Storybook 9.1.x harness — story per
   state, `test:visual` story-snapshot diff, `test:a11y` axe,
   `postVisit` §9 assertions) and **ADR-43** (the review-item pattern for
   anything provisional).
4. `docs/design/kit-audit.md` — how the kit is structured; the Select
   "before → after" section.
5. The 3 `6CG-0` state artboards from Phase A — pull with
   `get_screenshot` (2×) + `get_computed_styles` for **exact** values
   (`max-height`, the search-glyph size/colour, input padding). **Never
   eyeball a screenshot for a value** (`export-workflow.md` per-screen
   gate; Sprint 06 failure).

### Files touched

- `components/kit/select.tsx` — add the `searchable` mode (only).
- `components/kit/select.stories.tsx` — add 3 stories.
- No other file. No screen. No `app/**`.

### The change to `select.tsx`

**API — one new prop, additive:**

```ts
export interface SelectProps {
  // …existing…
  /** When true, the open popover shows a text input that filters the
   *  option list (label contains, case-insensitive). Default false —
   *  the component behaves exactly as before. */
  searchable?: boolean;
  /** Copy for the empty popover row when `searchable` and no option
   *  matches the query. Default "No matches". */
  noMatchesLabel?: string;
}
```

**Behaviour (build on what exists — do NOT re-author the APG wiring):**

1. **State:** add `const [query, setQuery] = React.useState("")`. When
   `searchable` is false, `query` is never set and every code path below
   is inert — the component is unchanged.

2. **Filtered list:** derive
   ```ts
   const shown = searchable && query
     ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
     : options;
   ```
   Render `shown` in the `<ul>` instead of `options`. **Keep the option
   `id`s stable** — index into `shown` for `${listboxId}-opt-${i}` and
   for `activeIdx`, and make `commit()` / `selectedIdx` /
   keyboard-nav operate over `shown`, not `options`. (Selected-value
   detection still compares `opt.value === current`.)

3. **The trigger, when `searchable`:**
   - **Closed:** render exactly as today (the value `<span>` or
     placeholder + chevron). No visible difference — matches the Phase A
     "closed" artboard.
   - **Open:** replace the value `<span>` with an `<input>`:
     - `type="text"`, `role` stays on the button? — **No.** Move to the
       APG **"Editable Combobox With List Autocomplete (none)"** shape:
       the `<input>` carries `role="combobox"`, `aria-expanded`,
       `aria-controls`, `aria-activedescendant`, `aria-autocomplete="list"`,
       `aria-invalid`, `aria-describedby`; the wrapper is a plain
       `<div>`. The chevron becomes a sibling `<button tabindex="-1"
       aria-label="Toggle options">` (or keep it decorative and let the
       whole field toggle — decide, document). The **non-searchable**
       path keeps the current `<button role="combobox">` exactly.
     - `value={query}`, `onChange={e => { setQuery(e.target.value);
       if (!open) openList(); setActiveIdx(0); }}`.
     - Left: the **search glyph** (inline SVG magnifier, 14px,
       `stroke="var(--text-tertiary)"`, `aria-hidden`) — exact size from
       the Phase A artboard.
     - The wrapper div is `.kit-field` (so §9.2 accent-border-on-focus
       comes for free) + `.kit-focus-ring` on the input.
     - On open, **focus the input** (not the trigger) and select its
       text so the user can type over it. On close, clear `query`,
       restore focus to the field/wrapper, and if nothing was committed
       leave `current` unchanged.
   - **Keyboard on the input** (extend, don't replace `onTriggerKeyDown`):
     ArrowDown/Up/Home/End move `activeIdx` over `shown`; Enter commits
     `shown[activeIdx]` + closes + clears `query`; Esc closes + clears
     `query` (first Esc may just clear the query if non-empty — decide,
     document, match the APG note); Tab commits the active option +
     closes; **printable keys go to the input** (the browser handles
     them — remove the `typeaheadJump` call on the searchable path, it's
     replaced by real filtering). `typeaheadJump` stays for the
     non-searchable path untouched.

4. **Popover `<ul>`:** add `max-height` + `overflow-y-auto` when
   `searchable`. Use the exact value from the Phase A artboard (≈
   `8 × --control-sm`); prefer a token expression
   (`max-h-[calc(var(--control-sm)*8)]`) over a raw px literal. Scroll
   the **active** option into view on Arrow nav
   (`el.scrollIntoView({ block: "nearest" })`).

5. **No-matches row:** when `searchable && query && shown.length === 0`,
   render one `<li>` **without** `role="option"`, not focusable,
   `--text-tertiary` / `--text-sm`, centred, text = `noMatchesLabel`
   (default `"No matches"`). `activeIdx` is `-1`; Enter does nothing.

6. **Tokens only.** No raw hex, no off-`--sp` literals. The search glyph
   stroke is `var(--text-tertiary)`. Reuse `--shadow-md`,
   `--z-dropdown`, `--radius-md`, `--control-sm`, `--sp-5`.

### Stories to add to `select.stories.tsx`

Match the naming/shape of the existing stories. One per Phase A state:

- **`SearchableClosed`** — `<Base searchable defaultValue="ingredient" />`,
  no interaction. Visual-diff: identical to `Rest`.
- **`SearchableOpenFiltered`** — `play`: focus the field, open, type
  `"i"` (or whatever filters the `OPTS` list to >1 but <all), assert:
  the `<input>` has `role="combobox"` + `aria-expanded="true"` +
  `aria-autocomplete="list"`; the listbox shows only matching options;
  `aria-activedescendant` points at `-opt-0`; ArrowDown moves it to
  `-opt-1`; Enter commits that option's text into the field/value and
  closes.
- **`SearchableNoMatch`** — `play`: open, type `"zzz"`, assert the
  listbox contains the `noMatchesLabel` text and **no** `role="option"`
  nodes; Enter does nothing (`aria-expanded` stays `"true"`, value
  unchanged).
- Add a `SearchableFocusRing` if the existing `FocusRing` pattern
  (`interaction.assertFocusRing`) needs a searchable-specific selector
  (the input, not the button).

Extend `OPTS` in the stories file if 3 options aren't enough to show a
meaningful filter (e.g. add `Rice`, `Rice Flour`, `Beef` so a `"ric"`
query filters to 2).

### Phase B gates (all must pass — `export-workflow.md` Phase B / ADR-42)

- `pnpm test:visual` — story-snapshot diff vs the committed baseline;
  **re-baseline only the new `Searchable*` stories**, and only after
  eyeballing them against the `6CG-0` artboards.
- `pnpm test:a11y` — axe, no serious/critical violations on the new
  stories. (The known placeholder-contrast FLAG on `Placeholder` is
  pre-existing and scoped off there — do not let the searchable input
  reintroduce it: its typed text is `--text-primary`, its placeholder
  should be `--text-secondary` or the story scopes `color-contrast` off
  with a comment pointing at the same systemic flag.)
- The `§9` `postVisit` interaction pass — real CDP focus-visible on the
  input resolves to the `--color-accent` ring; `.kit-field` focus
  resolves to the accent border.
- `pnpm tsc --noEmit` exit 0; `pnpm build` clean.
- `pnpm test` still green (the non-searchable Select unit/story behaviour
  is unchanged — prove it by the existing stories still passing untouched).

### Docs (Phase B)

- `docs/design/kit-audit.md` — Select "before → after": the `searchable`
  mode, the API additions, the APG editable-combobox shape, the gates
  passed.
- `docs/design/component-states.md §9` — flip the C5 implementation-status
  line to note `searchable` is implemented + proven.
- `docs/DECISIONS.md` — if any provisional call was made (the chevron
  button vs decorative; first-Esc-clears-query vs closes; matched-substring
  highlight), record it as an ADR-43-style review item, or a short new
  ADR if it's load-bearing.
- `docs/PROGRESS.md` — a Phase-B entry.
- This file's `Status:` → `DONE`.

### Phase B exit criteria

- `components/kit/select.tsx` has a working `searchable` mode; the plain
  mode is byte-unchanged in behaviour (existing stories pass untouched).
- 3 (or 4) new `Searchable*` stories, all green under `test:visual` +
  `test:a11y` + `postVisit`.
- `tsc` / `build` / `pnpm test` green.
- Docs updated.
- **A screen may now adopt `searchable`** — the Financials
  payment-drawer swap is a normal Development-Sprint task
  (`session-16-handoff.md` §3 uses the interim until this ships; a
  follow-up flips it).

---

## What neither phase does

- **No screen file.** `payment-drawer.tsx` keeps its interim
  (`max-height` + scroll on the plain `<Select>` + the `ingredient` +
  `goods` filter) until Phase B ships; swapping it is a separate,
  later Development-Sprint edit.
- **No autocomplete-inline, no multi-select, no async/remote options** —
  `searchable` is a local `label`-contains filter over the `options`
  array it's already given. Anything more is a new flagged item.
- **No change to the non-searchable `Select`** beyond making the new code
  paths inert when `searchable` is false.
