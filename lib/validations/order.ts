import { z } from "zod";

// ============================================================
// ORDER ENTRY
// ============================================================

export const orderLineSchema = z.object({
  productId: z.string().uuid("Select a valid product."),
  orderedQty: z.coerce
    .number({ invalid_type_error: "Quantity must be a number." })
    .positive("Quantity must be greater than zero."),
  sellingPrice: z.coerce
    .number({ invalid_type_error: "Selling price must be a number." })
    .min(0, "Selling price cannot be negative."),
  buyingPrice: z.coerce
    .number({ invalid_type_error: "Buying price must be a number." })
    .min(0, "Buying price cannot be negative."),
});

export type OrderLineInput = z.infer<typeof orderLineSchema>;

export const orderEntrySchema = z.object({
  orderDate: z.string().min(1, "Order date is required."),
  marketplaceId: z.string().uuid("Select a valid marketplace."),
  sellerAccountId: z.string().uuid("Select a valid seller account."),
  notes: z.string().trim().max(2000, "Notes are too long.").optional().nullable(),
  lines: z
    .array(orderLineSchema)
    .min(1, "Add at least one order line.")
    .max(1000, "Maximum 1000 lines per order."),
});

export type OrderEntryInput = z.infer<typeof orderEntrySchema>;

// ============================================================
// ORDER STAGE UPDATE
// ============================================================

export const orderStageSchema = z.enum([
  "entry",
  "purchase",
  "packing",
  "delivery",
]);

export type OrderStageInput = z.infer<typeof orderStageSchema>;

// ============================================================
// QUANTITY FLOW UPDATE
// ============================================================

export const orderItemQtySchema = z.object({
  orderItemId: z.string().uuid("Invalid order item."),
  buyQty: z.coerce
    .number({ invalid_type_error: "Buy qty must be a number." })
    .min(0, "Buy qty cannot be negative."),
  packedQty: z.coerce
    .number({ invalid_type_error: "Packed qty must be a number." })
    .min(0, "Packed qty cannot be negative."),
  deliveredQty: z.coerce
    .number({ invalid_type_error: "Delivered qty must be a number." })
    .min(0, "Delivered qty cannot be negative."),
});

export type OrderItemQtyInput = z.infer<typeof orderItemQtySchema>;

// ============================================================
// PURCHASE MODULE
// ============================================================

export const purchaseLineSchema = z.object({
  orderItemId: z.string().uuid("Invalid order item."),
  buyQty: z.coerce
    .number({ invalid_type_error: "Buy qty must be a number." })
    .min(0, "Buy qty cannot be negative."),
  vendorNotes: z
    .string()
    .trim()
    .max(500, "Vendor notes are too long.")
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
});

export type PurchaseLineInput = z.infer<typeof purchaseLineSchema>;

export const purchaseConfirmSchema = z.object({
  orderId: z.string().uuid("Invalid order."),
  lines: z
    .array(purchaseLineSchema)
    .min(1, "Select at least one line to confirm."),
});

export type PurchaseConfirmInput = z.infer<typeof purchaseConfirmSchema>;

// ============================================================
// PACKING MODULE
// ============================================================

export const packLineSchema = z.object({
  orderItemId: z.string().uuid("Invalid order item."),
  packedQty: z.coerce
    .number({ invalid_type_error: "Packed qty must be a number." })
    .min(0, "Packed qty cannot be negative."),
  packagingNotes: z
    .string()
    .trim()
    .max(500, "Packaging notes are too long.")
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  packagingDate: z
    .string()
    .min(1, "Packaging date is required.")
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
});

export type PackLineInput = z.infer<typeof packLineSchema>;

export const packConfirmSchema = z.object({
  orderId: z.string().uuid("Invalid order."),
  lines: z
    .array(packLineSchema)
    .min(1, "Select at least one line to confirm."),
});

export type PackConfirmInput = z.infer<typeof packConfirmSchema>;

// ============================================================
// DISPATCH MODULE
// ============================================================

