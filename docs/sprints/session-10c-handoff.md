# Session 10c Handoff — Developer: **Finish the Kit Proof Harness (Deliverable 4, cont.)**

**Status:** IN PROGRESS. Continues Session 10b. The Storybook toolchain is
stood up and 19 of ~37 story files are written (15 green, 4 red on one shared
bug). This session finishes the story set, fixes the open bug, wires the
Paper-artboard visual diff, and completes the docs.

**Role:** Developer, Prosper project. This is still Deliverable 4 of the
Session 9 remediation sprint — a **permanent, CI-runnable proof harness for
the component kit**: one Storybook story per state per component, visual-
regression snapshots (incl. a diff vs the Paper artboard for every REST /
Paper-drawn state), and axe accessibility gates. **You build no feature
screens and touch no feature-screen file.**

---

## Required reading (before any code)

Same as `docs/sprints/session-10b-handoff.md` — read that file first; it is
the authoritative scope for Deliverable 4. Then:

1. **`CLAUDE.md`** — role model, **pnpm only**, post a visible checklist.
2. **`docs/design/kit-audit.md`** — the Session 10 before→after record and the
   "Remaining gaps" list (owner sign-off items — see "Owner review" below).
3. **`docs/design/component-states.md §2` + `§9`** — the per-component state
   matrix. Every applicable state needs a named story.
4. **`docs/DECISIONS.md` ADR-42 (Storybook adopted) + ADR-43 (draft)** — you
   finalise both this session (see "Docs" below).
5. **`app/globals.css §9`** + **`app/design-system/tokens.css` / `tokens.ts`** —
   the interaction-state contract and the token values the `play` / postVisit
   assertions check against.
6. **`node_modules/next/dist/docs/`** — Next 16.3.1, React 19.2, Tailwind
   v4.3.3. This is not the Next.js in your training data.
7. **The Paper file** via the `paper` MCP, **READ-ONLY** (`get_*` only).
   `get_guide({ topic: "paper-mcp-instructions" })` first. (In Session 10b the
   `paper` MCP disconnected mid-session and could not be reloaded into the
   running session — you have it fresh.)

---

## What is already done — do NOT redo

### Toolchain (stood up, validated end-to-end)

- **Storybook 9.1.20** on `@storybook/nextjs-vite` (Vite builder), plus
  `@storybook/addon-a11y@9.1.20`, `@storybook/test-runner@0.24.4`,
  `axe-playwright@2.2.2`, `jest-image-snapshot@6.5.2`. All `devDependencies`.
  - **Deviation from the 10b handoff (which said "Storybook v8"):** SB8's Next
    adapter (`@storybook/experimental-nextjs-vite@8.6.x`) declares
    `next: ^14 || ^15` only. `@storybook/nextjs-vite@9` is the first release
    declaring Next 16 + React 19 support. **The owner approved SB 9.1.x.** This
    still needs recording in `DECISIONS.md` ADR-42 (see Docs).
- **`.storybook/main.ts`** — globs `../components/**/*.stories.@(ts|tsx)`;
  addons `@storybook/addon-a11y`; framework `@storybook/nextjs-vite`;
  `typescript.check: false`.
- **`.storybook/preview.ts`** — imports `../app/design-system/tokens.css` then
  `../app/globals.css` (so stories render byte-identically to the app);
  `backgrounds` (surface-page / surface-subtle / nav-bg); `a11y.test: "error"`.
  Also injects a `<style data-storybook-speedups>` that forces
  `transition-duration: 1ms` / `animation-duration: 1ms` on `*` so animations
  settle in the runner and `transitionend` still fires.
