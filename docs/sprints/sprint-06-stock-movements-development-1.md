# Sprint 06 — Store & Stock Movements (Development Part 1: Core Ledger + Payment/Receipt)

**Type:** Development Sprint
**Milestone:** 1 — The business exists in the system
**Feature:** Store & Stock Movements (PRD §4.2)
**Status:** not started

---

## Scope

Find the `TODO(mock)` markers for the purchase payment/receipt pair left
by Sprint 05 and replace them with real logic — these two are linked and
most complex (matching, variance), so they anchor the first Development
Sprint. Also implements the generic correction pattern that every later
movement type reuses. No new UI/UX decisions in this sprint; a design
question not answered by the approved Paper.design screens or flow doc
goes back to a design sprint rather than being decided here.

- `StockMovement` Prisma model usage; signed-sum stock calculation
  function (current stock for a product/location).
- `POST /api/stock-movements` for `purchase_payment` (Admin-only, writes
  a `MoneyMovement` too, no stock effect) and `purchase_receipt` (Store
  Manager/Attendant, updates stock, optional `purchase_payment_id`
  link).
- `GET /api/stock-movements/outstanding` — payments awaiting receipt,
  receipts without a matching payment.
- Variance surfacing when receipt quantity ≠ payment quantity
  (display-only, no auto-adjust to the payment record).
- Correction pattern (`POST /api/stock-movements/:id/correct`)
  implemented generically here.
- Audit log writes.

## Acceptance Criteria

- Signed-sum stock calculation correct across mixed movement types in a
  test fixture.
- Purchase payment writes a `MoneyMovement` and zero stock change;
  receipt updates stock regardless of whether a payment exists.
- Outstanding view correctly lists unmatched payments and unmatched
  receipts.
- Correction endpoint computes delta correctly and is Admin-only when
  the movement's date is closed, original-recorder-only when same-day
  and open.
- **Tests:** unit tests for the signed-sum stock calc, payment/receipt
  independence, correction delta computation, and outstanding-matching
  logic.
- Approved UI from Sprint 05 unchanged.
