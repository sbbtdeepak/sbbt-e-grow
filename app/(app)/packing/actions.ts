"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireCompanyUser } from "@/lib/auth/session";
import { assertPermission, PermissionError } from "@/lib/auth/permissions.server";
import {
  packConfirmSchema,
  type PackConfirmInput,
} from "@/lib/validations/order";
import type { ActionResult } from "@/lib/validations/catalog";
import { mapDbError } from "@/lib/saas/db-errors";

/**
 * Update packed_qty, packaging_notes and packaging_date for a single order item.
 * Only allowed while the parent order is in 'packing' stage.
 */
export async function updatePackingLine(
  orderItemId: string,
  packedQty: number,
  packagingNotes: string | null,
  packagingDate: string | null,
): Promise<ActionResult> {
  const ctx = await requireCompanyUser();

  try {
    await assertPermission("packing");
  } catch (err) {
    if (err instanceof PermissionError) {
      return { ok: false, error: "You do not have permission to access packing." };
    }
    return { ok: false, error: "Unable to verify permissions." };
  }

  if (!Number.isFinite(packedQty) || packedQty < 0) {
    return { ok: false, error: "Packed qty must be a non-negative number." };
  }

  const supabase = await createSupabaseServerClient();

  // Verify the item belongs to the company and its order is in 'packing' stage.
  const { data: item, error: itemError } = await supabase
    .from("order_items")
    .select("id, orders!inner(stage), buy_qty")
    .eq("id", orderItemId)
    .eq("company_id", ctx.companyId)
    .maybeSingle();

  if (itemError) return { ok: false, error: mapDbError(itemError) };
  if (!item) return { ok: false, error: "Order item not found." };

  const order = Array.isArray(item.orders) ? item.orders[0] : item.orders;
  if (!order || order.stage !== "packing") {
    return {
      ok: false,
      error: "Only packing stage orders can be edited here.",
    };
  }

  if (packedQty > Number(item.buy_qty || 0)) {
    return {
      ok: false,
      error: "Packed qty cannot exceed buy qty.",
    };
  }

  const { error } = await supabase
    .from("order_items")
    .update({
      packed_qty: packedQty,
      packaging_notes: packagingNotes,
      packaging_date: packagingDate,
    })
    .eq("id", orderItemId)
    .eq("company_id", ctx.companyId);

  if (error) return { ok: false, error: mapDbError(error) };

  revalidatePath("/packing");
  return { ok: true, data: undefined };
}

/**
 * Bulk confirm packing lines for an order.
 * Moves the order stage from 'packing' to 'dispatch'.
 */
export async function confirmPacking(
  input: PackConfirmInput,
): Promise<ActionResult> {
  const ctx = await requireCompanyUser();

  try {
    await assertPermission("packing");
  } catch (err) {
    if (err instanceof PermissionError) {
      return { ok: false, error: "You do not have permission to access packing." };
    }
    return { ok: false, error: "Unable to verify permissions." };
  }

  const parsed = packConfirmSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validation failed.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createSupabaseServerClient();

  // Verify the order belongs to the company and is in 'packing' stage.
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, stage")
    .eq("id", parsed.data.orderId)
    .eq("company_id", ctx.companyId)
    .maybeSingle();

  if (orderError) return { ok: false, error: mapDbError(orderError) };
  if (!order) return { ok: false, error: "Order not found." };
  if (order.stage !== "packing") {
    return {
      ok: false,
      error: "Only packing stage orders can be confirmed here.",
    };
  }

  // Update each line's packed_qty + packaging notes/date.
  for (const line of parsed.data.lines) {
    const { error } = await supabase
      .from("order_items")
      .update({
        packed_qty: line.packedQty,
        packaging_notes: line.packagingNotes,
        packaging_date: line.packagingDate,
      })
      .eq("id", line.orderItemId)
      .eq("company_id", ctx.companyId)
      .eq("order_id", parsed.data.orderId);

    if (error) return { ok: false, error: mapDbError(error) };
  }

  // Move the order to 'dispatch' stage.
  const { error: stageError } = await supabase
    .from("orders")
    .update({ stage: "dispatch" })
    .eq("id", parsed.data.orderId)
    .eq("company_id", ctx.companyId);

  if (stageError) return { ok: false, error: mapDbError(stageError) };

  revalidatePath("/packing");
  return { ok: true, data: undefined };
}
