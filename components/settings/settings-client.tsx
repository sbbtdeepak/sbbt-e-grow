"use client";

import { useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateCompanyProfile } from "@/app/(app)/settings/actions";
import type { CompanyProfileInput } from "@/lib/validations/settings";

type CompanyProfile = {
  id: string;
  name: string;
  logoUrl?: string | null;
  gst?: string | null;
  address?: string | null;
  timezone?: string;
  currency?: string;
  financialYearStart?: string | null;
  theme?: string;
};

type SettingsClientProps = {
  initialProfile: CompanyProfile | null | undefined;
};

export function SettingsClient({ initialProfile }: SettingsClientProps) {
  const [profile, setProfile] = useState<CompanyProfile | null>(initialProfile ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const timezones = useMemo(() => [
    "UTC",
    "Asia/Kolkata",
    "Asia/Dubai",
    "America/New_York",
    "Europe/London",
    "Asia/Singapore",
  ], []);

  const currencies = useMemo(() => [
    "INR",
    "USD",
    "EUR",
    "GBP",
    "AED",
    "SGD",
  ], []);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);
    const rawTheme = String(formData.get("theme") || "light");
    const theme = rawTheme === "dark" ? "dark" : "light";
    const financialYearStart = formData.get("financialYearStart");
    const logoUrl = String(formData.get("logoUrl") || "").trim() || null;
    const gst = String(formData.get("gst") || "").trim() || null;
    const address = String(formData.get("address") || "").trim() || null;
    const data: CompanyProfileInput = {
      name: String(formData.get("name") || ""),
      logoUrl,
      gst,
      address,
      timezone: String(formData.get("timezone") || "UTC"),
      currency: String(formData.get("currency") || "INR"),
      financialYearStart: financialYearStart ? String(financialYearStart) : null,
      theme,
    };

    const result = await updateCompanyProfile(data);
    if (!result.ok) {
      setError(result.error ?? null);
      setSaving(false);
      return;
    }

    if (profile) {
      setProfile({
        ...profile,
        ...data,
      });
    }
    setSuccess("Company profile updated successfully.");
    setSaving(false);
  };

  if (!profile) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <PageHeader title="Settings" description="Manage your company settings." />
        <Card className="p-8 text-center text-muted-foreground">Loading settings…</Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader title="Settings" description="Manage your company settings." />

      <Card className="p-6">
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Business Name</Label>
              <Input id="name" name="name" defaultValue={profile.name} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="logoUrl">Logo URL</Label>
              <Input id="logoUrl" name="logoUrl" defaultValue={profile.logoUrl ?? ""} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="gst">GST Number</Label>
              <Input id="gst" name="gst" defaultValue={profile.gst ?? ""} />
            </div>
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
              <Label htmlFor="financialYearStart">Financial Year Start</Label>
              <Input id="financialYearStart" name="financialYearStart" type="date" defaultValue={profile.financialYearStart ?? ""} />
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Textarea id="address" name="address" defaultValue={profile.address ?? ""} rows={3} />
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

          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-green-600">{success}</p>}

          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </form>
      </Card>
    </div>
  );
}