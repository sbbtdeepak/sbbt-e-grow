"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireCompanyUser } from "@/lib/auth/session";
import { assertPermission, PermissionError } from "@/lib/auth/permissions.server";
import {
  dispatchConfirmSchema,
  type DispatchConfirmInput,
} from "@/lib/validations/order";
import type { ActionResult } from "@/lib/validations/catalog";

/**
 * Bulk confirm dispatch lines for an order.
 * Copies packed_qty → dispatch_qty (user may edit).
 * Saves dispatch_date, dispatch_notes, tracking_number, courier_name.
 * After confirmation, order stage moves from 'dispatch' to 'delivery'.
 */
export async function confirmDispatch(
  input: DispatchConfirmInput,
): Promise<ActionResult> {
  const ctx = await requireCompanyUser();

  try {
    await assertPermission("dispatch");
  } catch (err) {
    if (err instanceof PermissionError) {
      return { ok: false, error: "You do not have permission to access dispatch." };
    }
    return { ok: false, error: "Unable to verify permissions." };
  }

  const parsed = dispatchConfirmSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validation failed.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createSupabaseServerClient();

  // Verify the order belongs to the company and is in 'dispatch' stage.
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, stage")
    .eq("id", parsed.data.orderId)
    .eq("company_id", ctx.companyId)
    .maybeSingle();

  if (orderError) return { ok: false, error: orderError.message };
  if (!order) return { ok: false, error: "Order not found." };
  if (order.stage !== "dispatch") {
    return {
      ok: false,
      error: "Only dispatch stage orders can be confirmed here.",
    };
  }

  // Update each line's dispatch_qty + dispatch fields.
  for (const line of parsed.data.lines) {
    const { error } = await supabase
      .from("order_items")
      .update({
        dispatch_qty: line.dispatchQty,
        courier_name: line.courierName,
        tracking_number: line.trackingNumber,
        dispatch_date: line.dispatchDate,
        dispatch_notes: line.dispatchNotes,
      })
      .eq("id", line.orderItemId)
      .eq("company_id", ctx.companyId)
      .eq("order_id", parsed.data.orderId);

    if (error) return { ok: false, error: error.message };
  }

  // Move the order to 'delivery' stage.
  const { error: stageError } = await supabase
    .from("orders")
    .update({ stage: "delivery" })
    .eq("id", parsed.data.orderId)
    .eq("company_id", ctx.companyId);

  if (stageError) return { ok: false, error: stageError.message };

  revalidatePath("/dispatch");
  revalidatePath("/delivery");
  return { ok: true, data: undefined };
}
