import { z } from "zod";

export const reportTypeSchema = z.enum([
  "daily_sales",
  "daily_purchase",
  "daily_profit",
  "marketplace",
  "seller",
  "product",
  "pending_payments",
  "received_payments",
  "cancelled_orders",
  "rto",
  "top_selling_products",
  "top_sellers",
]);

export type ReportType = z.infer<typeof reportTypeSchema>;

export const reportFilterSchema = z.object({
  reportType: reportTypeSchema,
  dateFrom: z.string().optional().nullable(),
  dateTo: z.string().optional().nullable(),
  marketplaceId: z.string().uuid().optional().nullable(),
  sellerAccountId: z.string().uuid().optional().nullable(),
  productId: z.string().uuid().optional().nullable(),
  status: z.string().optional().nullable(),
  search: z.string().trim().max(200).optional().nullable(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25),
  sortBy: z.string().optional().nullable(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type ReportFilterInput = z.infer<typeof reportFilterSchema>;