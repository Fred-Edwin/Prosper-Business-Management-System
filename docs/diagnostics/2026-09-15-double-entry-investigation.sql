-- ============================================================================
-- Diagnosing the client's "double entry" report on stock receiving + payments
--
-- ONE query, ONE paste, ONE result grid. Every check below is UNION ALL'd
-- together and tagged with `check_no` / `check_name` — sort/filter the
-- result grid by `check_no` in the Neon SQL editor to walk through them.
--
-- Background (see lib/domain/stock/purchases.ts, lib/domain/financials):
--   - A Store Manager "receiving goods" writes a `stock_movement` row with
--     movement_type = 'purchase_receipt' (quantity in, NO money effect).
--   - An Admin "recording a payment" writes a `stock_movement` row with
--     movement_type = 'purchase_payment' (quantity 0) PLUS a `money_movement`
--     row (source_type = 'purchase_payment') that debits cash/M-Pesa.
--   - These are meant to be two DIFFERENT rows for the same real-world
--     delivery, optionally linked via stock_movement.purchase_payment_id.
--   - A real double-count would only happen if either (a) the same delivery
--     got TWO purchase_payment rows pointed at by receipts, or (b) the Admin
--     ALSO logged the same cost as a generic Expense (category 'other'),
--     creating a second money_movement debit for one real-world payment.
--
-- ► Edit the two dates in the `window` CTE below once — every check reuses
--   them. Optionally uncomment the product-name filter in check 1/2/3.
-- ============================================================================

with win as (
  select
    timestamp '2026-09-01' as from_date,
    timestamp '2026-09-16' as to_date
),

-- 1) All purchase-related stock_movement rows in the window, side by side.
check1 as (
  select
    1 as check_no,
    'purchase movements (payments + receipts) in window' as check_name,
    sm.occurred_at as event_at,
    sm.movement_type::text as detail_1,
    p.name as detail_2,
    loc.name as detail_3,
    sm.purchase_supplier as detail_4,
    coalesce(sm.purchase_total_cost::text, sm.quantity::text) as amount_or_qty,
    (sm.purchase_payment_id is not null)::text as linked,
    u.name as recorded_by,
    sm.id::text as row_id
  from stock_movement sm
  join product  p   on p.id = sm.product_id
  join location loc on loc.id = sm.location_id
  join "user"   u   on u.id = sm.recorded_by
  cross join win w
  where sm.movement_type in ('purchase_payment', 'purchase_receipt')
    and sm.occurred_at >= w.from_date
    and sm.occurred_at <  w.to_date
    -- and p.name ilike '%<product name>%'
),

-- 2) Purchase PAYMENTS only, flagged for whether a receipt has claimed them.
check2 as (
  select
    2 as check_no,
    'payments with NO matching receipt yet = "awaiting delivery"' as check_name,
    pay.occurred_at as event_at,
    'purchase_payment' as detail_1,
    p.name as detail_2,
    loc.name as detail_3,
    pay.purchase_supplier as detail_4,
    pay.purchase_total_cost::text as amount_or_qty,
    (exists (select 1 from stock_movement r where r.purchase_payment_id = pay.id))::text as linked,
    null as recorded_by,
    pay.id::text as row_id
  from stock_movement pay
  join product  p   on p.id = pay.product_id
  join location loc on loc.id = pay.location_id
  cross join win w
  where pay.movement_type = 'purchase_payment'
    and pay.occurred_at >= w.from_date
    and pay.occurred_at <  w.to_date
    and not exists (select 1 from stock_movement r where r.purchase_payment_id = pay.id)
),

-- 3) Purchase RECEIPTS only, flagged UNMATCHED when no payment points at them.
check3 as (
  select
    3 as check_no,
    'receipts with NO matching payment = "unmatched"' as check_name,
    r.occurred_at as event_at,
    'purchase_receipt' as detail_1,
    p.name as detail_2,
    loc.name as detail_3,
    null as detail_4,
    r.quantity::text as amount_or_qty,
    'false' as linked,
    null as recorded_by,
    r.id::text as row_id
  from stock_movement r
  join product  p   on p.id = r.product_id
  join location loc on loc.id = r.location_id
  cross join win w
  where r.movement_type = 'purchase_receipt'
    and r.occurred_at >= w.from_date
    and r.occurred_at <  w.to_date
    and r.purchase_payment_id is null
),

