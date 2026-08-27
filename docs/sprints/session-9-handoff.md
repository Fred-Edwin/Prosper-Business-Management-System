# Session 9 Handoff — Developer: **Design System Codification + Kit Interaction Remediation**

**Status:** NOT STARTED.

**Role:** Developer, for the Prosper project. This is **not** a feature
sprint and **not** a design sprint — it is a **remediation sprint** that
sits between the two. Its product is a **proven, fully-interactive
component kit backed by a codified design system**. No feature screens are
built or touched.

**Why this session exists.** Sessions 3–4 built `components/kit/*` and the
screen skeletons by **`get_jsx` transcription of static Paper artboards**.
Paper artboards have no hover / focus / pressed / loading state to
capture, so the transcription produced pixel-faithful *pictures* of
controls, not controls. Sessions 5 and 7 then wired data into those
pictures without adding interaction states (the rules forbade "touching
the approved markup"). Result, confirmed by a real-browser probe on
2026-08-27:

- The design-system spec (`design-principles.md §6` tokens, `§9` ten
  interaction rules, `component-states.md` per-component state list)
  **exists and is thorough** — but was **never faithfully implemented in
  code**.
- `globals.css` has ~96 `--*` declarations; the spec lists ~71; they have
  **drifted** and neither is complete (no z-index scale, no motion
  tokens, no elevation ladder, no control-height scale, no opacity
  tokens, no breakpoint→layout map).
- Kit components mostly **do not implement their §9 states**. Measured:
  catalog tabs, `Add Product`, row `Edit`, nav items, stock pills — **no
  hover change**. Search input — **no focus border** (`kit-field` present
  but not effective). Only `DenseLedger` rows (`.kit-row`) show a hover
  tint.
- **`Drawer` renders no scrim / overlay at all** — it is just the panel
  `<div>`. Each screen hand-rolls `bg-black/30` around it, with **no
  `backdrop-filter` blur, no `z-index` token, no scroll-lock, no `inert`
  on the background**. Two overlays can fight (observed: a stale drawer
  intercepting clicks). And `--surface-panel-tint: #A690B838` is a **38%
  alpha** fill — the panel itself is semi-transparent by token. This is
  the "transparent modal" the owner reported.

**The owner's decision (2026-08-27), verbatim intent:** codify the design
system as **code, not prose** (all tokens — foundations *and*
interaction-state contract); audit and fix **every** kit component so it
implements every state it needs; stand up **Storybook** (one story per
state) so the kit is provable in isolation; add **visual-regression +
a11y gates**. Only after this session is the kit trustworthy. The **next**
session rebuilds the shipped screens as *compositions of this kit* and
rewrites the workflow docs.

---

## Required reading (before any code)

1. **`CLAUDE.md`** (root) — the role model, the non-negotiables, **pnpm
   only**, **post a visible checklist and tick it**. Note: this session
   makes **no new design decisions** — the design system is already
   specified; you are implementing it faithfully and completing the
   enumerated gaps with owner sign-off on a reconciliation table.
2. **`docs/design/design-principles.md`** — the whole file, but especially:
   - **§6 "Design tokens (as built — final values)"** — the canonical
     token snapshot. *"The Paper file is authoritative for tokens, full
     stop"* — re-pull live via `get_tokens({format: "css"})`.
   - **§9 "Global interaction states (binding — applied once as global
     CSS)"** — the **ten rules** (focus-visible ring, input focus border,
     row hover tint, selected tint, button hover, active/pressed,
     disabled, error field, transition timing, loading/skeleton). This is
     the interaction contract you are implementing and enforcing.
   - **§5** icon library, **§7** component inventory (the 16-artboard kit
     + the additions), **§8** open decisions.
3. **`docs/design/component-states.md`** — CONFIRMED. §1 the M1 component
   list + where each is used + "Interactive? y/n"; **§2** which states are
   drawn as artboards (the visual reference) vs handled by §9 global CSS;
   §7/§8 the resolved open decisions and the consistency-audit result.
   This tells you, per component, **exactly which states it must have**.
