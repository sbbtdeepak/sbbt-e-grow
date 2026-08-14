"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import type { Database } from "@/types/database";

type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const saasProductSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Name is required."),
  slug: z.string().min(1, "Slug is required."),
  tagline: z.string().min(1, "Tagline is required."),
  description: z.string().min(1, "Description is required."),
  short_description: z.string().min(1, "Short description is required."),
  features: z.array(z.string()).default([]),
  target_audience: z.string().optional().nullable().default(null),
  hero_image_url: z.string().url().optional().nullable().default(null),
  image_url: z.string().url().optional().nullable().default(null),
  accent_color: z
    .string()
    .regex(HEX_COLOR, "Use a valid hex colour like #6D28D9.")
    .optional()
    .nullable()
    .default(null),
  external_app_url: z.string().url().optional().nullable().default(null),
  cta_label: z.string().optional().nullable().default(null),
  cta_type: z
    .enum(["learn_more", "launch", "contact", "login"])
    .optional()
    .nullable()
    .default(null),
  is_active: z.boolean().default(true),
  is_featured: z.boolean().default(false),
  sort_order: z.number().int().default(0),
});

const productFeatureSchema = z.object({
  id: z.string().uuid().optional(),
  saas_product_id: z.string().uuid(),
  feature_key: z.string().min(1),
  feature_name: z.string().min(1),
  feature_description: z.string().min(1),
  feature_type: z.enum(["capability", "integration", "support", "limit"]),
  is_highlighted: z.boolean().default(false),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().default(0),
});

const productPricingSchema = z.object({
  id: z.string().uuid().optional(),
  saas_product_id: z.string().uuid(),
  plan_id: z.string().uuid().optional().nullable(),
  tier_name: z.string().min(1),
  description: z.string().optional().nullable().default(null),
  price_monthly: z.number().nonnegative(),
  price_yearly: z.number().nonnegative(),
  currency: z.string().min(2).max(3).default("INR"),
  is_popular: z.boolean().default(false),
  is_active: z.boolean().default(true),
  features: z.record(z.any()).default({}),
  limits: z.record(z.any()).default({}),
  sort_order: z.number().int().default(0),
});

/**
 * List all SaaS products with their features and pricing.
 * Master Admin only.
 */
export async function getSaaSProducts(): Promise<
  ActionResult<
    (Database["public"]["Tables"]["saas_products"]["Row"] & {
      product_features: Database["public"]["Tables"]["product_features"]["Row"][];
      product_pricing: Database["public"]["Tables"]["product_pricing"]["Row"][];
    })[]
  >
> {
  await requireRole("master_admin");

  const supabase = await createSupabaseServerClient();

  const { data: products, error: productsError } = await supabase
    .from("saas_products")
    .select(
      `
      *,
      product_features (*),
      product_pricing (*)
    `,
    )
    .order("sort_order", { ascending: true });

  if (productsError) return { ok: false, error: productsError.message };

  return { ok: true, data: products ?? [] };
}

/**
 * Create a SaaS product.
 * Master Admin only.
 */
export async function createSaaSProduct(
  input: z.infer<typeof saasProductSchema>,
): Promise<ActionResult<Database["public"]["Tables"]["saas_products"]["Row"]>> {
  await requireRole("master_admin");

  const parsed = saasProductSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid product data.",
    };
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("saas_products")
    .insert(parsed.data)
    .select("*")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/master/products");
  revalidatePath("/catalogue");
  revalidatePath("/pricing");
  revalidatePath("/catalogue/[slug]", "page");
  return { ok: true, data };
}

/**
 * Publish or unpublish a SaaS product (toggle active state).
 * Master Admin only.
 */
export async function setProductActive(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  await requireRole("master_admin");

  if (!z.string().uuid().safeParse(id).success) {
    return { ok: false, error: "Invalid product id." };
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("saas_products")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/master/products");
  revalidatePath("/catalogue");
  revalidatePath("/pricing");
  revalidatePath("/catalogue/[slug]", "page");
  return { ok: true, data: undefined };
}

/**
 * Update a SaaS product.
 * Master Admin only.
 */
export async function updateSaaSProduct(
  id: string,
  input: z.infer<typeof saasProductSchema>,
): Promise<ActionResult<Database["public"]["Tables"]["saas_products"]["Row"]>> {
  await requireRole("master_admin");

  const parsed = saasProductSchema.safeParse({ ...input, id });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid product data.",
    };
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("saas_products")
    .update(parsed.data)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/master/products");
  revalidatePath("/catalogue");
  revalidatePath("/pricing");
  revalidatePath("/catalogue/[slug]", "page");
  return { ok: true, data };
}

