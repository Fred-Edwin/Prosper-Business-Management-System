-- M2 Session 6 (owner-approved scope exceptions, 2026-08-30).
--
-- 1. Product.category — Admin-set menu category (Mains / Sides / Drinks …).
--    Powers the C2 New-Order product grid + K1 Stock-Count picker category
--    tab rows (M2-01 §6/§10). Free-text, nullable.
-- 2. Order.number — human-readable, monotonic order number ("#1043").
--    Rendered by A2 / A3 / C1 / C4; spoken by staff and the Admin. A
--    correction is its own Order row and gets its own number.
-- 3. Repayment.account / .note — surface the repayment's money account
--    ("Cash" / "M-Pesa") and an optional note on the A2 ledger without a
--    join back to MoneyMovement.

-- Product.category
ALTER TABLE "product" ADD COLUMN "category" TEXT;

-- Order.number — Postgres sequence, unique. (Backfill existing rows in
-- creation order before adding the constraint on a non-empty table; the
-- M2 dev + deploy targets have no orders yet.)
ALTER TABLE "order" ADD COLUMN "number" SERIAL NOT NULL;
CREATE UNIQUE INDEX "order_number_key" ON "order"("number");

-- Repayment.account / .note
ALTER TABLE "repayment" ADD COLUMN "account" "MoneyAccount" NOT NULL DEFAULT 'cash';
ALTER TABLE "repayment" ADD COLUMN "note" TEXT;
