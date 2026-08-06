-- ============================================================
-- SBBT E-Grow — Initial Schema + Row Level Security
-- Live Plant E-commerce Multi-tenant ERP
-- ============================================================
-- Every tenant-scoped table carries:
--   id, company_id, created_at, updated_at, created_by
-- Future modules are added as NEW tables only — never alter this file.
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================

create type public.user_role as enum (
  'master_admin',
  'company_admin',
  'staff'
);

create type public.order_stage as enum (
  'entry',
  'purchase',
  'packing',
  'delivery'
);

create type public.payment_status as enum (
  'expected',
  'partial',
  'received'
);

create type public.product_status as enum (
  'active',
  'inactive'
);

-- ============================================================
-- COMPANIES
-- ============================================================

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- PROFILES  (links auth.users → company + role)
-- ============================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  company_id uuid references public.companies (id) on delete set null,
  full_name text,
  role public.user_role not null default 'staff',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_company_id_idx on public.profiles (company_id);
create index profiles_role_idx on public.profiles (role);

-- ============================================================
-- MARKETPLACES  (dynamic — never hardcoded in application code)
-- ============================================================

create table public.marketplaces (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  slug text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  unique (company_id, slug)
);

create index marketplaces_company_id_idx on public.marketplaces (company_id);

-- ============================================================
-- SELLER ACCOUNTS  (unlimited per marketplace)
-- ============================================================

create table public.seller_accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  marketplace_id uuid not null references public.marketplaces (id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  unique (company_id, marketplace_id, name)
);

create index seller_accounts_company_id_idx on public.seller_accounts (company_id);
create index seller_accounts_marketplace_id_idx on public.seller_accounts (marketplace_id);

-- ============================================================
-- PRODUCTS
-- Buying price ONLY.
-- Selling price is NEVER stored — always entered manually at order time.
-- ============================================================

create table public.products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  sku text not null,
  name text not null,
  buying_price numeric(12, 2) not null check (buying_price >= 0),
  category text,
  image_url text,
  status public.product_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  unique (company_id, sku)
);

create index products_company_id_idx on public.products (company_id);
create index products_company_category_idx on public.products (company_id, category);

-- ============================================================
-- ORDERS  (header)
-- ============================================================

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  order_date date not null default current_date,
  marketplace_id uuid not null references public.marketplaces (id) on delete restrict,
  seller_account_id uuid not null references public.seller_accounts (id) on delete restrict,
  stage public.order_stage not null default 'entry',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null
);

create index orders_company_id_idx on public.orders (company_id);
create index orders_company_date_idx on public.orders (company_id, order_date desc);
create index orders_marketplace_id_idx on public.orders (marketplace_id);
create index orders_seller_account_id_idx on public.orders (seller_account_id);

-- ============================================================
-- ORDER ITEMS  (line items with quantity flow)
-- Quantity flow: ordered → buy → packed → delivered
-- Selling price is captured HERE at order time (never on the product).
-- ============================================================

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  ordered_qty numeric(12, 2) not null check (ordered_qty > 0),
  buy_qty numeric(12, 2) not null default 0 check (buy_qty >= 0),
  packed_qty numeric(12, 2) not null default 0 check (packed_qty >= 0),
  delivered_qty numeric(12, 2) not null default 0 check (delivered_qty >= 0),
  selling_price numeric(12, 2) not null check (selling_price >= 0),
  buying_price numeric(12, 2) not null check (buying_price >= 0),
  total_sale numeric(12, 2) generated always as (selling_price * delivered_qty) stored,
  total_purchase numeric(12, 2) generated always as (buying_price * buy_qty) stored,
  profit numeric(12, 2) generated always as ((selling_price * delivered_qty) - (buying_price * buy_qty)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null
);

create index order_items_company_id_idx on public.order_items (company_id);
create index order_items_order_id_idx on public.order_items (order_id);
create index order_items_product_id_idx on public.order_items (product_id);

-- ============================================================
-- PAYMENTS
-- Manual only. No payment gateway.
-- ============================================================

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  delivery_date date,
  expected_payment_date date,
  amount_expected numeric(12, 2) not null check (amount_expected >= 0),
  amount_received numeric(12, 2) not null default 0 check (amount_received >= 0),
  pending numeric(12, 2) generated always as (amount_expected - amount_received) stored,
  status public.payment_status not null default 'expected',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null
);

create index payments_company_id_idx on public.payments (company_id);
create index payments_order_id_idx on public.payments (order_id);

-- ============================================================
-- SETTINGS  (key/value JSON, per company)
-- ============================================================

create table public.settings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  key text not null,
  value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  unique (company_id, key)
);

create index settings_company_id_idx on public.settings (company_id);

-- ============================================================
-- HELPERS  (used by RLS policies)
-- ============================================================

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id from public.profiles where id = auth.uid()
$$;

create or replace function public.is_master_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() = 'master_admin'::public.user_role
$$;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- updated_at keeper applied to every mutable table.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger companies_set_updated_at
  before update on public.companies
  for each row execute function public.set_updated_at();

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger marketplaces_set_updated_at
  before update on public.marketplaces
  for each row execute function public.set_updated_at();

