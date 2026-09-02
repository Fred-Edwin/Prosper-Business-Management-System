# Prosper — Conventions

**Status:** Approved. Governs folder structure, naming, error handling, and
the correction-entry pattern used throughout the codebase.

---

## 1. Folder Structure

```
prosper/
├── app/
│   ├── admin/                  # Admin-only screens         → /admin
│   ├── store-manager/          # Store Manager screens      → /store-manager
│   ├── cashier/                 # Cashier screens            → /cashier
│   ├── canteen/                  # Canteen Attendant screens  → /canteen
│   ├── api/
│   │   ├── products/
│   │   ├── locations/
│   │   ├── stock-movements/
│   │   ├── orders/
│   │   ├── canteen/stock-counts/
│   │   ├── handovers/
│   │   ├── customers/
│   │   ├── expenses/
│   │   ├── owner-transactions/
│   │   ├── staff/
│   │   ├── attendance/
│   │   ├── assets/
│   │   ├── audit-log/
│   │   ├── reports/
│   │   ├── day-close/
│   │   └── auth/               # Auth.js
│   └── layout.tsx, etc.
├── lib/
│   ├── domain/
│   │   ├── catalog/            # Product, Location, ProductLocation rules
│   │   ├── stock/              # StockMovement ledger rules
│   │   ├── sales/               # Order, OrderLine, StockCount rules
│   │   ├── handovers/           # Handover, ReceiptOfHandover, variance
│   │   ├── financials/          # MoneyMovement, Expense, OwnerTransaction
│   │   ├── customers/           # Customer, Debt, Repayment
│   │   ├── staff/                # Staff, Attendance, Advance/Deduction, pay
│   │   ├── assets/               # Asset register
│   │   └── audit/                # AuditLog, DayClose
│   ├── validation/               # Zod schemas, shared frontend+backend
│   ├── auth/                      # Auth.js config, role/permission helpers
│   └── db/                        # Prisma client instance
├── prisma/
│   └── schema.prisma
└── docs/
```

**Rule: `app/api/*` route handlers contain no business logic.** A route
handler's job is: parse request → validate (Zod) → check auth/role/ownership
→ call one function in `lib/domain/<module>` → return the response in the
standard shape. If a route handler contains a calculation, a business rule,
or a query beyond "fetch the thing I was asked for," that logic belongs in
`lib/domain` instead.

**Rule: one domain module owns one entity group.** Each `lib/domain/<module>`
folder corresponds to a section of `SCHEMA.md`. When adding a new feature,
find its home by matching it to a schema section first — do not create a
new top-level module without updating `SCHEMA.md` and `ARCHITECTURE.md`.

**Rule: role folders under `app/` are plain paths, not Next.js route
groups.** Do not wrap them in parentheses (e.g. `(admin)`). Route groups
strip out of the URL entirely, so `app/(admin)/page.tsx` and
`app/(cashier)/page.tsx` would both resolve to `/` and collide. Each role
needs its own real URL prefix (`/admin`, `/store-manager`, `/cashier`,
`/canteen`) for middleware-based role gating, so plain folders are used
instead.

---

## 2. Naming Conventions

| Layer | Convention | Example |
|---|---|---|
| Database tables/columns | snake_case | `stock_movement`, `occurred_at` |
| TypeScript variables/functions | camelCase | `calculateVariance()` |
| TypeScript types/interfaces | PascalCase | `StockMovement`, `HandoverInput` |
| API routes | kebab-case, resource-oriented, plural | `/api/stock-movements` |
| Enum values (DB) | snake_case | `non_sale_consumption` |
| React components | PascalCase | `HandoverForm.tsx` |
| Domain module folders | lowercase, matches schema section | `lib/domain/handovers/` |

---

## 3. Error Handling

