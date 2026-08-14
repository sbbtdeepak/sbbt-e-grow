-- ============================================================
-- SBBT E-Grow — SaaS Control Plane Foundation
-- Additive migration only.
-- ============================================================

-- ============================================================
-- 1. plans — Subscription plans
-- ============================================================
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  price_monthly numeric not null default 0,
  price_yearly numeric not null default 0,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  features jsonb not null default '{}'::jsonb,
  limits jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

comment on table public.plans is 'Subscription plans for SaaS control plane';
comment on column public.plans.slug is 'Unique identifier used in application logic (e.g. free, growth, pro)';
comment on column public.plans.features is 'JSONB object listing enabled features (e.g. {"reports": true, "ai": false})';
comment on column public.plans.limits is 'JSONB object listing numeric limits (e.g. {"products_limit": 10, "monthly_orders_limit": 100})';

-- Default development plans (idempotent — safe to re-run)
insert into public.plans (id, name, slug, description, price_monthly, price_yearly, is_active, sort_order, features, limits)
values
  -- Free/Trial plan
  (gen_random_uuid(), 'Free', 'free', 'Free trial plan for new companies', 0, 0, true, 1,
   '{"reports": true, "reports_limit": 5, "advanced_reports": false, "ai": false, "csv_export": false, "export": false}'::jsonb,
   '{"products_limit": 5, "marketplaces_limit": 1, "seller_accounts_limit": 3, "staff_users_limit": 2, "monthly_orders_limit": 100, "ai_usage_limit": 0}'::jsonb),
  -- Growth plan
  (gen_random_uuid(), 'Growth', 'growth', 'Growth plan for expanding companies', 29, 290, true, 2,
   '{"reports": true, "advanced_reports": true, "ai": false, "csv_export": true, "export": true, "reports_limit": 50}'::jsonb,
   '{"products_limit": 50, "marketplaces_limit": 3, "seller_accounts_limit": 10, "staff_users_limit": 10, "monthly_orders_limit": 1000, "ai_usage_limit": 10}'::jsonb),
  -- Pro plan
  (gen_random_uuid(), 'Pro', 'pro', 'Professional plan for established businesses', 79, 790, true, 3,
   '{"reports": true, "advanced_reports": true, "ai": true, "csv_export": true, "export": true, "reports_limit": 200}'::jsonb,
   '{"products_limit": 200, "marketplaces_limit": 10, "seller_accounts_limit": 50, "staff_users_limit": 50, "monthly_orders_limit": 5000, "ai_usage_limit": 100}'::jsonb)
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    price_monthly = excluded.price_monthly,
    price_yearly = excluded.price_yearly,
    is_active = excluded.is_active,
    sort_order = excluded.sort_order,
    features = excluded.features,
    limits = excluded.limits,
    updated_at = now();

-- ============================================================
-- 2. plan_features — One row per feature/limit definition
-- ============================================================
create table if not exists public.plan_features (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  feature_key text not null,
  feature_name text not null,
  feature_type text not null check (feature_type in ('access', 'limit')),
  config jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique (plan_id, feature_key)
);

comment on table public.plan_features is 'Defined feature/limit configurations per plan';
comment on column public.plan_features.id is 'Unique identifier';
comment on column public.plan_features.plan_id is 'References public.plans';
comment on column public.plan_features.feature_key is 'Machine-readable key (e.g. products_limit, monthly_orders_limit)';
comment on column public.plan_features.feature_name is 'Human-readable name';
comment on column public.plan_features.feature_type is 'Whether this is access control or numeric limit';
comment on column public.plan_features.config is 'Additional configuration (e.g. {"max": 5})';
comment on column public.plan_features.created_at is 'When the record was created';
comment on column public.plan_features.updated_at is 'When the record was last updated';

