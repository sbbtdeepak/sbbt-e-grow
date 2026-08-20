-- ============================================================
-- SBBT E-Grow — Add 'completed' stage to order lifecycle
--
-- After delivery confirmation, the order advances from 'delivery'
-- to 'completed'. This removes it from the Delivery queue and
-- creates the expected payment record.
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum WHERE enumtypid = 'order_stage'::regtype AND enumlabel = 'completed'
  ) THEN
    ALTER TYPE order_stage ADD VALUE 'completed';
  END IF;
END
$$;
