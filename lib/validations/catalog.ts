import { z } from "zod";

// ============================================================
// PRODUCT
// ============================================================

export const productSchema = z.object({
  sku: z
    .string()
    .trim()
    .min(1, "SKU is required.")
    .max(80, "SKU must be at most 80 characters."),
  name: z
    .string()
    .trim()
    .min(1, "Product name is required.")
    .max(200, "Product name must be at most 200 characters."),
  buyingPrice: z.coerce
    .number({ invalid_type_error: "Buying price must be a number." })
    .min(0, "Buying price cannot be negative."),
  sellingPrice: z.coerce
    .number({ invalid_type_error: "Selling price must be a number." })
    .min(0, "Selling price cannot be negative."),
  category: z
    .string()
    .trim()
    .max(100, "Category must be at most 100 characters.")
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  imageUrl: z
    .preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? null : v),
      z.string().url("Image URL must be a valid URL.").max(500, "Image URL is too long.").nullable(),
    )
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  status: z.enum(["active", "inactive"]).default("active"),
});

export type ProductInput = z.infer<typeof productSchema>;

// ============================================================
// MARKETPLACE
// ============================================================

export const marketplaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Marketplace name is required.")
    .max(100, "Marketplace name must be at most 100 characters."),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required.")
    .max(100, "Slug must be at most 100 characters.")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase with hyphens (e.g. amazon, my-shop).",
    ),
  isActive: z.boolean().default(true),
});

export type MarketplaceInput = z.infer<typeof marketplaceSchema>;

// ============================================================
// SELLER ACCOUNT
// ============================================================

export const sellerAccountSchema = z.object({
  marketplaceId: z.string().uuid("Select a valid marketplace."),
  name: z
    .string()
    .trim()
    .min(1, "Seller name is required.")
    .max(120, "Seller name must be at most 120 characters."),
  isActive: z.boolean().default(true),
});

export type SellerAccountInput = z.infer<typeof sellerAccountSchema>;

// ============================================================
// SHARED
// ============================================================

export type ActionResult<TData = undefined> =
  | { ok: true; data: TData }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };