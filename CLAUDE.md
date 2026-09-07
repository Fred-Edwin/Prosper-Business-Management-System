# Prosper — Agent Memory

Mobile-first business management system for a food business (Restaurant,
Canteen, Store). Single Next.js (App Router, TypeScript) app — no separate
backend service. Modular monolith, deployed entirely to Vercel
(`docs/ARCHITECTURE.md`, ADR-2 / ADR-6 / ADR-8).

Built solo, entirely by agent-driven sessions. There is no human
collaborator carrying context between sessions — these docs are the only
continuity the project has.

## Status: MAINTENANCE MODE

The initial build (Milestones 1–5) is **done and with the client**. They
are running their business on it and will call in bugs, workflow
adjustments, small changes, and the occasional new feature.

**Your job now is to turn one request around fast and correctly** — not to
run a sprint. Most sessions are a single fix or a small change, start to
shipped, in one sitting.

- **Do NOT** read milestone plans or write per-session handoff docs — that
  process is over (kept for the record in git; see `docs/sdlc.md` for how
  the build ran).
- **Do** keep the non-negotiable rules below and the "read a sibling
  screen" habit — that is what keeps a fast change from breaking a ledger
  or contradicting the kit.

### The two loops

**Fix / small change** (the common case):

1. **Reproduce.** Run `pnpm dev`, sign in as the affected role (seed PINs
   in `prisma/seed.ts`), reproduce the reported behaviour. If it's a
   number/ledger bug, check it against `docs/UI_WALKTHROUGH.md`.
2. **Locate.** Find the module (table below) and one sibling that already
   does the similar thing.
3. **Fix.** Domain logic in `lib/domain/<module>`; keep `app/api/*`
   handlers thin (parse → Zod → auth/role/ownership → call domain →
   standard response). Screen changes compose the existing kit — never
   fork `components/kit/*`.
4. **Test.** Add/adjust a test next to the change (`*.test.ts` for domain,
   `tests/screens/*.screen.test.tsx` for interactive UI). Keep `pnpm test`
   + `pnpm typecheck` + `pnpm build` green — CI and Vercel both run these.
5. **Ship.** Branch, commit, PR, merge. Add one entry to
   `docs/PROGRESS.md`. Update `docs/DECISIONS.md` only if you changed a
   contract or made a non-obvious call.

**New feature** (when the client asks for one):

1. **Plan it** — scope, the domain change, the API surface, which screen
   (new route or a tab of an existing one), which roles touch it. A few
   paragraphs in the PR description or a short note; not a milestone doc.
2. **Backend** — `lib/domain/<module>` + `app/api/*` + tests, per
   `docs/CONVENTIONS.md` and `docs/API.md`.
3. **Frontend** — compose the screen from the frozen kit following a
   sibling screen; wire it through a per-feature hook (`use-<feature>`).
4. **Design in Paper only if the client asked for a specific look**, or if
   the feature genuinely needs a UI pattern the kit has no answer for — in
   which case **stop and ask the owner** first. Otherwise the kit +
   sibling screens are enough.
5. **Check + ship** as in the fix loop.

See `docs/maintenance.md` for the fuller version of both.

## Before a code change, read (only what's relevant)

1. `docs/CONVENTIONS.md` — naming, folder structure, error shape, the
   correction-entry pattern, `TODO(mock)`, and §6 working practices.
2. Whichever of `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/SCHEMA.md`
   covers the module you're touching.
3. For screen work: one or two **sibling screens** in `app/**` doing
   something similar — copy their structure, kit usage, and hook shape.
   The kit in `components/kit/*` is frozen vocabulary; sibling screens are
   the worked examples.
4. For a per-feature user flow, `docs/design/flows/<feature>.md` where one
   exists.

## Where the code is

| Module | Domain | API | Screens |
|---|---|---|---|
| Catalog & Locations | `lib/domain/catalog` | `app/api/products`, `app/api/locations` | `app/admin/catalog` |
| Stock ledger | `lib/domain/stock` | `app/api/stock-movements` | `app/admin/stock`, `app/store-manager/*`, `app/canteen/*` |
| Sales (Orders + Canteen derived) | `lib/domain/sales` | `app/api/orders`, `app/api/canteen` | `app/admin/sales`, `app/cashier/*`, `app/canteen/*` |
| Customers & Credit | `lib/domain/customers` | `app/api/customers` | `app/admin/customers` |
| Handovers & Reconciliation | `lib/domain/handovers` | `app/api/handovers`, `app/api/day-close` | `app/admin/financials` (Handovers tab), staff declare screens |
| Financials | `lib/domain/financials` | `app/api/financials`, `app/api/expenses`, `app/api/owner-transactions`, `app/api/money` | `app/admin/financials` |
| Dashboard | `lib/domain/dashboard` | `app/api/admin/dashboard` | `app/admin` |
| Staff & Pay | `lib/domain/staff` | `app/api/staff`, `app/api/attendance`, `app/api/pay` | `app/admin/staff` |
| Assets | `lib/domain/assets` | `app/api/assets` | `app/admin/assets` |
| Audit trail & Day Close | `lib/domain/audit` | `app/api/audit` | `app/admin/audit-trail`, `app/admin/day-close` |
| Auth / roles / acting-as | `lib/auth` | `app/api/auth` | `app/login`, shells in `components/shells` |