Every API error response uses one shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "cash_declared must be a positive number",
    "field": "cash_declared"
  }
}
```

Standard `code` values:
- `VALIDATION_ERROR` — bad input (400)
- `UNAUTHENTICATED` — no valid session (401)
- `FORBIDDEN` — authenticated but not permitted (403) — e.g., staff trying
  to view another staff member's orders, or correct a closed record
- `NOT_FOUND` — resource doesn't exist or is soft-deleted (404)
- `CONFLICT` — e.g., hard-delete blocked due to linked history (409)
- `INTERNAL_ERROR` — unexpected server error (500)

The frontend handles errors generically off `code`, not by parsing
free-text `message` strings.

---

## 4. The Correction-Entry Pattern (TODO(mock) convention included)

**Never overwrite a historical record.** Every domain module that has a
ledger table (stock, money, orders, handovers, expenses) must implement
corrections the same way:

1. The user-facing action is **"Correct this"**, not "Edit."
2. The form/input asks for the **correct final value**, never a delta.
3. The domain function computes `delta = correctValue - originalValue`
   (or the equivalent for the entity) and writes a **new row** referencing
   the original via its `corrects_*_id` field.
4. Read paths (list/detail views, reports) always show the **current
   derived value** (original + all corrections summed), not the original
   row in isolation.
5. The audit trail view is the only place that surfaces "originally X,
   corrected to Y, by [user], on [date]" — not the default UI.
6. Only the Admin may correct a record dated to an already-closed day
   (`DayClose` exists for that date). Staff may edit their own same-day
   entries directly (true edit, not a correction row) only while the day
   is still open.

### `TODO(mock)` convention

Any place where real integration is deliberately deferred (e.g., a
notification stubbed instead of sent, or a value hard-coded pending a
query that a later sprint will add) must be marked:

```ts
// TODO(mock): replace with real stock-balance query once lib/domain/stock/getBalance is implemented
```

Rules:
- `TODO(mock)` is reserved for intentionally deferred real implementation —
  not a general-purpose TODO. Use plain `TODO` for anything else.
- Every `TODO(mock)` must be resolved (or explicitly re-scoped with a
  reason) before that feature is considered done for a sprint — it should
  never silently ship to what the Admin treats as her production data.
- Grep for `TODO(mock)` as part of end-of-sprint review.

---

## 5. Money & Dates

- All money values: `NUMERIC` in Postgres, `Decimal` in Prisma/TypeScript —
  never native floating-point arithmetic.
- All timestamps stored in UTC. Any logic depending on "which business day
  does this fall on" (day-close, opening/closing stock) converts using a
  fixed `Africa/Nairobi` constant defined once in `lib/domain/audit` (or a
  shared `lib/time` helper) — never inferred from server locale/timezone.

---

## 6. Working practices (lessons carried forward)

Distilled from Milestone 1. These are cheap to follow and each one maps
to a real regression that cost a session.

- **Compose from the frozen kit; don't extend it per feature.** The kit
  in `components/kit/*` is built and done. A screen is assembled from it
  following a sibling screen's structure, with a thin mapper in the
  screen file where a prop shape doesn't fit. If a feature genuinely
  needs a pattern the kit has no answer for, **stop and ask the owner** —
  don't invent a one-off or add a kit component unprompted. (The old
  per-feature Design Sprint + Storybook-prove-it gate was removed
  2026-09 — see `docs/sdlc.md`.)
- **Never eyeball a screenshot for a value.** On the rare occasion the
  owner hands over a Paper mock to match, pull exact values with
  `get_computed_styles`. Reconstructing screens from computed styles (no
  `get_jsx`) is what scrapped the Sprint 06 export.
- **Run explicit audit passes as named steps** before calling a
  multi-screen body of work done — not folded into "does it look right":
  (a) token hygiene (no raw hex; the only sanctioned exception is
  `--color-gold-brand`), (b) kit-coverage gaps (a pattern built 3× and
  not in the kit is a gap even when every instance works), (c) structural
  parity (column counts, header/footer alignment), (d) nothing bespoke
  that should be a kit component. Delegate large mechanical
  cross-referencing to a subagent with a narrow brief; tell it to
  **flag ambiguous cases, not guess**.
- **A written rule is not a checklist step.** When a bug recurs after
  the fix was documented, convert the rule into an item actually executed
  per screen/per instance, not "kept in mind".
- **Owner walkthrough per feature, not per milestone.** After a feature's
  frontend sprint, the owner drives it on `pnpm dev` as every role that
  touches it before it is called done. (M1's staff-wide FORBIDDEN wall
  would have been caught in minutes.)
- **Re-baseline plans, don't annotate them.** When a milestone's session
  sequence changes, rewrite the plan's session table to reflect reality
  and add one line to its changelog — never stack `> UPDATED` blocks.
- **Screenshot top-level artboards for verification**, not inner frames —
  an isolated inner node shows Paper's dark canvas and reads as a
  contrast bug that isn't one.
- **Ledgers, not stored totals** (also in `ARCHITECTURE.md`): stock and
  money balances are always derived by summing append-only rows.
  Corrections are new rows linked to the original, never overwrites, and
  a correction of a correction is rejected — compute the delta against
  `original + Σ existing deltas` so a double-submit is a no-op (M1
  finding F-1).
