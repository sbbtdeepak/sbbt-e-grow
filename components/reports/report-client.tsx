"use client";

import { useState, useEffect, useCallback } from "react";
import { ReportFilters, type ReportFilterState } from "@/components/reports/report-filters";
import { ReportTable } from "@/components/reports/report-table";
import { getReportData, exportReportCsv } from "@/app/(app)/reports/actions";

type ReportClientProps = {
  initial: ReportFilterState;
};

export function ReportClient({ initial }: ReportClientProps) {
  const [filters, setFilters] = useState<ReportFilterState>(initial);
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = useCallback((patch: Partial<ReportFilterState>) => {
    setFilters((prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }));
  }, []);

  const handleExport = useCallback(async () => {
    setExporting(true);
    setError(null);
    try {
      const result = await exportReportCsv({
        reportType: filters.reportType,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        marketplaceId: filters.marketplaceId || undefined,
        sellerAccountId: filters.sellerAccountId || undefined,
        productId: filters.productId || undefined,
        status: filters.status || undefined,
        search: filters.search || undefined,
        page: filters.page,
        pageSize: filters.pageSize,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      });
      if (!result.ok) {
        setError(result.error);
        setExporting(false);
        return;
      }
      const csv = result.data as string;
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report-${filters.reportType}-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }, [filters]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      const result = await getReportData({
        reportType: filters.reportType,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        marketplaceId: filters.marketplaceId || undefined,
        sellerAccountId: filters.sellerAccountId || undefined,
        productId: filters.productId || undefined,
        status: filters.status || undefined,
        search: filters.search || undefined,
        page: filters.page,
        pageSize: filters.pageSize,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      });
      if (!cancelled) {
        if (result.ok) {
          setData((result.data ?? []) as Record<string, unknown>[]);
        } else {
          setError(result.error);
          setData([]);
        }
        setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [filters]);

  return (
    <div className="flex flex-col gap-4">
      <ReportFilters
        filters={filters}
        onChange={handleChange}
        onExport={handleExport}
        exporting={exporting}
      />
      {error && (
        <p className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <ReportTable data={data} loading={loading} />
    </div>
  );
}