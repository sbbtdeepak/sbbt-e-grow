"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  LayoutGrid,
  List,
  Pencil,
  Search,
  ShieldCheck,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { setCompanyActive } from "@/app/master/companies/actions";
import type { Plan } from "@/lib/saas/entitlements";
import type { Database } from "@/types/database";

type Company = Database["public"]["Tables"]["companies"]["Row"];
type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];

export type CompanyRow = {
  company: Company;
  subscription: Subscription | null;
  plan: Plan | null;
  hasAdmin: boolean;
  adminEmail: string | null;
};

type CompanyListProps = {
  companies: CompanyRow[];
};

type StatusFilter = "active" | "inactive" | "all";
type AdminFilter = "all" | "yes" | "no";
type PlanFilter = "all" | string;
type SortKey = "newest" | "oldest" | "name-az" | "name-za" | "updated" | "plan";
type ViewMode = "list" | "grid";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function statusPill(status: string | undefined): string {
  switch (status) {
    case "active":
      return "status-pill status-pill-success";
    case "trialing":
      return "status-pill status-pill-info";
    case "past_due":
      return "status-pill status-pill-warning";
    case "cancelled":
    case "expired":
      return "status-pill status-pill-danger";
    default:
      return "status-pill status-pill-neutral";
  }
}

function readStoredView(): ViewMode {
  if (typeof window === "undefined") return "list";
  return window.localStorage.getItem("sbbt:companies-view") === "grid"
    ? "grid"
    : "list";
}

