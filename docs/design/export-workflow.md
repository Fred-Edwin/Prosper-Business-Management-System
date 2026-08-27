# Paper → Code Export Workflow

**Status:** Binding. This is the required method for turning approved
Paper.design screens and components into code. It replaces the ad hoc
approach used in Sprint 06, which failed (see "Why this exists" below).

**Read this** before any session whose job is to (a) design a feature's
screens in Paper, (b) export the component kit to `components/kit/`, (c)
export screens to `docs/design/screens/<slug>/`, or (d) wire a screen
skeleton to a real backend. It is referenced from `docs/sdlc.md` Phase
3.1 / 3.2 and from `CLAUDE.md`'s "Where to look" table.

---

## Core principle

**Paper is the source of truth for WHAT things look like, in every
state** — screens, components, and structural state-variants (drawer
open, sidebar collapsed, empty, error). One canonical version of each.

**Code is the source of truth for WHEN each state appears** — it wires
the visuals to real data, real auth, and real orchestration (which
drawer/tab/filter is active, what a submit does).

Neither side reconstructs the other's job. The export step **translates**
Paper's markup into codebase conventions and **swaps** kit-component
spans for kit-component imports. It does not re-draw, re-derive, or
approximate anything.

---

## Why this exists (the Sprint 06 failure)

Sprint 06 exported 21 screens by having the agent read raw
`get_computed_styles` values off each Paper node and hand-rebuild the
screen from a hand-built component kit that only *approximated* the Paper
components. `get_jsx` was blocked for that session, and the fallback —
"eyeball the computed styles and reconstruct" — produced 21 screens that
did not match Paper: cramped spacing, wrong table structure, wrong
heading scale, a card grid where Paper had a full-width table. All 21
were deleted.

One screen (`admin-catalog-product-catalog`) was then re-exported the
right way — `get_jsx`, kit-component swap, screenshot-verified against
its artboard — and confirmed to match. That screen is the reference for
"done right." Look at
`docs/design/screens/admin-catalog-product-catalog/page.tsx` and its
`mock-data.ts` before starting any export.

**The three rules Sprint 06 broke, that this doc enforces:**

1. **Use `get_jsx`, not `get_computed_styles` reconstruction.** `get_jsx`
   (Tailwind format) is the required extraction tool for both components
   and screens. `get_computed_styles` / `get_node_info` are for spot
   confirmation of a single value, not for rebuilding a subtree.
2. **Swap, don't reconstruct.** Replace each span of Paper markup that
   corresponds to a kit component with the kit component import. The
   layout scaffold *around* the components stays verbatim from `get_jsx`.
3. **Screenshot-verify every screen and every component against its
   Paper artboard** before calling the export done. This is a mandatory
   gate, not optional polish.

### If `get_jsx` is blocked again

The Sprint 06 sessions hit an auto-mode classifier that intermittently
blocked `get_jsx` and `get_font_family_info`. If this recurs:

- **Do not fall back to reconstruction-from-computed-styles.** That is
  the exact failure this workflow exists to prevent.
- Retry `get_jsx` on a smaller subtree (a single component artboard, or
  one section of a screen at a time).
- If it stays blocked for a whole session, **stop and flag it** — the
  export waits for a session where `get_jsx` works. A blocked tool is a
  blocker, not a licence to approximate.

---

## The four phases

Backend and frontend implementation (Phase C) can happen in either
order — the fixtures file decouples them. Do not force backend-first.

Phases A–D map onto `docs/sdlc.md`'s sprint types:

| Phase | Role / sprint type | Output |
|---|---|---|
| A — Design | Product Designer (Design Sprint) | Approved Paper artboards: every screen, every component with states, every screen-state |
| B — Export | Developer (Design Sprint) — backend-independent | `components/kit/*`, `docs/design/screens/<slug>/*`, `/design-preview` routes |
| C — Implementation | Developer (Development Sprint), per feature | `lib/domain/<module>`, `app/api/*`, real `app/**` routes, fixtures swapped for real calls |
| D — QA | QA Engineer | Adversarial findings report, then fixes |

