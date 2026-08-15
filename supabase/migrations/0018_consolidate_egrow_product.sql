-- ============================================================
-- SBBT E-Grow — Consolidate E-Grow variants into one product
-- Phase 17.1: saas_products = a software product, product_pricing = its tiers.
--
--  - One canonical product: E-Grow (slug 'e-grow'), sourced from the
--    existing E-Grow Standard record for product-level metadata.
--  - Active pricing tiers: Startup / Standard / Enterprise, mapped from
--    the seeded Free / Growth / Business tiers (values unchanged), linked
--    to the free / growth / pro billing plans for forward compatibility.
--  - Legacy duplicate tiers (Starter, Pro) are preserved as inactive.
--  - One canonical active feature row per feature_key on E-Grow; the
--    remaining per-key duplicates are preserved as inactive on the legacy
--    (now inactive) variant products.
--  - Legacy variant products (e-grow-standard / -enterprise / -startup)
--    are preserved, only marked is_active = false (audit/rollback/history).
--
-- Data-only. No schema changes, no RLS changes, no entitlement changes.
-- Safe on: existing live DB (0016+0017 applied), fresh DB (0016->0017->0018),
-- and dev re-runs (idempotent guards).
-- ============================================================

do $$
declare
  v_egrow uuid;
  v_free  uuid;
  v_growth uuid;
  v_pro   uuid;
begin
  -- ============================================================
  -- 1. Canonical E-Grow product (reuse if already present)
  -- ============================================================
  select id into v_egrow from public.saas_products where slug = 'e-grow';

  if v_egrow is null then
    insert into public.saas_products (
      name, slug, tagline, description, short_description, features,
      target_audience, hero_image_url, image_url, accent_color,
      external_app_url, cta_label, cta_type, is_active, is_featured, sort_order
    )
    select
      'E-Grow', 'e-grow', tagline, description, short_description, features,
      target_audience, hero_image_url, image_url, accent_color,
      external_app_url, cta_label, cta_type, true, true, 1
    from public.saas_products
    where slug = 'e-grow-standard'
    limit 1;

    select id into v_egrow from public.saas_products where slug = 'e-grow';
  end if;

  if v_egrow is null then
    raise exception 'Could not resolve canonical E-Grow product (slug e-grow)';
  end if;

  -- Canonical identity (idempotent: re-applies name/active/featured/order).
  update public.saas_products
     set name = 'E-Grow', slug = 'e-grow',
         is_active = true, is_featured = true, sort_order = 1
   where id = v_egrow;

  -- ============================================================
  -- 2. Preserve legacy variants but take them out of the public catalogue
  -- ============================================================
  update public.saas_products
     set is_active = false
   where slug in ('e-grow-standard', 'e-grow-enterprise', 'e-grow-startup');

  -- ============================================================
  -- 3. Resolve billing plan ids by slug (never assume UUIDs)
  -- ============================================================
  select id into v_free   from public.plans where slug = 'free';
  select id into v_growth from public.plans where slug = 'growth';
  select id into v_pro    from public.plans where slug = 'pro';

  -- ============================================================
  -- 4. Pricing tiers -> canonical E-Grow product
  -- ============================================================
  -- Move every legacy tier to E-Grow (idempotent: only rows still attached
  -- to a legacy variant move; on re-run they are already on E-Grow).
  update public.product_pricing pp
     set saas_product_id = v_egrow
    from public.saas_products p
   where p.id = pp.saas_product_id
     and p.slug in ('e-grow-standard', 'e-grow-enterprise', 'e-grow-startup');

  -- Map to the canonical three-tier offering (values/limits unchanged),
  -- linked to billing plans for forward compatibility only.
  update public.product_pricing
     set tier_name = 'Startup', plan_id = v_free,
         is_active = true, is_popular = false, sort_order = 1
   where tier_name = 'Free'
     and saas_product_id = v_egrow;

  update public.product_pricing
     set tier_name = 'Standard', plan_id = v_growth,
         is_active = true, is_popular = true, sort_order = 2
   where tier_name = 'Growth'
     and saas_product_id = v_egrow;

  update public.product_pricing
     set tier_name = 'Enterprise', plan_id = v_pro,
         is_active = true, is_popular = false, sort_order = 3
   where tier_name = 'Business'
     and saas_product_id = v_egrow;

  -- Legacy duplicate tiers: preserved, not part of the canonical offering.
  update public.product_pricing
     set is_active = false
   where tier_name in ('Starter', 'Pro')
     and saas_product_id = v_egrow;

  -- ============================================================
  -- 5. Features -> one canonical row per key on E-Grow
  -- ============================================================
  -- Representative source priority per feature_key: standard > enterprise
  -- > startup. The chosen row moves to E-Grow (guard: skip keys that
  -- already exist on E-Grow so re-runs are no-ops and the
  -- (saas_product_id, feature_key) unique constraint is never violated).
  with ranked as (
    select f.id,
           f.feature_key,
           row_number() over (
             partition by f.feature_key
             order by case p.slug
                        when 'e-grow-standard' then 1
                        when 'e-grow-enterprise' then 2
                        else 3
                      end,
                      f.id
           ) as rn
      from public.product_features f
      join public.saas_products p on p.id = f.saas_product_id
     where p.slug in ('e-grow-standard', 'e-grow-enterprise', 'e-grow-startup')
  ),
  cfg(feature_key, is_active, is_highlighted, sort_order) as (
    values
      ('multi_channel',           true,  true,  1),
      ('inventory_tracking',      true,  true,  2),
      ('payment_reconciliation',  true,  true,  3),
      ('pnl_reports',             true,  true,  4),
      ('ai_forecasting',          true,  true,  5),
      ('advanced_analytics',      true,  true,  6),
      ('custom_integrations',     true,  false, 7),
      ('dedicated_manager',       true,  false, 8),
      ('email_support',           true,  false, 9),
      -- Limit-flavored / variant-specific rows: preserved but not public.
      ('team_5',                  false, false, 10),
      ('marketplaces_3',          false, false, 11),
      ('unlimited_team',          false, false, 12),
      ('unlimited_marketplaces',  false, false, 13),
      ('marketplace_1',           false, false, 14),
      ('team_2',                  false, false, 15),
      ('basic_orders',            false, false, 16),
      ('basic_inventory',         false, false, 17),
      ('email_support_basic',     false, false, 18)
  )
  update public.product_features f
     set saas_product_id = v_egrow,
         is_active = cfg.is_active,
         is_highlighted = cfg.is_highlighted,
         sort_order = cfg.sort_order
    from ranked r
    join cfg on cfg.feature_key = r.feature_key
   where f.id = r.id
     and r.rn = 1
     and not exists (
       select 1 from public.product_features x
        where x.saas_product_id = v_egrow
          and x.feature_key = r.feature_key
     );

  -- Any feature row still attached to a legacy variant is a per-key
  -- duplicate: preserve the record but keep it out of the public catalogue.
  update public.product_features f
     set is_active = false
    from public.saas_products p
   where p.id = f.saas_product_id
     and p.slug in ('e-grow-standard', 'e-grow-enterprise', 'e-grow-startup');

end $$;
