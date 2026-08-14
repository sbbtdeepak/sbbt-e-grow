-- ============================================================
-- SBBT E-Grow — SaaS Product Platform Foundation
-- Phase 15: Public product catalogue + Master Admin management
-- Additive migration only.
-- ============================================================

-- ============================================================
-- 1. saas_products — Public-facing SaaS product catalogue
-- ============================================================
create table if not exists public.saas_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  tagline text not null,
  description text not null,
  short_description text not null,
  features jsonb not null default '[]'::jsonb,
  target_audience text,
  hero_image_url text,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

comment on table public.saas_products is 'Public-facing SaaS product catalogue for the SBBT E-Grow platform';
comment on column public.saas_products.slug is 'URL-safe unique identifier (e.g. e-grow-standard, e-grow-enterprise)';
comment on column public.saas_products.tagline is 'Short marketing tagline displayed on cards';
comment on column public.saas_products.short_description is 'Brief description for product cards';
comment on column public.saas_products.features is 'JSONB array of feature strings (e.g. ["Multi-channel", "AI Reports"])';
comment on column public.saas_products.target_audience is 'Ideal customer profile description';
comment on column public.saas_products.hero_image_url is 'URL to hero/banner image for the product page';
comment on column public.saas_products.is_featured is 'Whether this product appears in the featured section on the homepage';
comment on column public.saas_products.sort_order is 'Display order (lower = higher priority)';

-- Seed default SaaS products (idempotent)
insert into public.saas_products (id, name, slug, tagline, description, short_description, features, target_audience, is_active, is_featured, sort_order)
values
  (
    gen_random_uuid(),
    'E-Grow Standard',
    'e-grow-standard',
    'The complete live-commerce operating system for growing brands.',
    'An end-to-end operating system that unifies multi-channel orders, inventory, payments, and profit reporting for growing live-commerce brands.',
    'Manage multi-channel orders, inventory, and payments from one dashboard.',
    '["Multi-channel Order Management", "Real-time Inventory Tracking", "Automated Payment Reconciliation", "P&L Reports", "5 Team Members", "3 Marketplaces"]'::jsonb,
    'Small to medium brands selling on Amazon, Meesho, and website',
    true,
    true,
    1
  ),
  (
    gen_random_uuid(),
    'E-Grow Enterprise',
    'e-grow-enterprise',
    'Advanced automation, AI insights, and unlimited scale for established businesses.',
    'Enterprise-grade automation with AI demand forecasting and advanced analytics, built to scale high-volume operations with unlimited marketplaces and dedicated support.',
    'Unlock AI-powered forecasting, advanced analytics, and dedicated support.',
    '["AI Demand Forecasting", "Advanced Analytics & Dashboards", "Unlimited Team Members", "Unlimited Marketplaces", "Custom Integrations", "Dedicated Account Manager"]'::jsonb,
    'Established businesses with high order volumes and complex operations',
    true,
    true,
    2
  ),
  (
    gen_random_uuid(),
    'E-Grow Startup',
    'e-grow-startup',
    'Get started free. Perfect for new brands exploring live-commerce.',
    'A free starter suite with core order and inventory management to help new brands validate their first live-commerce sales channels.',
    'Core order and inventory management to validate your first sales channels.',
    '["Basic Order Management", "Inventory Tracking", "1 Marketplace", "2 Team Members", "Email Support"]'::jsonb,
    'New brands and startups testing live-commerce channels',
    true,
    false,
    3
  )
on conflict (slug) do update
set name = excluded.name,
    tagline = excluded.tagline,
    description = excluded.description,
    short_description = excluded.short_description,
    features = excluded.features,
    target_audience = excluded.target_audience,
    is_active = excluded.is_active,
    is_featured = excluded.is_featured,
    sort_order = excluded.sort_order,
    updated_at = now();

-- ============================================================
-- 2. product_features — Detailed feature breakdown per SaaS product
-- ============================================================
create table if not exists public.product_features (
  id uuid primary key default gen_random_uuid(),
  saas_product_id uuid not null references public.saas_products(id) on delete cascade,
  feature_key text not null,
  feature_name text not null,
  feature_description text not null,
  feature_type text not null check (feature_type in ('capability', 'integration', 'support', 'limit')),
  is_highlighted boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique (saas_product_id, feature_key)
);

