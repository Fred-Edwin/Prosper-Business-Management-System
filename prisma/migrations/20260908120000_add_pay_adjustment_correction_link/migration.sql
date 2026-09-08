-- Append-only correction link for staff pay adjustments (ADR-72). A
-- correction is a new `staff_pay_adjustment` row carrying the signed
-- delta (which may be negative), keeping the original's `type`, and
-- pointing at the original via `corrects_adjustment_id`; the original is
-- never mutated. Unlike every other ADR-72 correction this writes NO
-- money_movement — an advance/deduction only nets the derived pay figure
-- at read time. Matches the shape of the corrects_* columns added in
-- 20260907120000 (self-FK, ON DELETE SET NULL, no CREATE INDEX).

-- AlterTable
ALTER TABLE "staff_pay_adjustment" ADD COLUMN "corrects_adjustment_id" TEXT;

-- AddForeignKey
ALTER TABLE "staff_pay_adjustment" ADD CONSTRAINT "staff_pay_adjustment_corrects_adjustment_id_fkey" FOREIGN KEY ("corrects_adjustment_id") REFERENCES "staff_pay_adjustment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
