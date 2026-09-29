-- Owner sale adjustments (ADR-92). The Admin can restate a day's Sold total
-- for a (product, location) straight from the stock ledger. Each adjustment
-- is a source-less `sale` StockMovement plus ONE paired Cash MoneyMovement
-- carrying the revenue delta (`quantity delta × selling price`), linked via
-- the existing `money_movement.stock_movement_id` column. This value tags
-- that money row so revenue reads (financial summary, dashboard) can fold
-- it in by location. Plain additive enum value, no table changes.

ALTER TYPE "MoneySourceType" ADD VALUE IF NOT EXISTS 'sale_adjustment';
