# Paper → Code Workflow

**Status:** Binding. This is the required method for turning approved
Paper.design screens and components into code.

**As of Session 11 this workflow changed shape.** Screens are now
**composed** from the proven component kit — never transcribed from Paper
markup. The Paper artboard is the **visual acceptance target**, not a
source to copy. The old `get_jsx` → frame-drop → component-swap →
screenshot-verify flow (Sessions 3–4) is retired; a short "historical"
note at the bottom records how it worked so the change is legible.

**As of Milestone 2 the flow simplified further.** No skeleton-export
step, no `fixtures.ts` mock layer, no `/design-preview/<slug>` route. A
feature's backend is built **before** its frontend session, so the
assembled screen wires straight to real `lib/domain` calls — nothing to
mock. The M2 model: **screenshot the approved Paper artboard → assemble
kit components in the real route to match it → wire to the real domain →
gate with a `*.screen.test.tsx` spec → owner walkthrough.** The Paper
artboard is the standing visual reference (re-screenshot it to diff);
nothing is kept in-repo as a render fixture.

**Read this** before any session whose job is to (a) design a feature's
screens in Paper, (b) build or extend the component kit in
`components/kit/`, or (c) assemble a screen from the kit and wire it to a
real backend. It is referenced from `docs/sdlc.md` Phase 3.1 / 3.2 and
from `CLAUDE.md`'s "Where to look" table.

---

## Core principle

**Paper is the source of truth for WHAT things look like, in every
state** — the visual acceptance target for screens and the design
reference for each kit component's rest + drawn states. One canonical
version of each.

**The component kit (`components/kit/*`) is the source of truth for HOW a
control behaves** — the §9 interaction contract, keyboard, ARIA, focus
management, overlays. Proven once, in Storybook, and reused everywhere
(ADR-42, `TEST_PLAN.md §2a`).

**Code is the source of truth for WHEN each state appears** — it wires
the visuals to real data, real auth, and real orchestration (which
drawer/tab/filter is active, what a submit does).

A screen is **assembled** from `<PageShell>`, `<Drawer>`, `<FormField>`,
`<SimpleTable>`, `<DenseLedger>`, `<Toast>`, `<EmptyState>` /
`<ErrorState>`, `<Tabs>`, `<PillFilter>`, etc., with a thin per-screen
mapper where the kit's prop shape doesn't match the screen's data. It is
then visually diffed against its Paper artboard. **Paper markup is never
copied into a screen file.**

---

## The phases

From Milestone 2 the phases run **in order**: Design → Kit (only if a new
component is needed) → Backend → Frontend assembly → QA. Backend precedes
frontend so the assembled screen wires to real logic directly.

Phases map onto `docs/sdlc.md`'s sprint types:

| Phase | Role / sprint type | Output |
|---|---|---|
| A — Design | Product Designer (Design Sprint) | Approved Paper artboards (every screen + every meaning-bearing state); flow docs; the confirmed new-component list |
| B — Kit | Developer (kit Sprint) — backend-independent; **skipped if no new component** | New `components/kit/*` built + **proven in Storybook** (one story per state, visual-diff + axe + §9 `postVisit` — ADR-42) |
| C1 — Backend | Developer (Development Sprint), per feature | `lib/domain/<module>`, `app/api/*`, tests — before the frontend session |
| C2 — Frontend assembly | Developer (Development Sprint), per feature | Screens **composed** from the kit into `app/**` to match the artboard, wired to the real domain; `*.screen.test.tsx` specs; owner walkthrough |
| D — QA | QA Engineer | Adversarial findings report, then fixes |

---

## PHASE A — DESIGN (in Paper, Product Designer role)

1. Design the feature's screens against `docs/design/design-principles.md`
   and the existing kit. Assemble from approved components; do not invent
   new ones. If a screen genuinely needs something with no kit
   equivalent, **stop and flag it** — it becomes a new kit component with
   its own artboard and states, not a one-off.
2. **Extract-as-you-go.** The first time a component is used, pull it into
   its own component artboard with **all** of its states — default,
   hover, focus, active, disabled, error, as applicable. Every subsequent
   use **reuses** that artboard. Never draw a second, divergent version.
3. **Structurally different screen states get their own artboards** —
   drawer open, sidebar collapsed, empty, error, loading.
