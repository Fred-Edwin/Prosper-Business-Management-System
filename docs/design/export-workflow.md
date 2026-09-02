# Composing a Screen from the Kit

**Status:** Reference for Phase 3.2 (Frontend). Read this before assembling
any screen in `app/**`.

**As of 2026-09 the per-feature Design Sprint and per-feature kit build
are gone.** The component kit in `components/kit/*` is **frozen** — you
compose screens from it, you do not extend it. There is no Storybook
gate, no `test:visual` / `test:a11y` lane, no `fixtures.ts`, no
`/design-preview` route. A Paper mock only enters the picture when the
**owner explicitly hands one over** because they want a shipped screen
changed — and then it is a picture to copy from, nothing more.

The history at the bottom records how the earlier (heavier) workflow
worked, so the change is legible.

---

## Core principle

**The kit (`components/kit/*`) is the source of truth for HOW a control
behaves** — the §9 interaction contract, keyboard, ARIA, focus
management, overlays. Built once, reused everywhere.

**Sibling screens already in `app/**` are the worked examples for HOW a
screen is put together** — the layout scaffold between kit components,
the per-feature hook shape, the empty/error/loading branches. Before
building a new screen, open one or two that do something similar and
follow their structure.

**Code is the source of truth for WHEN each state appears** — it wires
the visuals to real data, real auth, and real orchestration (which
drawer/tab/filter is active, what a submit does).

A screen is **assembled** from `<PageShell>`, `<Drawer>`, `<FormField>`,
`<SimpleTable>`, `<DenseLedger>`, `<Toast>`, `<EmptyState>` /
`<ErrorState>`, `<Tabs>`, `<PillFilter>`, etc., with a thin per-screen
mapper where the kit's prop shape doesn't match the screen's data.

---

## The loop

Phase 3 runs **backend → frontend → check** (see `docs/sdlc.md`):

| Phase | Output |
|---|---|
| 3.1 — Backend | `lib/domain/<module>`, `app/api/*`, tests — before the frontend session |
| 3.2 — Frontend | Screen **composed** from the kit into `app/**`, wired to the real domain through a per-feature hook; a `tests/screens/*.screen.test.tsx` spec |
| 3.3 — Check | In the same session: run it on `pnpm dev` as every role that touches it, try to break it, fix what breaks. Global gates green. |

---

## PHASE 3.2 — Composing the screen

### Structure

1. **Find a sibling.** One or two screens in `app/**` that already do
   something structurally similar (a list with a filter toolbar and a
   detail drawer; a multi-row entry flow; a dense ledger with a
   correction drawer). Match their shape.
2. Write the screen file as a **composition**: a `<PageShell>` owning the
   content region + toolbar slot, then the kit components the screen
   needs. The layout scaffold *between* kit components (flex/grid
   containers, gaps) is ordinary Tailwind against the `--sp-*` /
   `--content-max` tokens.
3. Where a kit component's prop shape doesn't fit the screen's data,
   write a **mapper in the screen file** (a `columns` array for
   `<SimpleTable>`, a `rows` transform for `<DenseLedger>`, a
   label↔value map for `<SegmentedControl>`). **Never change the kit** to
   fit one screen. If several screens end up needing the same mapper,
   that's a signal to raise with the owner — not a licence to edit the
   kit mid-feature.
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
7. Use token CSS variables directly. The only approved raw-hex exception
   is `--color-gold-brand` (masthead).

### Wire the data

1. The screen's data comes from a per-feature hook (`use-orders`,
   `use-customers`, …) that owns every fetch. The composed screen is pure
   presentation + orchestration over that hook: `useState` for which
   drawer/tab/filter is active; `onClick` handlers; submit → domain call
   → toast + close + refresh.
2. No fixtures import to swap, no `TODO(mock)` marker to delete — the
   hook calls the real domain from the start. Still grep for `TODO(mock)`
   before calling the feature done (`CONVENTIONS.md §4`).
3. **If a screen needs a UI pattern the kit doesn't cover, stop and ask
   the owner.** Do not invent a one-off, do not build a new kit
   component unprompted.

### When the owner supplies a Paper mock

Only when the owner has explicitly given you an artboard to match:

1. Pull it with `get_screenshot` (top-level artboard node, at 2× for
   detail). **Never eyeball a screenshot for a value** — pull exact
   numbers with `get_computed_styles`. (Sprint 06 reconstructed 21
   screens by eyeballing computed styles and had to scrap them all.)
2. Compose the screen from the kit to match it — the artboard markup is
   **never** copied into the screen file.
3. If `paper` (the MCP server) is unreachable, say so and defer the
   visual check to the owner walkthrough.

### Per-screen check (Phase 3.3, same session)

For each composed screen:

1. **Interaction spec** — a `*.screen.test.tsx` under `tests/screens/`
   (jsdom + React Testing Library, the per-feature hook mocked, no server
   / DB). Drive the interactive elements and assert kit behaviour: drawer
   opens + Esc restores focus to the opener (WCAG 2.4.3), toast fires on
   save, `<EmptyState variant="filtered">` renders on an empty filter,
   `<ErrorState>` on a mocked fetch failure, tab / filter switches.
2. **Responsive** — where the screen swaps a mobile card layout for a
   desktop table (`--bp-md`), check both.
3. **Owner walkthrough** — the owner drives it on `pnpm dev` as every
   role that touches it before it is called done
   (`milestone-2-plan.md §8` guardrail 3).

Global gates: `pnpm test` stays green (add screen specs, don't weaken the
unit suite); `pnpm typecheck` exit 0; `pnpm build` clean. You should not
be touching `components/kit/*` — if a genuine kit bug forces it, keep the
change minimal and flag it to the owner.

---

## Historical: the earlier workflows (retired)

**Sessions 3–4** built the kit and the first M1 screens by `get_jsx`
**transcription** of static Paper artboards — drop the artboard frame,
swap markup spans for kit imports, lift literal data into `fixtures.ts`.
This produced pixel-faithful *pictures* of controls with bespoke inline
markup and no interaction states. Sessions 9–10d rebuilt the kit properly
(tokens, the §9 contract, keyboard, ARIA, real overlays); Session 11
recomposed the shipped screens on the proven kit and deleted the
transcribed layer.

**Sessions 11 → Milestone 2** ran a five-part per-feature loop: a Design
Sprint producing Paper artboards + a flow doc + a new-component list; a
Kit Sprint building any new `components/kit/*` and **proving it in
Storybook** (one story per state, `test:visual` story-snapshot diff +
`test:a11y` axe + §9 `postVisit` CDP pseudo-state assertions — ADR-42);
then Backend, Frontend assembly, and a standalone adversarial QA Sprint.

**From 2026-09** that ceremony was removed as disproportionate to the
change sizes this project ships. The kit is frozen, features compose from
it against sibling-screen patterns, QA is an in-session pass, and Paper
design is on-request only. The Storybook harness (`.storybook/`, all
`*.stories.tsx`, `tests/visual/__screenshots__/`, the `test:visual` /
`test:a11y` scripts and their dependencies) was deleted. ADR-42 is
superseded — see `docs/DECISIONS.md`.
