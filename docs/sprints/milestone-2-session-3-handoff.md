# M2 Session 3 Handoff — Developer: Money Ledger + Customers & Credit (backend)

**Status:** DONE (2026-08-29). Delivered the `MoneySourceType` migration,
`lib/domain/financials` (money ledger), `lib/domain/customers`, the 5
routes, and 42 new tests (`pnpm test` 268/268; `tsc` 0; `build` clean).
See `docs/PROGRESS.md` → "M2 Session 3" for the full entry. **What
Sessions 4 / 5 need is in "Session Notes" at the bottom.**

**Role:** Developer (Development Sprint — backend only). One role this
session: `lib/domain` + `lib/validation` + `app/api` + tests + the doc
sections listed below. **No UI, no screens, no `components/**`.**

**Milestone plan:** `docs/sprints/milestone-2-plan.md` — read §1–§4 and
§7 "Allowed concurrency" in full. This handoff elaborates §4's "M2-F2 +
money ledger" bullet.

---

## 0. What this session delivers

The **money ledger** (`MoneyMovement` — the derived Cash / M-Pesa balance
substrate the whole rest of M2 writes to) and **Customers & Credit**
(`lib/domain/customers` — customers, derived credit balances, repayments).
Plus the one enum migration M2 needs.

This is the first of the three M2 backend sessions and it **unblocks the
other two** — Session 4 (Orders) and Session 5 (Canteen derived sales)
both write `MoneyMovement` rows, and a credit order needs a `Customer`.

---

## 1. Required reading (before any code)

