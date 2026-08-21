-- ============================================================
-- SBBT E-Grow — Fix report_cancelled_orders and report_rto
--
-- Bug: Both views used oi.delivered_qty for their quantity
-- columns. After Phase 27B, RTO and Cancelled lines have
-- delivered_qty = 0 (correctly — they were not delivered).
-- The actual quantities are in oi.cancelled_qty and oi.rto_qty.
--
-- Fix: Rename the quantity columns to be semantically correct
-- and use the actual Phase 27B outcome columns.
-- ============================================================

-- ============================================================
-- REPORT: CANCELLED ORDERS
-- ============================================================

DROP VIEW IF EXISTS public.report_cancelled_orders;

CREATE VIEW public.report_cancelled_orders
WITH (security_invoker = true) AS
SELECT
  o.company_id,
  o.id AS order_id,
  o.order_date,
  m.name AS marketplace,
  sa.name AS seller,
  oi.product_id,
  p.sku,
  p.name AS product_name,
  oi.ordered_qty,
  oi.cancelled_qty,
  oi.delivery_status,
  oi.delivery_notes
FROM public.orders o
JOIN public.order_items oi ON oi.order_id = o.id
JOIN public.products p ON p.id = oi.product_id
JOIN public.marketplaces m ON m.id = o.marketplace_id
JOIN public.seller_accounts sa ON sa.id = o.seller_account_id
WHERE oi.delivery_status = 'Cancelled';

-- ============================================================
-- REPORT: RTO
-- ============================================================

DROP VIEW IF EXISTS public.report_rto;

CREATE VIEW public.report_rto
WITH (security_invoker = true) AS
SELECT
  o.company_id,
  o.id AS order_id,
  o.order_date,
  m.name AS marketplace,
  sa.name AS seller,
  oi.product_id,
  p.sku,
  p.name AS product_name,
  oi.ordered_qty,
  oi.rto_qty,
  oi.delivery_notes
FROM public.orders o
JOIN public.order_items oi ON oi.order_id = o.id
JOIN public.products p ON p.id = oi.product_id
JOIN public.marketplaces m ON m.id = o.marketplace_id
JOIN public.seller_accounts sa ON sa.id = o.seller_account_id
WHERE oi.delivery_status = 'RTO';
