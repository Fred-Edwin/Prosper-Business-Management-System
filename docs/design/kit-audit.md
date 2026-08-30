# Prosper — Kit Component Audit (Session 10, Deliverable 3a → 3b/3c)

**Status:** DELIVERABLE 3 + DELIVERABLE 4 COMPLETE. Before-picture (start of
Session 10) + the fixes applied (3b/3c) + the 4 new primitives (3d) + the
proof-harness build-out and Paper-parity audit (Deliverable 4, Sessions
10b–10d). Gate 3 passed — see the checklist mid-file. Gate 4 passed — see
"Session 10d — Paper-parity audit" and `session-10b-handoff.md`.

Deliverable 4 (Storybook + visual-regression + a11y gates) was built across
Sessions 10b (toolchain + first 15 stories), 10c (overlay focus-restore fix
+ 19 stories + SimpleTable ARIA), and 10d (Paper-parity audit + docs). The
harness-surfaced flags and the audit result are at the **bottom** of this
file. `DECISIONS.md` ADR-42 (Storybook 9.1.x) and ADR-43 (7 review items)
are both finalised.

---

## What changed, in one paragraph

Four new primitives (`Spinner`, `FormField`, `Toast`, `PageShell`) — the last
two flagged for owner review. A shared overlay module
(`components/kit/internal/overlay.ts`) — portal, `.kit-scrim`, focus-trap
(recomputed every Tab, no-focusable + dynamic-node safe), scroll-lock,
background `inert`, focus-restore, a module-level single-active-overlay guard,
and a mount-through-exit slide (`.kit-drawer-panel` / `.kit-sheet-panel` /
`.kit-dialog-panel` added to `globals.css §9`). A shared roving-tabindex helper
(`components/kit/internal/roving.ts`) for the APG single-select group pattern.
`Drawer` / `FrictionDeleteDialog` / `BottomSheet` / `MobileNavDrawer` all now
render an opaque `--surface-raised` panel behind a blurred `.kit-scrim` with the
full overlay contract. `Button` gained per-variant `--kit-hover-bg`, a `size`
prop, `data-loading` wired to the shared §9.10 rule, and `--text-inverse`
labels — and `EmptyState` / `ErrorState` / `Banner` / `MatchCard` /
`FrictionDeleteDialog` now compose it instead of hand-rolling button markup.
`Select` got a real APG listbox (arrow / Home-End / type-ahead /
`aria-activedescendant`); `DatePicker` got a real calendar
(internal month state, `role="grid"`, arrow / PageUp-Down / Home-End, focus on
open) with the `weeks` prop kept as an escape hatch; `QuantityStepper`'s value
became a real `role="spinbutton"` `<input>`. `Tabs` / `PillFilter` /
`SegmentedControl` got roving tabindex + arrow keys + correct roles.
`SimpleTable` / `DenseLedger` got keyboard-operable rows/cells, `loading`
skeletons and (SimpleTable) an `<EmptyState>` slot. `AdminShell` +
`MobileNavDrawer` nav items got `--kit-hover-bg: var(--nav-bg-hover)` so they
tint correctly on the dark chrome, `<nav aria-label>` landmarks, and the raw
`10px`/`4px`/`#FFFFFFxx` values tokenised. Two new tokens
(`--color-success-hover`, `--color-info-hover`) added to both `tokens.css` and
`tokens.ts` (owner sign-off — Banner's success/info filled actions had no §9.5
hover colour).

**No feature screen file was touched.** Every kit component kept a
backward-compatible public API, so `app/design-preview/kit/page.tsx` (off-limits)
and the wired screens still typecheck and build.

**Role:** Developer (Development Sprint). Not a design sprint — no new visual
decisions. The design system is specified (`design-principles.md §6`/`§9`,
`component-states.md`) and codified (`app/design-system/tokens.css` +
`tokens.ts`). The §9 interaction contract is already shared CSS in
`app/globals.css` (Session 9 Deliverable 2, Gate 2 passed). This session wires
every component to those `.kit-*` utilities correctly and adds the
ARIA/keyboard behaviour — it does **not** re-author interaction CSS.

**Method.** Each `components/kit/*` (32) + `components/shells/*` (nav
interaction states are kit-level) + `components/layout/*` read in full. For
each: (a) does it compose only tokens + `.kit-*`, or carry raw values / a
re-implemented state inline? (b) which of its required states
(`component-states.md §1`/`§2`) are present / missing / broken? (c) keyboard?
(d) ARIA? REST-state visual values are taken from each file's verbatim-
transcription header (pulled from Paper `get_jsx`/`get_computed_styles` in
Sessions 3–4); Paper is read-only this session and re-consulted only where a
fix needs a value not already recorded.

---

## How to read the table

- **tokens-only?** — `YES` = composes only `var(--token)` / Tailwind theme
  classes that map to tokens + `.kit-*`. `NO` = carries a raw hex / off-scale
  value / an inline re-implementation of a `.kit-*`-covered state. The ONE
  allowed raw-hex exception is `--color-gold-brand` (masthead only).
- **§9 states** — the applicable rules from `design-principles.md §9` for this
  component, each `present` / `missing` / `broken`. `n/a` where the rule
  doesn't apply (e.g. §9.2 field-focus on a non-field).
- **keyboard** — Tab reach + Enter/Space activate + Esc (overlays) + arrow
  keys (tabs / radiogroup / listbox / menu) per WAI-ARIA APG.
- **ARIA** — `role`, `aria-*`, `aria-modal`, `aria-current` / `aria-selected`
  / `aria-checked` / `aria-invalid` / `aria-disabled` as the pattern requires.

`BEFORE` rows are the state at the start of Session 10. `AFTER` rows are
filled as the component is fixed; a remaining gap must be justified with owner
sign-off.

---

## 0. Cross-cutting findings (apply to many components)

| # | Finding | Components affected | Fix |
|---|---|---|---|
| X1 | **`--surface-panel-tint` still used as a panel fill** (the retired "transparent modal" token, D2/ADR-41). | `drawer.tsx`, `friction-delete-dialog.tsx`, `bottom-sheet.tsx` (comment + no scrim), `mobile-nav-drawer.tsx` (`bg-black/30`) | Migrate panels → opaque `--surface-raised`; backdrops → `.kit-scrim`. |
| X2 | **Overlays render no `.kit-scrim`** — `drawer.tsx` renders only the panel `<div>` (no backdrop at all); `bottom-sheet.tsx` hand-rolls `fixed inset-0 z-40 bg-(--surface-panel-tint)`; `friction-delete-dialog.tsx` renders only the panel; `mobile-nav-drawer.tsx` uses `bg-black/30`. | `drawer`, `friction-delete-dialog`, `bottom-sheet`, `mobile-nav-drawer` | Each renders its own `.kit-scrim` (blur + `--opacity-scrim` + `--z-overlay`); panel above at `--z-drawer` / `--z-dialog`. |
| X3 | **No scroll-lock, no `inert`/`aria-hidden` on the background, no focus-restore to the opener** on any overlay. | `drawer`, `friction-delete-dialog`, `bottom-sheet`, `mobile-nav-drawer` | `<html>` `overflow:hidden` on open (restored exactly on close); background `inert` (attr, with `aria-hidden` + `pointer-events:none` fallback); capture `document.activeElement` on open, `.focus()` it on close. |
| X4 | **Focus-trap is a one-shot `querySelectorAll` snapshot** (`drawer.tsx`) — misses nodes added after open, and has no no-focusable-element handling (focuses nothing, Tab escapes). `friction-delete-dialog` / `bottom-sheet` / `mobile-nav-drawer` have **no trap at all**. | `drawer`, `friction-delete-dialog`, `bottom-sheet`, `mobile-nav-drawer` | Shared `useFocusTrap(panelRef, active)` hook: recomputes focusables on each Tab; if none, keeps focus on the panel; wraps at both ends. |
| X5 | **Two overlays can be interactive at once** — no "active overlay" guard. | all overlay components | Module-level `activeOverlayId` guard (or a context): opening one closes / blocks the others. |
| X6 | **No enter/exit transition** — overlays mount/unmount with `if (!open) return null`, so the `transform` + `--dur-base` + `--ease-decelerate`/`--ease-accelerate` slide from §9.9 never runs. | `drawer`, `bottom-sheet`, `friction-delete-dialog` (fade) | Keep mounted through an exit phase (`data-state="open"|"closing"`), slide via `transform`, unmount on `transitionend`. Allow-list only (`transform`, `opacity`) — never layout. |
| X7 | **Raw literal shadows** `[box-shadow:#00000014_0px_1px_2px]` / `[box-shadow:#00000014_0px_4px_12px]` / `[box-shadow:#00000014_0px_-4px_16px]` instead of `--shadow-sm` / `--shadow-md`. | `segmented-control`, `select`, `date-picker`, `bottom-sheet` | Swap for `[box-shadow:var(--shadow-sm)]` / `var(--shadow-md)`. |
| X8 | **Filled-variant labels hard-code `text-white`** instead of `--text-inverse`; `button.tsx` primary-loading uses raw `bg-[#32125F]`. | `button`, `friction-delete-dialog`, `banner`, `match-card`, `empty-state`, `instructional-banner`, `bottom-sheet` (n/a), `dense-ledger` footer, `bulk-entry-grid`, `dense-summary-strip` | `text-white` → `text-(--text-inverse)`; `bg-[#32125F]` → the §9.10 pattern (keep `bg-accent`, dim label via `[data-loading]`). |
| X9 | **Raw `text-[#FFFFFF99]` / `bg-[#FFFFFF26]`** on dark strips — a `--nav-text-subtle` (`rgb(255 255 255 / 60%)`) and `--nav-bg-divider-strong` (`rgb(255 255 255 / 16%)`) token exist. | `dense-summary-strip`, `bulk-entry-grid` footer, `dense-ledger` footer (`text-transparent` ok) | Swap to the tokens. NOTE: `#FFFFFF99` = 60% ≈ `--nav-text-subtle`; `#FFFFFF26` = 15% ≈ `--nav-bg-divider-strong` (16%) — close enough, owner-confirm on review. |
| X10 | **Spinner is a local inline `<svg>` in `button.tsx`** with a hard-coded `stroke="#FFFFFF"` and no `role="status"`. The §9.10 CSS (`.kit-spinner`) already exists but nothing uses it. | `button`, `match-card` (submitting), `banner` (n/a) | New `<Spinner>` primitive (3d) wrapping `.kit-spinner` + `role="status"` + visually-hidden "Loading"; `Button` renders it. |
| X11 | **No `<FormField>` wrapper** — every field re-authors the `§9.8` helper/error row (`text-danger text-caption/micro`) and wires `aria-invalid` ad hoc; no `aria-describedby` linking the helper text to the control anywhere. | `text-input`, `textarea`, `select`, `quantity-stepper`, `search-input`, `date-picker` | New `<FormField>` primitive (3d): label + control slot + helper/error row; wires `aria-describedby` + `aria-invalid`. Field components keep working standalone but compose `<FormField>` for the labelled form case. |
| X12 | **No `<PageShell>`** — the "stock body doesn't fill the viewport like catalog" divergence. Not a kit component today. | (screens, next session) | New `<PageShell>` primitive (3d) owning `--content-max` + page padding + a toolbar slot. |
| X13 | **No success/feedback primitive** — "correction saved" / "payment recorded" is silent. | (screens, next session) | New `<Toast>` / `<Notifier>` primitive (3d): `role="status"`, `--z-toast`, auto-dismiss ~4s pausable, `transform` slide, stacks. |
| X14 | **`z-40` / `z-50` raw Tailwind z-index** instead of the `--z-*` scale. | `bottom-sheet`, `mobile-nav-drawer`, `select` (`z-10`), `date-picker` (`z-10`) | `select`/`date-picker` popovers → `[z-index:var(--z-dropdown)]`; overlay panels → `--z-drawer`/`--z-dialog`; scrims → `--z-overlay` (via `.kit-scrim`). |
| X15 | **`tracking-[0.04em]` / `tracking-[0.06em]` / `tracking-[0.08em]` raw** — `--tracking-caps` (0.04em) now exists. | `text-input`, `textarea`, `select`, `date-picker`, `segmented-control`, `quantity-stepper` (labels), `friction-delete-dialog` (0.06em), `status-chip`/`condition-chip`/`match-card` (0.04em), `admin-shell` (0.08em group headers), `bulk-entry-grid` | 0.04em → `[letter-spacing:var(--tracking-caps)]`. 0.06em / 0.08em have no token — leave, or add on owner sign-off. |
| X16 | **`lib/tokens.css` redirect stub** — confirmed nothing imports it (`grep` clean). | — | **DONE** — deleted. `globals.css §Type scale` comment updated to point at `app/design-system/tokens.css`. |