**Phase B is split across at least two separate sessions** — kit export
first (verified), then screen export. Do not do both in one session.
Sprint 06 ran out of context trying to. See "Session discipline" below.

---

## PHASE A — DESIGN (in Paper, Product Designer role)

1. Design the feature's screens against `docs/design/design-principles.md`
   and the existing kit. Assemble from approved components; do not invent
   new ones. If a screen genuinely needs something with no kit
   equivalent, stop and flag it — it becomes a new kit component with its
   own artboard and states, not a one-off.
2. **Extract-as-you-go.** The first time a component is used (table, nav,
   button, chip, drawer, etc.), pull it into its own component artboard
   with **all** of its states — default, hover, focus, active, disabled,
   error, as applicable. Every subsequent use **reuses** that artboard.
   Never draw a second, divergent version of a component.
3. **Structurally different screen states get their own artboards** —
   drawer open, sidebar collapsed, empty, error, loading. A screen-state
   is a different artboard, not a note on the base screen.
4. **Exit criteria:** every screen + every component (states included) +
   every screen-state exists as an artboard, and **no component has two
   divergent versions** anywhere in the file.

Write `docs/design/flows/<feature>-flow.md` at the start of this phase
(per `sdlc.md` 3.1 — flows are written per-feature, not upfront).

---

## PHASE B — EXPORT (in code, Design Sprint role) — backend-independent

### B1. Component kit — its own session

For **every** component artboard **and each of its state-variant
artboards**:

1. `get_jsx` the artboard (Tailwind format).
2. Write `components/kit/<name>.tsx` as a real, typed React component:
   - Variants are **props** (`variant="primary" | "secondary" | …`).
   - **Meaning-bearing states** (disabled, active tab, toggle on/off,
     friction-dialog pending/confirmed, chip semantic colors, ledger
     signed deltas) are encoded from the **state artboards** — pull them
     with `get_jsx` the same as the base state. Never improvise these.
   - **Purely decorative interaction states Paper never drew** (a hover
     shift, a focus ring that has no dedicated artboard) are the *one*
     thing built from the house rule instead of fetched: hover = subtle
     shift or `--color-accent-hover` where defined; focus = 2px accent
     ring; disabled = reduced opacity, no pointer events. Check the
     artboard first — only treat a state as decorative if Paper truly
     doesn't show it.
   - Use token CSS variables directly (`var(--color-accent)`,
     `text-(--nav-text)`, …). Never re-derive to raw hex/px.
3. **Genuinely interactive primitives** (Drawer, Tabs, Select,
   BottomSheet) get minimal real behavior here: open/close, keyboard
   handling, focus management. No data, no feature logic.
4. **Extraction order:** primitives before composites — Buttons → Form
   Controls → Chips & Status → Tables → Tabs & Filters → Drawers &
   Dialogs → Stat Tiles & KPI → Banners & Cards → Bulk Entry Grid →
   Utility & Layout → Bottom Sheet → shells last.

### B2. Screens — a separate session (or sessions) from B1

For each screen artboard:

1. `get_jsx` the **full screen artboard**.
2. **Drop the Paper artboard frame.** Paper emits a fixed-size root
   (e.g. `w-[1440px] h-[900px]`). Remove it so the screen **fills the
   viewport**: `w-full min-h-screen`, fixed-width sidebar, body `flex-1`.
   It must render identically on a 1440 laptop and a 1920 monitor.
   *(The reference screen still carries `w-[1440px] h-[900px]` on its
   root — that is a known deviation to normalize when it's re-exported,
   not a pattern to copy. New screens fill the viewport.)*
3. **Swap every span of markup that corresponds to a kit component for
   the kit component import.** The layout scaffold around the components
   — flex containers, page structure, spacing, gaps — stays **verbatim**
   from `get_jsx`. Do not restructure it, do not "tidy" it.
4. **Lift literal data** (names, prices, dates, quantities, counts, tab
   labels, placeholder text) into `docs/design/screens/<slug>/fixtures.ts`,
   marked `TODO(mock)` per `CONVENTIONS.md` §4. Extract values verbatim
   from the artboard — never invent plausible-looking data.
