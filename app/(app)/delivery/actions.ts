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
import { calculateNetExpectedPayment } from "@/lib/payment";


/**
 * Bulk confirm delivery lines for an order.
 * Updates delivered_qty, returned_qty, rto_qty, cancelled_qty,
 * return_charge_per_unit, delivery_status, delivery_reference,
 * delivery_date, delivery_notes.
 *
 * After confirmation:
 * 1. Calculates net expected payment from delivery outcomes.
 * 2. Creates or updates the expected payment record.
 * 3. Advances order stage from 'delivery' to 'completed'.
 * 4. Sets delivery_confirmed_at for 5-day settlement window.
 *
 * Idempotent: if a payment already exists, it is updated (not duplicated).
 * Company isolation enforced on all queries.
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
    const flatErrors = parsed.error.flatten().fieldErrors;
    const details = Object.entries(flatErrors)
      .filter(([, v]) => v && v.length > 0)
      .map(([k, v]) => `${k}: ${v?.join(', ')}`)
      .join('; ');
    return {
      ok: false,
      error: details || "Validation failed.",
      fieldErrors: flatErrors,
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

  // ---- COMPLETENESS GUARD ----
  // Every order item must be fully accounted for before advancing to completed.
  // Fetch ALL items from the database — never trust the browser payload alone.

  // 1. Check for duplicate line IDs in the submitted payload.
  const seenIds = new Set<string>();
  for (const line of parsed.data.lines) {
    if (seenIds.has(line.orderItemId)) {
      return {
        ok: false,
        error: `Duplicate order item in payload: ${line.orderItemId}.`,
      };
    }
    seenIds.add(line.orderItemId);
  }

  // 2. Fetch ALL order items for this order from the database.
  const { data: allDbItems, error: allItemsError } = await supabase
    .from("order_items")
    .select("id, dispatch_qty, company_id, order_id")
    .eq("order_id", parsed.data.orderId)
    .eq("company_id", ctx.companyId);

  if (allItemsError) return { ok: false, error: mapDbError(allItemsError) };
  if (!allDbItems || allDbItems.length === 0) {
    return { ok: false, error: "No order items found for this order." };
  }

  // 3. Verify every submitted line belongs to this exact order and company.
  const dbItemIds = new Set(allDbItems.map((i) => i.id));
  for (const line of parsed.data.lines) {
    if (!dbItemIds.has(line.orderItemId)) {
      return {
        ok: false,
        error: `Order item ${line.orderItemId} does not belong to this order or company.`,
      };
    }
  }

  // 4. Validate ALL items have fully accounted quantities.
  // Build a map from submitted lines for quick lookup.
  const submittedMap = new Map(
    parsed.data.lines.map((l) => [l.orderItemId, l]),
  );

  const dispatchMap = new Map(
    allDbItems.map((d) => [d.id, Number(d.dispatch_qty)]),
  );

  for (const dbItem of allDbItems) {
    const submitted = submittedMap.get(dbItem.id);
    const dispatchQty = dispatchMap.get(dbItem.id) ?? 0;

    if (!submitted) {
      // This item was not in the payload — not accounted for.
      return {
        ok: false,
        error: `Order item ${dbItem.id.slice(0, 8)} is missing from the delivery confirmation. All items must be accounted for.`,
      };
    }

    const totalAccounted =
      submitted.deliveredQty + submitted.returnedQty + submitted.rtoQty + submitted.cancelledQty;

    if (totalAccounted > dispatchQty + 0.001) {
      return {
        ok: false,
        error: `Item ${dbItem.id.slice(0, 8)}: delivery outcomes (${totalAccounted}) exceed Dispatch Qty (${dispatchQty}).`,
      };
    }

    if (totalAccounted < dispatchQty - 0.001) {
      return {
        ok: false,
        error: `Item ${dbItem.id.slice(0, 8)}: ${dispatchQty - totalAccounted} qty still unaccounted.`,
      };
    }
  }

  // Update each line's delivery outcome fields.
  for (const line of parsed.data.lines) {
    const { error } = await supabase
      .from("order_items")
      .update({
        delivered_qty: line.deliveredQty,
        returned_qty: line.returnedQty,
        rto_qty: line.rtoQty,
        cancelled_qty: line.cancelledQty,
        return_charge_per_unit: line.returnChargePerUnit,
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

  // Get the latest delivery date from confirmed lines.
  const deliveryDate =
    parsed.data.lines
      .map((l) => l.deliveryDate)
      .filter(Boolean)
      .sort()
      .pop() ?? null;

  const now = new Date().toISOString();

  // Calculate net payment from ALL order items (after updates are applied above).
  const { data: paymentItems, error: paymentItemsError } = await supabase
    .from("order_items")
    .select("delivered_qty, returned_qty, rto_qty, cancelled_qty, return_charge_per_unit, selling_price")
    .eq("order_id", parsed.data.orderId)
    .eq("company_id", ctx.companyId);

  if (paymentItemsError) return { ok: false, error: mapDbError(paymentItemsError) };

  const amountExpected = calculateNetExpectedPayment(
    paymentItems?.map((i) => ({
      delivered_qty: Number(i.delivered_qty),
      returned_qty: Number(i.returned_qty),
      rto_qty: Number(i.rto_qty),
      cancelled_qty: Number(i.cancelled_qty),
      return_charge_per_unit: Number(i.return_charge_per_unit),
      selling_price: Number(i.selling_price),
    })) ?? [],
  );

  // Idempotent payment handling: update existing or create new.
  const { data: existingPayment } = await supabase
    .from("payments")
    .select("id")
    .eq("order_id", parsed.data.orderId)
    .eq("company_id", ctx.companyId)
    .maybeSingle();

  if (existingPayment) {
    // Update existing payment record (settlement recalculation).
    const { error: updateError } = await supabase
      .from("payments")
      .update({
        amount_expected: amountExpected,
        delivery_date: deliveryDate,
        updated_at: now,
      })
      .eq("id", existingPayment.id)
      .eq("company_id", ctx.companyId);

    if (updateError) return { ok: false, error: mapDbError(updateError) };
  } else {
    // Create new payment record.
    const { error: insertError } = await supabase.from("payments").insert({
      company_id: ctx.companyId,
      order_id: parsed.data.orderId,
      amount_expected: amountExpected,
      amount_received: 0,
      status: "expected",
      delivery_date: deliveryDate,
    });

    if (insertError) return { ok: false, error: mapDbError(insertError) };
  }

  // Advance order stage and set delivery_confirmed_at.
  const { error: stageError } = await supabase
    .from("orders")
    .update({
      stage: "completed",
      delivery_confirmed_at: now,
    })
    .eq("id", parsed.data.orderId)
    .eq("company_id", ctx.companyId);

  if (stageError) return { ok: false, error: mapDbError(stageError) };

  revalidatePath("/delivery");
  revalidatePath("/payments");
  return { ok: true, data: undefined };
}

/**
 * Update delivery settlement within the 5-day window.
 *
 * Allows editing delivered_qty, returned_qty, rto_qty, cancelled_qty,
 * return_charge_per_unit for a completed order within 5 calendar days
 * of the original delivery confirmation.
 *
 * Recalculates and updates the existing payment record.
 * Does NOT create a second payment record.
 */