Shared: `lib/validation/*` (Zod, frontend+backend), `lib/time` (Nairobi
day boundaries), `lib/db` (Prisma), `lib/api/*` (route helpers —
`require-role`, `response`).

## Where to look

| Question | See |
|---|---|
| What are we building, for whom? | `docs/PRD.md` |
| System shape, deployment | `docs/ARCHITECTURE.md` |
| API contract | `docs/API.md` |
| Data model | `docs/SCHEMA.md` |
| Why a decision was made | `docs/DECISIONS.md` (ADR-style) |
| Naming, folders, error shape, correction pattern | `docs/CONVENTIONS.md` |
| The maintenance workflow, in full | `docs/maintenance.md` |
| Testing strategy | `docs/TEST_PLAN.md` |
| Checking the numbers by hand in a browser | `docs/UI_WALKTHROUGH.md` |
| Long-horizon ledger proof (`pnpm test:sim`) | `docs/SIMULATION_TESTING.md` |
| Reusable method for testing any ledger system | `docs/playbooks/ledger-simulation-testing.md` |
| Feature history, per-milestone "unlocks" | `docs/ROADMAP.md` |
| Product-wide UI/UX rules | `docs/design/design-principles.md` (§9 is ENFORCED) |
| What each kit component does + its states | `docs/design/kit-audit.md`, `docs/design/component-states.md` |
| Composing a screen from the kit (mapper in the screen file, never fork the kit) | `docs/design/export-workflow.md` |
| Per-feature user flow (where one exists) | `docs/design/flows/*.md` |
| What shipped recently | `docs/PROGRESS.md` |
| How the initial build ran (historical) | `docs/sdlc.md` |

## Non-negotiable rules

- **Ledgers, not stored totals.** Stock and money balances are always
  derived by summing append-only rows, never a mutable stored number.
- **Corrections are new rows, never overwrites.** Only the Admin may
  correct a record dated to an already-closed day; staff edit their own
  same-day entries directly before close.
- **A ledger-row create path ships with its correction path in the same
  PR** (ADR-72). A new `recordX` writing a stock/money ledger row is
  incomplete without a `correctX` (and, where a full undo fits, a
  `voidX`) — domain + route + a per-row screen action. Copy
  `correctExpense` / `correctPurchasePayment`.
- **`app/api/*` route handlers contain no business logic.** Parse →
  validate (Zod) → check auth/role/ownership → call `lib/domain/<module>`
  → return the standard response shape.
- **Money is always `Decimal`/`NUMERIC`.** Never floating-point.
- **Day boundaries use the fixed `Africa/Nairobi` constant** (`lib/time`),
  never server-local time.
- **`TODO(mock)`** marks a deliberately deferred real implementation. Grep
  for it before calling a change done — none may remain.
- **The kit (`components/kit/*`) is frozen.** Compose it; write thin
  mappers in the screen file. A new kit component or a new UI pattern is
  an owner conversation, not an in-session decision.

## Package manager

Use **pnpm** for everything (`pnpm install`, `pnpm dev`, `pnpm test`, …) —
never `npm` or `yarn`.

## Visible progress during a session

The owner wants to see progress as it happens during any multi-step work,
not just a summary at the end.

- If `TodoWrite` is available, use it — mark items in-progress/completed as
  you do the work, not in a batch afterward.
- If not, post a short markdown checklist (`- [ ]` / `- [x]`) of the
  concrete steps before starting and re-post it after each step. One line
  per real step, no vague entries.
- Even a 3–4 step fix benefits from a 3–4 item checklist.

## After a change

Add one entry to `docs/PROGRESS.md`: date, what changed, files/ADR touched,
gate state (`pnpm test` / `typecheck` / `build`). Update `docs/DECISIONS.md`
only when you changed a contract or made a non-obvious call. The next
session has no memory beyond what's written down.

No hooks and no saved subagent definitions are configured — deliberate.
Ad hoc subagent use (a one-off search, say) is fine.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
