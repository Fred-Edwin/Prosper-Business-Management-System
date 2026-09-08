-- Daily-entry pay model (staff-pay rework PR 2 of 3, ADR-76).
--
-- Some staff (cooks, casuals) are paid a hand-typed amount per day — the
-- amount genuinely varies day to day. Today every staff member is paid
-- `dailyRate` × days present. This PR keeps BOTH models, chosen per staff
-- member via `staff.pay_model`:
--   - `fixed_daily_rate` (default, unchanged) — gross = rate × days present
--   - `daily_entry` — gross = Σ `staff_daily_pay` rows for the month
--
-- `staff_daily_pay` is append-only, exactly like `staff_pay_adjustment`:
-- one ORIGINAL row per (staff, business date) plus signed-delta CORRECTION
-- rows (`corrects_daily_pay_id` self-FK, ON DELETE SET NULL, no CREATE
-- INDEX — matching 20260907120000 / 20260908120000). The "one original
-- per staff-day" rule is a PARTIAL unique index `WHERE
-- corrects_daily_pay_id IS NULL` (same trick as the partial unique in
-- 20260908130000). Unlike every other ADR-72 correction this writes NO
-- money_movement — a pay entry only nets the derived pay figure at read
-- time; cash moves when a payout is recorded.
--
-- Widening only: `pay_model` defaults to `fixed_daily_rate`, so every
-- existing `staff` row keeps today's behaviour with no backfill.

-- CreateEnum
CREATE TYPE "StaffPayModel" AS ENUM ('fixed_daily_rate', 'daily_entry');

-- AlterTable
ALTER TABLE "staff" ADD COLUMN "pay_model" "StaffPayModel" NOT NULL DEFAULT 'fixed_daily_rate';

-- CreateTable
CREATE TABLE "staff_daily_pay" (
    "id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "date" DATE NOT NULL,
    "note" TEXT,
    "recorded_by" TEXT NOT NULL,
    "corrects_daily_pay_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_daily_pay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (non-unique, for the month lookup getStaffPay / getPayrollSummary do)
CREATE INDEX "staff_daily_pay_staff_id_date_idx" ON "staff_daily_pay"("staff_id", "date");

-- CreateIndex (partial unique: at most one ORIGINAL entry per staff-day)
CREATE UNIQUE INDEX "staff_daily_pay_staff_id_date_original_key" ON "staff_daily_pay"("staff_id", "date") WHERE "corrects_daily_pay_id" IS NULL;

-- AddForeignKey
ALTER TABLE "staff_daily_pay" ADD CONSTRAINT "staff_daily_pay_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_daily_pay" ADD CONSTRAINT "staff_daily_pay_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_daily_pay" ADD CONSTRAINT "staff_daily_pay_corrects_daily_pay_id_fkey" FOREIGN KEY ("corrects_daily_pay_id") REFERENCES "staff_daily_pay"("id") ON DELETE SET NULL ON UPDATE CASCADE;
