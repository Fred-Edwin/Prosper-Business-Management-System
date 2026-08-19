# Prosper — Test Plan (Strategy)

**Status:** Approved. This document covers testing **strategy** only —
which categories of functionality need which kind of coverage, and why.
Detailed test cases are written per-sprint against the features being
built that sprint.

**Tooling:** Vitest for unit tests, Playwright for end-to-end tests. See
`DECISIONS.md` ADR-35.

---

## Guiding principle

Test investment should match risk, not code volume. This system's entire
value proposition is trustworthy numbers (PRD §1) — so the ledger math and
reconciliation logic are the highest-risk, highest-value area to test
thoroughly. UI presentation is comparatively low-risk: a misaligned button
is an inconvenience; a wrong variance calculation is the product failing
at its one job.

---

## 1. Unit tests (Vitest) — ledger & reconciliation math

**Coverage: thorough, non-negotiable.** This is where correctness bugs are
most damaging and least visible (a wrong number looks exactly like a right
number until someone catches it — potentially weeks later).

Applies to `lib/domain/*` functions, in isolation from HTTP/UI:

- **Stock ledger sums** — current stock = correct signed sum across all
  `movement_type`s, including after corrections.
- **Canteen derived-sale formula** —
  `opening + received − non_sale_consumption − counted = sold`, including
  edge cases: first-ever count for a product, a count with zero elapsed
  activity, overlapping transfers/production between counts.
- **Handover variance** — declared vs. received, both directions (shortfall
  and overage), and that a stored variance does *not* silently recalculate
  when unrelated records change.
- **Money ledger balances** — Cash at hand / M-Pesa derived sums across
  handovers, expenses, purchase payments, owner draws/returns, account
  transfers.
- **Correction-delta computation** — given an original value and a
  user-entered "correct" value, the system computes the right delta and the
  derived total reflects it correctly, for every correctable entity (stock,
  orders, handovers, expenses).
- **Monthly pay calculation** — daily_rate × days_present, netted against
  advances/deductions, across partial months and mid-month staff changes.
- **Hard-delete guard** — blocked whenever linked history exists; allowed
  only when it doesn't.
- **Day-close locking** — records dated to a closed day reject staff edits
  and require the Admin correction path; records on an open day accept
  direct staff edits.
- **Business-day boundary logic** — date calculations use the fixed
  business timezone constant, not server-local time (guards against the
  Frankfurt-hosting scenario discussed during design).

Why unit-level specifically: this logic is pure calculation over data,
easy to test exhaustively with many input combinations without needing a
running server or database — the fastest, cheapest way to get high
confidence in the part of the system that matters most.

---

## 2. End-to-end tests (Playwright) — critical multi-step flows

**Coverage: the handful of flows where multiple modules must work
together correctly, across a real request/response/database cycle.**

- **Order → stock deduction** — placing a Restaurant order actually reduces
  stock and, for credit orders, creates a `Debt`.
- **Canteen stock count → derived sale → stock update** — full cycle from
  count entry to updated ledger.
- **Handover → receipt → variance → money ledger** — staff declares,
  Admin receives, variance is stored, Cash/M-Pesa balances update
  correctly.
- **Purchase payment + receipt reconciliation** — payment recorded without
  receipt (and vice versa) surfaces correctly as outstanding; a receipt
  with a differing quantity shows the variance without altering the
  payment record.
- **Day close → lock → correction path** — closing a day blocks direct
  staff edits and routes any further change through the Admin correction
  flow, with the audit trail capturing it.
- **Role-scoped access** — a Cashier cannot see another Cashier's orders or
  any buying price/margin field, end to end through the API.
- **Hard-delete guard, end to end** — attempting to hard-delete a product
  with linked orders is rejected with the correct error; a product with no
  history can be hard-deleted.

Why end-to-end specifically: these flows cross module boundaries (stock +
sales, handovers + money, staff + audit) — the risk here isn't any single
function being wrong, it's the *handoff* between modules being wrong,
which only a real request-through-database test can catch.

---

## 3. What's explicitly not a testing priority

- **UI visual/layout correctness** — not covered by automated tests;
  verified manually during feature review (per the project's general
  practice of testing UI changes in a live browser before calling them
  done).
- **PWA installability mechanics** — manually verified occasionally, not
  part of the automated suite; low complexity, low change-frequency once
  set up.
- **Third-party integrations** (Auth.js, Vercel Cron — not used per
  ADR-11) — trusted at the library level, not re-tested.

---

## 4. Where this fits in the workflow

- Ledger/domain unit tests are written alongside the domain function they
  cover, in the same sprint — not deferred.
- End-to-end tests are added once a flow is feature-complete enough to run
  start to finish; sprint-level detailed test cases (specific inputs,
  specific assertions) are defined at that time, not here.
- `TODO(mock)` locations (see `CONVENTIONS.md` §4) are not considered
  test-complete until the mock is replaced and covered by the appropriate
  category above.
