"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireCompanyUser, requireRole } from "@/lib/auth/session";
import type { UserRole } from "@/types/database";

export type DashboardKpi = {
  label: string;
  value: string | number;
  href?: string;
  trend?: string;
  trendUp?: boolean;
};

export type DashboardWidget = {
  title: string;
  value: string | number;
  subtitle?: string;
  href?: string;
};

export async function getMasterDashboard() {
  const ctx = await requireRole("master_admin");

  const supabase = await createSupabaseServerClient();

  const [
    companiesRes,
    ordersRes,
    paymentsRes,
    productsRes,
    marketplacesRes,
  ] = await Promise.all([
    supabase.from("companies").select("id", { count: "exact", head: false }),
    supabase
      .from("report_daily_sales")
      .select("total_orders, total_sales, total_profit")
      .order("report_date", { ascending: false })
      .limit(7),
    supabase
      .from("report_pending_payments")
      .select("pending", { count: "exact", head: false })
      .eq("status", "expected"),
    supabase.from("products").select("id", { count: "exact", head: false }),
    supabase.from("marketplaces").select("id", { count: "exact", head: false }),
  ]);

  const totalCompanies = companiesRes.count ?? 0;
  const totalOrders = ordersRes.data?.reduce((sum, r) => sum + (r.total_orders || 0), 0) ?? 0;
  const totalSales = ordersRes.data?.reduce((sum, r) => sum + (r.total_sales || 0), 0) ?? 0;
  const totalProfit = ordersRes.data?.reduce((sum, r) => sum + (r.total_profit || 0), 0) ?? 0;
  const pendingPayments = paymentsRes.count ?? 0;

  const widgets: DashboardWidget[] = [
    { title: "Companies", value: totalCompanies, href: "/settings" },
    { title: "Total Orders", value: totalOrders, href: "/orders" },
    { title: "Total Sales", value: totalSales, href: "/reports" },
    { title: "Total Profit", value: totalProfit, href: "/reports" },
    { title: "Pending Payments", value: pendingPayments, href: "/payments" },
    { title: "Products", value: productsRes.count ?? 0, href: "/products" },
    { title: "Marketplaces", value: marketplacesRes.count ?? 0, href: "/marketplaces" },
  ];

  return { ok: true, data: { widgets, role: ctx.role as UserRole } };
}

export async function getCompanyDashboard() {
  const ctx = await requireCompanyUser();

  const supabase = await createSupabaseServerClient();

  const today = new Date().toISOString().slice(0, 10);

  const [
    todaySalesRes,
    todayPurchaseRes,
    todayProfitRes,
    pendingPurchaseRes,
    pendingPackingRes,
    pendingDispatchRes,
    pendingDeliveryRes,
    pendingPaymentRes,
    topMarketplaceRes,
    topSellerRes,
    topProductRes,
    monthlyRes,
  ] = await Promise.all([
    supabase
      .from("report_daily_sales")
      .select("total_sales, total_orders")
      .eq("company_id", ctx.companyId)
      .eq("report_date", today)
      .maybeSingle(),
    supabase
      .from("report_daily_purchase")
      .select("total_purchase")
      .eq("company_id", ctx.companyId)
      .eq("report_date", today)
      .maybeSingle(),
    supabase
      .from("report_daily_profit")
      .select("total_profit")
      .eq("company_id", ctx.companyId)
      .eq("report_date", today)
      .maybeSingle(),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("company_id", ctx.companyId)
      .eq("stage", "purchase"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("company_id", ctx.companyId)
      .eq("stage", "packing"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("company_id", ctx.companyId)
      .eq("stage", "dispatch"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("company_id", ctx.companyId)
      .eq("stage", "delivery"),
    supabase
      .from("report_pending_payments")
      .select("id", { count: "exact", head: true })
      .eq("company_id", ctx.companyId),
    supabase
      .from("report_marketplace")
      .select("marketplace_name, total_sales")
      .eq("company_id", ctx.companyId)
      .order("total_sales", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("report_seller")
      .select("seller_name, total_sales")
      .eq("company_id", ctx.companyId)
      .order("total_sales", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("report_product")
      .select("product_name, total_sales")
      .eq("company_id", ctx.companyId)
      .order("total_sales", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("report_daily_sales")
      .select("report_date, total_sales, total_profit")
      .eq("company_id", ctx.companyId)
      .gte("report_date", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
      .order("report_date", { ascending: true }),
  ]);

  const widgets: DashboardWidget[] = [
    { title: "Today's Orders", value: todaySalesRes.data?.total_orders ?? 0, href: "/orders" },
    { title: "Today's Sales", value: todaySalesRes.data?.total_sales ?? 0, href: "/reports" },
    { title: "Today's Purchase", value: todayPurchaseRes.data?.total_purchase ?? 0, href: "/purchase" },
    { title: "Today's Profit", value: todayProfitRes.data?.total_profit ?? 0, href: "/reports" },
    { title: "Pending Purchase", value: pendingPurchaseRes.count ?? 0, href: "/purchase" },
    { title: "Pending Packing", value: pendingPackingRes.count ?? 0, href: "/packing" },
    { title: "Pending Dispatch", value: pendingDispatchRes.count ?? 0, href: "/dispatch" },
    { title: "Pending Delivery", value: pendingDeliveryRes.count ?? 0, href: "/delivery" },
    { title: "Pending Payment", value: pendingPaymentRes.count ?? 0, href: "/payments" },
  ];

  const highlights = [
    { label: "Top Marketplace", value: topMarketplaceRes.data?.marketplace_name ?? "—", sub: topMarketplaceRes.data ? `Sales: ${topMarketplaceRes.data.total_sales}` : undefined },
    { label: "Top Seller", value: topSellerRes.data?.seller_name ?? "—", sub: topSellerRes.data ? `Sales: ${topSellerRes.data.total_sales}` : undefined },
    { label: "Top Product", value: topProductRes.data?.product_name ?? "—", sub: topProductRes.data ? `Sales: ${topProductRes.data.total_sales}` : undefined },
  ];

  const monthlyTrend = monthlyRes.data ?? [];

  return {
    ok: true,
    data: {
      widgets,
      highlights,
      monthlyTrend,
      role: ctx.role as UserRole,
    },
  };
}

export async function getStaffDashboard() {
  const ctx = await requireCompanyUser();

  const supabase = await createSupabaseServerClient();

  const today = new Date().toISOString().slice(0, 10);

  const [todayOrdersRes, pendingDeliveryRes, recentRes] = await Promise.all([
    supabase
      .from("report_daily_sales")
      .select("total_orders, total_sales")
      .eq("company_id", ctx.companyId)
      .eq("report_date", today)
      .maybeSingle(),
    supabase
      .from("orders")
      .select("id, order_date, stage, notes")
      .eq("company_id", ctx.companyId)
      .eq("stage", "delivery")
      .order("order_date", { ascending: false })
      .limit(10),
    supabase
      .from("orders")
      .select("id, order_date, stage, notes")
      .eq("company_id", ctx.companyId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const widgets: DashboardWidget[] = [
    { title: "Today's Orders", value: todayOrdersRes.data?.total_orders ?? 0, href: "/orders" },
    { title: "Today's Sales", value: todayOrdersRes.data?.total_sales ?? 0, href: "/orders" },
  ];

  return {
    ok: true,
    data: {
      widgets,
      pendingDeliveries: pendingDeliveryRes.data ?? [],
      recentActivities: recentRes.data ?? [],
      role: ctx.role as UserRole,
    },
  };
}