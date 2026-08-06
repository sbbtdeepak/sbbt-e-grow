"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireCompanyUser } from "@/lib/auth/session";
import {
  paymentConfirmSchema,
  type PaymentConfirmInput,
} from "@/lib/validations/order";
import type { ActionResult } from "@/lib/validations/catalog";

/**
 * Create expected payment record for a delivered order.
 * Auto-calculates expected_payment_date = delivery_date + payment_release_days.
 * Amounts are set from the order's total_sale. Status = expected.
 */
export async function createExpectedPayment(
  input: PaymentConfirmInput,
): Promise<ActionResult> {
  const ctx = await requireCompanyUser();

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

  if (orderError) return { ok: false, error: orderError.message };
  if (!order) return { ok: false, error: "Order not found." };
  if (order.stage !== "delivery") {
    return {
      ok: false,
      error: "Only delivery stage orders can have expected payments.",
    };
  }

  // Get order items total sale for expected amount.
  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("total_sale")
    .eq("order_id", order.id)
    .eq("company_id", ctx.companyId);

  if (itemsError) return { ok: false, error: itemsError.message };

  const amountExpected = items?.reduce((sum, i) => sum + (i.total_sale || 0), 0) || 0;
  const amountReceived = parsed.data.amountReceived || 0;
  const pending = Math.max(0, amountExpected - amountReceived);

  let status: "expected" | "partial" | "received" | "pending" | "cancelled" = "expected";
  if (amountReceived <= 0) status = "expected";
  else if (amountReceived >= amountExpected) status = "received";
  else status = "partial";

  const { error } = await supabase.from("payments").insert({
    company_id: ctx.companyId,
    order_id: order.id,
    amount_expected: amountExpected,
    amount_received: amountReceived,
    pending,
    status,
    payment_method: parsed.data.paymentMethod,
    payment_reference: parsed.data.paymentReference,
    payment_notes: parsed.data.paymentNotes,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/payments");
  return { ok: true, data: undefined };
}

/**
 * Receive payment for an existing expected payment.
 * Updates amount_received, pending, and status.
 */
export async function receivePayment(
  input: PaymentConfirmInput,
): Promise<ActionResult> {
  const ctx = await requireCompanyUser();

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

  if (existingError) return { ok: false, error: existingError.message };
  if (!existing) return { ok: false, error: "Payment record not found." };

  const amountExpected = existing.amount_expected;
  const amountReceived = parsed.data.amountReceived || 0;
  const pending = Math.max(0, amountExpected - amountReceived);

  let status: "expected" | "partial" | "received" | "pending" | "cancelled" = "expected";
  if (amountReceived <= 0) status = "expected";
  else if (amountReceived >= amountExpected) status = "received";
  else status = "partial";

  const { error } = await supabase
    .from("payments")
    .update({
      amount_received: amountReceived,
      pending,
      status,
      payment_method: parsed.data.paymentMethod,
      payment_reference: parsed.data.paymentReference,
      payment_notes: parsed.data.paymentNotes,
    })
    .eq("id", existing.id)
    .eq("company_id", ctx.companyId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/payments");
  return { ok: true, data: undefined };
}