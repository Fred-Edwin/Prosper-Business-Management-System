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

1. The current sprint file, `docs/sprints/sprint-XX-*.md` — its scope
   and acceptance criteria define what "done" means for this session.
   Check its `Status:` field; don't start work already marked `done`.
2. `docs/CONVENTIONS.md` — naming, folder structure, error shape, the
   correction-entry pattern, the `TODO(mock)` convention.
3. Whichever of `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/SCHEMA.md`
   are relevant to the module being touched.

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
| Current sprint scope/status | `docs/sprints/sprint-XX-*.md` |
| Product-wide UI/UX rules | `docs/design/design-principles.md` |
| Per-feature user flow | `docs/design/flows/*.md` |
| What shipped last, what's blocked | `docs/PROGRESS.md` |
| Process this project follows | `docs/sdlc.md` |

## How sessions work

Each Claude Code session plays one role at a time and does not blend
roles: Product Manager, Software Architect, Tech Lead, Product Designer,
Developer, or QA Engineer, depending on which phase/sprint is active
(see `docs/sdlc.md`). A Development Sprint session does not make design
decisions; a Design Sprint session does not write real logic.

- **Design Sprints** happen in Paper.design, against the approved
  component library (`docs/design/design-principles.md`), assembled
  from existing components rather than inventing new ones. Once
  approved, the screens are assembled directly into their real Next.js
  routes/components, wired with mock data behind the same interface
  real data will eventually use. Every mock source is marked
  `TODO(mock)`.
- **Development Sprints** find every `TODO(mock)` marker in scope and
  replace it with real logic (API calls, database queries, domain
  rules) — without touching the approved UI. No new UI/UX decisions get
  made here; if one is needed, stop and flag it rather than deciding it
  ad hoc — it goes back to a design sprint.
- **QA Sprints** are adversarial: check the feature against its
  acceptance criteria, the approved design, and the flow doc; try to
  break it; report findings before fixing anything, unless told
  otherwise.

No hooks and no saved subagent definitions are used in this project —
that was a deliberate choice, not an oversight. Rely on the written
rules here, each sprint's acceptance criteria, and `docs/TEST_PLAN.md`
instead. (Ad hoc subagent use — e.g. spawning a general-purpose agent
for a one-off search — is fine; there's just nothing pre-configured.)

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
- **`TODO(mock)`** marks a deliberately deferred real implementation
  during a Design Sprint. Must be resolved by the matching Development
  Sprint — grep for it before calling a feature done.

## Updating memory across sessions

At the end of every sprint session: update that sprint file's `Status:`
field, and add an entry to `docs/PROGRESS.md` (what shipped, what's
blocked, what changed from plan). The next session has no memory beyond
what's written down.