create trigger seller_accounts_set_updated_at
  before update on public.seller_accounts
  for each row execute function public.set_updated_at();

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create trigger order_items_set_updated_at
  before update on public.order_items
  for each row execute function public.set_updated_at();

create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

create trigger settings_set_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();

-- Auto-create a profile row when a new auth user signs up.
-- The very first user to ever sign up becomes the master admin (bootstrap).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    ),
    case
      when not exists (select 1 from public.profiles) then 'master_admin'::public.user_role
      else 'staff'::public.user_role
    end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep payment status consistent with received amounts.
create or replace function public.sync_payment_status()
returns trigger
language plpgsql
as $$
begin
  if new.amount_received >= new.amount_expected and new.amount_expected > 0 then
    new.status := 'received'::public.payment_status;
  elsif new.amount_received > 0 then
    new.status := 'partial'::public.payment_status;
  else
    new.status := 'expected'::public.payment_status;
  end if;
  return new;
end;
$$;

create trigger payments_sync_status
  before insert or update of amount_expected, amount_received on public.payments
  for each row execute function public.sync_payment_status();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- ---- COMPANIES -------------------------------------------------

alter table public.companies enable row level security;

create policy "companies_select" on public.companies
  for select using (
    public.is_master_admin()
    or id = public.current_company_id()
  );

create policy "companies_insert" on public.companies
  for insert with check (public.is_master_admin());

create policy "companies_update" on public.companies
  for update using (public.is_master_admin());

create policy "companies_delete" on public.companies
  for delete using (public.is_master_admin());

-- ---- PROFILES --------------------------------------------------

alter table public.profiles enable row level security;

create policy "profiles_select" on public.profiles
  for select using (
    id = auth.uid()
    or public.is_master_admin()
    or company_id = public.current_company_id()
  );

-- Self-registration creates exactly one profile row for the caller.
create policy "profiles_insert" on public.profiles
  for insert with check (id = auth.uid());

-- Company admins manage staff in their own company.
-- Self-service profile edits go through SECURITY DEFINER helpers below.
create policy "profiles_update" on public.profiles
  for update using (
    public.is_master_admin()
    or (
      company_id = public.current_company_id()
      and public.current_user_role() = 'company_admin'::public.user_role
    )
  );

-- ---- MARKETPLACES ----------------------------------------------

alter table public.marketplaces enable row level security;

create policy "marketplaces_select" on public.marketplaces
  for select using (
    public.is_master_admin()
    or company_id = public.current_company_id()
  );

create policy "marketplaces_insert" on public.marketplaces
  for insert with check (
    public.is_master_admin()
    or (
      company_id = public.current_company_id()
      and public.current_user_role() = 'company_admin'::public.user_role
    )
  );

create policy "marketplaces_update" on public.marketplaces
  for update using (
    public.is_master_admin()
    or (
      company_id = public.current_company_id()
      and public.current_user_role() = 'company_admin'::public.user_role
    )
  );

create policy "marketplaces_delete" on public.marketplaces
  for delete using (
    public.is_master_admin()
    or (
      company_id = public.current_company_id()
      and public.current_user_role() = 'company_admin'::public.user_role
    )
  );

-- ---- SELLER ACCOUNTS -------------------------------------------

alter table public.seller_accounts enable row level security;

create policy "seller_accounts_select" on public.seller_accounts
  for select using (
    public.is_master_admin()
    or company_id = public.current_company_id()
  );

create policy "seller_accounts_insert" on public.seller_accounts
  for insert with check (
    public.is_master_admin()
    or (
      company_id = public.current_company_id()
      and public.current_user_role() = 'company_admin'::public.user_role
    )
  );

create policy "seller_accounts_update" on public.seller_accounts
  for update using (
    public.is_master_admin()
    or (
      company_id = public.current_company_id()
      and public.current_user_role() = 'company_admin'::public.user_role
    )
  );

create policy "seller_accounts_delete" on public.seller_accounts
  for delete using (
    public.is_master_admin()
    or (
      company_id = public.current_company_id()
      and public.current_user_role() = 'company_admin'::public.user_role
    )
  );

-- ---- PRODUCTS --------------------------------------------------

alter table public.products enable row level security;

create policy "products_select" on public.products
  for select using (
    public.is_master_admin()
    or company_id = public.current_company_id()
  );

create policy "products_insert" on public.products
  for insert with check (
    public.is_master_admin()
    or (
      company_id = public.current_company_id()
      and public.current_user_role() = 'company_admin'::public.user_role
    )
  );

create policy "products_update" on public.products
  for update using (
    public.is_master_admin()
    or (
      company_id = public.current_company_id()
      and public.current_user_role() = 'company_admin'::public.user_role
    )
  );

create policy "products_delete" on public.products
  for delete using (
    public.is_master_admin()
    or (
      company_id = public.current_company_id()
      and public.current_user_role() = 'company_admin'::public.user_role
    )
  );

-- ---- ORDERS ----------------------------------------------------

alter table public.orders enable row level security;

