-- 2026-10-01 — client asked to delete two Utilities expenses she had set to
-- 1 bob (correctExpense cannot reach zero). Run in the Neon SQL editor ahead of
-- the void feature (ADR-96). Appends the same rows `voidExpense` writes: a
-- reversing expense row, a paired positive money row, and audit rows.
-- Guarded: each target must be an original utilities expense netting to 1.00.
-- Outcome: both expenses derive to 0.00 and their cash nets to 0.00.
--   6158d68f-1312-4bdf-baa2-4e1d2d06792b  Airtime Mine, 2026-10-04
--   66eb1697-42a6-43e5-a2cc-39525151e5d6  Paid Till Fuliza LOan, 2026-09-30

DO $$
DECLARE
  target_ids  text[] := ARRAY[
    '6158d68f-1312-4bdf-baa2-4e1d2d06792b',
    '66eb1697-42a6-43e5-a2cc-39525151e5d6'
  ];
  tid         text;
  orig        expense%ROWTYPE;
  current_amt numeric(12,2);
  new_exp_id  text;
  new_mm_id   text;
BEGIN
  FOREACH tid IN ARRAY target_ids LOOP
    new_exp_id := gen_random_uuid()::text;
    new_mm_id  := gen_random_uuid()::text;

    SELECT * INTO orig FROM expense WHERE id = tid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Expense % not found', tid; END IF;
    IF orig.corrects_expense_id IS NOT NULL THEN
      RAISE EXCEPTION '% is a correction row; use the original id', tid;
    END IF;
    IF orig.category <> 'utilities' THEN
      RAISE EXCEPTION '% is not a utilities expense (%)', tid, orig.category;
    END IF;

    SELECT orig.amount + COALESCE(SUM(amount), 0) INTO current_amt
    FROM expense WHERE corrects_expense_id = orig.id;
    IF current_amt <> 1.00 THEN
      RAISE EXCEPTION '% nets to % (expected 1.00); stopping', tid, current_amt;
    END IF;

    INSERT INTO expense (id, category, amount, date, paid_from_account, note,
                         recorded_by, corrects_expense_id, created_at, updated_at)
    VALUES (new_exp_id, orig.category, -current_amt, orig.date,
            orig.paid_from_account, 'Voided by admin request (client asked to delete)',
            orig.recorded_by, orig.id, now(), now());

    INSERT INTO money_movement (id, account, amount, source_type, source_id,
                                recorded_by, occurred_at, note, created_at, updated_at)
    VALUES (new_mm_id, orig.paid_from_account, current_amt, 'expense', new_exp_id,
            orig.recorded_by, orig.date, 'Voided by admin request', now(), now());

    INSERT INTO audit_log (id, user_id, action, entity_type, entity_id,
                           new_value, occurred_at, created_at)
    VALUES
      (gen_random_uuid()::text, orig.recorded_by, 'correct', 'expense', orig.id,
       jsonb_build_object('correctionId', new_exp_id, 'amountTo', '0.00',
                          'amountDelta', (-current_amt)::text, 'void', true),
       orig.date, now()),
      (gen_random_uuid()::text, orig.recorded_by, 'create', 'money_movement', new_mm_id,
       jsonb_build_object('account', orig.paid_from_account,
                          'amount', current_amt::text, 'sourceType', 'expense',
                          'sourceId', new_exp_id),
       orig.date, now());
  END LOOP;
END $$;
