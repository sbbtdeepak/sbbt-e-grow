"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireCompanyUser } from "@/lib/auth/session";
import { reportFilterSchema, type ReportFilterInput } from "@/lib/validations/reports";
import type { ActionResult } from "@/lib/validations/catalog";

const VIEW_MAP: Record<ReportFilterInput["reportType"], string> = {
  daily_sales: "report_daily_sales",
  daily_purchase: "report_daily_purchase",
  daily_profit: "report_daily_profit",
  marketplace: "report_marketplace",
  seller: "report_seller",
  product: "report_product",
  pending_payments: "report_pending_payments",
  received_payments: "report_received_payments",
  cancelled_orders: "report_cancelled_orders",
  rto: "report_rto",
  top_selling_products: "report_top_selling_products",
  top_sellers: "report_top_sellers",
};

export async function getReportData(input: ReportFilterInput): Promise<ActionResult> {
  const ctx = await requireCompanyUser();

  const parsed = reportFilterSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Invalid filters.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createSupabaseServerClient();
  const view = VIEW_MAP[parsed.data.reportType];
  if (!view) return { ok: false, error: "Unsupported report type." };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = (supabase as any).from(view).select("*").eq("company_id", ctx.companyId);

  // Date range filter
  if (parsed.data.dateFrom) {
    query = query.gte("report_date", parsed.data.dateFrom);
  }
  if (parsed.data.dateTo) {
    query = query.lte("report_date", parsed.data.dateTo);
  }

  if (parsed.data.marketplaceId) {
    query = query.eq("marketplace_id", parsed.data.marketplaceId);
  }
  if (parsed.data.sellerAccountId) {
    query = query.eq("seller_account_id", parsed.data.sellerAccountId);
  }
  if (parsed.data.productId) {
    query = query.eq("product_id", parsed.data.productId);
  }
  if (parsed.data.status) {
    query = query.eq("status", parsed.data.status);
  }

  if (parsed.data.search) {
    const search = parsed.data.search.trim().toLowerCase();
    query = query.or(
      `marketplace_name.ilike.%${search}%,seller_name.ilike.%${search}%,product_name.ilike.%${search}%,sku.ilike.%${search}%`,
    );
  }

  const sortBy = parsed.data.sortBy || "report_date";
  const sortOrder = parsed.data.sortOrder === "asc" ? { ascending: true } : { ascending: false };
  query = query.order(sortBy, sortOrder);

  const page = parsed.data.page;
  const pageSize = parsed.data.pageSize;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error } = await query;

  if (error) return { ok: false, error: error.message };

  return { ok: true, data: data ?? [] };
}

export async function exportReportCsv(input: ReportFilterInput): Promise<ActionResult<string>> {
  const ctx = await requireCompanyUser();

  const parsed = reportFilterSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid filters." };
  }

  const supabase = await createSupabaseServerClient();
  const view = VIEW_MAP[parsed.data.reportType];
  if (!view) return { ok: false, error: "Unsupported report type." };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = (supabase as any).from(view).select("*").eq("company_id", ctx.companyId);

  if (parsed.data.dateFrom) query = query.gte("report_date", parsed.data.dateFrom);
  if (parsed.data.dateTo) query = query.lte("report_date", parsed.data.dateTo);
  if (parsed.data.marketplaceId) query = query.eq("marketplace_id", parsed.data.marketplaceId);
  if (parsed.data.sellerAccountId) query = query.eq("seller_account_id", parsed.data.sellerAccountId);
  if (parsed.data.productId) query = query.eq("product_id", parsed.data.productId);
  if (parsed.data.status) query = query.eq("status", parsed.data.status);

  if (parsed.data.search) {
    const search = parsed.data.search.trim().toLowerCase();
    query = query.or(
      `marketplace_name.ilike.%${search}%,seller_name.ilike.%${search}%,product_name.ilike.%${search}%,sku.ilike.%${search}%`,
    );
  }

  const { data, error } = await query;
  if (error) return { ok: false, error: error.message };

  const rows = data ?? [];
  if (rows.length === 0) return { ok: true, data: "" };

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((row: Record<string, unknown>) =>
      headers
        .map((h) => {
          const val = row[h];
          if (val === null || val === undefined) return "";
          if (typeof val === "string" && val.includes(",")) return `"${val}"`;
          return val;
        })
        .join(","),
    ),
  ].join("\n");

  return { ok: true, data: csv };
}
