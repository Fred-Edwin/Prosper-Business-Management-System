# Session 10b Handoff — Developer: **Kit Remediation, Part 3 — Storybook + Visual-Regression + a11y Gates** (Deliverable 4)

**Status:** NOT STARTED.

**Role:** Developer, for the Prosper project. This is **Deliverable 4 of the
Session 9 remediation sprint**, split out of Session 10 at the owner's direction
(2026-08-27) so Session 10 could focus on the component audit + fixes. Its
product is a **permanent, CI-runnable proof harness for the component kit** —
one Storybook story per state per component, visual-regression snapshots
(including a diff against the Paper artboard for every REST state and every
Paper-drawn state), and axe accessibility gates.

**This session builds no components and touches no feature screen.** Session 10
already brought every `components/kit/*` to the §9 contract + full keyboard +
ARIA (`docs/design/kit-audit.md`). This session **proves** that, per state,
forever.

---

## Required reading (before any code)

1. **`CLAUDE.md`** — role model, **pnpm only**, **post a visible checklist**.
2. **`docs/design/kit-audit.md`** — the Session 10 before → after record. §"Remaining
   gaps" lists **10 owner-sign-off items** — this session's Storybook is where
   the owner reviews `Toast` / `PageShell` / `DatePicker` API / `QuantityStepper`
   typed input / the 2 hover tokens / `Button` `sm`+`lg` / `PillFilter`
   radiogroup. Build those stories **first** and flag them "NEW / CHANGED —
   needs owner review".
3. **`docs/design/component-states.md §9`** — the per-component implemented-state
   matrix. Every "implemented" row needs a story; every state in a component's
   §2 matrix needs a named story.
4. **`docs/DECISIONS.md` ADR-42** (Storybook adopted) **and ADR-43** (draft —
   this session finalises it after the owner review).
5. **`app/globals.css` §9** — know every `.kit-*` utility + the new
   `.kit-drawer-panel` / `.kit-sheet-panel` / `.kit-dialog-panel` +
   `.kit-scrim` fade, so the interaction-state `play` assertions read the right
   computed values.
6. **`app/design-system/tokens.css` + `tokens.ts`** — the visual acceptance
   values. `tokenValue("--color-accent-hover")` etc. is how a `play` function
   asserts "hover bg === the token".
7. **`node_modules/next/dist/docs/`** — Next **16.3.1**, React **19.2**,
   Tailwind **v4.3.3**. **Read the CSS + config guidance before writing
   `.storybook/` config.** This is not the Next.js in your training data.
8. **The Paper file** — via the `paper` MCP, **READ-ONLY** (`get_*` only).
   `get_guide({ topic: "paper-mcp-instructions" })` first. `get_screenshot` +
   `get_computed_styles` on each kit artboard + its state rows (ids in
   `design-principles.md §7`; state rows in `component-states.md §8`) for the
   visual-diff baselines.

---

## Scope — what "done" means

### 4a. Stand up Storybook

- `pnpm add -D` the Storybook **v8** packages for **Next.js + Vite**. Check
  SB8 ↔ Next 16 compatibility: likely `@storybook/nextjs-vite` (or
  `@storybook/experimental-nextjs-vite` if that's the current name for this SB
  version) rather than the webpack `@storybook/nextjs`. `pnpm dlx
  storybook@latest init`, then trim the generated boilerplate.
- Config in `.storybook/` (`main.ts`, `preview.ts`). `preview.ts` **must**
  `import "../app/design-system/tokens.css"` and `import "../app/globals.css"`
  so every story renders exactly as in the app.
- `package.json` scripts: `storybook`, `build-storybook`.
- Addons: `@storybook/addon-a11y`, `@storybook/addon-interactions` (or the
  bundled `test` package), `@storybook/test-runner`.

### 4b. One story per state, per component

Co-locate as `components/kit/<name>.stories.tsx` (or a
`components/kit/__stories__/` dir — pick one, be consistent). For **all 32 kit
components + the 4 primitives**, a named story for each applicable:
`Rest`, `Hover`, `FocusVisible`, `Active`, `Disabled`, `Loading`,
`Error`/`Invalid`, `Selected`, `Open` (Select/DatePicker/Drawer/…),
`Empty` (tables/timeline), **plus every `variant` × `size`**.

- Hover / focus-visible / active / open via a `play` function
  (`@storybook/test` `userEvent` — `hover`, `tab`, `keyboard`) or the `pseudo`
  addon.
- The `Drawer` / `FrictionDeleteDialog` / `BottomSheet` / `MobileNavDrawer`
  stories **must show the `.kit-scrim` + blur** and the slid-in panel.
- **Owner-review stories first**, each with a Storybook `parameters` note or a
  `docs` block saying exactly what to sign off:
  - `Toast` — the two placements, the stack, the auto-dismiss + pause,
    `info`/`success`/`danger`.
  - `PageShell` — with/without a toolbar, `wide`, `flush`, at `< md` and
    `≥ md`.
  - `DatePicker` — the real-calendar mode (`selected`/`onSelect`) **and** the
    legacy `weeks` mode side by side; the keyboard nav.
  - `QuantityStepper` — typed entry + `↑`/`↓` + the error-on-typed-value state.
  - `Button` — the `sm` / `md` / `lg` row (md is the only artboard).
  - `PillFilter` — the radiogroup arrow-key behaviour.
  - `Banner` / `PurchaseDeliveryBanner` — the `Hover` story asserting the
    Accept/Match button hovers to `--color-success-hover` / `--color-info-hover`.

