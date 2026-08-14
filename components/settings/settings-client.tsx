"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Building,
  User,
  Users,
  CreditCard,
  BarChart3,
  Lock,
  Save,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UsageMeter } from "@/components/saas/usage-meter";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { CompanyProfileInput, ChangePasswordInput } from "@/lib/validations/settings";
import { updateCompanyProfile, updateAccountProfile, changePassword } from "@/app/(app)/settings/actions";
import type { SubscriptionData, UsageStat } from "@/app/(app)/settings/actions";

type SettingsClientProps = {
  initialProfile: (CompanyProfileInput & { id: string }) | null;
  account: {
    userId: string;
    email: string;
    fullName: string | null;
    role: string;
    companyId: string | null;
    companyName: string | null;
  } | null;
  subscription: SubscriptionData | null;
  usage: UsageStat[];
  staffCount: { active: number; total: number };
};

type Tab =
  | "company"
  | "account"
  | "staff"
  | "subscription"
  | "usage"
  | "security";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "company", label: "Company Profile", icon: <Building className="size-4" /> },
  { id: "account", label: "Account", icon: <User className="size-4" /> },
  { id: "staff", label: "Staff", icon: <Users className="size-4" /> },
  { id: "subscription", label: "Subscription", icon: <CreditCard className="size-4" /> },
  { id: "usage", label: "Usage", icon: <BarChart3 className="size-4" /> },
  { id: "security", label: "Security", icon: <Lock className="size-4" /> },
];

