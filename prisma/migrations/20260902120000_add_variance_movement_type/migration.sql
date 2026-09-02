-- F6 (owner decision 2026-09-02): accounting for stock that leaves one
-- location on a transfer and never arrives at the other. Accepting a
-- transfer short now writes a `variance` StockMovement for the shortfall,
-- so the loss is a summable row rather than free text on the accept note.
ALTER TYPE "MovementType" ADD VALUE 'variance';
