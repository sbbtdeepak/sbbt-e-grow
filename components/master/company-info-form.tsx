"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Pencil, Save, X } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateCompany } from "@/app/master/companies/actions";
import type { CompanyUpdateInput } from "@/app/master/companies/actions";
import type { Database } from "@/types/database";

type Company = Database["public"]["Tables"]["companies"]["Row"];

type CompanyInfoFormProps = {
  company: Company;
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm">{value}</p>
    </div>
  );
}

/**
 * Company Information card for Master Admin.
 *
 * Read-only by default with a clearly visible "Edit Company" action; the
 * edit form maps to existing companies columns (name, slug, legal_name,
 * gst, phone, address, city, state, pincode, country). After a successful
 * save the server truth is re-read via router.refresh() and local state is
 * updated to the persisted values.
 */
export function CompanyInfoForm({ company }: CompanyInfoFormProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<CompanyUpdateInput>({
    name: company.name,
    slug: company.slug,
    legalName: company.legal_name ?? "",
    gst: company.gst ?? "",
    phone: company.phone ?? "",
    address: company.address ?? "",
    city: company.city ?? "",
    state: company.state ?? "",
    pincode: company.pincode ?? "",
    country: company.country ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const set = (key: keyof CompanyUpdateInput) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (saving) return; // prevent duplicate submit
    setSaving(true);
    setError(null);
    setSuccess(null);

    const result = await updateCompany(company.id, form);
    if (!result.ok) {
      setError(result.error);
      setSaving(false);
      return;
    }

    // Reflect persisted DB values immediately.
    const saved = result.data;
    setForm({
      name: saved.name,
      slug: saved.slug,
      legalName: saved.legal_name ?? "",
      gst: saved.gst ?? "",
      phone: saved.phone ?? "",
      address: saved.address ?? "",
      city: saved.city ?? "",
      state: saved.state ?? "",
      pincode: saved.pincode ?? "",
      country: saved.country ?? "",
    });
    setSuccess("Company information saved.");
    setSaving(false);
    setEditing(false);
    router.refresh();
  };

  return (
    <Card id="edit" className="scroll-mt-20 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-brand/10 text-brand ring-1 ring-inset ring-brand/15">
            <Building2 className="size-4" />
          </span>
          <div>
            <h2 className="text-base font-semibold tracking-tight">
              Company Information
            </h2>
            <p className="text-sm text-muted-foreground">
              Basic identity and business information for this tenant.
            </p>
          </div>
        </div>
        {!editing ? (
          <Button
            onClick={() => {
              setEditing(true);
              setError(null);
              setSuccess(null);
            }}
            variant="outline"
            className="gap-1.5"
          >
            <Pencil className="size-4" />
            Edit Company
          </Button>
        ) : null}
      </div>

      {!editing ? (
        <div className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Company name" value={company.name} />
          <Field label="Legal name" value={company.legal_name ?? "—"} />
          <Field label="Slug" value={company.slug} />
          <Field label="GST" value={company.gst ?? "—"} />
          <Field label="Phone" value={company.phone ?? "—"} />
          <Field label="Address" value={company.address ?? "—"} />
          <Field label="City" value={company.city ?? "—"} />
          <Field label="State" value={company.state ?? "—"} />
          <Field label="Pincode" value={company.pincode ?? "—"} />
          <Field label="Country" value={company.country ?? "—"} />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ci-name">Company name</Label>
              <Input
                id="ci-name"
                value={form.name}
                onChange={(e) => set("name")(e.target.value)}
                maxLength={200}
                required
                disabled={saving}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ci-legal">Legal name</Label>
              <Input
                id="ci-legal"
                value={form.legalName ?? ""}
                onChange={(e) => set("legalName")(e.target.value)}
                maxLength={200}
                placeholder="Registered entity name"
                disabled={saving}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ci-slug">Slug</Label>
              <Input
                id="ci-slug"
                value={form.slug}
                onChange={(e) => set("slug")(e.target.value)}
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                maxLength={60}
                required
                disabled={saving}
              />
              <p className="text-xs text-muted-foreground">
                Lowercase letters, numbers, and single hyphens. Must be unique.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ci-gst">GST</Label>
              <Input
                id="ci-gst"
                value={form.gst ?? ""}
                onChange={(e) => set("gst")(e.target.value)}
                maxLength={50}
                placeholder="GST/VAT/tax identifier"
                disabled={saving}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ci-phone">Phone</Label>
              <Input
                id="ci-phone"
                type="tel"
                value={form.phone ?? ""}
                onChange={(e) => set("phone")(e.target.value)}
                maxLength={30}
                placeholder="+91 98765 43210"
                disabled={saving}
              />
              <p className="text-xs text-muted-foreground">
                Digits, spaces, and + - ( ) . / characters.
              </p>
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="ci-address">Address</Label>
              <Input
                id="ci-address"
                value={form.address ?? ""}
                onChange={(e) => set("address")(e.target.value)}
                maxLength={500}
                placeholder="Registered address"
                disabled={saving}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ci-city">City</Label>
              <Input
                id="ci-city"
                value={form.city ?? ""}
                onChange={(e) => set("city")(e.target.value)}
                maxLength={100}
                disabled={saving}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ci-state">State</Label>
              <Input
                id="ci-state"
                value={form.state ?? ""}
                onChange={(e) => set("state")(e.target.value)}
                maxLength={100}
                disabled={saving}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ci-pincode">Pincode</Label>
              <Input
                id="ci-pincode"
                value={form.pincode ?? ""}
                onChange={(e) => set("pincode")(e.target.value)}
                maxLength={20}
                disabled={saving}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ci-country">Country</Label>
              <Input
                id="ci-country"
                value={form.country ?? ""}
                onChange={(e) => set("country")(e.target.value)}
                maxLength={100}
                disabled={saving}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setEditing(false);
                setError(null);
                setSuccess(null);
              }}
              disabled={saving}
              className="gap-1.5"
            >
              <X className="size-4" />
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="gap-1.5">
              <Save className="size-4" />
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      )}

      {error ? (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="mt-4 text-sm text-emerald-600 dark:text-emerald-500" role="status">
          {success}
        </p>
      ) : null}
    </Card>
  );
}
