-- ============================================================
-- SBBT E-Grow — Delivery Outcome & Settlement
--
-- Adds:
-- 1. returned_qty, rto_qty, cancelled_qty, return_charge_per_unit
--    to order_items for granular delivery outcome tracking.
-- 2. delivery_confirmed_at to orders for 5-day settlement window.
-- 3. Unique constraint on payments(order_id) to prevent duplicates.
-- 4. Relaxes amount_expected CHECK to allow negative (Returned).
-- ============================================================

-- Delivery outcome columns per order line.
alter table public.order_items
  add column if not exists returned_qty numeric(12, 2) not null default 0
    check (returned_qty >= 0);

alter table public.order_items
  add column if not exists rto_qty numeric(12, 2) not null default 0
    check (rto_qty >= 0);

alter table public.order_items
  add column if not exists cancelled_qty numeric(12, 2) not null default 0
    check (cancelled_qty >= 0);

alter table public.order_items
  add column if not exists return_charge_per_unit numeric(12, 2) not null default 0
    check (return_charge_per_unit >= 0);

-- 5-day settlement window: timestamp when delivery was confirmed.
alter table public.orders
  add column if not exists delivery_confirmed_at timestamptz;

-- Prevent duplicate payment records per order.
-- One order → one payment record maximum.
create unique index if not exists payments_order_id_unique
  on public.payments (order_id);

-- Relax amount_expected to allow negative values for Returned orders.
-- Drop the existing >= 0 constraint and replace with a bounded range.
DO $$
BEGIN
  -- Drop existing constraint if it exists.
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payments_amount_expected_check'
    AND conrelid = 'public.payments'::regclass
  ) THEN
    ALTER TABLE public.payments DROP CONSTRAINT payments_amount_expected_check;
  END IF;
END
$$;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_amount_expected_check
  CHECK (amount_expected >= -999999999.99 AND amount_expected <= 999999999.99);
