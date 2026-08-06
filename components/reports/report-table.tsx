"use client";

import { useMemo } from "react";

type ReportTableProps = {
  data: Record<string, unknown>[];
  loading?: boolean;
};

export function ReportTable({ data, loading }: ReportTableProps) {
  const columns = useMemo(() => {
    if (data.length === 0) return [];
    return Object.keys(data[0]);
  }, [data]);

  const formatValue = (value: unknown) => {
    if (value === null || value === undefined) return "-";
    if (typeof value === "number") return value.toLocaleString();
    return String(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-lg border bg-card p-8 text-sm text-muted-foreground">
        Loading report…
      </div>
    );
  }

  if (columns.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed bg-card p-8 text-sm text-muted-foreground">
        No data available for the selected filters.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              {columns.map((col) => (
                <th key={col} className="p-1 text-left text-xs font-medium">
                  {col.replace(/_/g, " ")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={idx} className="border-b border-border hover:bg-muted/40">
                {columns.map((col) => (
                  <td key={col} className="p-1 text-sm tabular-nums">
                    {formatValue(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}