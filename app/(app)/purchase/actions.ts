"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireCompanyUser } from "@/lib/auth/session";
import { assertPermission, PermissionError } from "@/lib/auth/permissions.server";
import {
  purchaseConfirmSchema,
  type PurchaseConfirmInput,
} from "@/lib/validations/order";
import type { ActionResult } from "@/lib/validations/catalog";
import { mapDbError } from "@/lib/saas/db-errors";

/**
 * Update buy_qty and vendor_notes for a single order item.
 * Only allowed while the parent order is in 'purchase' stage.
 */
export async function updatePurchaseLine(
  orderItemId: string,
  buyQty: number,
  vendorNotes: string | null,
): Promise<ActionResult> {
  const ctx = await requireCompanyUser();

  try {
    await assertPermission("purchase");
  } catch (err) {
    if (err instanceof PermissionError) {
      return { ok: false, error: "You do not have permission to access purchase." };
    }
    return { ok: false, error: "Unable to verify permissions." };
  }

  if (!Number.isFinite(buyQty) || buyQty < 0) {
    return { ok: false, error: "Buy qty must be a non-negative number." };
  }
  if (vendorNotes && vendorNotes.length > 500) {
    return { ok: false, error: "Vendor notes are too long." };
  }

  const supabase = await createSupabaseServerClient();

  // Verify the item belongs to the company and its order is in 'purchase' stage.
  const { data: item, error: itemError } = await supabase
    .from("order_items")
    .select("id, orders!inner(stage)")
    .eq("id", orderItemId)
    .eq("company_id", ctx.companyId)
    .maybeSingle();

  if (itemError) return { ok: false, error: mapDbError(itemError) };
  if (!item) return { ok: false, error: "Order item not found." };

  const order = Array.isArray(item.orders) ? item.orders[0] : item.orders;
  if (!order || order.stage !== "purchase") {
    return {
      ok: false,
      error: "Only confirmed order entries (purchase stage) can be edited.",
    };
  }

  const { error } = await supabase
    .from("order_items")
    .update({
      buy_qty: buyQty,
      vendor_notes: vendorNotes,
    })
    .eq("id", orderItemId)
    .eq("company_id", ctx.companyId);

  if (error) return { ok: false, error: mapDbError(error) };

  revalidatePath("/purchase");
  return { ok: true, data: undefined };
}

/**
 * Bulk confirm purchase lines for an order.
 * Moves the order stage from 'purchase' to 'packing'.
 */
export async function confirmPurchase(
  input: PurchaseConfirmInput,
): Promise<ActionResult> {
  const ctx = await requireCompanyUser();

  try {
    await assertPermission("purchase");
  } catch (err) {
    if (err instanceof PermissionError) {
      return { ok: false, error: "You do not have permission to access purchase." };
    }
    return { ok: false, error: "Unable to verify permissions." };
  }

  const parsed = purchaseConfirmSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validation failed.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createSupabaseServerClient();

  // Verify the order belongs to the company and is in 'purchase' stage.
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, stage")
    .eq("id", parsed.data.orderId)
    .eq("company_id", ctx.companyId)
    .maybeSingle();

  if (orderError) return { ok: false, error: mapDbError(orderError) };
  if (!order) return { ok: false, error: "Order not found." };
  if (order.stage !== "purchase") {
    return {
      ok: false,
      error: "Only confirmed order entries (purchase stage) can be confirmed.",
    };
  }

  // Update each line's buy_qty + vendor_notes.
  const lineUpdates = parsed.data.lines.map((line) => ({
    id: line.orderItemId,
    buy_qty: line.buyQty,
    vendor_notes: line.vendorNotes,
  }));

  for (const update of lineUpdates) {
    const { error } = await supabase
      .from("order_items")
      .update({
        buy_qty: update.buy_qty,
        vendor_notes: update.vendor_notes,
      })
      .eq("id", update.id)
      .eq("company_id", ctx.companyId)
      .eq("order_id", parsed.data.orderId);

    if (error) return { ok: false, error: mapDbError(error) };
  }

  // Move the order to 'packing' stage.
  const { error: stageError } = await supabase
    .from("orders")
    .update({ stage: "packing" })
    .eq("id", parsed.data.orderId)
    .eq("company_id", ctx.companyId);

  if (stageError) return { ok: false, error: mapDbError(stageError) };

  revalidatePath("/purchase");
  return { ok: true, data: undefined };
}