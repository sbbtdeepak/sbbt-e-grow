"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireCompanyUser } from "@/lib/auth/session";
import { assertPermission, PermissionError } from "@/lib/auth/permissions.server";
import {
  paymentConfirmSchema,
  type PaymentConfirmInput,
} from "@/lib/validations/order";
import type { ActionResult } from "@/lib/validations/catalog";
import { mapDbError } from "@/lib/saas/db-errors";
import { calculateNetExpectedPayment } from "@/lib/payment";

/**
 * Create expected payment record for a delivered order.
 * Auto-calculates expected_payment_date = delivery_date + payment_release_days.
 * Expected payment is calculated using the shared outcome-aware
 * calculateNetExpectedPayment helper based on:
 *   - delivered_qty × selling_price
 *   - minus returned_qty × return_charge_per_unit
 *   - RTO contributes ₹0
 *   - Cancelled contributes ₹0
 */
export async function createExpectedPayment(
  input: PaymentConfirmInput,
): Promise<ActionResult> {
  const ctx = await requireCompanyUser();

  try {
    await assertPermission("payments");
  } catch (err) {
    if (err instanceof PermissionError) {
      return { ok: false, error: "You do not have permission to access payments." };
    }
    return { ok: false, error: "Unable to verify permissions." };
  }

  const parsed = paymentConfirmSchema.safeParse(input);
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
  if (order.stage !== "delivery" && order.stage !== "completed") {
    return {
      ok: false,
      error: "Only delivery or completed stage orders can have expected payments.",
    };
  }

  // Calculate expected amount using the same outcome-aware formula
  // used by delivery confirmation and settlement updates.
  // Formula: SUM(delivered_qty × selling_price) - SUM(returned_qty × return_charge_per_unit)
  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("delivered_qty, returned_qty, rto_qty, cancelled_qty, return_charge_per_unit, selling_price")
    .eq("order_id", order.id)
    .eq("company_id", ctx.companyId);

  if (itemsError) return { ok: false, error: mapDbError(itemsError) };

  const amountExpected = calculateNetExpectedPayment(
    items?.map((i) => ({
      delivered_qty: Number(i.delivered_qty),
      returned_qty: Number(i.returned_qty),
      rto_qty: Number(i.rto_qty),
      cancelled_qty: Number(i.cancelled_qty),
      return_charge_per_unit: Number(i.return_charge_per_unit),
      selling_price: Number(i.selling_price),
    })) ?? [],
  );
  const amountReceived = parsed.data.amountReceived || 0;

  let status: "expected" | "partial" | "received" | "pending" | "cancelled" = "expected";
  if (amountReceived <= 0) status = "expected";
  else if (amountReceived >= amountExpected) status = "received";
  else status = "partial";

  const { error } = await supabase.from("payments").insert({
    company_id: ctx.companyId,
    order_id: order.id,
    amount_expected: amountExpected,
    amount_received: amountReceived,
    status,
    payment_method: parsed.data.paymentMethod,
    payment_reference: parsed.data.paymentReference,
    payment_notes: parsed.data.paymentNotes,
  });

  if (error) return { ok: false, error: mapDbError(error) };

  revalidatePath("/payments");
  return { ok: true, data: undefined };
}

/**
 * Receive payment for an existing expected payment.
 * Updates amount_received and status. (pending is auto-computed.)
 */
export async function receivePayment(
  input: PaymentConfirmInput,
): Promise<ActionResult> {
  const ctx = await requireCompanyUser();

  try {
    await assertPermission("payments");
  } catch (err) {
    if (err instanceof PermissionError) {
      return { ok: false, error: "You do not have permission to access payments." };
    }
    return { ok: false, error: "Unable to verify permissions." };
  }

  const parsed = paymentConfirmSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validation failed.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createSupabaseServerClient();

  // Find existing payment record for this order.
  const { data: existing, error: existingError } = await supabase
    .from("payments")
    .select("id, amount_expected")
    .eq("order_id", parsed.data.orderId)
    .eq("company_id", ctx.companyId)
    .maybeSingle();

  if (existingError) return { ok: false, error: mapDbError(existingError) };
  if (!existing) return { ok: false, error: "Payment record not found." };

  const amountExpected = existing.amount_expected;
  const amountReceived = parsed.data.amountReceived || 0;

  let status: "expected" | "partial" | "received" | "pending" | "cancelled" = "expected";
  if (amountReceived <= 0) status = "expected";
  else if (amountReceived >= amountExpected) status = "received";
  else status = "partial";

  const { error } = await supabase
    .from("payments")
    .update({
      amount_received: amountReceived,
      status,
      payment_method: parsed.data.paymentMethod,
      payment_reference: parsed.data.paymentReference,
      payment_notes: parsed.data.paymentNotes,
    })
    .eq("id", existing.id)
    .eq("company_id", ctx.companyId);

  if (error) return { ok: false, error: mapDbError(error) };

  revalidatePath("/payments");
  return { ok: true, data: undefined };
}