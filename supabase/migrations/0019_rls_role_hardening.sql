-- ============================================================
-- SBBT E-Grow — RLS Role Hardening (Phase 21)
-- ------------------------------------------------------------
-- Closes privilege-escalation paths found in the Phase 20 audit:
--
--   P0-1  profiles UPDATE allowed a company_admin to set
--         role = 'master_admin' (self or any in-company row)
--         via direct Supabase REST — full RLS bypass.
--   P0-2  profiles INSERT (id = auth.uid()) let a removed user
--         re-create their profile with an arbitrary role/company,
--         regaining access (even as master_admin).
--   P1    subscriptions INSERT (company_id = current_company_id())
--         let any authenticated company user insert an active
--         Pro subscription for their company — entitlement
--         self-upgrade. Plus: enforce one row per company.
--
-- Additive + idempotent. No data changes, no DROP TABLE, no
-- role reassignment, no entitlement changes.
-- ============================================================

-- ------------------------------------------------------------
-- P0-1 — HARDEN profiles UPDATE
-- ------------------------------------------------------------
-- The USING clause is preserved exactly (master OR company_admin
-- scoped to their own company). The new WITH CHECK guarantees a
-- non-master writer can never produce a row with
-- role = 'master_admin', nor move a profile out of their own
-- company (cross-tenant reassignment).
--
-- Legitimate application writes are unaffected: self-service
-- edits go through SECURITY DEFINER helpers (update_my_profile,
-- assign_profile_company, set_profile_role) and staff management
-- uses the service-role admin client — both bypass RLS. The only
-- company_admin profile update via RLS is the account-settings
-- full_name self-edit, which preserves role and company_id and
-- therefore passes the WITH CHECK.
-- ------------------------------------------------------------
drop policy if exists "profiles_update" on public.profiles;

create policy "profiles_update" on public.profiles
  for update using (
    public.is_master_admin()
    or (
      company_id = public.current_company_id()
      and public.current_user_role() = 'company_admin'::public.user_role
    )
  )
  with check (
    public.is_master_admin()
    or (
      role <> 'master_admin'::public.user_role
      and company_id = public.current_company_id()
    )
  );

-- ------------------------------------------------------------
-- P0-2 — HARDEN profiles INSERT
-- ------------------------------------------------------------
-- Ordinary authenticated users may no longer insert profile rows
-- directly. Every legitimate creation path is already covered:
--   - handle_new_user trigger (SECURITY DEFINER) on auth signup
--   - inviteStaff / resendInvite via the service-role admin client
--   - master-admin server actions (is_master_admin() bypass)
-- A removed user can no longer re-create their own profile with
-- an arbitrary role or company.
-- ------------------------------------------------------------
drop policy if exists "profiles_insert" on public.profiles;

create policy "profiles_insert" on public.profiles
  for insert with check (public.is_master_admin());

-- ------------------------------------------------------------
-- P1 — HARDEN subscriptions
-- ------------------------------------------------------------
-- Company users keep SELECT on their own subscription
-- ("subscriptions_select_company") and read-only status in
-- /settings. All writes are master-admin only:
--   - INSERT: the company-scoped insert policy is removed; only
--     "subscriptions_master_admin" (FOR ALL) remains.
--   - UPDATE: already master-only — no company UPDATE policy has
--     ever existed (0012 created only select/insert company
--     policies), and master actions go through the master bypass.
-- ------------------------------------------------------------
drop policy if exists "subscriptions_insert_company" on public.subscriptions;

-- Enforce one subscription row per company.
-- Verified before adding: the live database contains no duplicate
-- company_id rows, and every master subscription action operates
-- on the single latest row (update-in-place, or insert only when
-- no row exists; cancel keeps the row). With one row per company,
-- getActiveSubscription() resolution is unambiguous.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'subscriptions_company_id_key'
      and conrelid = 'public.subscriptions'::regclass
  ) then
    alter table public.subscriptions
      add constraint subscriptions_company_id_key unique (company_id);
  end if;
end $$;

-- ------------------------------------------------------------
-- OPTIONAL — PUBLIC CATALOGUE ANON GRANTS
-- ------------------------------------------------------------
-- Explicit SELECT grants for the public catalogue tables so a
-- fresh deployment is deterministic. RLS remains authoritative:
-- every public policy filters to active rows (saas_products
-- is_active, and product_features/product_pricing require both
-- their own is_active flag and an active parent product), so
-- inactive/private data stays hidden from the anon role.
-- ------------------------------------------------------------
grant select on public.saas_products to anon;
grant select on public.product_features to anon;
grant select on public.product_pricing to anon;
