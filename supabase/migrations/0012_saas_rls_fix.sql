-- ============================================================
-- SBBT E-Grow — SaaS RLS Fix
-- Fixes incorrect RLS from 0011.
-- ------------------------------------------------------------
-- 0011 created policies using `company_id = auth.uid()`, which
-- compares a company UUID to a *user* UUID and is therefore
-- always FALSE. Those dead policies are dropped here before the
-- correct, company-scoped policies are (re)created.
-- ============================================================

-- 0. Drop stale broken policies from 0011 (always-false guards).
drop policy if exists "Subscriptions are company-scoped." on public.subscriptions;
drop policy if exists "Company usage is company-scoped." on public.company_usage;
drop policy if exists "User company roles are company-scoped." on public.user_company_roles;

-- 1. plans — Global SaaS data
alter table public.plans enable row level security;

create policy "plans_select_all" on public.plans
  for select using (true);

create policy "plans_master_admin_only" on public.plans
  for all using (public.is_master_admin());

-- 2. plan_features — Global SaaS feature definitions
alter table public.plan_features enable row level security;

create policy "plan_features_select_all" on public.plan_features
  for select using (true);

create policy "plan_features_master_admin_only" on public.plan_features
  for all using (public.is_master_admin());

-- 3. subscriptions — Company-scoped subscription records
alter table public.subscriptions enable row level security;

create policy "subscriptions_select_company" on public.subscriptions
  for select using (company_id = public.current_company_id());

create policy "subscriptions_insert_company" on public.subscriptions
  for insert with check (company_id = public.current_company_id());

create policy "subscriptions_master_admin" on public.subscriptions
  for all using (public.is_master_admin());

-- 4. company_usage — Company usage tracking
alter table public.company_usage enable row level security;

create policy "company_usage_select_company" on public.company_usage
  for select using (company_id = public.current_company_id());

create policy "company_usage_master_admin" on public.company_usage
  for all using (public.is_master_admin());

-- 5. user_company_roles — Multi-company membership
alter table public.user_company_roles enable row level security;

-- Users see their own memberships
create policy "user_company_roles_select_own" on public.user_company_roles
  for select using (user_id = auth.uid());

-- Master Admin can see all memberships
create policy "user_company_roles_select_master_admin" on public.user_company_roles
  for select using (public.is_master_admin());

-- Company Admin can see memberships within their company
create policy "user_company_roles_select_company_admin" on public.user_company_roles
  for select using (
    public.current_user_role() = 'company_admin'::public.user_role
    and company_id = public.current_company_id()
  );