"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireCompanyUser } from "@/lib/auth/session";
import { orderEntrySchema, type OrderEntryInput } from "@/lib/validations/order";
import type { ActionResult } from "@/lib/validations/catalog";

/**
 * Shared validation + authorization for order entry.
 * Returns the parsed input or an error result.
 */
async function validateOrderEntry(
  input: OrderEntryInput,
): Promise<
  | { ok: true; data: OrderEntryInput; companyId: string; userId: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }
> {
  const ctx = await requireCompanyUser();

  const parsed = orderEntrySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validation failed.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  return {
    ok: true,
    data: parsed.data,
    companyId: ctx.companyId,
    userId: ctx.userId,
  };
}

/**
 * Verify that the marketplace and seller account belong to the same company
 * and that the seller belongs to the selected marketplace.
 */
async function verifyMarketplaceSeller(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  companyId: string,
  marketplaceId: string,
  sellerAccountId: string,
): Promise<string | null> {
  const { data: marketplace } = await supabase
    .from("marketplaces")
    .select("id")
    .eq("id", marketplaceId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (!marketplace) return "Invalid marketplace selected.";

  const { data: seller } = await supabase
    .from("seller_accounts")
    .select("id")
    .eq("id", sellerAccountId)
    .eq("company_id", companyId)
    .eq("marketplace_id", marketplaceId)
    .maybeSingle();

  if (!seller) return "Seller account does not belong to the selected marketplace.";

  return null;
}

/**
 * Save an order as a draft (stage = 'entry').
 * Order lines are stored with ordered_qty only; buy/packed/delivered = 0.
 */
export async function saveOrderDraft(
  input: OrderEntryInput,
): Promise<ActionResult<{ orderId: string }>> {
  const validated = await validateOrderEntry(input);
  if (!validated.ok) return validated;

  const supabase = await createSupabaseServerClient();

  const verifyError = await verifyMarketplaceSeller(
    supabase,
    validated.companyId,
    validated.data.marketplaceId,
    validated.data.sellerAccountId,
  );
  if (verifyError) return { ok: false, error: verifyError };

  // Insert order header
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      company_id: validated.companyId,
      order_date: validated.data.orderDate,
      marketplace_id: validated.data.marketplaceId,
      seller_account_id: validated.data.sellerAccountId,
      stage: "entry",
      notes: validated.data.notes ?? null,
      created_by: validated.userId,
    })
    .select("id")
    .single();

  if (orderError) return { ok: false, error: orderError.message };

  // Insert order lines
  const lines = validated.data.lines.map((line) => ({
    company_id: validated.companyId,
    order_id: order.id,
    product_id: line.productId,
    ordered_qty: line.orderedQty,
    buy_qty: 0,
    packed_qty: 0,
    delivered_qty: 0,
    selling_price: line.sellingPrice,
    buying_price: line.buyingPrice,
    created_by: validated.userId,
  }));

  const { error: linesError } = await supabase
    .from("order_items")
    .insert(lines);

  if (linesError) {
    // Roll back the header if lines fail.
    await supabase.from("orders").delete().eq("id", order.id);
    return { ok: false, error: linesError.message };
  }

  revalidatePath("/orders");
  return { ok: true, data: { orderId: order.id } };
}

/**
 * Confirm an order entry (stage = 'purchase').
 * buy_qty is auto-copied from ordered_qty for every line.
 */
export async function confirmOrderEntry(
  input: OrderEntryInput,
): Promise<ActionResult<{ orderId: string }>> {
  const validated = await validateOrderEntry(input);
  if (!validated.ok) return validated;

  const supabase = await createSupabaseServerClient();

  const verifyError = await verifyMarketplaceSeller(
    supabase,
    validated.companyId,
    validated.data.marketplaceId,
    validated.data.sellerAccountId,
  );
  if (verifyError) return { ok: false, error: verifyError };

  // Insert order header with stage = 'purchase'
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      company_id: validated.companyId,
      order_date: validated.data.orderDate,
      marketplace_id: validated.data.marketplaceId,
      seller_account_id: validated.data.sellerAccountId,
      stage: "purchase",
      notes: validated.data.notes ?? null,
      created_by: validated.userId,
    })
    .select("id")
    .single();

  if (orderError) return { ok: false, error: orderError.message };

  // Insert order lines with buy_qty auto-copied from ordered_qty
  const lines = validated.data.lines.map((line) => ({
    company_id: validated.companyId,
    order_id: order.id,
    product_id: line.productId,
    ordered_qty: line.orderedQty,
    buy_qty: line.orderedQty, // auto-copy
    packed_qty: 0,
    delivered_qty: 0,
    selling_price: line.sellingPrice,
    buying_price: line.buyingPrice,
    created_by: validated.userId,
  }));

  const { error: linesError } = await supabase
    .from("order_items")
    .insert(lines);

  if (linesError) {
    await supabase.from("orders").delete().eq("id", order.id);
    return { ok: false, error: linesError.message };
  }

  revalidatePath("/orders");
  return { ok: true, data: { orderId: order.id } };
}