comment on table public.product_features is 'Detailed feature breakdown for each SaaS product';
comment on column public.product_features.saas_product_id is 'References public.saas_products';
comment on column public.product_features.feature_key is 'Machine-readable key (e.g. multi_channel, ai_forecasting)';
comment on column public.product_features.feature_name is 'Human-readable feature name';
comment on column public.product_features.feature_description is 'Detailed description of the feature';
comment on column public.product_features.feature_type is 'Category: capability, integration, support, or limit';
comment on column public.product_features.is_highlighted is 'Whether this feature is highlighted in marketing materials';

-- Seed default features (idempotent)
insert into public.product_features (saas_product_id, feature_key, feature_name, feature_description, feature_type, is_highlighted, sort_order)
select p.id, f.feature_key, f.feature_name, f.feature_description, f.feature_type, f.is_highlighted, f.sort_order
from public.saas_products p
cross join lateral (values
  -- E-Grow Standard
  ('multi_channel', 'Multi-Channel Order Management', 'Sync and manage orders from Amazon, Meesho, and your website in one place.', 'capability', true, 1),
  ('inventory_tracking', 'Real-Time Inventory Tracking', 'Track stock levels across all channels and avoid overselling.', 'capability', true, 2),
  ('payment_reconciliation', 'Automated Payment Reconciliation', 'Auto-match payments to orders and track pending amounts.', 'capability', true, 3),
  ('pnl_reports', 'Profit & Loss Reports', 'Daily, weekly, and monthly P&L with marketplace and seller breakdowns.', 'capability', true, 4),
  ('team_5', '5 Team Members', 'Invite up to 5 staff users with role-based access.', 'limit', false, 5),
  ('marketplaces_3', '3 Marketplaces', 'Connect up to 3 marketplace integrations.', 'limit', false, 6),
  ('email_support', 'Email Support', 'Get help via email within 24 hours.', 'support', false, 7),

  -- E-Grow Enterprise
  ('ai_forecasting', 'AI Demand Forecasting', 'Predict demand and optimise stock levels using machine learning.', 'capability', true, 1),
  ('advanced_analytics', 'Advanced Analytics & Dashboards', 'Customisable dashboards with deep-dive analytics.', 'capability', true, 2),
  ('unlimited_team', 'Unlimited Team Members', 'No limits on staff users.', 'limit', false, 3),
  ('unlimited_marketplaces', 'Unlimited Marketplaces', 'Connect as many marketplaces as you need.', 'limit', false, 4),
  ('custom_integrations', 'Custom Integrations', 'API access and custom connector development.', 'integration', false, 5),
  ('dedicated_manager', 'Dedicated Account Manager', 'Personalised onboarding and priority support.', 'support', false, 6),

  -- E-Grow Startup
  ('basic_orders', 'Basic Order Management', 'Track and fulfil orders from a single channel.', 'capability', true, 1),
  ('basic_inventory', 'Inventory Tracking', 'Basic stock level monitoring.', 'capability', true, 2),
  ('marketplace_1', '1 Marketplace', 'Connect one marketplace integration.', 'limit', false, 3),
  ('team_2', '2 Team Members', 'Invite up to 2 staff users.', 'limit', false, 4),
  ('email_support_basic', 'Email Support', 'Community support via email.', 'support', false, 5)
) as f(feature_key, feature_name, feature_description, feature_type, is_highlighted, sort_order)
where p.slug in ('e-grow-standard', 'e-grow-enterprise', 'e-grow-startup')
on conflict (saas_product_id, feature_key) do update
set feature_name = excluded.feature_name,
    feature_description = excluded.feature_description,
    feature_type = excluded.feature_type,
    is_highlighted = excluded.is_highlighted,
    sort_order = excluded.sort_order,
    updated_at = now();

