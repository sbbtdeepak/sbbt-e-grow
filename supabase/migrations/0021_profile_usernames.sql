-- ===========================================================
-- SBBT E-Grow — Application User ID (profiles.username)
--
-- Additive migration only. `username` is the application's
-- stable identity / login identifier for company users:
--   {company-slug}.admin     for the company admin
--   {company-slug}.staffN    for staff (never reused)
--
-- Email remains the Supabase Auth identity (contact, recovery,
-- invitation). Master Admin is global and NOT company-scoped:
-- master keeps username = NULL and logs in with email.
--
-- The username is generated server-side by the application
-- (lib/auth/usernames.ts) — never accepted from a client. The
-- unique index below enforces global uniqueness at the DB level;
-- NULLs are exempt so existing users (and master) are unaffected.
--
-- No RLS change: generation/assignment happens via the service
-- client inside guarded server actions, and the existing
-- profiles policies (own-row / master / same-company read,
-- master-only insert) are unchanged.
-- ===========================================================

alter table public.profiles
  add column if not exists username text;

comment on column public.profiles.username is
  'Application User ID for company users, e.g. acme.admin / acme.staff1. '
  'Globally unique and never reused. Master admin has no username '
  '(email login). Email remains the Supabase Auth identity.';

-- Enforce global uniqueness at the DB level. Postgres unique indexes
-- allow multiple NULLs, so existing users without a username are fine.
create unique index if not exists profiles_username_key
  on public.profiles (username);

-- -----------------------------------------------------------
-- Backfill for EXISTING users (idempotent: only rows with
-- username IS NULL). Deterministic, rule-based — never guessed:
--   company_admin -> {slug}.admin
--   staff         -> {slug}.staffN  (N ordered by created_at, id)
-- SBBT Demo: admin@sbbt.in -> sbbt-demo.admin, user@sbbt.in ->
-- sbbt-demo.staff1. QA companies have no profiles. Master
-- (master@sbbt.in, company_id NULL) is intentionally excluded.
-- -----------------------------------------------------------

-- Company admins (one per company; numbered defensively if a
-- legacy company ever held more than one).
with numbered as (
  select
    p.id,
    c.slug || '.admin' ||
      case when rn = 1 then '' else rn::text end as new_username
  from (
    select
      id,
      company_id,
      row_number() over (
        partition by company_id order by created_at, id
      ) as rn
    from public.profiles
    where role = 'company_admin' and username is null and company_id is not null
  ) p
  join public.companies c on c.id = p.company_id
)
update public.profiles p
set username = n.new_username
from numbered n
where p.id = n.id;

-- Staff (numbered per company, ordered by created_at, id).
with numbered as (
  select
    p.id,
    c.slug || '.staff' ||
      row_number() over (
        partition by p.company_id order by p.created_at, p.id
      )::text as new_username
  from (
    select id, company_id, created_at
    from public.profiles
    where role = 'staff' and username is null and company_id is not null
  ) p
  join public.companies c on c.id = p.company_id
)
update public.profiles p
set username = n.new_username
from numbered n
where p.id = n.id;