4. **`docs/design/DESIGN_SYSTEM_PLAN.md`** — §0 decisions (shadcn/Radix
   base, purple accent exception, full per-component state depth), §1
   design direction (two shells, one system — Admin dense / staff
   one-handed), §4 the per-component spec depth expected.
5. **`docs/design/ENTERPRISE_UI_DESIGN_PRINCIPLES.md`** — the binding
   house style §9 references.
6. **`docs/PROGRESS.md`** — the **Session 7 entry** and this session's
   context. Read the "what we did wrong" analysis in the 2026-08-27
   conversation if it was captured; otherwise this handoff's "Why this
   session exists" is the summary.
7. **`app/globals.css`** — what is *currently* codified. The §9 block
   (`.kit-interactive` / `.kit-row` / `.kit-field` / `.kit-focus-ring` /
   `kit-skeleton`) exists but is **incomplete and under-applied**.
8. **Every file in `components/kit/`** (32 components) — read each one.
   Note for each: does it compose only tokens + §9 utilities, or does it
   carry raw values / layout-only classes? Which §9 states does it
   actually implement? Does it have the required ARIA + keyboard
   behaviour?
9. **`node_modules/next/dist/docs/`** — before any config/route code
   (Storybook setup, test config). This is not the Next.js in your
   training data.
10. **The Paper file** — via the `paper` MCP. `get_guide({ topic:
    "paper-mcp-instructions" })` first. Then `get_basic_info`,
    `get_tokens({ format: "css" })`, `get_font_family_info`, and
    `get_computed_styles` on representative nodes (a button in each
    variant, a text input, a select, a table row, a drawer/rail panel, a
    pill, a tab). Paper is **read-only** this session — do not write to
    it.

---

## Scope — what "done" means

Four deliverables, in order. Do not start deliverable N+1 until N is
complete and its gate passes.

### Deliverable 1 — Token reconciliation + codified foundations

**1a. Produce a token reconciliation table** (`docs/design/token-reconciliation.md`)
before writing any token code. Three sources:

- **Paper** (`get_tokens`, `get_computed_styles`) — authoritative for
  *visual values*.
- **Code** (`globals.css`, `design-principles.md §6`, kit class strings)
  — authoritative for *what is already wired*.
- **Gap proposals** — categories neither source fully has (below);
  propose values derived from what you found.

Table columns: `token | Paper value | code value (globals.css) | spec value (§6) | decision`. Decisions: **✓ match → codify**;
**conflict → STOP, list it, ask the owner**; **gap → propose a value +
flag for sign-off**. The owner approves this one table — that is the only
design sign-off in this session.

**1b. Codify the full token set** as `app/design-system/tokens.css` (CSS
custom properties on `:root`) **and** `app/design-system/tokens.ts` (typed
export — a plain object mirroring the CSS, so TS code and tests can
reference tokens by name). `globals.css` imports `tokens.css` and keeps
only the §9 utility classes + resets. **Every value comes from the
approved reconciliation table** — no new hand-picked numbers.

The complete Tier-1 set (existing values kept; **bold = currently
missing, must be added with owner sign-off**):

