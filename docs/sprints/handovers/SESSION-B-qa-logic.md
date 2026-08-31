# HANDOVER — Session B · M2 Session 7 QA Sprint (QA Engineer role)

**Paste this whole file as your first message in a fresh session.**
**This session runs in PARALLEL with Session A (Design) — you touch
different files, no coordination needed. Work on a branch.**

---

## 0. Context and urgency

The Prosper project is **overdue**; the client is waiting. We are pushing
to ship **Milestone 2 ("staff can sell every day")** as Submission 1.
M2 is code-complete and all 416 tests are green — but it has **never had
its adversarial QA pass**. That is this session: **M2 Session 7, the QA
Sprint.**

An orchestrator session holds the master plan. Your job is **the QA
Sprint, this session only**. **You are the QA Engineer this session and
nothing else** (`CLAUDE.md`): the pass is adversarial — check the feature
against its acceptance criteria, the approved design, and the flow docs;
**try to break it; report all findings BEFORE fixing anything.** Then fix
with regression tests once the human relays the go-ahead (or fix
immediately if a finding is trivially safe and clearly in scope — use
judgment, but the report comes first).

Do **not** do screen-fidelity work — a separate Design sprint owns that.
Your focus is **logic, data integrity, and acceptance-criteria
conformance**, plus any functional (not cosmetic) screen bug.

## 1. Mandatory reading before you touch anything

In this order (`CLAUDE.md` hard requirement):

1. `docs/sprints/milestone-2-plan.md` — whole thing. Especially:
   - §1 scope, §3 **cross-cutting contracts** (these are your assertions),
   - §7 session table — **NOTE IT IS STALE**: it says 6d/7 pending, but
     6d + 6e are merged to `main` (commits `823c205`, `47886b5`). The
     orchestrator fixes §7 later — don't.
   - §7 "Highest-stakes QA targets" block,
   - §9 "Definition of done for Milestone 2".
2. `docs/CONVENTIONS.md` — error shape, the correction-entry pattern, the
   `TODO(mock)` convention, §6 working practices.
3. `docs/TEST_PLAN.md` — the testing strategy and what each layer covers.
4. `docs/API.md` and `docs/SCHEMA.md` — the sales / customers / money
   sections.
5. `docs/DECISIONS.md` — ADR-15 (corrections are new rows), ADR-16
   (orders & derived sales), ADR-17 (money as derived ledger), ADR-19
   (customers/debt/repayment), ADR-24 (day close boundary), ADR-25
   (audit log), ADR-29 (Africa/Nairobi day), ADR-30 (Decimal money).
6. The three M2 flow docs: `docs/design/flows/restaurant-sales-flow.md`,
   `customers-credit-flow.md`, `canteen-derived-sales-flow.md`.
7. `docs/PROGRESS.md` — the M2 Session 6a–6e entries (what was built,
   and the "flow-doc-vs-behaviour deltas for QA" notes left explicitly
   for you, e.g. in the 6c entry).

## 2. Scope of this QA pass — M2 features

| Feature | PRD | Acceptance criteria to verify against |
|---|---|---|
| M2-F1 Restaurant Sales (Orders) | §4.3 | Cashier creates order (lines, type Dine-in/Takeaway/Delivery, delivery fee, payment Cash/M-Pesa/Credit). Edits own order **only while day open** (soft check: order business day == today, Africa/Nairobi). Corrections are **append-only** rows, never deletes/overwrites. Cashier **cannot** see other cashiers' orders, buying prices, or margins. |
| M2-F2 Customers & Credit | §4.6 | Customer (name, phone). Credit balance **derived** from Σ debts − Σ repayments, never stored. Admin or Cashier records a repayment (writes a `MoneyMovement`). A Credit order attaches to a Customer and creates a `Debt`; `customerId` required (400 otherwise). No supplier credit. |
| M2-F3 Canteen Derived Sales | §4.4 | Attendant does a stock count anytime. System derives units sold + revenue for the period since that product's **last count**, sets closing stock to counted value. Writes a `sale` `StockMovement` + a revenue `MoneyMovement` (account = Cash). No credit at canteen. Admin sees per product: last-counted time + the period a figure covers. Counted-more-than-expected is **rejected** (owner override); same-day `voidStockCount` hard-delete undo exists. |

## 3. The attack list — highest-stakes targets (break these)

From plan §7. For each, write a failing scenario if you find one, or a
passing note with the evidence (a test you added, a repl calc):

1. **Money-ledger integrity.** `Cash at hand` and `M-Pesa/Bank` balances
   must equal Σ `MoneyMovement` for that account — no stored total
   anywhere. Try: create cash order → balance moves by exactly the order
   total. M-Pesa order → M-Pesa account only. Credit order → **no**
   `MoneyMovement`, a `Debt` instead. Repayment → `MoneyMovement` in the
   repayment's account. Canteen derived sale → Cash `MoneyMovement` for
   `sold × canteen price`. Sum everything, reconcile.
2. **Order corrections don't double-count or lose stock/money.** Correct
   a posted (past-day) cash order: there must be an offsetting
   `StockMovement` (stock returns) AND an offsetting `MoneyMovement` (or
   `Debt` reversal for credit). Original row untouched. Net effect of
   (original + correction) on balances and stock = the corrected state,
   not zero and not double. Try correcting a correction. Try correcting
   twice. Confirm F-1 idempotency held (M1 finding — corrections must not
   stack).
