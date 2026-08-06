"use client";

// Stage adapters for Staff Mobile UI.
// Reuses existing server actions and existing client row shapes.

import {
  type StageOrder,
  type StageItem,
  type StageSelected,
  type StageValueField,
} from "@/components/staff/staff-mobile-stage";

import { confirmPurchase } from "@/app/(app)/purchase/actions";
import { confirmPacking } from "@/app/(app)/packing/actions";
import { confirmDispatch } from "@/app/(app)/dispatch/actions";
import { confirmDelivery } from "@/app/(app)/delivery/actions";
import { createExpectedPayment, receivePayment } from "@/app/(app)/payments/actions";

import type { PurchaseOrder } from "@/components/purchase/purchase-client";
import type { PackingOrder } from "@/components/packing/packing-client";
import type { DispatchOrder } from "@/components/dispatch/dispatch-client";
import type { DeliveryOrder } from "@/components/delivery/delivery-client";

import type {
  PurchaseConfirmInput,
  PackConfirmInput,
  DispatchConfirmInput,
  DeliveryConfirmInput,
  PaymentConfirmInput,
  DeliveryStatus,
} from "@/lib/validations/order";

// ------------------------------------------------------------
// Purchase
// ------------------------------------------------------------

export const purchaseFields: StageValueField[] = [
  { key: "buyQty", label: "Buy Qty", type: "number", placeholder: "0" },
  { key: "vendorNotes", label: "Vendor Notes", textarea: true },
];

export function purchaseInitialValues(item: StageItem) {
  return {
    buyQty: String(item.referenceQty || 0),
    vendorNotes: "",
  };
}

export function purchaseOrders(orders: PurchaseOrder[]): StageOrder[] {
  return orders.map((order) => ({
    id: order.id,
    marketplace: order.marketplace,
    seller: order.seller_account,
    orderDate: order.order_date,
    stage: order.stage,
    items: order.order_items.map((item) => ({
      id: item.id,
      sku: item.product.sku,
      name: item.product.name,
      referenceQty: Number(item.ordered_qty || 0),
    })),
  }));
}

export async function purchasePayload(
  selected: StageSelected[],
): Promise<{ ok: boolean; error?: string }> {
  const byOrder = groupByOrder(selected);
  for (const orderId of Object.keys(byOrder)) {
    const lines = byOrder[orderId];
    const input: PurchaseConfirmInput = {
      orderId,
      lines: lines.map((s) => ({
        orderItemId: s.itemId,
        buyQty: Number(s.values.buyQty || 0),
        vendorNotes: trimOrNull(s.values.vendorNotes),
      })),
    };
    const result = await confirmPurchase(input);
    if (!result.ok) return result;
  }
  return { ok: true };
}

// ------------------------------------------------------------
// Packing
// ------------------------------------------------------------

export const packFields: StageValueField[] = [
  { key: "packedQty", label: "Packed Qty", type: "number", placeholder: "0" },
  { key: "packagingDate", label: "Packaging Date", type: "date" },
  { key: "packagingNotes", label: "Packaging Notes", textarea: true },
];

export function packInitialValues(item: StageItem) {
  return {
    packedQty: String(item.referenceQty || 0),
    packagingDate: "",
    packagingNotes: "",
  };
}

export function packOrders(orders: PackingOrder[]): StageOrder[] {
  return orders.map((order) => ({
    id: order.id,
    marketplace: order.marketplace,
    seller: order.seller_account,
    orderDate: order.order_date,
    stage: order.stage,
    items: order.order_items.map((item) => ({
      id: item.id,
      sku: item.product.sku,
      name: item.product.name,
      referenceQty: Number(item.buy_qty || 0),
    })),
  }));
}

export async function packPayload(selected: StageSelected[]): Promise<{ ok: boolean; error?: string }> {
  const byOrder = groupByOrder(selected);
  for (const orderId of Object.keys(byOrder)) {
    const lines = byOrder[orderId];
    const input: PackConfirmInput = {
      orderId,
      lines: lines.map((s) => ({
        orderItemId: s.itemId,
        packedQty: Number(s.values.packedQty || 0),
        packagingNotes: trimOrNull(s.values.packagingNotes),
        packagingDate: trimOrNull(s.values.packagingDate),
      })),
    };
    const result = await confirmPacking(input);
    if (!result.ok) return result;
  }
  return { ok: true };
}

// ------------------------------------------------------------
// Dispatch
// ------------------------------------------------------------

export const dispatchFields: StageValueField[] = [
  { key: "dispatchQty", label: "Dispatch Qty", type: "number", placeholder: "0" },
  { key: "courierName", label: "Courier", type: "text" },
  { key: "trackingNumber", label: "Tracking No", type: "text" },
  { key: "dispatchDate", label: "Dispatch Date", type: "date" },
  { key: "dispatchNotes", label: "Dispatch Notes", textarea: true },
];

