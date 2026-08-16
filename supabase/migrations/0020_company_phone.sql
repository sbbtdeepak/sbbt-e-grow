-- ===========================================================
-- SBBT E-Grow — Company contact phone
-- Additive migration only. No RLS / policy changes: the existing
-- "companies_update" policy (is_master_admin() OR own company_admin)
-- already governs writes to this column.
-- ===========================================================

alter table public.companies
  add column if not exists phone text;

comment on column public.companies.phone is
  'Primary contact phone number for the company.';
