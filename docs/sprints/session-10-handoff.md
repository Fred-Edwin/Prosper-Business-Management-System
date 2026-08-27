# Session 10 Handoff — Developer: **Kit Remediation, Part 2 — Component Audit & Fix + Storybook / Visual / a11y Gates**

**Status:** DELIVERABLE 3 DONE (2026-08-27). **Deliverable 4 was split into its
own session** — `docs/sprints/session-10b-handoff.md` — at the owner's
direction, so Session 10 could focus on the audit + per-component fixes + the
4 new primitives. See `docs/PROGRESS.md` "Session 10" and
`docs/design/kit-audit.md`. Gate 3 passed: `pnpm tsc --noEmit` + `pnpm build`
clean, 80 unit tests green, no feature screen touched, `lib/tokens.css`
deleted. 10 items flagged for owner review at 10b (`kit-audit.md §"Remaining
gaps"`); ADR-43 drafted.

**Role:** Developer, for the Prosper project. This is the **second half of
the Session 9 remediation sprint** (Session 9 ran long and was split). It
is **not** a feature sprint and **not** a design sprint. Its product is a
**proven, fully-interactive component kit** — every `components/kit/*`
component implementing every interaction state it needs, plus the small
set of missing primitives, all provable in isolation via Storybook with
visual-regression and accessibility gates.

**No feature screens are built or touched.** The shipped screens
(`app/admin/**` etc.) are rebuilt as kit compositions in the session
*after* this one.

---

## What Session 9 already did (Deliverables 1 + 2 — DONE, gated)

Read the **Session 9 entry in `docs/PROGRESS.md`** and
**`docs/design/token-reconciliation.md`** (owner-signed) first. Summary:

### Deliverable 1 — tokens codified (Gate 1 passed)

- **`app/design-system/tokens.css`** — the `:root` source of truth. The
  71 existing foundation tokens (identical to the retired `lib/tokens.css`
  and Paper `contentHash 710ac1c5`) **plus ~55 new tokens** the design
  system never had in code: control-height / icon / tap / content-max
  sizing, the elevation ladder (`--shadow-sm/md/lg/drawer/dialog`), the
  **z-index scale** (`--z-dropdown 1000 … --z-toast 1500`), motion
  (`--dur-fast/base/slow`, `--ease-standard/decelerate/accelerate`),
  opacity (`--opacity-disabled/loading-label/scrim`), breakpoints
  (`--bp-sm/md/lg/xl` = Tailwind defaults), border widths, tracking, and
  4 new semantic colors (`--surface-active`, `--surface-raised`,
  `--text-inverse`, `--color-danger-hover`).