- **`docs/sprints/milestone-2-plan.md`** §1 (scope), §2 (starting state —
  note the `MoneySourceType` migration), §3 (cross-cutting contracts —
  esp. #1 money ledger, #2 order money effect, #6 role scoping, #7 audit),
  §4 (backend outline), §7 (concurrency + hygiene).
- **`docs/DECISIONS.md`** — **ADR-17** (money is a *derived* ledger — sum
  `MoneyMovement`, never a stored balance), **ADR-19** (Customer / Debt /
  Repayment model), ADR-25 (every mutation writes `AuditLog`), ADR-29
  (`Africa/Nairobi` day boundary via `lib/time`), ADR-30 (Decimal money),
  ADR-15 (corrections are new rows — relevant if a repayment ever needs
  correcting; not in M2 scope but design the module so it *could*),
  ADR-27/28 (route handler contract, Zod validation).
- **`docs/CONVENTIONS.md`** §1 (folder structure), §3 (error shape), §4
  (correction pattern + `TODO(mock)`), §5 (money = Decimal; day boundary),
  §6 (working practices).
- **`docs/SCHEMA.md`** — the `MoneyMovement`, `Customer`, `Debt`,
  `Repayment` sections. **`docs/API.md`** — the response shape + how M1
  routes are documented (you add a "Customers & Credit" section).
- **The M1 code you mirror:**
  - `lib/domain/catalog/` — module shape: `index.ts` barrel, `errors.ts`
    (`DomainError` with an API `code`), `types.ts`, `test-helpers.ts`
    (per-file row-prefix namespacing), one file per operation.
  - `lib/domain/stock/derived-balance.ts` — how a derived quantity is
    computed by summing an append-only table. **Your `getAccountBalances`
    is the money analogue** — same "sum the rows, never store the total"
    shape.
  - `app/api/products/route.ts` — the route handler pattern: parse JSON →
    Zod `safeParse` → `requireApiRole*` → `try { domain call } catch
    (DomainError) → fail(code, msg, field)`. **No business logic in the
    handler.**
  - `lib/api/response.ts` (`ok` / `fail` / `ErrorCode`),
    `lib/api/require-role.ts` / `require-role-in.ts`, `lib/time/index.ts`
    (`toBusinessDate`, `businessDateStartUtc`, …).
  - `lib/validation/catalog.ts` — Zod schema style.

---

## 2. The migration (do this first)

`MoneySourceType` currently has only M1/M3 values (`handover_receipt`,
`expense`, `purchase_payment`, `owner_draw`, `owner_return`,
`account_transfer`). Add:

- **`order`** — a cash/M-Pesa Restaurant order's revenue movement (S4).
- **`repayment`** — a customer debt repayment (this session).
- **`canteen_sale`** — a Canteen derived-sale revenue movement (S5).

Add all three now even though S4/S5 consume two of them — one migration,
not three. It is a plain additive `ALTER TYPE "MoneySourceType" ADD VALUE
…` (Prisma generates this from the enum edit). No table changes.

**Dev-DB note (carried from M1):** the dev DB has no `_prisma_migrations`
history (built by `db push` every session). Create the migration file for
a real deploy, apply it locally with `prisma db push` or `migrate dev`
per what the dev DB accepts, and note in PROGRESS which you did.

---

## 3. `lib/domain/financials` — the money ledger

New module `lib/domain/financials/` (mirror `catalog/`'s file layout).

### `recordMoneyMovement(input, ctx)` — internal, not routed

Appends **one** `MoneyMovement` row. Signature roughly:

```
recordMoneyMovement({
  account: MoneyAccount,          // "cash" | "mpesa_bank"
  amount: Decimal,                // signed: +in, −out
  sourceType: MoneySourceType,    // "repayment" here; "order" / "canteen_sale" from S4/S5
  sourceId: string,               // the Repayment / Order / StockCount id
  occurredAt: Date,
  note?: string,
}, { tx, actorId })
```

- **Takes an optional Prisma transaction client** (`tx`) so S4/S5 can call
  it inside the same transaction that writes the `Order` / `StockCount`
  and its `StockMovement` rows — money and stock must commit together or
  not at all.
- Writes an `AuditLog` row (`entityType = "money_movement"`, `entityId =
  <new id>`, `action = "create"`, `actorId`).
- Returns the created row.
- **No `MoneyMovement` correction path in M2** — but keep the module
  shaped so a `correctMoneyMovement` (append an offsetting row linked via
  `correctsMovementId`, ADR-15) drops in later. Don't build it.

### `getAccountBalances(ctx?)` → `{ cash: Decimal, mpesaBank: Decimal }`

- Derived: `SUM(amount)` grouped by `account` over **all** `MoneyMovement`
  rows. **No stored total anywhere** (ADR-17). Prefer a single grouped
  aggregate query, not per-row JS.
- Decimal throughout (ADR-30) — return `Prisma.Decimal`, serialise to a
  string at the route boundary like M1 does.
- This is consumed by later-milestone financial screens; **M2 has no
  required screen for it**, but expose it + a read route so QA and the
  owner walkthrough can eyeball the ledger. `GET /api/money/balances`,
  Admin-only.

### Tests (`lib/domain/financials/*.test.ts`)

- `recordMoneyMovement` writes exactly one row with the right sign; an
  `AuditLog` row accompanies it.
- `getAccountBalances` over a hand-built set of rows (some cash, some
  mpesa_bank, mixed signs) returns the exact grouped sums; empty ledger →
  `{ cash: 0, mpesa_bank: 0 }`.
- Called inside a passed `tx` that then rolls back → no row persists
  (proves the transaction seam works for S4/S5).
- Decimal precision: a movement of `0.10` + `0.20` sums to exactly `0.30`
  (no float drift).

---

## 4. `lib/domain/customers` — Customers & Credit

New module `lib/domain/customers/`.

### `createCustomer({ name, phone }, ctx)` → Customer

- Trim + validate: `name` non-empty; `phone` non-empty (keep it lenient —
  Kenyan numbers vary; no format regex unless SCHEMA says so). No
  uniqueness constraint on phone unless the schema has one — check.
- `AuditLog` on create.

### `listCustomers({ search?, hasBalance? }, ctx)` → CustomerListRow[]

- Each row: `id`, `name`, `phone`, **`balance`** (derived — see below),
  `lastActivityAt` (max of the customer's debt/repayment `occurredAt`, or
  `null`).
- `search` matches name or phone (case-insensitive contains).
- `hasBalance` (bool) → only customers whose derived balance ≠ 0.
- **Derive the balance set-wise**, not per-customer-in-a-loop: one query
  summing `Debt.amount` grouped by `customerId`, one summing
  `Repayment.amount`, combine. `balance = Σ debts − Σ repayments`.

### `getCustomerLedger(customerId, ctx)` → { customer, entries[], balance }

- `entries`: debts and repayments interleaved, sorted by `occurredAt`
  (then `createdAt`), each `{ kind: "debt" | "repayment", amount, occurredAt,
  orderId? , runningBalance }`.
- `runningBalance` accumulated in order: `+amount` for a debt, `−amount`
  for a repayment.
- `NOT_FOUND` `DomainError` if the customer doesn't exist.

### `recordRepayment({ customerId, amount, account, occurredAt?, note? }, ctx)` → Repayment

- `amount` > 0 (`VALIDATION_ERROR`, field `amount` otherwise). Decimal.
- `account` ∈ `MoneyAccount` (`cash` | `mpesa_bank`).
- `occurredAt` defaults to now; its business day is *not* gated in M2
  (no Day Close) — but stamp it so M3 can.
- **In one transaction:** create the `Repayment` row **and** call
  `recordMoneyMovement({ account, amount: +amount, sourceType:
  "repayment", sourceId: repayment.id, occurredAt })` **and** an
  `AuditLog` row.
- **Does not** require the repayment to be ≤ the outstanding balance —
  overpayment is allowed (creates a negative balance = credit in hand);
  note this in the flow doc handoff for Session 1 / QA. If the owner
  wants it blocked, that's a flag, not a silent choice.
- Role: **Admin or Cashier** (`requireApiRoleIn(["admin", "cashier"])`).

### `Debt` creation

- `Debt` rows are written by **`createOrder`** (Session 4) when
  `paymentMethod === "credit"`, not by this module. This session only
  **reads** `Debt` (for balances / ledger). Don't build order logic here.
  If you want a thin internal `recordDebt({ customerId, orderId, amount,
  occurredAt }, { tx })` helper in `lib/domain/customers` for S4 to call,
  that's fine and probably cleaner than S4 reaching into Prisma directly —
  your call; if you add it, test it and document it for S4.

### Routes (`app/api/customers/**`)

| Route | Method | Role | Body / query → domain |
|---|---|---|---|
| `/api/customers` | GET | admin, cashier | `?search=&hasBalance=` → `listCustomers` |
| `/api/customers` | POST | admin, cashier | `{ name, phone }` → `createCustomer` → 201 |
| `/api/customers/:id` | GET | admin, cashier | → `getCustomerLedger` |
| `/api/customers/:id/repayments` | POST | admin, cashier | `{ amount, account, occurredAt?, note? }` → `recordRepayment` → 201 |
| `/api/money/balances` | GET | admin | → `getAccountBalances` |

Each handler follows `app/api/products/route.ts` verbatim in shape. Zod
schemas in `lib/validation/customers.ts` (+ `lib/validation/money.ts` if
you want the balances route typed, though it has no input).

**Cashier data scoping:** a Cashier may see the full customer list and
balances and record repayments (PRD §4.6 — "As the Admin or Cashier, I
can record a repayment"). Nothing customer-side is per-cashier. Buying
price / margin never appears in any customer payload anyway.

### Tests (`lib/domain/customers/*.test.ts` + route tests)

- `createCustomer` trims, rejects empty name/phone.
- `listCustomers`: balance = Σdebts − Σrepayments, computed set-wise;
  `hasBalance` filter; search on name and phone; `lastActivityAt`.
- `getCustomerLedger`: interleave order, running balance, `NOT_FOUND`.
- `recordRepayment`: writes `Repayment` + a `+amount` `MoneyMovement`
  (`sourceType: "repayment"`, `sourceId` = repayment id) + `AuditLog`, all
  in one tx; a rejected `amount ≤ 0`; overpayment allowed → negative
  balance; `getAccountBalances` reflects the repayment.
- Route tests (mock `getServerSession` like M1's
  `app/api/products/route.test.ts`): `cashier` session → 200 on the GETs
  and 201 on POST repayment; an unauthenticated session → 401; a
  `store_manager` → 403 on all customer routes; `/api/money/balances` →
  403 for non-admin.
- Use a `test-helpers.ts` with a per-file prefix (`__customers_test__…`),
  cleaning up only its own rows — copy `lib/domain/catalog/test-helpers.ts`.

---

## 5. Docs to update this session

- **`docs/SCHEMA.md`** — the `MoneySourceType` enum (3 new values) and a
  line under `MoneyMovement` that it is now written for `repayment`
  (M2), with `order` / `canteen_sale` reserved for S4/S5.
- **`docs/API.md`** — a new "Customers & Credit" section (the 4 routes)
  and a "Money" line for `GET /api/money/balances`. Match the existing
  camelCase request/response style.
- **`docs/PROGRESS.md`** — a Session 3 entry under "Milestone 2" (what
  shipped, the migration, test counts, anything flagged). **Rebase before
  writing it** — Session 1 may have added its own entry in parallel
  (plan §7 hygiene).
- **`docs/sprints/milestone-2-plan.md`** §7 — mark Session 3 status; §10
  changelog line only if something about the sequence changed.
- **This file** — set the status line to `DONE` and note anything Session
  4 needs (esp. the `recordMoneyMovement(tx)` seam and any `recordDebt`
  helper you added).

---

## 6. Guardrails for this session (from plan §8)

- **Every endpoint's role access is explicit and tested** (guardrail 6) —
  admin-only vs admin+cashier, and a negative test for a role that must
  be refused.
- **Ledgers, not stored totals** (CONVENTIONS §6) — `getAccountBalances`
  and `listCustomers.balance` are both derived; there is no balance column
  to write. If you find yourself adding one, stop.
- **No UI decisions.** If something about a screen's needs is unclear,
  that's Session 1's / Session 6's problem — note it, don't design it.
- **Money is Decimal end to end** (ADR-30) — `Prisma.Decimal` in the
  domain, string at the route boundary. No `number`.
- Every mutation writes `AuditLog` (ADR-25).

## 7. Gates (definition of done)

- `pnpm tsc --noEmit` → 0.
- `pnpm build` → clean.
- `pnpm test` → green, with the new domain + route suites added and the
  existing 226 untouched (don't weaken any).
- The migration file committed; PROGRESS notes how it was applied to the
  dev DB.
- `lib/domain/financials` + `lib/domain/customers` barrels (`index.ts`)
  export the public surface; route handlers import only from the barrel.
- `grep -rn "TODO(mock)"` in the new modules → none (nothing is deferred
  here; the M1 `purchases.ts` `TODO(mock)` is S4's to resolve when the
  order path writes its money movement, not this session's).

---

## 8. Explicitly NOT this session

- `createOrder` / order routes / `Debt` *writing* / stock deduction — S4.
- `recordStockCount` / canteen derivation / `canteen_sale` movements — S5.
- Any screen, hook, or `components/**` file — S6.
- Day Close / handover / expenses / owner draws — M3.
- A `correctMoneyMovement` or `correctRepayment` path — later; just leave
  the module shaped for it.

---

## Session Notes

- **Migration applied via:** `prisma db push` (dev DB has no
  `_prisma_migrations` history — built by `db push` every session, per
  M1). Migration file `prisma/migrations/20260829130000_add_m2_money_source_types/`
  committed for a real deploy. Ran `prisma generate` after.
- **`recordDebt` helper added? YES.** `lib/domain/customers/record-debt.ts`,
  exported from the barrel. Signature:
  `recordDebt({ customerId, orderId, amount: Prisma.Decimal, occurredAt: Date }, { tx })`
  — **tx-only** (throws if you don't pass a `TransactionClient`). It
  `create`s one `Debt` row and nothing else (no money movement — a credit
  order writes a `Debt`, not a `MoneyMovement`; no `AuditLog` — the order's
  own audit entry covers it, and the debt is self-evident from its order).
  Rejects a non-positive amount (`VALIDATION_ERROR`, field `amount`).
  Tested in `lib/domain/customers/record-debt.test.ts` (append inside a
  tx, rollback with the tx, reject ≤ 0).

### For Session 4 (Orders)

- **Money seam:** `import { recordMoneyMovement } from "@/lib/domain/financials"`.
  Call it **inside** your `createOrder` `prisma.$transaction(async (tx) => …)`
  with `{ actorId, tx }` so the `Order` + `OrderLine[]` + `Sale`
  `StockMovement[]` + the `MoneyMovement` all commit atomically. For a
  Cash/M-Pesa order: `sourceType: "order"`, `sourceId: order.id`,
  `account:` the matching account, `amount:` `+total` (positive = money
  in), `occurredAt:` the order's `occurredAt`.
- **Credit order:** write **no** `MoneyMovement`. Instead
  `import { recordDebt } from "@/lib/domain/customers"` and call it with
  your `tx`; `customerId` is required (§3.2 — 400 otherwise).
- **The M1 `purchases.ts` `TODO(mock)`** (a `purchase_payment` should also
  debit Cash/M-Pesa) is **S4's** to resolve, per the plan — the seam
  (`recordMoneyMovement` with `sourceType: "purchase_payment"`,
  `sourceId` = the stock-movement id) now exists. `flow-4`'s test was
  rescoped this session to check "no money row linked to *this* payment"
  rather than a global count, so it won't block you.
- **AuditLog pattern:** M1 domain modules didn't write `AuditLog`;
  M2 requires it (ADR-25). See `lib/domain/financials/record-money-movement.ts`
  and `lib/domain/customers/record-repayment.ts` for the shape
  (`entityType`, `action: "create"`, `userId`, `newValue`, `occurredAt`).
  Note: `AuditLog.userId` RESTRICTs — test-helpers must delete audit rows
  before their users (see `lib/domain/customers/test-helpers.ts`).

### For Session 5 (Canteen derived sales)

- Same money seam: `recordMoneyMovement` inside your `recordStockCount`
  transaction — `sourceType: "canteen_sale"`, `sourceId:` the
  `StockCount` id, `account: "cash"` (plan §3.5), `amount:`
  `+(sold × canteen selling price)`.

### Flags / escalations

- **Overpayment (repayment > outstanding balance): allowed** → the derived
  balance goes negative (credit in hand). Deliberate per this handoff §4.
  **Session 1** should reflect this in `customers-credit-flow.md`; **QA**
  should treat "can I overpay?" as expected-yes unless the owner changes
  it. Not blocked in code.
- No other escalations.
