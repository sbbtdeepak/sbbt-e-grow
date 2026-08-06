-- ============================================================
-- SBBT E-Grow — RLS Hardening & Stabilization
-- Additive/fix migration only.
--
-- Fixes:
--  1. Report views now use security_invoker = true so RLS on
--     underlying tables is enforced (prevents cross-company reads).
--  2. company_settings RLS now uses current_company_id() instead
--     of the broken company_id = auth.uid() comparison.
--  3. companies UPDATE policy allows company_admin to update their
--     own company profile (Settings page).
--  4. Explicit SELECT grants on report views for authenticated.
-- ============================================================

-- ============================================================
-- 1. REPORTS ENGINE  (security_invoker + grants)
-- ============================================================

drop view if exists public.report_daily_sales;
create view public.report_daily_sales
with (security_invoker = true) as
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

drop view if exists public.report_daily_purchase;
create view public.report_daily_purchase
with (security_invoker = true) as
select
  o.company_id,
  o.order_date::date as report_date,
  count(distinct o.id) as total_orders,
  sum(oi.total_purchase) as total_purchase,
  sum(oi.buy_qty) as total_qty
from public.orders o
join public.order_items oi on oi.order_id = o.id
group by o.company_id, o.order_date::date;

drop view if exists public.report_daily_profit;
create view public.report_daily_profit
with (security_invoker = true) as
select
  o.company_id,
  o.order_date::date as report_date,
  sum(oi.profit) as total_profit,
  sum(oi.total_sale) as total_sales,
  sum(oi.total_purchase) as total_purchase
from public.orders o
join public.order_items oi on oi.order_id = o.id
group by o.company_id, o.order_date::date;

drop view if exists public.report_marketplace;
create view public.report_marketplace
with (security_invoker = true) as
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

drop view if exists public.report_seller;
create view public.report_seller
with (security_invoker = true) as
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

drop view if exists public.report_product;
create view public.report_product
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
  sum(oi.total_sale) as total_sales,
  sum(oi.profit) as total_profit
from public.orders o
join public.order_items oi on oi.order_id = o.id
join public.products p on p.id = oi.product_id
group by o.company_id, p.id, p.sku, p.name;

drop view if exists public.report_pending_payments;
create view public.report_pending_payments
with (security_invoker = true) as
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

drop view if exists public.report_received_payments;
create view public.report_received_payments
with (security_invoker = true) as
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

drop view if exists public.report_cancelled_orders;
create view public.report_cancelled_orders
with (security_invoker = true) as
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

drop view if exists public.report_rto;
create view public.report_rto
with (security_invoker = true) as
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

drop view if exists public.report_top_selling_products;
create view public.report_top_selling_products
with (security_invoker = true) as
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

drop view if exists public.report_top_sellers;
create view public.report_top_sellers
with (security_invoker = true) as
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

-- Explicit SELECT grants for authenticated on all report views.
grant select on
  public.report_daily_sales,
  public.report_daily_purchase,
  public.report_daily_profit,
  public.report_marketplace,
  public.report_seller,
  public.report_product,
  public.report_pending_payments,
  public.report_received_payments,
  public.report_cancelled_orders,
  public.report_rto,
  public.report_top_selling_products,
  public.report_top_sellers
to authenticated;

-- Future views automatically get SELECT for authenticated.
alter default privileges in schema public
  grant select on tables to authenticated;

-- ============================================================
-- 2. COMPANY_SETTINGS RLS FIX
-- ============================================================

drop policy if exists "Company settings are company-scoped."
  on public.company_settings;

create policy "Company settings are company-scoped."
  on public.company_settings
  for all
  using (
    public.is_master_admin()
    or company_id = public.current_company_id()
  )
  with check (
    public.is_master_admin()
    or company_id = public.current_company_id()
  );

-- ============================================================
-- 3. COMPANIES UPDATE POLICY FIX
-- Company admins may update their own company profile fields.
-- ============================================================

drop policy if exists "companies_update" on public.companies;

create policy "companies_update" on public.companies
  for update using (
    public.is_master_admin()
    or (
      id = public.current_company_id()
      and public.current_user_role() = 'company_admin'::public.user_role
    )
  );