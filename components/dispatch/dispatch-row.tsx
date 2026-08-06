"use client";

import { memo, useRef } from "react";

import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

export type DispatchLineDraft = {
  orderItemId: string;
  productSku: string;
  productName: string;
  orderedQty: number;
  buyQty: number;
  packedQty: number;
  dispatchQty: string;
  courierName: string;
  trackingNumber: string;
  dispatchDate: string;
  dispatchNotes: string;
  selected: boolean;
};

type DispatchRowProps = {
  line: DispatchLineDraft;
  onChange: (orderItemId: string, patch: Partial<DispatchLineDraft>) => void;
  onToggle: (orderItemId: string, selected: boolean) => void;
};

function DispatchRowBase({ line, onChange, onToggle }: DispatchRowProps) {
  const packed = Number(line.packedQty) || 0;
  const dispatch = Number(line.dispatchQty) || 0;
  const pendingDispatch = Math.max(0, packed - dispatch);

  const courierRef = useRef<HTMLInputElement>(null);
  const trackingRef = useRef<HTMLInputElement>(null);

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
      <td className="p-1 text-right text-sm tabular-nums">{packed}</td>

      {/* Dispatch Qty (editable) */}
      <td className="p-1">
        <Input
          data-dispatch-cell="true"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={line.dispatchQty}
          onChange={(e) => onChange(line.orderItemId, { dispatchQty: e.target.value })}
          onKeyDown={(e) => handleKeyDown(e, courierRef)}
          className="w-24 text-right"
          placeholder="0"
          aria-label={`Dispatch qty for ${line.productName}`}
        />
      </td>

      {/* Pending Dispatch */}
      <td
        className={`p-1 text-right text-sm tabular-nums ${
          pendingDispatch > 0 ? "text-amber-600" : "text-muted-foreground"
        }`}
      >
        {pendingDispatch}
      </td>

      {/* Courier (editable) */}
      <td className="p-1">
        <Input
          ref={courierRef}
          data-dispatch-cell="true"
          type="text"
          value={line.courierName}
          onChange={(e) => onChange(line.orderItemId, { courierName: e.target.value })}
          onKeyDown={(e) => handleKeyDown(e, trackingRef)}
          className="w-36 text-sm"
          placeholder="Courier"
          aria-label={`Courier for ${line.productName}`}
        />
      </td>

      {/* Tracking Number (editable) */}
      <td className="p-1">
        <Input
          ref={trackingRef}
          data-dispatch-cell="true"
          type="text"
          value={line.trackingNumber}
          onChange={(e) => onChange(line.orderItemId, { trackingNumber: e.target.value })}
          onKeyDown={(e) => handleKeyDown(e, undefined)}
          className="w-40 text-sm font-mono"
          placeholder="Tracking #"
          aria-label={`Tracking number for ${line.productName}`}
        />
      </td>

      {/* Dispatch Date (editable) */}
      <td className="p-1">
        <Input
          data-dispatch-cell="true"
          type="date"
          value={line.dispatchDate}
          onChange={(e) => onChange(line.orderItemId, { dispatchDate: e.target.value })}
          className="w-36"
          aria-label={`Dispatch date for ${line.productName}`}
        />
      </td>

      {/* Dispatch Notes (editable) */}
      <td className="p-1">
        <Input
          data-dispatch-cell="true"
          type="text"
          value={line.dispatchNotes}
          onChange={(e) => onChange(line.orderItemId, { dispatchNotes: e.target.value })}
          className="w-48 text-sm"
          placeholder="Dispatch notes…"
          aria-label={`Dispatch notes for ${line.productName}`}
        />
      </td>
    </tr>
  );
}

/**
 * Memoized dispatch row.
 * Only re-renders when its own `line` reference changes.
 */
export const DispatchRow = memo(DispatchRowBase);
