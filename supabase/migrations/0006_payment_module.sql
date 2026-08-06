-- ============================================================
-- SBBT E-Grow — Payment Module
-- Additive migration. No existing columns are altered.
-- ============================================================

-- Extend payment status enum with new values.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum WHERE enumtypid = 'payment_status'::regtype AND enumlabel = 'pending'
  ) THEN
    ALTER TYPE payment_status ADD VALUE 'pending';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum WHERE enumtypid = 'payment_status'::regtype AND enumlabel = 'cancelled'
  ) THEN
    ALTER TYPE payment_status ADD VALUE 'cancelled';
  END IF;
END
$$;

-- Payment fields.
alter table public.payments
  add column if not exists payment_reference text;

alter table public.payments
  add column if not exists payment_method text;

alter table public.payments
  add column if not exists payment_notes text;

alter table public.payments
  add column if not exists payment_received_date date;

alter table public.payments
  add column if not exists payment_release_days integer not null default 0;

create index payments_payment_reference_idx on public.payments (payment_reference)
  where payment_reference is not null;

create index payments_expected_payment_date_idx on public.payments (expected_payment_date)
  where expected_payment_date is not null;