-- Reverse ADR-76's two-pay-model design (ADR-79). The client could not
-- make sense of switching a staff member to "daily entry" and hand-typing
-- each day's pay — she wants one model (gross = dailyRate × days present)
-- plus a simple top-up: bonus. `staff_daily_pay` and `staff.pay_model` are
-- dropped outright; any rows in `staff_daily_pay` (dev/seed data only —
-- confirmed with the owner, no client production usage) are lost. `bonus`
-- joins `advance` / `deduction` on the existing `staff_pay_adjustment`
-- enum/table — same ledger, same correction/void path, same day-close
-- gate; it nets pay UP instead of down (applied at read time in
-- `getStaffPay`).

-- DropForeignKey
ALTER TABLE "staff_daily_pay" DROP CONSTRAINT "staff_daily_pay_staff_id_fkey";
ALTER TABLE "staff_daily_pay" DROP CONSTRAINT "staff_daily_pay_recorded_by_fkey";
ALTER TABLE "staff_daily_pay" DROP CONSTRAINT "staff_daily_pay_corrects_daily_pay_id_fkey";

-- DropTable
DROP TABLE "staff_daily_pay";

-- AlterTable
ALTER TABLE "staff" DROP COLUMN "pay_model";

-- DropEnum
DROP TYPE "StaffPayModel";

-- AlterEnum
ALTER TYPE "StaffPayAdjustmentType" ADD VALUE 'bonus';
