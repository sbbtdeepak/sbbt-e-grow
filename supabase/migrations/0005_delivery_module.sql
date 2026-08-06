-- ============================================================
-- SBBT E-Grow — Delivery Module
-- Additive migration. No existing columns are altered.
-- ============================================================

-- Delivery fields per order line.
alter table public.order_items
  add column if not exists delivery_date date;

alter table public.order_items
  add column if not exists delivery_notes text;

alter table public.order_items
  add column if not exists delivery_status text;

alter table public.order_items
  add column if not exists delivery_reference text;

create index order_items_delivery_status_idx on public.order_items (delivery_status)
  where delivery_status is not null;

create index order_items_delivery_reference_idx on public.order_items (delivery_reference)
  where delivery_reference is not null;
