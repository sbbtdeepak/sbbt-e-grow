-- ============================================================
-- SBBT E-Grow — Purchase Module
-- Additive migration. No existing columns are altered.
-- ============================================================

-- Vendor notes per order line (purchase stage).
alter table public.order_items
  add column vendor_notes text;

create index order_items_vendor_notes_idx on public.order_items (vendor_notes)
  where vendor_notes is not null;