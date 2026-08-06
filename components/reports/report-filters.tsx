"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { ReportType } from "@/lib/validations/reports";

export type ReportFilterState = {
  reportType: ReportType;
  dateFrom: string;
  dateTo: string;
  marketplaceId: string;
  sellerAccountId: string;
  productId: string;
  status: string;
  search: string;
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
};

type ReportFiltersProps = {
  filters: ReportFilterState;
  onChange: (filters: ReportFilterState) => void;
  onExport: () => void;
  exporting: boolean;
};

const REPORT_TYPE_OPTIONS = [
  { value: "daily_sales", label: "Daily Sales" },
  { value: "daily_purchase", label: "Daily Purchase" },
  { value: "daily_profit", label: "Daily Profit" },
  { value: "marketplace", label: "Marketplace" },
  { value: "seller", label: "Seller" },
  { value: "product", label: "Product" },
  { value: "pending_payments", label: "Pending Payments" },
  { value: "received_payments", label: "Received Payments" },
  { value: "cancelled_orders", label: "Cancelled Orders" },
  { value: "rto", label: "RTO" },
  { value: "top_selling_products", label: "Top Selling Products" },
  { value: "top_sellers", label: "Top Sellers" },
];

export function ReportFilters({ filters, onChange, onExport, exporting }: ReportFiltersProps) {
  const update = (patch: Partial<ReportFilterState>) => {
    onChange({ ...filters, ...patch, page: patch.page ?? 1 });
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select value={filters.reportType} onValueChange={(value) => update({ reportType: value as ReportType })}>
          <SelectTrigger className="sm:w-60">
            <SelectValue placeholder="Report type" />
          </SelectTrigger>
          <SelectContent>
            {REPORT_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => update({ dateFrom: e.target.value })}
          className="sm:w-40"
          aria-label="Date from"
        />
        <Input
          type="date"
          value={filters.dateTo}
          onChange={(e) => update({ dateTo: e.target.value })}
          className="sm:w-40"
          aria-label="Date to"
        />

        <Input
          value={filters.search}
          onChange={(e) => update({ search: e.target.value })}
          placeholder="Search marketplace, seller, product, SKU…"
          className="sm:w-72"
          aria-label="Search"
        />

        <Select
          value={filters.sortBy}
          onValueChange={(value) => update({ sortBy: value })}
        >
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="report_date">Date</SelectItem>
            <SelectItem value="total_sales">Sales</SelectItem>
            <SelectItem value="total_profit">Profit</SelectItem>
            <SelectItem value="total_orders">Orders</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.sortOrder}
          onValueChange={(value: "asc" | "desc") => update({ sortOrder: value })}
        >
          <SelectTrigger className="sm:w-32">
            <SelectValue placeholder="Order" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="asc">Asc</SelectItem>
            <SelectItem value="desc">Desc</SelectItem>
          </SelectContent>
        </Select>

        <Button type="button" variant="outline" onClick={onExport} disabled={exporting}>
          {exporting ? "Exporting…" : "Export CSV"}
        </Button>
      </div>
    </div>
  );
}