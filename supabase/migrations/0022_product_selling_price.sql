-- ============================================================
-- SBBT E-Grow — Product Default Selling Price
--
-- Adds a default selling price to the Product Master.
-- Previously, selling price was only entered at order time.
-- Now Company Admin can set a default selling price per product,
-- which auto-fills in Order Entry but remains editable per order.
--
-- Backward-compatible: nullable column, existing rows get NULL.
-- Existing orders are unaffected — they store their own
-- selling_price in order_items at order time.
-- ============================================================

alter table public.products
  add column if not exists selling_price numeric(12, 2) check (selling_price >= 0);

comment on column public.products.selling_price is 'Default selling price. Auto-fills in Order Entry but editable per order line.';
