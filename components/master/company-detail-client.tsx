"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Activity,
  AlertTriangle,
  Ban,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  KeyRound,
  RefreshCcw,
  SearchCheck,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  assignPlan,
  changePlan,
  setSubscriptionStatus,
  startTrial,
  extendTrial,
  setSubscriptionPeriod,
  cancelSubscription,
  reactivateSubscription,
  inviteCompanyAdmin,
  inviteAdminDiagnostics,
  resendCompanyAdminInvite,
  resetCompanyAdminPassword,
  setCompanyActive,
  deleteCompany,
} from "@/app/master/companies/actions";
import type {
  InviteDiagnosticResult,
  InviteDiagnosticStatus,
} from "@/app/master/companies/actions";
import type { AccountStatus } from "@/lib/auth/invite-state";
import { TemporaryCredentials } from "@/components/auth/temporary-credentials";
import type { Plan } from "@/lib/saas/entitlements";
import type { Database } from "@/types/database";
import { CompanyInfoForm } from "./company-info-form";

type Company = Database["public"]["Tables"]["companies"]["Row"];
type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];

type CompanyDetailClientProps = {
  company: Company;
  subscription: Subscription | null;
  plan: Plan | null;
  usage: {
    products: number;
    marketplaces: number;
    sellerAccounts: number;
    staff: number;
    monthlyOrders: number;
  };
  plans: Plan[];
  hasCompanyAdmin: boolean;
  companyAdminEmail: string | null;
  /** Application User ID of the company admin (e.g. acme.admin). */
  companyAdminUsername: string | null;
  /**
   * Honest account status (Phase 24.8): none | setup_pending | active |
   * suspended | invited. Never "active" merely because a profile exists.
   */
  adminSetupState: AccountStatus;
};

const SUB_STATUS_PILL: Record<string, string> = {
  active: "status-pill status-pill-success",
  trialing: "status-pill status-pill-info",
  past_due: "status-pill status-pill-warning",
  cancelled: "status-pill status-pill-danger",
  expired: "status-pill status-pill-neutral",
};

const DIAG_META: Record<
  InviteDiagnosticStatus,
  { label: string; pill: string; icon: typeof CheckCircle2 }
> = {
  READY_TO_INVITE: {
    label: "Ready to invite",
    pill: "status-pill status-pill-success",
    icon: CheckCircle2,
  },
  ALREADY_REGISTERED: {
    label: "Already registered",
    pill: "status-pill status-pill-info",
    icon: UserRound,
  },
  ALREADY_COMPANY_ADMIN: {
    label: "Already company admin",
    pill: "status-pill status-pill-neutral",
    icon: ShieldCheck,
  },
  EXISTING_OTHER_COMPANY: {
    label: "Belongs to another company",
    pill: "status-pill status-pill-warning",
    icon: AlertTriangle,
  },
  INVALID_EMAIL: {
    label: "Invalid email",
    pill: "status-pill status-pill-danger",
    icon: AlertTriangle,
  },
  INVALID_COMPANY: {
    label: "Invalid company",
    pill: "status-pill status-pill-danger",
    icon: AlertTriangle,
  },
};