| Category | Contents |
|---|---|
| **Color — primitives** | the gray / accent / success / warning / danger / info / gold scales (OKLCH, per §6 — do **not** re-derive to hex) |
| **Color — semantic** | `--surface-page/subtle/hover/selected`, **`--surface-active`** (pressed), **`--surface-raised`** (opaque drawer/dialog panel — see D2), `--surface-panel-tint` (the veil, kept but see D2), `--text-primary/secondary/tertiary/disabled`, **`--text-inverse`**, `--border-subtle/strong`, `--color-accent`, `--color-accent-hover`, **`--color-danger-hover`** (§9.5 fallback becomes a token), `--color-{success,warning,danger,info}` + `-bg` |
| **Color — dark-surface** | the `--nav-*` set (sidebar / bottom nav / sticky footer) — already in §6, keep |
| **Typography** | `--font-ui`, `--font-mono`; the scale `--text-micro…--text-display` + paired `--leading-*`; `--weight-regular/medium/semibold`; **per-size `--tracking-*` (letter-spacing)** if Paper defines any; `font-synthesis: none` |
| **Spacing** | `--sp-1…--sp-12` (2→64) — already in §6, keep |
| **Sizing** | **`--control-sm: 32px` / `--control-md: 36px` / `--control-lg: 44px`** (the three control heights already used ad hoc); **`--icon-sm: 14 / --icon-md: 16 / --icon-lg: 20 / --icon-xl: 24`**; **`--tap-min: 44px`**; **`--content-max: 1200px`**; avatar sizes |
| **Radii** | `--radius-sm/md/lg` (4/6/8) + the "tables = 0" rule — already in §6, keep; add **`--radius-full: 9999px`** |
| **Borders** | **`--border-width-hairline: 1px` / `--border-width-focus: 2px`** |
| **Elevation / shadow** | **`--shadow-sm/md/lg`**, **`--shadow-drawer`**, **`--shadow-dialog`** — the z-elevation ladder (Paper `get_computed_styles` on the drawer artboard for the real values; if Paper draws none, propose a minimal set) |
| **Z-index** | **`--z-base: 0` / `--z-dropdown: 1000` / `--z-sticky: 1100` / `--z-overlay: 1200` / `--z-drawer: 1300` / `--z-dialog: 1400` / `--z-toast: 1500`** — the missing scale that lets overlays stop fighting |
| **Motion** | **`--dur-fast: 120ms`** (from §9.9), **`--dur-base: 200ms`** (drawer slide, §9.9), **`--dur-slow: 320ms`**; **`--ease-standard` / `--ease-decelerate` / `--ease-accelerate`**; the §9.9 rule (transition only bg / border / opacity / transform; **never** layout; **never** the focus outline) encoded as the `.kit-interactive` allow-list |
| **Opacity** | **`--opacity-disabled: 0.5`** (§9.7), **`--opacity-loading-label: 0.7`** (§9.10), **`--opacity-scrim: 0.3`** (drawer/dialog backdrop) |
| **Breakpoints** | **`--bp-sm/md/lg/xl`** as documented constants + a short map: which screens swap layout at `md` (mobile card ↔ desktop table) |
| **Focus** | ring color light + on-dark (`--nav-text-active`), width (`--border-width-focus`), offset (`2px`), and the `:focus-visible`-only rule (§9.1) |
| **Reduced motion** | the `@media (prefers-reduced-motion: reduce)` block that neutralises every non-essential transition / the skeleton shimmer / the drawer slide |

**Gate 1:** the reconciliation table is approved; `tokens.css` +
`tokens.ts` exist; `globals.css` imports them; `pnpm build` +
`pnpm tsc --noEmit` clean; every screen still renders (no visual
regression yet — that's Deliverable 3's gate, but a `pnpm dev` smoke that
the four `/admin/*` pages still load is required here).

### Deliverable 2 — Complete the §9 interaction-state contract as shared CSS

Take `globals.css` §9 from "partial" to "complete and correct", one
shared utility per state, matching `design-principles.md §9` rules 1–10
**exactly**:

