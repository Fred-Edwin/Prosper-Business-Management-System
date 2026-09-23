-- CreateEnum
CREATE TYPE "DebtSourceType" AS ENUM ('order', 'canteen_credit_sale');

-- DropForeignKey
ALTER TABLE "debt" DROP CONSTRAINT "debt_order_id_fkey";

-- AlterTable
ALTER TABLE "debt" ADD COLUMN     "source_id" TEXT,
ADD COLUMN     "source_type" "DebtSourceType" NOT NULL DEFAULT 'order',
ALTER COLUMN "order_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "stock_movement" ADD COLUMN     "customer_id" TEXT;

-- AddForeignKey
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debt" ADD CONSTRAINT "debt_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