-- ============================================================
-- 3. product_pricing — Pricing tiers per SaaS product
-- ============================================================
create table if not exists public.product_pricing (
  id uuid primary key default gen_random_uuid(),
  saas_product_id uuid not null references public.saas_products(id) on delete cascade,
  plan_id uuid references public.plans(id) on delete set null,
  tier_name text not null,
  price_monthly numeric not null default 0,
  price_yearly numeric not null default 0,
  is_popular boolean not null default false,
  features jsonb not null default '{}'::jsonb,
  limits jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

comment on table public.product_pricing is 'Pricing tiers displayed for each SaaS product';
comment on column public.product_pricing.saas_product_id is 'References public.saas_products';
comment on column public.product_pricing.plan_id is 'Optional reference to public.plans for subscription billing';
comment on column public.product_pricing.tier_name is 'Display name (e.g. Starter, Growth, Enterprise)';
comment on column public.product_pricing.is_popular is 'Whether this tier is highlighted as the recommended option';
comment on column public.product_pricing.features is 'JSONB object listing enabled features';
comment on column public.product_pricing.limits is 'JSONB object listing numeric limits';

-- Seed default pricing tiers (idempotent)
insert into public.product_pricing (saas_product_id, plan_id, tier_name, price_monthly, price_yearly, is_popular, features, limits, sort_order)
select p.id, pl.id, pp.tier_name, pp.price_monthly, pp.price_yearly, pp.is_popular, pp.features, pp.limits, pp.sort_order
from public.saas_products p
left join public.plans pl on pl.slug = p.slug
cross join lateral (values
  -- E-Grow Standard tiers
  ('e-grow-standard', 'Starter', 0, 0, false,
   '{"reports": true, "advanced_reports": false, "ai": false, "csv_export": false, "export": false}'::jsonb,
   '{"products_limit": 5, "marketplaces_limit": 1, "seller_accounts_limit": 3, "staff_users_limit": 2, "monthly_orders_limit": 100}'::jsonb,
   1),
  ('e-grow-standard', 'Growth', 29, 290, true,
   '{"reports": true, "advanced_reports": true, "ai": false, "csv_export": true, "export": true}'::jsonb,
   '{"products_limit": 50, "marketplaces_limit": 3, "seller_accounts_limit": 10, "staff_users_limit": 10, "monthly_orders_limit": 1000}'::jsonb,
   2),
  ('e-grow-standard', 'Pro', 79, 790, false,
   '{"reports": true, "advanced_reports": true, "ai": true, "csv_export": true, "export": true}'::jsonb,
   '{"products_limit": 200, "marketplaces_limit": 10, "seller_accounts_limit": 50, "staff_users_limit": 50, "monthly_orders_limit": 5000}'::jsonb,
   3),

  -- E-Grow Enterprise tiers
  ('e-grow-enterprise', 'Business', 199, 1990, true,
   '{"reports": true, "advanced_reports": true, "ai": true, "csv_export": true, "export": true, "custom_integrations": true}'::jsonb,
   '{"products_limit": 1000, "marketplaces_limit": 50, "seller_accounts_limit": 200, "staff_users_limit": 100, "monthly_orders_limit": 50000}'::jsonb,
   1),

  -- E-Grow Startup tiers
  ('e-grow-startup', 'Free', 0, 0, true,
   '{"reports": true, "advanced_reports": false, "ai": false, "csv_export": false, "export": false}'::jsonb,
   '{"products_limit": 5, "marketplaces_limit": 1, "seller_accounts_limit": 3, "staff_users_limit": 2, "monthly_orders_limit": 100}'::jsonb,
   1)
) as pp(slug, tier_name, price_monthly, price_yearly, is_popular, features, limits, sort_order)
where p.slug = pp.slug;

-- ============================================================
-- 4. RLS Policies
-- ============================================================
alter table public.saas_products enable row level security;
alter table public.product_features enable row level security;
alter table public.product_pricing enable row level security;

-- saas_products: public can read active products
create policy "saas_products_select_public" on public.saas_products
  for select using (is_active = true);

-- saas_products: master_admin can manage all
create policy "saas_products_master_admin" on public.saas_products
  for all using (public.is_master_admin());

-- product_features: public can read features for active products
create policy "product_features_select_public" on public.product_features
  for select using (
    exists (
      select 1 from public.saas_products sp
      where sp.id = product_features.saas_product_id
        and sp.is_active = true
    )
  );

-- product_features: master_admin can manage all
create policy "product_features_master_admin" on public.product_features
  for all using (public.is_master_admin());

-- product_pricing: public can read pricing for active products
create policy "product_pricing_select_public" on public.product_pricing
  for select using (
    exists (
      select 1 from public.saas_products sp
      where sp.id = product_pricing.saas_product_id
        and sp.is_active = true
    )
  );

-- product_pricing: master_admin can manage all
create policy "product_pricing_master_admin" on public.product_pricing
  for all using (public.is_master_admin());

-- ============================================================
-- 5. Triggers
-- ============================================================
drop trigger if exists saas_products_set_updated_at on public.saas_products;
create trigger saas_products_set_updated_at
  before update on public.saas_products
  for each row execute function public.set_updated_at();

drop trigger if exists product_features_set_updated_at on public.product_features;
create trigger product_features_set_updated_at
  before update on public.product_features
  for each row execute function public.set_updated_at();

drop trigger if exists product_pricing_set_updated_at on public.product_pricing;
create trigger product_pricing_set_updated_at
  before update on public.product_pricing
  for each row execute function public.set_updated_at();
