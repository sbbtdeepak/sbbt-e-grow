"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireCompanyUser } from "@/lib/auth/session";
import { assertPermission, PermissionError } from "@/lib/auth/permissions.server";
import {
  deliveryConfirmSchema,
  type DeliveryConfirmInput,
} from "@/lib/validations/order";
import type { ActionResult } from "@/lib/validations/catalog";
import { mapDbError } from "@/lib/saas/db-errors";

/**
 * Bulk confirm delivery lines for an order.
 * Copies dispatch_qty → delivered_qty (user may edit).
 * Saves delivery_status, delivery_reference, delivery_date, delivery_notes.
 *
 * The order stage remains at 'delivery' — the next phase
 * (Expected Payment) is handled by the payments module, not an order stage.
 */
export async function confirmDelivery(
  input: DeliveryConfirmInput,
): Promise<ActionResult> {
  const ctx = await requireCompanyUser();

  try {
    await assertPermission("delivery");
  } catch (err) {
    if (err instanceof PermissionError) {
      return { ok: false, error: "You do not have permission to access delivery." };
    }
    return { ok: false, error: "Unable to verify permissions." };
  }

  const parsed = deliveryConfirmSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validation failed.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createSupabaseServerClient();

  // Verify the order belongs to the company and is in 'delivery' stage.
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, stage")
    .eq("id", parsed.data.orderId)
    .eq("company_id", ctx.companyId)
    .maybeSingle();

  if (orderError) return { ok: false, error: mapDbError(orderError) };
  if (!order) return { ok: false, error: "Order not found." };
  if (order.stage !== "delivery") {
    return {
      ok: false,
      error: "Only delivery stage orders can be confirmed here.",
    };
  }

  // Update each line's delivered_qty + delivery fields.
  for (const line of parsed.data.lines) {
    const { error } = await supabase
      .from("order_items")
      .update({
        delivered_qty: line.deliveredQty,
        delivery_status: line.deliveryStatus,
        delivery_reference: line.deliveryReference,
        delivery_date: line.deliveryDate,
        delivery_notes: line.deliveryNotes,
      })
      .eq("id", line.orderItemId)
      .eq("company_id", ctx.companyId)
      .eq("order_id", parsed.data.orderId);

    if (error) return { ok: false, error: mapDbError(error) };
  }

  // No stage change — order stays at 'delivery'.
  // The Expected Payment workflow is handled by the payments module.
  revalidatePath("/delivery");
  return { ok: true, data: undefined };
}