- **`.storybook/test-runner.ts`** — the CI-gate contract. `postVisit` runs, in
  order:
  1. **`parameters.interaction`** — apply a REAL Playwright pseudo-state
     (`hover` / `focus` / `active` selectors, scoped under `#storybook-root`),
     then browser-side assertions: `assertColor: [{selector, prop, token}]`
     (computed value === the resolved token, via a throwaway probe node) and
     `assertFocusRing: <selector>` (computed `outline-style`/`-width` non-zero).
     This is the permanent form of Session 9's Gate-2 probe. `@storybook/test`'s
     in-page `userEvent.hover` does NOT engage CSS `:hover` in the runner — a
     CDP mouse move does, which is why hover/focus/active assertions live here,
     not in `play`.
  2. **a11y gate** — axe over `#storybook-root`, `runOnly` tags
     `wcag2a/2aa/21a/21aa`, FAILS on any serious/critical. Per-story opt-out:
     `parameters.a11y.disable = true` (skip) or
     `parameters.a11y.config.rules = [{ id, enabled: false }]` (one rule off) —
     each such case is a documented FLAG, never a silent pass.
  3. **visual gate** — `#storybook-root` screenshot vs
     `tests/visual/__screenshots__/<story-id>.png`, `failureThreshold: 0.02`
     percent. Story opt-out: `parameters.visual.disable = true` (used by every
     overlay story — the panel portals to `<body>`, outside `#storybook-root`).
- **`package.json` scripts:** `storybook`, `build-storybook`, `test:visual`,
  `test:a11y` (the last two are the same `test-storybook` run; the names signal
  intent — both gates always execute).
- **`pnpm-workspace.yaml`** — `allowBuilds` for `@swc/core` + `unrs-resolver`
  (native deps the SB Vite builder needs).
- **`components/kit/__stories__/story-utils.ts`** — `resolveTokenColor` /
  `resolveTokenTextColor` / `expectComputedColor` / `expectFocusRing` helpers
  for in-`play` assertions (non-pseudo states only).

### Story pattern (follow this for the remaining files)

- Co-locate as `components/kit/<name>.stories.tsx`. `title: "Kit/<Name>"` (or
  `"Kit/Primitives/<Name>"` for spinner/form-field/toast/page-shell). For
  owner-review components the title carries a `— NEEDS OWNER REVIEW` suffix.
- A named story for each applicable state from that component's
  `component-states.md §2` row: `Rest`, `Hover`, `FocusVisible`, `Active`,
  `Disabled`, `Loading`, `Error`/`Invalid`, `Selected`, `Open`, `Empty`, plus
  every `variant × size`.
- Interaction-state visual/token assertions → `parameters.interaction`.
- Behavioural assertions (keyboard/APG, aria wiring, attrs) → `play`.
- Overlay/portal stories → `parameters: { visual: { disable: true } }` and
  assert against `document.body` in `play`.
- Meta typing: `const meta: Meta<typeof X> = {...}` (NOT
  `satisfies Meta<typeof X>` — that forces `args` on every render-only story).
- Look at these already-written files as worked examples covering every
  assertion type: **button** (interaction colour + size review),
  **tabs** / **pill-filter** / **segmented-control** (roving/APG keyboard),
  **select** (APG listbox + a11y rule-scoping for a FLAG),
  **text-input** / **form-field** (§9.8 error wiring),
  **drawer** / **friction-delete-dialog** / **bottom-sheet** (overlay contract),
  **date-picker** (real-calendar keyboard nav + meta-level a11y rule-scoping),
  **toast** / **page-shell** (owner-review notes).

### Component fixes already made this session (current state of these files)

These were §9 / APG / a11y conformance bugs the Session 10 audit missed, that
the harness exposed. All done, `pnpm tsc --noEmit` clean, **80 unit tests
green**:

