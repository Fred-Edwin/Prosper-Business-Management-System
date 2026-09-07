-- Append-only correction links for ledger rows created outside the Order
-- flow (ADR-15). Purchase payments reuse the existing
-- stock_movement.corrects_movement_id; this migration adds the equivalent
-- self-relation to owner_transaction and repayment, plus a column on
-- stock_movement to record the catalog buying price a purchase payment
-- overwrote (so a void can roll it back).

-- AlterTable
ALTER TABLE "stock_movement" ADD COLUMN "purchase_prior_buying_price" DECIMAL(14,2);

-- AlterTable
ALTER TABLE "owner_transaction" ADD COLUMN "corrects_owner_transaction_id" TEXT;

-- AlterTable
ALTER TABLE "repayment" ADD COLUMN "corrects_repayment_id" TEXT;

-- AddForeignKey
ALTER TABLE "owner_transaction" ADD CONSTRAINT "owner_transaction_corrects_owner_transaction_id_fkey" FOREIGN KEY ("corrects_owner_transaction_id") REFERENCES "owner_transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repayment" ADD CONSTRAINT "repayment_corrects_repayment_id_fkey" FOREIGN KEY ("corrects_repayment_id") REFERENCES "repayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