export const dispatchLineSchema = z.object({
  orderItemId: z.string().uuid("Invalid order item."),
  dispatchQty: z.coerce
    .number({ invalid_type_error: "Dispatch qty must be a number." })
    .min(0, "Dispatch qty cannot be negative."),
  courierName: z
    .string()
    .trim()
    .max(100, "Courier name is too long.")
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  trackingNumber: z
    .string()
    .trim()
    .max(200, "Tracking number is too long.")
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  dispatchDate: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  dispatchNotes: z
    .string()
    .trim()
    .max(500, "Dispatch notes are too long.")
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
});

export type DispatchLineInput = z.infer<typeof dispatchLineSchema>;

export const dispatchConfirmSchema = z.object({
  orderId: z.string().uuid("Invalid order."),
  lines: z
    .array(dispatchLineSchema)
    .min(1, "Select at least one line to confirm."),
});

export type DispatchConfirmInput = z.infer<typeof dispatchConfirmSchema>;

// ============================================================
// DELIVERY MODULE
// ============================================================

export const deliveryStatusSchema = z.enum([
  "Delivered",
  "Partial",
  "Cancelled",
  "Returned",
  "RTO",
]);

export type DeliveryStatus = z.infer<typeof deliveryStatusSchema>;

export const deliveryLineSchema = z.object({
  orderItemId: z.string().uuid("Invalid order item."),
  deliveredQty: z.coerce
    .number({ invalid_type_error: "Delivered qty must be a number." })
    .min(0, "Delivered qty cannot be negative."),
  deliveryStatus: deliveryStatusSchema.optional().nullable(),
  deliveryReference: z
    .string()
    .trim()
    .max(200, "Delivery reference is too long.")
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  deliveryDate: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  deliveryNotes: z
    .string()
    .trim()
    .max(500, "Delivery notes are too long.")
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
});

export type DeliveryLineInput = z.infer<typeof deliveryLineSchema>;

export const deliveryConfirmSchema = z.object({
  orderId: z.string().uuid("Invalid order."),
  lines: z
    .array(deliveryLineSchema)
    .min(1, "Select at least one line to confirm."),
});

export type DeliveryConfirmInput = z.infer<typeof deliveryConfirmSchema>;

// ============================================================
// PAYMENT MODULE
// ============================================================

export const paymentStatusSchema = z.enum([
  "expected",
  "received",
  "partial",
  "pending",
  "cancelled",
]);

export const paymentLineSchema = z.object({
  orderId: z.string().uuid("Invalid order."),
  amountExpected: z.coerce
    .number({ invalid_type_error: "Expected amount must be a number." })
    .min(0, "Expected amount cannot be negative."),
  amountReceived: z.coerce
    .number({ invalid_type_error: "Received amount must be a number." })
    .min(0, "Received amount cannot be negative.")
    .default(0),
  paymentMethod: z
    .string()
    .trim()
    .max(50, "Payment method is too long.")
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  paymentReference: z
    .string()
    .trim()
    .max(200, "Payment reference is too long.")
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  paymentNotes: z
    .string()
    .trim()
    .max(500, "Payment notes are too long.")
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
});

export type PaymentLineInput = z.infer<typeof paymentLineSchema>;

export const paymentConfirmSchema = z.object({
  orderId: z.string().uuid("Invalid order."),
  amountExpected: z.coerce
    .number({ invalid_type_error: "Expected amount must be a number." })
    .min(0, "Expected amount cannot be negative."),
  amountReceived: z.coerce
    .number({ invalid_type_error: "Received amount must be a number." })
    .min(0, "Received amount cannot be negative.")
    .default(0),
  paymentMethod: z
    .string()
    .trim()
    .max(50, "Payment method is too long.")
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  paymentReference: z
    .string()
    .trim()
    .max(200, "Payment reference is too long.")
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  paymentNotes: z
    .string()
    .trim()
    .max(500, "Payment notes are too long.")
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
});

export type PaymentConfirmInput = z.infer<typeof paymentConfirmSchema>;