| File | Change |
|---|---|
| `components/kit/internal/roving.ts` | `move()` now `.focus()`es the newly-selected item (was: changed selection but left DOM focus behind). Added an `itemRef(key)` callback ref + a pending-focus effect. |
| `components/kit/tabs.tsx`, `pill-filter.tsx`, `segmented-control.tsx` | wired `itemRef` onto each item button for the above. |
| `components/kit/pill-filter.tsx` | active pill pins `[--kit-hover-bg:var(--surface-selected)]` + `[--kit-active-bg:...]` — §9.4 "selected wins over hover" (was repainting grey on hover). |
| `components/kit/segmented-control.tsx` | active segment pins hover/active bg to `--surface-page` — same §9.4 issue. |
| `components/kit/bottom-sheet.tsx` | `aria-labelledby` only when the title node is actually rendered (peek state was dangling `aria-labelledby` → axe `aria-dialog-name`). Now falls back to `aria-label`. |
| `components/kit/internal/overlay.ts` | `useOverlayTransition`: added a 400ms `setTimeout` unmount fallback (panel could get stuck mounted if `transitionend` never fired). `useFocusTrap`: cleanup now re-calls the focus-restore inside a `requestAnimationFrame` as well as synchronously. **NOTE: the focus-restore is still not working — see Open Issue below.** |

### Owner review — ALL 7 ITEMS APPROVED AS-IS (this session)

The owner reviewed the flagged stories in Storybook and approved every item
as-is. You still need to *record* this (ADR-43 + kit-audit — see Docs). The 7:

1. `Button` `size` prop (`sm` 32 / `md` 36 / `lg` 44; `md` = the sole artboard)
2. `Toast` — placement (`top-right` admin / `bottom-center` staff), 4-visible
   stack cap, 4000ms auto-dismiss, pause-on-hover, tone + hairline left border
3. `PageShell` — `--content-max` 1200, `--sp-7`/`--sp-8` padding, sticky
   toolbar row, `wide` / `flush` escape hatches
4. `PillFilter` as `role="radiogroup"` + arrow-key select
5. `DatePicker` real-calendar `selected` / `onSelect` API + keyboard nav
   (legacy `weeks` prop kept as an escape hatch)
6. `QuantityStepper` typed `<input role="spinbutton">` + `↑`/`↓`
7. `--color-success-hover` / `--color-info-hover` tokens (Banner Accept / Match
   button hover)

### Story files written & GREEN (15)

`button`, `spinner`, `form-field`, `toast`, `page-shell`, `icon-button`,
`tabs`, `pill-filter`, `segmented-control`, `text-input`, `textarea`,
`search-input`, `toggle-switch`, `select`, `date-picker`.

### Story files written & RED (4 — one shared bug, see Open Issue)

`drawer`, `friction-delete-dialog`, `bottom-sheet`, `mobile-nav-drawer`. Each
fails ONE assertion (`OverlayContract` / `BackdropAndContract`): after
`{Escape}` closes the overlay, `expect(opener).toHaveFocus()` fails —
`document.activeElement` is `<body>`. **Everything else in these stories
passes** (scrim present + `backdrop-filter` blur; focus moves into the panel
on open; focus trapped; Esc unmounts the panel; scroll-lock applied/released).
`quantity-stepper.stories.tsx` is NOT yet written (component is done, story
pending).

Latest full run: **19 story files, ~104 stories, 4 failing** (all the same
focus-restore assertion). `pnpm tsc --noEmit` clean; `pnpm test` = 80 passed.

---

## OPEN ISSUE — overlay focus is not restored to the opener on close

**You are the accessibility / React-internals expert on this. Form your own
hypothesis and your own fix. The notes below are observations and dead ends,
not a prescription.**

### Symptom

In `drawer.stories.tsx`, `friction-delete-dialog.stories.tsx`,
`bottom-sheet.stories.tsx`, `mobile-nav-drawer.stories.tsx`, the
`OverlayContract` (or `BackdropAndContract`) story:

- opens the overlay from a trigger button,
- asserts scrim + blur + focus-in + trap (all pass),
- presses `{Escape}`,
- waits for the dialog to unmount (passes),
- asserts `expect(opener).toHaveFocus()` — **FAILS; `document.activeElement`
  is `<body>`**.

