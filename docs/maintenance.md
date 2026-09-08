# Prosper — Maintenance Mode

The initial build (Milestones 1–5) is done. The client is running their
business on the app. This document is how an agent takes a single request
— a bug, a workflow tweak, a small change, or a new feature — and ships it
fast without breaking anything.

`CLAUDE.md` has the short version. This is the reference.

---

## The mindset

- **One request, one session, shipped.** Most work is small. Don't
  spread it across sessions or write handoff docs.
- **Fast, but correct.** The ledger rules and the frozen kit are what
  keep "fast" from becoming "regression". They are not optional.
- **The client is the spec.** They looked at the running app and want
  something changed. Reproduce what they described, fix that, don't
  redesign around it.
- **When unsure about scope or a UI pattern, ask the owner** — a
  30-second question beats a wrong day of work.

---

## Loop A — bug / small change

### 1. Reproduce

- `pnpm dev`, open the app, sign in as the affected role.
  Seed accounts (dev DB): **Admin / PIN 1234**, and one user per staff
  role, all **PIN 1234** (`prisma/seed.ts`, printed on `pnpm prisma:seed`).
- Reproduce the exact behaviour the client reported. Note the screen, the
  role, the steps, and what's wrong vs. expected.
- Ledger / money / stock number looks wrong? Check it by hand first with
  `docs/UI_WALKTHROUGH.md` — the bug may be a misunderstanding of a
  derived figure, not a defect.
- If you can't reproduce it, say so and ask the client for steps or a
  screenshot rather than guessing.

### 2. Locate

- Find the module in the `CLAUDE.md` "Where the code is" table.
- Open **one sibling** — the nearest existing thing that already does the
  similar operation (a similar domain function, a similar screen, a
  similar API route). Copy its shape.

### 3. Fix

- Business logic lives in `lib/domain/<module>`. Route handlers in
  `app/api/*` stay thin: parse → Zod validate → check auth/role/ownership
  → call the domain → standard response shape (`lib/api/response`).
- Screen changes **compose the existing kit** (`components/kit/*`). If the
  kit prop shape doesn't fit, write a thin mapper in the screen file —
  never edit the kit.
- Respect the non-negotiables (`CLAUDE.md`): derived balances only,
  corrections as new rows, `Decimal` money, `Africa/Nairobi` day
  boundaries, no leftover `TODO(mock)`.

### 4. Test

- Domain change → add/adjust a `*.test.ts` next to it.
- Interactive UI change → add/adjust `tests/screens/<screen>.screen.test.tsx`
  (jsdom + RTL).
- Run the gate:
  ```
  pnpm test && pnpm typecheck && pnpm build
  ```
  All three must be green. CI (`.github/workflows/ci.yml`) and Vercel both
  run the build; a red gate = a failed deploy.
- `grep -rn "TODO(mock)" lib app` — none may remain in what you touched.

### 5. Ship

- Branch off `main` (`fix/<short-name>`), commit, open a PR.
- Merge to `main`. Vercel auto-deploys `main` on push.
- Add one entry to `docs/PROGRESS.md`: date, what changed, files/ADR, gate
  state.
- Update `docs/DECISIONS.md` only if you changed a contract or made a call
  that isn't obvious from the code.
- Tell the client it's live and what to check.

---

## Loop B — new feature

Same as Loop A, with a short planning step first. No milestone doc.

### 1. Plan (a few paragraphs, in the PR description or a scratch note)

- What the client asked for, in your words.
- The domain change: new table? new columns? new domain functions? Does it
  touch a ledger (then corrections + derivation rules apply)? **A new
  create path for a ledger row ships its correction path in the same PR**
  (ADR-72) — `correctX` + optional `voidX`, domain + route + a per-row
  screen action, following `correctExpense` / `correctPurchasePayment`.
- The API surface: new routes, or new methods on existing ones. Match
  `docs/API.md` conventions.
- The screen: a new route, or a tab on an existing screen? Which roles see
  it? Which sibling screen is the closest template?
- Migrations: Prisma migration required? (Additive is safe; a column
  rename/drop needs care — the DB is live.)

If any of this is ambiguous, ask the owner before building.

### 2. Backend

`lib/domain/<module>` + `app/api/*` + tests, per `docs/CONVENTIONS.md` and
`docs/API.md`.

### 3. Frontend

Compose the screen from the frozen kit following a sibling screen. Wire it
to the domain through a per-feature hook (`use-<feature>`). No fixtures.

### 4. Design

- Only design in Paper if **the client asked for a specific look**, or the
  feature needs a UI pattern the kit genuinely can't express — and in the
  second case, **stop and ask the owner first**.
- When there is a Paper artboard, it's a visual reference to copy exact
  values from (`get_computed_styles` / `get_jsx`), not a gate.
- Otherwise: kit + sibling screen is the design.

### 5. Check + ship

As Loop A steps 4–5. Add the `docs/PROGRESS.md` entry and any ADR.

---

## Deployment

- **Host:** Vercel, connected to the GitHub repo. Push to `main` →
  production deploy. PR branches get preview deploys.
- **Build command:** `pnpm vercel-build` = `prisma migrate deploy && next
  build`. So a committed Prisma migration is applied to the production DB
  as part of the deploy — make sure migrations are correct and additive.
- **Database:** managed PostgreSQL (Neon/Supabase). Connection via
  `DATABASE_URL` env var in the Vercel project.
- **Env vars** (Vercel project settings): `DATABASE_URL`, `NEXTAUTH_URL`,
  `NEXTAUTH_SECRET`. CI uses placeholders for the build step only (no
  route hits the DB at build time).

### If a deploy fails

1. Check the Vercel build log for the failing step.
2. `typecheck` / `build` failure → reproduce locally with `pnpm typecheck`
   then `pnpm build`. Usually a type error from an incomplete change
   (e.g. a hook and its consumer out of sync). Fix and push.
3. `prisma migrate deploy` failure → a migration doesn't apply cleanly to
   the production DB. Do not force it. Inspect the migration and the
   production schema state.
4. Runtime error only in production (not local) → check env vars are set
   in the Vercel project and match what the code reads.

Add branch protection on `main` requiring the CI check to pass before
merge, so a red tree can't reach `main` in the first place.

---

## What not to do

- Don't read or write milestone/sprint/handoff docs — that era is over.
- Don't fork or extend `components/kit/*` without an owner conversation.
- Don't add a stored total, mutate a ledger row, or use float money.
- Don't rename/drop a DB column without checking the live data and writing
  a safe migration.
- Don't skip the `pnpm test && pnpm typecheck && pnpm build` gate — it is
  exactly what the deploy runs.
