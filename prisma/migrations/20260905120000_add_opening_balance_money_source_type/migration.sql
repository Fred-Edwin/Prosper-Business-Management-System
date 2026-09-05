-- ADR-70: the Admin states the business's opening CASH and M-PESA/BANK
-- position the same way she states opening stock (ADR-11) — as a ledger
-- row, not a stored balance.
--
-- Money balances are derived (`SUM(MoneyMovement.amount)` grouped by
-- account, ADR-17), so there is no column to "set". `opening_balance` is
-- the source type for the row that moves the derived balance TO the
-- stated figure; a restatement is a correction row (ADR-15), never an
-- overwrite.
--
-- Plain additive enum value. No table changes. `ADD VALUE` cannot run
-- inside a transaction on older PostgreSQL, so it is its own statement.

ALTER TYPE "MoneySourceType" ADD VALUE IF NOT EXISTS 'opening_balance';
