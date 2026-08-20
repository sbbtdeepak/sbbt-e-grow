"use client";

import { memo } from "react";

import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

export type DeliveryLineDraft = {
  orderItemId: string;
  productSku: string;
  productName: string;
  sellingPrice: number;
  orderedQty: number;
  buyQty: number;
  packedQty: number;
  dispatchQty: number;
  deliveredQty: string;
  returnedQty: string;
  rtoQty: string;
  cancelledQty: string;
  returnChargePerUnit: string;
  deliveryReference: string;
  deliveryDate: string;
  deliveryNotes: string;
  selected: boolean;
};

function fmtINR(value: number): string {
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}



type DeliveryRowProps = {
  line: DeliveryLineDraft;
  onChange: (orderItemId: string, patch: Partial<DeliveryLineDraft>) => void;
  onToggle: (orderItemId: string, selected: boolean) => void;
};

function DeliveryRowBase({ line, onChange, onToggle }: DeliveryRowProps) {
  const dispatch = Number(line.dispatchQty) || 0;
  const delivered = Number(line.deliveredQty) || 0;
  const returned = Number(line.returnedQty) || 0;
  const rto = Number(line.rtoQty) || 0;
  const cancelled = Number(line.cancelledQty) || 0;
  const totalAccounted = delivered + returned + rto + cancelled;
  const remaining = Math.max(0, dispatch - totalAccounted);
  const isOverDispatch = totalAccounted > dispatch;

  const returnCharge = Number(line.returnChargePerUnit) || 0;

  // Financial preview
  const deliveredRevenue = delivered * line.sellingPrice;
  const returnDeduction = returned * returnCharge;
  const netContribution = deliveredRevenue - returnDeduction;

  return (
    <tr className="border-b border-border hover:bg-muted/40">
      {/* Select */}
      <td className="p-1 text-center">
        <Checkbox
          checked={line.selected}
          onCheckedChange={(checked) =>
            onToggle(line.orderItemId, checked === true)
          }
          aria-label={`Select ${line.productName}`}
        />
      </td>

      {/* Product */}
      <td className="p-1">
        <div className="flex flex-col">
          <span className="font-mono text-xs text-muted-foreground">
            {line.productSku}
          </span>
          <span className="text-sm font-medium">{line.productName}</span>
        </div>
      </td>

      {/* Ordered Qty */}
      <td className="p-1 text-right text-sm tabular-nums">{line.orderedQty}</td>

      {/* Packed Qty */}
      <td className="p-1 text-right text-sm tabular-nums">{line.packedQty}</td>

      {/* Dispatch Qty */}
      <td className="p-1 text-right text-sm tabular-nums font-medium">{dispatch}</td>

      {/* Delivered Qty — integer only */}
      <td className="p-1">
        <Input
          type="number"
          inputMode="numeric"
          min="0"
          max={dispatch}
          step="1"
          value={line.deliveredQty}
          onChange={(e) => onChange(line.orderItemId, { deliveredQty: e.target.value })}
          className="w-20 text-right"
          placeholder="0"
          aria-label={`Delivered qty for ${line.productName}`}
        />
      </td>

      {/* Returned Qty — integer only */}
      <td className="p-1">
        <Input
          type="number"
          inputMode="numeric"
          min="0"
          max={dispatch}
          step="1"
          value={line.returnedQty}
          onChange={(e) => onChange(line.orderItemId, { returnedQty: e.target.value })}
          className="w-20 text-right"
          placeholder="0"
          aria-label={`Returned qty for ${line.productName}`}
        />
      </td>

      {/* RTO Qty — integer only */}
      <td className="p-1">
        <Input
          type="number"
          inputMode="numeric"
          min="0"
          max={dispatch}
          step="1"
          value={line.rtoQty}
          onChange={(e) => onChange(line.orderItemId, { rtoQty: e.target.value })}
          className="w-20 text-right"
          placeholder="0"
          aria-label={`RTO qty for ${line.productName}`}
        />
      </td>

      {/* Cancelled Qty — integer only */}
      <td className="p-1">
        <Input
          type="number"
          inputMode="numeric"
          min="0"
          max={dispatch}
          step="1"
          value={line.cancelledQty}
          onChange={(e) => onChange(line.orderItemId, { cancelledQty: e.target.value })}
          className="w-20 text-right"
          placeholder="0"
          aria-label={`Cancelled qty for ${line.productName}`}
        />
      </td>

      {/* Remaining / Over */}
      <td
        className={`p-1 text-right text-sm tabular-nums ${
          isOverDispatch
            ? "text-destructive font-medium"
            : remaining > 0
            ? "text-amber-600 font-medium"
            : "text-muted-foreground"
        }`}
      >
        {isOverDispatch ? `Over: ${totalAccounted - dispatch}` : remaining}
      </td>

      {/* Return Charge Per Unit — money field */}
      <td className="p-1">
        <Input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={line.returnChargePerUnit}
          onChange={(e) => onChange(line.orderItemId, { returnChargePerUnit: e.target.value })}
          className="w-24 text-right"
          placeholder="0.00"
          aria-label={`Return charge per unit for ${line.productName}`}
          disabled={returned === 0}
        />
      </td>

      {/* Delivery Reference */}
      <td className="p-1">
        <Input
          type="text"
          value={line.deliveryReference}
          onChange={(e) => onChange(line.orderItemId, { deliveryReference: e.target.value })}
          className="w-32 text-sm font-mono"
          placeholder="Reference"
          aria-label={`Delivery reference for ${line.productName}`}
        />
      </td>

      {/* Delivery Date */}
      <td className="p-1">
        <Input
          type="date"
          value={line.deliveryDate}
          onChange={(e) => onChange(line.orderItemId, { deliveryDate: e.target.value })}
          className="w-32"
          aria-label={`Delivery date for ${line.productName}`}
        />
      </td>

      {/* Net Contribution (read-only) */}
      <td className={`p-1 text-right text-sm tabular-nums font-medium ${netContribution < 0 ? "text-destructive" : ""}`}>
        {fmtINR(netContribution)}
      </td>
    </tr>
  );
}

/**
 * Memoized delivery row.
 * Only re-renders when its own `line` reference changes.
 */
export const DeliveryRow = memo(DeliveryRowBase);
