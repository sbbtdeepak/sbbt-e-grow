-- ============================================================
-- SBBT E-Grow — SaaS Product Catalogue Configuration & Publishing
-- Phase 16: Extends 0016_saas_products with configurable,
-- publishable fields for Master Admin-managed products.
-- Additive migration only. Does NOT touch ERP tables/routes.
-- ============================================================

-- ============================================================
-- 1. saas_products — configuration & publishing fields
-- ============================================================
alter table public.saas_products
  add column if not exists image_url text,
  add column if not exists accent_color text,
  add column if not exists external_app_url text,
  add column if not exists cta_label text,
  add column if not exists cta_type text
    check (cta_type is null or cta_type in ('learn_more', 'launch', 'contact', 'login'));

-- Accent colour must be a safe hex value when provided (prevents CSS injection).
alter table public.saas_products
  drop constraint if exists saas_products_accent_color_check;
alter table public.saas_products
  add constraint saas_products_accent_color_check
    check (accent_color is null or accent_color ~* '^#([0-9a-f]{3}|[0-9a-f]{6})$');

comment on column public.saas_products.image_url is 'Logo/icon image URL for the product card.';
comment on column public.saas_products.accent_color is 'Safe hex accent colour (e.g. #6D28D9) used for product presentation. Validated server-side.';
comment on column public.saas_products.external_app_url is 'External application URL. When set, the primary CTA launches this URL.';
comment on column public.saas_products.cta_label is 'Override label for the product primary CTA.';
comment on column public.saas_products.cta_type is 'CTA behaviour: learn_more, launch, contact, login.';

-- ============================================================
-- 2. product_features — active state
-- ============================================================
alter table public.product_features
  add column if not exists is_active boolean not null default true;

comment on column public.product_features.is_active is 'Whether this feature is shown publicly.';

-- ============================================================
-- 3. product_pricing — description, currency, active state
-- ============================================================
alter table public.product_pricing
  add column if not exists description text,
  add column if not exists currency text not null default 'INR',
  add column if not exists is_active boolean not null default true;

comment on column public.product_pricing.description is 'Human-readable description of the pricing tier.';
comment on column public.product_pricing.currency is 'ISO currency code for displayed prices (e.g. INR, USD).';
comment on column public.product_pricing.is_active is 'Whether this pricing tier is shown publicly.';

-- ============================================================
-- 4. Tighten public read policies to respect active flags
-- ============================================================
drop policy if exists product_features_select_public on public.product_features;
create policy "product_features_select_public" on public.product_features
  for select using (
    is_active = true and exists (
      select 1 from public.saas_products sp
      where sp.id = product_features.saas_product_id
        and sp.is_active = true
    )
  );

drop policy if exists product_pricing_select_public on public.product_pricing;
create policy "product_pricing_select_public" on public.product_pricing
  for select using (
    is_active = true and exists (
      select 1 from public.saas_products sp
      where sp.id = product_pricing.saas_product_id
        and sp.is_active = true
    )
  );
