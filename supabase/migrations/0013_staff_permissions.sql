-- ============================================================
-- SBBT E-Grow — Staff Management & Granular Permissions
-- Additive migration only.
-- ============================================================

-- ============================================================
-- 1. profiles — add is_active for staff activation lifecycle
-- ============================================================
-- Existing profiles remain active (default true). Deactivating
-- staff sets is_active = false so they cannot access the ERP.
alter table public.profiles
  add column if not exists is_active boolean not null default true;

-- Back-fill: existing profiles are active.
update public.profiles set is_active = true where is_active is null;

-- ============================================================
-- 2. user_permissions — granular per-module permissions
-- ============================================================
-- One row per (user, company, permission). Master-data permissions
-- (products, marketplaces, seller_accounts) are stored but only
-- effective for company_admin / master_admin (enforced server-side
-- via canMutateMasterData — staff can never mutate master data
-- regardless of what is stored here).
create table if not exists public.user_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  permission text not null,
  is_allowed boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique (user_id, company_id, permission)
);

comment on table public.user_permissions is 'Granular per-module permissions for staff users';
comment on column public.user_permissions.user_id is 'Reference to auth.users id';
comment on column public.user_permissions.company_id is 'References public.companies';
comment on column public.user_permissions.permission is 'Module permission key (e.g. orders, reports)';
comment on column public.user_permissions.is_allowed is 'Whether the permission is granted';

create index if not exists user_permissions_user_id_idx on public.user_permissions (user_id);
create index if not exists user_permissions_company_id_idx on public.user_permissions (company_id);

-- ============================================================
-- 3. RLS — company-scoped permission access
-- ============================================================
alter table public.user_permissions enable row level security;

-- Staff can read their own company's permissions (lookup at runtime).
create policy "user_permissions_select_company" on public.user_permissions
  for select using (company_id = public.current_company_id());

-- Only company_admin can manage permissions within their company.
create policy "user_permissions_insert_company_admin" on public.user_permissions
  for insert with check (
    company_id = public.current_company_id()
    and public.current_user_role() = 'company_admin'::public.user_role
  );

create policy "user_permissions_update_company_admin" on public.user_permissions
  for update using (
    company_id = public.current_company_id()
    and public.current_user_role() = 'company_admin'::public.user_role
  )
  with check (
    company_id = public.current_company_id()
    and public.current_user_role() = 'company_admin'::public.user_role
  );

create policy "user_permissions_delete_company_admin" on public.user_permissions
  for delete using (
    company_id = public.current_company_id()
    and public.current_user_role() = 'company_admin'::public.user_role
  );

-- Master Admin has system-level access.
create policy "user_permissions_master_admin" on public.user_permissions
  for all using (public.is_master_admin());

-- ============================================================
-- 4. profiles — staff can read their own is_active (already
--    covered by existing profiles_select policy). No new policy
--    needed; company_admin already controls updates via
--    profiles_update (0001).
-- ============================================================

-- ============================================================
-- Migration Summary
-- ============================================================
-- Staff management foundation: profiles.is_active column for
-- activation lifecycle, user_permissions table for granular
-- per-module permissions with company-scoped RLS.