4. **Exit criteria:** every screen + every component (states included) +
   every screen-state exists as an artboard, and **no component has two
   divergent versions** anywhere in the file.

Write `docs/design/flows/<feature>-flow.md` at the start of this phase.

---

## PHASE B — KIT (in code, Design Sprint role) — backend-independent

The kit is built and **proven in isolation**, once, so screens can be
assembled from it without re-litigating behaviour.

1. For each component artboard + its state-variant artboards: build
   `components/kit/<name>.tsx` as a real, typed React component.
   - Variants are **props** (`variant="primary" | …`, `size="sm" | …`).
   - **Meaning-bearing states** drawn as artboards (disabled, active tab,
     toggle on/off, chip semantic colours, ledger corrected cell) come
     from those artboards' exact values.
   - **The §9 interaction states** (hover, focus-visible, active,
     disabled, loading, the error row, overlay slide) come from the
     shared `.kit-*` utilities in `app/globals.css` +
     `components/kit/internal/{overlay,roving}.ts` — authored once, not
     per component.
   - Use token CSS variables directly. The only approved raw-hex
     exception is `--color-gold-brand` (masthead).
2. **Prove it in Storybook** (ADR-42): one `*.stories.tsx` per component,
   a named story per state (`Rest`, `Hover`, `FocusVisible`, `Active`,
   `Disabled`, `Loading`, `Error`, `Empty`, plus every `variant × size`).
   The `test-storybook` run gates it: `pnpm test:visual` (story-snapshot
   diff vs the committed baseline) + `pnpm test:a11y` (axe) + `postVisit`
   §9 assertions (real CDP pseudo-states → resolved token check). A
   component that fails any of these cannot merge.
3. **Paper parity** of the committed baselines is a one-time manual audit
   (`docs/design/kit-audit.md` "Paper-parity audit"), not a CI diff.
4. Genuinely interactive primitives (`Drawer`, `Select`, `DatePicker`,
   `Tabs`) carry their full real behaviour here — open/close, keyboard,
   focus-trap, `aria-*`. No data, no feature logic.

Kit-structure changes after this phase go back to a Design Sprint by
default; the exceptions on record are ADR-37 (a/b/c) and ADR-43.

---

## PHASE C1 — BACKEND (Development Sprint, per feature)

`lib/domain/<module>` + `app/api/*` per `CONVENTIONS.md` and `API.md`.
Route handlers: parse → validate (Zod) → check auth/role/ownership → call
`lib/domain/<module>` → standard response shape. **No business logic in
handlers.** Ships its own tests (`sdlc.md` / ADR-31). Done before the
feature's frontend session starts.

## PHASE C2 — FRONTEND ASSEMBLY (Development Sprint, per feature)

### Compose the screen from the kit

1. Start from the feature's Paper artboard as the **visual target** — pull
   it with `get_screenshot` (top-level artboard node, at 2× for detail)
   and `get_computed_styles` for any exact value in doubt. **Never eyeball
   a screenshot for a value.**
2. Write the screen file in `app/**` as a **composition**: a `<PageShell>`
   owning the content region + toolbar slot, then the kit components the
   artboard calls for. The layout scaffold *between* kit components
   (flex/grid containers, gaps) is ordinary Tailwind against the `--sp-*`
   / `--content-max` tokens — there is no Paper markup to preserve.
3. Where a kit component's prop shape doesn't fit the screen's data,
   write a **mapper in the screen file** (a `columns` array for
   `<SimpleTable>`, a `rows` transform for `<DenseLedger>`, a
   label↔value map for `<SegmentedControl>`). **Never change the kit** to
   fit one screen.
4. Empty and error branches use `<EmptyState>` / `<ErrorState>`:
   `<EmptyState variant="filtered">` (with a "Clear filters" action) for a
   table that has data but the current filter matches nothing; plain
   `<EmptyState>` for genuinely-no-records; `<ErrorState>` (with Retry)
   for a fetch failure.
5. Every save / record / correction success fires a `<Toast>` via
   `useToast()`. The route tree is wrapped once in `<ToastProvider>`
   (`placement="top-right"` for admin, `"bottom-center"` for staff).
6. Overlays are the kit `<Drawer>` / `<FrictionDeleteDialog>` etc. — they
   own their own scrim, portal, focus-trap and Esc-restore. **Do not**
   hand-roll a `fixed inset-0 bg-black/30` wrapper around them.

