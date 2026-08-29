# Solo Developer Software Product Lifecycle

**Stack:** Claude Code (VS Code) · Paper.design · Next.js · Docker · Vercel (frontend) · DigitalOcean Droplet (backend)

**Core principle:** Coordination overhead that exists to sync separate humans is removed. Documentation that gives agents (and future you) reliable context is not — it becomes *more* important, since it's the only long-term memory the process has.

---

## Table of Contents

1. [Phase 0 — Discovery](#phase-0--discovery)
2. [Phase 1 — Planning](#phase-1--planning)
3. [Phase 2 — Design System Foundation](#phase-2--design-system-foundation)
4. [Phase 3 — The Feature Loop (Design → Development → QA)](#phase-3--the-feature-loop-design--development--qa)
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
- `CONVENTIONS.md` — naming, folder structure, error-handling patterns, and the `TODO(mock):` convention used to mark mock data during design sprints (see Phase 3.1)
- `TEST_PLAN.md` — **strategy only** at this stage (what needs E2E vs. unit coverage, and why) — not detailed test cases, which are written per-sprint against real code

### Session 3 — Tech Lead / Scrum Master Role: Roadmap & Sprints

**Agent role:** Tech Lead / Scrum Master.

**Input:** `PRD.md` + all Session 2 outputs. Architecture must be settled before this session — sprint sequencing depends on it.

**Process:** This session runs in three stages, in order:
1. **Outline the roadmap:** the agent proposes the full sequence of features/epics, in order, with brief reasoning for the sequencing (what depends on what) — no sprint files written yet. This is reviewed and approved as a whole first.
2. **Walk through and break down sprints, one feature/epic at a time:** for each item in the approved roadmap, the agent breaks it into the mandatory per-feature loop — **one Design Sprint, one or more Development Sprints, and one QA Sprint** (see [Phase 3](#phase-3--the-feature-loop-design--development--qa)) — proposing each sprint's scope and acceptance criteria, and waiting for approval before moving to the next feature/epic. This structure is fixed, not optional: every feature gets this exact sequence of sprint types, never a generic single "build feature X" sprint.
3. **Write the files:** only once a feature/epic's sprint breakdown is approved does its corresponding set of `docs/sprints/sprint-XX-name.md` files get written, one per sprint (design/dev/QA), clearly labeled by type in the filename or a `type:` field. `ROADMAP.md` is written once the full roadmap outline from stage 1 is approved.

Sprint sizing rule: **a sprint is scoped to what one agent session can hold fully in context while remaining coherent — not a calendar unit.** This applies within each sprint type — e.g., a large feature's Development stage may itself need to be split into several Development Sprints (mini-epic), while its Design Sprint and QA Sprint typically remain single sprints. Every Development Sprint must include its own tests as part of its definition of done.

**Output:**
- `docs/ROADMAP.md` — the full feature roadmap
- `docs/sprints/sprint-XX-name.md` — one file per sprint, each labeled by type (Design / Development / QA), scope, acceptance criteria, and status — written incrementally as each feature/epic's breakdown is approved, not all at once

### Session 3.5 — Repository & Git Setup

**Process:** Set up the codebase structure (see [Codebase Structure](#codebase-structure) below), initialize Git, make the first commit, establish branch strategy. This happens as the **last step of planning**, before any design or development sprint begins — so every subsequent session works inside a version-controlled repo from the start.

---

## Phase 2 — Design System Foundation

**Goal:** Establish the product's design philosophy and full component library **once**, before any feature-level design work begins — so every feature inherits consistent rules instead of each one quietly inventing its own.

**Agent role:** Product Designer.

**Input:** `PRD.md` and relevant architecture docs.

**Process, in two parts:**

**Part A — Design Principles**
The agent researches current, non-generic design references (not just its default training-data instincts) and establishes the UI/UX principles the entire product will follow. This explicitly names what to avoid — the recognizable "AI slop" patterns: unnecessary gradient overlays, rounded-everything without reason, more than 2–3 font weights/sizes doing real work, decorative icons without function, generic centered-hero layouts. Good design is largely disciplined pattern-following; this session is where the patterns get chosen.

**Part B — Component Library in Paper.design**
Using Paper's MCP connection to Claude Code, the agent builds the complete component set — buttons, forms, tables, cards — **in every state** (default, hover, loading, error, empty, disabled). Because Paper's canvas is native HTML/CSS/Tailwind, these components are simultaneously the design source of truth and near-final code, removing the traditional design-to-code translation step.

**Output:**
- `docs/design/design-principles.md` — the *why and when*: written rules an agent can reason from directly, not reverse-engineer from CSS
- A Paper.design component library — the *what*: the actual reusable, stateful components

> **Why both artifacts, not one:** the markdown doc carries intent ("cards are used only for grouping unrelated actions, never for single CTAs"); the Paper file carries the implementation. An agent reasons better from an explicit written rule than from inferring intent out of component styling alone.

---

## Phase 3 — The Feature Loop (Design → Development → QA)

Once the design foundation exists, every feature moves through this three-stage loop, one feature at a time. **No skipping ahead to build everything before testing anything.**

### 3.1 — Design Sprint

**Agent role:** Product Designer (feature-scoped).

**Process:** The agent reads `design-principles.md` and the proven component kit (in Storybook), then designs this feature's screens and states in Paper.design, assembling from approved kit components rather than inventing new ones. Iteration happens here until the owner approves.

If a screen genuinely needs something with no kit equivalent, the agent **flags it as a new component** — it does not draw a one-off. A flagged component gets its own design + a kit build sprint (states in Paper, then `components/kit/*` with the §9 contract, Storybook story per state, visual-regression + a11y gates — ADR-42) **before any screen composes it**.

> **Required method — read `docs/design/export-workflow.md`.** From Milestone 2: the design sprint's output is **Paper artboards + flow docs + the confirmed new-component list** — no code. The backend is then built in its own Development Sprint(s), and a later frontend assembly sprint screenshots each approved artboard and composes kit components in the real route to match it, wired to the real domain. No skeleton export, no `fixtures.ts`, no `/design-preview`. (Sprint 06 reconstructed 21 screens from `get_computed_styles` and had to scrap them all — hence "never eyeball a screenshot for a value; pull it with `get_computed_styles`".)

**Output:**
- Approved Paper.design artboards for every screen + every meaning-bearing state of this feature
- `docs/design/flows/feature-name-flow.md` — the user flow for this feature, written **now, at the start of this feature's design sprint** — never upfront for the whole product
- The confirmed list of any new kit components this feature needs (or an explicit "none")

> **Why flows are written per-feature, not upfront:** a flow document is only trustworthy if written immediately before use. Writing all flows during Phase 1 risks them going stale by the time later features are reached, as understanding of the product evolves through building earlier ones.

### 3.2 — Development Sprint(s)

**Agent role:** Developer / Tech Lead (implementation mode).

**Process (Milestone 2 onward):** the feature's **backend is built first**, in its own Development Sprint(s) — `lib/domain/<module>` + `app/api/*` + tests. Then a **frontend assembly sprint** takes the approved Paper artboards, **screenshots each one, assembles kit components in the real `app/**` route to match it**, and wires that screen to the real `lib/domain` calls through a per-feature hook. There is no skeleton-export step, no `fixtures.ts` mock layer, and no `/design-preview` route — see `docs/design/export-workflow.md` Phases C1/C2. Wire orchestration (which drawer/tab/filter is active, what submit does); grep for any stray `TODO(mock)` before calling the feature done. **No new UI/UX decisions get made in this sprint.** Design questions are out of scope here; if one surfaces, it goes back to a design sprint, not resolved ad hoc mid-build. Use Plan Mode before non-trivial implementation work. Delegate to subagents deliberately — an Explore subagent for unfamiliar code areas, an implementation subagent for the feature itself, a reviewer subagent to check the work before it's considered done. After each feature's frontend sprint, the owner walks the feature on `pnpm dev` as every role that touches it before it is called done.

**Output:** Working, committed code with all `TODO(mock)` sources replaced by real data/logic — including the tests defined in this sprint's scope, per the sprint-sizing rule from Phase 1, Session 3.

### 3.3 — QA Sprint (Mandatory, Not Optional)

**Agent role:** QA Engineer.

**Process:** Once the feature is functionally complete, the agent adopts an adversarial QA mindset — goes through the implemented feature against its acceptance criteria, tests edge cases, attempts to break it, and reports findings. This step is a **hard rule for every feature, with no exceptions** — it is the discipline that prevents "build everything, test later," which produces compounding, hard-to-trace bugs.

**Output:** A bug/findings report, followed by fixes, before moving to the next feature.

### Repeat

Design Sprint → Development Sprint(s) → QA Sprint, once per feature, until the roadmap is complete.

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
| `sprints/sprint-XX-[type]-[name].md` | Phase 1, Session 3 (per sprint) | Sprint type (Design/Development/QA), scope, acceptance criteria, status |
| `design-principles.md` | Phase 2 | Product-wide UI/UX rules and anti-patterns |
| Paper.design component library | Phase 2 | Reusable, stateful components |
| `design/export-workflow.md` | Phase 2 (method), applied every Phase 3 | Paper → code method: compose screens from the proven kit to match the artboard; from M2, backend-first then a frontend assembly sprint (no skeleton export, no fixtures, no `/design-preview`) |
| `design/flows/feature-name-flow.md` | Phase 3.1 (per feature) | User flow for that specific feature |
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
- **One plan file per milestone** (`sprints/milestone-XX-plan.md`),
  updated as the milestone runs — not one file per session. Per-session
  handoff docs are not kept after the session's PROGRESS entry is
  written.
- **Prompt templates** for each session type were removed from this doc
  once the process was internalised; the per-milestone plan file carries
  the concrete session scopes instead.