| Utility | Implements | Notes |
|---|---|---|
| `.kit-focus-ring` / `.kit-focus-on-dark` | §9.1 | `:focus-visible` only; **never transitioned**; white on dark |
| `.kit-field` | §9.2 + §9.8 | focus border → `--color-accent` on **any** focus; `[aria-invalid]` / `[data-invalid]` → `--color-danger` border + the helper-text pattern hook |
| `.kit-row` | §9.3 + §9.4 | `:hover` → `--surface-hover`; `[data-selected]` / `[aria-current]` → `--surface-selected`, wins over hover; **only when the row is actually clickable** |
| `.kit-interactive` | §9.5 + §9.6 + §9.7 + §9.9 | `:hover` and `:active` bg shifts per variant hooks; `:disabled` / `[aria-disabled]` / `[data-disabled]` → `--opacity-disabled` + `pointer-events: none`; the transition allow-list (`--dur-fast`, bg/border/opacity only) |
| `.kit-interactive[data-loading]` | §9.10 | label → `--opacity-loading-label`, inline 14px spinner in label color, `pointer-events: none`, control keeps width |
| `.kit-skeleton` | §9.10 | `--surface-subtle` block + `--surface-hover` shimmer sweep, `1200ms` loop; **respects reduced-motion** |
| `.kit-scrim` | (new — the missing overlay backdrop) | `position: fixed; inset: 0;` `background: rgb(0 0 0 / var(--opacity-scrim))`; **`backdrop-filter: blur(3px)`** (+ `-webkit-` prefix); `z-index: var(--z-overlay)`; the panel it wraps sits at `--z-drawer` / `--z-dialog` |