WCAG 2.4.3 (Focus Order) expects focus to return to the element that invoked
the overlay. `kit-audit.md` claims this is implemented
("on close (Esc / scrim click / ×): focus returns to the opener"). The harness
shows it isn't.

### Relevant code

- `components/kit/internal/overlay.ts`:
  - `useOverlayTransition(open)` — `mounted` / `phase` (`opening`→`open`→
    `closing`); unmounts on the panel's `onTransitionEnd` calling `endExit()`,
    now also a 400ms `setTimeout` fallback.
  - `useFocusTrap(panelRef, active)` — captures
    `document.activeElement` into `restoreRef` at effect-run time, moves focus
    into the panel, traps Tab, and on cleanup calls `restoreRef.current.focus()`
    (now also re-called in a `requestAnimationFrame`).
  - `useBackgroundInert(containerRef, active)` — sets `inert` +
    `aria-hidden` + `pointer-events:none` on every `<body>` child that isn't
    the overlay container.
  - `useScrollLock(mounted)`, `useActiveOverlay(active)`.
- Hook call order in all 4 overlay components (e.g. `components/kit/drawer.tsx`
  ~L71): `useActiveOverlay` → `useScrollLock` → `useBackgroundInert` →
  `useFocusTrap` → `useEscToClose`.
- `active = mounted && phase !== "closing"`.

### An observation (not a conclusion)

`useBackgroundInert` runs before `useFocusTrap` in the component, and both are
passive effects. When the overlay opens, the opener's container gets `inert`
before `useFocusTrap` reads `document.activeElement` — so the value it saves as
the restore target may already be `<body>` (setting `inert` on an ancestor
blurs a focused descendant). On close it then "restores" focus to `<body>`,
which is a no-op-looking pass-through. This is a guess; verify it (log what
`restoreRef` actually captures, check effect ordering, check whether `inert`
is the cause or a red herring).

### What was tried and did NOT fix it

1. Wrapping the story's post-close `expect(opener).toHaveFocus()` in
   `waitFor(...)`.
2. The 400ms `setTimeout` unmount fallback in `useOverlayTransition` (helped
   overlays unmount deterministically in the runner; no effect on the focus
   target).
3. A double `requestAnimationFrame` re-call of the restore in `useFocusTrap`'s
   cleanup.
4. The 1ms-transition speedup in `preview.ts` (unrelated — makes exit
   transitions settle; the restore target is still wrong).
5. Considered, NOT implemented: moving the restore-target capture into a
   `useLayoutEffect`.

### Scope note

This is a real bug, in scope to FIX (not flag) — WCAG 2.4.3, and the audit
claims it works. The fix may land in `overlay.ts`, in the hook-call order in
the 4 components, or elsewhere — your call. When fixed, all 4 story files
should go green with no other change (they are otherwise complete and correct).
Keep the 80 unit tests green and `pnpm tsc --noEmit` clean.

---

## Remaining tasks

### 1. Finish the story files (~19 left)

Write `components/kit/<name>.stories.tsx` for, each with a named story per
applicable `component-states.md §2` state + the §9 interaction assertions:

- **quantity-stepper** (owner-review item 6 — flag "typed input, NEW"): default
  / at-bound (− or + disabled) / focus (value field) / error (out-of-range
  typed value) / `↑`/`↓` steps / `role="spinbutton"` + `aria-valuenow`/`-min`/
  `-max`/`-valuetext`.
- **banner** + the **PurchaseDeliveryBanner** variant (owner-review item 7 —
  the `Hover` story must assert the Accept button hovers to
  `--color-success-hover` and the Match button to `--color-info-hover`):
  transfer (amber) / purchase-delivery (blue) pinned / Accept + Flag actions /
  flagged (muted status line).
- **match-card**: awaiting ("1-Tap Match") / matched / flagged / submitting
  (`<Button loading>`).
- **simple-table**: header / body row / row hover (`--surface-hover`, only when
  `onRowClick`) / empty (`<EmptyState>` slot) / loading (skeleton) /
  keyboard-operable clickable rows.
