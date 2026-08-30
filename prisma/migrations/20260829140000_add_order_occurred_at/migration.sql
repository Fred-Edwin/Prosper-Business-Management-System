-- M2 Session 4 (Orders): the Restaurant order gains an `occurred_at`
-- business instant, matching every other ledger table (stock_movement,
-- stock_count, money_movement, debt, repayment, expense…). It is what the
-- edit-vs-correct gate compares to today's Africa/Nairobi business date
-- (M2 soft check; M3 swaps in the real DayClose lookup), and a correction
-- backdates its correcting row to the original's `occurred_at` so the
-- correction lands in the same business day as what it corrects (ADR-15).
--
-- Additive, single column, NOT NULL with a default so existing rows (if
-- any) take their creation time. No data migration needed on the
-- db-push-only dev DB; this file is for a real deploy.

ALTER TABLE "order"
  ADD COLUMN "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