/**
 * Delete a SaaS product and cascade its features and pricing.
 * Master Admin only.
 */
export async function deleteSaaSProduct(
  id: string,
): Promise<ActionResult> {
  await requireRole("master_admin");

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("saas_products")
    .delete()
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/master/products");
  revalidatePath("/catalogue");
  revalidatePath("/pricing");
  revalidatePath("/catalogue/[slug]", "page");
  return { ok: true, data: undefined };
}

/**
 * Create a product feature.
 * Master Admin only.
 */
export async function createProductFeature(
  input: z.infer<typeof productFeatureSchema>,
): Promise<ActionResult<Database["public"]["Tables"]["product_features"]["Row"]>> {
  await requireRole("master_admin");

  const parsed = productFeatureSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid feature data.",
    };
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("product_features")
    .insert(parsed.data)
    .select("*")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/master/products");
  revalidatePath("/catalogue");
  revalidatePath("/pricing");
  revalidatePath("/catalogue/[slug]", "page");
  return { ok: true, data };
}

/**
 * Update a product feature.
 * Master Admin only.
 */
export async function updateProductFeature(
  id: string,
  input: z.infer<typeof productFeatureSchema>,
): Promise<ActionResult<Database["public"]["Tables"]["product_features"]["Row"]>> {
  await requireRole("master_admin");

  const parsed = productFeatureSchema.safeParse({ ...input, id });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid feature data.",
    };
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("product_features")
    .update(parsed.data)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/master/products");
  revalidatePath("/catalogue");
  revalidatePath("/pricing");
  revalidatePath("/catalogue/[slug]", "page");
  return { ok: true, data };
}

/**
 * Delete a product feature.
 * Master Admin only.
 */
export async function deleteProductFeature(
  id: string,
): Promise<ActionResult> {
  await requireRole("master_admin");

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("product_features")
    .delete()
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/master/products");
  revalidatePath("/catalogue");
  revalidatePath("/pricing");
  revalidatePath("/catalogue/[slug]", "page");
  return { ok: true, data: undefined };
}

/**
 * Create a product pricing tier.
 * Master Admin only.
 */
export async function createProductPricing(
  input: z.infer<typeof productPricingSchema>,
): Promise<ActionResult<Database["public"]["Tables"]["product_pricing"]["Row"]>> {
  await requireRole("master_admin");

  const parsed = productPricingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid pricing data.",
    };
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("product_pricing")
    .insert(parsed.data)
    .select("*")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/master/products");
  revalidatePath("/catalogue");
  revalidatePath("/pricing");
  revalidatePath("/catalogue/[slug]", "page");
  return { ok: true, data };
}

/**
 * Update a product pricing tier.
 * Master Admin only.
 */
export async function updateProductPricing(
  id: string,
  input: z.infer<typeof productPricingSchema>,
): Promise<ActionResult<Database["public"]["Tables"]["product_pricing"]["Row"]>> {
  await requireRole("master_admin");

  const parsed = productPricingSchema.safeParse({ ...input, id });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid pricing data.",
    };
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("product_pricing")
    .update(parsed.data)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/master/products");
  revalidatePath("/catalogue");
  revalidatePath("/pricing");
  revalidatePath("/catalogue/[slug]", "page");
  return { ok: true, data };
}

/**
 * Delete a product pricing tier.
 * Master Admin only.
 */
export async function deleteProductPricing(
  id: string,
): Promise<ActionResult> {
  await requireRole("master_admin");

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("product_pricing")
    .delete()
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/master/products");
  revalidatePath("/catalogue");
  revalidatePath("/pricing");
  revalidatePath("/catalogue/[slug]", "page");
  return { ok: true, data: undefined };
}
