# TESTING.md

SBBT E-Grow — Production QA & Stabilization Guide

---

## 1. Prerequisites

| Requirement | Value |
|---|---|
| Node.js | 18+ |
| npm | 10+ |
| Supabase project | running with migrations 0001–0009 applied |
| `.env.local` | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |

---

## 2. How to Install

```bash
npm install
```

---

## 3. How to Apply Migrations

All migrations live in `Supabase/migrations/`.

| File | Purpose |
|---|---|
| `0001_initial_schema.sql` | Tables, RLS, roles, triggers, generated columns |
| `0002_purchase_module.sql` | Purchase stage |
| `0003_packing_module.sql` | Packing stage |
| `0004_dispatch_module.sql` | Dispatch stage |
| `0005_delivery_module.sql` | Delivery stage |
| `0006_payment_module.sql` | Payments |
| `0007_reports_engine.sql` | Report views |
| `0008_settings_company_profile.sql` | Settings + company profile |
| `0009_rls_hardening.sql` | RLS hardening (security_invoker views, company_settings fix, companies_update fix) |

Apply in order via Supabase dashboard SQL editor or `supabase db push`.

---

## 4. How to Seed Demo Data

```bash
npm run seed
```

Creates (idempotent — safe to re-run):

| Entity | Count |
|---|---|
| Company | SBBT Demo (slug: `sbbt-demo`) |
| Users | 3 |
| Products | 10 |
| Marketplaces | 3 |
| Seller Accounts | 6 (2 per marketplace) |
| Orders | 100 |
| Payments | created for delivered orders |

Order workflow coverage (full pipeline):

```
entry → purchase → packing → dispatch → delivery
```

Each demo order links a seller that belongs to the order's marketplace.

---

## 5. Test Credentials

### Admin (App)

| Role | Email | Password |
|---|---|---|
| Master Admin | master@sbbt.in | Master@123 |
| Company Admin | admin@sbbt.in | Admin@123 |
| Staff | user@sbbt.in | User@123 |

### Superbase (if running locally)

```
Default supabase credentials
```

---

## 6. How to Run

### Development

```bash
npm run dev
```

Open http://localhost:3000

| Route | Access |
|---|---|
| `/` | Public landing |
| `/login` | Login |
| `/dashboard` | Role-based dashboard |
| `/products` | Master data (master_admin, company_admin) |
| `/marketplaces` | Master data (master_admin, company_admin) |
| `/orders` | Company-scoped |
| `/purchase` | Company-scoped |
| `/packing` | Company-scoped |
| `/dispatch` | Company-scoped |
| `/delivery` | Company-scoped |
| `/payments` | Company-scoped |
| `/reports` | Company-scoped |
| `/settings` | Company-scoped profile settings |

### Production build + type check

```bash
npm run lint
npm run build
npx tsc --noEmit
```

All three must complete with **0 warnings, 0 errors**.

---

## 7. Role-Based Access Checklist

| Resource | Master Admin | Company Admin | Staff |
|---|---|---|---|
| All companies | ✓ | ✗ | ✗ |
| Own company data | ✓ | ✓ | ✓ |
| Other companies | ✗ | ✗ | ✗ |
| Products (create/update/delete) | ✓ | ✓ | ✗ |
| Marketplaces (create/update/delete) | ✓ | ✓ | ✗ |
| Seller Accounts (create/update/delete) | ✓ | ✓ | ✗ |
| Orders/Purchase/Packing/Dispatch/Delivery/Payments | ✓ | ✓ | ✓ |
| Reports (own company only) | ✓ | ✓ | ✓ |
| Settings (own company profile) | ✓ | ✓ | ✗ (no mutation) |

---

## 8. QA Workflow Checklist

### 8.1 Login

- [ ] `master@sbbt.in` logs into `/dashboard` (master view)
- [ ] `admin@sbbt.in` logs into `/dashboard` (company view)
- [ ] `user@sbbt.in` logs into `/dashboard` (staff view)
- [ ] Invalid credentials show error
- [ ] Logout works and returns to `/login`

### 8.2 Master Data

- [ ] Create product (SKU, name, buying price, category, image, status)
- [ ] Edit product
- [ ] Delete product
- [ ] Create marketplace
- [ ] Edit marketplace
- [ ] Create seller account (linked to marketplace)
- [ ] Edit seller account

### 8.3 Order Flow

- [ ] Create order (marketplace → seller → products → quantities → selling prices)
- [ ] Order advances to purchase
- [ ] Purchase sets buy quantity
- [ ] Packing sets packed quantity
- [ ] Dispatch sets dispatch quantity
- [ ] Delivery sets delivered quantity
- [ ] Payment created for delivered order

### 8.4 Quantity Integrity

- [ ] `delivered_qty <= dispatch_qty <= packed_qty <= buy_qty <= ordered_qty`
- [ ] `total_sale = delivered_qty * selling_price`
- [ ] `total_purchase = delivered_qty * buying_price`
- [ ] `profit = total_sale - total_purchase`
- [ ] `pending = amount_expected - amount_received`

### 8.5 Reports

- [ ] Daily sales totals match orders
- [ ] Marketplace report groups by marketplace
- [ ] Seller report groups by seller
- [ ] Product report groups by product
- [ ] Pending payments shows expected/partial
- [ ] Received payments shows received
- [ ] Cancelled / RTO report filters correctly

### 8.6 RLS / Data Isolation

- [ ] Company Admin sees only SBBT Demo data
- [ ] Staff sees only SBBT Demo data
- [ ] No user can read another company's data (verify via Supabase SQL editor with `auth.uid()` simulation)

### 8.7 UI States

- [ ] Loading skeleton shows while pages render
- [ ] Empty states show on data-less modules
- [ ] Error state with "Try again" on runtime errors
- [ ] 404 page for unknown routes

---

## 9. RLS Verification SQL

Run these in Supabase SQL editor to confirm isolation:

```sql
-- 1. simulate authenticated user (replace with real user id)
select set_config('request.jwt.claims', '{"sub": "<user-id>"}', false);

-- 2. confirm user sees only own company rows
select count(*) from public.orders;              -- only own company
select count(*) from public.products;            -- only own company
select count(*) from public.report_daily_sales;  -- only own company (security_invoker)
```

---

## 10. Definition of Done

- [ ] `npm run lint` — 0 errors
- [ ] `npm run build` — 0 errors
- [ ] `npx tsc --noEmit` — 0 errors
- [ ] Demo seed runs clean
- [ ] All workflows verified end-to-end
- [ ] RLS isolation verified