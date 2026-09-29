-- Customer location (ADR-93): which side of the business a customer buys
-- from, for the Customers page Location filter and per-side totals. A plain
-- label, not a ledger scope. Balances are unchanged.

-- CreateEnum
CREATE TYPE "CustomerLocation" AS ENUM ('restaurant', 'canteen', 'both', 'unassigned');

-- AlterTable
ALTER TABLE "customer" ADD COLUMN "location" "CustomerLocation" NOT NULL DEFAULT 'unassigned';

-- Backfill existing customers (owner-reviewed against production on
-- 2026-09-29: 13 canteen, 10 restaurant, 1 both, 3 unassigned).
--   1. Credit history wins: which location types their debts came from
--      (restaurant credit orders via order.location_id; canteen credit
--      sales via the sale stock_movement's location_id).
--   2. No credit yet: who created them (audit_log 'create' row) —
--      cashier → restaurant, canteen_attendant → canteen.
--   3. Otherwise (created by the Admin, no history): stays 'unassigned'.
WITH debt_side AS (
  SELECT d.customer_id, l.type AS side
  FROM debt d
  LEFT JOIN "order" o         ON o.id = d.order_id
  LEFT JOIN stock_movement sm ON d.source_type = 'canteen_credit_sale' AND sm.id = d.source_id
  JOIN location l             ON l.id = COALESCE(o.location_id, sm.location_id)
),
hist AS (
  SELECT customer_id,
         bool_or(side = 'restaurant') AS has_restaurant,
         bool_or(side = 'canteen')    AS has_canteen
  FROM debt_side
  GROUP BY customer_id
),
creator AS (
  SELECT DISTINCT ON (a.entity_id) a.entity_id AS customer_id, u.role
  FROM audit_log a
  JOIN "user" u ON u.id = a.user_id
  WHERE a.entity_type = 'customer' AND a.action = 'create'
  ORDER BY a.entity_id, a.occurred_at
),
proposed AS (
  SELECT c.id,
         CASE
           WHEN h.has_restaurant AND h.has_canteen THEN 'both'
           WHEN h.has_restaurant                   THEN 'restaurant'
           WHEN h.has_canteen                      THEN 'canteen'
           WHEN cr.role = 'cashier'                THEN 'restaurant'
           WHEN cr.role = 'canteen_attendant'      THEN 'canteen'
           ELSE 'unassigned'
         END AS loc
  FROM customer c
  LEFT JOIN hist h     ON h.customer_id = c.id
  LEFT JOIN creator cr ON cr.customer_id = c.id
)
UPDATE customer c
SET location = p.loc::"CustomerLocation"
FROM proposed p
WHERE p.id = c.id AND p.loc <> 'unassigned';
