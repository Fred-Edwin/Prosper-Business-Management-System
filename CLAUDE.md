# Prosper — Agent Memory

Mobile-first business management system for a food business (Restaurant,
Canteen, Store). Single Next.js (App Router, TypeScript) app — no
separate backend service. See `docs/ARCHITECTURE.md` (ADR-2, ADR-6,
ADR-8) for why: modular monolith, deployed entirely to Vercel.

Built solo, entirely by agent-driven sessions (see `docs/sdlc.md`). There
is no human collaborator carrying context between sessions — these docs
are the only continuity the project has. A session that skips reading
them is working blind, not saving time.

## Before making any code change, read — in this order

1. The current milestone plan, `docs/sprints/milestone-XX-plan.md` — its
   scope, cross-cutting contracts, and session sequence define what
   "done" means. If a per-session handoff exists
   (`docs/sprints/milestone-XX-session-N-handoff.md`), read that too.
   Check the plan's session table; don't start work already marked done.
2. `docs/CONVENTIONS.md` — naming, folder structure, error shape, the
   correction-entry pattern, the `TODO(mock)` convention, and §6 working
   practices (lessons carried forward).
3. Whichever of `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/SCHEMA.md`
   are relevant to the module being touched.
4. For any screen work: one or two **sibling screens** already in
   `app/**` that do something similar — copy their structure, their kit
   usage, and their per-feature hook shape. The kit in `components/kit/*`
   is the frozen vocabulary; sibling screens are the worked examples.

This is a hard requirement, not a suggestion — skip it and you will
silently reinvent a convention that already exists, or contradict one.

## Where to look

| Question | See |
|---|---|
| What are we building, for whom? | `docs/PRD.md` |
| System shape, deployment | `docs/ARCHITECTURE.md` |
| API contract | `docs/API.md` |
| Data model | `docs/SCHEMA.md` |
| Why a decision was made | `docs/DECISIONS.md` (ADR-style) |
| Naming, folder structure, error shape, correction pattern | `docs/CONVENTIONS.md` |
| Testing strategy | `docs/TEST_PLAN.md` |
| Feature sequencing, milestones | `docs/ROADMAP.md` |
| Current milestone plan + session sequence | `docs/sprints/milestone-XX-plan.md` (+ any `…-session-N-handoff.md`) |
| Product-wide UI/UX rules | `docs/design/design-principles.md` (§9 is an ENFORCED contract) |
| What each kit component does + its state matrix | `docs/design/kit-audit.md`, `docs/design/component-states.md` |
| How to compose a screen from the kit (mapper in the screen file, never fork the kit) | `docs/design/export-workflow.md` |
| Per-feature user flow (where one exists) | `docs/design/flows/*.md` |
| What shipped last, what's blocked (full detail = current milestone; older = ledger) | `docs/PROGRESS.md` |
| Process this project follows | `docs/sdlc.md` |

## How sessions work

The build loop is **backend → frontend → check**, usually one or two
sessions per feature (see `docs/sdlc.md` Phase 3):

- **Backend.** `lib/domain/<module>` + `app/api/*` + tests, per
  `CONVENTIONS.md` / `API.md`. Route handlers stay thin: parse →
  validate (Zod) → check auth/role/ownership → call the domain → standard
  response shape.
- **Frontend.** **Compose** the screen from the frozen kit
  (`<PageShell>`, `<Drawer>`, `<FormField>`, `<SimpleTable>`, `<Toast>`,
  `<EmptyState>`/`<ErrorState>`, `<Tabs>`, `<PillFilter>`, …) into the
  real Next.js route, following the structure of a **sibling screen**
  that already does something similar. Where a kit component's prop shape
  doesn't fit the data, write a thin mapper **in the screen file** —
  never change the kit. Wire to the real domain through a per-feature
  hook (`use-<feature>`). No fixtures, no `/design-preview`.
- **Check.** In the same session: run it on `pnpm dev`, drive it as
  every role that touches it, try to break it, fix what breaks. Add a
  jsdom + RTL screen spec under `tests/screens/` for the interactive
  bits. Keep `pnpm test` + `pnpm typecheck` + `pnpm build` green.

**Design in Paper is not a step in this loop.** The kit already exists
and sibling screens show the patterns. A Paper design happens **only
when the owner explicitly asks** for one — because they looked at a
shipped screen and want it changed. In that case the Paper artboard is a
**visual reference to copy from**, not a gate or a prerequisite. If a
feature genuinely needs a UI pattern the kit has no answer for, **stop
and ask the owner** rather than inventing one or building a new kit
component unprompted.

No hooks and no saved subagent definitions are used in this project —
that was a deliberate choice, not an oversight. Rely on the written
rules here, each sprint's acceptance criteria, and `docs/TEST_PLAN.md`
instead. (Ad hoc subagent use — e.g. spawning a general-purpose agent
for a one-off search — is fine; there's just nothing pre-configured.)

## Package manager

Use **pnpm** for all install/run/script commands in this repo (`pnpm
install`, `pnpm dev`, `pnpm test`, etc.) — never `npm` or `yarn`.

## Non-negotiable rules (see CONVENTIONS.md / ARCHITECTURE.md for full detail)

- **Ledgers, not stored totals.** Stock and money balances are always
  derived by summing append-only rows, never a mutable stored number.
- **Corrections are new rows, never overwrites.** Only the Admin may
  correct a record dated to an already-closed day; staff edit their own
  same-day entries directly before close.
- **`app/api/*` route handlers contain no business logic.** Parse →
  validate (Zod) → check auth/role/ownership → call `lib/domain/<module>`
  → return standard response shape.
- **Money is always `NUMERIC`/`Decimal`.** Never floating-point.
- **Day boundaries use the fixed `Africa/Nairobi` constant** (`lib/time`),
  never server-local time.
- **`TODO(mock)`** marks a deliberately deferred real implementation.
  Grep for it before calling a feature done — none may remain.

## Visible progress during a session

The user wants to see progress as it happens during multi-step work
(implementing a sprint, migrating a schema, working through a checklist of
fixes) — not just a summary at the end.

- If the `TodoWrite` tool is available in this session, use it — mark each
  item in-progress/completed as you actually do the work, not in a batch
  afterward.
- If `TodoWrite` is not available in this session's toolset, reproduce the
  same effect manually: post a markdown checklist (`- [ ]` / `- [x]`) of
  the concrete steps before starting, then re-post the updated checklist
  after completing each step (not just at the end) so progress is visible
  in real time. Keep it short and concrete — one line per real step, no
  vague entries like "make progress."
- Either way, this is not optional busywork — it's how the user tracks
  where a session is without reading the whole transcript. Don't skip it
  for "small" multi-step tasks; a 4-step task still benefits from a
  4-item checklist.

## Updating memory across sessions

At the end of every sprint session: update the current milestone plan's
session table (`docs/sprints/milestone-XX-plan.md §7`), and add an entry
to `docs/PROGRESS.md` (what shipped, what's blocked, what changed from
plan). If sequencing changed, re-baseline that table and add one line to
the plan's changelog — never stack `> UPDATED` blocks. The next session
has no memory beyond what's written down.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
