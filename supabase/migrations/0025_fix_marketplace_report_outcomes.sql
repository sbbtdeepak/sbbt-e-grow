-- ============================================================
-- SBBT E-Grow — Fix report_marketplace outcome counts
--
-- Bug: cancelled_qty, returned_qty, rto_qty in report_marketplace
-- were computed using delivered_qty with CASE WHEN on delivery_status.
-- After Phase 27B, these values are always 0 because:
--   - RTO lines have delivered_qty=0
--   - Cancelled lines have delivered_qty=0
--   - Partial lines have delivery_status='Partial' (no CASE match)
--
-- Fix: Use the actual Phase 27B outcome columns directly.
-- ============================================================

CREATE OR REPLACE VIEW public.report_marketplace
WITH (security_invoker = true) AS
SELECT
  o.company_id,
  m.id AS marketplace_id,
  m.name AS marketplace_name,
  count(DISTINCT o.id) AS total_orders,
  sum(oi.selling_price * oi.delivered_qty) AS total_sales,
  sum((oi.selling_price - oi.buying_price) * oi.delivered_qty) AS total_profit,
  sum(oi.delivered_qty) AS total_delivered,
  sum(oi.cancelled_qty) AS cancelled_qty,
  sum(oi.returned_qty) AS returned_qty,
  sum(oi.rto_qty) AS rto_qty
FROM public.orders o
JOIN public.marketplaces m ON m.id = o.marketplace_id
JOIN public.order_items oi ON oi.order_id = o.id
GROUP BY o.company_id, m.id, m.name;
