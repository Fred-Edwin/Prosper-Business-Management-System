-- ADR-46 §3: promote purchase-payment detail to real columns.
-- All nullable; populated only for `movement_type = 'purchase_payment'`.
-- Before this, supplier / ordered qty / cost / paid-from lived in the
-- free-text `note` and were scraped client-side by `parsePaymentNote`.
--
-- The one-time data backfill for rows that predate this migration is a
-- separate script: `scripts/backfill-purchase-payment-detail.ts`
-- (run once with `pnpm tsx scripts/backfill-purchase-payment-detail.ts`).
-- It is kept out of this migration so the migration stays pure DDL and
-- the backfill is re-runnable and inspectable.

ALTER TABLE "stock_movement"
  ADD COLUMN "purchase_supplier"    TEXT,
  ADD COLUMN "purchase_ordered_qty" DECIMAL(14, 4),
  ADD COLUMN "purchase_total_cost"  DECIMAL(14, 2),
  ADD COLUMN "purchase_paid_from"   TEXT;
