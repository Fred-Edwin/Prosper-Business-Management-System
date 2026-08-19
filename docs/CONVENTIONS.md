# Prosper — Conventions

**Status:** Approved. Governs folder structure, naming, error handling, and
the correction-entry pattern used throughout the codebase.

---

## 1. Folder Structure

```
prosper/
├── app/
│   ├── (admin)/               # Admin-only screens
│   ├── (store-manager)/       # Store Manager screens
│   ├── (cashier)/             # Cashier screens
│   ├── (canteen)/             # Canteen Attendant screens
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

During design/build sprints, any place where real integration is
deliberately deferred (e.g., a report screen built against fixture data
before the underlying query is wired up, or a notification stubbed instead
of sent) must be marked:

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
