"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, ArrowRight, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createCompany } from "./actions";
import type { Plan } from "@/lib/saas/entitlements";

type CreateCompanyDialogProps = {
  plans: Plan[];
};

/**
 * Master Admin "Add Company" dialog.
 *
 * Fields map exactly to what the existing architecture supports:
 * company name, slug (optional, auto-generated), plan (optional), and an
 * optional company-admin email invitation. No invented fields.
 */
export function CreateCompanyDialog({ plans }: CreateCompanyDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [planId, setPlanId] = useState<string>(plans[0]?.id ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    companyId: string;
    name: string;
    warning?: string;
  } | null>(null);

  const reset = () => {
    setError(null);
    setSuccess(null);
    setPlanId(plans[0]?.id ?? "");
  };

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createCompany({
        name: String(formData.get("name") ?? ""),
        slug: String(formData.get("slug") ?? ""),
        planId: planId || null,
        adminEmail: String(formData.get("adminEmail") ?? ""),
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setSuccess({
        companyId: result.data.companyId,
        name: result.data.companyName,
        warning: result.data.adminInviteError,
      });
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          Add Company
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {success ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-500" />
                Company created
              </DialogTitle>
              <DialogDescription>
                <span className="font-medium text-foreground">{success.name}</span>{" "}
                is ready. Assign a plan or manage its subscription from the
                company detail page.
              </DialogDescription>
            </DialogHeader>
            {success.warning ? (
              <p className="text-sm text-amber-600 dark:text-amber-500" role="alert">
                {success.warning}
              </p>
            ) : null}
            <DialogFooter className="gap-2 sm:justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  reset();
                }}
              >
                Done
              </Button>
              <Button asChild>
                <Link href={`/master/companies/${success.companyId}`}>
                  View company
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Add Company</DialogTitle>
              <DialogDescription>
                Create a new SaaS tenant. The company admin invitation is
                optional and sent separately from company creation.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="company-name">Company Name</Label>
                <Input
                  id="company-name"
                  name="name"
                  required
                  minLength={2}
                  maxLength={120}
                  placeholder="Acme Nursery"
                  disabled={pending}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="company-slug">Slug</Label>
                <Input
                  id="company-slug"
                  name="slug"
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  minLength={3}
                  maxLength={60}
                  placeholder="acme-nursery (auto-generated if empty)"
                  disabled={pending}
                />
                <p className="text-xs text-muted-foreground">
                  Lowercase letters, numbers, and single hyphens. Leave empty
                  to generate from the company name.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="company-plan">Plan</Label>
                {plans.length > 0 ? (
                  <Select
                    value={planId}
                    onValueChange={setPlanId}
                    disabled={pending}
                  >
                    <SelectTrigger id="company-plan">
                      <SelectValue placeholder="Choose a plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name} (${plan.price_monthly}/mo)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No active plans available. The company will start without a
                    subscription.
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Optional — a subscription is initialized on the selected
                  plan. Without one the company runs on the Free plan
                  fallback.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="company-admin-email">
                  Company Admin Email (optional)
                </Label>
                <Input
                  id="company-admin-email"
                  name="adminEmail"
                  type="email"
                  placeholder="admin@acmenursery.com"
                  disabled={pending}
                />
                <p className="text-xs text-muted-foreground">
                  If provided, an invitation email is sent and the invited
                  user becomes the company admin on acceptance.
                </p>
              </div>
              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Creating…" : "Create Company"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