### Wire the data

1. The screen's data comes from a per-feature hook (`use-orders`,
   `use-customers`, …) that owns every fetch. The composed screen is pure
   presentation + orchestration over that hook: `useState` for which
   drawer/tab/filter is active; `onClick` handlers; submit → domain call
   → toast + close + refresh.
2. There is no fixtures import to swap and no `TODO(mock)` marker to
   delete — the hook calls the real domain from the start. Still grep for
   `TODO(mock)` before calling the feature done (`CONVENTIONS.md §4`).
3. **No new UI/UX decisions in this phase.** If a screen needs a state the
   kit + artboards don't cover, **stop and flag it** in `PROGRESS.md` — it
   goes back to a Design Sprint.

### Per-screen gate

For each composed screen, **all** of:

1. **Visual-diff vs the Paper artboard** (rest state) — `get_screenshot`
   the artboard, compare, pull exact values with `get_computed_styles` for
   anything that looks off. If `paper` is unreachable, note it and defer
   the visual check to the owner walkthrough.
2. **Interaction spec** — a `*.screen.test.tsx` under `tests/screens/`
   (jsdom + React Testing Library, the per-feature hook mocked, no server
   / DB). It drives the interactive elements and asserts the kit
   behaviour: drawer opens + Esc restores focus to the opener (WCAG
   2.4.3), toast fires on save, `<EmptyState variant="filtered">` renders
   on an empty filter, `<ErrorState>` on a mocked fetch failure, tab /
   filter switches.
3. **Responsive** — where the screen swaps a mobile card layout for a
   desktop table (`--bp-md`), both match their artboards.
4. **axe** — no serious/critical violations on the rendered screen.
5. **Owner walkthrough** — after the feature's screens are assembled and
   wired, the owner drives it on `pnpm dev` as every role that touches it
   before it is called done (`milestone-2-plan.md §8` guardrail 3).

Global gates (unchanged): `pnpm test` stays green (add screen specs,
don't weaken the unit suite); `pnpm tsc --noEmit` exit 0; `pnpm build`
clean; the kit's `pnpm test:visual` + `pnpm test:a11y` still pass (you
should not be touching `components/kit/*` — if you do, re-run them and
re-baseline only the affected story).

---

## PHASE D — QA (QA Engineer role)

Adversarial pass against the feature's acceptance criteria and its flow
doc. Report findings before fixing anything, unless told otherwise.

---

## Session discipline (per CLAUDE.md's "one role per session")

- The **Phase B kit work**, the **Phase C1 backend**, and the **Phase C2
  screen assembly** are **separate sessions**, even where the role is the
  same (Developer).
- Screen assembly may split across sessions if the screen count is
  large — scope each session to what it can hold in context and still
  gate properly, committing per screen cluster.
- A Design Sprint session does not write real logic. A Development Sprint
  session does not make design decisions. If the boundary is unclear,
  stop and flag it.

---

## Historical: how Sessions 3–4 worked (retired)

Sessions 3–4b built the kit **and the first M1 screens** by `get_jsx`
**transcription** of static Paper artboards:

1. `get_jsx` the full screen artboard (Tailwind format).
2. Drop the Paper artboard frame (`w-[1440px] h-[900px]` root).
3. Swap each span of markup that corresponded to a kit component for the
   kit-component import; keep the surrounding layout scaffold **verbatim**.
4. Lift literal data into `fixtures.ts`; write the skeleton with no
   `useState` / fetch / auth.
5. `get_screenshot`-verify every screen and component against its
   artboard.

This produced pixel-faithful *pictures* of controls with bespoke inline
markup, raw off-scale values, hand-rolled drawers/backdrops, and **no
interaction states** — Paper draws no hover/focus/pressed/loading. Session
9–10d rebuilt the kit properly (tokens, the §9 contract, keyboard, ARIA,
real overlays) and gated it in Storybook; Session 11 recomposed the
shipped Admin screens on top of the proven kit and deleted the
transcribed layer. From Session 11 on, the flow above (compose, don't
transcribe) is the method.

The earlier Sprint 06 failure — 21 screens rebuilt from
`get_computed_styles` reconstruction (with `get_jsx` blocked), all wrong,
all deleted — is why "never eyeball a screenshot for a value" and "pull
exact values with `get_computed_styles`" remain in the per-screen gate
above.
