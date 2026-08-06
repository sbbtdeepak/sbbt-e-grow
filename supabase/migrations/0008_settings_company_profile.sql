-- ============================================================
-- SBBT E-Grow — Settings & Company Profile
-- Additive migration only.
-- ============================================================

-- Company profile fields
alter table public.companies
  add column if not exists logo_url text;

alter table public.companies
  add column if not exists gst text;

alter table public.companies
  add column if not exists address text;

alter table public.companies
  add column if not exists timezone text not null default 'UTC';

alter table public.companies
  add column if not exists currency text not null default 'INR';

alter table public.companies
  add column if not exists financial_year_start date;

alter table public.companies
  add column if not exists theme text not null default 'light';

-- Company-level settings key-value store
create table if not exists public.company_settings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  key text not null,
  value jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique (company_id, key)
);

alter table public.company_settings enable row level security;

create policy "Company settings are company-scoped."
  on public.company_settings
  for all
  using (company_id = auth.uid());
