-- ============================================================
-- SBBT E-Grow — Extended Company Profile
-- Phase 14.7: Company Admin Settings
-- ============================================================

alter table public.companies
  add column if not exists legal_name text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists pincode text,
  add column if not exists country text;

comment on column public.companies.legal_name is 'Legal entity name for invoicing';
comment on column public.companies.city is 'City of registered address';
comment on column public.companies.state is 'State of registered address';
comment on column public.companies.pincode is 'Postal code';
comment on column public.companies.country is 'Country of registered address';

-- Ensure existing rows get sensible defaults for new columns
update public.companies
  set country = 'India'
  where country is null;