-- Default feature definitions for each plan (declarative mirror of plans.features/limits)
insert into public.plan_features (plan_id, feature_key, feature_name, feature_type, config)
select p.id, f.feature_key, f.feature_name, f.feature_type, f.config
from (values
  ('free', 'reports', 'Report Access', 'access', '{}'::jsonb),
  ('free', 'advanced_reports', 'Advanced Reports', 'access', '{}'::jsonb),
  ('free', 'ai', 'AI Features', 'access', '{}'::jsonb),
  ('free', 'csv_export', 'CSV Export', 'access', '{}'::jsonb),
  ('free', 'export', 'Data Export', 'access', '{}'::jsonb),
  ('free', 'products_limit', 'Products Limit', 'limit', '{"max": 5}'::jsonb),
  ('free', 'marketplaces_limit', 'Marketplaces Limit', 'limit', '{"max": 1}'::jsonb),
  ('free', 'seller_accounts_limit', 'Seller Accounts Limit', 'limit', '{"max": 3}'::jsonb),
  ('free', 'staff_users_limit', 'Staff Users Limit', 'limit', '{"max": 2}'::jsonb),
  ('free', 'monthly_orders_limit', 'Monthly Orders Limit', 'limit', '{"max": 100}'::jsonb),
  ('free', 'ai_usage_limit', 'AI Usage Limit (months)', 'limit', '{"max_months": 0}'::jsonb),
  ('growth', 'reports', 'Report Access', 'access', '{}'::jsonb),
  ('growth', 'advanced_reports', 'Advanced Reports', 'access', '{}'::jsonb),
  ('growth', 'ai', 'AI Features', 'access', '{}'::jsonb),
  ('growth', 'csv_export', 'CSV Export', 'access', '{}'::jsonb),
  ('growth', 'export', 'Data Export', 'access', '{}'::jsonb),
  ('growth', 'products_limit', 'Products Limit', 'limit', '{"max": 50}'::jsonb),
  ('growth', 'marketplaces_limit', 'Marketplaces Limit', 'limit', '{"max": 3}'::jsonb),
  ('growth', 'seller_accounts_limit', 'Seller Accounts Limit', 'limit', '{"max": 10}'::jsonb),
  ('growth', 'staff_users_limit', 'Staff Users Limit', 'limit', '{"max": 10}'::jsonb),
  ('growth', 'monthly_orders_limit', 'Monthly Orders Limit', 'limit', '{"max": 1000}'::jsonb),
  ('growth', 'ai_usage_limit', 'AI Usage Limit (months)', 'limit', '{"max_months": 10}'::jsonb),
  ('pro', 'reports', 'Report Access', 'access', '{}'::jsonb),
  ('pro', 'advanced_reports', 'Advanced Reports', 'access', '{}'::jsonb),
  ('pro', 'ai', 'AI Features', 'access', '{}'::jsonb),
  ('pro', 'csv_export', 'CSV Export', 'access', '{}'::jsonb),
  ('pro', 'export', 'Data Export', 'access', '{}'::jsonb),
  ('pro', 'products_limit', 'Products Limit', 'limit', '{"max": 200}'::jsonb),
  ('pro', 'marketplaces_limit', 'Marketplaces Limit', 'limit', '{"max": 10}'::jsonb),
  ('pro', 'seller_accounts_limit', 'Seller Accounts Limit', 'limit', '{"max": 50}'::jsonb),
  ('pro', 'staff_users_limit', 'Staff Users Limit', 'limit', '{"max": 50}'::jsonb),
  ('pro', 'monthly_orders_limit', 'Monthly Orders Limit', 'limit', '{"max": 5000}'::jsonb),
  ('pro', 'ai_usage_limit', 'AI Usage Limit (months)', 'limit', '{"max_months": 100}'::jsonb)
) as f(plan_slug, feature_key, feature_name, feature_type, config)
join public.plans p on p.slug = f.plan_slug
on conflict (plan_id, feature_key) do update
set feature_name = excluded.feature_name,
    feature_type = excluded.feature_type,
    config = excluded.config,
    updated_at = now();

-- ============================================================
-- 3. subscriptions — Company subscription relationship
-- ============================================================
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  plan_id uuid not null references public.plans(id),
  status text not null check (status in ('trialing', 'active', 'past_due', 'cancelled', 'expired')),
  trial_start timestamp with time zone,
  trial_end timestamp with time zone,
  current_period_start timestamp with time zone not null,
  current_period_end timestamp with time zone not null,
  cancelled_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

comment on table public.subscriptions is 'Company subscription records';
comment on column public.subscriptions.id is 'Unique identifier';
comment on column public.subscriptions.company_id is 'References public.companies';
comment on column public.subscriptions.plan_id is 'References public.plans';
comment on column public.subscriptions.status is 'Subscription status: trialing, active, past_due, cancelled, expired';
comment on column public.subscriptions.trial_start is 'Trial start timestamp (null if not on trial)';
comment on column public.subscriptions.trial_end is 'Trial end timestamp';
comment on column public.subscriptions.current_period_start is 'Current billing period start';
comment on column public.subscriptions.current_period_end is 'Current billing period end';
comment on column public.subscriptions.cancelled_at is 'When subscription was cancelled';

alter table public.subscriptions enable row level security;

-- ============================================================
-- 4. company_usage — Track company usage against limits
-- ============================================================
create table if not exists public.company_usage (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  products_count integer not null default 0,
  marketplaces_count integer not null default 0,
  seller_accounts_count integer not null default 0,
  orders_count integer not null default 0,
  ai_usage_count integer not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique (company_id, period_start)
);

comment on table public.company_usage is 'Monthly usage tracking per company';
comment on column public.company_usage.id is 'Unique identifier';
comment on column public.company_usage.company_id is 'References public.companies';
comment on column public.company_usage.period_start is 'Start date of usage period';
comment on column public.company_usage.period_end is 'End date of usage period';
comment on column public.company_usage.products_count is 'Current product count';
comment on column public.company_usage.marketplaces_count is 'Current marketplace count';
comment on column public.company_usage.seller_accounts_count is 'Current seller account count';
comment on column public.company_usage.orders_count is 'Orders this period';
comment on column public.company_usage.ai_usage_count is 'AI usage this period';

alter table public.company_usage enable row level security;

-- ============================================================
-- 5. user_company_roles — Future-proof multi-company membership
-- ============================================================
create table if not exists public.user_company_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  company_id uuid not null references public.companies(id) on delete cascade,
  role text not null check (role in ('master_admin', 'company_admin', 'staff')),
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique (user_id, company_id)
);

comment on table public.user_company_roles is 'User-company membership with roles';
comment on column public.user_company_roles.id is 'Unique identifier';
comment on column public.user_company_roles.user_id is 'Reference to auth.users id';
comment on column public.user_company_roles.company_id is 'References public.companies';
comment on column public.user_company_roles.role is 'User role in company: master_admin, company_admin, or staff';
comment on column public.user_company_roles.is_active is 'Whether this membership is active';
comment on column public.user_company_roles.created_at is 'When the record was created';
comment on column public.user_company_roles.updated_at is 'When the record was last updated';

alter table public.user_company_roles enable row level security;

-- ============================================================
-- Migration Summary
-- ============================================================
-- SaaS control-plane foundation: plans, plan_features, subscriptions,
-- company_usage, and user_company_roles tables with default development
-- plans and RLS policies (refined by 0012_saas_rls_fix.sql).