### 4c. Visual-regression snapshots

- `@storybook/test-runner` + Playwright — screenshot **every** story.
- **Also** — for each component's `Rest` story and every state Paper draws
  (button disabled, input focus/error, toggle disabled, corrected ledger cell,
  Select-open, DatePicker-open — `component-states.md §8`) — a diff against a
  `get_screenshot` of the corresponding Paper artboard node at **2× DSF**
  (the method Sessions 4a–4c used for screens; pull exact values with
  `get_computed_styles`, never eyeball a screenshot).
- Commit baselines under `tests/visual/__screenshots__/`.
- `pnpm test:visual` in `package.json`.
- **A rewrite changes behaviour + token usage, not layout or colour** — if a
  `Rest` diff fails, the fix is almost always the story/baseline, not the
  component (Session 10 kept every REST visual byte-identical). Investigate
  before re-baselining.

### 4d. Interaction-state assertions (the permanent Gate-2 equivalent)

Each `Hover` / `FocusVisible` / `Active` / `Disabled` / `Loading` /
`Error` / `Selected` story's `play` function reads `getComputedStyle` and
asserts the value **matches the §9 rule / the token** — exactly like Session
9's throwaway Gate-2 probe, but permanent and per-component. Examples:
- `Button/Hover` (primary) ⇒ `background-color === tokenValue("--color-accent-hover")`
- `Button/Hover` (destructive) ⇒ `=== --color-danger-hover`
- `TextInput/Error` ⇒ field `border-color === --color-danger` **and** the
  `<FormField>` helper `<p>` is present with `role`/`id` wired to
  `aria-describedby`
- `Tabs` ⇒ `ArrowRight` moves `aria-selected` and DOM focus; only the selected
  tab has `tabIndex=0`
- `Select/Open` ⇒ `↓` moves `aria-activedescendant`; `Enter` selects + closes
- `Drawer/Open` ⇒ `.kit-scrim` present with `backdrop-filter`; focus is inside
  the panel; `<html>` has `overflow:hidden`; Esc closes and focus returns to
  the opener

### 4e. Accessibility gate

- `@storybook/addon-a11y` (axe) on every story.
- `pnpm test:a11y` — CI-runnable, **fails on any serious/critical axe
  violation**.
- Expect to find and fix small things the Session 10 audit didn't catch
  (contrast on a disabled label, a missing `aria-label` on an icon-only
  control in a story fixture). Real component fixes are in scope **if** axe
  flags them; new design is not — flag and stop.

### 4f. Wire into the docs

- `package.json` — `storybook`, `build-storybook`, `test:visual`, `test:a11y`.
- **`docs/TEST_PLAN.md`** — the kit is gated by Storybook + visual-diff + a11y;
  screens (Session 11 onward) are gated by composed-screen visual-diff vs the
  Paper artboard (default state) + a Playwright interaction pass
  (hover/focus/pressed/disabled/loading/empty/error) + responsive + axe.
- **`docs/DECISIONS.md` ADR-43** — finalise it with the owner-review outcomes
  (Toast placement, PageShell padding, DatePicker/QuantityStepper API, the 2
  hover tokens, Button sizes). If the owner rejects any, that's a follow-up
  component change **in this session** (still no screen touched).
- **`docs/PROGRESS.md`** — a Session 10b entry.
- **`docs/design/kit-audit.md`** — tick the 10 "Remaining gaps" as
  ratified / changed / rejected.

**Gate 4:** `pnpm storybook` runs; every component + primitive has a story per
state; `pnpm test:visual` + `pnpm test:a11y` pass; baselines committed; the
**80 `pnpm test` unit tests still green**; `pnpm tsc --noEmit` + `pnpm build`
clean; **no feature screen file touched**.

---

## Constraints

- **Proof harness, not features, not redesign.** No new component behaviour
  except axe-driven a11y fixes and whatever the owner review of the 10 flagged
  items requires.
- **Do NOT touch feature screen files** — same off-limits list as Session 10
  (`app/admin/**`, `app/store-manager/**`, `app/canteen/**`, `app/cashier/**`,
  `app/design-preview/**`, `docs/design/screens/**`).
- **DO touch:** `.storybook/**`, `components/kit/**` (stories + axe fixes +
  owner-review changes only), `tests/visual/**`, `package.json`, docs.
- **Paper is read-only.** `get_*` only.
- **pnpm only.** Read `node_modules/next/dist/docs/` before config code.
- Keep the **80 unit tests green** throughout.

---

## Note on sequencing

1. Session 9 (done) — tokens + §9 contract (Deliverables 1–2).
2. Session 10 (done) — component audit & fix + 4 primitives (Deliverable 3).
3. **Session 10b (this) — Storybook + visual-regression + a11y (Deliverable 4).**
4. Session 11 — rebuild the shipped screens as kit compositions + rewrite the
   workflow docs (`session-11-handoff.md`).
5. Session 12 — F2 Store Manager + Canteen frontend, built the new way.
6. Session 13 — F3 Assets, same method.
7. QA pass.