3. **Credit balances derive correctly.** Multiple debts + partial
   repayments + an overpayment (plan notes overpayment is *allowed and
   flagged* — verify it's flagged, not silently absorbed). Correct a
   credit order → the `Debt` must reverse so the customer's derived
   balance is right.
4. **Canteen derived-sales math exact across a period boundary.** Two
   counts with transfers-in + production + non-sale consumption between
   them. `sold = opening + received − non_sale_consumption − counted_remaining`
   over the period since the previous count. Hand-work a ledger and
   assert the derivation matches to the cent. Check the very first count
   (no previous count) path. Check `voidStockCount` fully reverses the
   `sale` movement + the revenue `MoneyMovement` and only same-day.
5. **Cross-cashier isolation.** Cashier A cannot GET, edit, or correct
   Cashier B's order (403/404, and not present in A's list). Admin sees
   all.
6. **No buying-price / margin leak to a Cashier.** No `buyingPrice`,
   unit cost, margin, profit, or "buying price" string in any Cashier API
   response or Cashier screen (C1–C6). Mirror the M1 `listProducts`
   non-admin strip. Grep the screen files and assert in a test.
7. **Day-boundary correctness (Africa/Nairobi, ADR-29).** An order
   created at 23:30 Nairobi is "today"; at 00:30 the next day it's not,
   and the Cashier can no longer edit it — the change must route to the
   Admin correction path. Never use server-local time. Check `lib/time`
   is used everywhere a day boundary matters.
8. **Audit log (ADR-25).** Every domain mutation (create/edit/correct
   order, record/void stock count, record repayment, create customer)
   writes an `AuditLog` row with actor + action + target.
9. **Route-handler purity.** `app/api/*` handlers: parse → Zod validate →
   auth/role/ownership → call `lib/domain/*` → standard response shape.
   No business logic in handlers. Spot-check the M2 routes.
10. **Standard error shape** on every M2 endpoint (per CONVENTIONS.md) —
    validation errors name the offending field; the §3.8 insufficient-
    stock rejection names the short line(s) and available qty and writes
    **no** rows.

Also work the **flow docs** screen by screen (the "walkthrough" sections)
and the **known deltas** PROGRESS left for you (C4 corrected-banner omits
Admin name/timestamp — data-shape gap; "Correct this (Admin)" fires a
toast not a modal; QuantityStepper uses kit size not artboard 30px). For
each: is it acceptable as-is, or a finding?

## 4. Method

- `pnpm test` (Vitest, jsdom + RTL — see guardrail 2 in plan §8: **no
  headless-browser e2e**, don't add Playwright). Baseline is **416/416,
  64 files**. `pnpm tsc --noEmit` → 0. `pnpm build` → clean.
- Add adversarial unit/integration tests in the existing style under
  `lib/domain/**/*.test.ts` and `app/api/**/*.test.ts`; screen-level
  functional assertions under `tests/screens/*.screen.test.tsx`.
- `vitest.config.ts` has `maxWorkers: 4` (Postgres connection ceiling) —
  keep it.
- For math checks, a scratch script under the scratchpad dir is fine;
  don't leave it in the repo.
- You may run `pnpm dev` and poke the API with curl for exploratory
  checks, but the durable artifact is a test.

## 5. Deliverables (this session)

1. **A findings report** — write it to
   `docs/sprints/milestone-2-session-7-qa-report.md`. Per finding:
   ID, severity (High / Medium / Low), feature, the exact
   scenario/inputs, expected vs actual, evidence, and proposed fix.
   Order by severity. **This is written before any fix.**
2. **Fixes** for everything safe and in M2 scope, each with a regression
   test that fails before / passes after. Anything risky, ambiguous, or
   smelling like a design decision → leave as a finding and flag for the
   orchestrator, don't fix.
3. **Gates green** after fixes: `pnpm test`, `pnpm tsc --noEmit`,
   `pnpm build`, and (if any kit file was touched — it shouldn't be)
   `pnpm test:visual` + `pnpm test:a11y`.
4. **A summary for the human to carry to the orchestrator**: findings
   count by severity, what was fixed vs deferred, new test count, gate
   status, and any decision you need the orchestrator to make.
5. Do **not** update `docs/PROGRESS.md` §7 table or `ROADMAP.md` —
   the orchestrator reconciles those (§7 is stale and being re-baselined
   centrally). You *may* add your Session 7 entry text to the QA report
   doc so the orchestrator can paste it into PROGRESS.

## 6. Guardrails / Do NOT

- Don't do cosmetic screen-fidelity work — that's the Design sprint's
  job. A **functional** screen bug (wrong data, broken action, missing
  guard) IS yours.
- Don't touch `components/kit/*` unless a kit bug is the actual finding —
  if so, that needs the full ADR-42 gate and probably an orchestrator
  escalation.
- Don't add app-level Playwright/e2e.
- Don't refactor for taste. Minimal, targeted fixes with tests.
- Don't work on Milestone 3 anything.
- Branch off `main`. Don't merge to `main` — the orchestrator sequences
  the final PR.
