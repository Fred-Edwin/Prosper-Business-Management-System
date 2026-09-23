# Scope note — Canteen goods sold on credit (client feedback item #4)

Written 2026-09-23, for the session that implements this. See
`docs/PROGRESS.md` entry "Dashboard / Canteen Sales / Customer History UX
batch (2026-09-22)" for the full triage session this came out of.

Client feedback: she wants an option for **canteen goods sold on
credit** — the Canteen Attendant should be able to let a customer take
goods now and pay later, tracked against their account, the same way a
Restaurant Cashier can today.

## Why this is a real feature, not a field addition

Read `docs/PRD.md` §4.4 first — canteen sales are explicitly **not**
transaction-based. The Canteen Attendant does a periodic **stock count**;
the system infers "N units must have sold since the last count" from the
delta (`lib/domain/sales/derived-sales.ts`, `record-stock-count.ts`).
There is no cashier flow, no per-sale entry, no payment-method field, no
customer link anywhere in that path — see `lib/domain/sales/
canteen-guards.ts`, which currently has no concept of credit at all.

Restaurant credit works (`lib/domain/sales/create-order.ts` — Cashier
picks Payment: Credit, attaches a `Customer`, creates a `Debt` via
`lib/domain/customers/record-debt.ts`) because it's a **discrete,
real-time transaction**. Canteen credit needs the same thing — a
discrete transaction — but the canteen currently has no such flow for
ANY payment method; it only has the periodic count.

## Recommended design direction (confirm/adjust with the client first)

Keep the stock-count-derived flow unchanged for cash sales (it works,
don't touch it). Add a **new, separate "Record credit sale" action** at
the canteen — the attendant picks the product, quantity, and an existing
`Customer`, at the moment the credit sale happens:

- Creates a `Debt` against the customer (reuse `lib/domain/customers/
  record-debt.ts` — same path Restaurant credit orders use).
- Reduces canteen stock **immediately** via a real `StockMovement`
  (`sale` type, at the canteen), NOT waiting for the next stock count —
  otherwise the next count's derived-sale math would double-count this
  sale as "missing" stock explained by nothing.
- Must NOT create a normal Restaurant `Order` row (canteen sales aren't
  Orders) — needs its own lightweight record, or extend the existing
  Debt/StockMovement pairing with whatever minimal linkage
  `derived-sales.ts`'s math needs to stay correct once a credit sale has
  already accounted for some of the "missing" units.

## Open question to raise with the client before finalizing scope

Item #2 from the same feedback session asked for an "Unpaid" declared
option at handover — that may be describing this exact same underlying
need (canteen credit) from the staff-declaration side rather than a
separate concept. Confirm with the client whether these are the same
feature or genuinely different before scoping the schema, so this isn't
built twice from two angles.

## Before writing code

1. Read `docs/PRD.md` §4.4 (Canteen Sales) and §4.6 (Customers & Credit)
   in full.
2. Read `lib/domain/sales/derived-sales.ts`, `record-stock-count.ts`,
   and `canteen-guards.ts` — understand exactly how the derived-sale math
   works before adding anything that changes what "units sold since last
   count" means.
3. Read `lib/domain/sales/create-order.ts`'s credit-order path (Restaurant
   side) as the sibling to mirror for the Debt-creation part.
4. Write a short design note (schema, domain functions, API surface, the
   attendant-facing screen, and the correction/void path per ADR-72 —
   a ledger-row create path ships with its correction path in the same
   PR) before touching code. This is the biggest of the four deferred
   items — plan for it to possibly span more than one sitting.

## Ship per the normal feature loop

Schema change (if needed) → domain functions (`recordCanteenCreditSale`
+ its `correct`/`void` pair) → API route → Canteen Attendant screen
(compose from the frozen kit, follow a sibling flow under
`app/canteen/flows/*`) → tests (`*.test.ts` next to each domain function,
a `tests/screens/*.screen.test.tsx` for the new screen). Keep
`pnpm test && pnpm typecheck && pnpm build` green. Update
`docs/DECISIONS.md` (this changes a contract — canteen credit was
explicitly out per PRD §4.4) and add an entry to `docs/PROGRESS.md`.
