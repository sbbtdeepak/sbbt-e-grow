"use client";

import { useMemo } from "react";
import { Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  MobileLabel,
  MobileValue,
  MobileChip,
} from "@/components/staff/staff-mobile-card";
import {
  matchesMarketplaceFilter,
  type MarketplaceTabKey,
} from "@/lib/staff-navigation";

type MarketplaceCtx = {
  id: string;
  name: string;
};

type SellerCtx = {
  id: string;
  name: string;
};

type MobileLine = {
  id: string;
  sku: string;
  name: string;
};

export type MobileOrder<TLine extends MobileLine> = {
  id: string;
  marketplace: MarketplaceCtx;
  seller: SellerCtx;
  orderDate: string;
  lines: TLine[];
};

export function MobileSearchToolbar({
  search,
  onSearchChange,
}: {
  search: string;
  onSearchChange: (v: string) => void;
}) {
  return (
    <Input
      type="search"
      value={search}
      onChange={(e) => onSearchChange(e.target.value)}
      placeholder="Search order no, product, seller…"
      className="h-11 rounded-xl text-base"
      aria-label="Search"
    />
  );
}

export function MobileOrderList<TLine extends MobileLine>({
  orders,
  filtersSearch,
  filterMarketplace,
  filterSeller,
  renderCard,
  emptyText = "No orders found.",
}: {
  orders: MobileOrder<TLine>[];
  filtersSearch?: string;
  filterMarketplace?: MarketplaceTabKey;
  filterSeller?: string;
  renderCard: (order: MobileOrder<TLine>) => React.ReactNode;
  emptyText?: string;
}) {
  const q = (filtersSearch ?? "").trim().toLowerCase();

  const filtered = useMemo(
    () =>
      orders.filter((order) => {
        if (
          filterMarketplace &&
          filterMarketplace !== "all" &&
          !matchesMarketplaceFilter(order.marketplace.name, filterMarketplace)
        ) {
          return false;
        }
        if (filterSeller && filterSeller !== "all" && order.seller.id !== filterSeller) {
          return false;
        }
        if (q) {
          const orderNo = order.id.slice(0, 8).toLowerCase();
          const marketplace = order.marketplace.name.toLowerCase();
          const seller = order.seller.name.toLowerCase();
          const productMatch = order.lines.some(
            (line) =>
              line.name.toLowerCase().includes(q) ||
              line.sku.toLowerCase().includes(q),
          );
          if (
            !orderNo.includes(q) &&
            !marketplace.includes(q) &&
            !seller.includes(q) &&
            !productMatch
          ) {
            return false;
          }
        }
        return true;
      }),
    [orders, filterMarketplace, filterSeller, q],
  );

  if (filtered.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {filtered.map((order) => renderCard(order))}
    </div>
  );
}

export function MobileOrderHeader({
  orderNo,
  marketplace,
  seller,
  orderDate,
}: {
  orderNo: string;
  marketplace: string;
  seller: string;
  orderDate: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col">
        <span className="font-mono text-xs font-medium text-muted-foreground">
          #{orderNo.slice(0, 8)}
        </span>
        <span className="text-sm font-semibold">{seller}</span>
        <span className="text-[11px] text-muted-foreground">{orderDate}</span>
      </div>
      <MobileChip tone="primary">{marketplace}</MobileChip>
    </div>
  );
}

export function MobileQtyGrid({
  items,
}: {
  items: { label: string; value: string | number; tone?: string }[];
}) {
  return (
    <div className="grid grid-cols-3 gap-3 rounded-xl bg-muted/40 p-3">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col">
          <MobileLabel>{item.label}</MobileLabel>
          <MobileValue
            className={item.tone === "warning" ? "text-amber-600" : undefined}
          >
            {item.value}
          </MobileValue>
        </div>
      ))}
    </div>
  );
}

export function MobileEditableLine({
  line,
  onChange,
  onToggle,
  selected,
  qtyLabel,
  qtyValue,
  qtyPlaceholder,
  pendingLabel,
  pendingValue,
  extraFields,
}: {
  line: MobileLine;
  onChange: (patch: Record<string, string>) => void;
  onToggle?: (selected: boolean) => void;
  selected?: boolean;
  qtyLabel: string;
  qtyValue: string;
  qtyPlaceholder: string;
  pendingLabel: string;
  pendingValue: string | number;
  extraFields?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border p-3">
      <div className="flex items-start gap-3">
        {onToggle ? (
          <Checkbox
            checked={selected}
            onCheckedChange={(checked) => onToggle(checked === true)}
            className="mt-1 size-5"
            aria-label={`Select ${line.name}`}
          />
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            {line.sku}
          </span>
          <span className="truncate text-sm font-medium">{line.name}</span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <MobileLabel>{qtyLabel}</MobileLabel>
          <Input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={qtyValue}
            onChange={(e) => onChange({ [qtyKeyOf(qtyLabel)]: e.target.value })}
            className="h-11 rounded-xl text-base"
            placeholder={qtyPlaceholder}
            aria-label={`${qtyLabel} for ${line.name}`}
          />
        </div>
        <div className="flex flex-col justify-end pb-1">
          <MobileLabel>{pendingLabel}</MobileLabel>
          <MobileValue
            className={Number(pendingValue) > 0 ? "text-amber-600" : ""}
          >
            {pendingValue}
          </MobileValue>
        </div>
      </div>

      {extraFields}
    </div>
  );
}

function qtyKeyOf(label: string): string {
  if (label.toLowerCase().includes("packed")) return "packedQty";
  if (label.toLowerCase().includes("dispatch")) return "dispatchQty";
  if (label.toLowerCase().includes("delivered")) return "deliveredQty";
  if (label.toLowerCase().includes("buy")) return "buyQty";
  return "qty";
}

export function MobileSubmitBar({
  label,
  count,
  pending,
  error,
  onSubmit,
}: {
  label: string;
  count: number;
  pending: boolean;
  error: string | null;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-background/95 p-3 backdrop-blur lg:hidden">
      {error ? (
        <p className="mb-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}
      <Button
        type="button"
        size="lg"
        className="h-12 w-full rounded-xl text-base"
        disabled={pending || count === 0}
        onClick={onSubmit}
      >
        {pending ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <Check className="size-5" />
        )}
        {label}
        {count > 0 ? ` (${count})` : ""}
      </Button>
    </div>
  );
}

export function MobileSection({ children }: { children: React.ReactNode }) {
  return <section className="flex flex-col gap-2">{children}</section>;
}

export function MobileScreen({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col gap-3 p-3 pb-32 pt-3 lg:hidden">
      <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
      {children}
    </div>
  );
}