"use client";

import { memo, useRef } from "react";

import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

export type DeliveryLineDraft = {
  orderItemId: string;
  productSku: string;
  productName: string;
  orderedQty: number;
  buyQty: number;
  packedQty: number;
  dispatchQty: number;
  deliveredQty: string;
  deliveryStatus: string;
  deliveryReference: string;
  deliveryDate: string;
  deliveryNotes: string;
  selected: boolean;
};

export const DELIVERY_STATUS_LABELS: Record<string, string> = {
  Delivered: "Delivered",
  Partial: "Partial",
  Cancelled: "Cancelled",
  Returned: "Returned",
  RTO: "RTO",
};

type DeliveryRowProps = {
  line: DeliveryLineDraft;
  onChange: (orderItemId: string, patch: Partial<DeliveryLineDraft>) => void;
  onToggle: (orderItemId: string, selected: boolean) => void;
};

function DeliveryRowBase({ line, onChange, onToggle }: DeliveryRowProps) {
  const dispatch = Number(line.dispatchQty) || 0;
  const delivered = Number(line.deliveredQty) || 0;
  const pendingDelivery = Math.max(0, dispatch - delivered);

  const deliveredRef = useRef<HTMLInputElement>(null);
  const statusRef = useRef<HTMLInputElement>(null);
  const referenceRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    nextRef?: React.RefObject<HTMLInputElement | null>,
  ) => {
    if (e.key === "Enter" && nextRef && nextRef.current) {
      e.preventDefault();
      nextRef.current.focus();
      nextRef.current.select();
    }
  };

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

      {/* Buy Qty */}
      <td className="p-1 text-right text-sm tabular-nums">{line.buyQty}</td>

      {/* Packed Qty */}
      <td className="p-1 text-right text-sm tabular-nums">{line.packedQty}</td>

      {/* Dispatch Qty */}
      <td className="p-1 text-right text-sm tabular-nums">{dispatch}</td>

      {/* Delivered Qty (editable) */}
      <td className="p-1">
        <Input
          ref={deliveredRef}
          data-delivery-cell="true"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={line.deliveredQty}
          onChange={(e) => onChange(line.orderItemId, { deliveredQty: e.target.value })}
          onKeyDown={(e) => handleKeyDown(e, statusRef)}
          className="w-24 text-right"
          placeholder="0"
          aria-label={`Delivered qty for ${line.productName}`}
        />
      </td>

      {/* Pending Delivery */}
      <td
        className={`p-1 text-right text-sm tabular-nums ${
          pendingDelivery > 0 ? "text-amber-600" : "text-muted-foreground"
        }`}
      >
        {pendingDelivery}
      </td>

      {/* Delivery Status (editable) */}
      <td className="p-1">
        <Input
          ref={statusRef}
          data-delivery-cell="true"
          type="text"
          list={`status-${line.orderItemId}`}
          value={line.deliveryStatus}
          onChange={(e) => onChange(line.orderItemId, { deliveryStatus: e.target.value })}
          onKeyDown={(e) => handleKeyDown(e, referenceRef)}
          className="w-32 text-sm"
          placeholder="Status"
          aria-label={`Delivery status for ${line.productName}`}
        />
        <datalist id={`status-${line.orderItemId}`}>
          {Object.keys(DELIVERY_STATUS_LABELS).map((status) => (
            <option key={status} value={status} />
          ))}
        </datalist>
      </td>

      {/* Delivery Reference (editable) */}
      <td className="p-1">
        <Input
          ref={referenceRef}
          data-delivery-cell="true"
          type="text"
          value={line.deliveryReference}
          onChange={(e) => onChange(line.orderItemId, { deliveryReference: e.target.value })}
          className="w-36 text-sm font-mono"
          placeholder="Reference"
          aria-label={`Delivery reference for ${line.productName}`}
        />
      </td>

      {/* Delivery Date (editable) */}
      <td className="p-1">
        <Input
          data-delivery-cell="true"
          type="date"
          value={line.deliveryDate}
          onChange={(e) => onChange(line.orderItemId, { deliveryDate: e.target.value })}
          className="w-36"
          aria-label={`Delivery date for ${line.productName}`}
        />
      </td>

      {/* Delivery Notes (editable) */}
      <td className="p-1">
        <Input
          data-delivery-cell="true"
          type="text"
          value={line.deliveryNotes}
          onChange={(e) => onChange(line.orderItemId, { deliveryNotes: e.target.value })}
          className="w-48 text-sm"
          placeholder="Delivery notes…"
          aria-label={`Delivery notes for ${line.productName}`}
        />
      </td>
    </tr>
  );
}

/**
 * Memoized delivery row.
 * Only re-renders when its own `line` reference changes.
 */
export const DeliveryRow = memo(DeliveryRowBase);