create policy "orders_select" on public.orders
  for select using (
    public.is_master_admin()
    or company_id = public.current_company_id()
  );

create policy "orders_insert" on public.orders
  for insert with check (
    public.is_master_admin()
    or (
      company_id = public.current_company_id()
      and public.current_user_role() in ('company_admin'::public.user_role, 'staff'::public.user_role)
    )
  );

create policy "orders_update" on public.orders
  for update using (
    public.is_master_admin()
    or (
      company_id = public.current_company_id()
      and public.current_user_role() in ('company_admin'::public.user_role, 'staff'::public.user_role)
    )
  );

create policy "orders_delete" on public.orders
  for delete using (
    public.is_master_admin()
    or (
      company_id = public.current_company_id()
      and public.current_user_role() = 'company_admin'::public.user_role
    )
  );

-- ---- ORDER ITEMS -----------------------------------------------

alter table public.order_items enable row level security;

create policy "order_items_select" on public.order_items
  for select using (
    public.is_master_admin()
    or company_id = public.current_company_id()
  );

create policy "order_items_insert" on public.order_items
  for insert with check (
    public.is_master_admin()
    or (
      company_id = public.current_company_id()
      and public.current_user_role() in ('company_admin'::public.user_role, 'staff'::public.user_role)
    )
  );

create policy "order_items_update" on public.order_items
  for update using (
    public.is_master_admin()
    or (
      company_id = public.current_company_id()
      and public.current_user_role() in ('company_admin'::public.user_role, 'staff'::public.user_role)
    )
  );

create policy "order_items_delete" on public.order_items
  for delete using (
    public.is_master_admin()
    or (
      company_id = public.current_company_id()
      and public.current_user_role() = 'company_admin'::public.user_role
    )
  );

-- ---- PAYMENTS --------------------------------------------------

alter table public.payments enable row level security;

create policy "payments_select" on public.payments
  for select using (
    public.is_master_admin()
    or company_id = public.current_company_id()
  );

create policy "payments_insert" on public.payments
  for insert with check (
    public.is_master_admin()
    or (
      company_id = public.current_company_id()
      and public.current_user_role() in ('company_admin'::public.user_role, 'staff'::public.user_role)
    )
  );

create policy "payments_update" on public.payments
  for update using (
    public.is_master_admin()
    or (
      company_id = public.current_company_id()
      and public.current_user_role() in ('company_admin'::public.user_role, 'staff'::public.user_role)
    )
  );

create policy "payments_delete" on public.payments
  for delete using (
    public.is_master_admin()
    or (
      company_id = public.current_company_id()
      and public.current_user_role() = 'company_admin'::public.user_role
    )
  );

-- ---- SETTINGS --------------------------------------------------

alter table public.settings enable row level security;

create policy "settings_select" on public.settings
  for select using (
    public.is_master_admin()
    or company_id = public.current_company_id()
  );

create policy "settings_insert" on public.settings
  for insert with check (
    public.is_master_admin()
    or (
      company_id = public.current_company_id()
      and public.current_user_role() = 'company_admin'::public.user_role
    )
  );

create policy "settings_update" on public.settings
  for update using (
    public.is_master_admin()
    or (
      company_id = public.current_company_id()
      and public.current_user_role() = 'company_admin'::public.user_role
    )
  );

create policy "settings_delete" on public.settings
  for delete using (
    public.is_master_admin()
    or (
      company_id = public.current_company_id()
      and public.current_user_role() = 'company_admin'::public.user_role
    )
  );

-- ============================================================
-- SECURITY DEFINER HELPERS (profile management)
-- Self-profile editing and admin provisioning without raw RLS risk.
-- ============================================================

-- Let a user update their own full_name only.
create or replace function public.update_my_profile(p_full_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
     set full_name = p_full_name,
         updated_at = now()
   where id = auth.uid();
end;
$$;

-- Assign a profile to a company. Master admin may assign any profile to
-- any company. Company admins may only assign profiles within their own
-- company (used when inviting staff under the same company).
create or replace function public.assign_profile_company(p_profile_id uuid, p_company_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (public.current_user_role() in ('master_admin'::public.user_role, 'company_admin'::public.user_role)) then
    raise exception 'Not authorized';
  end if;

  if public.current_user_role() = 'company_admin'::public.user_role
     and not exists (
       select 1
         from public.profiles
        where id = auth.uid()
          and company_id = p_company_id
     ) then
    raise exception 'Not authorized to modify this company';
  end if;

  update public.profiles
     set company_id = p_company_id,
         updated_at = now()
   where id = p_profile_id;
end;
$$;

-- Only the master admin can change a user's role.
create or replace function public.set_profile_role(p_profile_id uuid, p_role public.user_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_master_admin() then
    raise exception 'Not authorized';
  end if;

  update public.profiles
     set role = p_role,
         updated_at = now()
   where id = p_profile_id;
end;
$$;

-- ============================================================
-- GRANTS  (authenticated users get table access via RLS policies)
-- ============================================================

grant usage on schema public to authenticated;
grant all on all tables in schema public to authenticated;
grant execute on all functions in schema public to authenticated;