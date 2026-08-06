"use client";

import { StageMobileView } from "@/components/staff/staff-mobile-stage";
import {
  purchaseFields, purchaseInitialValues, purchaseOrders, purchasePayload,
  packFields, packInitialValues, packOrders, packPayload,
  dispatchFields, dispatchInitialValues, dispatchOrders, dispatchPayload,
  deliveryFields, deliveryInitialValues, deliveryOrders, deliveryPayload,
} from "@/components/staff/staff-mobile-adapters";
import type { PurchaseOrder } from "@/components/purchase/purchase-client";
import type { PackingOrder } from "@/components/packing/packing-client";
import type { DispatchOrder } from "@/components/dispatch/dispatch-client";
import type { DeliveryOrder } from "@/components/delivery/delivery-client";

export function PurchaseMobile({ orders }: { orders: PurchaseOrder[] }) {
  return <StageMobileView orders={purchaseOrders(orders)} title="Purchase" confirmLabel="Confirm Purchase" fields={purchaseFields} initialValues={purchaseInitialValues} buildPayload={purchasePayload} />;
}

export function PackingMobile({ orders }: { orders: PackingOrder[] }) {
  return <StageMobileView orders={packOrders(orders)} title="Packing" confirmLabel="Confirm Packing" fields={packFields} initialValues={packInitialValues} buildPayload={packPayload} />;
}

export function DispatchMobile({ orders }: { orders: DispatchOrder[] }) {
  return <StageMobileView orders={dispatchOrders(orders)} title="Dispatch" confirmLabel="Confirm Dispatch" fields={dispatchFields} initialValues={dispatchInitialValues} buildPayload={dispatchPayload} />;
}

export function DeliveryMobile({ orders }: { orders: DeliveryOrder[] }) {
  return <StageMobileView orders={deliveryOrders(orders)} title="Delivery" confirmLabel="Confirm Delivery" fields={deliveryFields} initialValues={deliveryInitialValues} buildPayload={deliveryPayload} />;
}