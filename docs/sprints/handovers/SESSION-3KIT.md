# HANDOVER — Session 3-KIT · Developer (kit) · prove `SelectableProductRow`

**Paste this whole file as your first message in a fresh session.**
Branch: `feat/m2-3kit-selectable-row` off `main`.
**Kit + Storybook + gates ONLY. No screens, no `app/**`, no `lib/**`.**
**Blocks: 3c, 3d.** Runs concurrently with 3a / 3b / 3-DOMAIN.

---

## 0. Context / urgency

Prosper is overdue; pushing Submission 1 = M1 + M2 ("staff can sell every
day"), every screen matching Paper. You are the **Developer (kit) this
session** (`CLAUDE.md`, ADR-42): build **one** new kit component and prove
it in Storybook — story per state, visual-regression baseline, axe, §9
`postVisit` colour/focus assertions — **before any screen composes it**.
Nothing else.

**Why this component exists:** the owner reversed ADR-44's one-line-form
shape for the 6 Store-Manager / Canteen movement flows (Option A,
2026-08-31). They now use a multi-row product picker. The row —
*product name · `Avail: N` readout · select/deselect · inline quantity
stepper · over-stock blocked state* — appears in all 6 flows, so it's a
kit component, not a per-screen build. 3-DESIGN drew its component
artboard; you build + gate it; then 3c/3d compose it.

## 1. Mandatory reading (in this order — CLAUDE.md hard requirement)

1. `docs/DECISIONS.md` — **ADR-42** (the kit proving gate — story per
   state + visual-regression + axe + §9 `postVisit`; screens only ever
   compose already-proven kit), ADR-43 / ADR-48 (the `QuantityStepper`
   tap-to-type contract you'll embed), ADR-44 (the shape being partly
   reversed).
2. `docs/design/design-principles.md` — **§9 is an ENFORCED contract**
   (per-state computed-value assertions). §4 (tables square corners),
   the token list in §6.
3. `docs/design/component-states.md` §2 (component list + state-matrix
   conventions) and §9 (the `postVisit` assertion format). Add
   `SelectableProductRow` to the §2 matrix and mark it
   "implemented + gated (M2-3KIT)".
4. `docs/design/kit-audit.md` §1 — the per-component before→after format;
   add a `SelectableProductRow` entry.
5. `.storybook/test-runner.ts` — the `postVisit` harness: how
   `parameters.interaction` applies a real pseudo-state and
   `assertColor` / `assertFocusRing` check computed value === token.
6. **Exemplar to copy the shape from:** `components/kit/quantity-stepper.tsx`
   + `components/kit/quantity-stepper.stories.tsx` (state-per-story,
   `play` assertions, `Harness` wrapper for controlled value, the
   a11y-rule opt-out pattern). Also `components/kit/match-card.tsx` /
   `.stories.tsx` (a row-shaped component).
7. `docs/design/flows/staff-stock-movements-flow.md` — the "Data notes"
   section (the provisional prop list + interaction contract 3-DESIGN
   recorded).

## 2. The artboard

Paper file "Prosper Hotel" (`01M0EZ7TAHZM26KBMWNYT0928X`), page
"Shell+Component kit":

- **`JL7-0` — "Component Kit — Selectable Product Row [M2-3D]"** — the
  visual acceptance target. States drawn: **not selected · selected (in
  batch) · at available · over available — BLOCKED (§9.8) · zero
  available.** The interaction contract + provisional prop list are in
  the artboard note.

`get_guide({ topic: "paper-mcp-instructions" })` once before Paper tools.
Use `get_screenshot` / `get_computed_styles` / `get_jsx` for exact
values — never read sizes/colours off a screenshot alone.

## 3. Deliverables

### 3.1 `components/kit/selectable-product-row.tsx`

Compose from existing kit primitives — **`QuantityStepper`** (the
tap-to-type value control, C10 / ADR-48), **`Button`** (size sm, for
`+ Select`), tokens. **No new primitive inside it.**

**Design refinements from 3-DESIGN (bake these into the contract):**
- The embedded `QuantityStepper` shows the **magnitude only** — the unit
  lives in the `Avail:` readout and (on the screen) the sticky-submit
  label. Do **not** render a unit inside the stepper here.
- **Long product names truncate with ellipsis** (`text-overflow:
  ellipsis`, `min-width: 0` on the name cell so flex truncation works).
- **Fixed-width slots** for the `Avail: N` readout and the trailing
  control (`flex-shrink: 0`) so columns line up across rows in a list
  (Paper guide: don't rely on `gap` alone).

**Provisional props** (finalise against the artboard note + flow doc):
```
productId: string
name: string
unit: string              // for the Avail readout text, e.g. "kg" | "pcs"
available: number          // derived balance at the location
selected: boolean
quantity: number           // current stepped value (only meaningful when selected)
onSelect(productId): void
onDeselect(productId): void
onQuantityChange(productId, next: number): void
onQuantityString?(productId, raw: string): void   // validation escape hatch, mirrors QuantityStepper.onValueString
availableLabelPrefix?: string   // "Avail:" default; "On hand:" (Receive), "N in Rest." (Production) — see flow doc
disabled?: boolean          // hard-disable the whole row (not the same as zero-available styling)
```

**State → visual (match `JL7-0`):**
| State | Trigger | Visual |
|---|---|---|
| not selected | `!selected && available > 0` | plain row; name, `{prefix} {available} {unit}` caption (`--text-caption --text-secondary`), `+ Select` button right |
| selected (in batch) | `selected && quantity <= available` | `--surface-selected` tint + `--color-accent` 1px border; name, avail caption, inline `QuantityStepper` right |
| at available | `selected && quantity === available` | as selected, but the stepper `+` is disabled (pass `max={available}` through) — **not** an error |
| over available — BLOCKED | `selected && quantity > available` | §9.8 pattern: `--color-danger` row treatment, an inline helper `Only {available} {unit} on hand` under the stepper. The row exposes this so the screen can disable its sticky submit — e.g. an `isBlocked` derivation the screen can read, or an `onBlockedChange` callback. Decide the cleanest API and document it. |
| zero available | `available === 0` | row muted/`--text-disabled`; `+ Select` inert; caption `None on hand`. `onSelect` must not fire. |

Keyboard / ARIA: `+ Select` is a real `<button>`; the row's interactive
semantics should be sane for a screen-reader (a group/listitem with an
accessible name including the product and its availability). Follow how
`MatchCard` / `QuantityStepper` handle this. The embedded
`QuantityStepper` keeps its own `role="spinbutton"` contract untouched.

### 3.2 `components/kit/selectable-product-row.stories.tsx`

`title: "Kit/SelectableProductRow"`. **One story per state above** (5+),
each with:
- a `Harness` wrapper holding controlled `selected` / `quantity` (copy
  the `quantity-stepper.stories.tsx` pattern),
- a `play` that asserts the state's contract (e.g. *zero-available*:
  `+ Select` disabled and clicking it does not call `onSelect` (`fn()`
  spy); *over-available*: the `Only N … on hand` helper is present and
  the blocked signal is raised; *at-available*: stepper `+` disabled;
  *selected*: `QuantityStepper` present with the right `aria-valuenow`),
- `parameters.interaction` with `assertColor` for the selected-row
  border (`--color-accent`) and tint (`--surface-selected`) and the
  blocked-row danger colour, and `assertFocusRing` on the `+ Select`
  button (§9.2), per the `test-runner.ts` harness.
- Reuse the `a11y` rule opt-out pattern from `quantity-stepper.stories.tsx`
  **only if** the same low-contrast recessive-caption issue applies
  (the `Avail:` caption is `--text-secondary`, likely fine — check;
  don't opt out unless axe actually flags it).

### 3.3 Gate + docs

- Run the ADR-42 gate:
  - `pnpm tsc --noEmit` → 0.
  - `pnpm storybook` (bg) + `pnpm test:visual` → all stories snapshot;
    **commit the new baselines** under
    `tests/visual/__screenshots__/` (there is no prior baseline — the
    first run creates them; eyeball each against `JL7-0` before
    committing).
  - `pnpm test:a11y` → 0 serious/critical axe violations, 0 console
    errors.
  - `pnpm test` (the jsdom suite) still green — you added no `app`/`lib`
    code so the count is unchanged from `main` (426) + nothing; confirm
    no regression.
- `docs/design/component-states.md` §2 — add the row, mark
  "implemented + gated (M2-3KIT)"; §9 — record its per-state assertions.
- `docs/design/kit-audit.md` §1 — add a `SelectableProductRow` entry
  (it's a **new** component, so "before: n/a (composed ad hoc in M1
  one-line flows); after: …").
- Do **NOT** touch `docs/PROGRESS.md` §7 / `ROADMAP.md` — orchestrator
  does that in FINAL.

## 4. Output summary (for the human → orchestrator)

- Final prop list + the blocked-signal API you chose (callback vs derived
  flag) — 3c/3d need this exact shape.
- Story count + baseline count committed.
- Gate results (tsc / test:visual / test:a11y / test).
- Any deviation from `JL7-0` you had to make and why.
- Confirm: no `app/**`, no `lib/**`, no other kit component changed, no
  M3 work.

## 5. Do NOT

- Compose this into any screen — that's 3c/3d's job.
- Add a new kit **primitive** — `SelectableProductRow` is the only new
  file; it composes what exists.
- Change `QuantityStepper`, `Button`, `MatchCard`, or any other kit
  component.
- Add app-level Playwright/e2e (the Storybook test-runner uses Playwright
  under the hood — that's the sanctioned exception, ADR-42).
- Work on Milestone 3. Merge to `main`.