- **dense-ledger**: header / data row / row hover (gated on `onCellClick`) /
  corrected cell (underlined semantic colour, ADR-36a) / empty / loading /
  keyboard-operable cells.
- **bulk-entry-grid**: header / editable cell default+focused / non-editable /
  error (danger border + value; documented no-helper-row exception) /
  valuation footer / Dish row.
- **status-chip** (5 semantic variants — display-only, `no change needed`),
  **condition-chip** (3 variants — display-only).
- **breadcrumb** (link hover; `aria-hidden` separator; `aria-current="page"`).
- **action-tile-grid** (default / count badge / pressed / disabled).
- **activity-timeline** (default / empty `role="status"`).
- **dense-summary-strip** (default / ± emphasis — on `nav-bg` background).
- **flow-header** (default with direction badge / no-badge variant /
  back-pressed).
- **bottom-nav** (active `aria-current="page"` / inactive / pressed;
  `<nav aria-label>`).
- **empty-state** (default / filtered-no-results; `role="status"` on the
  filtered case; action composes `<Button>`).
- **error-state** (`role="alert"`; Retry composes `<Button variant="secondary">`).
- **instructional-banner** (numbered, `--surface-selected` tint — display-only).
- **calculated-impact-banner** (`role="status"`, `--color-warning-bg` —
  display-only).
- **admin-shell nav-item states** (`components/shells/admin-shell.tsx` — the one
  shell file the 10b handoff allows touching, and only for nav-item interaction
  states + landmarks): §9.3 hover `--nav-bg-hover` on the dark rail (NOT
  `--surface-hover`), §9.4 active `--nav-bg-active` + `aria-current`, §9.1
  on-dark focus ring (`.kit-focus-on-dark`). Story renders the rail and asserts
  these; only touch the component if axe flags something.

### 2. Full clean run + commit baselines

