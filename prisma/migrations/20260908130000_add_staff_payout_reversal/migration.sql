-- First-class Staff Payout reversal (ADR-73, per ADR-72's deferred list).
--
-- A reversal does NOT get its own `corrects_staff_payout_id` lineage: a
-- payout's entire money/profit effect lives in its linked Salaries
-- `Expense`, and `reversePayout` writes the offsetting `Expense` delta
-- row (`amount` = −netPaid) + paired `MoneyMovement` there (the same
-- transaction body `correctExpense` uses — that fn rejects "0.00", so it
-- can't be called directly). This migration adds ONLY `reversed_at` so
-- "is this month payable again?" is a real column, not inferred from the
-- Expense's derived amount being zero.
--
-- The `@@unique([staffId, month])` becomes a PARTIAL unique index that
-- counts only LIVE (non-reversed) payouts, so a reversed staff-month can
-- be paid again. Prisma has no partial-index syntax, so the schema drops
-- `@@unique` to a plain `@@index` and this migration replaces the index
-- by hand; `payStaff` / `getStaffPay` also filter `reversed_at IS NULL`
-- in code (the DB partial index is the race backstop, as before).

-- AlterTable
ALTER TABLE "staff_payout" ADD COLUMN "reversed_at" TIMESTAMP(3);

-- DropIndex (the unconditional unique — replaced by the partial one below)
DROP INDEX "staff_payout_staff_id_month_key";

-- CreateIndex (non-unique, for the lookups getStaffPay / getPayrollSummary do)
CREATE INDEX "staff_payout_staff_id_month_idx" ON "staff_payout"("staff_id", "month");

-- CreateIndex (partial unique: at most one LIVE payout per staff-month)
CREATE UNIQUE INDEX "staff_payout_staff_id_month_live_key" ON "staff_payout"("staff_id", "month") WHERE "reversed_at" IS NULL;
