# Scope note — Cash Flow Statement (client feedback item #7)

Written 2026-09-23, for the session that implements this. See
`docs/PROGRESS.md` entry "Dashboard / Canteen Sales / Customer History UX
batch (2026-09-22)" for the full triage session this came out of.

Client feedback: she wants a **Cash Flow Statement / History** — a report
showing money moving in and out over time, so the current "Total Business
Liquidity" balance on the Dashboard is explained, not just stated as a
single live number.

## What already exists (don't rebuild this)

- Every cash-affecting event is already a `MoneyMovement` row, written
  append-only — handovers received, expenses, purchase payments, owner
  draws/returns, repayments, etc. (`lib/domain/financials`, `lib/domain/
  handovers`, `lib/domain/customers`). This is a **reporting task**, not
  a new ledger.
- The Dashboard (`/admin`, `app/admin/dashboard-client.tsx`) shows the
  live snapshot: Total Business Liquidity, Cash at hand, M-Pesa/Bank,
  Owed back by owner — see `GET /api/admin/dashboard` (`docs/API.md`
  "Dashboard" section) for the `position` band shape.
- Financials (`/admin/financials`, `app/admin/financials/*`) already has
  the period-picker (`useAdminDateRange` / `<AdminDateRangeControl>`,
  Today/Week/Month/Custom) and a `Transactions` section split into tabs
  by type (Stock Purchases / Deliveries / Handovers / Expenses / Owner
  Draws / Non-Sale Consumption) — see `app/admin/financials/*-tab.tsx`
  for the tab pattern to copy.

## What to build

A **new tab inside the existing Financials page** (not a new route) —
"Cash Flow" — sitting alongside the existing transaction-type tabs.
Client confirmed this placement directly (not a standalone screen). It
should:

- Read the SAME `MoneyMovement` rows the other tabs already read, but
  present them **unified and chronological** across all types, each
  tagged inflow/outflow, with a running balance column — instead of
  split by type.
- Split by account (Cash vs M-Pesa/Bank), mirroring the two balances
  already tracked everywhere else in the app (`AccountType` /
  `cash` | `mpesa_bank`).
- Use the page's existing period-picker — same pattern as every other
  Financials tab.
- The running balance for the period must start from the TRUE opening
  balance as of the start of the range (not zero) — check how
  `getAccountBalances` / `getFinancialSummary`'s balance-as-of-instant
  logic works (`lib/domain/financials`, ADR-57 in `docs/DECISIONS.md`)
  and reuse that, don't re-derive it differently. This is the same
  "balance vs flow" split `app/admin/use-date-range.ts`'s header comment
  already documents — read that comment before designing the query.

## Explicitly NOT in scope

- No schema change.
- No new domain-writing logic — this is a read/report only.
- No new page/route — it's a tab, not a new screen.

## Before writing code

1. Read `docs/CONVENTIONS.md` and the Financials section of `docs/API.md`
   and `docs/SCHEMA.md`.
2. Read one sibling tab fully (e.g. `app/admin/financials/expenses-tab.tsx`
   or similar) to copy its structure, kit usage, and hook shape exactly.
3. Design the domain read function's shape and the API route contract
   FIRST (a short note in the PR description is enough — this project is
   in maintenance mode, no milestone docs) before touching the screen.

## Ship per the normal fix loop

Domain function + API route (thin handler, per CLAUDE.md's non-negotiable
rules) + screen tab + a test next to the domain function and a
`tests/screens/*.screen.test.tsx` addition for the new tab. Keep
`pnpm test && pnpm typecheck && pnpm build` green. Add one entry to
`docs/PROGRESS.md` when done.
