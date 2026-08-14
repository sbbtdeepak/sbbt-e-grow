"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireCompanyUser, canMutateMasterData } from "@/lib/auth/session";
import {
  marketplaceSchema,
  sellerAccountSchema,
  type ActionResult,
  type MarketplaceInput,
} from "@/lib/validations/catalog";
import {
  assertWithinLimit,
  EntitlementError,
} from "@/lib/saas/entitlements";

// ============================================================
// MARKETPLACE ACTIONS
// ============================================================

export async function createMarketplace(
  input: MarketplaceInput,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireCompanyUser();
  if (!canMutateMasterData(ctx.role)) {
    return { ok: false, error: "Not authorized to create marketplaces." };
  }

  const parsed = marketplaceSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validation failed.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await assertWithinLimit("marketplaces_limit", 1);
  } catch (err) {
    if (err instanceof EntitlementError) {
      return { ok: false, error: err.message };
    }
    return { ok: false, error: "Unable to verify plan limits." };
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("marketplaces")
    .insert({
      company_id: ctx.companyId,
      name: parsed.data.name,
      slug: parsed.data.slug,
      is_active: parsed.data.isActive,
      created_by: ctx.userId,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error: "A marketplace with this slug already exists.",
      };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/marketplaces");
  return { ok: true, data: { id: data.id } };
}

export async function updateMarketplace(
  id: string,
  input: MarketplaceInput,
): Promise<ActionResult> {
  const ctx = await requireCompanyUser();
  if (!canMutateMasterData(ctx.role)) {
    return { ok: false, error: "Not authorized to update marketplaces." };
  }

  const parsed = marketplaceSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validation failed.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("marketplaces")
    .update({
      name: parsed.data.name,
      slug: parsed.data.slug,
      is_active: parsed.data.isActive,
    })
    .eq("id", id)
    .eq("company_id", ctx.companyId);

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error: "A marketplace with this slug already exists.",
      };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/marketplaces");
  return { ok: true, data: undefined };
}

export async function deleteMarketplace(id: string): Promise<ActionResult> {
  const ctx = await requireCompanyUser();
  if (!canMutateMasterData(ctx.role)) {
    return { ok: false, error: "Not authorized to delete marketplaces." };
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("marketplaces")
    .delete()
    .eq("id", id)
    .eq("company_id", ctx.companyId);

  if (error) {
    if (error.code === "23503") {
      return {
        ok: false,
        error:
          "Marketplace is referenced by seller accounts or orders and cannot be deleted.",
      };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/marketplaces");
  return { ok: true, data: undefined };
}

// ============================================================
// SELLER ACCOUNT ACTIONS
// ============================================================

export type SellerAccountPayload = Parameters<
  typeof sellerAccountSchema.safeParse
>[0];

export async function createSellerAccount(
  input: SellerAccountPayload,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireCompanyUser();
  if (!canMutateMasterData(ctx.role)) {
    return { ok: false, error: "Not authorized to create seller accounts." };
  }

  const parsed = sellerAccountSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validation failed.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await assertWithinLimit("seller_accounts_limit", 1);
  } catch (err) {
    if (err instanceof EntitlementError) {
      return { ok: false, error: err.message };
    }
    return { ok: false, error: "Unable to verify plan limits." };
  }

  const supabase = await createSupabaseServerClient();

  // Ensure the marketplace belongs to the same company before inserting.
  const { data: marketplace } = await supabase
    .from("marketplaces")
    .select("id")
    .eq("id", parsed.data.marketplaceId)
    .eq("company_id", ctx.companyId)
    .maybeSingle();

  if (!marketplace) {
    return { ok: false, error: "Invalid marketplace selected." };
  }

  const { data, error } = await supabase
    .from("seller_accounts")
    .insert({
      company_id: ctx.companyId,
      marketplace_id: parsed.data.marketplaceId,
      name: parsed.data.name,
      is_active: parsed.data.isActive,
      created_by: ctx.userId,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error: "A seller account with this name already exists in this marketplace.",
      };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/marketplaces");
  return { ok: true, data: { id: data.id } };
}

export async function updateSellerAccount(
  id: string,
  input: SellerAccountPayload,
): Promise<ActionResult> {
  const ctx = await requireCompanyUser();
  if (!canMutateMasterData(ctx.role)) {
    return { ok: false, error: "Not authorized to update seller accounts." };
  }

  const parsed = sellerAccountSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validation failed.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createSupabaseServerClient();

  // Ensure the target marketplace belongs to the same company.
  const { data: marketplace } = await supabase
    .from("marketplaces")
    .select("id")
    .eq("id", parsed.data.marketplaceId)
    .eq("company_id", ctx.companyId)
    .maybeSingle();

  if (!marketplace) {
    return { ok: false, error: "Invalid marketplace selected." };
  }

  const { error } = await supabase
    .from("seller_accounts")
    .update({
      marketplace_id: parsed.data.marketplaceId,
      name: parsed.data.name,
      is_active: parsed.data.isActive,
    })
    .eq("id", id)
    .eq("company_id", ctx.companyId);

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error: "A seller account with this name already exists in this marketplace.",
      };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/marketplaces");
  return { ok: true, data: undefined };
}

export async function deleteSellerAccount(id: string): Promise<ActionResult> {
  const ctx = await requireCompanyUser();
  if (!canMutateMasterData(ctx.role)) {
    return { ok: false, error: "Not authorized to delete seller accounts." };
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("seller_accounts")
    .delete()
    .eq("id", id)
    .eq("company_id", ctx.companyId);

  if (error) {
    if (error.code === "23503") {
      return {
        ok: false,
        error: "Seller account is referenced by orders and cannot be deleted.",
      };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/marketplaces");
  return { ok: true, data: undefined };
}