-- 4) Literal schema-level dupe: a payment claimed by MORE THAN ONE receipt.
check4 as (
  select
    4 as check_no,
    'ONE payment claimed by MORE THAN ONE receipt (should never happen)' as check_name,
    null::timestamp as event_at,
    'purchase_payment_id: ' || r.purchase_payment_id as detail_1,
    'receipts pointing at it: ' || count(*)::text as detail_2,
    null as detail_3,
    null as detail_4,
    null as amount_or_qty,
    null as linked,
    null as recorded_by,
    r.purchase_payment_id as row_id
  from stock_movement r
  where r.movement_type = 'purchase_receipt'
    and r.purchase_payment_id is not null
  group by r.purchase_payment_id
  having count(*) > 1
),

-- 5) THE MOST LIKELY REAL BUG: a purchase_payment AND a separate expense
--    money_movement, same account, near-equal amount, within 3 days —
--    money left the till twice for what was probably one real payment.
check5 as (
  select
    5 as check_no,
    'possible DOUBLE CASH-OUT: purchase_payment + expense, same amount/day' as check_name,
    mm1.occurred_at as event_at,
    'purchase_payment amt=' || mm1.amount::text as detail_1,
    'expense amt=' || mm2.amount::text || ' cat=' || e.category::text as detail_2,
    e.note as detail_3,
    mm1.account::text as detail_4,
    (mm1.amount - mm2.amount)::text as amount_or_qty,
    null as linked,
    null as recorded_by,
    mm1.id::text || ' / ' || mm2.id::text as row_id
  from money_movement mm1
  join money_movement mm2
    on mm1.account = mm2.account
    and mm1.id <> mm2.id
    and abs(mm1.amount - mm2.amount) < 1
    and abs(extract(epoch from (mm1.occurred_at - mm2.occurred_at))) < 86400 * 3
  left join expense e on e.id = mm2.source_id and mm2.source_type = 'expense'
  where mm1.source_type = 'purchase_payment'
    and mm2.source_type = 'expense'
),

-- 6) Raw money_movement dump for the window (everything that hit cash/M-Pesa).
check6 as (
  select
    6 as check_no,
    'all money_movement rows in window' as check_name,
    mm.occurred_at as event_at,
    mm.source_type::text as detail_1,
    mm.account::text as detail_2,
    mm.note as detail_3,
    mm.source_id as detail_4,
    mm.amount::text as amount_or_qty,
    (mm.corrects_movement_id is not null)::text as linked,
    u.name as recorded_by,
    mm.id::text as row_id
  from money_movement mm
  join "user" u on u.id = mm.recorded_by
  cross join win w
  where mm.occurred_at >= w.from_date
    and mm.occurred_at <  w.to_date
),

-- 7) Raw expense dump for the window (watch category = 'other' especially).
check7 as (
  select
    7 as check_no,
    'all expense rows in window' as check_name,
    e.date as event_at,
    e.category::text as detail_1,
    e.paid_from_account::text as detail_2,
    e.note as detail_3,
    null as detail_4,
    e.amount::text as amount_or_qty,
    (e.corrects_expense_id is not null)::text as linked,
    u.name as recorded_by,
    e.id::text as row_id
  from expense e
  join "user" u on u.id = e.recorded_by
  cross join win w
  where e.date >= w.from_date
    and e.date <  w.to_date
),

-- 8) Top-line sums by source_type/account — a quick gut check on totals.
check8 as (
  select
    8 as check_no,
    'sum of money_movement by source_type + account' as check_name,
    null::timestamp as event_at,
    mm.source_type::text as detail_1,
    mm.account::text as detail_2,
    null as detail_3,
    null as detail_4,
    sum(mm.amount)::text as amount_or_qty,
    count(*)::text as linked,
    null as recorded_by,
    null as row_id
  from money_movement mm
  cross join win w
  where mm.occurred_at >= w.from_date
    and mm.occurred_at <  w.to_date
  group by mm.source_type, mm.account
)

select * from check1
union all select * from check2
union all select * from check3
union all select * from check4
union all select * from check5
union all select * from check6
union all select * from check7
union all select * from check8
order by check_no, event_at;