export function CompanyList({ companies }: CompanyListProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("active");
  const [admin, setAdmin] = useState<AdminFilter>("all");
  const [planFilter, setPlanFilter] = useState<PlanFilter>("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [view, setView] = useState<ViewMode>(readStoredView);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const setViewMode = (mode: ViewMode) => {
    setView(mode);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("sbbt:companies-view", mode);
    }
  };

  const planOptions = useMemo(() => {
    const names = new Set<string>();
    for (const { plan } of companies) {
      if (plan?.name) names.add(plan.name);
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [companies]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    let rows = companies.filter(({ company, hasAdmin, adminEmail, plan }) => {
      if (status === "active" && !company.is_active) return false;
      if (status === "inactive" && company.is_active) return false;
      if (admin === "yes" && !hasAdmin) return false;
      if (admin === "no" && hasAdmin) return false;
      if (planFilter !== "all" && plan?.name !== planFilter) return false;
      if (q) {
        const haystack = [
          company.name,
          company.slug,
          adminEmail ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    rows = [...rows].sort((a, b) => {
      const aName = a.company.name.localeCompare(b.company.name);
      switch (sort) {
        case "oldest":
          return (
            new Date(a.company.created_at).getTime() -
            new Date(b.company.created_at).getTime()
          );
        case "name-az":
          return aName;
        case "name-za":
          return -aName;
        case "updated":
          return (
            new Date(b.company.updated_at).getTime() -
            new Date(a.company.updated_at).getTime()
          );
        case "plan":
          return (a.plan?.name ?? "").localeCompare(b.plan?.name ?? "") || aName;
        case "newest":
        default:
          return (
            new Date(b.company.created_at).getTime() -
            new Date(a.company.created_at).getTime()
          );
      }
    });

    return rows;
  }, [companies, query, status, admin, planFilter, sort]);

  const handleToggle = (company: Company) => {
    setPendingId(company.id);
    startTransition(async () => {
      await setCompanyActive(company.id, !company.is_active);
      setPendingId(null);
      router.refresh();
    });
  };

  const toolbar = (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search companies…"
            className="pl-9"
            aria-label="Search companies"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as StatusFilter)}
          >
            <SelectTrigger className="w-32" aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Archived</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={admin}
            onValueChange={(v) => setAdmin(v as AdminFilter)}
          >
            <SelectTrigger className="w-28" aria-label="Filter by admin">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All admins</SelectItem>
              <SelectItem value="yes">Has admin</SelectItem>
              <SelectItem value="no">No admin</SelectItem>
            </SelectContent>
          </Select>
          {planOptions.length > 0 ? (
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-28" aria-label="Filter by plan">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All plans</SelectItem>
                {planOptions.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="w-40" aria-label="Sort companies">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Recently created</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="name-az">Name A → Z</SelectItem>
              <SelectItem value="name-za">Name Z → A</SelectItem>
              <SelectItem value="updated">Recently updated</SelectItem>
              <SelectItem value="plan">Plan</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center rounded-lg border border-border p-0.5">
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-7 gap-1 px-2", view === "list" && "bg-muted")}
              onClick={() => setViewMode("list")}
              aria-label="List view"
            >
              <List className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-7 gap-1 px-2", view === "grid" && "bg-muted")}
              onClick={() => setViewMode("grid")}
              aria-label="Grid view"
            >
              <LayoutGrid className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        {filtered.length}{" "}
        {filtered.length === 1 ? "company" : "companies"}
      </p>
    </div>
  );

  const toggleDialog = (company: Company) => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={pending && pendingId === company.id}
          className={
            company.is_active
              ? "text-amber-700 hover:bg-amber-50 hover:text-amber-800"
              : "text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
          }
        >
          {company.is_active ? "Archive" : "Reactivate"}
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
              ? "This will prevent users belonging to this company from accessing the ERP. Existing business data will be retained and can be restored by reactivating the company."
              : "The company will be reactivated and its users will regain ERP access. No data is changed."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => handleToggle(company)}
            disabled={pending}
            className={
              company.is_active
                ? "bg-amber-600 text-white hover:bg-amber-700"
                : undefined
            }
          >
            {company.is_active ? "Archive" : "Reactivate"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  const emptyState = (
    <Card className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span className="flex size-11 items-center justify-center rounded-2xl bg-muted text-muted-foreground ring-1 ring-inset ring-border">
        <Building2 className="size-5" />
      </span>
      {status === "inactive" ? (
        <>
          <h3 className="text-base font-semibold">No archived companies</h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            There are no archived companies matching the current filters.
          </p>
          <Button variant="outline" onClick={() => setStatus("all")}>
            View all companies
          </Button>
        </>
      ) : status === "active" ? (
        <>
          <h3 className="text-base font-semibold">No active companies</h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            Archived companies are hidden from the active view.
          </p>
          <Button variant="outline" onClick={() => setStatus("inactive")}>
            View inactive companies
          </Button>
        </>
      ) : (
        <>
          <h3 className="text-base font-semibold">No companies found</h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            No companies match the current search and filters.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setQuery("");
              setStatus("all");
              setAdmin("all");
              setPlanFilter("all");
            }}
          >
            Clear filters
          </Button>
        </>
      )}
    </Card>
  );

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        {toolbar}
        {emptyState}
      </div>
    );
  }

  if (view === "grid") {
    return (
      <div className="flex flex-col gap-4">
        {toolbar}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map(({ company, subscription, plan, hasAdmin }) => {
            return (
              <Card
                key={company.id}
                className={cn(
                  "flex flex-col p-5 transition-all duration-150 ease-out hover:border-border/80 hover:shadow-soft",
                  !company.is_active && "opacity-80",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={cn(
                      "flex size-11 shrink-0 items-center justify-center rounded-xl text-sm font-semibold ring-1 ring-inset",
                      company.is_active
                        ? "bg-brand/10 text-brand ring-brand/15"
                        : "bg-muted text-muted-foreground ring-border",
                    )}
                  >
                    {initials(company.name) || <Building2 className="size-4" />}
                  </span>
                  <span
                    className={cn(
                      "status-pill",
                      company.is_active
                        ? "status-pill-success"
                        : "status-pill-warning",
                    )}
                  >
                    {company.is_active ? "Active" : "Archived"}
                  </span>
                </div>

                <Link
                  href={`/master/companies/${company.id}`}
                  className="mt-3 font-semibold text-foreground transition-colors hover:text-brand"
                >
                  {company.name}
                </Link>
                <p className="font-mono text-xs text-muted-foreground">
                  {company.slug}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {plan ? (
                    <span className="status-pill status-pill-info">{plan.name}</span>
                  ) : null}
                  <span className={statusPill(subscription?.status)}>
                    {subscription?.status ?? "No subscription"}
                  </span>
                  <span
                    className={cn(
                      "status-pill",
                      hasAdmin ? "status-pill-success" : "status-pill-neutral",
                    )}
                  >
                    {hasAdmin ? (
                      <>
                        <ShieldCheck className="size-3" /> Admin
                      </>
                    ) : (
                      "No admin"
                    )}
                  </span>
                </div>

                <p className="mt-3 text-xs text-muted-foreground">
                  Joined{" "}
                  {new Date(company.created_at).toLocaleDateString("en-IN", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>

                <div className="mt-4 flex items-center gap-2 border-t border-border/70 pt-3">
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <Link href={`/master/companies/${company.id}`}>
                      View
                      <ArrowRight className="ml-1.5 size-3.5" />
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" size="sm" aria-label={`Edit ${company.name}`}>
                    <Link href={`/master/companies/${company.id}#edit`}>
                      <Pencil className="size-3.5" />
                    </Link>
                  </Button>
                  {toggleDialog(company)}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // List view — table-like rows on desktop, stacked cards on mobile.
  return (
    <div className="flex flex-col gap-4">
      {toolbar}
      <div className="hidden grid-cols-12 gap-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:grid">
        <span className="col-span-4">Company</span>
        <span className="col-span-2">Plan</span>
        <span className="col-span-2">Status</span>
        <span className="col-span-2">Admin</span>
        <span className="col-span-1">Created</span>
        <span className="col-span-1 text-right">Actions</span>
      </div>
      <div className="space-y-2">
        {filtered.map(({ company, subscription, plan, hasAdmin }) => {
          return (
            <Card
              key={company.id}
              className={cn(
                "p-4 transition-all duration-150 ease-out hover:border-border/80 hover:shadow-soft sm:grid sm:grid-cols-12 sm:items-center sm:gap-3 sm:px-4",
                !company.is_active && "opacity-80",
              )}
            >
              {/* Company identity */}
              <div className="col-span-4 flex min-w-0 items-center gap-3">
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ring-1 ring-inset",
                    company.is_active
                      ? "bg-brand/10 text-brand ring-brand/15"
                      : "bg-muted text-muted-foreground ring-border",
                  )}
                >
                  {initials(company.name) || <Building2 className="size-4" />}
                </span>
                <div className="min-w-0">
                  <Link
                    href={`/master/companies/${company.id}`}
                    className="block truncate font-semibold text-foreground transition-colors hover:text-brand"
                  >
                    {company.name}
                  </Link>
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {company.slug}
                  </p>
                </div>
              </div>

              {/* Plan */}
              <div className="col-span-2 mt-3 flex items-center gap-1.5 sm:mt-0">
                <span className="text-xs text-muted-foreground sm:hidden">Plan</span>
                <span className="status-pill status-pill-info">
                  {plan?.name ?? "—"}
                </span>
              </div>

              {/* Status */}
              <div className="col-span-2 mt-3 flex items-center gap-1.5 sm:mt-0">
                <span className="text-xs text-muted-foreground sm:hidden">Status</span>
                <span className={statusPill(subscription?.status)}>
                  {subscription?.status ?? "No subscription"}
                </span>
              </div>

              {/* Admin */}
              <div className="col-span-2 mt-3 flex items-center gap-1.5 sm:mt-0">
                <span className="text-xs text-muted-foreground sm:hidden">Admin</span>
                <span
                  className={cn(
                    "status-pill",
                    hasAdmin ? "status-pill-success" : "status-pill-neutral",
                  )}
                >
                  {hasAdmin ? (
                    <>
                      <ShieldCheck className="size-3" /> Yes
                    </>
                  ) : (
                    "None"
                  )}
                </span>
              </div>

              {/* Created */}
              <div className="col-span-1 mt-3 text-xs text-muted-foreground sm:mt-0">
                {new Date(company.created_at).toLocaleDateString("en-IN", {
                  month: "short",
                  day: "numeric",
                })}
              </div>

              {/* Actions */}
              <div className="col-span-1 mt-3 flex items-center justify-end gap-1 sm:mt-0">
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  aria-label={`Edit ${company.name}`}
                >
                  <Link href={`/master/companies/${company.id}#edit`}>
                    <Pencil className="size-3.5" />
                  </Link>
                </Button>
                {toggleDialog(company)}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