export async function updateDeliverySettlement(
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

  // Verify the order belongs to the company and is completed.
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, stage, delivery_confirmed_at")
    .eq("id", parsed.data.orderId)
    .eq("company_id", ctx.companyId)
    .maybeSingle();

  if (orderError) return { ok: false, error: mapDbError(orderError) };
  if (!order) return { ok: false, error: "Order not found." };
  if (order.stage !== "completed") {
    return {
      ok: false,
      error: "Only completed orders can have their settlement updated.",
    };
  }

  // Check 5-day settlement window.
  if (order.delivery_confirmed_at) {
    const confirmedAt = new Date(order.delivery_confirmed_at);
    const fiveDaysLater = new Date(confirmedAt);
    fiveDaysLater.setDate(fiveDaysLater.getDate() + 5);
    const now = new Date();

    if (now > fiveDaysLater) {
      return {
        ok: false,
        error: "The 5-day delivery settlement update window has expired. Contact your company administrator for assistance.",
      };
    }
  }

  // Validate quantity constraints.
  const confirmedLineIds = parsed.data.lines.map((l) => l.orderItemId);
  const { data: dispatchData, error: dispatchError } = await supabase
    .from("order_items")
    .select("id, dispatch_qty, selling_price")
    .eq("order_id", parsed.data.orderId)
    .eq("company_id", ctx.companyId)
    .in("id", confirmedLineIds);

  if (dispatchError) return { ok: false, error: mapDbError(dispatchError) };

  const dispatchMap = new Map(
    dispatchData?.map((d) => [d.id, { dispatchQty: Number(d.dispatch_qty), sellingPrice: Number(d.selling_price) }]) ?? [],
  );

  for (const line of parsed.data.lines) {
    const dispatch = dispatchMap.get(line.orderItemId);
    if (!dispatch) continue;

    const totalAccounted =
      line.deliveredQty + line.returnedQty + line.rtoQty + line.cancelledQty;

    if (totalAccounted > dispatch.dispatchQty + 0.001) {
      return {
        ok: false,
        error: `Delivery outcomes (${totalAccounted}) exceed Dispatch Qty (${dispatch.dispatchQty}).`,
      };
    }

    if (totalAccounted < dispatch.dispatchQty - 0.001) {
      return {
        ok: false,
        error: `${dispatch.dispatchQty - totalAccounted} qty still unaccounted for line ${line.orderItemId}.`,
      };
    }
  }

  // Update each line's delivery outcome fields.
  for (const line of parsed.data.lines) {
    const { error } = await supabase
      .from("order_items")
      .update({
        delivered_qty: line.deliveredQty,
        returned_qty: line.returnedQty,
        rto_qty: line.rtoQty,
        cancelled_qty: line.cancelledQty,
        return_charge_per_unit: line.returnChargePerUnit,
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

  // Recalculate net payment from all items.
  const { data: allItems, error: itemsError } = await supabase
    .from("order_items")
    .select("delivered_qty, returned_qty, rto_qty, cancelled_qty, return_charge_per_unit, selling_price")
    .eq("order_id", parsed.data.orderId)
    .eq("company_id", ctx.companyId);

  if (itemsError) return { ok: false, error: mapDbError(itemsError) };

  const amountExpected = calculateNetExpectedPayment(
    allItems?.map((i) => ({
      delivered_qty: Number(i.delivered_qty),
      returned_qty: Number(i.returned_qty),
      rto_qty: Number(i.rto_qty),
      cancelled_qty: Number(i.cancelled_qty),
      return_charge_per_unit: Number(i.return_charge_per_unit),
      selling_price: Number(i.selling_price),
    })) ?? [],
  );

  const deliveryDate =
    parsed.data.lines
      .map((l) => l.deliveryDate)
      .filter(Boolean)
      .sort()
      .pop() ?? null;

  // Idempotent payment upsert: update existing or create new.
  // If initial delivery had ₹0 payment (all RTO/Cancelled) and settlement
  // later becomes non-zero, we must CREATE the payment record here.
  const { data: existingPayment } = await supabase
    .from("payments")
    .select("id")
    .eq("order_id", parsed.data.orderId)
    .eq("company_id", ctx.companyId)
    .maybeSingle();

  if (existingPayment) {
    const { error: updateError } = await supabase
      .from("payments")
      .update({
        amount_expected: amountExpected,
        delivery_date: deliveryDate,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingPayment.id)
      .eq("company_id", ctx.companyId);

    if (updateError) return { ok: false, error: mapDbError(updateError) };
  } else if (amountExpected !== 0) {
    // No existing payment and amount is non-zero — create it.
    const { error: insertError } = await supabase.from("payments").insert({
      company_id: ctx.companyId,
      order_id: parsed.data.orderId,
      amount_expected: amountExpected,
      amount_received: 0,
      status: "expected",
      delivery_date: deliveryDate,
    });

    if (insertError) return { ok: false, error: mapDbError(insertError) };
  }
  // If amount is 0 and no payment exists, we intentionally skip — no payment needed.

  revalidatePath("/delivery");
  revalidatePath("/payments");
  return { ok: true, data: undefined };
}
