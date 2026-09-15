-- Zoom into the exact-timestamp triples spotted in check 1 (Sugar, Baking,
-- Biscuits za 15). For each stock_movement row involved, show whether it IS
-- a correction (corrects_movement_id set) or an ORIGINAL, and pull every
-- money_movement tied to it (source_id) so we can see if cash was actually
-- debited more than once net, or if this nets to zero as designed.

select
  sm.id,
  sm.occurred_at,
  sm.movement_type,
  sm.corrects_movement_id,
  sm.purchase_total_cost,
  sm.purchase_paid_from,
  sm.note,
  p.name as product_name,
  u.name as recorded_by
from stock_movement sm
join product p on p.id = sm.product_id
join "user" u on u.id = sm.recorded_by
where sm.id in (
  '03223908-fc73-4caa-83e8-4d50da6661dd', -- Sugar 0.00
  '25c7c6c7-1857-4461-a9ad-c23b6692069f', -- Sugar -540.00
  '4046112a-00fa-431b-89dd-83cb9f854361', -- Sugar 540.00
  '16a936c7-3ea6-470e-ae12-65b1708b0dca', -- Baking 175.00
  '4b4680c2-ef86-4c0f-952c-26f7b9edd6bb', -- Baking 0.00
  '2820e1e7-db63-41c1-a857-a17dbd5e46ee', -- Baking -175.00
  'b5029e9b-f42b-4a27-9262-0f762e81d440', -- Biscuits za 15, 180.00
  '7021d16c-0f3c-41dd-8733-8bd709a23e46'  -- Biscuits za 15, -180.00
)
order by sm.occurred_at, sm.id;

-- All money_movement rows whose source_id points at any of the above
-- stock_movement ids — this tells us how much cash ACTUALLY moved for
-- each cluster, net.
select
  mm.id,
  mm.occurred_at,
  mm.account,
  mm.amount,
  mm.source_type,
  mm.source_id,
  mm.note
from money_movement mm
where mm.source_id in (
  '03223908-fc73-4caa-83e8-4d50da6661dd',
  '25c7c6c7-1857-4461-a9ad-c23b6692069f',
  '4046112a-00fa-431b-89dd-83cb9f854361',
  '16a936c7-3ea6-470e-ae12-65b1708b0dca',
  '4b4680c2-ef86-4c0f-952c-26f7b9edd6bb',
  '2820e1e7-db63-41c1-a857-a17dbd5e46ee',
  'b5029e9b-f42b-4a27-9262-0f762e81d440',
  '7021d16c-0f3c-41dd-8733-8bd709a23e46'
)
order by mm.occurred_at, mm.id;
