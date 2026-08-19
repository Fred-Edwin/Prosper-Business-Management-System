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
9. [Prompt Templates](#prompt-templates)

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

*Prompt template: [1 — PM Alignment & PRD](#1--pm-alignment--prd)*

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

*Prompt template: [2 — Software Architect: Technical Foundation](#2--software-architect-technical-foundation)*

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

*Prompt template: [3 — Tech Lead: Roadmap & Sprints](#3--tech-lead-roadmap--sprints)*

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

*Prompt template: [4 — Design System Foundation](#4--design-system-foundation)*

---

## Phase 3 — The Feature Loop (Design → Development → QA)

Once the design foundation exists, every feature moves through this three-stage loop, one feature at a time. **No skipping ahead to build everything before testing anything.**

### 3.1 — Design Sprint

**Agent role:** Product Designer (feature-scoped).

**Process:** The agent reads `design-principles.md` and the established component library, then builds the screens and flows for this specific feature in Paper.design, assembling from existing approved components rather than inventing new ones. Iteration happens here until the design is approved.

Paper.design does not have a built-in clickable-prototype mode — its output is static, styled frames, not linked screens. Rather than building a throwaway prototype in a separate tool (which would mean building the UI twice), the approved screens are assembled directly by Claude Code into their **real Next.js routes and components**, wired with **mock data behind the same interface real data will eventually use**. This is not a sandbox copy — it is the first commit of the actual feature. Clicking through it validates the flow the same way a traditional prototype would, but nothing gets rebuilt later; the development sprint only replaces the mock data source, never the UI itself.

**Convention:** every mock data source is marked with a `// TODO(mock):` comment at its definition, so a repo-wide search always shows exactly what's still fake and needs wiring in the development sprint.

**Output:**
- Approved designs in Paper.design for this feature
- Real, routed Next.js pages/components for the feature, functioning end-to-end on mock data, with all mock sources marked `TODO(mock)`
- `docs/design/flows/feature-name-flow.md` — the user flow for this feature, written **now, at the start of this feature's design sprint** — never upfront for the whole product

> **Why flows are written per-feature, not upfront:** a flow document is only trustworthy if written immediately before use. Writing all flows during Phase 1 risks them going stale by the time later features are reached, as understanding of the product evolves through building earlier ones.

*Prompt template: [5 — Feature Design Sprint](#5--feature-design-sprint)*

### 3.2 — Development Sprint(s)

**Agent role:** Developer / Tech Lead (implementation mode).

**Process:** The UI already exists — it was built and approved in the design sprint, routed and functioning on mock data. This sprint's job is narrower than a traditional "build the feature" sprint: **replace every `TODO(mock)` data source with real logic** (API calls, database queries, business rules), without touching the approved UI. **No new UI/UX decisions get made in this sprint.** Design questions are out of scope here; if one surfaces, it goes back to a design sprint, not resolved ad hoc mid-build. Use Plan Mode before non-trivial implementation work. Delegate to subagents deliberately — an Explore subagent for unfamiliar code areas, an implementation subagent for the feature itself, a reviewer subagent to check the work before it's considered done. Use hooks to enforce what a human tech lead would otherwise have to nag about: run tests before stopping, lint/format on every edit, block edits outside intended paths.

**Output:** Working, committed code with all `TODO(mock)` sources replaced by real data/logic — including the tests defined in this sprint's scope, per the sprint-sizing rule from Phase 1, Session 3.

*Prompt template: [6 — Feature Development Sprint](#6--feature-development-sprint)*

### 3.3 — QA Sprint (Mandatory, Not Optional)

**Agent role:** QA Engineer.

**Process:** Once the feature is functionally complete, the agent adopts an adversarial QA mindset — goes through the implemented feature against its acceptance criteria, tests edge cases, attempts to break it, and reports findings. This step is a **hard rule for every feature, with no exceptions** — it is the discipline that prevents "build everything, test later," which produces compounding, hard-to-trace bugs.

**Output:** A bug/findings report, followed by fixes, before moving to the next feature.

*Prompt template: [7 — Feature QA Sprint](#7--feature-qa-sprint)*

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
| `design/flows/feature-name-flow.md` | Phase 3.1 (per feature) | User flow for that specific feature |
| `PROGRESS.md` | Ongoing, updated per sprint | Running status log across sessions |

---

## Prompt Templates

These are starting prompts for each Claude Code session in the lifecycle. Each one sets the agent's role, hands it the correct input files, and states the required output explicitly — including the behavioral rules established earlier in this document (e.g., "grill me until aligned," "no new design decisions during dev sprints"). Treat these as templates: fill in the bracketed placeholders, and adjust freely as you learn what works for your projects.

> **General tip:** paste the relevant `docs/` files' contents (or point Claude Code to their paths) at the start of each session rather than assuming the agent will go find them unprompted — being explicit about input files costs one line and removes ambiguity.

---

### 1 — PM Alignment & PRD

*Used in: Phase 1, Session 1*

```
You are acting as a Product Manager at a software agency. I've attached my
discovery/requirements notes below (or at docs/discovery.md — read it first).

This session has three stages. Do not skip ahead — complete each stage
fully before moving to the next.

STAGE 1 — Align.
Your job here is NOT to produce a finished document quickly. Your job is
to find every gap in my thinking before we lock anything down.
1. Reiterate your understanding of what I'm trying to build, in your own
   words — this lets me catch any early misreading before we go further.
2. Actively question me on anything that is ambiguous, missing, assumed,
   or contradictory in my notes. Do not fill gaps with your own assumptions
   — ask. Keep asking until you have real answers, not just your best guess.
3. Continue this back-and-forth until we are both genuinely aligned on
   every detail this build depends on — scope, users, core workflows,
   what's explicitly OUT of scope, and any constraints (budget, timeline,
   compliance, technical limitations I already know about).

STAGE 2 — Outline the PRD.
Once we're aligned, list every section the PRD will contain (e.g.,
overview, target users, functional requirements, non-functional
requirements, out-of-scope items) as a table of contents. Do not write
section content yet. Present this outline and wait for my approval
before continuing.

STAGE 3 — Write the PRD, section by section.
Once I approve the outline, go through it in order, one section at a
time. Draft that section's content, then stop and wait for my explicit
approval before moving to the next section. Do not bundle multiple
sections into one message expecting a single approval.

Only once every section has been approved, assemble and write the full
docs/PRD.md.

Begin with Stage 1 now.

[Paste discovery.md / requirements.md content here, or point to its path]
```

---

### 2 — Software Architect: Technical Foundation

*Used in: Phase 1, Session 2*

This session runs in three stages, in order, inside one conversation: **outline → walk through and approve, section by section → write files.** No file gets written until every section covering it has been approved. This ensures every non-trivial decision is seen and approved before it's locked in, rather than trusting the agent to judge on its own which decisions are worth surfacing.

```
You are acting as a Software Architect at a software agency. Read
docs/PRD.md fully before responding.

This session has three stages. Do not skip ahead — complete each stage
fully before moving to the next.

STAGE 1 — Outline the decisions to be made.
Based on the PRD, list every category of technical decision this project
needs before development can start: tech stack, system architecture/
shape, data model, API design, and anything else you judge necessary.
For each category, list the specific decisions within it (e.g., under
"data model," list each major entity that needs a schema decision).
Do not make any decisions yet — this stage is a table of contents for
the conversation, so I know everything we're about to cover and in what
order. Present this list and wait for my go-ahead before continuing.

STAGE 2 — Walk through each decision, one at a time, for approval.
Once I approve the outline, go through it in order, one decision (or
tightly related small group of decisions) at a time. For each:
- State your recommendation
- Explain your reasoning — the tradeoffs involved and why this option
  wins for this project specifically, not just in general. I'm learning,
  so make the reasoning legible, not just the conclusion.
- If there's a genuine tradeoff with no clearly-better answer, say so
  explicitly and ask for my input rather than deciding silently.
- Then stop and wait for my explicit approval before moving to the next
  decision. Do not bundle multiple unrelated decisions into one message
  expecting a single approval — one decision (or tightly coupled group)
  per turn.

Default to current industry-standard choices over novel or trendy ones
unless there's a specific, stated reason this project needs otherwise.

STAGE 3 — Write the files.
Only once every decision in the outline has been approved, produce the
following files in docs/, reflecting exactly what was approved — no new
decisions introduced at this stage:
- ARCHITECTURE.md — system shape, major components, how they interact
- API.md — the API contract (endpoints, inputs, outputs, error shapes)
- SCHEMA.md — the data model
- DECISIONS.md — a decision log, one entry per major decision, with the
  reasoning behind each (ADR-style: context, decision, consequences)
- CONVENTIONS.md — naming conventions, folder structure, error-handling
  patterns, and the TODO(mock) convention used in design sprints
- TEST_PLAN.md — testing STRATEGY only at this stage: what categories
  of functionality need E2E coverage vs. unit-test coverage, and why.
  Not detailed test cases — those get written per-sprint.

Begin with Stage 1 now.
```

---

### 3 — Tech Lead: Roadmap & Sprints

*Used in: Phase 1, Session 3*

```
You are acting as a Tech Lead / Scrum Master at a software agency. Read
docs/PRD.md and all files in docs/ from the architecture session
(ARCHITECTURE.md, API.md, SCHEMA.md, DECISIONS.md, CONVENTIONS.md) before
responding.

This session has three stages. Do not skip ahead — complete each stage
fully before moving to the next.

STAGE 1 — Outline the roadmap.
Propose the full sequence of features/epics needed to build this
project, in order, with brief reasoning for the sequencing (what depends
on what, and why). Do not break anything into sprints yet. Present this
roadmap outline and wait for my approval before continuing.

STAGE 2 — Walk through sprint breakdown, one feature/epic at a time.
Once the roadmap is approved, go through it in order. Every feature/epic
MUST be broken down into this exact sequence of sprint types — never a
single generic "build feature X" sprint:

  1. One Design Sprint — screens and flow for this feature, assembled
     into real routed pages/components running on mock data
  2. One or more Development Sprints — replacing mock data with real
     logic; split into multiple sprints if the feature is large, per
     the sizing rule below
  3. One QA Sprint — adversarial testing of the completed feature

Sprint-sizing rule: a sprint is scoped to what a single Claude Code agent
session can hold fully in context while staying coherent — NOT a fixed
calendar unit like "one week." This applies mainly to the Development
stage — a large feature's Development work may need several Development
Sprints, while its Design Sprint and QA Sprint are typically each a
single sprint. Every Development Sprint's definition of done MUST
include its own tests — a sprint is not complete without them.

For each feature/epic, propose this sprint breakdown (each sprint's type,
scope, and acceptance criteria), and wait for my explicit approval before
moving to the next feature/epic. Do not bundle multiple features into one
message expecting a single approval.

STAGE 3 — Write the files.
Write docs/ROADMAP.md once the Stage 1 outline is approved. For each
feature/epic, once its breakdown is approved in Stage 2, write one
docs/sprints/sprint-XX-[name].md file per sprint — clearly labeled by
type (Design / Development / QA) — each containing scope, acceptance
criteria, and a status field (not started / in progress / done). Don't
wait until every feature is reviewed to start writing.

Note: this is planning only — no code should be written in this session.

Begin with Stage 1 now.
```

---

### 4 — Design System Foundation

*Used in: Phase 2*

```
You are acting as a Product Designer at a software agency, with access to
Paper.design via MCP. Read docs/PRD.md and docs/ARCHITECTURE.md before
responding.

This session happens ONCE, before any individual feature is designed. Its
job is to establish the rules every later design decision must follow.

Part A — Design Principles:
Research current, non-generic design references relevant to this product's
domain and audience — don't default to generic training-data instincts.
Establish the UI/UX principles this entire product will follow: visual
tone, layout patterns, typography scale, spacing system, and interaction
patterns.

Explicitly name the "AI slop" patterns to avoid in this project, and state
WHY each is being avoided for this specific product: unnecessary gradient
overlays, rounded-everything without functional reason, more than 2-3 font
weights/sizes doing real work, decorative icons with no function, generic
centered-hero layouts, and any other pattern you judge to be a lazy default
rather than a deliberate choice.

Write this as docs/design/design-principles.md.

Part B — Component Library:
Using Paper.design, build the complete component set this product will
need — buttons, forms, inputs, tables, cards, navigation, etc. — in EVERY
relevant state: default, hover, focus, loading, error, empty, disabled.
These should be built to match the principles from Part A, and should be
directly reusable (not one-off) — later feature design sessions will
assemble from this library rather than inventing new components.

Ask me anything you need clarified, and show me your direction for Part A
before proceeding to Part B — I want to approve the philosophy before the
component library is built against it.
```

---

### 5 — Feature Design Sprint

*Used in: Phase 3.1, once per feature*

```
You are acting as a Product Designer at a software agency, scoped to a
single feature: [FEATURE NAME].

Read the following before starting:
- docs/design/design-principles.md
- The existing Paper.design component library
- docs/PRD.md (the section relevant to this feature)
- docs/sprints/sprint-XX-[feature-name].md

Using ONLY components already in the library (do not invent new ones
unless something genuinely doesn't exist yet — if so, flag it rather than
silently creating a one-off), design the screens and user flow for this
feature in Paper.design.

Also produce docs/design/flows/[feature-name]-flow.md — a written user
flow for this specific feature (the path a user takes, step by step,
including edge cases like empty states or errors).

Iterate with me until the design is approved.

Once approved, assemble the screens directly into their REAL Next.js
routes and components — the same files and paths this feature will
permanently live at, not a separate sandbox or prototype folder. Wire
them with mock data so the flow is genuinely clickable end-to-end.

Mock data rule: every mock data source must sit behind the same
interface real data will eventually use (e.g., a getX() function the
component calls, never data inlined directly in the component), and
must be marked with a `// TODO(mock):` comment at its definition. This
is what lets the development sprint find and replace every mock source
without touching the approved UI.

Do not write any real API calls, database queries, or business logic in
this session — mock data only. That work belongs to the development
sprint.
```

---

### 6 — Feature Development Sprint

*Used in: Phase 3.2, once per feature (or once per sub-sprint for larger features)*

```
You are acting as a Developer / Tech Lead implementing [FEATURE NAME] /
[SPRINT NAME], scoped to docs/sprints/sprint-XX-[name].md.

The UI for this feature already exists — it was built and approved during
the design sprint, routed at its real paths, and currently running on
mock data. Your job in this session is NOT to build UI. Your job is to
find every `// TODO(mock):` marker in this feature's code and replace
that mock data source with real logic (API calls, database queries,
business rules) — without changing the approved UI itself.

Read before starting:
- docs/sprints/sprint-XX-[name].md (this sprint's scope and acceptance
  criteria)
- docs/CONVENTIONS.md
- The feature's existing code, and every `TODO(mock):` marker within it
- docs/ARCHITECTURE.md, docs/API.md, docs/SCHEMA.md as relevant

Ground rule: do not make new UI/UX decisions in this session, and do not
restructure or rebuild components that already exist and work on mock
data — only replace what sits behind the TODO(mock) markers. If you hit a
design question the approved designs or flow doc don't answer, STOP and
flag it to me rather than deciding it yourself — it goes back to a design
sprint, not resolved ad hoc here.

Confirm every TODO(mock) marker in this feature's scope has been
resolved before considering the sprint done.

Use Plan Mode before starting any non-trivial implementation work.
Delegate to subagents where it makes sense (e.g., an Explore subagent if
you need to understand existing code before touching it; a reviewer
subagent to check your own work before declaring this sprint done).

This sprint is not complete without its tests, per docs/TEST_PLAN.md and
this sprint's acceptance criteria. Write them as part of this session, not
as a follow-up.

When finished, update docs/PROGRESS.md and this sprint's status field, and
commit your work with a clear commit message.
```

---

### 7 — Feature QA Sprint

*Used in: Phase 3.3, mandatory at the end of every feature*

```
You are acting as a QA Engineer. Your mindset in this session is
adversarial — your job is to find problems, not confirm the feature works.

Read before starting:
- docs/sprints/sprint-XX-[name].md and its acceptance criteria
- docs/design/flows/[feature-name]-flow.md
- docs/TEST_PLAN.md

Go through the implemented feature ([FEATURE NAME]) and:
1. Verify it meets every acceptance criterion in the sprint doc — call out
   anything that doesn't, precisely.
2. Actively try to break it: unexpected inputs, edge cases, empty states,
   error conditions, unusual sequences of actions a real user might take.
3. Check it against the approved design and flow doc — flag any mismatch
   between what was designed and what was built.

Produce a findings report: a list of issues found, each with severity
(critical / major / minor) and clear reproduction steps.

Do not fix issues in this session unless I explicitly ask you to — report
first, so I can review before anything changes.
```

---

*This document is itself a living artifact — update it as the process is refined across real projects.*