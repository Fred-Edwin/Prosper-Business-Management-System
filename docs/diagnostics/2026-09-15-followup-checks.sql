-- Follow-up: the two checks most likely to surface a REAL double cash-out
-- (as opposed to a correction cluster that nets to zero, which we've now
-- ruled out for the Baking/Sugar/Biscuits clusters). Paste this whole file
-- once; two result grids will come back.
--
-- ► Edit the date window below if you want a wider/narrower range.

with win as (
  select
    timestamp '2026-09-01' as from_date,
    timestamp '2026-09-16' as to_date
)

-- CHECK A — possible double cash-out: a purchase_payment AND a separate
-- expense money_movement, same account, near-equal amount, within 3 days.
select
  'A: payment + expense near-match' as check_name,
  mm1.occurred_at  as purchase_payment_date,
  mm1.amount       as purchase_payment_amount,
  mm2.occurred_at  as expense_date,
  mm2.amount       as expense_amount,
  e.category       as expense_category,
  e.note           as expense_note,
  mm1.account
from money_movement mm1
join money_movement mm2
  on mm1.account = mm2.account
  and mm1.id <> mm2.id
  and abs(mm1.amount - mm2.amount) < 1
  and abs(extract(epoch from (mm1.occurred_at - mm2.occurred_at))) < 86400 * 3
left join expense e on e.id = mm2.source_id and mm2.source_type = 'expense'
cross join win w
where mm1.source_type = 'purchase_payment'
  and mm2.source_type = 'expense'
  and mm1.occurred_at >= w.from_date
  and mm1.occurred_at <  w.to_date;

-- CHECK B — top-line sums by source_type + account for the window, so we
-- can sanity-check the totals against what the client believes went out.
with win as (
  select
    timestamp '2026-09-01' as from_date,
    timestamp '2026-09-16' as to_date
)
select
  mm.source_type,
  mm.account,
  count(*)      as row_count,
  sum(mm.amount) as total_amount
from money_movement mm
cross join win w
where mm.occurred_at >= w.from_date
  and mm.occurred_at <  w.to_date
group by mm.source_type, mm.account
order by mm.source_type, mm.account;