**Resolution of X1–X16 (after):** X1/X2/X3/X4/X5/X6 — all fixed by
`components/kit/internal/overlay.ts` + the `.kit-scrim` / `.kit-*-panel` CSS,
wired into all four overlays. X7 — `--shadow-sm` / `--shadow-md` /
`--shadow-drawer` / `--shadow-dialog` everywhere a raw `[box-shadow:#…]` was.
X8 — `text-white` → `text-(--text-inverse)`; `bg-[#32125F]` gone (Button uses the
shared §9.10 dim). X9 — `--nav-text-subtle` / `--nav-bg-divider-strong`. X10 —
`<Spinner>` primitive; `Button` renders it. X11 — `<FormField>` primitive;
`TextInput`/`Textarea`/`Select`/`QuantityStepper` compose it (API unchanged).
X12 — `<PageShell>` primitive (owner review). X13 — `<Toast>`/`ToastProvider`
primitive (owner review). X14 — `[z-index:var(--z-dropdown)]` on popovers;
`--z-drawer`/`--z-dialog`/`--z-overlay` on overlays. X15 — `--tracking-caps`
for every `tracking-[0.04em]`; `0.06em`/`0.08em` left as literals (no token —
noted for a future design sprint). X16 — done.

---

## 1. Priority components (3c — the reported bugs)

### Drawer — `components/kit/drawer.tsx`

Required states (`component-states.md §2 C18`): shell, open (veil behind),
footer primary-disabled (ARTBOARD — caller passes a disabled `<Button>`),
footer submitting (GLOBAL), scrolled header hairline (GLOBAL). Overlay
mechanics from handoff §3c.

| aspect | BEFORE | AFTER |
|---|---|---|
| tokens-only? | **NO** — panel `bg-(--surface-panel-tint)` (X1); no `--shadow-drawer`. | _tbd_ |
| §9.1 focus ring | present (`.kit-focus-ring` on close button only). | _tbd_ |
| §9.9 transition | **missing** — no slide; mounts via `if (!open) return null` (X6). | _tbd_ |
| scrim | **missing** — renders only the panel, no backdrop at all (X2). | _tbd_ |
| scroll-lock | **missing** (X3). | _tbd_ |
| `inert` background | **missing** (X3). | _tbd_ |
| focus-move-in | **partial** — no explicit focus move on open; relies on Tab. | _tbd_ |
| focus-trap | **broken** — one-shot `querySelectorAll` snapshot, no no-focusable handling (X4). | _tbd_ |
| focus-restore | **missing** (X3). | _tbd_ |
| single-overlay guard | **missing** (X5). | _tbd_ |
| keyboard | Esc closes ✓; Tab-trap broken; no focus-move-in. | _tbd_ |
| ARIA | `role="dialog"` ✓ `aria-modal` ✓ `aria-label` ✓. Close button `aria-label` ✓. Missing: `aria-labelledby` pointing at the real title node (nicer than `aria-label` dup); nothing marks the subtitle. | _tbd_ |
| notes | `rail` + `panel` variants both need the opaque panel + scrim + `--shadow-drawer`. Keep ADR-37b prop contract + the `subtitle` header variant. | |

### FrictionDeleteDialog — `components/kit/friction-delete-dialog.tsx`

Required (`§2 C17`): pending, confirmed, retype-mismatch (ARTBOARD — present
in markup via `mismatch`), submitting (GLOBAL, destructive-loading button).

| aspect | BEFORE | AFTER |
|---|---|---|
| tokens-only? | **NO** — panel `bg-(--surface-panel-tint)` (X1); `bg-gray-200` for the disabled confirm (should be the §9.7 rule / `<Button variant="destructive" disabled>`); `text-white` raw (X8); `tracking-[0.06em]` (X15). | _tbd_ |
| scrim / scroll-lock / inert / focus-restore / single-overlay | **all missing** (X2/X3/X5). Renders only the panel. | _tbd_ |
| focus-trap | **missing** — only Esc + focus-field-on-open. Tab escapes the dialog. (X4) | _tbd_ |
| §9.9 transition | **missing** (X6). | _tbd_ |
| retype gate | present ✓ (`typed === recordName`). | keep. |
| retype-mismatch state | **present** ✓ (`mismatch` → danger helper line). But the field border is **always** `border-danger` (even in the neutral pending state) — should be neutral until `mismatch`, then danger via `.kit-field[data-invalid]`. | _tbd_ |
| keyboard | Esc ✓; Enter in the field does not submit even when matched (acceptable — explicit button); no trap. | _tbd_ |
| ARIA | `role="dialog"` ✓ `aria-modal` ✓ `aria-label` ✓. Missing: `aria-describedby` → the body copy; the retype field has no `<label>` / `aria-label` (placeholder only); mismatch line not linked via `aria-describedby` + `aria-invalid` on the input. | _tbd_ |
| notes | Keep ADR-36c props. Confirm button should be a `<Button variant="destructive" loading disabled>` so §9.7/§9.10 come for free instead of hand-rolled `bg-gray-200`/`bg-danger`. | |

### BottomSheet — `components/kit/bottom-sheet.tsx`

Required (`§2 C19`): peek, open (both ARTBOARD ✓), dragging (GLOBAL —
transform only), backdrop (GLOBAL).

| aspect | BEFORE | AFTER |
|---|---|---|
| tokens-only? | **NO** — backdrop `bg-(--surface-panel-tint)` + `z-40` (X1/X14); panel `[box-shadow:#00000014_0px_-4px_16px]` raw (X7); `z-50` (X14). | _tbd_ |
| scrim | **broken** — hand-rolled `fixed inset-0 z-40 bg-(--surface-panel-tint)`, no blur, wrong token, wrong z (X2). | _tbd_ |
| scroll-lock / inert / focus-restore / single-overlay | **all missing** (X3/X5). | _tbd_ |
| focus-trap / focus-move-in | **missing** (X4) — Esc + backdrop-click only. | _tbd_ |
| §9.9 transition | **missing** — mounts via `if (state === "closed") return null`; no slide-from-bottom (X6). | _tbd_ |
| drag-to-dismiss | present (pointer down/up, `dy > 48`). Keep (optional per handoff). | keep. |
| keyboard | Esc ✓; no trap; grab handle is a `<div>`, not focusable/operable. | _tbd_ |
| ARIA | `role="dialog"` ✓ `aria-modal` ✓ on both states. Missing: `aria-label`/`aria-labelledby` (open state has a title node — link it); peek state has no accessible name. | _tbd_ |
| notes | Same overlay contract as Drawer, slide from bottom (`transform: translateY`), `--dur-base`. Peek + open (`6Z4-0`). | |

### Button — `components/kit/button.tsx`

Required (`§2 C1`): default×4 variants (ARTBOARD ✓), hover/active/focus
(GLOBAL), disabled ×4 (secondary/destructive ARTBOARD, primary ✓, tertiary
GLOBAL), loading (primary + destructive ARTBOARD).

