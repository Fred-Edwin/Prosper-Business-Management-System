-- Customer archive (client feedback, 2026-09-17).
--
-- One additive, nullable column on `customer`, mirroring the
-- `product.deleted_at` / `asset.deleted_at` soft-delete pattern —
-- widening-only, no backfill needed, every existing row keeps its meaning.
-- Customer has FK history (Order/Debt/Repayment) that makes a hard-delete
-- path essentially unreachable for any real customer, so this is
-- archive-only: no matching hard-delete column or path.

-- AlterTable
ALTER TABLE "customer" ADD COLUMN     "deleted_at" TIMESTAMP(3);
