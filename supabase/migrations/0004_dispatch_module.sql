-- ============================================================
-- SBBT E-Grow — Dispatch Module
-- Additive migration. No existing columns are altered.
-- ============================================================

-- Dispatch fields per order line.
alter table public.order_items
  add column if not exists dispatch_qty integer not null default 0;

alter table public.order_items
  add column if not exists dispatch_date date;

alter table public.order_items
  add column if not exists dispatch_notes text;

alter table public.order_items
  add column if not exists tracking_number text;

alter table public.order_items
  add column if not exists courier_name text;

create index order_items_tracking_number_idx on public.order_items (tracking_number)
  where tracking_number is not null;