`@media (hover: hover)` guard on every `:hover` rule (so touch devices
don't get stuck hover states). `@media (prefers-reduced-motion: reduce)`
block neutralising transitions + shimmer + slide.

**Gate 2:** every §9 rule has a corresponding utility; a throwaway
`/kit-probe` page (or a Playwright script — deleted after) demonstrates,
for one instance of each utility, that hover / focus-visible / active /
disabled / invalid actually change the computed style. Record the
before/after computed values in `PROGRESS.md`.

### Deliverable 3 — Audit and fix every kit component

For **all 32 components** in `components/kit/`:

**3a. Audit** — produce `docs/design/kit-audit.md`: a table
`component × [tokens-only? | §9 states implemented | keyboard | ARIA | notes]`.
For each component list which of its required states (from
`component-states.md §1`/`§2`) are **present / missing / broken**.

**3b. Fix** — bring every component to:
- **Composes only tokens + §9 utilities.** No raw hex (the two
  documented exceptions — `--surface-panel-tint`, `--color-gold-brand`
  masthead — stay as tokens). No off-scale spacing. No inline
  layout-only re-implementation of a state that a `.kit-*` utility
  covers.
- **Implements every applicable §9 state** — the audit's "missing"
  column goes to zero (or every remaining gap is explicitly justified in
  the audit doc with owner sign-off).
- **Full keyboard support** — Tab reaches it; Enter/Space activate;
  Esc closes overlays; **arrow keys** move within `Tabs` / `SegmentedControl`
  / `Select` / `PillFilter` menus per WAI-ARIA APG.
- **Correct ARIA** — `role`, `aria-*`, `aria-current` / `aria-selected` /
  `aria-invalid` / `aria-disabled` / `aria-modal` as the pattern
  requires.

**3c. Priority components (do these first, they are the reported bugs):**

- **`Drawer`** — the big one. It must render its **own scrim**
  (`.kit-scrim` — fixed, blurred, `--z-overlay`), with the panel on top
  at `--z-drawer`. Panel background must be **opaque** — introduce
  **`--surface-raised`** (opaque) as the panel fill; keep
  `--surface-panel-tint` only if Paper genuinely wants a translucent veil
  *layer* over an opaque base (confirm via `get_computed_styles` on 6OE-0
  — see **D2** below). On open: **focus moves into the panel**, focus is
  **trapped** (the existing trap is a start — verify it handles the
  no-focusable and dynamic-content cases), the **background is `inert`**
  (or `aria-hidden` + `pointer-events: none`), and **body scroll is
  locked** (`overflow: hidden` on `<html>`, restored on close). On close
  (Esc / scrim click / ×): focus **returns to the opener**. Two drawers
  must never both be interactive — opening one closes/blocks the other.
  `panel` and `rail` variants both get this.
- **`FrictionDeleteDialog`** — same overlay treatment (`.kit-scrim`,
  `--z-dialog`, focus-trap, scroll-lock, focus-restore).
- **`BottomSheet`** — the staff-shell equivalent; same contract, slide
  from bottom (`transform`, `--dur-base`), drag-to-dismiss optional.
- **`Button`** / **`IconButton`** — §9.5 hover per variant (primary →
  `--color-accent-hover`; secondary/tertiary/icon → `--surface-hover`;
  destructive → `--color-danger-hover`), §9.6 active, §9.7 disabled,
  §9.10 loading. Verify the loading spinner keeps the button width.
- **`Tabs`** / **`PillFilter`** / **`SegmentedControl`** — §9.3/§9.4
  selected vs hover (selected wins), §9.1 ring, arrow-key navigation,
  `aria-selected` / `role="tab"` / `role="tablist"`.
- **`TextInput`** / **`Textarea`** / **`Select`** / **`SearchInput`** /
  **`DatePicker`** / **`QuantityStepper`** — `.kit-field` focus border on
  **any** focus (§9.2), `[aria-invalid]` error border + helper text
  (§9.8), disabled + read-only treatments. `DatePicker` must be a real
  field (label + trigger + calendar popover with keyboard nav), not a
  `<div>` wrapping a hidden `<input type="date">`.
- **`SimpleTable`** / **`DenseLedger`** / **`BulkEntryGrid`** — every
  clickable row gets `.kit-row` (hover + selected); header sort controls
  (if any) get `.kit-interactive` + `aria-sort`; loading = `.kit-skeleton`
  rows; empty = the `EmptyState` component (not inline text).
- **`EmptyState`** / **`ErrorState`** — confirm they exist to spec
  (ADR-36d): icon + title + one-line guidance + optional single action;
  `ErrorState` adds a "Retry". Wire them as the canonical empty/error for
  every table/list.
- **Nav** (`bottom-nav`, and the `AdminShell` sidebar rail in
  `components/shells/` — **allowed to touch this session, it is a
  kit-level concern**) — §9.3 hover tint on nav items (`--nav-bg-hover`),
  §9.4 active (`--nav-bg-active`), §9.1 on-dark ring.

**3d. Missing primitives to add** (small, but the screens need them):

- **`Toast` / `Notifier`** — there is **no success/feedback primitive**.
  Right now "correction saved" / "payment recorded" is silent (the drawer
  just closes). Add a toast primitive (`role="status"`, top-right or
  bottom-center, `--z-toast`, auto-dismiss, `--dur-base` slide, stacks,
  respects reduced-motion).
- **`PageShell` / content-region primitive** — the "stock body doesn't
  fill the viewport like catalog" bug is because every screen hand-rolls
  its `max-w` / padding and they diverge. One `<PageShell>` (or
  `<ContentRegion>`) that owns `--content-max`, the page padding, and the
  toolbar slot — every screen uses it.
- **`FormField` wrapper** — label + control + helper/error text, so the
  §9.8 error pattern is one component, not re-authored per drawer.
- **`Spinner`** — the inline 14px spinner §9.10 references, as a shared
  component.

**Gate 3:** `docs/design/kit-audit.md` shows zero unjustified "missing"
cells; `pnpm tsc --noEmit` + `pnpm build` clean; no feature screen file
touched (see Constraints).

### Deliverable 4 — Storybook + visual-regression + a11y gates

**4a. Stand up Storybook** (`pnpm add -D` the Storybook v8 packages for
Next.js + Vite; `pnpm dlx storybook@latest init` then trim to what's
needed). Config in `.storybook/`. It must load `tokens.css` + `globals.css`
so components render exactly as in the app.

**4b. One story per state, per component.** For every kit component, a
`*.stories.tsx` with a named story for each of: `Rest`, `Hover` (via
Storybook interaction / `pseudo` addon or a play function), `FocusVisible`,
`Active`, `Disabled`, `Loading`, `Error`/`Invalid`, `Selected`, `Empty`
(where applicable), plus every `variant` × `size`. The `Drawer` /
`Dialog` / `BottomSheet` stories must show the scrim + blur.

**4c. Visual-regression snapshots.** Use Storybook's test-runner +
Playwright (`@storybook/test-runner`) or `pnpm test:e2e` Playwright specs
that screenshot each story. Commit the baselines under
`tests/visual/__screenshots__/`. Add `pnpm test:visual` to `package.json`.

**4d. Accessibility checks.** `@storybook/addon-a11y` (axe) on every
story; a CI-runnable `pnpm test:a11y` that fails on any serious/critical
axe violation.

**4e. Wire into the test story.** `package.json` gains `test:visual` and
`test:a11y`; `README` / `docs/TEST_PLAN.md` updated to say the kit is
gated by Storybook + visual + a11y, and screens (next session onward) are
gated by composed-screen visual-diff + Playwright interaction pass.

**Gate 4:** `pnpm storybook` runs; every component has a story per state;
`pnpm test:visual` and `pnpm test:a11y` pass; baselines committed. The
existing **76 `pnpm test` unit tests still green.**

---

## Open decisions to resolve with the owner (at the start — before Deliverable 1b)

**D1 — Token reconciliation conflicts.** Any row in the Deliverable-1a
table where Paper and code disagree. Present the table; the owner picks
per row. (Most will be ✓ match. Expect a handful of real conflicts —
`--radius-md`, the `--surface-panel-tint` question in D2, any spacing
drift.)

**D2 — Drawer/dialog panel: opaque vs translucent.** The reported bug is
"transparent modals". `--surface-panel-tint` is `#A690B838` (38% alpha).
Two options:
- **(a)** Panel becomes fully **opaque** (`--surface-raised`, ~`--surface-page`
  or a hair darker); `--surface-panel-tint` is **retired**. Simplest;
  matches "how experts do it" (opaque panel + blurred scrim behind).
- **(b)** Keep a translucent *veil layer* but composite it over an opaque
  base inside the panel, so content is never see-through. More faithful
  to 6OE-0 if Paper truly intends a frosted panel.
`get_computed_styles` on the 6OE-0 panel node will show what Paper
actually renders — bring that to the owner. **Recommended: (a).**

**D3 — Storybook is a real dependency added to the repo.** Confirm the
owner wants Storybook specifically (vs a bespoke `/kit-workbench` route).
Storybook is the industry standard and brings the a11y + test-runner
addons for free — **recommended** — but it is ~40 dev-dependencies. If
the owner prefers zero new heavy deps, the fallback is a `/kit-workbench`
route + Playwright screenshot specs (more custom code, same gates).

**D4 — `prefers-reduced-motion` default.** Confirm: full reduced-motion
support (neutralise all non-essential transition/animation) — this is an
accessibility requirement and the **recommended** answer; noting it only
so it is not a silent addition.

Record each answer in `PROGRESS.md` and, where structural (D2, D3), a new
ADR (next number is **ADR-41** — check `DECISIONS.md`, Session 8 may have
taken it; use the next free number).

---

## Constraints

- **Remediation sprint — not features, not redesign.** The design system
  is already specified (`design-principles.md §6`/`§9`,
  `component-states.md`). You implement it faithfully and fill the
  enumerated Tier-1 gaps **against an owner-approved reconciliation
  table**. No new visual design.
- **Do NOT touch feature screen files.** Off-limits: `app/admin/**`,
  `app/store-manager/**`, `app/canteen/**`, `app/cashier/**`,
  `app/design-preview/**`, `docs/design/screens/**`. The screens are
  rebuilt next session; if a screen visibly breaks because a kit
  component's markup changed, that is expected and acceptable — note it,
  do not patch the screen.
- **DO touch:** `components/kit/**`, `components/shells/**` (nav
  interaction states are kit-level), `components/layout/**`,
  `app/globals.css`, the new `app/design-system/**`, `.storybook/**`,
  `tests/visual/**`, `package.json`, and docs.
- **Paper is read-only** this session. `get_*` only; no `write_html` /
  `set_*` / `create_*`.
- **Tokens come from the reconciliation table**, which comes from Paper +
  code. No hand-invented values without an owner-signed gap proposal.
- **Every §9 rule is implemented as a shared utility, once** — never
  re-authored per component.
- **pnpm only.** Read `node_modules/next/dist/docs/` before config code.
- Keep the **76 unit tests green** throughout.
- Post a checklist up front; tick it per deliverable and per priority
  component.

---

## Wrap-up

- **`docs/design/token-reconciliation.md`** — the approved table (kept as
  the record of every decision).
- **`app/design-system/tokens.css` + `tokens.ts`** — the codified
  foundation. `globals.css` reduced to imports + the §9 utilities +
  resets.
- **`docs/design/kit-audit.md`** — the per-component state-coverage table,
  before → after.
- **`.storybook/` + `*.stories.tsx`** — one story per state for all 32
  components + the new primitives (`Toast`, `PageShell`, `FormField`,
  `Spinner`).
- **`tests/visual/__screenshots__/`** committed baselines;
  `pnpm test:visual` + `pnpm test:a11y` in `package.json` and green.
- **`docs/design/design-principles.md`** — §6 token snapshot re-synced to
  the codified set; a note that the tokens now live in code
  (`app/design-system/`) and this section is the human-readable mirror.
- **`docs/design/component-states.md`** — mark each component's states as
  **implemented** (was: "spec'd").
- **`docs/TEST_PLAN.md`** — add the kit gates (Storybook / visual / a11y)
  and state that screens are henceforth gated by composed-screen
  visual-diff + Playwright interaction pass (the next session enforces
  this on the rebuilt screens).
- **`docs/PROGRESS.md`** — a "Session 9" entry: the reconciliation
  outcome (conflicts + resolutions), the full token set added, the §9
  utilities completed, the kit-audit before/after numbers, the Drawer /
  scrim / focus-trap / scroll-lock fix, the new primitives, the Storybook
  + visual + a11y gates, D1–D4 answers, anything flagged.
- **`docs/DECISIONS.md`** — ADR for D2 (panel opacity) and D3 (Storybook
  as a dependency) if adopted; next free ADR number.
- **`docs/sprints/session-10-handoff.md`** — draft it: **"Rebuild the
  shipped screens as kit compositions + rewrite the workflow docs."**
  Scope: re-assemble `/admin/catalog`, `/admin/stock` (+ `/opening`,
  `/financials`) as compositions of the now-proven kit — **keep every
  hook, `derive-ledger`, `opening-plan`, all `lib/domain` + `app/api`
  code**, replace only the transcribed JSX. Per-screen gate: visual-diff
  vs the Paper artboard (default state) + Playwright interaction pass
  (hover/focus/pressed/disabled/loading/empty/error) + responsive + axe.
  Then rewrite `export-workflow.md` (screens are **composed** from kit
  components; Paper markup is **never** copied into code; Paper artboard
  is the visual acceptance target), update `CLAUDE.md` + the sprint
  handoff template + `design-principles.md` (§9 promoted to a
  first-class, enforced contract), and add the UI test layer (jsdom or
  Playwright component tests) so components/screens mount in CI. Note
  that **Session 8 (Store Manager + Canteen) should be built AFTER this
  remediation, the new way** — re-sequence the milestone plan
  accordingly.

---

## Note on sequencing (for the milestone plan)

The original plan had Session 8 = Store Manager/Canteen frontend, Session
9 = F3 Assets. That ordering is now wrong. Corrected order:

1. **Session 9 (this) — design system + kit remediation.**
2. **Session 10 — rebuild shipped screens (catalog, admin stock) as kit
   compositions + rewrite workflow docs.**
3. **Session 11 — F2 Store Manager + Canteen frontend**, built the new
   way (compose from the proven kit; the `session-8-handoff.md` scope
   still applies, but its "move the skeleton / swap fixtures" method is
   replaced by "compose from kit + wire data").
4. **Session 12 — F3 Assets**, same method.
5. **QA pass.**

Update `docs/sprints/milestone-1-plan.md §5` and `§6` to reflect this.
`docs/sprints/session-8-handoff.md` stays as the Store Manager/Canteen
*scope* reference but gets a header note pointing here for the *method*.