export function dispatchInitialValues(item: StageItem) {
  return {
    dispatchQty: String(item.referenceQty || 0),
    courierName: "",
    trackingNumber: "",
    dispatchDate: "",
    dispatchNotes: "",
  };
}

export function dispatchOrders(orders: DispatchOrder[]): StageOrder[] {
  return orders.map((order) => ({
    id: order.id,
    marketplace: order.marketplace,
    seller: order.seller_account,
    orderDate: order.order_date,
    stage: order.stage,
    items: order.order_items.map((item) => ({
      id: item.id,
      sku: item.product.sku,
      name: item.product.name,
      referenceQty: Number(item.packed_qty || 0),
    })),
  }));
}

export async function dispatchPayload(selected: StageSelected[]): Promise<{ ok: boolean; error?: string }> {
  const byOrder = groupByOrder(selected);
  for (const orderId of Object.keys(byOrder)) {
    const lines = byOrder[orderId];
    const input: DispatchConfirmInput = {
      orderId,
      lines: lines.map((s) => ({
        orderItemId: s.itemId,
        dispatchQty: Number(s.values.dispatchQty || 0),
        courierName: trimOrNull(s.values.courierName),
        trackingNumber: trimOrNull(s.values.trackingNumber),
        dispatchDate: trimOrNull(s.values.dispatchDate),
        dispatchNotes: trimOrNull(s.values.dispatchNotes),
      })),
    };
    const result = await confirmDispatch(input);
    if (!result.ok) return result;
  }
  return { ok: true };
}

// ------------------------------------------------------------
// Delivery
// ------------------------------------------------------------

export const deliveryFields: StageValueField[] = [
  { key: "deliveredQty", label: "Delivered Qty", type: "number", placeholder: "0" },
  {
    key: "deliveryStatus",
    label: "Status",
    type: "select",
    options: ["Delivered", "Partial", "Cancelled", "Returned", "RTO"],
  },
  { key: "deliveryReference", label: "Reference", type: "text" },
  { key: "deliveryDate", label: "Delivery Date", type: "date" },
  { key: "deliveryNotes", label: "Delivery Notes", textarea: true },
];

export function deliveryInitialValues(item: StageItem) {
  return {
    deliveredQty: String(item.referenceQty || 0),
    deliveryStatus: "",
    deliveryReference: "",
    deliveryDate: "",
    deliveryNotes: "",
  };
}

export function deliveryOrders(orders: DeliveryOrder[]): StageOrder[] {
  return orders.map((order) => ({
    id: order.id,
    marketplace: order.marketplace,
    seller: order.seller_account,
    orderDate: order.order_date,
    stage: order.stage,
    items: order.order_items.map((item) => ({
      id: item.id,
      sku: item.product.sku,
      name: item.product.name,
      referenceQty: Number(item.dispatch_qty || item.packed_qty || 0),
    })),
  }));
}

export async function deliveryPayload(
  selected: StageSelected[],
): Promise<{ ok: boolean; error?: string }> {
  const byOrder = groupByOrder(selected);
  for (const orderId of Object.keys(byOrder)) {
    const lines = byOrder[orderId];
    const input: DeliveryConfirmInput = {
      orderId,
      lines: lines.map((s) => {
        const status = s.values.deliveryStatus;
        return {
          orderItemId: s.itemId,
          deliveredQty: Number(s.values.deliveredQty || 0),
          deliveryStatus: status ? (status as DeliveryStatus) : null,
          deliveryReference: trimOrNull(s.values.deliveryReference),
          deliveryDate: trimOrNull(s.values.deliveryDate),
          deliveryNotes: trimOrNull(s.values.deliveryNotes),
        };
      }),
    };
    const result = await confirmDelivery(input);
    if (!result.ok) return result;
  }
  return { ok: true };
}

// ------------------------------------------------------------
// Payment
// ------------------------------------------------------------

export async function paymentPayload(
  order: { id: string; amount_expected: number | null },
  received: string,
  method: string,
  reference: string,
  notes: string,
): Promise<{ ok: boolean; error?: string }> {
  const input: PaymentConfirmInput = {
    orderId: order.id,
    amountExpected: Number(order.amount_expected || 0),
    amountReceived: Number(received || 0),
    paymentMethod: trimOrNull(method),
    paymentReference: trimOrNull(reference),
    paymentNotes: trimOrNull(notes),
  };
  const existingResult = await receivePayment(input);
  if (existingResult.ok) return existingResult;
  if (existingResult.error !== "Payment record not found.") return existingResult;
  return createExpectedPayment(input);
}

// ------------------------------------------------------------
// Shared helpers
// ------------------------------------------------------------

function groupByOrder(selected: StageSelected[]): Record<string, StageSelected[]> {
  const map: Record<string, StageSelected[]> = {};
  for (const s of selected) {
    if (!map[s.orderId]) map[s.orderId] = [];
    map[s.orderId].push(s);
  }
  return map;
}

function trimOrNull(v: string | undefined): string | null {
  if (!v) return null;
  const t = v.trim();
  if (t.length > 0) return t;
  return null;
}
