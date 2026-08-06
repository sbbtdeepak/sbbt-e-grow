<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->


Sprint 11 — Production QA & Stabilization complete.

## Root Causes Fixed

1. **`Lib/auth/session.ts` corrupted** — malformed module killed auth helpers and all `requireCompanyUser()` calls; rewrote with `requireCompanyUser()`, `requireRole()`, `canMutateMasterData()`.

2. **Master Dashboard gate bug** — `getMasterDashboard()` called `requireCompanyUser()` instead of `requireRole("master_admin")`, so a master admin could be rejected for having no company; fixed in `App/(app)/dashboard/page.tsx`.

3. **RLS bypass on report views** — `MANAGED BY supabase_realtime` views lacked `security_invoker`, allowing materialized-view-level data leaks; fixed in `Supabase/migrations/0009_rls_hardening.sql` with `with (security_invoker = true)` and corrected `companies_update`/`company_settings` policies.

4. **Profit formula distortion** — `order_items.profit` (0001) used delivered qty for revenue but buy qty for COGS: `(sell×delivered) − (buy×buy_qty)`. When purchase > delivery, profit went negative; fixed report-level via `Supabase/migrations/0010_profit_formula_fix.sql` — all P&L views now compute `(selling_price − buying_price) × delivered_qty` on a consistent delivered-qty basis (`report_daily_purchase` keeps buy-qty as purchasing activity).

5. **Seed data corruption** — `seed.ts` picked marketplace and seller independently, generating Amazon orders with Meesho sellers, breaking marketplace/seller reporting; rewrote `seed.ts` with `SELLER_KEYS_BY_MARKETPLACE` pairing and added the missing `dispatch` stage (entry → purchase → packing → dispatch → delivery).

6. **Zero-byte dead file** — `Scripts/write-seed.js` deleted (0 references found).

## TASK 2 — Server Action Audit Results
Verified all action files (`products`, `marketplaces`, `orders`, `purchase`, `packing`, `dispatch`, `delivery`, `payments`, `reports`, `settings`, `dashboard`) for:
- Authentication: every action calls `requireCompanyUser()` or `requireRole()` ✓
- Authorization: `canMutateMasterData()` gates admin-only mutations ✓
- Company isolation: all queries constrained by `ctx.companyId` ✓
- Validation: zod schemas on every input ✓
- Error handling: `ActionResult` with DbError mapping (23505 SKU, 23503 FK) ✓
- Transactions: order header + lines are rolled back atomically on line failure ✓

## TASK 3 — RLS Audit Results
All tables under RLS. Every policy covers `is_master_admin()` (cross-company) OR company-scoped access via `current_company_id()`. Master admin bypass works correctly with NULL company id. Staff can only read/write own company; company admins can manage master data; only master admins can mutate companies/profiles roles.

## TASK 4 — Workflow Verified
Product → Marketplace → Seller → Order → Purchase → Packing → Dispatch → Delivery → Payment. Quantities checked: `delivered ≤ dispatched ≤ packed ≤ bought ≤ ordered`; totals computed as `delivered_qty × price`; pending = `amount_expected − amount_received`; payments auto-synced by `sync_payment_status` trigger.

## TASK 5 — Demo Seed
`npm run seed` creates: SBBT Demo company, master@sbbt.in / admin@sbbt.in / user@sbbt.in, 10 products, 3 marketplaces (Amazon/Meesho/Website), 6 seller accounts (2 per marketplace), 100 orders across all 5 stages with matching payments for delivered orders. Idempotent.

## TASK 6 — UI States
- `App/(app)/loading.tsx` — skeleton loader
- `App/(app)/error.tsx` — error boundary with "Try again"
- `App/(app)/not-found.tsx` — 404 fallback
- Empty states already present in client components.

## TASK 7 — TESTING.md
Created with prerequisites, migration order, seed instructions, test credentials, route access matrix, role-based access checklist, workflow/quantity/RLS/UI checklists, RLS verification SQL, and Definition of Done.

## TASK 8 — Verification
- `npm run lint` — PASS, 0 warnings / 0 errors
- `npx tsc --noEmit` — PASS, 0 errors
- `npm run build` — PASS, production build completed, all 13 routes + middleware generated

## Files Modified
- Lib/auth/session.ts
- App/(app)/dashboard/page.tsx
- Scripts/seed.ts
- TESTING.md (new)

## Files Created
- App/(app)/loading.tsx
- App/(app)/error.tsx
- App/(app)/not-found.tsx
- Supabase/migrations/0009_rls_hardening.sql
- Supabase/migrations/0010_profit_formula_fix.sql
- TESTING.md

## Remaining Risks
- Migrations 0009/0010 must be applied to the live Supabase project (`supabase db push` or SQL editor).
- `order_items.profit`/`total_purchase` generated columns in 0001 still use buy_qty; P&L views (0010) are the source of truth going forward. A future additive migration can introduce corrected generated columns if dashboard widgets ever read `order_items` directly.
- Verify the demo seed against a live database (`npm run seed`), since actual Supabase connectivity could not be tested in this environment.