export function CompanyDetailClient({
  company,
  subscription,
  plan,
  usage,
  plans,
  companyAdminEmail,
  companyAdminUsername,
  adminSetupState,
}: CompanyDetailClientProps) {
  const router = useRouter();

  // Subscription state — seeded from server props so persisted values show.
  const [selectedPlan, setSelectedPlan] = useState<string>(plan?.id ?? "");
  const [selectedStatus, setSelectedStatus] = useState<string>(
    subscription?.status ?? "",
  );
  const [trialDays, setTrialDays] = useState("14");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Company admin recovery + diagnostics state.
  const [adminEmail, setAdminEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminSuccess, setAdminSuccess] = useState<string | null>(null);
  const [diag, setDiag] = useState<InviteDiagnosticResult | null>(null);
  // One-time temporary credentials returned by invite/reset actions.
  const [credentials, setCredentials] = useState<{
    username: string;
    email: string;
    temporaryPassword: string;
    title?: string;
  } | null>(null);

  // Account status (archive / reactivate).
  const [togglingActive, setTogglingActive] = useState(false);

  // Permanent delete (empty companies only).
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const hasSubscription = subscription !== null;
  const isCancelled =
    subscription?.status === "cancelled" || subscription?.status === "expired";

  const visiblePlans = plans.filter((p) => p.is_active);

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const handleAssignPlan = async () => {
    if (!selectedPlan) return;
    setSaving(true);
    clearMessages();
    const result = await assignPlan(company.id, selectedPlan);
    if (!result.ok) setError(result.error);
    else {
      setSuccess("Plan assigned successfully.");
      setSelectedPlan("");
      router.refresh();
    }
    setSaving(false);
  };

  const handleChangePlan = async () => {
    if (!selectedPlan || !hasSubscription) return;
    setSaving(true);
    clearMessages();
    const result = await changePlan(company.id, selectedPlan);
    if (!result.ok) setError(result.error);
    else {
      setSuccess("Plan changed successfully.");
      setSelectedPlan("");
      router.refresh();
    }
    setSaving(false);
  };

  const handleStatusChange = async () => {
    if (!selectedStatus || !hasSubscription) return;
    setSaving(true);
    clearMessages();
    const result = await setSubscriptionStatus(
      company.id,
      selectedStatus as Subscription["status"],
    );
    if (!result.ok) setError(result.error);
    else {
      setSuccess(`Status updated to ${selectedStatus}.`);
      setSelectedStatus(result.data?.status ?? "");
      router.refresh();
    }
    setSaving(false);
  };

  const handleStartTrial = async () => {
    if (!hasSubscription) return;
    setSaving(true);
    clearMessages();
    const result = await startTrial(company.id, parseInt(trialDays, 10));
    if (!result.ok) setError(result.error);
    else {
      setSuccess("Trial started.");
      setSelectedStatus("trialing");
      router.refresh();
    }
    setSaving(false);
  };

  const handleExtendTrial = async () => {
    if (!hasSubscription) return;
    setSaving(true);
    clearMessages();
    const result = await extendTrial(company.id, parseInt(trialDays, 10));
    if (!result.ok) setError(result.error);
    else {
      setSuccess("Trial extended.");
      setSelectedStatus("trialing");
      router.refresh();
    }
    setSaving(false);
  };

  const handlePeriodSet = async () => {
    if (!hasSubscription) return;
    setSaving(true);
    clearMessages();
    const result = await setSubscriptionPeriod(company.id, periodStart, periodEnd);
    if (!result.ok) setError(result.error);
    else {
      setSuccess("Billing period updated.");
      setPeriodStart("");
      setPeriodEnd("");
      router.refresh();
    }
    setSaving(false);
  };

  const handleCancel = async () => {
    if (!hasSubscription) return;
    setSaving(true);
    clearMessages();
    const result = await cancelSubscription(company.id, null);
    if (!result.ok) setError(result.error);
    else {
      setSuccess("Subscription cancelled.");
      setSelectedStatus("cancelled");
      router.refresh();
    }
    setSaving(false);
  };

  const handleReactivate = async () => {
    if (!selectedPlan || !hasSubscription) return;
    setSaving(true);
    clearMessages();
    const result = await reactivateSubscription(company.id, selectedPlan);
    if (!result.ok) setError(result.error);
    else {
      setSuccess("Subscription reactivated.");
      setSelectedPlan("");
      setSelectedStatus("active");
      router.refresh();
    }
    setSaving(false);
  };

  const handleInviteAdmin = async () => {
    if (!adminEmail.trim()) return;
    setInviting(true);
    setAdminError(null);
    setAdminSuccess(null);
    setCredentials(null);
    const result = await inviteCompanyAdmin(company.id, adminEmail.trim());
    if (!result.ok) setAdminError(result.error);
    else {
      setAdminSuccess(
        "Company admin account created. The temporary password is shown below — the first login requires changing it.",
      );
      setCredentials({
        username: result.data.username ?? "",
        email: result.data.email,
        temporaryPassword: result.data.temporaryPassword,
        title: "Company admin account created",
      });
      setAdminEmail("");
      setDiag(null);
      router.refresh();
    }
    setInviting(false);
  };

  const handleResendAdmin = async () => {
    setResending(true);
    setAdminError(null);
    setAdminSuccess(null);
    setCredentials(null);
    const result = await resendCompanyAdminInvite(company.id);
    if (!result.ok) setAdminError(result.error);
    else {
      setAdminSuccess(
        "Invitation resent. The company admin will receive a new email.",
      );
      router.refresh();
    }
    setResending(false);
  };

  const handleResetAdmin = async () => {
    setResending(true);
    setAdminError(null);
    setAdminSuccess(null);
    setCredentials(null);
    const result = await resetCompanyAdminPassword(company.id);
    if (!result.ok) setAdminError(result.error);
    else {
      setAdminSuccess(
        "A new temporary password was issued. The previous password no longer works — the first login requires changing it.",
      );
      setCredentials({
        username: result.data.username ?? "",
        email: result.data.email,
        temporaryPassword: result.data.temporaryPassword,
        title: "Password reset — temporary password",
      });
      router.refresh();
    }
    setResending(false);
  };

  const handleCheckReadiness = async () => {
    if (!adminEmail.trim()) return;
    setChecking(true);
    setAdminError(null);
    setAdminSuccess(null);
    setDiag(null);
    const result = await inviteAdminDiagnostics(company.id, adminEmail.trim());
    if (!result.ok) setAdminError(result.error);
    else setDiag(result.data);
    setChecking(false);
  };

  const handleToggleActive = async () => {
    setTogglingActive(true);
    const result = await setCompanyActive(company.id, !company.is_active);
    if (!result.ok) setError(result.error);
    else {
      setSuccess(
        company.is_active
          ? "Company archived. Its users can no longer access the ERP."
          : "Company reactivated. Its users can access the ERP again.",
      );
      router.refresh();
    }
    setTogglingActive(false);
  };

  const handleDelete = async () => {
    if (deleteConfirm.trim() !== company.name) return;
    setDeleting(true);
    setDeleteError(null);
    const result = await deleteCompany(company.id, deleteConfirm);
    if (!result.ok) {
      setDeleteError(result.error);
      setDeleting(false);
      return;
    }
    // Company is gone — return to the list.
    router.push("/master/companies");
    router.refresh();
  };

  // Heuristic for disabling the delete button in the UI; the server action
  // is the authoritative guard and checks every business table. User
  // accounts (admin/staff) do NOT block deletion — they are removed with
  // the company. Only ERP business data blocks.
  const hasVisibleBusinessData =
    usage.products > 0 ||
    usage.marketplaces > 0 ||
    usage.sellerAccounts > 0 ||
    usage.monthlyOrders > 0;

  // Server-side protection is authoritative; this mirrors it for the UI.
  const isProtectedCompany = company.slug === "sbbt-demo";

  const initials = company.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="flex flex-col gap-6">
      {/* ── Overview strip ── */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <span
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-xl text-base font-semibold ring-1 ring-inset",
              company.is_active
                ? "bg-brand/10 text-brand ring-brand/15"
                : "bg-muted text-muted-foreground ring-border",
            )}
          >
            {initials || "?"}
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold">{company.name}</p>
            <p className="font-mono text-sm text-muted-foreground">
              {company.slug}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "status-pill",
                company.is_active ? "status-pill-success" : "status-pill-warning",
              )}
            >
              {company.is_active ? "Active" : "Archived"}
            </span>
            {plan ? (
              <span className="status-pill status-pill-info">{plan.name}</span>
            ) : null}
          </div>
          <div className="ml-auto min-w-0">
            <p className="text-sm text-muted-foreground">Created</p>
            <p className="text-sm">
              {format(new Date(company.created_at), "MMM d, yyyy")}
            </p>
          </div>
        </div>
      </Card>

      {/* ── Company Information (editable) ── */}
      <CompanyInfoForm company={company} />

      {/* ── Subscription ── */}
      <Card className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-brand/10 text-brand ring-1 ring-inset ring-brand/15">
            <CreditCard className="size-4" />
          </span>
          <div>
            <h2 className="text-base font-semibold tracking-tight">
              Subscription
            </h2>
            <p className="text-sm text-muted-foreground">
              Plan, status and billing period for this tenant.
            </p>
          </div>
        </div>

        {hasSubscription ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Current Plan
              </p>
              <p className="mt-1.5">
                <span className="status-pill status-pill-info">
                  {plan?.name ?? "Unknown"}
                </span>
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Status
              </p>
              <p className="mt-1.5">
                <span
                  className={SUB_STATUS_PILL[subscription!.status] ?? "status-pill status-pill-neutral"}
                >
                  {subscription!.status}
                </span>
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Billing Period
              </p>
              <p className="mt-1.5 text-sm">
                {format(new Date(subscription!.current_period_start), "MMM d")} –{" "}
                {format(new Date(subscription!.current_period_end), "MMM d, yyyy")}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Trial
              </p>
              <p className="mt-1.5 text-sm">
                {subscription!.trial_start && subscription!.trial_end
                  ? `${format(new Date(subscription!.trial_start), "MMM d")} – ${format(
                      new Date(subscription!.trial_end),
                      "MMM d, yyyy",
                    )}`
                  : "Not applicable"}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            No subscription assigned yet. Assign a plan below.
          </p>
        )}

        <Separator className="my-5" />

        {/* Plan controls */}
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-sm font-medium">Change Plan</label>
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a plan" />
                </SelectTrigger>
                <SelectContent>
                  {visiblePlans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} (${p.price_monthly}/mo)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={hasSubscription ? handleChangePlan : handleAssignPlan}
              disabled={!selectedPlan || saving}
            >
              {saving
                ? "Saving…"
                : hasSubscription
                  ? "Change Plan"
                  : "Assign Plan"}
            </Button>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-sm font-medium">Subscription Status</label>
              <Select
                value={selectedStatus}
                onValueChange={setSelectedStatus}
                disabled={!hasSubscription || saving}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Set status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trialing">Trialing</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="past_due">Past Due</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleStatusChange}
              disabled={!selectedStatus || !hasSubscription || saving}
              variant="outline"
            >
              {saving ? "Updating…" : "Update Status"}
            </Button>
          </div>
        </div>

        {/* Trial + Period controls */}
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CalendarDays className="size-4 text-muted-foreground" />
              Trial
            </div>
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground">
                  Duration (days)
                </label>
                <input
                  type="number"
                  min={1}
                  max={730}
                  value={trialDays}
                  onChange={(e) => setTrialDays(e.target.value)}
                  className="w-20 rounded-md border bg-background px-3 py-2 text-sm"
                />
              </div>
              <Button
                onClick={handleStartTrial}
                disabled={saving || !hasSubscription}
                variant="outline"
                size="sm"
              >
                {saving ? "Starting…" : "Start Trial"}
              </Button>
              {hasSubscription ? (
                <Button
                  onClick={handleExtendTrial}
                  disabled={saving}
                  variant="ghost"
                  size="sm"
                >
                  {saving ? "Extending…" : "Extend"}
                </Button>
              ) : null}
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CalendarDays className="size-4 text-muted-foreground" />
              Billing Period
            </div>
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground">Start</label>
                <input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  className="rounded-md border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground">End</label>
                <input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  className="rounded-md border bg-background px-3 py-2 text-sm"
                />
              </div>
              <Button
                onClick={handlePeriodSet}
                disabled={!periodStart || !periodEnd || saving}
                variant="outline"
                size="sm"
              >
                {saving ? "Setting…" : "Set Period"}
              </Button>
            </div>
          </div>
        </div>

        {/* Cancel / Reactivate subscription */}
        <div className="mt-5 flex items-center justify-between rounded-xl border border-border/70 p-4">
          <div>
            <p className="text-sm font-medium">
              {isCancelled ? "Subscription is cancelled" : "Cancel subscription"}
            </p>
            <p className="text-xs text-muted-foreground">
              {isCancelled
                ? "Reactivate to restore access and renew the billing period."
                : "Existing data is never deleted. You can reactivate later."}
            </p>
          </div>
          {isCancelled ? (
            <div className="flex items-center gap-2">
              <Select
                value={selectedPlan}
                onValueChange={setSelectedPlan}
                disabled={saving}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Plan" />
                </SelectTrigger>
                <SelectContent>
                  {visiblePlans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleReactivate}
                disabled={!selectedPlan || saving}
                className="gap-1.5"
              >
                <RefreshCcw className="size-4" />
                {saving ? "Reactivating…" : "Reactivate"}
              </Button>
            </div>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                  Cancel Subscription
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will set the subscription status to cancelled.
                    Existing data will not be deleted. Are you sure?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleCancel}
                    disabled={saving}
                    className="bg-red-600 text-white hover:bg-red-700"
                  >
                    {saving ? "Cancelling…" : "Confirm Cancel"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </Card>

      {/* ── Company Admin ── */}
      <Card className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-brand/10 text-brand ring-1 ring-inset ring-brand/15">
            <ShieldCheck className="size-4" />
          </span>
          <div>
            <h2 className="text-base font-semibold tracking-tight">
              Company Admin
            </h2>
            <p className="text-sm text-muted-foreground">
              Administrator ownership of this tenant.
            </p>
          </div>
        </div>

        {adminSetupState === "none" ? (
          <div className="mt-4 space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-amber-200/70 bg-amber-50/50 p-4 dark:border-amber-400/20 dark:bg-amber-950/30">
              <span className="flex size-9 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                <AlertTriangle className="size-5" />
              </span>
              <div>
                <p className="text-sm font-medium">No Company Admin</p>
                <p className="text-sm text-muted-foreground">
                  This company does not currently have an administrator.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="admin-email">
                Admin Email
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="admin-email"
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@example.com"
                  disabled={inviting || checking}
                  className="sm:max-w-xs"
                />
                <Button
                  onClick={handleCheckReadiness}
                  disabled={!adminEmail.trim() || inviting || checking}
                  variant="outline"
                  className="gap-1.5"
                >
                  <SearchCheck className="size-4" />
                  {checking ? "Checking…" : "Check readiness"}
                </Button>
                <Button
                  onClick={handleInviteAdmin}
                  disabled={!adminEmail.trim() || inviting || checking}
                  className="gap-1.5"
                >
                  {inviting ? "Sending…" : "Invite Admin"}
                </Button>
              </div>
            </div>

            {/* Diagnostics result */}
            {diag ? (
              <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  {(() => {
                    const meta = DIAG_META[diag.status];
                    const Icon = meta.icon;
                    return (
                      <span className={cn("status-pill", meta.pill)}>
                        <Icon className="size-3.5" />
                        {meta.label}
                      </span>
                    );
                  })()}
                  {diag.status === "READY_TO_INVITE" ? (
                    <span className="status-pill status-pill-success">
                      {diag.companyName}
                    </span>
                  ) : null}
                </div>
                <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                  {diag.details.map((d, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground/50" />
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="status-pill status-pill-warning">
                    <AlertTriangle className="size-3.5" />
                    Rate limit not checkable
                  </span>
                  <p className="text-xs text-muted-foreground">
                    Invitation callback:{" "}
                    <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px]">
                      {diag.redirectUrl}
                    </code>
                  </p>
                </div>
              </div>
            ) : null}
            {adminError ? (
              <p className="text-sm text-destructive" role="alert">
                {adminError}
              </p>
            ) : null}
            {adminSuccess ? (
              <p className="text-sm text-emerald-600 dark:text-emerald-500" role="status">
                {adminSuccess}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {/* Status card — honest account state, never "Active" merely
                because a profile exists. */}
            {(() => {
              const meta =
                adminSetupState === "active"
                  ? {
                      label: "Active",
                      pill: "status-pill-success",
                      icon: CheckCircle2,
                      iconWrap:
                        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
                      text: "Password setup is complete — the admin can sign in.",
                    }
                  : adminSetupState === "suspended"
                    ? {
                        label: "Suspended",
                        pill: "status-pill-danger",
                        icon: Ban,
                        iconWrap:
                          "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
                        text: "This admin's account is deactivated and cannot sign in.",
                      }
                    : adminSetupState === "invited"
                      ? {
                          label: "Invitation pending",
                          pill: "status-pill-warning",
                          icon: AlertTriangle,
                          iconWrap:
                            "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
                          text: "An invitation email was sent but has not been confirmed.",
                        }
                      : {
                          label: "Setup pending",
                          pill: "status-pill-warning",
                          icon: AlertTriangle,
                          iconWrap:
                            "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
                          text: "The account exists but the admin has not set a personal password yet.",
                        };
              const Icon = meta.icon;
              return (
                <div
                  className={cn(
                    "flex flex-wrap items-center gap-4 rounded-xl border p-4",
                    adminSetupState === "active"
                      ? "border-emerald-200/70 bg-emerald-50/50 dark:border-emerald-400/20 dark:bg-emerald-950/30"
                      : adminSetupState === "suspended"
                        ? "border-red-200/70 bg-red-50/50 dark:border-red-400/20 dark:bg-red-950/30"
                        : "border-amber-200/70 bg-amber-50/50 dark:border-amber-400/20 dark:bg-amber-950/30",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-9 items-center justify-center rounded-full",
                      meta.iconWrap,
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">
                      {companyAdminUsername ?? "Company Admin"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {companyAdminEmail ?? "Admin account"}
                    </p>
                    <p className="text-xs text-muted-foreground">{meta.text}</p>
                  </div>
                  <span className={cn("status-pill", meta.pill)}>
                    {meta.label}
                  </span>
                </div>
              );
            })()}

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={handleResetAdmin}
                disabled={resending}
                variant="outline"
                className="gap-1.5"
              >
                <KeyRound className="size-4" />
                {resending ? "Resetting…" : "Reset password"}
              </Button>
              {adminSetupState === "invited" ? (
                <Button
                  onClick={handleResendAdmin}
                  disabled={resending}
                  variant="ghost"
                  className="gap-1.5"
                >
                  <RefreshCcw className="size-4" />
                  {resending ? "Sending…" : "Resend invitation"}
                </Button>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              Reset password issues a new temporary password (shown once) and
              forces a password change on the next login. The old password
              stops working immediately.
            </p>

            {credentials ? (
              <TemporaryCredentials
                title={credentials.title ?? "Temporary password"}
                username={credentials.username}
                email={credentials.email}
                temporaryPassword={credentials.temporaryPassword}
              />
            ) : null}

            {adminError ? (
              <p className="text-sm text-destructive" role="alert">
                {adminError}
              </p>
            ) : null}
            {adminSuccess ? (
              <p className="text-sm text-emerald-600 dark:text-emerald-500" role="status">
                {adminSuccess}
              </p>
            ) : null}
          </div>
        )}
      </Card>

      {/* ── Usage ── */}
      <Card className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-brand/10 text-brand ring-1 ring-inset ring-brand/15">
            <Activity className="size-4" />
          </span>
          <div>
            <h2 className="text-base font-semibold tracking-tight">Usage</h2>
            <p className="text-sm text-muted-foreground">
              Current resource usage across this company.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Products", usage.products],
            ["Marketplaces", usage.marketplaces],
            ["Seller Accounts", usage.sellerAccounts],
            ["Staff", usage.staff],
            ["Monthly Orders", usage.monthlyOrders],
          ].map(([label, value]) => (
            <div key={label as string}>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {label as string}
              </p>
              <p className="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums">
                {value as number}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Account Status (archive / reactivate) ── */}
      <Card className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex size-9 items-center justify-center rounded-lg ring-1 ring-inset",
              company.is_active
                ? "bg-emerald-50 text-emerald-600 ring-emerald-600/15"
                : "bg-amber-50 text-amber-600 ring-amber-600/15",
            )}
          >
            <Ban className="size-4" />
          </span>
          <div>
            <h2 className="text-base font-semibold tracking-tight">
              Account Status
            </h2>
            <p className="text-sm text-muted-foreground">
              {company.is_active
                ? "This company is currently active."
                : "This company is archived. Its users cannot access the ERP."}
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between rounded-xl border border-border/70 p-4">
          <span
            className={cn(
              "status-pill",
              company.is_active ? "status-pill-success" : "status-pill-warning",
            )}
          >
            {company.is_active ? "Active" : "Archived"}
          </span>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant={company.is_active ? "outline" : "default"}
                className={
                  company.is_active
                    ? "text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                    : "gap-1.5"
                }
              >
                {company.is_active ? (
                  <>
                    <Ban className="size-4" /> Deactivate company
                  </>
                ) : (
                  <>
                    <RefreshCcw className="size-4" /> Reactivate company
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {company.is_active
                    ? `Archive ${company.name}?`
                    : `Reactivate ${company.name}?`}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {company.is_active
                    ? "The company will be archived. Its users will no longer be able to access the ERP. No data is deleted, and you can reactivate it at any time."
                    : "The company will be reactivated and its users will regain ERP access. No data is changed."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleToggleActive}
                  disabled={togglingActive}
                  className={
                    company.is_active
                      ? "bg-amber-600 text-white hover:bg-amber-700"
                      : undefined
                  }
                >
                  {togglingActive
                    ? "Saving…"
                    : company.is_active
                      ? "Deactivate"
                      : "Reactivate"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </Card>

      {/* ── Danger Zone (permanent delete — empty companies only) ── */}
      <Card className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-red-50 text-red-600 ring-1 ring-inset ring-red-600/15">
            <Trash2 className="size-4" />
          </span>
          <div>
            <h2 className="text-base font-semibold tracking-tight">
              Danger Zone
            </h2>
            <p className="text-sm text-muted-foreground">
              Permanent deletion is only available for companies with no
              business data.
            </p>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-red-200/70 bg-red-50/40 p-4 dark:border-red-400/20 dark:bg-red-950/20">
          {isProtectedCompany ? (
            <p className="text-sm text-muted-foreground">
              <span className="status-pill status-pill-neutral">Protected company</span>{" "}
              This demo tenant is protected and cannot be permanently deleted
              (server-enforced). You can archive it if needed.
            </p>
          ) : hasVisibleBusinessData ? (
            <p className="text-sm text-muted-foreground">
              This company contains business data, so it cannot be permanently
              deleted. Archive the company instead — no data is removed.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              This company has no business data and can be permanently deleted.
              Its user accounts (admin/staff) will also be permanently
              removed. This cannot be undone.
            </p>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={isProtectedCompany || hasVisibleBusinessData}
                className="mt-3 gap-1.5 text-red-600 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="size-4" />
                {isProtectedCompany ? "Protected Company" : "Delete Company"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Permanently delete {company.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently deletes the company, its subscription, and
                  its user accounts (admin/staff). This cannot be undone. The
                  server will refuse if any business data exists. Type{" "}
                  <span className="font-mono font-semibold text-foreground">
                    {company.name}
                  </span>{" "}
                  to confirm.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="px-6">
                <Input
                  value={deleteConfirm}
                  onChange={(e) => {
                    setDeleteConfirm(e.target.value);
                    setDeleteError(null);
                  }}
                  placeholder="Type the company name to confirm"
                  disabled={deleting}
                  autoFocus
                />
                {deleteError ? (
                  <p className="mt-2 text-sm text-destructive" role="alert">
                    {deleteError}
                  </p>
                ) : null}
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel
                  disabled={deleting}
                  onClick={() => {
                    setDeleteConfirm("");
                    setDeleteError(null);
                  }}
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={
                    deleting || deleteConfirm.trim() !== company.name
                  }
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  {deleting ? "Deleting…" : "Permanently Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </Card>

      {/* ── Plan Features ── */}
      {plan ? (
        <Card className="p-5 sm:p-6">
          <h2 className="text-base font-semibold tracking-tight">Plan Features</h2>
          <p className="text-sm text-muted-foreground">
            Enabled features and limits for {plan.name}.
          </p>
          <div className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {plan.features &&
              Object.entries(plan.features as Record<string, unknown>).map(
                ([key, value]) => (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground capitalize">
                      {key.replace(/_/g, " ")}
                    </span>
                    <span className={cn("status-pill", value ? "status-pill-success" : "status-pill-neutral")}>
                      {value ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                ),
              )}
          </div>
        </Card>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {success ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-500">{success}</p>
      ) : null}
    </div>
  );
}
