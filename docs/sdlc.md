# Solo Developer Software Product Lifecycle

**Stack:** Claude Code (VS Code) · Paper.design · Next.js · Docker · Vercel (frontend) · DigitalOcean Droplet (backend)

**Core principle:** Coordination overhead that exists to sync separate humans is removed. Documentation that gives agents (and future you) reliable context is not — it becomes *more* important, since it's the only long-term memory the process has.

---

## Table of Contents

1. [Phase 0 — Discovery](#phase-0--discovery)
2. [Phase 1 — Planning](#phase-1--planning)
3. [Phase 2 — Design System Foundation](#phase-2--design-system-foundation-done-once-at-project-start)
4. [Phase 3 — The Feature Loop (Backend → Frontend → Check)](#phase-3--the-feature-loop-backend--frontend--check)
5. [Phase 4 — Ship](#phase-4--ship)
6. [Phase 5 — Monitor & Iterate](#phase-5--monitor--iterate)
7. [Codebase Structure](#codebase-structure)
8. [Document Index Reference](#document-index-reference)

---

## Phase 0 — Discovery

**Goal:** Capture everything known about the problem before any technical decision is made.

**Trigger:** Either a client conversation, or a self-initiated product idea.

**Process:**
- **Client project:** Meet, discuss their business and workflow, then brain-dump everything learned into `docs/discovery.md`.
- **Self-initiated project:** Skip the client conversation; write `docs/requirements.md` directly, covering the same ground — what's being built, for whom, and why.

**Output:** One file — `discovery.md` or `requirements.md` — unpolished is fine. This is raw input, not a deliverable. Its only job is to give Phase 1 something real to work from.

---

## Phase 1 — Planning

Three sequential Claude Code sessions, each with the agent playing a distinct expert role. Each session's output becomes the next session's input. **Do not fuse these roles into one session** — sequencing forces each judgment call to happen against settled prior decisions, not simultaneously with them.

### Session 1 — Product Manager Role: Alignment & PRD

**Agent role:** Product Manager.

**Input:** `discovery.md` or `requirements.md`.

**Process:** This session runs in three stages, in order:
1. **Align:** the agent reiterates its understanding of what's being built, in its own words, to surface misreadings early, and actively grills the user with clarifying questions on anything ambiguous, missing, or contradictory in the input document — continuing until both agent and user are genuinely aligned on every detail the build depends on.
2. **Outline the PRD:** once aligned, the agent lists every section the PRD will contain (scope, user stories, functional requirements, non-functional requirements, out-of-scope items, etc.) as a table of contents, with no content written yet, and waits for approval of the outline itself.
3. **Walk through and write, section by section:** the agent goes through the approved outline one section at a time, drafting that section's content and waiting for explicit approval before moving to the next. Only once every section is approved does the full `PRD.md` get assembled and written.

This ensures the PRD reflects exactly what was reviewed and approved, section by section, rather than being produced in one pass and reviewed only after the fact.

**Output:** `docs/PRD.md` — a complete Product Requirements Document covering scope, user stories, functional and non-functional requirements, and explicit out-of-scope items.

> **Why this matters:** An agent that silently fills gaps with assumptions is the single most common cause of agentic development producing confidently wrong output. This session exists to eliminate that failure mode before a single architectural decision is made.

### Session 2 — Software Architect Role: Technical Foundation

**Agent role:** Software Architect.

**Input:** `PRD.md`.

**Process:** This session runs in three stages, in order: **(1) outline** every category and specific decision the project needs — no decisions made yet, just a table of contents; **(2) walk through the outline decision by decision**, with the agent stating its recommendation and reasoning for each and waiting for explicit approval before moving to the next; **(3) write the files**, only once every decision has been approved, reflecting exactly what was agreed rather than introducing anything new at write-time. This structure exists specifically so every non-trivial decision is seen and approved individually — not filtered through the agent's own judgment of what's "worth" flagging. The agent defaults to current industry-standard choices, not novelty, and for genuine tradeoffs with no clearly-better answer, says so explicitly rather than deciding silently.

**Output (all in `docs/`):**
- `ARCHITECTURE.md` — system shape and major components
- `API.md` — API contract
- `SCHEMA.md` — data model
- `DECISIONS.md` — decision log with reasoning (ADR-style)
- `CONVENTIONS.md` — naming, folder structure, error-handling patterns, and the `TODO(mock):` convention used to mark deferred real implementations
- `TEST_PLAN.md` — **strategy only** at this stage (what needs E2E vs. unit coverage, and why) — not detailed test cases, which are written per-sprint against real code

### Session 3 — Tech Lead / Scrum Master Role: Roadmap & Sprints

**Agent role:** Tech Lead / Scrum Master.

**Input:** `PRD.md` + all Session 2 outputs. Architecture must be settled before this session — sprint sequencing depends on it.

**Process:** This session runs in three stages, in order:
1. **Outline the roadmap:** the agent proposes the full sequence of features/epics, in order, with brief reasoning for the sequencing (what depends on what) — no sprint files written yet. This is reviewed and approved as a whole first.
2. **Walk through and break down sprints, one feature/epic at a time:** for each item in the approved roadmap, the agent breaks it into the build loop — **backend → frontend → check** (see [Phase 3](#phase-3--the-feature-loop-backend--frontend--check)) — proposing each sprint's scope and acceptance criteria, and waiting for approval before moving to the next feature/epic. A small feature is one sprint; a large one splits its backend and/or frontend across sessions. There is **no mandatory Design Sprint** — design happens only when the owner explicitly asks for a Paper mock (see Phase 3).
3. **Write the files:** only once a feature/epic's sprint breakdown is approved does its corresponding set of `docs/sprints/sprint-XX-name.md` files get written, one per sprint, clearly labeled by scope in the filename or a `type:` field. `ROADMAP.md` is written once the full roadmap outline from stage 1 is approved.

Sprint sizing rule: **a sprint is scoped to what one agent session can hold fully in context while remaining coherent — not a calendar unit.** A large feature's backend or frontend may itself split across several sessions (mini-epic). Every sprint that writes code must include its own tests as part of its definition of done.

**Output:**
- `docs/ROADMAP.md` — the full feature roadmap
- `docs/sprints/sprint-XX-name.md` — one file per sprint, labeled by scope, with scope, acceptance criteria, and status — written incrementally as each feature/epic's breakdown is approved, not all at once

### Session 3.5 — Repository & Git Setup

**Process:** Set up the codebase structure (see [Codebase Structure](#codebase-structure) below), initialize Git, make the first commit, establish branch strategy. This happens as the **last step of planning**, before any design or development sprint begins — so every subsequent session works inside a version-controlled repo from the start.

---

## Phase 2 — Design System Foundation (done once, at project start)

**Goal:** Establish the product's design philosophy and full component library **once**, so every feature inherits consistent rules instead of each one quietly inventing its own.

**Status for this project:** complete. The principles are in `docs/design/design-principles.md`; the component kit is built and frozen in `components/kit/*`. Feature work **composes from this kit** and does not extend it. If a feature genuinely needs a pattern the kit has no answer for, that is an owner decision — stop and ask.

**What was produced:**
- `docs/design/design-principles.md` — the *why and when*: written UI/UX rules (§9 is an enforced interaction contract), and the "AI slop" anti-patterns to avoid (gradient overlays, rounded-everything, >2–3 font weights doing real work, decorative icons, centered-hero layouts).
- `components/kit/*` — the reusable, typed React components. `docs/design/kit-audit.md` and `docs/design/component-states.md` describe what each one does and its states.

---

## Phase 3 — The Feature Loop (Backend → Frontend → Check)

Every feature moves through this loop, one feature at a time. **No skipping ahead to build everything before testing anything.**

### 3.1 — Backend

**Process:** Build `lib/domain/<module>` + `app/api/*` + tests, per `CONVENTIONS.md` and `API.md`. Route handlers stay thin: parse → validate (Zod) → check auth/role/ownership → call the domain → standard response shape. **No business logic in handlers.** Use Plan Mode before non-trivial work.

**Output:** Working, committed backend with its own tests.

### 3.2 — Frontend

**Process:** **Compose** the screen from the frozen kit into the real `app/**` route, following the structure of a **sibling screen** that already does something similar (same layout scaffold, same kit components, same per-feature-hook shape). Where a kit component's prop shape doesn't fit the data, write a thin mapper **in the screen file** (a `columns` array for `<SimpleTable>`, a `rows` transform for `<DenseLedger>`, etc.) — **never change the kit**. Wire the screen to the real `lib/domain` calls through a per-feature hook (`use-<feature>`). There is no `fixtures.ts` and no `/design-preview` route.

**Design is not part of this step.** The kit exists and sibling screens show the patterns; an agent reasons from those directly. A Paper mock enters the loop **only when the owner explicitly asks for one** — because they saw a shipped screen and want it changed. Then the artboard is a **visual reference to copy from** (`get_screenshot` the top-level artboard; `get_computed_styles` for any exact value in doubt — never eyeball a screenshot for a number, per the Sprint 06 scrap), not a gate. If a screen needs a UI pattern the kit doesn't cover, **stop and ask the owner** — don't invent one, don't build a new kit component unprompted.

Write `docs/design/flows/<feature>-flow.md` only if the feature's interaction is complex enough that a written flow helps; a simple screen doesn't need one.

**Output:** Working, committed screen wired to the real domain, plus a jsdom + RTL spec under `tests/screens/` for the interactive parts.

### 3.3 — Check (same session as the frontend)

**Process:** Run the feature on `pnpm dev` and drive it as **every role that touches it** — try edge cases, try to break it, fix what breaks. This replaces the old separate QA Sprint: it is a lightweight adversarial pass folded into the build session, not a standalone ceremony. Grep for any stray `TODO(mock)`. Keep `pnpm test` + `pnpm typecheck` + `pnpm build` green.

A dedicated QA pass still happens **on request** — before a milestone ships, or on a feature the owner flags as risky.

**Output:** A feature that works, verified by the person who built it, with findings (if any) noted in `PROGRESS.md`.

### Repeat

Backend → Frontend → Check, once per feature, until the roadmap is complete.

---

## Phase 4 — Ship

**Process:**
- Dockerize the application for consistency across local, staging, and production environments
- Deploy frontend (Next.js) to **Vercel**
- Deploy backend to a **DigitalOcean Droplet**
- Minimal CI/CD via GitHub Actions — lint, test, and deploy on merge, even at solo scale

**Output:** A live, deployed product.

---

## Phase 5 — Monitor & Iterate

**Process:**
- Lightweight analytics (e.g., Vercel Analytics or Plausible) and error tracking (e.g., Sentry's free tier) — no need for enterprise-scale tooling at this size
- Real usage data feeds back into `requirements.md`/the backlog for the next cycle

This closes the loop: Phase 5 findings become new input to Phase 0/1 for the next feature set or version.

---

## Codebase Structure

```
project-root/
├── CLAUDE.md                          # Always-loaded agent memory — short, high-signal.
│                                       # Points to docs rather than duplicating them.
├── docs/
│   ├── discovery.md / requirements.md
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── SCHEMA.md
│   ├── DECISIONS.md
│   ├── CONVENTIONS.md
│   ├── TEST_PLAN.md
│   ├── ROADMAP.md
│   ├── PROGRESS.md                    # Running status log — updated at end of each sprint
│   ├── design/
│   │   ├── design-principles.md
│   │   └── flows/
│   │       ├── feature-x-flow.md      # written per-feature, not upfront
│   │       └── feature-y-flow.md
│   └── sprints/
│       ├── sprint-01-auth.md
│       ├── sprint-02-reservations-data.md
│       └── ...                        # one file per sprint: scope, acceptance criteria, status
├── .claude/
│   ├── agents/                        # subagent definitions (explore, reviewer, QA) — version-controlled
│   └── hooks/                         # e.g., run tests before Stop, lint on PostToolUse
├── apps/
│   └── web/                           # Next.js app — deployed to Vercel
│       ├── app/
│       ├── components/
│       └── ...
├── server/                            # Backend service — deployed to DigitalOcean Droplet
│   ├── src/
│   └── Dockerfile
├── packages/
│   └── shared/                        # Shared types/schema between web and server
├── docker-compose.yml                 # Local dev environment
└── .github/workflows/                 # CI: lint, test, deploy
```

**Structural reasoning:**

- **`CLAUDE.md` stays short.** It auto-loads every session, so it should summarize and point (`"For the data model, see docs/SCHEMA.md"`), not contain full documents. A bloated always-loaded file wastes context budget on every single session, whether or not that session needs it.
- **One file per sprint**, not one giant roadmap file — a development sprint session should load only its own sprint file plus the relevant shared docs, keeping context tight and relevant to the task at hand.
- **`apps/web` and `server` are cleanly separated**, mirroring the actual Vercel/Droplet deployment split — an agent working a backend ticket won't wander into frontend code, and Docker/CI configs stay unambiguous about what deploys where.
- **`.claude/agents/` and `.claude/hooks/` are committed to the repo**, not left in global config only. Agent configuration is a project asset — it should travel with the codebase on a fresh clone, not be silently missing.
- **`docs/PROGRESS.md`** is a running log, updated at the end of every sprint session, noting what shipped, what's blocked, and what changed from plan. This substitutes for the status visibility a PM or Scrum Master provides by default on a real team — without it, "where did I leave off" has no reliable answer across sessions spaced days apart.

---

## Document Index Reference

| Document | Written In | Purpose |
|---|---|---|
| `discovery.md` / `requirements.md` | Phase 0 | Raw input — what's being built and why |
| `PRD.md` | Phase 1, Session 1 | Complete scope and requirements |
| `ARCHITECTURE.md` | Phase 1, Session 2 | System shape and major components |
| `API.md` | Phase 1, Session 2 | API contract |
| `SCHEMA.md` | Phase 1, Session 2 | Data model |
| `DECISIONS.md` | Phase 1, Session 2 | Decision log with reasoning |
| `CONVENTIONS.md` | Phase 1, Session 2 | Naming, structure, error-handling patterns |
| `TEST_PLAN.md` | Phase 1, Session 2 | Testing strategy (not detailed cases) |
| `ROADMAP.md` | Phase 1, Session 3 | Full feature roadmap |
| `sprints/sprint-XX-[name].md` | Phase 1, Session 3 (per sprint) | Sprint scope, acceptance criteria, status |
| `design-principles.md` | Phase 2 | Product-wide UI/UX rules and anti-patterns |
| `components/kit/*` | Phase 2 | The frozen component kit — composed from, not extended, in feature work |
| `design/export-workflow.md` | Applied every Phase 3.2 | How to compose a screen from the kit: sibling-screen structure, mapper in the screen file, never fork the kit; how to copy from a Paper mock on the rare occasions the owner supplies one |
| `design/flows/feature-name-flow.md` | Phase 3.2 (only if the flow is complex) | User flow for that specific feature |
| `PROGRESS.md` | Ongoing, updated per sprint | Running status log — full detail for the current milestone only; older entries compressed to a one-line ledger |
| `sprints/milestone-XX-plan.md` | One per milestone | The living plan for that milestone: scope, cross-cutting contracts, session sequence (re-baselined as it changes), guardrails |

---

## Notes on this project's shape (deviations from the generic structure above)

- **Single Next.js app**, not the `apps/web` + `server` split drawn in
  the Codebase Structure diagram — modular monolith on Vercel
  (`ARCHITECTURE.md` ADR-2/6/8). `lib/domain/<module>` is the business
  layer; `app/api/*` handlers stay thin.
- **No `.claude/agents/` or `.claude/hooks/`** — a deliberate choice
  (`CLAUDE.md`). Rely on the written rules, each sprint's acceptance
  criteria, and `TEST_PLAN.md`. Ad hoc subagent use is fine.
- **Streamlined feature loop (from 2026-09).** The earlier per-feature
  ceremony — a mandatory Design Sprint in Paper, a per-feature kit
  extension, Storybook story-per-state with visual-regression + a11y
  gates (ADR-42), and a standalone QA Sprint — was removed as too slow
  for the change sizes this project actually ships. The kit is frozen;
  features compose from it against sibling-screen patterns; QA is a
  lightweight in-session pass; Paper design is on-request only. The
  Storybook harness and its `test:visual` / `test:a11y` lanes were
  deleted. ADR-42 is superseded (see `DECISIONS.md`).
- **One plan file per milestone** (`sprints/milestone-XX-plan.md`),
  updated as the milestone runs — not one file per session. Per-session
  handoff docs are not kept after the session's PROGRESS entry is
  written.
- **Prompt templates** for each session type were removed from this doc
  once the process was internalised; the per-milestone plan file carries
  the concrete session scopes instead.