export function SettingsClient({ initialProfile, account, subscription, usage, staffCount }: SettingsClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>("company");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const timezones = [
    "UTC",
    "Asia/Kolkata",
    "Asia/Dubai",
    "America/New_York",
    "Europe/London",
    "Asia/Singapore",
  ];

  const currencies = ["INR", "USD", "EUR", "GBP", "AED", "SGD"];

  const handleCompanySave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);
    const rawTheme = String(formData.get("theme") || "light");
    const theme = rawTheme === "dark" ? "dark" : "light";
    const data: CompanyProfileInput = {
      name: String(formData.get("name") || ""),
      legalName: String(formData.get("legalName") || "").trim() || null,
      logoUrl: String(formData.get("logoUrl") || "").trim() || null,
      gst: String(formData.get("gst") || "").trim() || null,
      address: String(formData.get("address") || "").trim() || null,
      city: String(formData.get("city") || "").trim() || null,
      state: String(formData.get("state") || "").trim() || null,
      pincode: String(formData.get("pincode") || "").trim() || null,
      country: String(formData.get("country") || "").trim() || null,
      timezone: String(formData.get("timezone") || "UTC"),
      currency: String(formData.get("currency") || "INR"),
      financialYearStart: String(formData.get("financialYearStart") || "").trim() || null,
      theme,
    };

    const result = await updateCompanyProfile(data);
    if (!result.ok) {
      setError(result.error ?? null);
    } else {
      setSuccess("Company profile updated successfully.");
    }
    setSaving(false);
  };

  const handleAccountSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);
    const fullName = String(formData.get("fullName") || "").trim() || null;

    const result = await updateAccountProfile(fullName);
    if (!result.ok) {
      setError(result.error ?? null);
    } else {
      setSuccess("Profile updated successfully.");
    }
    setSaving(false);
  };

  const handlePasswordChange = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);
    const data: ChangePasswordInput = {
      currentPassword: String(formData.get("currentPassword") || ""),
      newPassword: String(formData.get("newPassword") || ""),
      confirmPassword: String(formData.get("confirmPassword") || ""),
    };

    const result = await changePassword(data);
    if (!result.ok) {
      setError(result.error ?? null);
    } else {
      setSuccess("Password changed successfully.");
      (e.target as HTMLFormElement).reset();
    }
    setSaving(false);
  };

  const renderTab = () => {
    switch (activeTab) {
      case "company": {
        const profile = initialProfile;
        return profile ? (
          <form onSubmit={handleCompanySave} className="flex flex-col gap-6">
            <Card className="p-6">
              <h2 className="text-lg font-semibold">Company Details</h2>
              <p className="text-sm text-muted-foreground">
                These details appear on invoices and reports.
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name">Business Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={profile.name}
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="legalName">Legal Name</Label>
                  <Input
                    id="legalName"
                    name="legalName"
                    defaultValue={profile.legalName ?? ""}
                    placeholder="Legal entity name"
                  />
                </div>
                <div className="flex flex-col gap-2 sm:col-span-2">
                  <Label htmlFor="logoUrl">Logo URL</Label>
                  <Input
                    id="logoUrl"
                    name="logoUrl"
                    type="url"
                    defaultValue={profile.logoUrl ?? ""}
                    placeholder="https://example.com/logo.png"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="gst">GST Number</Label>
                  <Input
                    id="gst"
                    name="gst"
                    defaultValue={profile.gst ?? ""}
                    placeholder="27AAAAA0000A1Z5"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    name="country"
                    defaultValue={profile.country ?? "India"}
                  />
                </div>
                <div className="flex flex-col gap-2 sm:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    name="address"
                    defaultValue={profile.address ?? ""}
                    rows={3}
                    placeholder="Street address, landmark"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" name="city" defaultValue={profile.city ?? ""} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="state">State</Label>
                  <Input id="state" name="state" defaultValue={profile.state ?? ""} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="pincode">Pincode</Label>
                  <Input
                    id="pincode"
                    name="pincode"
                    defaultValue={profile.pincode ?? ""}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="financialYearStart">Financial Year Start</Label>
                  <Input
                    id="financialYearStart"
                    name="financialYearStart"
                    type="date"
                    defaultValue={profile.financialYearStart ?? ""}
                  />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-semibold">Preferences</h2>
              <p className="text-sm text-muted-foreground">
                Regional and appearance settings.
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select name="timezone" defaultValue={profile.timezone ?? "UTC"}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timezones.map((tz) => (
                        <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select name="currency" defaultValue={profile.currency ?? "INR"}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((cur) => (
                        <SelectItem key={cur} value={cur}>{cur}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="theme">Theme</Label>
                  <Select name="theme" defaultValue={profile.theme ?? "light"}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            <Button type="submit" disabled={saving}>
              <Save className="mr-2 size-4" />
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </form>
        ) : (
          <Card className="p-8 text-center text-muted-foreground">
            Unable to load company profile.
          </Card>
        );
      }

      case "account": {
        return account ? (
          <Card className="p-6">
            <h2 className="text-lg font-semibold">Account Information</h2>
            <p className="text-sm text-muted-foreground">
              Your personal account details.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label>Name</Label>
                <form onSubmit={handleAccountSave} className="flex items-end gap-2">
                  <Input
                    name="fullName"
                    defaultValue={account.fullName ?? ""}
                    className="flex-1"
                  />
                  <Button type="submit" size="sm" disabled={saving}>
                    {saving ? "Saving…" : "Update"}
                  </Button>
                </form>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Email</Label>
                <Input value={account.email} readOnly className="bg-muted/50" />
                <p className="text-xs text-muted-foreground">
                  Email is your identity and cannot be changed here.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Role</Label>
                <Input
                  value={account.role}
                  readOnly
                  className="bg-muted/50 capitalize"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Company</Label>
                <Input
                  value={account.companyName ?? ""}
                  readOnly
                  className="bg-muted/50"
                />
              </div>
            </div>

            {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
            {success && <p className="mt-4 text-sm text-green-600">{success}</p>}
          </Card>
        ) : (
          <Card className="p-8 text-center text-muted-foreground">
            Unable to load account information.
          </Card>
        );
      }

      case "staff": {
        return (
          <Card className="p-6">
            <h2 className="text-lg font-semibold">Staff Management</h2>
            <p className="text-sm text-muted-foreground">
              Invite, activate, and manage staff members and their module
              permissions.
            </p>

            <div className="mt-4">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">Active staff</span>
                <span className="text-2xl font-semibold">{staffCount.active}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">Total staff</span>
                <span className="text-2xl font-semibold">{staffCount.total}</span>
              </div>
            </div>

            <Separator className="my-4" />

            <Button asChild>
              <Link href="/settings/staff">Manage Staff</Link>
            </Button>
          </Card>
        );
      }

      case "subscription": {
        const plan = subscription?.plan;
        const sub = subscription?.subscription;

        return (
          <Card className="p-6">
            <h2 className="text-lg font-semibold">Current Subscription</h2>
            <p className="text-sm text-muted-foreground">
              Your plan and billing details (read-only).
            </p>

            <div className="mt-4 space-y-6">
              {plan ? (
                <>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase">
                      Plan
                    </p>
                    <p className="text-2xl font-bold">{plan.name}</p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase">
                      Status
                    </p>
                    <Badge variant="default" className="capitalize">
                      {sub?.status ?? "active"}
                    </Badge>
                  </div>

                  {sub?.trial_end && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase">
                        Trial ends
                      </p>
                      <p>{new Date(sub.trial_end).toLocaleDateString()}</p>
                    </div>
                  )}

                  {sub?.current_period_end && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase">
                        Current period
                      </p>
                      <p>{new Date(sub.current_period_end).toLocaleDateString()}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase">
                      Pricing
                    </p>
                    <p>
                      ${plan.price_monthly}/month &middot; ${plan.price_yearly}/year
                    </p>
                  </div>

                  <Separator />

                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase">
                      Feature availability
                    </p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {subscription?.features &&
                        Object.entries(subscription.features).map(([key, value]) => (
                          <div
                            key={key}
                            className="flex items-center justify-between"
                          >
                            <span className="text-sm capitalize">
                              {key.replace(/_/g, " ")}
                            </span>
                            <Badge variant={value ? "default" : "secondary"}>
                              {value ? "Enabled" : "Disabled"}
                            </Badge>
                          </div>
                        ))}
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">
                  No active subscription found.
                </p>
              )}

              <Separator />

              <div className="rounded-xl bg-muted/30 p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Want to upgrade?
                </p>
                <p className="text-sm">
                  Contact your administrator to upgrade your plan.
                </p>
              </div>
            </div>
          </Card>
        );
      }

      case "usage": {
        return (
          <Card className="p-6">
            <h2 className="text-lg font-semibold">Resource Usage</h2>
            <p className="text-sm text-muted-foreground">
              Current usage against your plan limits. All counts are
              computed server-side.
            </p>

            <div className="mt-4 space-y-6">
              {usage.map((stat) => {
                const statForMeter = {
                  key: stat.key,
                  limit: stat.limit,
                  usage: stat.usage,
                };
                return (
                  <div key={stat.key}>
                    <div className="mb-2 flex items-baseline justify-between">
                      <span className="text-sm font-medium">{stat.label}</span>
                      <span className="text-sm text-muted-foreground">
                        {stat.usage} / {stat.limit ?? "∞"} used
                        {stat.percent !== null && stat.percent >= 80
                          ? " · Near limit"
                          : ""}
                      </span>
                    </div>
                    <UsageMeter stat={statForMeter} />
                  </div>
                );
              })}
            </div>
          </Card>
        );
      }

      case "security": {
        return (
          <Card className="p-6">
            <h2 className="text-lg font-semibold">Change Password</h2>
            <p className="text-sm text-muted-foreground">
              Update your account password. Must be at least 8 characters.
            </p>

            <form onSubmit={handlePasswordChange} className="mt-4 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  minLength={8}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  minLength={8}
                  required
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}
              {success && <p className="text-sm text-green-600">{success}</p>}

              <Button type="submit" disabled={saving}>
                {saving ? "Changing…" : "Change Password"}
              </Button>
            </form>
          </Card>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader title="Settings" description="Manage your company and account settings." />

      <div className="flex flex-col gap-4">
        <nav className="flex flex-wrap gap-2" aria-label="Settings navigation">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>

        {renderTab()}
      </div>
    </div>
  );
}
