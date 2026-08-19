# Prosper — Agent Memory

Mobile-first business management system for a food business (Restaurant,
Canteen, Store). Single Next.js (App Router, TypeScript) app — no
separate backend service. See `docs/ARCHITECTURE.md` (ADR-2, ADR-6,
ADR-8) for why: modular monolith, deployed entirely to Vercel.

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
- **Design Sprints happen in Paper.design** against the approved
  component library (`docs/design/design-principles.md`), then get
  assembled into real routed pages on mock data. Development Sprints
  replace `TODO(mock)` with real logic and make **no new UI/UX
  decisions** — unresolved design questions go back to a design sprint.
