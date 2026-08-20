/**
 * Calculate the net expected payment amount from delivery outcome data.
 *
 * Used by:
 *   - delivery/actions.ts (confirmDelivery, updateDeliverySettlement)
 *   - payments/actions.ts (createExpectedPayment)
 *
 * Formula:
 *   SUM(delivered_qty × selling_price)
 *   - SUM(returned_qty × return_charge_per_unit)
 *   + 0 for RTO
 *   + 0 for Cancelled
 *
 * @param items - Order items with delivery outcome fields
 * @returns Net expected payment amount (can be negative)
 */
export function calculateNetExpectedPayment(
  items: Array<{
    delivered_qty: number;
    returned_qty: number;
    rto_qty: number;
    cancelled_qty: number;
    return_charge_per_unit: number;
    selling_price: number;
  }>,
): number {
  let deliveredRevenue = 0;
  let returnCharge = 0;

  for (const item of items) {
    // Delivered quantity generates revenue at selling price
    deliveredRevenue += item.delivered_qty * item.selling_price;

    // Returned quantity generates a negative charge at return_charge_per_unit
    returnCharge += item.returned_qty * item.return_charge_per_unit;

    // RTO and Cancelled contribute ₹0 (no profit, no loss)
  }

  return deliveredRevenue - returnCharge;
}
