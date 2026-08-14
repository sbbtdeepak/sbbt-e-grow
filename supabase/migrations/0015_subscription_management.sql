-- ============================================================
-- SBBT E-Grow — Subscription updated_at trigger
-- Phase 14.8: Subscription Lifecycle Management
-- ============================================================

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

drop trigger if exists company_usage_set_updated_at on public.company_usage;
create trigger company_usage_set_updated_at
  before update on public.company_usage
  for each row execute function public.set_updated_at();