| aspect | BEFORE | AFTER |
|---|---|---|
| tokens-only? | **NO** — primary-loading `bg-[#32125F]` raw (X8/X10); `text-white` raw on filled variants (X8); disabled uses `bg-gray-200` (a fixed grey, not the §9.7 opacity rule). | _tbd_ |
| §9.5 hover (per variant) | **broken** — `.kit-interactive` is on the button but no variant sets `--kit-hover-bg`, so **every** variant hovers to the default `--surface-hover` (primary should → `--color-accent-hover`; destructive → `--color-danger-hover`). | _tbd_ |
| §9.6 active | inherits the same (broken) hover bg. | _tbd_ |
| §9.7 disabled | **partial** — `disabled` attr + `aria-disabled` ✓ and `.kit-interactive:disabled` fires the opacity rule, BUT the component **also** paints `bg-gray-200` / `opacity-[0.5]` inline per variant, double-applying and diverging from the rule. | _tbd_ |
| §9.10 loading | **broken** — no `data-loading` attr, so the shared `.kit-interactive[data-loading]` label-dim + pointer-lock never runs; the component hand-rolls `opacity-[0.7]` on the box + a local `<Spinner>`. Width is **not** guaranteed to hold (label swap). | _tbd_ |
| §9.1 focus ring | present (`.kit-focus-ring`). | keep. |
| keyboard | native `<button>` ✓ Enter/Space. | keep. |
| ARIA | `aria-disabled` mirrors `disabled` ✓. `loading` state has no `aria-busy`. | _tbd_ |
| notes | Add `size?: "sm" | "md" | "lg"` mapping to `--control-sm/md/lg`? Handoff says "every `variant × size`" for stories — the component currently hard-codes `h-[36px]`. Confirm on owner review whether `sm`/`lg` are in scope (Paper only draws `md`). Provisional: add the prop, default `md`, `md` byte-identical to today. | |

### IconButton — `components/kit/icon-button.tsx`

Required (`§2 C2`): default (ARTBOARD ✓), hover/active/focus (GLOBAL),
disabled (ARTBOARD — `--text-disabled` glyph, no pointer).

| aspect | BEFORE | AFTER |
|---|---|---|
| tokens-only? | YES. | _tbd_ |
| §9.5 hover | present — `.kit-interactive`, no `--kit-hover-bg` set so it → `--surface-hover` (correct for an icon button per §9.5). | keep. |
| §9.7 disabled | **partial** — `disabled` + `aria-disabled` ✓; the `.kit-interactive` opacity rule fires; but the default `+` glyph stroke stays `--text-secondary` (spec wants the glyph itself to read as disabled — acceptable since opacity 0.5 covers it, but the ARTBOARD shows `--text-disabled`). | _tbd_ (accept opacity, or add a disabled glyph color) |
| keyboard | native `<button>` ✓. | keep. |
| ARIA | `aria-label` **required** by the type ✓. | keep. |
| notes | Fine as-is bar the disabled-glyph nuance. | |

### Tabs — `components/kit/tabs.tsx`

Required (`§2 C11` — already state-complete visually): active/inactive/
disabled (ARTBOARD ✓), hover/focus (GLOBAL).

