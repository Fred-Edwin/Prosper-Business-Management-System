-- M2 Session 3: the money ledger goes live and needs source types for the
-- events M2 introduces. `MoneySourceType` previously carried only M1/M3
-- sources (handover_receipt, expense, purchase_payment, owner_draw,
-- owner_return, account_transfer).
--
--   order        — a Cash/M-Pesa Restaurant order's revenue movement (S4)
--   repayment    — a customer debt repayment (S3, this session)
--   canteen_sale — a Canteen derived-sale revenue movement (S5)
--
-- Plain additive enum values. No table changes. `ADD VALUE` cannot run
-- inside a transaction on older PostgreSQL, so each is its own statement.

ALTER TYPE "MoneySourceType" ADD VALUE IF NOT EXISTS 'order';
ALTER TYPE "MoneySourceType" ADD VALUE IF NOT EXISTS 'repayment';
ALTER TYPE "MoneySourceType" ADD VALUE IF NOT EXISTS 'canteen_sale';
