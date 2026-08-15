"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireCompanyUser, canMutateMasterData } from "@/lib/auth/session";
import { productSchema, type ActionResult, type ProductInput } from "@/lib/validations/catalog";
import { mapDbError } from "@/lib/saas/db-errors";
import {
  assertWithinLimit,
  EntitlementError,
} from "@/lib/saas/entitlements";

/**
 * Create a new product.
 * Enforces subscription products_limit before insert.
 */
export async function createProduct(
  input: ProductInput,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireCompanyUser();
  if (!canMutateMasterData(ctx.role)) {
    return { ok: false, error: "Not authorized to create products." };
  }

  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validation failed.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await assertWithinLimit("products_limit", 1);
  } catch (err) {
    if (err instanceof EntitlementError) {
      return { ok: false, error: err.message };
    }
    return { ok: false, error: "Unable to verify plan limits." };
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("products")
    .insert({
      company_id: ctx.companyId,
      sku: parsed.data.sku,
      name: parsed.data.name,
      buying_price: parsed.data.buyingPrice,
      category: parsed.data.category ?? null,
      image_url: parsed.data.imageUrl ?? null,
      status: parsed.data.status,
      created_by: ctx.userId,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Product with this SKU already exists." };
    }
    return { ok: false, error: mapDbError(error) };
  }

  revalidatePath("/products");
  return { ok: true, data: { id: data.id } };
}

/**
 * Update an existing product.
 */
export async function updateProduct(
  id: string,
  input: ProductInput,
): Promise<ActionResult> {
  const ctx = await requireCompanyUser();
  if (!canMutateMasterData(ctx.role)) {
    return { ok: false, error: "Not authorized to update products." };
  }

  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validation failed.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("products")
    .update({
      sku: parsed.data.sku,
      name: parsed.data.name,
      buying_price: parsed.data.buyingPrice,
      category: parsed.data.category ?? null,
      image_url: parsed.data.imageUrl ?? null,
      status: parsed.data.status,
    })
    .eq("id", id)
    .eq("company_id", ctx.companyId);

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Product with this SKU already exists." };
    }
    return { ok: false, error: mapDbError(error) };
  }

  revalidatePath("/products");
  return { ok: true, data: undefined };
}

/**
 * Delete a product.
 */
export async function deleteProduct(id: string): Promise<ActionResult> {
  const ctx = await requireCompanyUser();
  if (!canMutateMasterData(ctx.role)) {
    return { ok: false, error: "Not authorized to delete products." };
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id)
    .eq("company_id", ctx.companyId);

  if (error) {
    if (error.code === "23503") {
      return {
        ok: false,
        error: "Product is referenced by orders and cannot be deleted.",
      };
    }
    return { ok: false, error: mapDbError(error) };
  }

  revalidatePath("/products");
  return { ok: true, data: undefined };
}