- **`app/design-system/tokens.ts`** — typed mirror + `token()` /
  `tokenValue()` / `breakpoints` helpers. **`tokens.test.ts`** is a
  drift-guard: it parses `tokens.css` and fails if the two disagree. **If
  you add or change a token, edit both files** or that test breaks (by
  design — don't loosen it).
- **`app/globals.css`** imports `tokens.css` (was `../lib/tokens.css`).
  `lib/tokens.css` is now a one-line redirect stub — safe to delete once
  you confirm nothing imports it.
- **D2 / ADR-41 — the "transparent modal" fix at the token level.**
  `--surface-panel-tint` (`#A690B838`, 38% alpha) was being used as the
  *only* fill on every drawer/dialog panel — confirmed in Paper via
  `get_computed_styles` on `6Q6-0` / `6OH-0` / `7S9-0`. It is **retired**.
  Panels now use the opaque **`--surface-raised`**
  (`oklch(93.3% 0.011 308.3)` ≈ `#EBE7EF` — the veil flattened over
  white; still a subtle lavender that reads as "raised" against the white
  body, but never see-through). A **deprecated alias**
  `--surface-panel-tint: #a690b838` is kept in `tokens.css` **only** so
  the not-yet-rebuilt feature screens and `/design-preview` washes don't
  render a broken (undefined-var) background. **You migrate the kit
  components off it this session (§Deliverable 3c below). The session
  after this deletes the alias.**
- **D3 / ADR-42** — Storybook is the adopted harness (this session sets
  it up). **D4** — owner chose **NOT** to add `prefers-reduced-motion`
  reduction. Do not add a `@media (prefers-reduced-motion: reduce)` block.
  The single pre-existing one (`.kit-skeleton { animation: none }`) stays
  as an accessibility floor and is **not** extended.
- `docs/design/design-principles.md §6` updated with a "tokens now live in
  code" pointer.

### Deliverable 2 — the §9 interaction contract as shared CSS (Gate 2 passed)

`app/globals.css` `§9` block is now **complete and token-driven** (was
partial + literal). Every rule 1–10 of `design-principles.md §9` has a
shared utility, authored **once**:

| Utility | Implements | Notes |
|---|---|---|
| `.kit-focus-ring` / `.kit-focus-on-dark` | §9.1 | `:focus-visible` only; `--focus-ring-*` tokens; never transitioned; white on dark |
| `.kit-field` | §9.2 + §9.8 | accent border on **any** focus; `[aria-invalid]` / `[data-invalid]` / `:has(:invalid)` → danger border (wins even while focused); `@media (hover:hover)` hover → `--border-strong`; disabled handled |
| `.kit-row` | §9.3 + §9.4 | `@media (hover:hover)` `:hover` → `--surface-hover`; `:active` → `--surface-active`; `[data-selected]` / `[aria-current]` → `--surface-selected`, **wins over hover**. Apply **only to actually-clickable rows.** |
| `.kit-interactive` | §9.5 + §9.6 + §9.7 + §9.9 | transition **allow-list**: `background-color, border-color, color, opacity, transform` — never layout, never `outline`. Hover/active read `--kit-hover-bg` / `--kit-active-bg` / `--kit-hover-border` **custom props the component sets** per variant (primary → `--color-accent-hover`; secondary/tertiary/icon → `--surface-hover`; destructive → `--color-danger-hover`). `:disabled` / `[aria-disabled]` / `[data-disabled]` → `--opacity-disabled` + `pointer-events:none`. |
| `.kit-interactive[data-loading="true"]` | §9.10 | `pointer-events:none`; every child except `.kit-spinner` → `--opacity-loading-label`. Component renders the `<Spinner>` + keeps the control's width. |
| `.kit-skeleton` | §9.10 | `--surface-subtle` block + `--surface-hover` shimmer sweep, `1200ms`. The one reduced-motion exception. |
| **`.kit-scrim`** (NEW) | overlay backdrop | `position:fixed; inset:0;` `background: rgb(0 0 0 / var(--opacity-scrim))`; `backdrop-filter: blur(3px)` (+ `-webkit-`); `z-index: var(--z-overlay)` (1200). `[data-state="closed"]` → `pointer-events:none`. The panel it wraps sits at `--z-drawer` (1300) / `--z-dialog` (1400). |
| **`.kit-spinner`** (NEW) | §9.10 inline spinner | `--icon-sm` (14px) ring, `currentColor`, 640ms rotate. Rendered by the new `<Spinner>` primitive. |

Gate 2 was proved by a throwaway `/kit-probe` page + Playwright script
(deleted) asserting the computed style actually changes for each utility
on hover / focus-visible / active / disabled / invalid / loading /
selected — **11/11 passed**. Before/after values are in the PROGRESS
Session 9 entry.

**What this means for you:** the CSS contract is done. Your job in
Deliverable 3 is to make every component **opt into these utilities
correctly** and add the ARIA/keyboard behaviour — you are **not**
re-authoring interaction CSS.

---

## Required reading (before any code)

1. **`CLAUDE.md`** (root) — role model, non-negotiables, **pnpm only**,
   **post a visible checklist and tick it as you go**. This session makes
   **no new design decisions**: the design system is specified
   (`design-principles.md §6`/`§9`, `component-states.md`) and now
   codified (`app/design-system/`). The 4 new primitives are the only
   genuinely-new UI — build them minimal, from tokens + §9 + the house
   rules, and flag them for owner review in Storybook (see §3d).
2. **`docs/PROGRESS.md`** — the **Session 9 entry** (what's done, the
   Gate 1/2 evidence, the D1–D4 answers).
3. **`docs/design/token-reconciliation.md`** — the signed table. §1 is
   the full token list with rationale; §5 explains the best-practice
   basis for every gap value.
4. **`docs/design/design-principles.md`** — the whole file. Especially
   **§9** (the ten interaction rules you are enforcing per-component),
   **§4** (execution corrections — square-corner tables, no attribution
   avatars, the ledger shape, segmented-control active treatment), **§5**
   (Lucide icons), **§1** (house style — hairline dividers, **no shadows
   on content containers**, one accent, no bounce/spring).
5. **`docs/design/component-states.md`** — **the per-component spec.**
   §1 the M1 component list + where each is used + "Interactive? y/n";
   §2 the per-component state matrix (`ARTBOARD` = drawn in Paper, the
   visual reference; `GLOBAL` = the §9 rule; `n/a`); §8 the
   consistency-audit result (what's one canonical version, what's a
   documented content variant). **This tells you, per component, exactly
   which states it must have.**
6. **`app/design-system/tokens.css`** + **`tokens.ts`** — the vocabulary.
   Read the comments; they carry the rationale.
7. **`app/globals.css`** — the `§9` block (lines ~150–355). Know every
   `.kit-*` utility and its custom-prop hooks before you wire components
   to them.
8. **Every file in `components/kit/`** (32) and **`components/shells/`**
   (`admin-shell.tsx` is in scope — nav interaction states are
   kit-level). Read each. For each note: composes only tokens + `.kit-*`,
   or carries raw values / re-implements a state inline? Which §9 states
   present / missing / broken? ARIA + keyboard present?
9. **`node_modules/next/dist/docs/`** — before any config/route code
   (Storybook config especially). Next **16.3.1**, Tailwind **v4.3.3**,
   React **19.2**. `@import` in `globals.css` is the CSS mechanism (see
   `01-app/01-getting-started/11-css.md`). This is **not** the Next.js in
   your training data.
10. **The Paper file** — via the `paper` MCP, **READ-ONLY** this session
    (`get_*` only; no `write_html` / `set_*` / `create_*`).
    `get_guide({ topic: "paper-mcp-instructions" })` first. Then
    `get_basic_info`, and `get_computed_styles` + `get_screenshot` on the
    kit artboards and their state rows as you audit each component (the
    kit artboard ids are in `design-principles.md §7`; the state rows
    added in Design Sprint Session 2 are listed in
    `component-states.md §8` "New state artboards added this session").
    **Paper is the visual acceptance target for every component's REST
    state and for the few states it draws.**

---

## Scope — what "done" means

Two deliverables, in order. Do not start Deliverable 4 until 3 is
complete and its gate passes. (These are Deliverables **3 and 4** of the
original Session 9 handoff — numbering kept for continuity with
`session-9-handoff.md`.)

### Deliverable 3 — Audit and fix every kit component

For **all 32 components** in `components/kit/` (+ `components/shells/`
nav, `components/layout/`):

**3a. Audit — produce `docs/design/kit-audit.md`:** a table
`component × [tokens-only? | §9 states: present / missing / broken | keyboard | ARIA | notes]`.
For each component, list the required states from
`component-states.md §1`/`§2` and mark each **present / missing /
broken**. This is the before-picture; update it to the after-picture as
you fix (keep both columns).

**3b. Fix — bring every component to:**

- **Composes only tokens + `.kit-*` utilities.** No raw hex (the ONE
  remaining documented exception is `--color-gold-brand`, masthead-only —
  `--surface-panel-tint` is retired, migrate off it). No off-scale
  spacing. No inline re-implementation of a state a `.kit-*` utility
  covers (e.g. don't hand-roll a hover background if `.kit-interactive` +
  `--kit-hover-bg` does it).
- **Implements every applicable §9 state** — the audit's "missing" column
  goes to zero, or a remaining gap is explicitly justified in the audit
  doc with owner sign-off.
- **Full keyboard support** — Tab reaches it; Enter/Space activate; Esc
  closes overlays; **arrow keys** move within `Tabs` /
  `SegmentedControl` / `Select` / `PillFilter` menus per WAI-ARIA APG.
- **Correct ARIA** — `role`, `aria-*`, `aria-current` / `aria-selected` /
  `aria-invalid` / `aria-disabled` / `aria-modal` as the pattern
  requires.

**3c. Priority components — do these FIRST (they are the reported bugs):**

- **`Drawer` (`components/kit/drawer.tsx`)** — the big one. Current state
  (verified): it renders **just the panel `<div>`** — no scrim; panel
  background is `bg-(--surface-panel-tint)` (transparent); the Tab trap
  is partial (no no-focusable / dynamic-content handling); **no
  scroll-lock, no `inert` on the background, no focus-restore to the
  opener.** Bring it to:
  - Renders its **own `.kit-scrim`** (fixed, blurred, `--z-overlay`),
    panel on top at `--z-drawer`. Panel background → **`--surface-raised`**
    (opaque). `panel` and `rail` variants both.
  - On open: **focus moves into the panel** (first focusable, or the
    panel itself if none); focus is **trapped** (handle the no-focusable
    and dynamically-added-content cases — the current querySelectorAll
    snapshot misses nodes added after open); **background is `inert`**
    (`inert` attribute on the app root, or `aria-hidden` +
    `pointer-events:none` fallback); **`<html>` gets `overflow:hidden`**,
    restored exactly on close.
  - On close (Esc / scrim click / ×): focus **returns to the element
    that opened it** (capture `document.activeElement` on open).
  - **Two drawers never both interactive** — opening one closes/blocks
    the other (a module-level "active overlay" guard, or a context).
  - Slide-in via `transform` + `--dur-base` + `--ease-decelerate`;
    slide-out `--ease-accelerate`. No layout transition.
- **`FrictionDeleteDialog`** — same overlay treatment (`.kit-scrim`,
  `--z-dialog`, focus-trap, scroll-lock, focus-restore, opaque
  `--surface-raised` panel). Keep the ADR-36c prop contract
  (`cancelLabel` / `confirmLabel` / `title` / `bodyCopy` /
  `showArchiveLink`) and the retype-gate mechanic. Add the
  retype-mismatch error state (`.kit-field[data-invalid]`).
- **`BottomSheet`** — the staff-shell equivalent; same overlay contract,
  slide from the bottom (`transform`, `--dur-base`). Drag-to-dismiss
  optional. Peek + open states (`6Z4-0`).
- **`Button` / `IconButton`** — §9.5 hover **per variant** by setting the
  `--kit-hover-bg` custom prop (primary → `--color-accent-hover`;
  secondary/tertiary/icon → `--surface-hover`; destructive →
  `--color-danger-hover` — the new token, replaces the old
  `filter: brightness` fallback). §9.6 active, §9.7 disabled, §9.10
  loading via `data-loading` + `<Spinner>` (verify the button **keeps its
  width** when the label is replaced/dimmed). Label color →
  `--text-inverse` on filled variants (stop hard-coding white).
- **`Tabs` / `PillFilter` / `SegmentedControl`** — §9.3/§9.4 selected vs
  hover (**selected wins**), §9.1 ring, **arrow-key navigation** (APG
  tabs / radiogroup pattern), `role="tab"` + `role="tablist"` +
  `aria-selected` (Tabs), `role="radiogroup"` + `role="radio"` +
  `aria-checked` (SegmentedControl). SegmentedControl active segment: the
  `--shadow-sm` lift + accent label (§4.5) — this is the one place a
  small-control shadow is explicitly allowed.
- **`TextInput` / `Textarea` / `Select` / `SearchInput` / `DatePicker` /
  `QuantityStepper`** — `.kit-field` on the element that shows the border,
  so the accent border appears on **any** focus (§9.2); `[aria-invalid]`
  → danger border + the helper-text row via the new `<FormField>`
  wrapper (§9.8); disabled + read-only treatments. **`DatePicker` must
  become a real field** — label + trigger + a calendar popover with
  keyboard nav (arrows between days, PageUp/Down months, Esc closes),
  **not** a `<div>` wrapping a hidden `<input type="date">`. `Select`
  gets a real listbox popover (`role="listbox"` / `option`, type-ahead,
  arrow nav) — see `component-states.md §C5` "Select — Open" for the
  drawn visual.
- **`SimpleTable` / `DenseLedger` / `BulkEntryGrid`** — every **clickable**
  row gets `.kit-row` (hover + selected); header sort controls (if any)
  get `.kit-interactive` + `aria-sort`; loading = `.kit-skeleton` rows;
  empty = the `<EmptyState>` component (not inline text). `DenseLedger`
  corrected cell = the ADR-36a underlined semantic-color treatment
  (already spec'd; verify it uses tokens). Keep the ADR-37a
  `showLocation` / `horizontalScroll` props.
- **`EmptyState` / `ErrorState`** — confirm they match ADR-36d (icon +
  title + one-line guidance + optional single action; `ErrorState` adds
  "Retry"). Wire them as the canonical empty/error for every table/list
  in the kit (the screens adopt them next session).
- **Nav** — `bottom-nav.tsx` and the **`AdminShell` sidebar rail**
  (`components/shells/admin-shell.tsx` — **allowed to touch this
  session**): §9.3 hover tint on nav items (`--nav-bg-hover`), §9.4
  active (`--nav-bg-active`), §9.1 on-dark ring (`.kit-focus-on-dark`).
  Tokenise the raw `10px` inline padding → `--nav-item-pad-inline` and
  the raw `4px` radius → `--nav-item-radius` (D1, now tokens).

**3d. Missing primitives to add** (small; the screens need them). **These
have NO Paper artboard** — build them minimal, from tokens + `.kit-*` +
`design-principles.md §1`, and add a Storybook story explicitly labelled
"NEW — needs owner review" so they're signed off, not assumed:

- **`Spinner`** — the inline 14px `.kit-spinner` §9.10 references, as a
  shared component (`<Spinner size?>`). Used by `Button[data-loading]`.
  (Trivial — the CSS already exists; this is just the React wrapper +
  `role="status"` + visually-hidden "Loading".)
- **`Toast` / `Notifier`** — there is **no success/feedback primitive**;
  "correction saved" / "payment recorded" is currently silent (the
  drawer just closes). `role="status"`, top-right (admin) /
  bottom-center (staff), `--z-toast`, auto-dismiss (~4s, pausable on
  hover/focus), `--dur-base` slide via `transform`, stacks, no
  reduced-motion special-casing (D4). A `useToast()` hook or a
  `<ToastProvider>` + imperative `toast()` — your call, document it.
- **`PageShell` / `ContentRegion`** — the "stock body doesn't fill the
  viewport like catalog" bug is every screen hand-rolling its `max-w` /
  padding and diverging. One `<PageShell>` owning `--content-max`
  (1200px), the page padding, and a toolbar slot. Every screen uses it
  next session. (This one has real layout decisions — get the owner's
  eyes on it in Storybook.)
- **`FormField`** — label + control + helper/error text row, so the §9.8
  error pattern (`--color-danger` text, `--text-caption`,
  `margin-top: --sp-2`) is **one component**, not re-authored per drawer.
  Wraps any `.kit-field` control; wires `aria-describedby` +
  `aria-invalid`.

**Gate 3:** `docs/design/kit-audit.md` shows **zero unjustified
"missing" cells**; `pnpm tsc --noEmit` + `pnpm build` clean; **no feature
screen file touched** (see Constraints); the 80 existing unit tests still
green.

### Deliverable 4 — Storybook + visual-regression + a11y gates

**4a. Stand up Storybook** — `pnpm add -D` the Storybook **v8** packages
for **Next.js + Vite** (`@storybook/nextjs` or `@storybook/experimental-nextjs-vite`
as appropriate for SB8 + Next 16 — check compatibility;
`pnpm dlx storybook@latest init` then trim). Config in `.storybook/`. It
**must** load `app/design-system/tokens.css` + `app/globals.css` in
`preview.ts` so components render exactly as in the app. Add `storybook`
+ `build-storybook` scripts.

**4b. One story per state, per component.** For every kit component and
each new primitive, a `*.stories.tsx` (co-located in `components/kit/` or
a `components/kit/__stories__/` dir — pick one, be consistent) with a
named story for each of: `Rest`, `Hover`, `FocusVisible`, `Active`,
`Disabled`, `Loading`, `Error`/`Invalid`, `Selected`, `Empty` (where
applicable), **plus every `variant` × `size`**. Hover/focus/active via a
`play` function (`@storybook/test` `userEvent`) or the `pseudo` addon.
The `Drawer` / `FrictionDeleteDialog` / `BottomSheet` stories **must show
the `.kit-scrim` + blur**.

**4c. Visual-regression snapshots.** `@storybook/test-runner` +
Playwright, screenshotting each story. **Also** — for each component's
`Rest` story and any state Paper draws — a diff against a
`get_screenshot` of the corresponding Paper artboard node (2× DSF), the
method Sessions 4a–4c used for screens. Commit baselines under
`tests/visual/__screenshots__/`. Add `pnpm test:visual`.

**4d. Accessibility checks.** `@storybook/addon-a11y` (axe) on every
story; a CI-runnable **`pnpm test:a11y`** that fails on any
serious/critical axe violation.

**4e. Wire into the test story.** `package.json` gains `test:visual` +
`test:a11y`. **`docs/TEST_PLAN.md`** updated: the kit is gated by
Storybook + visual-diff + a11y; screens (Session 11 onward) are gated by
composed-screen visual-diff vs the Paper artboard + a Playwright
interaction pass (hover/focus/pressed/disabled/loading/empty/error) +
responsive + axe.

**Gate 4:** `pnpm storybook` runs; every component has a story per state;
`pnpm test:visual` + `pnpm test:a11y` pass; baselines committed. The
existing **80 `pnpm test` unit tests still green.**

---

## How we guarantee the components look/behave as intended

This is the point of the session — spell it out in `kit-audit.md` and
`TEST_PLAN.md`:

1. **REST state = pixel-faithful to the Paper artboard.** The Paper file
   is read-only and frozen; it is the visual acceptance target. Pull
   exact values with `get_computed_styles` / `get_jsx` on the kit
   artboard node — **never eyeball a screenshot for a value**
   (Paper-guide rule). The `Rest` Storybook story is visual-diffed
   against a `get_screenshot` of that node. A rewrite changes **behaviour
   and token usage, not layout or colour** — if the artboard says
   `padding: var(--sp-5)`, the component uses `--sp-5`, full stop.
2. **Interaction states have no artboard — they're verified against
   `design-principles.md §9`, not a picture.** Each `Hover` / `Focus` /
   `Active` / `Disabled` / `Loading` / `Error` / `Selected` story asserts
   (via a `play` function reading `getComputedStyle`) that the computed
   value matches the §9 rule — exactly like Session 9's Gate 2 probe, but
   permanent and per-component. e.g. `Button/Hover` ⇒
   `background-color === --color-accent-hover`; `TextInput/Error` ⇒
   `border-color === --color-danger` **and** the `<FormField>` helper row
   is present.
3. **The few states Paper DOES draw** (disabled button, input
   focus/error, toggle disabled, corrected ledger cell, select-open,
   date-picker-open — see `component-states.md §8`) get **both**: visual
   diff vs the artboard **and** the computed-style assertion.
4. **a11y is gated, not hoped for** — axe on every story;
   serious/critical fails CI.
5. **This session does NOT re-judge the design.** A component whose REST
   matches its artboard and whose §9 states are correct **is done**, even
   if someone later wants the artboard itself changed — that's a future
   design sprint (`CLAUDE.md`: a Development Sprint makes no design
   decisions).
6. **The 4 new primitives are the one seam** — no artboard exists. Build
   them minimal from tokens + §9 + house rules (§1: hairline dividers, no
   container shadows, one accent, restrained motion). Each gets a
   Storybook story flagged **"NEW — needs owner review"**. `Toast` and
   `PageShell` have genuine layout choices — surface them for sign-off
   rather than deciding silently. `Spinner` / `FormField` are mechanical.

---

## Constraints

- **Remediation, not features, not redesign.** The design system is
  specified and codified. You implement it faithfully per-component and
  fill the 4-primitive gap. No new visual design decisions — the 4 new
  primitives get owner sign-off via Storybook.
- **Do NOT touch feature screen files.** Off-limits: `app/admin/**`,
  `app/store-manager/**`, `app/canteen/**`, `app/cashier/**`,
  `app/design-preview/**`, `docs/design/screens/**`. If a screen visibly
  breaks because a kit component's markup changed, that is **expected and
  acceptable** — note it in `kit-audit.md`, do **not** patch the screen.
  (The `--surface-panel-tint` deprecated alias in `tokens.css` keeps
  their backgrounds from going fully broken in the meantime.)
- **DO touch:** `components/kit/**`, `components/shells/**` (nav
  interaction states are kit-level), `components/layout/**`,
  `app/globals.css` (only if a §9 utility needs a genuine fix — it
  shouldn't; Gate 2 passed), the new `app/design-system/**` (only if a
  token is genuinely missing — get owner sign-off, update BOTH
  `tokens.css` and `tokens.ts` or the drift test fails),
  `.storybook/**`, `tests/visual/**`, `package.json`, docs.
- **Paper is read-only** this session. `get_*` only.
- **Tokens come from `app/design-system/tokens.css`.** No hand-invented
  values. A genuinely-missing token → owner sign-off + edit both files.
- **Every §9 rule is already a shared utility** — wire components to it,
  never re-author interaction CSS per component.
- **pnpm only.** Read `node_modules/next/dist/docs/` before config code.
- Keep the **80 unit tests green** throughout (76 pre-Session-9 + 4 token
  drift-guards).
- Post a checklist up front; tick it per priority component and per
  deliverable.

---

## Wrap-up

- **`docs/design/kit-audit.md`** — the per-component state-coverage
  table, **before → after**, zero unjustified "missing".
- **All 32 `components/kit/*`** + shells nav — composing only tokens +
  `.kit-*`, every applicable §9 state implemented, full keyboard + ARIA.
- **4 new primitives** — `Spinner`, `Toast`/`Notifier`, `PageShell`,
  `FormField` — each with a Storybook story flagged for owner review.
- **`.storybook/` + `*.stories.tsx`** — one story per state for all 32 +
  the 4 primitives; Drawer/Dialog/BottomSheet stories show scrim + blur.
- **`tests/visual/__screenshots__/`** committed baselines;
  `pnpm test:visual` + `pnpm test:a11y` in `package.json` and green.
- **`app/design-system/`** — unchanged unless a token was genuinely
  missing (then both files + owner sign-off + a PROGRESS note).
- **`lib/tokens.css`** — delete the redirect stub once you've confirmed
  nothing imports it (grep first).
- **`docs/design/design-principles.md`** — if any component revealed a
  token the §6 mirror still lists wrong, fix the mirror (code is
  authoritative).
- **`docs/design/component-states.md`** — mark each component's states as
  **implemented** (was: "spec'd").
- **`docs/TEST_PLAN.md`** — the kit gates (Storybook / visual / a11y) +
  the screen-gate rule for Session 11 onward.
- **`docs/PROGRESS.md`** — a "Session 10" entry: the kit-audit
  before/after numbers, the Drawer / scrim / focus-trap / scroll-lock /
  focus-restore fix, `--surface-panel-tint` migration status, the 4 new
  primitives (+ owner-review outcome), the Storybook + visual + a11y
  gates, anything flagged.
- **`docs/DECISIONS.md`** — an ADR only if the 4 new primitives'
  owner-review produced a real decision (next free number after ADR-42 →
  **ADR-43**).
- **`docs/sprints/session-11-handoff.md`** — draft it: **"Rebuild the
  shipped screens as kit compositions + rewrite the workflow docs."**
  Scope: re-assemble `/admin/catalog`, `/admin/stock` (+ `/opening`,
  `/financials`) as compositions of the now-proven kit — **keep every
  hook, `derive-ledger`, `opening-plan`, all `lib/domain` + `app/api`
  code**; replace only the transcribed JSX; adopt `<PageShell>`,
  `<FormField>`, `<Toast>`, `<EmptyState>`/`<ErrorState>`; delete the
  `--surface-panel-tint` deprecated alias from `tokens.css` (+ its
  `tokens.ts` entry + the drift-test line) once no screen references it.
  Per-screen gate: visual-diff vs the Paper artboard (default state) +
  Playwright interaction pass + responsive + axe. Then rewrite
  `export-workflow.md` (screens are **composed** from kit components;
  Paper markup is **never** copied into code; the Paper artboard is the
  visual acceptance target), update `CLAUDE.md` + the sprint handoff
  template + `design-principles.md` (§9 promoted to a first-class,
  enforced contract). Note that **Session 8 (Store Manager + Canteen)
  runs AFTER the screen rebuild, the new way** — keep the milestone plan
  re-sequenced (`session-9-handoff.md` "Note on sequencing" +
  `milestone-1-plan.md §5`/`§6`).

---

## Note on sequencing (unchanged from `session-9-handoff.md`)

1. Session 9 (done) — tokens + §9 contract (Deliverables 1–2).
2. **Session 10 (this) — component audit & fix + Storybook/visual/a11y
   (Deliverables 3–4).**
3. Session 11 — rebuild shipped screens (catalog, admin stock) as kit
   compositions + rewrite workflow docs.
4. Session 12 — F2 Store Manager + Canteen frontend, built the new way.
5. Session 13 — F3 Assets, same method.
6. QA pass.

Update `docs/sprints/milestone-1-plan.md §5`/`§6` if it still shows the
old order.