`pnpm storybook` (restart if needed — it may still be running at
`http://127.0.0.1:6006`), then `pnpm test:visual` and `pnpm test:a11y` — both
green. Commit every baseline under `tests/visual/__screenshots__/`. Run the
test-runner at **`--maxWorkers 2`** (3+ OOM'd this machine).

**Note on visual baselines:** a REST-story diff failing almost always means the
story/baseline is wrong, not the component — Session 10 kept every REST visual
byte-identical. Investigate before re-baselining with `-u`.

### 3. Paper-artboard visual diff (handoff 4c — not yet wired)

For each component's `Rest` story and every state Paper actually draws
(`component-states.md §8` — button disabled, input focus/error, toggle disabled,
corrected ledger cell, Select-open, DatePicker-open, …): diff the story
screenshot against a `get_screenshot` of the corresponding Paper artboard node
at **2× DSF**. Artboard ids are in `design-principles.md §7`
(`6BR-0` Buttons, `6CG-0` Form Controls, `6DJ-0` Chips, `6ET-0` Tables,
`6IW-0` Tabs/Filters, `6OE-0` Drawers/Dialogs, `6R4-0` Stat Tiles,
`6SB-0` Banners/Cards, `6TT-0` Bulk Grid, `6WD-0` Utility/Layout,
`6Z4-0` Bottom Sheet, `9U3-0` Empty/Error). State-row ids are in
`component-states.md §8`. Pull exact values with `get_computed_styles` — never
eyeball a screenshot. `paper` MCP is `get_*` only (READ-ONLY). Method matches
what Sessions 4a–4c used for screens.
(Session 10b pulled reference screenshots of `6BR-0`, `6CG-0`, `6ET-0`,
`6OE-0`, `6SB-0` but did not wire the diffs.)

### 4. Docs

- **`docs/DECISIONS.md` ADR-42** — add a note: Storybook **9.1.x** was used,
  not v8; v8's Next adapter tops out at Next 15; owner approved.
- **`docs/DECISIONS.md` ADR-43** — finalise (it is DRAFT). Mark all 7
  owner-review items **ratified** (owner approved this session, in Storybook).
- **`docs/design/kit-audit.md`** — tick the "10 remaining gaps" as ratified.
  **Add the new flags found this session:**
  - `TextInput` / `Textarea` carry `.kit-field` (§9.2 accent border on focus)
    but NOT `.kit-focus-ring` (§9.1 keyboard-only ring) — `Select` has both.
    Adding a ring to the two field boxes is a visual change → routed to a
    design sprint. The `text-input` story documents this and asserts the §9.2
    border only.
  - Systemic low-contrast dimmed text: `--text-tertiary` (`--color-gray-500`)
    on `--surface-page` ≈ 3.4:1 (< WCAG AA 4.5:1) — the Select placeholder and
    DatePicker out-of-month / disabled-future day cells. Matches the drawn
    Paper visual (dimmed = intentionally low-contrast). `color-contrast` is
    scoped off in those stories with FLAG notes → design-sprint decision
    (darken placeholders to `--text-secondary`, or accept as incidental text).
- **`docs/TEST_PLAN.md`** — the kit is gated by Storybook + visual-diff + a11y;
  screens (Session 11 onward) are gated by composed-screen visual-diff vs the
  Paper artboard (default state) + a Playwright interaction pass
  (hover/focus/pressed/disabled/loading/empty/error) + responsive + axe.
- **`docs/PROGRESS.md`** — a Session 10c entry (what shipped, the component
  fixes, the two new flags, what's carried).
- **`docs/sprints/session-10b-handoff.md`** — flip `Status:` to `done` once
  Gate 4 passes. (Optionally also mark this file done.)

### 5. Gate 4 (definition of done)

`pnpm storybook` runs; every `components/kit/*` component + the 4 primitives
(`Spinner`, `FormField`, `Toast`, `PageShell`) has a story per state;
`pnpm test:visual` + `pnpm test:a11y` pass; baselines committed; the **80
`pnpm test` unit tests still green**; `pnpm tsc --noEmit` + `pnpm build` clean;
**no feature-screen file touched** (`app/admin/**`, `app/store-manager/**`,
`app/canteen/**`, `app/cashier/**`, `app/design-preview/**`,
`docs/design/screens/**`).

---

## Constraints

- **Proof harness, not features, not redesign.** No new component behaviour
  except axe-driven a11y fixes and whatever the (already-approved) owner-review
  items require.
- **DO touch:** `.storybook/**`, `components/kit/**` (stories + axe fixes),
  `components/kit/internal/**` (the open focus bug), `components/shells/admin-shell.tsx`
  + `components/shells/mobile-nav-drawer.tsx` (nav-item interaction states /
  overlay contract only), `tests/visual/**`, `package.json`, docs.
- **Do NOT touch feature-screen files** (list above).
- **Paper is read-only.** `get_*` only.
- **pnpm only.** Read `node_modules/next/dist/docs/` before any config code.
- Keep the **80 unit tests green** throughout.
- **Git:** nothing is committed this session. Working tree has the new
  `.storybook/`, `components/kit/*.stories.tsx`, `components/kit/__stories__/`,
  `tests/visual/__screenshots__/`, the modified `components/kit/*` +
  `components/kit/internal/*`, and `package.json` / `pnpm-lock.yaml` /
  `pnpm-workspace.yaml`. Commit only when the owner asks; if you do, branch
  first (currently on `main`).

## Practical notes

- Storybook may still be running at `http://127.0.0.1:6006` in the background;
  restart with `pnpm storybook` if not.
- Test-runner: `node_modules/.bin/test-storybook --url http://127.0.0.1:6006
  --maxWorkers 2`. It has no `--testPathPattern`; it runs all discovered
  stories. Full run ~2 min.
- The `parameters.a11y.config.rules` opt-out is passed straight to
  `axeOptions.rules` in `test-runner.ts` (going through `configureAxe`
  alongside a tag `runOnly` did not stick).