5. Write `docs/design/screens/<slug>/page.tsx` as a **static skeleton**:
   no `useState` beyond what is cosmetically unavoidable, no fetches, no
   auth, no orchestration.

### B3. Screen-state artboards (drawer-open, sidebar-collapsed, empty, …)

Exported the same way — either as their own skeletons under
`docs/design/screens/<slug>-<state>/`, or as components if they are
sub-parts of another screen (a drawer body that the real screen will
mount conditionally).

### B4. Preview routes

- One thin `app/design-preview/<slug>/page.tsx` per screen that imports
  and renders the skeleton.
- One `app/design-preview/_kit/page.tsx` showing **every kit component in
  every state**, for side-by-side comparison with the kit artboards.
- Keep `app/design-preview/layout.tsx`'s `SCREENS` list in sync.

### B5. Screenshot-verify — the mandatory gate

Screenshot-compare **every** screen and **every** component against its
Paper artboard (`get_screenshot` on the top-level artboard — never an
inner frame, per `paper-workflow-lessons.md` §4). Flag every mismatch.
**Do not ship a silent approximation.** This is the step Sprint 06
skipped; it is not optional and not "spot-check a sample."

---

## PHASE C — IMPLEMENTATION (in code, Development Sprint role, per feature)

Backend and frontend in **either order** — `fixtures.ts` decouples them.

1. **Backend:** `lib/domain/<module>` + `app/api/*` per `CONVENTIONS.md`
   and `API.md`. Route handlers: parse → validate (Zod) → check
   auth/role/ownership → call `lib/domain/<module>` → standard response
   shape. **No business logic in handlers.**
2. **Frontend:** move the screen skeleton from
   `docs/design/screens/<slug>/` to its real `app/**` route. Import the
   sibling screens/drawers the feature needs (now components). Wire
   orchestration: `useState` for which drawer/tab/filter is active;
   `onClick` handlers; form submit → domain call → close + refresh.
3. Swap the `fixtures.ts` import for real `lib/domain` calls and
   **delete the `TODO(mock)` markers**. Grep for `TODO(mock)` before
   calling the feature done (`CONVENTIONS.md` §4).
4. **The `/design-preview/<slug>` route stays**, still importing
   `fixtures.ts`, as the permanent visual-regression reference. Do not
   delete it when the real route lands.
5. **No new UI/UX decisions in this phase.** If one is needed, stop and
   flag it — it goes back to a Design Sprint (`sdlc.md` 3.2).

---

## PHASE D — QA (QA Engineer role)

Adversarial pass against the feature's acceptance criteria and its flow
doc. Report findings before fixing anything, unless told otherwise
(`CLAUDE.md`).

---

## The fixtures file

`docs/design/screens/<slug>/fixtures.ts` is **not a phase and not a data
layer.** It is a ~20-line file per screen, written once during Phase B,
that:

- holds that screen's literal data, lifted verbatim from the artboard;
- doubles as the render fixture for `/design-preview/<slug>`;
- carries a `TODO(mock)` marker until Phase C swaps it out;
- **stays forever** as the design-preview / visual-regression fixture,
  even after the real route is wired.

### Naming

New work uses `fixtures.ts`. The existing reference screen
(`admin-catalog-product-catalog`) still uses `mock-data.ts` — that
inconsistency is for the screen-export session to normalize when it
re-exports, **not** something to rename in isolation.

---

## Session discipline (per CLAUDE.md's "one role per session")

- The **Phase B kit export** and the **Phase B screen export** are
  **separate sessions**, even though both are Developer / Design-Sprint
  role. Sprint 06 ran out of context doing too much at once. Kit first,
  verified against artboards, *then* screens.
- Screen export itself may need to split across sessions if the screen
  count is large — scope each session to what it can hold in context and
  still verify properly.
- A Design Sprint session does not write real logic. A Development Sprint
  session does not make design decisions. If the boundary is unclear,
  stop and flag it.