| aspect | BEFORE | AFTER |
|---|---|---|
| tokens-only? | **NO** — `border-b-[#00000000]` raw (use `border-transparent` / `border-b-transparent`). | _tbd_ |
| §9.3/§9.4 selected vs hover | active = accent label + `border-b-accent`. No `.kit-row`; hover is `.kit-interactive` default → `--surface-hover` bg (spec §C11 hover = `--text-primary` label + `--border-strong` underline, **not** a bg tint). Slight divergence — acceptable but note. | _tbd_ |
| keyboard | **broken** — no arrow-key navigation. APG tabs pattern: `←`/`→` move between tabs, `Home`/`End` jump, only the active tab is in the Tab sequence (`tabIndex` roving). Currently every tab is `tabIndex=0` and arrows do nothing. | _tbd_ |
| ARIA | `role="tablist"` ✓ `role="tab"` ✓ `aria-selected` ✓. **Missing:** `tabIndex` roving (0 on active, -1 on rest); `aria-controls` → the panel id; the panel needs `role="tabpanel"` + `aria-labelledby` (out of this component's scope — document the contract). `aria-disabled` not set (uses `disabled` attr, which also removes it from the tablist semantics — acceptable). | _tbd_ |
| notes | This is a "tablist" that doesn't own its panels (screens do). Add roving tabindex + arrow keys + `id`/`aria-controls` wiring hooks. | |

### PillFilter — `components/kit/pill-filter.tsx`

Required (`§2 C12`): active/inactive (ARTBOARD ✓), hover (GLOBAL), disabled
(ARTBOARD — ADD), focus (GLOBAL).

| aspect | BEFORE | AFTER |
|---|---|---|
| tokens-only? | YES. | keep. |
| §9.3/§9.4 | active `bg-(--surface-selected)` ✓ (selected wins — no hover bg on active). Inactive has an inline `hover:[background-color:var(--surface-hover)]` — **redundant with `.kit-interactive`** and should be removed (X: inline re-impl of a `.kit-*` state). | _tbd_ |
| §9.7 disabled | inline `opacity-[0.5] pointer-events-none` — **redundant** with `.kit-interactive:disabled` + the `disabled` attr (which is already set). Remove the inline. | _tbd_ |
| keyboard | **broken** — no arrow-key nav. This is a filter/radiogroup-style control: APG says `←`/`→` (or it's just a toolbar of toggle buttons — decide). At minimum Tab reaches each ✓, Space/Enter toggle ✓ (native button). | _tbd_ (owner: radiogroup arrows, or plain button group?) |
| ARIA | `aria-pressed` ✓. If it's a single-select filter, `role="radiogroup"` + `role="radio"` + `aria-checked` is more correct than N× `aria-pressed`. Note for review. | _tbd_ |
| notes | Handoff groups it with Tabs/SegmentedControl for "arrow-key navigation per APG". Treat as a radiogroup. | |

### SegmentedControl — `components/kit/segmented-control.tsx`

Required (`§2 C6`): active segment (ARTBOARD ✓ — shadow lift + accent label),
resting (ARTBOARD ✓), hover (GLOBAL), disabled whole control (ARTBOARD ✓).

| aspect | BEFORE | AFTER |
|---|---|---|
| tokens-only? | **NO** — `[box-shadow:#00000014_0px_1px_2px]` raw → `--shadow-sm` (X7); `tracking-[0.04em]` → `--tracking-caps` (X15). | _tbd_ |
| §4.5 active treatment | shadow lift + accent label ✓ (correct — this is the one place a small-control shadow is allowed). | keep (retokenised). |
| §9.7 disabled | `opacity-[0.5]` on the track + `disabled` on each button + `.kit-interactive:disabled` — layered but consistent; label goes `--text-disabled` ✓. | keep / de-dup. |
| keyboard | **broken** — no arrow keys. APG radiogroup: `←`/`→`/`↑`/`↓` move selection, only the checked radio is tabbable (roving `tabIndex`). Currently every segment `tabIndex=0`, arrows dead. | _tbd_ |
| ARIA | `role="radiogroup"` ✓ `role="radio"` ✓ `aria-checked` ✓. **Missing:** roving `tabIndex`; `aria-label` on the radiogroup (the `label` prop renders a `<div>`, not linked — wire `aria-labelledby` or `aria-label`). | _tbd_ |
| notes | | |

### TextInput — `components/kit/text-input.tsx`

Required (`§2 C3`): default/focus/disabled (ARTBOARD ✓), error (ARTBOARD ✓ via
`error`), filled (GLOBAL).

| aspect | BEFORE | AFTER |
|---|---|---|
| tokens-only? | **NO** — `tracking-[0.04em]` on the label → `--tracking-caps` (X15). | _tbd_ |
| §9.2 focus border | present — `.kit-field` on the wrapper `<div>`; `:focus-within` → accent border ✓. | keep. |
| §9.8 error pattern | **partial** — `data-invalid` + `aria-invalid` ✓ and `.kit-field[data-invalid]` → danger border ✓; the helper row is re-authored inline (`text-danger text-caption/micro`) instead of via `<FormField>` (X11). No `aria-describedby` linking helper → input. | _tbd_ (compose `<FormField>`) |
| §9.7 disabled | `disabled` on the input + inline `--surface-subtle` bg + `--text-disabled` — the drawn ARTBOARD, kept. `.kit-field:disabled` also fires. Fine. | keep. |
| keyboard | native `<input>` ✓. | keep. |
| ARIA | `<label htmlFor>` ✓ `aria-invalid` ✓. Missing `aria-describedby` → helper. | _tbd_ |
| notes | | |

### Textarea — `components/kit/textarea.tsx`

Required (`§2 C4`): default (ARTBOARD ✓), focus (ADD — via `.kit-field`),
error (ADD — danger border + helper), disabled (GLOBAL).

| aspect | BEFORE | AFTER |
|---|---|---|
| tokens-only? | **NO** — `tracking-[0.04em]` (X15). | _tbd_ |
| §9.2 / §9.8 | `.kit-field` on the wrapper ✓; `data-invalid` + `aria-invalid` ✓; helper row inline (X11); no `aria-describedby`. | _tbd_ |
| §9.7 disabled | `disabled` on the textarea; **no** visible disabled treatment on the box (spec: `--surface-subtle` bg, `--text-disabled`). `.kit-field:disabled` fires the opacity rule, which covers it. Acceptable. | _tbd_ |
| keyboard | native ✓. | keep. |
| ARIA | `<label htmlFor>` ✓; `aria-invalid` ✓; no `aria-describedby`. | _tbd_ |
| notes | | |

### Select — `components/kit/select.tsx`

Required (`§2 C5`): default (ARTBOARD ✓), open (ARTBOARD ✓ — real popover
listbox), error (ARTBOARD ✓), filled/disabled/focus (GLOBAL).

**Searchable mode — designed (Phase A) + built + proven (Phase B),
2026-08-29.** `docs/sprints/kit-searchable-select-handoff.md`.

- **Phase A** (kit Design Sprint) — 3 `6CG-0` state rows
  (`Select — Searchable (closed)` / `(open, query typed, list filtered)`
  / `(open, no matches)`); `§2 C5` FLAGGED → ARTBOARD.
- **Phase B** (kit Developer Sprint) — `select.tsx` gains two additive
  props: `searchable?: boolean` (default `false`) and
  `noMatchesLabel?: string` (default `"No matches"`).
  - `searchable` **off**: every new code path is inert; behaviour is
    byte-identical to Session 10 (proved — the 9 pre-existing `Select`
    stories' snapshots + play assertions pass untouched).
  - `searchable` **on**: while **closed** the trigger is the existing
    `<button role="combobox">` unchanged; on **open** it swaps to the
    APG **"Editable Combobox With List Autocomplete (none)"** shape — a
    `<div class="kit-field">` wrapper holding a 14px search glyph, an
    `<input role="combobox">` (`aria-expanded` / `aria-controls` /
    `aria-activedescendant` / `aria-autocomplete="list"` /
    `aria-invalid` / `aria-describedby`, `.kit-focus-ring`), and a
    decorative chevron. Typing sets `query`; the `<ul>` renders
    `options.filter(o => o.label.toLowerCase().includes(query…))` with
    stable per-`shown`-index option ids; `max-h-[calc(var(--control-md)*8)]`
    + `overflow-y-auto`; the active option is `scrollIntoView({block:"nearest"})`
    on Arrow nav. Empty result ⇒ one `<li>` **without** `role="option"`,
    not focusable, `--text-tertiary` / `--text-sm`, text = `noMatchesLabel`;
    `activeIdx` is `-1` and Enter is a no-op.
  - Keyboard on the input: ArrowUp/Down/Home/End move `activeIdx` over
    the filtered list; Enter commits `shown[activeIdx]` + closes + clears
    the query; **first Esc clears a non-empty query, a second Esc
    closes** (APG editable-combobox note); Tab commits the active option;
    printable keys go to the browser (real filtering — no `typeaheadJump`
    on the searchable path; `typeaheadJump` is untouched for the plain
    path). On open the input is focused + its text selected; on close the
    query is cleared and `current` is left unchanged if nothing committed.
  - Tokens only — `--shadow-md`, `--z-dropdown`, `--radius-md`,
    `--control-md` (popover cap), `--control-sm` (rows), `--sp-4`/`--sp-5`;
    the search glyph stroke is `var(--text-tertiary)`.
  - Stories added: `SearchableClosed`, `SearchableFocusRing`,
    `SearchableOpenFiltered` (visual = the open filtered trigger, list
    proven by play), `SearchableKeyboardCommit`, `SearchableNoMatch`.
    Gates: `select.stories` slice 14/14 green (visual snapshots +
    `test:a11y` axe + §9 `postVisit`); `tsc` 0; `pnpm test` no new
    failures. `pnpm build` handed to the parallel Session 16.

| aspect | BEFORE | AFTER |
|---|---|---|
| tokens-only? | **NO** — `[box-shadow:#00000014_0px_4px_12px]` raw → `--shadow-md` (X7); `z-10` → `--z-dropdown` (X14); `tracking-[0.04em]` (X15). | _tbd_ |
| open/close behaviour | present — click toggles, Esc closes, click-outside closes ✓. | keep. |
| §9.2 field border | `.kit-field` on the trigger ✓; open → `border-accent`, error → `border-danger` (inline `triggerBox` — redundant with `.kit-field` `:focus`/`[aria-invalid]`; keep the error one via `data-invalid`, drop the `open` one and let `:focus` handle it, OR keep since a click-opened select isn't `:focus`. Decide.). | _tbd_ |
| §9.3 option hover/selected | options use `.kit-row` ✓; selected → `bg-(--surface-selected)` inline — **duplicates** `.kit-row[data-selected]`. Use `data-selected` instead. | _tbd_ |
| keyboard | **broken** — the trigger opens on click only; **no** `↓`/`↑`/`Enter`/`Space`/`Home`/`End` to open + move; no type-ahead; options are `<div>`s with `onClick` only — **not keyboard-operable at all**; no roving focus / `aria-activedescendant`. APG listbox pattern entirely absent. | _tbd_ |
| ARIA | trigger `aria-haspopup="listbox"` ✓ `aria-expanded` ✓ `aria-invalid` ✓; popover `role="listbox"` ✓; options `role="option"` + `aria-selected` ✓. **Missing:** `aria-controls` (trigger→listbox id), `aria-activedescendant`, `id` per option, `<label>` association is via `htmlFor` ✓ but the listbox itself has no `aria-labelledby`. Helper text not linked. | _tbd_ |
| notes | The single biggest keyboard gap in the kit. Full APG "Select-Only Combobox" / listbox implementation. | |

### SearchInput — `components/kit/search-input.tsx`

Required (`§2 C8`): default/placeholder (ARTBOARD ✓), filled + clear (ARTBOARD
✓), focus (GLOBAL). Never disabled in M1.

| aspect | BEFORE | AFTER |
|---|---|---|
| tokens-only? | YES. | keep. |
| §9.2 | `.kit-field` on the wrapper ✓; filled → `border-accent` inline. `:focus-within` → accent via `.kit-field` ✓. | keep. |
| clear affordance | present — `✕` button when filled, `aria-label="Clear search"` ✓, `.kit-focus-ring` ✓. | keep. |
| keyboard | native input ✓; `Escape` to clear would be a nice APG search touch — optional. | _tbd_ (optional) |
| ARIA | input has **no** `<label>` / `aria-label` — placeholder only (fails axe "select element must have an accessible name" equivalent for inputs). Add `aria-label` (default "Search") or a `label` prop. `role="search"` on the wrapper would help. | _tbd_ |
| notes | | |

### DatePicker — `components/kit/date-picker.tsx`

Required (`§2 C9`): default (ARTBOARD ✓), open calendar (ARTBOARD ✓), focus
(GLOBAL), disabled (GLOBAL). Handoff: **must be a real field** — label +
trigger + calendar popover with keyboard nav (arrows between days, PageUp/Down
months, Esc closes). It already is a trigger + popover (not a `<div>` around
`<input type=date>`) — the gap is keyboard + self-contained month data.

| aspect | BEFORE | AFTER |
|---|---|---|
| tokens-only? | **NO** — `[box-shadow:#00000014_0px_4px_12px]` → `--shadow-md` (X7); `z-10` → `--z-dropdown` (X14); `tracking-[0.04em]` (X15); `p-[12px]` / `w-[236px]` / `gap-[8px]` are off-`--sp`-scale literals from the artboard (12=`--sp-5`, 8=`--sp-4`; 236 is a fixed popover width — acceptable). | _tbd_ |
| open/close | click toggles, Esc, click-outside ✓. | keep. |
| calendar keyboard nav | **missing** — day cells are `<button>`s (Tab reaches them, Enter selects) but no `←→↑↓` day movement, no `PageUp`/`PageDown` month, no `Home`/`End` week, no focus management on open (focus should land on the selected/today cell). APG "Date Picker Dialog" pattern absent. | _tbd_ |
| month data | caller supplies `weeks` — the component can't navigate months on its own (no internal date state). Handoff wants a real calendar. Add an internal "visible month" state + a `value: Date` + derive the grid, keeping the `weeks` prop as an escape hatch. | _tbd_ (owner review — this is close to new behaviour; flag it) |
| ARIA | trigger `aria-haspopup="dialog"` ✓ `aria-expanded` ✓. **Missing:** popover `role="dialog"` + `aria-modal="false"` + `aria-label`; the grid needs `role="grid"` / `role="row"` / `role="gridcell"` + `aria-selected`; `‹`/`›` have `aria-label` ✓; no `aria-label` on the trigger conveying the current value beyond the visible text (ok). The `label` renders a `<div>` not a `<label>` — wire `aria-labelledby`. | _tbd_ |
| notes | Biggest "is this new design?" risk. Provisional: keep the drawn visual byte-identical, add keyboard + internal month state, flag for owner review in the wrap-up. | |

### QuantityStepper — `components/kit/quantity-stepper.tsx`

Required (`§2 C10`): default (ARTBOARD ✓), −/+ disabled at bound (ARTBOARD ✓),
focus on value field (GLOBAL), error (ARTBOARD ✓).

**AFTER column completed in M2 Session 2** (kit verify-and-gate — the rewrite
itself landed in Session 10; ADR-43 / ADR-48). C10 status: **implemented +
gated (M2-02)**.

| aspect | BEFORE | AFTER |
|---|---|---|
| tokens-only? | **NO** — `tracking-[0.04em]` label (X15). | ✓ — label goes through `<FormField>`, which uses `[letter-spacing:var(--tracking-caps)]`. |
| §9.2 field | `.kit-field` on the wrapper ✓; error → `border-danger` + `data-invalid` ✓. | keep — unchanged; `data-invalid` now driven by `<FormField>`'s `aria-invalid`. |
| value field | **the value is a `<span>`, not an `<input>`** — there is no typeable field, so "focus (value field)", "error (out-of-range typed value)" and keyboard `↑`/`↓` to step are all unimplementable as-is. Spec (`§2 C10`) explicitly lists "focus (value field)" and "error (out-of-range typed value)" as states → the value must become an `<input inputmode="decimal">`. | ✓ — `<input type="text" inputmode="decimal" role="spinbutton">`, unstyled / centred / mono; REST visual byte-identical to `6XC-0` / `6CG-0`. Focus → §9.2 accent border on `.kit-field` (proven `FocusValueField`); typed-error → §9.8 danger border + helper via `error` prop (proven `ErrorTypedValue`). |
| §9.7 −/+ disabled | `disabled={atMin}` / `disabled={atMax}` + `.kit-interactive:disabled` ✓. | keep — unchanged; proven `AtMinBound` / `AtMaxBound`. |
| keyboard | −/+ are native `<button>` ✓ with `aria-label` ✓. No `↑`/`↓` on the group to step. No typed entry. | ✓ — `↑`/`↓` step by `step` (proven `ArrowKeysStep`); type + blur / Enter commits through `onChange` (numeric) + `onValueString` (raw); out-of-range / non-numeric raw does not fire `onChange` (proven `TypeALargeQuantity`). |
| ARIA | **missing** — should be `role="spinbutton"` (or `role="group"` + an `<input type="number">`) with `aria-valuenow` / `aria-valuemin` / `aria-valuemax` / `aria-valuetext` (with unit). Label renders a `<div>` — link it. | ✓ — `role="spinbutton"` + `aria-valuenow` / `-valuemin` / `-valuemax` / `-valuetext` (`"{value} {unit}"`); label is a real `<label htmlFor>` via `<FormField>`; helper wired `aria-describedby` + `aria-invalid`. `axe` clean on all 7 stories. |
| notes | Flag the `<span>`→`<input>` change for owner review — it's needed to satisfy the spec'd states but is close to a behaviour change. | Signed off M2 Session 2: commit-on-blur / Enter + `onValueString` escape hatch + `↑`/`↓` stepping = the ratified ADR-48 "keep the §9 contract, add the input" pattern (same as `Select searchable`). No new API surface. Not judged a wrong commit-trigger → no owner escalation. |

### SimpleTable — `components/kit/simple-table.tsx`

Required (`§2 C15`): header, body row (ARTBOARD ✓), body row hover (ARTBOARD ✓
via `.kit-row`), selected (SKIP — not multi-select in M1), empty (ARTBOARD —
use `<EmptyState>`), loading (GLOBAL — `.kit-skeleton` rows).

| aspect | BEFORE | AFTER |
|---|---|---|
| tokens-only? | YES — `bg-info-bg` / `border-b-gray-600` / `--sp-*` / `text-[10px]` (the artboard's header micro-size; note `--text-micro` is 11px, this is a genuine 10px from Paper — matches `component-states.md` verbatim, leave). | keep. |
| §9.3 row hover | `.kit-row cursor-pointer` applied **only when `onRowClick` is set** ✓ (correct — non-clickable rows get no tint). | keep. |
| empty state | **missing** — the component renders nothing when `rows=[]` (no `<EmptyState>`, no inline message). | _tbd_ — accept a `renderEmpty` / built-in `<EmptyState>` slot. |
| loading | **missing** — no skeleton mode. | _tbd_ — add `loading?: boolean` → N× `.kit-skeleton` rows. |
| keyboard | **rows are `<div onClick>`** — not keyboard-focusable/operable when `onRowClick` is set. Need `role="button"` + `tabIndex=0` + Enter/Space, or a real `<button>`/`<a>` inside. Also no table semantics. | _tbd_ |
| ARIA | no `role="table"` / `row` / `columnheader` / `cell`; no `aria-sort` (component has no sort controls today — if a screen adds them they get `.kit-interactive` + `aria-sort`, document the contract). Clickable rows need an accessible name + `role`. | _tbd_ |
| notes | Add `loading` + empty slot + keyboard-operable rows + minimal grid/table roles. | |
| `rowChevron` (M2 6b) | n/a — no trailing affordance on clickable rows. | Opt-in `rowChevron?: boolean`; off = byte-identical. On (+ `onRowClick`): fixed `w-[24px]` trailing slot — header spacer + a `ChevronRight` (`--text-tertiary`) per clickable row — so lanes stay aligned. Matches the M2 A1–A4 artboards. Story `RowChevron` + baseline `kit-simpletable--row-chevron.png`. First consumer: A1. |

### DenseLedger — `components/kit/dense-ledger.tsx`

Required (`§2 C16`): header, data row (ARTBOARD ✓), data row hover (ARTBOARD ✓),
corrected cell (ARTBOARD ✓ — underlined semantic color, ADR-36a), empty
(ARTBOARD ✓), loading (GLOBAL).

| aspect | BEFORE | AFTER |
|---|---|---|
| tokens-only? | **NO** — footer `bg-gray-900` + `text-white` (X8) + trailing `text-transparent` (ok); `text-[10px]` header (genuine Paper value, leave); `tracking-[0.04em]` / `tracking-[0.02em]` (X15). | _tbd_ |
| §9.3 row hover | **broken** — `.kit-row` is on **every** data row unconditionally, even when `onCellClick` is undefined (so non-interactive ledgers get a hover tint that signals "clickable" when nothing is). Should be gated on `onCellClick`. Also the click target is the **cell** (`DataCell onClick`), not the row — the row-level `.kit-row` hover is arguably wrong per §4.3 ("the flag is on the cell, not the row"). Decide: cell-level `.kit-row`, or keep row hover as a scent. | _tbd_ |
| corrected cell | present ✓ — `underline-offset-2 [text-decoration:underline_1px]` + `toneClass`. Matches ADR-36a. `underline_1px` is an odd shorthand — verify it renders (should be `underline` + `text-decoration-thickness`). | _tbd_ (verify/normalise) |
| empty | present ✓ — centered tertiary line. (Could also accept `<EmptyState variant="filtered">` per §2 — but the drawn ledger-empty is an inline row, keep.) | keep. |
| loading | **missing** — no skeleton mode. | _tbd_ — add `loading?: boolean`. |
| keyboard | **cells are `<div onClick>`** — not focusable/operable. The correction target must be reachable by keyboard (Tab to the cell, Enter to open the drawer). Make corrected/clickable cells `<button>` or `role="button" tabIndex=0`. | _tbd_ |
| ARIA | none — no table semantics; clickable cells have no role/name; `aria-sort` n/a (no sort controls). Sticky footer is decorative rows. | _tbd_ |
| notes | Keep ADR-37a `showLocation` / `horizontalScroll`. The header `border-b-gray-600` is a deliberate darker rule from Paper — leave. | |

### BulkEntryGrid — `components/kit/bulk-entry-grid.tsx`

Required (`§2 C26`): header, editable cell default/focused (ARTBOARD ✓),
non-editable (ARTBOARD ✓), error (ARTBOARD ✓), valuation footer (ARTBOARD ✓),
Dish row (ARTBOARD ✓).

| aspect | BEFORE | AFTER |
|---|---|---|
| tokens-only? | **NO** — footer `bg-gray-900` + raw `text-[#FFFFFF99]` / `bg-[#FFFFFF26]` (X9); `tracking-[0.04em]` (X15); `text-[10px]` header (genuine, leave). | _tbd_ |
| §9.2 cell field | each `Cell` wrapper is `.kit-field` + `data-invalid` ✓; editable → `border-accent`, error → `border-danger`, non-editable → `--surface-subtle` (inline — redundant with `.kit-field` states for error/focus, but the non-editable + editable-rest treatments aren't `.kit-*`-covered, keep). | _tbd_ (de-dup error/focus) |
| §9.8 error | `data-invalid` on the cell wrapper ✓ + danger value text. **No helper row** (grid cells show the error via border+text only — acceptable per the drawn state; `§9.8`'s helper row doesn't fit a grid cell). | keep — document the exception. |
| editable cell input | `<input>` with no `aria-label`, no `inputmode`, no `type`. | _tbd_ — add `inputmode="decimal"`, `aria-label` (item + column). |
| keyboard | inputs are reachable by Tab ✓. No grid arrow-key navigation between cells (APG "Data Grid" — optional; the screens may not need it). Non-editable cells are `<div>` (fine — not interactive). | _tbd_ (owner: grid arrows in scope?) |
| ARIA | no `role="grid"` / `row` / `gridcell`; no `columnheader`; editable cells no name. | _tbd_ (minimal grid roles + names) |
| notes | Footer segment `mr-auto` / divider layout kept as-is (ADR — screen owns the exact footer). | |

### EmptyState — `components/kit/empty-state.tsx`

Required (`§2` / ADR-36d): default + filtered/no-results (ARTBOARD ✓), each
with icon + title + one-line guidance + optional single action.

| aspect | BEFORE | AFTER |
|---|---|---|
| tokens-only? | **NO** — action button `text-white` on the default (accent) variant → `--text-inverse` (X8); `py-[40px]` / `px-[24px]` / `gap-[8px]` / `mt-[4px]` / `px-[16px]` off-`--sp`-scale literals (40=`--sp-10`, 24=`--sp-8`, 8=`--sp-4`, 4=`--sp-2`, 16=`--sp-6`). | _tbd_ |
| ADR-36d shape | ✓ icon + title + description + optional action; `default` vs `filtered` icon + action styling ✓. | keep. |
| icon size | 28×28 — spec `--icon-xl` is 24; the artboard drew 28. Genuine Paper value — leave, or tokenise as a one-off. | _tbd_ (leave) |
| §9 action button | `.kit-interactive` + `.kit-focus-ring` ✓; no `--kit-hover-bg` set so the accent variant hovers to `--surface-hover` (should → `--color-accent-hover`). Same class of bug as Button. Better: use `<Button>`. | _tbd_ |
| keyboard | native `<button>` ✓. | keep. |
| ARIA | container is a plain `<div>` — could be `role="status"` for the filtered/no-results case so SR users hear it after a filter change. Icon `<svg>` needs `aria-hidden`. | _tbd_ |
| notes | Consider composing `<Button>` for the action to inherit §9.5/§9.7/§9.10. | |

### ErrorState — `components/kit/error-state.tsx`

Required (ADR-36d): icon (danger) + title + guidance + Retry (ARTBOARD ✓).

| aspect | BEFORE | AFTER |
|---|---|---|
| tokens-only? | **NO** — same off-`--sp` literals as EmptyState; Retry button is a hand-rolled secondary button. | _tbd_ |
| ADR-36d shape | ✓. | keep. |
| §9 button | `.kit-interactive` + `.kit-focus-ring` ✓ (secondary → `--surface-hover` hover, correct). Better: `<Button variant="secondary">`. | _tbd_ |
| ARIA | container should be `role="alert"` (or `role="status"`) so the error is announced. `<svg>` `aria-hidden`. | _tbd_ |
| keyboard | native `<button>` ✓. | keep. |
| notes | | |

### BottomNav — `components/kit/bottom-nav.tsx`

Required (`§2 C30` — state-complete): active/inactive (ARTBOARD ✓), pressed
(GLOBAL).

| aspect | BEFORE | AFTER |
|---|---|---|
| tokens-only? | YES — `w-[390px]` fixed width is the artboard's; `staff-shell` overrides with `w-full` ✓. | _tbd_ (default to `w-full`?) |
| §9.3/§9.4 | `.kit-interactive` ✓; `aria-current="page"` on active ✓; active → accent icon+label. No hover bg needed on a bottom nav (mobile) — `.kit-interactive` default hover is harmless. | keep. |
| §9.1 focus | `.kit-focus-ring` (light surface — the bar is `--surface-page`, so the accent ring is correct, **not** `.kit-focus-on-dark`). ✓ | keep. |
| keyboard | native `<button>` per item ✓; no arrow-key nav (a tab bar could use `←`/`→` — APG doesn't require it for a nav; leave). | keep. |
| ARIA | `<nav>` ✓; items `aria-current` ✓. Missing: `aria-label` on the `<nav>` ("Primary"); icons need `aria-hidden` (they're decorative — `staff-shell-client` already passes `aria-hidden` on the lucide icons ✓, but a raw-SVG caller wouldn't). | _tbd_ |
| notes | Minor. | |

### AdminShell sidebar rail — `components/shells/admin-shell.tsx`

Handoff §3c: §9.3 hover tint (`--nav-bg-hover`), §9.4 active
(`--nav-bg-active`), §9.1 on-dark ring (`.kit-focus-on-dark`); tokenise raw
`10px` inline padding → `--nav-item-pad-inline` and raw `4px` radius →
`--nav-item-radius`.

| aspect | BEFORE | AFTER |
|---|---|---|
| tokens-only? | **NO** — nav items use `px-[10px]` (raw → `--nav-item-pad-inline`) and `rounded-sm` (= `--radius-sm` = `--nav-item-radius`, ok but name it); group headers `tracking-[0.08em]` + `text-[10px]` (raw — 10px genuine Paper, 0.08em no token); the collapsed-rail account button `bg-(--nav-bg-divider-strong)` ok; ICON_PANEL strokes `rgb(255 255 255 / 85%)` inline (= `--nav-text-strong`); the top-bar account avatar `bg-gray-700`. Body toolbar `[background-color:var(--surface-hover)]` on the expand button ok. | _tbd_ |
| §9.3 hover | **missing** — nav items are `.kit-interactive` but nothing sets `--kit-hover-bg` to `--nav-bg-hover`, so on the dark sidebar they hover to the **light** `--surface-hover` (invisible/ugly on `--nav-bg`). Must set `--kit-hover-bg: var(--nav-bg-hover)` per item. | _tbd_ |
| §9.4 active | `bg-(--nav-bg-active)` ✓ + `aria-current="page"` ✓ + the 2px left marker on Dashboard/collapsed. | keep. |
| §9.1 on-dark ring | `.kit-focus-ring .kit-focus-on-dark` ✓ on every nav button. | keep. |
| §9.6 active/pressed | inherits the broken hover (X: light tint on dark). | _tbd_ |
| keyboard | native `<button>` per nav item ✓; collapse/expand toggles ✓ with `aria-label`. No roving/arrow nav (a sidebar nav doesn't need it — leave). | keep. |
| ARIA | `aria-current` ✓; `aria-label` on toggles ✓; icons decorative but **not** `aria-hidden` (raw SVGs); the `<nav>` landmark is missing — the sidebar is a bare `<div>`, should be `<nav aria-label="Primary">`. Account button `aria-label="Account"` ✓. | _tbd_ |
| notes | This is the one shell file the handoff explicitly allows touching. The body/toolbar layout is NOT in scope (it's screen chrome) beyond the nav-item interaction states + landmarks. | |

### MobileNavDrawer — `components/shells/mobile-nav-drawer.tsx`

(Nav interaction states are kit-level; it's also an overlay.)

| aspect | BEFORE | AFTER |
|---|---|---|
| tokens-only? | **NO** — backdrop `bg-black/30` (X2 — should be `.kit-scrim`); panel `[box-shadow:#0000004D_4px_0px_20px]` raw (→ `--shadow-drawer`); footer `bg-[#00000026]` + avatar `bg-[#FFFFFF2E]` raw (→ `--nav-bg-avatar` / `--nav-bg-divider-strong`); `z-50` (X14); close-icon strokes `#FFFFFF` raw (→ `--nav-text-active`); `tracking-[0.08em]` group headers. | _tbd_ |
| scrim / scroll-lock / inert / focus-trap / focus-restore / single-overlay | **all missing** (X2/X3/X4/X5) — Esc ✓ only. | _tbd_ |
| §9.3 nav hover | same bug as AdminShell — `.kit-interactive` with no `--kit-hover-bg: var(--nav-bg-hover)` on a dark surface. | _tbd_ |
| §9.4 active | `bg-(--nav-bg-active)` + `aria-current` + 3px marker ✓. | keep. |
| §9.9 transition | **missing** — mounts via `if (!open) return null`; no slide-in (X6). | _tbd_ |
| keyboard | Esc ✓; no trap; Tab escapes to the page behind. | _tbd_ |
| ARIA | outer is a bare `<div>` — no `role="dialog"` / `aria-modal` / `aria-label`; the panel should be the dialog. `<nav>` landmark missing inside. Close buttons `aria-label` ✓. Backdrop is a `<button aria-label="Close menu">` (ok, but `.kit-scrim` + an explicit close is cleaner). | _tbd_ |
| notes | Same overlay contract as `Drawer`. Reuse the shared focus-trap / scroll-lock / scrim helpers. | |

---

## 2. Remaining components (3b)

### StatusChip — `components/kit/status-chip.tsx`

| aspect | BEFORE | AFTER |
|---|---|---|
| tokens-only? | YES — `bg-success`/`text-success`/… all map to tokens; neutral uses `--text-tertiary`/`--text-secondary` ✓. | keep. |
| states | display-only, variants not interaction states ✓ (`§2 C13` state-complete). | keep. |
| ARIA | plain `<div>` — fine for a decorative status label; if it's the only conveyor of status in a row, the text carries it. Dot `<div>` is decorative ✓. | keep. |
| notes | **No changes needed.** ✓ | ✓ |

### ConditionChip — `components/kit/condition-chip.tsx`

| aspect | BEFORE | AFTER |
|---|---|---|
| tokens-only? | YES. | keep. |
| states | display-only, 3 fixed conditions ✓ (`§2 C14` state-complete). | keep. |
| ARIA | as StatusChip — text carries meaning. | keep. |
| notes | **No changes needed.** ✓ | ✓ |

### Breadcrumb — `components/kit/breadcrumb.tsx`

| aspect | BEFORE | AFTER |
|---|---|---|
| tokens-only? | YES. | keep. |
| §9 link hover | inline `hover:underline hover:[color:var(--text-primary)]` — this IS the §9 "link hover" global rule, but there is no shared `.kit-link` utility (globals only has row/field/interactive). Acceptable as an inline per-link rule; note it. | keep (or add `.kit-link`). |
| keyboard | `<a href>` ✓; `.kit-focus-ring` ✓. | keep. |
| ARIA | `<nav aria-label="Breadcrumb">` ✓; current `aria-current="page"` ✓; separator `<span>` is text `/` — should be `aria-hidden` so SR doesn't read "slash". | _tbd_ (tiny) |
| notes | Near-complete; one `aria-hidden` on the separator. | |

### ActionTileGrid — `components/kit/action-tile-grid.tsx`

| aspect | BEFORE | AFTER |
|---|---|---|
| tokens-only? | YES — `w-[300px]`/`w-[142px]` are the artboard's fixed grid; `--sp-*` throughout. | keep. |
| §9.6 pressed | `.kit-interactive` (→ `--surface-hover` on press, correct for a tile). | keep. |
| §9.7 disabled | `disabled` attr + inline `opacity-[0.5] pointer-events-none` — **redundant** with `.kit-interactive:disabled`. Remove the inline. | _tbd_ |
| keyboard | native `<button>` per tile ✓. | keep. |
| ARIA | tile has icon + label + sub-label all as text inside the button — accessible name is the concatenation, fine. Icon `<svg>` (caller-supplied) — document it must be `aria-hidden`. Badge sub-label ("1 Delivery Pending") is just text — ok. | _tbd_ (doc) |
| notes | Drop the redundant disabled inline. | |

### ActivityTimeline — `components/kit/activity-timeline.tsx`

| aspect | BEFORE | AFTER |
|---|---|---|
| tokens-only? | YES. | keep. |
| states | display-only; default ✓; empty ✓ (`§2 C28` — "No movements logged today" inline tertiary line, ties to EmptyState but the drawn treatment is inline — keep). | keep. |
| §9.3 row hover | rows are **not** clickable in the kit sample (display-only), so no `.kit-row` — correct. If a screen makes rows link, it adds `.kit-row`. | keep. |
| ARIA | plain `<div>` list. Could be `<ul>`/`<li>` for structure. Signed value color (danger/success) is reinforced by the `+`/`−` in the value string ✓ (not color-only). | _tbd_ (ul/li) |
| notes | Minor semantic markup. | |

### Banner (Transfer / PurchaseDelivery) — `components/kit/banner.tsx`

Required (`§2 C22`): transfer (amber) + purchase-delivery (blue) pinned
(ARTBOARD ✓), Accept + Flag actions (ARTBOARD ✓), flagged (ARTBOARD ✓ via
`flagged`).

| aspect | BEFORE | AFTER |
|---|---|---|
| tokens-only? | **NO** — primary action label `text-white` → `--text-inverse` (X8). `bg-warning-bg border-warning` / `bg-info-bg` / `bg-success` / `bg-info` all token ✓. | _tbd_ |
| §9.5 button hover | both action buttons are `.kit-interactive` + `.kit-focus-ring` ✓; the primary (`bg-success`/`bg-info`) sets no `--kit-hover-bg` → hovers to `--surface-hover` (wrong — should darken its own color). No `--color-success-hover` / `--color-info-hover` token exists. | _tbd_ (owner: add hover tokens, or accept `--surface-hover`, or `filter: brightness`?) |
| flagged state | `opacity-[0.7]` + actions `hidden` ✓. Spec also wants a "Flagged — awaiting admin" muted status line (`§2 C22`) — **missing** (just hides the actions). | _tbd_ |
| keyboard | native `<button>` ✓. | keep. |
| ARIA | container plain `<div>` — should be `role="status"` or `role="region" aria-label` (it's a pinned persistent banner with actions). Icon (none in the kit `<Banner>` — the SM hub draws its own leading icon inline). | _tbd_ |
| notes | Best-practice: compose `<Button>` for the two actions so §9.5/§9.7/§9.10 come free. | |

### CalculatedImpactBanner — `components/kit/calculated-impact-banner.tsx`

| aspect | BEFORE | AFTER |
|---|---|---|
| tokens-only? | YES — `bg-warning-bg` + `text-warning` + `--sp-*` ✓. | keep. |
| states | display-only, single visual ✓ (`§2 C23`). §6 D5 flagged suspected `p-3` vs `--sp-5` — the component uses `p-(--sp-5)` ✓ (12px), so D5 is resolved. | keep. |
| ARIA | `<div>` with an amber consequence sentence — should be `role="status"` (it previews the numeric consequence of a pending edit — SR users editing a correction should hear it). Icon `<svg>` → `aria-hidden`. | _tbd_ |
| notes | Add `role="status"` + `aria-hidden` on the icon. | |

### InstructionalBanner — `components/kit/instructional-banner.tsx`

| aspect | BEFORE | AFTER |
|---|---|---|
| tokens-only? | **NO** — numbered circle `bg-accent` + label `text-white` → `--text-inverse` (X8); `w-[28px]`/`h-[28px]` circle is the artboard's. | _tbd_ |
| states | display-only, single visual ✓ (`§2 C25`); neutral `--surface-selected` tint, distinct from CalculatedImpactBanner's amber ✓ (§6 D6 resolved). | keep. |
| ARIA | `<div>` — fine (static instructional copy, not a live region). Number in the circle is text ✓. | keep. |
| notes | Just the `text-white` → `--text-inverse`. | |

### MatchCard — `components/kit/match-card.tsx`

Required (`§2 C24`): awaiting/matched/flagged (ARTBOARD ✓), submitting
(GLOBAL — primary-loading).

| aspect | BEFORE | AFTER |
|---|---|---|
| tokens-only? | **NO** — awaiting action `bg-accent` + `text-white` → `--text-inverse` (X8); `text-[10px]` pill (genuine Paper); `tracking-[0.04em]` (X15). | _tbd_ |
| §9.5 button hover | awaiting button is `.kit-interactive` + `.kit-focus-ring` ✓; `bg-accent` sets no `--kit-hover-bg` → hovers to `--surface-hover` (should → `--color-accent-hover`). Same Button-class bug. | _tbd_ |
| §9.10 submitting | **missing** — no `data-loading` / `<Spinner>` path. | _tbd_ (compose `<Button>`) |
| matched/flagged | result bar is a `<div>` (not a button) ✓; pill color ✓. | keep. |
| keyboard | awaiting action native `<button>` ✓. | keep. |
| ARIA | container `<div>` — `role="region" aria-label={supplier}` or `role="listitem"` (it lives in a reconciliation list). Pill is decorative text. | _tbd_ |
| notes | Compose `<Button>` for the awaiting action. | |

### DenseSummaryStrip — `components/kit/dense-summary-strip.tsx`

| aspect | BEFORE | AFTER |
|---|---|---|
| tokens-only? | **NO** — label `text-[#FFFFFF99]` raw → `--nav-text-subtle` (X9); `bg-gray-900` (maps to `--color-gray-900` ✓); values `text-white`/`text-warning`/… (`text-white` → `--text-inverse`? on a dark strip white text is correct — `--text-inverse` IS white, so use it for consistency) (X8). | _tbd_ |
| states | display-only ✓ (`§2 C21` — one canonical version, §8 D4 verified). | keep. |
| ARIA | `<div>` of label:value pairs — fine; could be a `<dl>`. Values are numeric with tabular-nums? uses `font-mono` ✓. | _tbd_ (dl optional) |
| notes | Swap the two raw whites for tokens. | |

### FlowHeader — `components/kit/flow-header.tsx`

Required (`§2 C31`): default (back + title + direction badge, ARTBOARD ✓),
no-badge variant (ARTBOARD ✓ via `!direction`), back pressed (GLOBAL).

| aspect | BEFORE | AFTER |
|---|---|---|
| tokens-only? | YES — `w-[390px]` artboard width (callers pass `w-full`); `h-[48px]`; direction tones all map to `text-info`/`success`/`danger`/`warning` ✓ (ADR-37c). | _tbd_ (default `w-full`?) |
| §9 back button | `.kit-interactive` + `.kit-focus-ring` ✓; `aria-label="Back"` ✓. | keep. |
| keyboard | native `<button>` ✓. | keep. |
| ARIA | outer `<div>` — should be `<header>` landmark; title node could be linked as the page heading (`role="heading" aria-level`). Back button ok. Direction badge is text ✓. | _tbd_ |
| notes | Minor. | |

---

## 3. New primitives (3d) — NO Paper artboard; owner review via Storybook next session

| primitive | purpose | build note | owner review? |
|---|---|---|---|
| **`Spinner`** (`components/kit/spinner.tsx`) | the inline 14px `.kit-spinner` §9.10 references, as a shared component. Used by `Button[data-loading]`, `MatchCard`, etc. | `<span className="kit-spinner" role="status">` + visually-hidden "Loading". `size?` maps to `--icon-sm` (default) / `--icon-md`. CSS already exists. | mechanical — flag but trivial |
| **`FormField`** (`components/kit/form-field.tsx`) | label + control slot + helper/error row (§9.8) as ONE component; wires `aria-describedby` + `aria-invalid`. | Wraps any `.kit-field` control via `children` or render-prop; generates ids; helper row = `text-(--color-danger) text-caption/micro mt-(--sp-2)` when `error`, else `--text-secondary`. Field components (`TextInput`, `Textarea`, `Select`, `QuantityStepper`) compose it for the labelled case; keep them working bare. | mechanical — flag but trivial |
| **`Toast` / `Notifier`** (`components/kit/toast.tsx`) | success/feedback primitive — "correction saved" etc. `role="status"`, admin top-right / staff bottom-center, `--z-toast`, auto-dismiss ~4s pausable on hover/focus, `--dur-base` `transform` slide, stacks, no reduced-motion special-casing (D4). | `<ToastProvider>` + `useToast()` hook returning `toast(msg, opts)`. Position via a `placement` prop on the provider. Document the choice. | **YES — real layout choices** (placement, stacking, timing) |
| **`PageShell` / `ContentRegion`** (`components/kit/page-shell.tsx`) | the "stock body doesn't fill the viewport like catalog" fix. One `<PageShell>` owning `--content-max` (1200px), page padding, and a toolbar slot. | `<PageShell toolbar={…}>children</PageShell>` → `max-w-(--content-max) mx-auto px-… ` + a sticky-capable toolbar row. Screens adopt it next session. | **YES — real layout decisions** |

---

## Remaining gaps — owner sign-off needed (all deferred to session 10b review)

> **RESOLVED — Session 10b/10d.** Items 1–7 below were reviewed by the owner
> in the running Storybook and **ratified as-is** (see `DECISIONS.md` ADR-43,
> now RATIFIED). Items 8–10 are pre-existing carry-forwards not gated on this
> review (8 → a future design sprint's token call; 9 → a documented
> intentional exception; 10 → a follow-up only if a screen needs it). New
> flags the proof harness surfaced are in "Harness-surfaced flags (Session
> 10c)" and the audit result is in "Session 10d — Paper-parity audit", both
> below.

These are the "not fully done in this Development Sprint" items. None block
Gate 3; each is a design/behaviour decision surfaced for the owner, not a bug.

1. **`PageShell` / `ContentRegion` layout** — the padding (`--sp-7` block /
   `--sp-8` inline), the `--content-max` clamp, the sticky toolbar row, and the
   `wide` / `flush` escape hatches are a *proposal*, not a drawn artboard.
   Owner reviews in Storybook (10b) before the Session 11 screen rebuild adopts
   it.
2. **`Toast` / `Notifier`** — placement (`top-right` admin / `bottom-center`
   staff), 4-visible stack cap, 4000 ms auto-dismiss, pause-on-hover/focus,
   `info`/`success`/`danger` tone with a hairline left border. Owner review.
3. **`DatePicker` real-calendar mode** — internal visible-month state + a
   `selected: Date` / `onSelect` API alongside the legacy `weeks` prop. The
   *visual* is byte-identical to `9S1-0`; the behaviour is new. Owner confirms
   the API shape (Session 11 screens will use `selected`/`onSelect`, not
   `weeks`).
4. **`QuantityStepper` typed input** — the value is now an `<input
   role="spinbutton">`. REST visual unchanged; typing + `↑`/`↓` are new. Owner
   confirms this is wanted (it's required to satisfy `component-states.md §2 C10`
   "focus (value field)" / "error (typed value)" — otherwise those two rows stay
   permanently `n/a`). **RATIFIED — ADR-43 (Session 10b), and re-verified against
   the M2 bar + behaviour-signed-off in M2 Session 2** (7 stories incl.
   `TypeALargeQuantity` inline-entry, ADR-42 gate green). C10 is now
   "implemented + gated (M2-02)".
5. **`--color-success-hover` / `--color-info-hover`** — added to `tokens.css` +
   `tokens.ts` this session (the drift test passes). Values
   `oklch(46% 0.121 155)` / `oklch(46.5% 0.146 252.3)` — one lightness step
   below the base, mirroring `--color-accent-hover` / `--color-danger-hover`.
   Owner ratifies at review (or the two success/info filled action buttons in
   `Banner` go back to `--surface-hover` on hover).
6. **`Button` `size` prop** (`sm` 32 / `md` 36 / `lg` 44) — `md` is
   byte-identical to the only drawn artboard; `sm` / `lg` have no artboard.
   Flagged "NEW — needs owner review" for the 10b Storybook stories.
7. **PillFilter as radiogroup** — changed from N× `aria-pressed` toggle buttons
   to `role="radiogroup"` / `role="radio"` / `aria-checked` with arrow-key
   selection (owner picked this in the session-10 kickoff Q&A). If pills ever
   become multi-select, this reverts to a toolbar of toggles.
8. **`0.06em` / `0.08em` tracking** (FrictionDeleteDialog "PERMANENT…" caption;
   admin-shell nav group headers) — no `--tracking-*` token covers these; left
   as `[letter-spacing:0.06em]` / `[letter-spacing:0.08em]` literals. A future
   design sprint decides whether to add `--tracking-wide` / `--tracking-wider`.
9. **BulkEntryGrid — no §9.8 helper row on a cell error** — a grid cell shows
   its error via border + red value only (there's no room for a helper line per
   cell). Documented as an intentional exception to §9.8 for the grid density.
10. **Grid arrow-key navigation** (BulkEntryGrid cell-to-cell, DenseLedger
    cell-to-cell) — **not** implemented. Cells are Tab-reachable; APG "Data
    Grid" arrow navigation is not. If a screen needs it, it's a follow-up.

## Gate 3 checklist — PASSED

- [x] `docs/design/kit-audit.md` — every component has a before + after; the
      remaining "missing"-type gaps are the 10 owner-sign-off items above, each
      with a reason. No *unjustified* missing cell.
- [x] `pnpm tsc --noEmit` — **exit 0** (`.next` cleared first).
- [x] `pnpm build` — **clean**; all 43 routes compiled, "Compiled successfully".
- [x] **No feature screen file touched** — `git diff --stat` for this session is
      confined to `components/kit/**`, `components/shells/**`, `app/globals.css`,
      `app/design-system/tokens.css` + `tokens.ts` (the two new hover tokens,
      owner sign-off), plus the new primitive / `internal/` files and this doc.
      `app/admin/**`, `app/store-manager/**`, `app/canteen/**`, `app/cashier/**`,
      `app/design-preview/**`, `docs/design/screens/**` — **untouched**.
- [x] `pnpm test` — **80 passed** (76 pre-Session-9 + 4 token drift-guards; the
      drift guard confirms `--color-success-hover` / `--color-info-hover` are in
      both token files with matching values).
- [x] `lib/tokens.css` stub deleted (grep-confirmed no importers;
      `globals.css` comment updated).
- [x] Kit-gallery smoke — `GET /design-preview/kit` → **HTTP 200, 0 errors** in
      the dev log after a clean `.next`.
- [x] `docs/design/component-states.md` — each component's states marked
      **implemented** (§9 + the drawn artboards).
- [x] `docs/design/design-principles.md §6` — mirror still correct; §9 pointer
      added for the new `.kit-*-panel` slide utilities.
- [x] `docs/PROGRESS.md` — Session 10 entry added.
- [x] `docs/sprints/session-10b-handoff.md` — drafted (Deliverable 4).
- [x] `docs/sprints/session-11-handoff.md` — drafted (screen rebuild).
- [x] `docs/DECISIONS.md` — ADR-43 (the 4 new primitives + the two hover tokens
      + the QuantityStepper/DatePicker behaviour changes) drafted, pending the
      10b owner review to finalise.

---

## Harness-surfaced flags (Session 10c)

The proof harness (Storybook + story-snapshot + axe) exposed things the
Session 10 audit missed. Fixes-in-scope are marked FIXED; the rest are FLAGs
routed to a design sprint (a new visual decision, not a deviation-from-approved).

### §9.1 keyboard ring on the two field boxes — FLAG → design sprint

`TextInput` / `Textarea` carry `.kit-field` (the §9.2 accent *border* that
appears on any focus) but **not** `.kit-focus-ring` (the §9.1 keyboard-only
outline). `Select` has both. Adding the ring to the two field boxes is a
visual change, so it is not made here. The `text-input` story documents this
and asserts the §9.2 border only.

### Systemic low-contrast text — ONE flag, many sites — FLAG → design sprint

`--text-tertiary` (`--color-gray-500`) ≈ 3.4:1 on `--surface-page`, and
semantic-colour text — `--color-warning` ≈ 2.5:1, `--color-danger` /
`--color-success` on tint or on `--color-gray-900` — are all below WCAG AA
4.5:1. **Every affected site matches the drawn Paper visual** (dimmed text is
intentionally low-contrast there). `color-contrast` is scoped off per-story
with a FLAG note in each. Affected: Select placeholder; DatePicker
out-of-month / disabled-future cells; StatusChip / ConditionChip warning
label; Transfer / PurchaseDelivery / CalculatedImpact banner heading & body;
DenseLedger movement values + dash + empty line + footer tone values;
BulkEntryGrid category cell / non-editable cell / footer subtle labels;
DenseSummaryStrip tone values; Breadcrumb parent links; ActivityTimeline
subtitles; BottomNav inactive labels; AdminShell nav-group section labels.
→ design-sprint decision: darken dimmed text to `--text-secondary`, add
on-dark / on-tint semantic-colour text tokens, or accept as incidental /
status-indicator text where colour is not the only cue.

### SimpleTable ARIA — audit miss, FIXED this session (10c)

`role="row"` and `role="columnheader"` were placed on `<button>` elements
(invalid — `aria-allowed-role`). Corrected to role-on-wrapper with a nested
`<button>` as the activation/focus target, and the skeleton / empty /
EmptyState branches given proper `role="row"` / `role="cell"` wrappers.
`components/kit/simple-table.tsx`.

---

## Session 10d — Paper-parity audit

**Method.** Replaces the automated Paper-artboard visual diff specced for
10b/10c (see the scope-change note in `session-10b-handoff.md` and
`TEST_PLAN.md §2a`). One-time manual comparison of each
`component-states.md §2` component's Storybook stories against its kit
artboard (`design-principles.md §7` ids), for the REST state and every state
Paper draws (`component-states.md §8`). The owner performed the visual
comparison in the running Storybook and handed over the discrepancy list
below; token values were confirmed against the component source.

**What was checked.** All 32 kit components + the 4 primitives, across the
kit artboards `6BR-0` (Buttons), `6CG-0` (Form Controls), `6WD-0` (Utility &
Layout), `6IW-0` (Tabs/Filters), `6DJ-0` (Chips), `6ET-0` (Tables), `6OE-0`
(Drawers/Dialogs), `6Z4-0` (Bottom Sheet), `6SB-0` (Banners/Cards), `6TT-0`
(Bulk Grid), `9U3-0` (Empty/Error), and the Admin Shell nav rail (`649-0`).

**What matched.** Every REST state and every Paper-drawn state matched the
approved design in structure, tokens, and per-state treatment — consistent
with Session 2's consistency audit (§8) and the Sessions 3–4b `get_jsx`
rebuild. The already-recorded deliberate deviations (Button disabled →
§9.7 opacity rule not Paper's flat grey; Button loading → holds variant
colour + width per §9.10 not Paper's `#32125F`; DenseLedger corrected cell →
underlined semantic-colour per ADR-36a; DatePicker / QuantityStepper
behaviour per ADR-43; overlay panels → opaque `--surface-raised` per ADR-41)
are all correct and in scope.

**Discrepancies found and fixed (deviation-from-approved, in scope):**

| # | Component | Discrepancy | Fix |
|---|---|---|---|
| 1 | **Drawer** | The panel had no `z-index`, so the `.kit-scrim` (`z-index: --z-overlay` 1200, with `backdrop-filter: blur`) painted **over** the panel — the drawer's own content rendered blurred and the backdrop did not sit behind it. Every other overlay (`bottom-sheet`, `friction-delete-dialog`, `mobile-nav-drawer`) already set an explicit panel `z-index` (`--z-dialog` or `--z-drawer` via an arbitrary-value class); `drawer.tsx` was the only omission. | Added `[z-index:var(--z-drawer)]` (1300) to the `.kit-drawer-panel` class in `components/kit/drawer.tsx`. Panel now sits above the scrim; content is crisp, backdrop dims/blurs only what is behind. Affected drawer stories re-baselined. |
| 2 | **ToggleSwitch** | A perceptible flick on click. Root cause: the track carried `.kit-interactive`, whose `transform` transition + `:active` background repaint animated on the round knob. A switch is not a hover/press button surface. | Dropped `.kit-interactive` from the track in `components/kit/toggle-switch.tsx`; kept `.kit-focus-ring` (§9.1); added a scoped `background-color` transition for the on/off colour; made disabled's `pointer-events: none` explicit (previously inherited from `.kit-interactive:disabled`). Toggle stories re-baselined. |

**Checked, not a defect:**

- **Spinner "spins too fast" in Storybook** — expected. `.storybook/preview.ts`
  deliberately forces `animation-duration: 1ms` on `*` so the test-runner
  settles deterministically; that makes `.kit-spinner` look like it is
  whipping around. The real app uses the true `640ms linear` rotation. No
  code change.

**Design questions flagged (not decided here):** none new — the systemic
low-contrast flag above already covers every dimmed-text site the audit
surfaced.

**No feature-screen file touched.** The two fixes are confined to
`components/kit/drawer.tsx` and `components/kit/toggle-switch.tsx`.
