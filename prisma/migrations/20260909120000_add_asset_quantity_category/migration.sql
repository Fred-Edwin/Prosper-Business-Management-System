-- Asset quantity + category (client feedback, 2026-09-09).
--
-- Two additive columns on `asset`, both widening-only so every existing
-- row keeps its meaning with no backfill:
--   - `quantity`  INT NOT NULL DEFAULT 1 — one register line can now stand
--     for N identical units (6 dining chairs on one row).
--   - `category`  TEXT NULL — free-text Admin grouping, mirrors
--     `product.category`. This reverses ADR-44 (which rejected a category
--     field for assets) at the client's request; see DECISIONS.md.
--
-- Assets is a mutable register, not a ledger (ADR-22) — a plain ALTER
-- TABLE, no append-only / correction machinery.

-- AlterTable
ALTER TABLE "asset" ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "asset" ADD COLUMN "category" TEXT;
