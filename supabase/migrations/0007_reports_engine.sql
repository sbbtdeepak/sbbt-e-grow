-- ============================================================
-- SBBT E-Grow — Reports Engine
-- Additive migration. Creates read-only report views.
-- ============================================================

-- Daily Sales Report
create or replace view public.report_daily_sales as
select
  o.company_id,
  o.order_date::date as report_date,
  count(distinct o.id) as total_orders,
  sum(oi.total_sale) as total_sales,
  sum(oi.total_purchase) as total_purchase,
  sum(oi.profit) as total_profit,
  sum(oi.ordered_qty) as total_qty
from public.orders o
join public.order_items oi on oi.order_id = o.id
group by o.company_id, o.order_date::date;

-- Daily Purchase Report
create or replace view public.report_daily_purchase as
select
  o.company_id,
  o.order_date::date as report_date,
  count(distinct o.id) as total_orders,
  sum(oi.total_purchase) as total_purchase,
  sum(oi.buy_qty) as total_qty
from public.orders o
join public.order_items oi on oi.order_id = o.id
group by o.company_id, o.order_date::date;

-- Daily Profit Report
create or replace view public.report_daily_profit as
select
  o.company_id,
  o.order_date::date as report_date,
  sum(oi.profit) as total_profit,
  sum(oi.total_sale) as total_sales,
  sum(oi.total_purchase) as total_purchase
from public.orders o
join public.order_items oi on oi.order_id = o.id
group by o.company_id, o.order_date::date;

-- Marketplace Report
create or replace view public.report_marketplace as
select
  o.company_id,
  m.id as marketplace_id,
  m.name as marketplace_name,
  count(distinct o.id) as total_orders,
  sum(oi.total_sale) as total_sales,
  sum(oi.profit) as total_profit,
  sum(oi.delivered_qty) as total_delivered,
  sum(case when oi.delivery_status = 'Cancelled' then oi.delivered_qty else 0 end) as cancelled_qty,
  sum(case when oi.delivery_status = 'Returned' then oi.delivered_qty else 0 end) as returned_qty,
  sum(case when oi.delivery_status = 'RTO' then oi.delivered_qty else 0 end) as rto_qty
from public.orders o
join public.marketplaces m on m.id = o.marketplace_id
join public.order_items oi on oi.order_id = o.id
group by o.company_id, m.id, m.name;

-- Seller Report
create or replace view public.report_seller as
select
  o.company_id,
  sa.id as seller_account_id,
  sa.name as seller_name,
  m.id as marketplace_id,
  m.name as marketplace_name,
  count(distinct o.id) as total_orders,
  sum(oi.total_sale) as total_sales,
  sum(oi.profit) as total_profit,
  sum(oi.delivered_qty) as total_delivered
from public.orders o
join public.seller_accounts sa on sa.id = o.seller_account_id
join public.marketplaces m on m.id = o.marketplace_id
join public.order_items oi on oi.order_id = o.id
group by o.company_id, sa.id, sa.name, m.id, m.name;

-- Product Report
create or replace view public.report_product as
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
  sum(oi.total_sale) as total_sales,
  sum(oi.profit) as total_profit
from public.orders o
join public.order_items oi on oi.order_id = o.id
join public.products p on p.id = oi.product_id
group by o.company_id, p.id, p.sku, p.name;

-- Pending Payments Report
create or replace view public.report_pending_payments as
select
  p.company_id,
  p.id as payment_id,
  p.order_id,
  o.order_date,
  m.name as marketplace,
  sa.name as seller,
  p.amount_expected,
  p.amount_received,
  p.pending,
  p.status,
  p.expected_payment_date,
  p.delivery_date
from public.payments p
join public.orders o on o.id = p.order_id
join public.marketplaces m on m.id = o.marketplace_id
join public.seller_accounts sa on sa.id = o.seller_account_id
where p.status in ('expected', 'partial', 'pending');

-- Received Payments Report
create or replace view public.report_received_payments as
select
  p.company_id,
  p.id as payment_id,
  p.order_id,
  o.order_date,
  m.name as marketplace,
  sa.name as seller,
  p.amount_expected,
  p.amount_received,
  p.pending,
  p.status,
  p.payment_received_date,
  p.payment_method,
  p.payment_reference
from public.payments p
join public.orders o on o.id = p.order_id
join public.marketplaces m on m.id = o.marketplace_id
join public.seller_accounts sa on sa.id = o.seller_account_id
where p.status = 'received';

-- Cancelled Orders Report
create or replace view public.report_cancelled_orders as
select
  o.company_id,
  o.id as order_id,
  o.order_date,
  m.name as marketplace,
  sa.name as seller,
  oi.product_id,
  p.sku,
  p.name as product_name,
  oi.ordered_qty,
  oi.delivered_qty,
  oi.delivery_status,
  oi.delivery_notes
from public.orders o
join public.order_items oi on oi.order_id = o.id
join public.products p on p.id = oi.product_id
join public.marketplaces m on m.id = o.marketplace_id
join public.seller_accounts sa on sa.id = o.seller_account_id
where oi.delivery_status = 'Cancelled';

-- RTO Report
create or replace view public.report_rto as
select
  o.company_id,
  o.id as order_id,
  o.order_date,
  m.name as marketplace,
  sa.name as seller,
  oi.product_id,
  p.sku,
  p.name as product_name,
  oi.ordered_qty,
  oi.delivered_qty,
  oi.delivery_notes
from public.orders o
join public.order_items oi on oi.order_id = o.id
join public.products p on p.id = oi.product_id
join public.marketplaces m on m.id = o.marketplace_id
join public.seller_accounts sa on sa.id = o.seller_account_id
where oi.delivery_status = 'RTO';

-- Top Selling Products
create or replace view public.report_top_selling_products as
select
  o.company_id,
  p.id as product_id,
  p.sku,
  p.name as product_name,
  count(distinct o.id) as total_orders,
  sum(oi.delivered_qty) as total_delivered,
  sum(oi.total_sale) as total_sales,
  sum(oi.profit) as total_profit
from public.orders o
join public.order_items oi on oi.order_id = o.id
join public.products p on p.id = oi.product_id
group by o.company_id, p.id, p.sku, p.name
order by sum(oi.delivered_qty) desc;

-- Top Performing Seller Accounts
create or replace view public.report_top_sellers as
select
  o.company_id,
  sa.id as seller_account_id,
  sa.name as seller_name,
  m.id as marketplace_id,
  m.name as marketplace_name,
  count(distinct o.id) as total_orders,
  sum(oi.delivered_qty) as total_delivered,
  sum(oi.total_sale) as total_sales,
  sum(oi.profit) as total_profit
from public.orders o
join public.seller_accounts sa on sa.id = o.seller_account_id
join public.marketplaces m on m.id = o.marketplace_id
join public.order_items oi on oi.order_id = o.id
group by o.company_id, sa.id, sa.name, m.id, m.name
order by sum(oi.profit) desc;