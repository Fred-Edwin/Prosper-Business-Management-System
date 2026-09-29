-- Mandazi, 24 Sep 2026 — repair the transfer rows (append-only: INSERTs only).
--
-- Target for the day:  Restaurant  +92 prod  -67 transfer  -22 sold  -3 non-sale  = 0
--                      Canteen     +67 transfer  -67 sold                          = 0
-- Current:             Restaurant transfer nets -162 (should be -67)  -> add +95
--                      Canteen    transfer nets  +95 (should be +67)  -> add -28
-- Canteen sold is already -95 + 28 (owner adjustment) = -67, so it is left alone.
--
-- The whole thing is one DO block: if any pre-check or the final balance check
-- fails it RAISEs, and Postgres rolls every insert back. Safe to re-run: it
-- refuses if the fix is already there.

DO $$
DECLARE
  v_dispatch   text := '22f96acb-0244-49af-bfa6-b6c3d691e9a5'; -- Restaurant -95 (original)
  v_receipt    text := 'fb9840e5-cada-471e-be78-e165dcd88504'; -- Canteen   +95 (original)
  v_product    text;
  v_restaurant text;
  v_canteen    text;
  v_admin      text;
  v_rest_id    text := gen_random_uuid()::text;
  v_cant_id    text := gen_random_uuid()::text;
  v_rest_net   numeric;
  v_cant_net   numeric;
  v_rest_close numeric;
  v_cant_close numeric;
  v_note       text := 'SQL repair 2026-09-29: transfer 24 Sep was 67, not 95; undoes mis-computed UI corrections';
BEGIN
  SELECT product_id, location_id, transfer_counterpart_location_id
    INTO v_product, v_restaurant, v_canteen
    FROM stock_movement WHERE id = v_dispatch;
  IF v_product IS NULL THEN RAISE EXCEPTION 'dispatch row not found'; END IF;

  -- Pre-checks: state must be exactly what we analysed.
  IF EXISTS (SELECT 1 FROM stock_movement WHERE note = v_note) THEN
    RAISE EXCEPTION 'already applied';
  END IF;
  IF (SELECT sum(quantity) FROM stock_movement
       WHERE movement_type = 'transfer' AND location_id = v_restaurant
         AND (id = v_dispatch OR corrects_movement_id = v_dispatch)) <> -162 THEN
    RAISE EXCEPTION 'restaurant transfer net is not -162 — state changed, stop';
  END IF;
  IF (SELECT sum(quantity) FROM stock_movement
       WHERE movement_type = 'transfer' AND location_id = v_canteen
         AND (id = v_receipt OR corrects_movement_id = v_receipt)) <> 95 THEN
    RAISE EXCEPTION 'canteen transfer net is not +95 — state changed, stop';
  END IF;

  -- Same admin who made the UI corrections on 29 Sep.
  SELECT recorded_by INTO v_admin FROM stock_movement
   WHERE id = 'b4128026-b79d-4951-a19e-180d6a1bbcbc';

  -- Restaurant: +95 so the transfer out nets -67. Dated to the original.
  INSERT INTO stock_movement
    (id, product_id, location_id, movement_type, quantity, recorded_by, occurred_at,
     transfer_counterpart_location_id, corrects_movement_id, note, updated_at)
  VALUES
    (v_rest_id, v_product, v_restaurant, 'transfer', 95, v_admin,
     '2026-09-24 13:03:08.708', v_canteen, v_dispatch, v_note, now());

  -- Canteen: -28 so the transfer in nets +67. Dated to the receipt.
  INSERT INTO stock_movement
    (id, product_id, location_id, movement_type, quantity, recorded_by, occurred_at,
     transfer_counterpart_location_id, corrects_movement_id, note, updated_at)
  VALUES
    (v_cant_id, v_product, v_canteen, 'transfer', -28, v_admin,
     '2026-09-24 13:28:15.903', v_restaurant, v_receipt, v_note, now());

  -- Audit trail, so the Admin audit screen shows who/why.
  INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, new_value, occurred_at)
  VALUES
    (gen_random_uuid()::text, v_admin, 'create', 'stock_movement', v_rest_id,
     jsonb_build_object('action','correction','corrects',v_dispatch,'quantity','95.0000','note',v_note),
     '2026-09-24 13:03:08.708'),
    (gen_random_uuid()::text, v_admin, 'create', 'stock_movement', v_cant_id,
     jsonb_build_object('action','correction','corrects',v_receipt,'quantity','-28.0000','note',v_note),
     '2026-09-24 13:28:15.903');

  -- Post-check: the day nets to zero at both places, and closing is 0.
  SELECT
    sum(quantity) FILTER (WHERE location_id = v_restaurant AND occurred_at >= '2026-09-23 21:00'),
    sum(quantity) FILTER (WHERE location_id = v_canteen    AND occurred_at >= '2026-09-23 21:00'),
    sum(quantity) FILTER (WHERE location_id = v_restaurant),
    sum(quantity) FILTER (WHERE location_id = v_canteen)
  INTO v_rest_net, v_cant_net, v_rest_close, v_cant_close
  FROM stock_movement
  WHERE product_id = v_product AND occurred_at < '2026-09-24 21:00';

  RAISE NOTICE 'day net: restaurant %, canteen % | closing: restaurant %, canteen %',
    v_rest_net, v_cant_net, v_rest_close, v_cant_close;

  IF v_rest_net <> 0 OR v_cant_net <> 0 OR v_rest_close <> 0 OR v_cant_close <> 0 THEN
    RAISE EXCEPTION 'post-check failed (see notice) — rolled back';
  END IF;
END $$;

-- Afterwards (read-only): per-column view of the day.
SELECT l.name AS location, m.movement_type, sum(m.quantity) AS net
FROM stock_movement m
JOIN location l ON l.id = m.location_id
WHERE m.product_id = (SELECT product_id FROM stock_movement WHERE id = '22f96acb-0244-49af-bfa6-b6c3d691e9a5')
  AND m.occurred_at >= '2026-09-23 21:00' AND m.occurred_at < '2026-09-24 21:00'
GROUP BY 1, 2 ORDER BY 1, 2;
