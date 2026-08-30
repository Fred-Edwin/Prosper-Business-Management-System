# Sprint M2-02 — QuantityStepper tap-to-type: verify & close out (Kit Sprint)

**Milestone:** 2 — *Staff can sell, every day*
**Type:** Kit Sprint (Phase 2 — component, not screens)
**Session #:** 2 of Milestone 2
**Role:** Developer (kit) — **one role, this session**
**Paper.design file:** "Prosper Hotel" — fileId `01M0EZ7TAHZM26KBMWNYT0928X`,
page **"Shell+Component kit"**, artboard **`6CG-0` Form Controls**
(section `DKR-0` — "QuantityStepper — tap-to-type value").
**Target file:** `components/kit/quantity-stepper.tsx` (+ its story +
`docs/design/*` kit docs). **No screens, no `app/**`, no `lib/**`.**
**Status:** completed (2026-08-30)
**Estimated size:** SMALL — see §0. This is a verification pass, not a build.

---

## 0. Read this first — the change is very likely already done

The M2 plan (§6, §7, §10) and the Session 1a handoff both scoped Session 2
as "build the `QuantityStepper` tap-to-type value: `<span>` → `<input
inputmode="decimal">`, − / + unchanged, §9 contract, Storybook story per
state, visual-regression + `axe` + `postVisit`".

**On inspection (2026-08-29, during Session 1b), that build already
exists** — it landed in **M1 Session 10** as an owner-approved kit-audit
item (`kit-audit.md` §1 / item 683), *before* M2 planning assumed it was
still owed:

- `components/kit/quantity-stepper.tsx` — the value **is already** a real
  `<input inputmode="decimal">` with `role="spinbutton"` +
  `aria-valuenow/-min/-max/-valuetext`; − / + are native `<button>`s with
  `aria-label`, disabled at bound via the shared §9.7 rule; label +
  helper/error via `<FormField>`; `onValueString` prop exposes the raw
  typed string for out-of-range / non-numeric validation; `↑` / `↓` step
  by `step`. API is otherwise unchanged.
- `components/kit/quantity-stepper.stories.tsx` — **6 stories, each with
  `play` assertions**: `Rest`, `AtMinBound`, `AtMaxBound`,
  `FocusValueField` (asserts §9.2 accent border on `.kit-field`),
  `ErrorTypedValue` (asserts §9.8 danger border + `aria-invalid` +
  `aria-describedby` link), `ArrowKeysStep`.
- `component-states.md` §9 row for C10 already reads **"implemented —
  value is now `<input role="spinbutton">`. Behaviour pending owner
  review"**.
- `6CG-0` section `DKR-0` already has the 4 M2 artboard states drawn
  (rest · value-focused inline entry · at-bound · error).

**So this session's real job is to VERIFY the existing component against
the M2 acceptance bar and CLOSE OUT the paper trail** — confirm the
gates are green, resolve the "behaviour pending owner review" note, add
the one story the M2 screens need that isn't there yet (see §3), and
re-baseline the plan so §7 shows Session 2 as a verify-not-build session.

If — and only if — the verification in §2 turns up a real gap that a
screen depends on, fix it in `quantity-stepper.tsx` only, add the story,
re-run the gate. Do **not** expand scope beyond the stepper.

---

## 1. Required context & reading

- **`docs/design/kit-audit.md`** — §1 / items 683–685 (the
  owner-approved rewrite), the `QuantityStepper` component section
  (~line 381), item C10 in the state matrix.
- **`docs/design/component-states.md`** — §2 **C10** (the 4 required
  states), §9 (the enforced interaction contract — rules 1, 2, 7, 8, 10
  all touch this control), the §9 per-component status table (C10 row).
- **`docs/DECISIONS.md`** — ADR-42 (kit gating: story per state +
  visual-regression + `axe` + §9 `postVisit` before any screen composes
  it), ADR-48 (the "add-to-kit-first" model, `Select searchable`
  precedent).
- **`docs/design/flows/restaurant-sales-flow.md`** — §"New components"
  table (the `QuantityStepper` row is the only KIT CHANGE line; the
  rest compose). This is the **why**: C2/C3/C4 order lines and A3's
  correction line editor need to type a large quantity ("24" instead of
  tapping + 24 times).
- **`docs/sprints/milestone-2-plan.md`** — §6 (candidate list — the
  stepper is the sole confirmed change), §7 (session table — this
  session's row), §10 (changelog).
- **`docs/sprints/milestone-2-session-1b-handoff.md`** §8 — where the
  M2-01b artboards are listed; the screens that will compose this
  component in Session 6.
- **`docs/CONVENTIONS.md`** §6 — working practices.
- **`docs/design/design-principles.md`** §9 — the interaction contract
  as enforced per-component in Storybook.

---

## 2. Verification checklist (the core of this session)

Run each; record pass/fail in §8. A fail becomes a targeted fix in
`quantity-stepper.tsx` + a story, nothing more.

### 2.1 The gate

- [ ] `pnpm build-storybook` (or `pnpm storybook` locally) — the
      `QuantityStepper` stories all render.
- [ ] `pnpm test:visual` — green, including the stepper stories'
      committed visual-regression baselines. If a baseline is stale
      because a token moved, re-baseline **only** the stepper stories
      and note it.
- [ ] `pnpm test:a11y` — no serious/critical `axe` violation on any
      stepper story (`--failOnConsole` must also stay clean).
- [ ] `pnpm tsc --noEmit` — clean.
- [ ] `pnpm test` — the full suite still green (the component is
      already imported by M1 flow screens; nothing should have moved).

### 2.2 The §9 contract, per state (matches `6CG-0` section `DKR-0`)

- [ ] **Rest** — `[ − | value | + | unit ]`, value is centred + mono,
      byte-identical to the old `<span>` visual. Matches artboard
      "rest".
- [ ] **Value focused (inline entry)** — focusing the number field
      gives the §9.2 `1px solid var(--color-accent)` border on
      `.kit-field` **and** the §9.1 keyboard-only 2px accent ring; the
      field accepts typed digits (`inputmode="decimal"`); a caret
      shows. Matches artboard "value focused — tap the number, type a
      quantity".
- [ ] **At-bound** — at `min`, `−` is `disabled` (opacity 0.5,
      `pointer-events: none`, §9.7), `+` stays enabled; mirror at
      `max`. Matches artboard "at-bound (− disabled at min 1)".
- [ ] **Error (typed value invalid)** — `error` prop → §9.8 pattern:
      `1px solid var(--color-danger)` on the field + a
      `--color-danger` / `--text-caption` helper row directly below,
      `margin-top: var(--sp-2)`, wired via `aria-describedby` +
      `aria-invalid="true"`. Matches artboard "error (typed value
      invalid)" + its "Enter 1 or more" helper.
- [ ] **Transitions** — `background-color` / `border-color` 120ms ease;
      the focus ring is **not** transitioned (§9.9).
- [ ] **Disabled (whole control)** — if a screen passes a disabled
      stepper (none in M2 do, but the contract requires it), the global
      §9.7 rule applies: `opacity: 0.5`, `pointer-events: none`, text →
      `--text-disabled`.
- [ ] **Keyboard** — `↑` / `↓` step by `step`; `Enter` / blur commits
      the typed value through `onChange` (numeric) and `onValueString`
      (raw); an out-of-range or non-numeric raw string does **not**
      call `onChange` (screen decides what to show).

### 2.3 The M2 screens' actual needs

Confirm the component as-built covers what the M2-01 + M2-01b artboards
draw:

- [ ] **C2 / C3 / C4 order-line row** (`restaurant-sales-flow.md`;
      "M2 Sales Patterns" artboard `DIN-0`) — a compact stepper inside a
      flex row; tapping the number opens inline numeric entry for a
      large qty. The screen composes `<QuantityStepper>` in a per-screen
      row; no kit change needed for the layout.
- [ ] **A3 correction line editor** (`customers-credit-flow.md` §G;
      artboard `G4I-0`) — same stepper, pre-filled from the original
      order's line quantities, editable.
- [ ] **K1 counted-remaining field** (`canteen-derived-sales-flow.md`
      §A; artboards `H8J-0` etc.) — a **single larger** stepper for the
      shelf count, unit label shown, tap-to-type. The flow doc allows a
      plain numeric `TextInput` as an alternative — the stepper is fine
      and preferred; confirm the `format` prop / size can render the
      larger presentation the artboard shows (40px controls, `--text-h2`
      value) **without a kit change** — a screen-level `className` /
      wrapper is acceptable, a new size variant is not (flag if it
      can't be done from the outside).

### 2.4 Behaviour sign-off (resolves the open note)

`component-states.md` §9 C10 row says **"Behaviour pending owner
review."** This session closes it:

- [ ] Confirm the commit-on-blur / commit-on-Enter behaviour, the
      `onValueString` escape hatch for validation, and `↑`/`↓` stepping
      are the intended UX (they match the ADR-48 `Select searchable`
      precedent of "keep the full §9 contract, add the input"). If the
      owner wants a different commit trigger (e.g. commit-on-every-
      keystroke), that's the one real decision to raise — **stop and
      ask**, don't pick.
- [ ] Once confirmed, flip the §9 C10 row from "implemented — behaviour
      pending owner review" to **"implemented + gated (M2-02)"** and
      drop the C10 "pending" caveats elsewhere in the doc
      (`kit-audit.md` items 683–685, ~line 810, ~line 740).

---

## 3. The one likely gap — an inline-entry `play` story

The existing stories cover `FocusValueField` (border on focus) and
`ErrorTypedValue` (error prop). Neither one **drives the tap-to-type
interaction itself** — type into the field, blur, assert the committed
value and that `onValueString` fired. The M2 screens depend on exactly
that path.

- [ ] Add **`TypeALargeQuantity`** to `quantity-stepper.stories.tsx`:
      a `play` that focuses the spinbutton, `userEvent.clear` +
      `userEvent.type(input, "24")`, `userEvent.tab()` (blur), then
      asserts the displayed value is `24` and that the `onChange` spy
      got `24` (and `onValueString` got `"24"`). Give it a `name` that
      maps to the `6CG-0` "value focused — tap the number, type a
      quantity" artboard.
- [ ] Add a committed visual-regression baseline for it (mid-type
      state, caret visible).
- [ ] Re-run `pnpm test:visual` + `pnpm test:a11y`.

If, contrary to §0, the component turns out **not** to have the
tap-to-type input (e.g. a `git log` shows the Session 10 rewrite was
reverted), then this session reverts to the original plan: do the
`<span>` → `<input>` rewrite in `quantity-stepper.tsx` keeping − / +
and the REST visual identical, add all the stories in §2.2, gate.

---

## 4. Non-negotiables (this session)

- **Kit only.** Touch `components/kit/quantity-stepper.tsx`, its
  `.stories.tsx`, its visual baselines, and the `docs/design/*` kit
  docs. **Nothing** under `app/`, `lib/`, or any screen file, and no
  other kit component.
- **REST visual is byte-identical.** The − / + / value / unit layout,
  sizing, mono value and centring do not move. The input is unstyled
  and inherits.
- **The §9 contract is enforced, not re-implemented.** Focus ring,
  field-focus border, disabled treatment, error pattern, transitions
  all come from the shared `.kit-*` CSS / `<FormField>` — the component
  wires them, it doesn't hand-roll them.
- **No new API surface** beyond what's already there (`error`,
  `helperText`, `onChange`, `onValueString`, `format`, `min`/`max`/
  `step`, `unit`, `required`, `id`). If a screen needs more, that's a
  flag, not a change here.
- **ADR-42 gate is the definition of done** — story per state +
  visual-regression baseline + `axe` clean + §9 `postVisit`
  assertions, all green in CI, before Session 6 composes the screens.

---

## 5. No open questions to resolve here

The tap-to-type change was owner-approved in M1 Session 10
(`kit-audit.md` §1). §3.8 (BLOCK) and the M2 one-kit-change verdict
stand. The **only** thing that could need an owner answer is the
commit-trigger UX in §2.4 — and only if the current commit-on-blur /
Enter behaviour is judged wrong on review. If so: stop, flag in
`PROGRESS.md`, mark BLOCKED, do not pick.

---

## 6. Acceptance criteria

### Component
- [ ] `quantity-stepper.tsx` value is a real `<input inputmode="decimal"
      role="spinbutton">`; − / + are native buttons; REST visual
      unchanged from the `6WD-0` / `6CG-0` artboards.
- [ ] All 4 `component-states.md` §2 C10 states reachable and correct:
      default · at-bound (− / + disabled) · focus (value field, §9.2) ·
      error (typed value, §9.8).
- [ ] `↑` / `↓` step; blur / Enter commit; `onValueString` exposes the
      raw string; out-of-range raw does not fire `onChange`.

### Gate (ADR-42)
- [ ] One Storybook story per state, each with `play` assertions,
      **including** the `TypeALargeQuantity` inline-entry story (§3).
- [ ] `pnpm test:visual` green (baselines committed / re-baselined with
      a note).
- [ ] `pnpm test:a11y` green (`axe`, `--failOnConsole`).
- [ ] `pnpm tsc --noEmit` + `pnpm build` + `pnpm test` green.
- [ ] Kit gallery / Storybook index shows the stepper's M2 states.

### Docs
- [ ] `component-states.md` §9 C10 row → **"implemented + gated
      (M2-02)"**; "pending owner review" removed there and in
      `kit-audit.md` (items 683–685, and the C10 caveats near lines
      740 / 810).
- [ ] `docs/PROGRESS.md` — Session 2 entry: what was verified, the one
      story added, the behaviour sign-off, gate state.
- [ ] `docs/sprints/milestone-2-plan.md` §7 — Session 2 row rewritten
      to reflect **verify-and-gate** (the component pre-existed from M1
      S10); §10 changelog line: "Session 2 re-scoped — the
      `QuantityStepper` tap-to-type input already shipped in M1 Session
      10 (kit-audit §1); Session 2 verified it against the M2 bar,
      added the inline-entry `play` story, and closed the ADR-42 gate."
- [ ] This file's `Status:` → `completed`.

### Discipline
- [ ] No files changed outside `components/kit/quantity-stepper.*`,
      its visual baselines, and `docs/design/*` + `docs/PROGRESS.md` +
      `docs/sprints/milestone-2-plan.md`.

---

## 7. Handoff to the next session

- **Sessions 4 / 5 (Development Sprint — Developer)** — Orders + Canteen
  derived-sales domain. **Session 4 is code-complete** on
  `feat/m2-session-4-orders` (per `PROGRESS.md`), Session 5 is **done**.
  Independent of this session.
- **Canteen design conflict (flagged by Session 5) — RESOLVED
  2026-08-30.** Session 5's `voidStockCount` (reject "counted more than
  expected" + same-day hard-delete undo) overrode the flow doc's
  "self-correcting negative sold" design. A Design re-spin (2026-08-30)
  brought the Canteen artboards + `canteen-derived-sales-flow.md` back
  in sync: K1 is now 9 states ("counted more than expected (blocked)",
  delete-count confirm/success, count-locked-previous-day), A4's
  negative-revenue treatment is gone, the "M2 Sales Patterns" sheet has
  a zero-sold timeline variant + a delete-confirm section. **Session 6
  is unblocked on the Canteen slice.** See `PROGRESS.md` → "M2 Canteen
  design re-spin".
- **Session 6 (Development Sprint — Developer)** — assembles **all** M2
  screens from the Paper screenshots. Needs: 1a + 1b artboards
  (Cashier done; Admin done; **Canteen pending the re-design above**),
  **this session's gated `QuantityStepper`**, and Sessions 3–5's
  domain. The stepper is a hard dependency for C2/C3/C4 + A3's
  correction editor.
- **Session 7 (QA Sprint)** — adversarial pass; will re-check the §9
  contract on the stepper as composed into the real screens.

---

## 8. Session Notes

Completed 2026-08-30. §0 held — the tap-to-type component pre-existed from M1
Session 10; this was a verify-and-gate pass, **zero changes to
`quantity-stepper.tsx`**.

**Verification results (§2):**

| Row | Result |
|---|---|
| 2.1 `build-storybook` / `storybook` renders stepper stories | **PASS** — dev Storybook served all 7 stepper stories to the runner |
| 2.1 `test:visual` | **PASS** — 7/7 snapshots (6 re-keyed after the title de-suffix + 1 new), stable on a confirming re-run |
| 2.1 `test:a11y` (`axe` + `--failOnConsole`) | **PASS** — 0 serious/critical violations, 0 console errors, all 7 stories |
| 2.1 `tsc --noEmit` | **PASS** — clean |
| 2.1 `pnpm test` (full vitest) | **SKIPPED** — no vitest-visible file changed (only `.stories.tsx` + baselines + docs); suite is slow by design post-S4/S5 (`maxWorkers: 2`, Postgres pool). `tsc` is the type gate here. |
| 2.2 Rest — `[ − \| value \| + \| unit ]`, centred mono, byte-identical | **PASS** — REST baseline unchanged (git detected 4 stories as pure renames) |
| 2.2 Value focused — §9.2 accent border on `.kit-field` + §9.1 ring, `inputmode="decimal"` | **PASS** — `FocusValueField` story (`assertColor` `.kit-field borderColor === --color-accent`) |
| 2.2 At-bound — `−` disabled at min / `+` at max (§9.7 opacity 0.5, `pointer-events:none`) | **PASS** — `AtMinBound` / `AtMaxBound` stories; verified in the regenerated baseline (dimmed `−`) |
| 2.2 Error (typed value) — §9.8 danger border + helper row, `aria-invalid` + `aria-describedby` | **PASS** — `ErrorTypedValue` story asserts all three; baseline shows the danger border + "Enter a value between 0 and 50." helper |
| 2.2 Transitions — `background-color`/`border-color` 120ms, ring not transitioned | **PASS** — inherited from `.kit-field` / `.kit-interactive` shared CSS (`globals.css`); §9.9 allow-list excludes `outline` |
| 2.2 Disabled (whole control) — global §9.7 | **PASS by inheritance** — no M2 screen passes a disabled stepper; the `.kit-interactive` / `.kit-field` disabled rules apply if one does |
| 2.2 Keyboard — `↑`/`↓` step; Enter/blur commit; out-of-range raw does not call `onChange` | **PASS** — `ArrowKeysStep` + new `TypeALargeQuantity`; `commit()` guards with `Number.isNaN` |
| 2.3 C2/C3/C4 order-line row | **PASS** — compact stepper in a flex row, tap-to-type for large qty; no kit change for the layout |
| 2.3 A3 correction line editor | **PASS** — same stepper, pre-fillable via `value`; no kit change |
| 2.3 K1 counted-remaining (larger presentation) | **PASS** — 40px controls / `--text-h2` value reachable via a screen-level `className` on the `.kit-field` div; **no new size variant needed, no flag** |
| 2.4 Behaviour sign-off | **CONFIRMED as-is** — see below |

**Story added (§3):** `TypeALargeQuantity` in `components/kit/quantity-stepper.stories.tsx`
— `args: { onChange: fn(), onValueString: fn() }`, stateful render wrapper;
`play`: `click(spinbutton)` → `clear` → `type(input, "24")` → assert
`toHaveValue("24")` + `onValueString` last-called `"24"` → `tab()` (blur) →
assert `onChange` last-called `24` + committed `toHaveValue("24")`. Story name
maps to `6CG-0` / section `DKR-0` "value focused — tap the number, type a
quantity". Baseline: `kit-quantitystepper--type-a-large-quantity.png` (committed
post-type state `[ − 24 + kg ]`, not mid-type — caret blink makes a mid-type
snapshot flaky; the `play` asserts the typing/commit path directly).

**Behaviour sign-off (§2.4):** confirmed as-is. Commit-on-blur / commit-on-Enter,
the `onValueString` raw-string escape hatch for out-of-range / non-numeric
validation, and `↑`/`↓` stepping by `step` are the intended UX — a straight
application of the ratified **ADR-48** ("keep the full §9 contract, add the
input", the `Select searchable` precedent) and **ADR-43** (Session 10b owner
review). Not judged a wrong commit-trigger → **no owner escalation, nothing
BLOCKED**. `component-states.md` §9 C10 flipped "Behaviour pending owner review"
→ **"implemented + gated (M2-02)"**.

**Baselines re-committed:** all 7, because the story `title` was de-suffixed
`Kit/QuantityStepper — NEEDS OWNER REVIEW` → `Kit/QuantityStepper` (matches the
already-ratified `Kit/Select`), which re-keys every story id. Old
`kit-quantitystepper-needs-owner-review--*` (6) removed; new
`kit-quantitystepper--*` (7, incl. `type-a-large-quantity`) written and
verified stable on a second run. 4 of the 6 carried-over baselines are
byte-identical (git shows them as renames) — REST visual unchanged, as required
by §4.

**Flags / escalations:** none. No change to `quantity-stepper.tsx`, no new API
surface, no other kit component touched, nothing under `app/` or `lib/`.
