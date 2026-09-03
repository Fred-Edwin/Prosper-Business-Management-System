-- CreateTable
CREATE TABLE "staff_payout" (
    "id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "month" DATE NOT NULL,
    "net_paid" DECIMAL(12,2) NOT NULL,
    "date" DATE NOT NULL,
    "paid_from_account" "MoneyAccount" NOT NULL,
    "recorded_by" TEXT NOT NULL,
    "expense_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_payout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "staff_payout_expense_id_key" ON "staff_payout"("expense_id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_payout_staff_id_month_key" ON "staff_payout"("staff_id", "month");

-- AddForeignKey
ALTER TABLE "staff_payout" ADD CONSTRAINT "staff_payout_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_payout" ADD CONSTRAINT "staff_payout_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_payout" ADD CONSTRAINT "staff_payout_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expense"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

