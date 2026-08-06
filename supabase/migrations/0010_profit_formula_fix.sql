-- ============================================================
-- SBBT E-Grow — Profit Formula Consistency Fix
--
-- PROBLEM
-- order_items.profit (0001) is:
--   (selling_price * delivered_qty) - (buying_price * buy_qty)
--
-- Revenue uses delivered_qty but COGS uses buy_qty, so when a
-- company purchases more than it delivers (normal during pack /
-- dispatch), profit is systematically distorted.
--
-- FIX
-- Recreate the report views to compute profit (and matching COGS)
-- on delivered quantity only, matching revenue recognition:
--
--   profit       = (selling_price - buying_price) * delivered_qty
--   total_sale   = selling_price * delivered_qty
--   total_purchase = buying_price * delivered_qty   (matching COGS)
--
-- report_daily_purchase intentionally retains buy_qty basis — it is
-- a purchasing-activity report, not a P&L report.
--
-- Pure additive migration. No table DDL changes. Views keep
-- security_invoker = true so RLS on underlying tables is enforced.
-- ============================================================

-- ============================================================
-- REPORT: DAILY SALES  (matching basis)
-- ============================================================

create or replace view public.report_daily_sales
with (security_invoker = true) as
select
  o.company_id,
  o.order_date::date as report_date,
  count(distinct o.id) as total_orders,
  sum(oi.selling_price * oi.delivered_qty) as total_sales,
  sum(oi.buying_price * oi.delivered_qty) as total_purchase,
  sum((oi.selling_price - oi.buying_price) * oi.delivered_qty) as total_profit,
  sum(oi.ordered_qty) as total_qty
from public.orders o
join public.order_items oi on oi.order_id = o.id
group by o.company_id, o.order_date::date;

-- ============================================================
-- REPORT: DAILY PROFIT
-- ============================================================

create or replace view public.report_daily_profit
with (security_invoker = true) as
select
  o.company_id,
  o.order_date::date as report_date,
  sum((oi.selling_price - oi.buying_price) * oi.delivered_qty) as total_profit,
  sum(oi.selling_price * oi.delivered_qty) as total_sales,
  sum(oi.buying_price * oi.delivered_qty) as total_purchase
from public.orders o
join public.order_items oi on oi.order_id = o.id
group by o.company_id, o.order_date::date;

-- ============================================================
-- REPORT: MARKETPLACE
-- ============================================================

create or replace view public.report_marketplace
with (security_invoker = true) as
select
  o.company_id,
  m.id as marketplace_id,
  m.name as marketplace_name,
  count(distinct o.id) as total_orders,
  sum(oi.selling_price * oi.delivered_qty) as total_sales,
  sum((oi.selling_price - oi.buying_price) * oi.delivered_qty) as total_profit,
  sum(oi.delivered_qty) as total_delivered,
  sum(case when oi.delivery_status = 'Cancelled' then oi.delivered_qty else 0 end) as cancelled_qty,
  sum(case when oi.delivery_status = 'Returned' then oi.delivered_qty else 0 end) as returned_qty,
  sum(case when oi.delivery_status = 'RTO' then oi.delivered_qty else 0 end) as rto_qty
from public.orders o
join public.marketplaces m on m.id = o.marketplace_id
join public.order_items oi on oi.order_id = o.id
group by o.company_id, m.id, m.name;

-- ============================================================
-- REPORT: SELLER
-- ============================================================

create or replace view public.report_seller
with (security_invoker = true) as
select
  o.company_id,
  sa.id as seller_account_id,
  sa.name as seller_name,
  m.id as marketplace_id,
  m.name as marketplace_name,
  count(distinct o.id) as total_orders,
  sum(oi.selling_price * oi.delivered_qty) as total_sales,
  sum((oi.selling_price - oi.buying_price) * oi.delivered_qty) as total_profit,
  sum(oi.delivered_qty) as total_delivered
from public.orders o
join public.seller_accounts sa on sa.id = o.seller_account_id
join public.marketplaces m on m.id = o.marketplace_id
join public.order_items oi on oi.order_id = o.id
group by o.company_id, sa.id, sa.name, m.id, m.name;

-- ============================================================
-- REPORT: PRODUCT
-- ============================================================

create or replace view public.report_product
with (security_invoker = true) as
select
  o.company_id,
  p.id as product_id,
  p.sku,
  p.name as product_name,
  count(distinct o.id) as total_orders,
  sum(oi.ordered_qty) as total_ordered,
  sum(oi.buy_qty) as total_buy,
  sum(oi.packed_qty) as total_packed,
  sum(oi.dispatch_qty) as total_dispatched,
  sum(oi.delivered_qty) as total_delivered,
  sum(oi.selling_price * oi.delivered_qty) as total_sales,
  sum((oi.selling_price - oi.buying_price) * oi.delivered_qty) as total_profit
from public.orders o
join public.order_items oi on oi.order_id = o.id
join public.products p on p.id = oi.product_id
group by o.company_id, p.id, p.sku, p.name;

-- ============================================================
-- REPORT: TOP SELLING PRODUCTS
-- ============================================================

create or replace view public.report_top_selling_products
with (security_invoker = true) as
select
  o.company_id,
  p.id as product_id,
  p.sku,
  p.name as product_name,
  count(distinct o.id) as total_orders,
  sum(oi.delivered_qty) as total_delivered,
  sum(oi.selling_price * oi.delivered_qty) as total_sales,
  sum((oi.selling_price - oi.buying_price) * oi.delivered_qty) as total_profit
from public.orders o
join public.order_items oi on oi.order_id = o.id
join public.products p on p.id = oi.product_id
group by o.company_id, p.id, p.sku, p.name
order by sum(oi.delivered_qty) desc;

-- ============================================================
-- REPORT: TOP SELLERS
-- ============================================================

create or replace view public.report_top_sellers
with (security_invoker = true) as
select
  o.company_id,
  sa.id as seller_account_id,
  sa.name as seller_name,
  m.id as marketplace_id,
  m.name as marketplace_name,
  count(distinct o.id) as total_orders,
  sum(oi.delivered_qty) as total_delivered,
  sum(oi.selling_price * oi.delivered_qty) as total_sales,
  sum((oi.selling_price - oi.buying_price) * oi.delivered_qty) as total_profit
from public.orders o
join public.seller_accounts sa on sa.id = o.seller_account_id
join public.marketplaces m on m.id = o.marketplace_id
join public.order_items oi on oi.order_id = o.id
group by o.company_id, sa.id, sa.name, m.id, m.name
order by sum((oi.selling_price - oi.buying_price) * oi.delivered_qty) desc;