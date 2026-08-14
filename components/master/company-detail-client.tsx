"use client";

import { useState } from "react";
import { format } from "date-fns";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import {
  assignPlan,
  changePlan,
  setSubscriptionStatus,
  startTrial,
  extendTrial,
  setSubscriptionPeriod,
  cancelSubscription,
  reactivateSubscription,
} from "@/app/master/companies/actions";
import type { Plan } from "@/lib/saas/entitlements";
import type { Database } from "@/types/database";

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
};

export function CompanyDetailClient({
  company,
  subscription,
  plan,
  usage,
  plans,
}: CompanyDetailClientProps) {
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [trialDays, setTrialDays] = useState("14");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const hasSubscription = subscription !== null;
  const isCancelled = subscription?.status === "cancelled" || subscription?.status === "expired";

  const handleAssignPlan = async () => {
    if (!selectedPlan) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    const result = await assignPlan(company.id, selectedPlan);
    if (!result.ok) setError(result.error);
    else setSuccess("Plan assigned successfully.");
    setSaving(false);
  };

  const handleChangePlan = async () => {
    if (!selectedPlan || !hasSubscription) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    const result = await changePlan(company.id, selectedPlan);
    if (!result.ok) setError(result.error);
    else setSuccess("Plan changed successfully.");
    setSaving(false);
  };

  const handleStatusChange = async () => {
    if (!selectedStatus || !hasSubscription) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    const result = await setSubscriptionStatus(
      company.id,
      selectedStatus as Subscription["status"],
    );
    if (!result.ok) setError(result.error);
    else setSuccess(`Status updated to ${selectedStatus}.`);
    setSaving(false);
  };

  const handleStartTrial = async () => {
    if (!hasSubscription) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    const result = await startTrial(company.id, parseInt(trialDays, 10));
    if (!result.ok) setError(result.error);
    else setSuccess("Trial started.");
    setSaving(false);
  };

  const handleExtendTrial = async () => {
    if (!hasSubscription) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    const result = await extendTrial(company.id, parseInt(trialDays, 10));
    if (!result.ok) setError(result.error);
    else setSuccess("Trial extended.");
    setSaving(false);
  };

  const handlePeriodSet = async () => {
    if (!hasSubscription) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    const result = await setSubscriptionPeriod(
      company.id,
      periodStart,
      periodEnd,
    );
    if (!result.ok) setError(result.error);
    else setSuccess("Billing period updated.");
    setSaving(false);
  };

  const handleCancel = async () => {
    if (!hasSubscription) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    const result = await cancelSubscription(company.id, null);
    if (!result.ok) setError(result.error);
    else setSuccess("Subscription cancelled.");
    setSaving(false);
  };

  const handleReactivate = async () => {
    if (!selectedPlan || !hasSubscription) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    const result = await reactivateSubscription(company.id, selectedPlan);
    if (!result.ok) setError(result.error);
    else setSuccess("Subscription reactivated.");
    setSaving(false);
  };

  const visiblePlans = plans.filter((p) => p.is_active);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* ── Company Info ── */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold">Company</h2>
        <div className="mt-4 space-y-1 text-sm">
          <p><span className="text-muted-foreground">Name:</span> {company.name}</p>
          <p><span className="text-muted-foreground">Legal:</span> {company.legal_name ?? "—"}</p>
          <p><span className="text-muted-foreground">GST:</span> {company.gst ?? "—"}</p>
          <p><span className="text-muted-foreground">City:</span> {company.city ?? "—"}</p>
          <p><span className="text-muted-foreground">State:</span> {company.state ?? "—"}</p>
          <p><span className="text-muted-foreground">Country:</span> {company.country ?? "—"}</p>
        </div>
      </Card>

      {/* ── Subscription Summary ── */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold">Subscription</h2>
        {hasSubscription ? (
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plan</span>
              <span>{plan?.name ?? "Unknown"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={
                subscription!.status === "active" || subscription!.status === "trialing"
                  ? "default"
                  : "destructive"
              } className="capitalize">
                {subscription!.status}
              </Badge>
            </div>
            {subscription!.trial_start && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Trial Start</span>
                <span>{format(new Date(subscription!.trial_start), "PP")}</span>
              </div>
            )}
            {subscription!.trial_end && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Trial End</span>
                <span>{format(new Date(subscription!.trial_end), "PP")}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Period Start</span>
              <span>{format(new Date(subscription!.current_period_start), "PP")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Period End</span>
              <span>{format(new Date(subscription!.current_period_end), "PP")}</span>
            </div>
            {subscription!.cancelled_at && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cancelled At</span>
                <span>{format(new Date(subscription!.cancelled_at), "PP")}</span>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            No subscription assigned.
          </p>
        )}
      </Card>

      {/* ── Usage ── */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold">Usage</h2>
        <div className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Products</span>
            <span>{usage.products}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Marketplaces</span>
            <span>{usage.marketplaces}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Seller Accounts</span>
            <span>{usage.sellerAccounts}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Staff</span>
            <span>{usage.staff}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Monthly Orders</span>
            <span>{usage.monthlyOrders}</span>
          </div>
        </div>
      </Card>

      {/* ── Plan & Status ── */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold">Plan & Status</h2>
        <p className="text-sm text-muted-foreground">
          Assign or change the plan. Changing plans does not delete
          existing data.
        </p>

        <div className="mt-4 space-y-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Select Plan</label>
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

          {!hasSubscription ? (
            <Button
              onClick={handleAssignPlan}
              disabled={!selectedPlan || saving}
            >
              {saving ? "Assigning…" : "Assign Plan"}
            </Button>
          ) : (
            <Button
              onClick={handleChangePlan}
              disabled={!selectedPlan || saving}
              variant="outline"
            >
              {saving ? "Changing…" : "Change Plan"}
            </Button>
          )}
        </div>

        <Separator className="my-4" />

        <div className="space-y-4">
          <div className="flex flex-col gap-2">
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
            <Button
              onClick={handleStatusChange}
              disabled={!selectedStatus || !hasSubscription || saving}
              variant="outline"
              size="sm"
            >
              {saving ? "Updating…" : "Update Status"}
            </Button>
          </div>
        </div>
      </Card>

      {/* ── Trial Controls ── */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold">Trial</h2>
        <p className="text-sm text-muted-foreground">
          Start or extend a trial period for this company.
        </p>

        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Trial Duration (days)</label>
            <input
              type="number"
              min={1}
              max={730}
              value={trialDays}
              onChange={(e) => setTrialDays(e.target.value)}
              className="w-20 rounded-md border px-3 py-2 text-sm"
            />
          </div>

          {!subscription ? (
            <Button onClick={handleStartTrial} disabled={saving || !hasSubscription}>
              {saving ? "Starting…" : "Start Trial"}
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button onClick={handleStartTrial} disabled={saving} variant="outline" size="sm">
                {saving ? "Starting…" : "Start Trial"}
              </Button>
              <Button onClick={handleExtendTrial} disabled={saving} variant="outline" size="sm">
                {saving ? "Extending…" : "Extend Trial"}
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* ── Period Controls ── */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold">Billing Period</h2>
        <p className="text-sm text-muted-foreground">
          Set the current billing period. Period end must be after
          period start.
        </p>

        <div className="mt-4 flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Period Start</label>
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Period End</label>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="rounded-md border px-3 py-2 text-sm"
              />
            </div>
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
      </Card>

      {/* ── Plan Features ── */}
      {plan && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold">Plan Features</h2>
          <p className="text-sm text-muted-foreground">
            Enabled features and limits for {plan.name}.
          </p>

          <div className="mt-4 space-y-3 text-sm">
            {plan.features &&
              Object.entries(plan.features as Record<string, unknown>).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-muted-foreground capitalize">
                    {key.replace(/_/g, " ")}
                  </span>
                  <Badge variant={value ? "default" : "secondary"}>
                    {value ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              ))}
          </div>

          {plan.limits &&
          Object.keys(plan.limits as Record<string, unknown>).length > 0 && (
            <>
              <Separator className="my-3" />
              <h3 className="mt-3 text-sm font-medium">Limits</h3>
              <div className="mt-2 space-y-2 text-sm">
                {Object.entries(plan.limits as Record<string, unknown>).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-muted-foreground capitalize">
                      {key.replace(/_/g, " ")}
                    </span>
                    <span>{value?.toString() ?? "—"}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      )}

      {/* ── Cancel / Reactivate ── */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-destructive">Danger Zone</h2>
        <p className="text-sm text-muted-foreground">
          {isCancelled
            ? "This subscription is cancelled or expired."
            : "Cancelling will end the subscription immediately."}
        </p>

        {isCancelled ? (
          <Button
            onClick={handleReactivate}
            disabled={!selectedPlan || saving}
            className="mt-4"
          >
            {saving ? "Reactivating…" : "Reactivate"}
          </Button>
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="mt-4">
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
                  className="bg-destructive text-destructive-foreground"
                >
                  {saving ? "Cancelling…" : "Confirm Cancel"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}
    </div>
  );
}
