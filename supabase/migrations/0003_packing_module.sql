-- ============================================================
-- SBBT E-Grow — Packing Module
-- Additive migration. No existing columns are altered.
-- ============================================================

-- Add 'dispatch' stage to the order lifecycle (between packing and delivery).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum WHERE enumtypid = 'order_stage'::regtype AND enumlabel = 'dispatch'
  ) THEN
    ALTER TYPE order_stage ADD VALUE 'dispatch';
  END IF;
END
$$;

-- Per-line packing fields.
alter table public.order_items
  add column if not exists packaging_notes text;

alter table public.order_items
  add column if not exists packaging_date date;

create index order_items_packing_date_idx on public.order_items (packaging_date)
  where packaging_date is not null;
